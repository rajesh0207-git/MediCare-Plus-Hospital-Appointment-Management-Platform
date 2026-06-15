from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from typing import List, Optional
from app.core.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.models.patient import Patient
from app.models.bed_management import BedAssignment, Bed, BedStatus, AssignmentStatus, Ward
from app.models.billing import Insurance
from app.models.admission import Admission
from app.schemas.admission import (
    AdmissionCreate, DischargeRequest,
    AdmissionResponse, AdmissionDetailResponse, AdmissionStats
)
from app.services.pdf_service import PDFService
from app.services.audit_service import audit_service
import os

router = APIRouter(prefix="/admissions", tags=["Patient Admission & Discharge"])


# ===================== DASHBOARD STATS =====================

@router.get("/stats", response_model=AdmissionStats)
def get_admission_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get admission/discharge dashboard statistics."""
    total = db.query(Admission).count()
    currently_admitted = db.query(Admission).filter(Admission.status == "ADMITTED").count()

    today_start = datetime.combine(date.today(), datetime.min.time())
    discharged_today = db.query(Admission).filter(
        Admission.status == "DISCHARGED",
        Admission.actual_discharge_date >= today_start
    ).count()

    # Average length of stay (for discharged patients)
    discharged = db.query(Admission).filter(
        Admission.status == "DISCHARGED",
        Admission.actual_discharge_date.isnot(None)
    ).all()

    avg_days = 0.0
    if discharged:
        total_days = sum(
            (a.actual_discharge_date - a.created_at).days
            for a in discharged
            if a.actual_discharge_date
        )
        avg_days = round(total_days / len(discharged), 1) if discharged else 0.0

    return AdmissionStats(
        total_admissions=total,
        currently_admitted=currently_admitted,
        discharged_today=discharged_today,
        average_stay_days=avg_days
    )


# ===================== ADMISSION HISTORY (MUST BE BEFORE /{admission_id}) =====================

@router.get("/history", response_model=List[AdmissionDetailResponse])
def get_admission_history(
    patient_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get complete admission history. Patients see only their own."""
    query = db.query(Admission)

    if current_user.role == "PATIENT":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        query = query.filter(Admission.patient_id == patient.id)
    elif patient_id:
        query = query.filter(Admission.patient_id == patient_id)

    admissions = query.order_by(Admission.created_at.desc()).limit(limit).all()
    return [_build_detail_response(a, db) for a in admissions]


# ===================== ADMISSION =====================

@router.get("", response_model=List[AdmissionDetailResponse])
def list_admissions(
    status_filter: Optional[str] = Query(None),
    patient_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List admissions. Patients see only their own. Admin/Doctor see all."""
    query = db.query(Admission)

    if current_user.role == "PATIENT":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        query = query.filter(Admission.patient_id == patient.id)

    if status_filter:
        query = query.filter(Admission.status == status_filter)

    if patient_id:
        query = query.filter(Admission.patient_id == patient_id)

    admissions = query.order_by(Admission.created_at.desc()).all()
    return [_build_detail_response(a, db) for a in admissions]


@router.get("/{admission_id}", response_model=AdmissionDetailResponse)
def get_admission(
    admission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a single admission record."""
    admission = db.query(Admission).filter(Admission.id == admission_id).first()
    if not admission:
        raise HTTPException(status_code=404, detail="Admission record not found")

    # Access control
    if current_user.role == "PATIENT":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or admission.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Forbidden")

    return _build_detail_response(admission, db)


@router.post("", response_model=AdmissionResponse, status_code=status.HTTP_201_CREATED)
async def admit_patient(
    admission_data: AdmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "DOCTOR"]))
):
    """Admit a patient. Creates admission record + bed assignment if bed specified."""
    # Validate patient
    patient = db.query(Patient).filter(Patient.id == admission_data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Check if patient already has an active admission
    existing = db.query(Admission).filter(
        Admission.patient_id == admission_data.patient_id,
        Admission.status == "ADMITTED"
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Patient is already admitted. Discharge first.")

    bed_assignment = None
    bed = None
    ward = None

    # Option 1: If bed_id provided, create a new bed assignment automatically
    if admission_data.bed_id:
        bed = db.query(Bed).filter(Bed.id == admission_data.bed_id).first()
        if not bed:
            raise HTTPException(status_code=404, detail="Bed not found")
        if bed.status != BedStatus.AVAILABLE:
            raise HTTPException(status_code=400, detail=f"Bed is not available. Current status: {bed.status}")
        
        # Create bed assignment
        bed_assignment = BedAssignment(
            bed_id=admission_data.bed_id,
            patient_id=admission_data.patient_id,
            assigned_by=current_user.id,
            reason=f"Admission - {admission_data.admission_type}",
            notes=admission_data.admission_notes,
            status=AssignmentStatus.ACTIVE
        )
        db.add(bed_assignment)
        db.flush()  # Get the ID without committing
        
        # Update bed status
        bed.status = BedStatus.OCCUPIED
        
        ward = db.query(Ward).filter(Ward.id == bed.ward_id).first()
    
    # Option 2: If bed assignment ID provided, validate and link existing assignment
    elif admission_data.bed_assignment_id:
        bed_assignment = db.query(BedAssignment).filter(
            BedAssignment.id == admission_data.bed_assignment_id
        ).first()
        if not bed_assignment:
            raise HTTPException(status_code=404, detail="Bed assignment not found")
        if bed_assignment.status != AssignmentStatus.ACTIVE:
            raise HTTPException(status_code=400, detail="Bed assignment is not active")

        bed = db.query(Bed).filter(Bed.id == bed_assignment.bed_id).first()
        if bed:
            ward = db.query(Ward).filter(Ward.id == bed.ward_id).first()

    # Validate insurance if provided
    insurance = None
    if admission_data.insurance_id:
        insurance = db.query(Insurance).filter(Insurance.id == admission_data.insurance_id).first()
        if not insurance:
            raise HTTPException(status_code=404, detail="Insurance policy not found")

    # Create admission record
    new_admission = Admission(
        patient_id=admission_data.patient_id,
        bed_assignment_id=bed_assignment.id if bed_assignment else admission_data.bed_assignment_id,
        admitted_by=current_user.id,
        admission_type=admission_data.admission_type,
        diagnosis=admission_data.diagnosis,
        admission_notes=admission_data.admission_notes,
        insurance_claim_id=admission_data.insurance_id,
        estimated_discharge_date=admission_data.estimated_discharge_date,
        status="ADMITTED"
    )
    db.add(new_admission)
    db.commit()
    db.refresh(new_admission)

    audit_service.log_activity(
        db, current_user.id, "PATIENT_ADMIT",
        f"Admitted patient '{patient.full_name}' (ID: {patient.id}) - Type: {admission_data.admission_type}"
    )

    return new_admission


# ===================== DISCHARGE =====================

@router.post("/{admission_id}/discharge", response_model=AdmissionResponse)
async def discharge_patient(
    admission_id: int,
    discharge_data: DischargeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "DOCTOR"]))
):
    """Discharge a patient. Updates admission, frees bed, generates discharge PDF."""
    admission = db.query(Admission).filter(Admission.id == admission_id).first()
    if not admission:
        raise HTTPException(status_code=404, detail="Admission record not found")

    if admission.status != "ADMITTED":
        raise HTTPException(status_code=400, detail="Patient is not currently admitted")

    # Update admission with discharge details
    admission.status = "DISCHARGED"
    admission.discharge_status = discharge_data.discharge_status
    admission.discharge_summary = discharge_data.discharge_summary
    admission.discharge_medication = discharge_data.discharge_medication
    admission.followup_instructions = discharge_data.followup_instructions
    admission.followup_date = discharge_data.followup_date
    admission.discharged_by = current_user.id
    admission.actual_discharge_date = datetime.utcnow()

    # Free the bed if one was assigned
    if admission.bed_assignment_id:
        bed_assignment = db.query(BedAssignment).filter(
            BedAssignment.id == admission.bed_assignment_id
        ).first()
        if bed_assignment and bed_assignment.status == AssignmentStatus.ACTIVE:
            bed_assignment.status = AssignmentStatus.DISCHARGED
            bed_assignment.discharge_date = datetime.utcnow()

            bed = db.query(Bed).filter(Bed.id == bed_assignment.bed_id).first()
            if bed:
                bed.status = BedStatus.AVAILABLE

    # Generate discharge PDF report
    patient = db.query(Patient).filter(Patient.id == admission.patient_id).first()
    date_str = date.today().strftime("%Y-%m-%d")

    # Get bed/ward info for the report
    bed_number = "N/A"
    ward_name = "N/A"
    if admission.bed_assignment_id:
        bed_assignment = db.query(BedAssignment).filter(
            BedAssignment.id == admission.bed_assignment_id
        ).first()
        if bed_assignment:
            bed = db.query(Bed).filter(Bed.id == bed_assignment.bed_id).first()
            if bed:
                bed_number = bed.bed_number
                ward = db.query(Ward).filter(Ward.id == bed.ward_id).first()
                ward_name = ward.name if ward else "N/A"

    pdf_path = PDFService.generate_discharge_report(
        admission_id=admission.id,
        date_str=date_str,
        patient_name=patient.full_name if patient else "Patient",
        patient_age=patient.age if patient else None,
        patient_gender=patient.gender if patient else "N/A",
        patient_phone=patient.phone if patient else "N/A",
        admission_type=admission.admission_type,
        diagnosis=admission.diagnosis or "N/A",
        admission_date=admission.created_at.strftime("%Y-%m-%d"),
        discharge_date=date_str,
        bed_number=bed_number,
        ward_name=ward_name,
        discharge_status=discharge_data.discharge_status,
        discharge_summary=discharge_data.discharge_summary or "N/A",
        discharge_medication=discharge_data.discharge_medication or "N/A",
        followup_instructions=discharge_data.followup_instructions or "N/A",
        followup_date=discharge_data.followup_date.strftime("%Y-%m-%d") if discharge_data.followup_date else "N/A",
        discharged_by=current_user.email
    )

    db.commit()
    db.refresh(admission)

    audit_service.log_activity(
        db, current_user.id, "PATIENT_DISCHARGE",
        f"Discharged patient '{patient.full_name if patient else admission.patient_id}' (Admission ID: {admission_id})"
    )

    return admission


# ===================== DISCHARGE REPORT / PDF =====================

@router.get("/{admission_id}/download-report")
def download_discharge_report(
    admission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download discharge report PDF."""
    admission = db.query(Admission).filter(Admission.id == admission_id).first()
    if not admission:
        raise HTTPException(status_code=404, detail="Admission record not found")

    if admission.status != "DISCHARGED":
        raise HTTPException(status_code=400, detail="Discharge report not available. Patient not discharged yet.")

    # Access control
    if current_user.role == "PATIENT":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or admission.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Forbidden")

    patient = db.query(Patient).filter(Patient.id == admission.patient_id).first()
    date_str = date.today().strftime("%Y-%m-%d")

    # Get bed/ward info
    bed_number = "N/A"
    ward_name = "N/A"
    if admission.bed_assignment_id:
        bed_assignment = db.query(BedAssignment).filter(
            BedAssignment.id == admission.bed_assignment_id
        ).first()
        if bed_assignment:
            bed = db.query(Bed).filter(Bed.id == bed_assignment.bed_id).first()
            if bed:
                bed_number = bed.bed_number
                ward = db.query(Ward).filter(Ward.id == bed.ward_id).first()
                ward_name = ward.name if ward else "N/A"

    pdf_path = PDFService.generate_discharge_report(
        admission_id=admission.id,
        date_str=date_str,
        patient_name=patient.full_name if patient else "Patient",
        patient_age=patient.age if patient else None,
        patient_gender=patient.gender if patient else "N/A",
        patient_phone=patient.phone if patient else "N/A",
        admission_type=admission.admission_type,
        diagnosis=admission.diagnosis or "N/A",
        admission_date=admission.created_at.strftime("%Y-%m-%d"),
        discharge_date=admission.actual_discharge_date.strftime("%Y-%m-%d") if admission.actual_discharge_date else date_str,
        bed_number=bed_number,
        ward_name=ward_name,
        discharge_status=admission.discharge_status or "N/A",
        discharge_summary=admission.discharge_summary or "N/A",
        discharge_medication=admission.discharge_medication or "N/A",
        followup_instructions=admission.followup_instructions or "N/A",
        followup_date=admission.followup_date.strftime("%Y-%m-%d") if admission.followup_date else "N/A",
        discharged_by=admission.discharged_by_user.email if admission.discharged_by_user else "N/A"
    )

    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF report file not found")

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"discharge_report_{admission.id}.pdf"
    )


# ===================== HELPER =====================

def _build_detail_response(admission: Admission, db: Session) -> AdmissionDetailResponse:
    """Build a detailed admission response with related data."""
    patient = db.query(Patient).filter(Patient.id == admission.patient_id).first()
    admitted_user = db.query(User).filter(User.id == admission.admitted_by).first() if admission.admitted_by else None
    discharged_user = db.query(User).filter(User.id == admission.discharged_by).first() if admission.discharged_by else None
    insurance = db.query(Insurance).filter(Insurance.id == admission.insurance_claim_id).first() if admission.insurance_claim_id else None

    bed_number = None
    ward_name = None
    if admission.bed_assignment_id:
        bed_assignment = db.query(BedAssignment).filter(
            BedAssignment.id == admission.bed_assignment_id
        ).first()
        if bed_assignment:
            bed = db.query(Bed).filter(Bed.id == bed_assignment.bed_id).first()
            if bed:
                bed_number = bed.bed_number
                ward = db.query(Ward).filter(Ward.id == bed.ward_id).first()
                ward_name = ward.name if ward else None

    # Calculate length of stay
    length_of_stay = None
    end_date = admission.actual_discharge_date or datetime.utcnow()
    if admission.created_at:
        length_of_stay = (end_date - admission.created_at).days

    return AdmissionDetailResponse(
        id=admission.id,
        patient_id=admission.patient_id,
        bed_assignment_id=admission.bed_assignment_id,
        admitted_by=admission.admitted_by,
        admission_type=admission.admission_type,
        diagnosis=admission.diagnosis,
        admission_notes=admission.admission_notes,
        insurance_claim_id=admission.insurance_claim_id,
        estimated_discharge_date=admission.estimated_discharge_date,
        discharge_status=admission.discharge_status,
        discharge_summary=admission.discharge_summary,
        discharge_medication=admission.discharge_medication,
        followup_instructions=admission.followup_instructions,
        followup_date=admission.followup_date,
        discharged_by=admission.discharged_by,
        actual_discharge_date=admission.actual_discharge_date,
        status=admission.status,
        created_at=admission.created_at,
        updated_at=admission.updated_at,
        patient_name=patient.full_name if patient else None,
        patient_age=patient.age if patient else None,
        patient_gender=patient.gender if patient else None,
        patient_phone=patient.phone if patient else None,
        bed_number=bed_number,
        ward_name=ward_name,
        admitted_by_name=admitted_user.email if admitted_user else None,
        discharged_by_name=discharged_user.email if discharged_user else None,
        insurance_provider=insurance.provider_name if insurance else None,
        length_of_stay_days=length_of_stay
    )
