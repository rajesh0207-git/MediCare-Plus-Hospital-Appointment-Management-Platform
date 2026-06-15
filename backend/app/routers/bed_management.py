from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from datetime import datetime
from typing import List, Optional
from app.core.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.models.patient import Patient
from app.models.bed_management import Ward, Bed, BedAssignment, BedStatus, AssignmentStatus
from app.schemas.bed_management import (
    WardCreate, WardUpdate, WardResponse, WardWithStats,
    BedCreate, BedUpdate, BedResponse, BedDetailResponse,
    BedAssignmentCreate, BedAssignmentResponse, BedAssignmentDetailResponse,
    DischargeRequest, TransferRequest, BedDashboardStats
)
from app.services.audit_service import audit_service

router = APIRouter(prefix="/bed-management", tags=["Bed Management"])


# ===================== DASHBOARD STATS =====================

@router.get("/stats", response_model=BedDashboardStats)
def get_bed_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get bed management dashboard statistics."""
    total_wards = db.query(Ward).filter(Ward.is_active == True).count()
    total_beds = db.query(Bed).count()
    available = db.query(Bed).filter(Bed.status == BedStatus.AVAILABLE).count()
    occupied = db.query(Bed).filter(Bed.status == BedStatus.OCCUPIED).count()
    maintenance = db.query(Bed).filter(Bed.status == BedStatus.MAINTENANCE).count()
    reserved = db.query(Bed).filter(Bed.status == BedStatus.RESERVED).count()
    active_admissions = db.query(BedAssignment).filter(BedAssignment.status == AssignmentStatus.ACTIVE).count()

    occupancy_rate = (occupied / total_beds * 100) if total_beds > 0 else 0.0

    return BedDashboardStats(
        total_wards=total_wards,
        total_beds=total_beds,
        available_beds=available,
        occupied_beds=occupied,
        maintenance_beds=maintenance,
        reserved_beds=reserved,
        occupancy_rate=round(occupancy_rate, 1),
        active_admissions=active_admissions
    )


# ===================== WARD MANAGEMENT =====================

@router.get("/wards", response_model=List[WardWithStats])
def list_wards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all wards with bed availability stats."""
    wards = db.query(Ward).filter(Ward.is_active == True).all()
    result = []
    for ward in wards:
        beds = db.query(Bed).filter(Bed.ward_id == ward.id).all()
        available = sum(1 for b in beds if b.status == BedStatus.AVAILABLE)
        occupied = sum(1 for b in beds if b.status == BedStatus.OCCUPIED)
        maintenance = sum(1 for b in beds if b.status == BedStatus.MAINTENANCE)
        reserved = sum(1 for b in beds if b.status == BedStatus.RESERVED)

        ward_data = WardWithStats(
            id=ward.id,
            name=ward.name,
            ward_type=ward.ward_type,
            floor=ward.floor,
            total_beds=len(beds),
            description=ward.description,
            is_active=ward.is_active,
            created_at=ward.created_at,
            updated_at=ward.updated_at,
            available_beds=available,
            occupied_beds=occupied,
            maintenance_beds=maintenance,
            reserved_beds=reserved
        )
        result.append(ward_data)
    return result


@router.post("/wards", response_model=WardResponse, status_code=status.HTTP_201_CREATED)
def create_ward(
    ward_data: WardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN"]))
):
    """Create a new ward (Admin only)."""
    existing = db.query(Ward).filter(Ward.name == ward_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ward with this name already exists")

    new_ward = Ward(
        name=ward_data.name,
        ward_type=ward_data.ward_type,
        floor=ward_data.floor,
        total_beds=ward_data.total_beds,
        description=ward_data.description
    )
    db.add(new_ward)
    db.commit()
    db.refresh(new_ward)

    audit_service.log_activity(db, current_user.id, "WARD_CREATE", f"Created ward '{new_ward.name}' (Type: {new_ward.ward_type}, Floor: {new_ward.floor})")
    return new_ward


@router.put("/wards/{ward_id}", response_model=WardResponse)
def update_ward(
    ward_id: int,
    ward_data: WardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN"]))
):
    """Update ward details (Admin only)."""
    ward = db.query(Ward).filter(Ward.id == ward_id).first()
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found")

    if ward_data.name is not None:
        ward.name = ward_data.name
    if ward_data.ward_type is not None:
        ward.ward_type = ward_data.ward_type
    if ward_data.floor is not None:
        ward.floor = ward_data.floor
    if ward_data.description is not None:
        ward.description = ward_data.description
    if ward_data.is_active is not None:
        ward.is_active = ward_data.is_active

    db.commit()
    db.refresh(ward)

    audit_service.log_activity(db, current_user.id, "WARD_UPDATE", f"Updated ward '{ward.name}' (ID: {ward.id})")
    return ward


@router.delete("/wards/{ward_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ward(
    ward_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN"]))
):
    """Delete a ward (Admin only). Only allowed if no occupied beds."""
    ward = db.query(Ward).filter(Ward.id == ward_id).first()
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found")

    occupied = db.query(Bed).filter(Bed.ward_id == ward_id, Bed.status == BedStatus.OCCUPIED).count()
    if occupied > 0:
        raise HTTPException(status_code=400, detail="Cannot delete ward with occupied beds. Discharge patients first.")

    db.delete(ward)
    db.commit()
    audit_service.log_activity(db, current_user.id, "WARD_DELETE", f"Deleted ward '{ward.name}' (ID: {ward_id})")


# ===================== BED MANAGEMENT =====================

@router.get("/beds", response_model=List[BedDetailResponse])
def list_beds(
    ward_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all beds with optional ward/status filter."""
    query = db.query(Bed)
    if ward_id:
        query = query.filter(Bed.ward_id == ward_id)
    if status_filter:
        query = query.filter(Bed.status == status_filter)

    beds = query.all()
    result = []
    for bed in beds:
        ward = db.query(Ward).filter(Ward.id == bed.ward_id).first()
        # Get current patient if occupied
        current_patient = None
        if bed.status == BedStatus.OCCUPIED:
            active_assignment = db.query(BedAssignment).filter(
                BedAssignment.bed_id == bed.id,
                BedAssignment.status == AssignmentStatus.ACTIVE
            ).first()
            if active_assignment:
                patient = db.query(Patient).filter(Patient.id == active_assignment.patient_id).first()
                current_patient = patient.full_name if patient else None

        result.append(BedDetailResponse(
            id=bed.id,
            ward_id=bed.ward_id,
            bed_number=bed.bed_number,
            bed_type=bed.bed_type,
            status=bed.status,
            daily_rate=bed.daily_rate,
            notes=bed.notes,
            created_at=bed.created_at,
            updated_at=bed.updated_at,
            ward_name=ward.name if ward else None,
            current_patient=current_patient
        ))
    return result


@router.post("/beds", response_model=BedResponse, status_code=status.HTTP_201_CREATED)
def create_bed(
    bed_data: BedCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN"]))
):
    """Add a new bed to a ward (Admin only)."""
    ward = db.query(Ward).filter(Ward.id == bed_data.ward_id).first()
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found")

    # Check duplicate bed number in same ward
    exists = db.query(Bed).filter(
        Bed.ward_id == bed_data.ward_id,
        Bed.bed_number == bed_data.bed_number
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="Bed number already exists in this ward")

    new_bed = Bed(
        ward_id=bed_data.ward_id,
        bed_number=bed_data.bed_number,
        bed_type=bed_data.bed_type,
        daily_rate=bed_data.daily_rate,
        notes=bed_data.notes,
        status=BedStatus.AVAILABLE
    )
    db.add(new_bed)

    # Update ward total_beds count
    ward.total_beds = db.query(Bed).filter(Bed.ward_id == ward.id).count() + 1
    db.commit()
    db.refresh(new_bed)

    audit_service.log_activity(db, current_user.id, "BED_CREATE", f"Added bed '{new_bed.bed_number}' to ward '{ward.name}'")
    return new_bed


@router.put("/beds/{bed_id}", response_model=BedResponse)
def update_bed(
    bed_id: int,
    bed_data: BedUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN"]))
):
    """Update bed details / status (Admin only)."""
    bed = db.query(Bed).filter(Bed.id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")

    if bed_data.bed_type is not None:
        bed.bed_type = bed_data.bed_type
    if bed_data.status is not None:
        bed.status = bed_data.status
    if bed_data.daily_rate is not None:
        bed.daily_rate = bed_data.daily_rate
    if bed_data.notes is not None:
        bed.notes = bed_data.notes

    db.commit()
    db.refresh(bed)

    audit_service.log_activity(db, current_user.id, "BED_UPDATE", f"Updated bed '{bed.bed_number}' (ID: {bed_id})")
    return bed


@router.delete("/beds/{bed_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bed(
    bed_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN"]))
):
    """Delete a bed (Admin only). Only if not occupied."""
    bed = db.query(Bed).filter(Bed.id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")

    if bed.status == BedStatus.OCCUPIED:
        raise HTTPException(status_code=400, detail="Cannot delete an occupied bed. Discharge the patient first.")

    ward = db.query(Ward).filter(Ward.id == bed.ward_id).first()
    db.delete(bed)
    if ward:
        ward.total_beds = max(0, db.query(Bed).filter(Bed.ward_id == ward.id).count() - 1)
    db.commit()

    audit_service.log_activity(db, current_user.id, "BED_DELETE", f"Deleted bed '{bed.bed_number}' (ID: {bed_id})")


# ===================== BED ASSIGNMENT (Patient Allocation) =====================

@router.get("/assignments", response_model=List[BedAssignmentDetailResponse])
def list_assignments(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List bed assignments. Patients see only their own. Admin/Doctor see all."""
    query = db.query(BedAssignment)

    if current_user.role == "PATIENT":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        query = query.filter(BedAssignment.patient_id == patient.id)

    if status_filter:
        query = query.filter(BedAssignment.status == status_filter)

    assignments = query.order_by(BedAssignment.created_at.desc()).all()
    result = []
    for a in assignments:
        patient = db.query(Patient).filter(Patient.id == a.patient_id).first()
        bed = db.query(Bed).filter(Bed.id == a.bed_id).first()
        ward = db.query(Ward).filter(Ward.id == bed.ward_id).first() if bed else None
        assigned_user = db.query(User).filter(User.id == a.assigned_by).first() if a.assigned_by else None

        result.append(BedAssignmentDetailResponse(
            id=a.id,
            bed_id=a.bed_id,
            patient_id=a.patient_id,
            assigned_by=a.assigned_by,
            admission_date=a.admission_date,
            discharge_date=a.discharge_date,
            status=a.status,
            reason=a.reason,
            notes=a.notes,
            created_at=a.created_at,
            updated_at=a.updated_at,
            patient_name=patient.full_name if patient else None,
            bed_number=bed.bed_number if bed else None,
            ward_name=ward.name if ward else None,
            assigned_by_name=assigned_user.email if assigned_user else None
        ))
    return result


@router.post("/assignments", response_model=BedAssignmentResponse, status_code=status.HTTP_201_CREATED)
def assign_bed(
    assign_data: BedAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "DOCTOR"]))
):
    """Assign a bed to a patient (Admin/Doctor only)."""
    # Validate bed exists and is available
    bed = db.query(Bed).filter(Bed.id == assign_data.bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    if bed.status != BedStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail=f"Bed is not available. Current status: {bed.status}")

    # Validate patient exists
    patient = db.query(Patient).filter(Patient.id == assign_data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Check if patient already has an active assignment
    existing = db.query(BedAssignment).filter(
        BedAssignment.patient_id == assign_data.patient_id,
        BedAssignment.status == AssignmentStatus.ACTIVE
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Patient already has an active bed assignment. Discharge or transfer first.")

    # Create assignment
    new_assignment = BedAssignment(
        bed_id=assign_data.bed_id,
        patient_id=assign_data.patient_id,
        assigned_by=current_user.id,
        reason=assign_data.reason,
        notes=assign_data.notes,
        status=AssignmentStatus.ACTIVE
    )
    db.add(new_assignment)

    # Update bed status
    bed.status = BedStatus.OCCUPIED
    db.commit()
    db.refresh(new_assignment)

    audit_service.log_activity(
        db, current_user.id, "BED_ASSIGN",
        f"Assigned bed '{bed.bed_number}' to patient '{patient.full_name}' (ID: {patient.id})"
    )
    return new_assignment


@router.post("/assignments/{assignment_id}/discharge", response_model=BedAssignmentResponse)
def discharge_patient(
    assignment_id: int,
    discharge_data: DischargeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "DOCTOR"]))
):
    """Discharge a patient from their bed (Admin/Doctor only)."""
    assignment = db.query(BedAssignment).filter(BedAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment.status != AssignmentStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Assignment is not active")

    # Update assignment
    assignment.status = AssignmentStatus.DISCHARGED
    assignment.discharge_date = datetime.utcnow()
    if discharge_data.notes:
        assignment.notes = discharge_data.notes

    # Free up the bed
    bed = db.query(Bed).filter(Bed.id == assignment.bed_id).first()
    if bed:
        bed.status = BedStatus.AVAILABLE

    db.commit()
    db.refresh(assignment)

    patient = db.query(Patient).filter(Patient.id == assignment.patient_id).first()
    audit_service.log_activity(
        db, current_user.id, "BED_DISCHARGE",
        f"Discharged patient '{patient.full_name if patient else assignment.patient_id}' from bed (Assignment ID: {assignment_id})"
    )
    return assignment


@router.post("/assignments/{assignment_id}/transfer", response_model=BedAssignmentResponse)
def transfer_patient(
    assignment_id: int,
    transfer_data: TransferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "DOCTOR"]))
):
    """Transfer a patient to a different bed (Admin/Doctor only)."""
    assignment = db.query(BedAssignment).filter(BedAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment.status != AssignmentStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Assignment is not active")

    # Validate new bed
    new_bed = db.query(Bed).filter(Bed.id == transfer_data.new_bed_id).first()
    if not new_bed:
        raise HTTPException(status_code=404, detail="Target bed not found")
    if new_bed.status != BedStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail=f"Target bed is not available. Status: {new_bed.status}")

    # Mark old assignment as transferred
    assignment.status = AssignmentStatus.TRANSFERRED
    assignment.discharge_date = datetime.utcnow()
    if transfer_data.notes:
        assignment.notes = transfer_data.notes

    # Free old bed
    old_bed = db.query(Bed).filter(Bed.id == assignment.bed_id).first()
    if old_bed:
        old_bed.status = BedStatus.AVAILABLE

    # Create new assignment with transfer date as admission date
    transfer_time = datetime.utcnow()
    new_assignment = BedAssignment(
        bed_id=transfer_data.new_bed_id,
        patient_id=assignment.patient_id,
        assigned_by=current_user.id,
        admission_date=transfer_time,  # Set admission_date to transfer time
        reason=f"Transferred from bed {old_bed.bed_number if old_bed else 'unknown'}",
        notes=transfer_data.notes,
        status=AssignmentStatus.ACTIVE
    )
    db.add(new_assignment)

    # Occupy new bed
    new_bed.status = BedStatus.OCCUPIED

    db.commit()
    db.refresh(new_assignment)

    patient = db.query(Patient).filter(Patient.id == assignment.patient_id).first()
    audit_service.log_activity(
        db, current_user.id, "BED_TRANSFER",
        f"Transferred patient '{patient.full_name if patient else assignment.patient_id}' to bed '{new_bed.bed_number}'"
    )
    return new_assignment
