from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.medical_record import MedicalRecord, LabTest
from app.schemas.medical_record import MedicalRecordResponse, MedicalRecordCreate, LabTestResponse, LabTestCreate, LabTestUploadResult
from app.services.notification_service import notification_service
from app.services.audit_service import audit_service
from typing import List, Optional

router = APIRouter(tags=["Medical Records & Lab Tests"])

# --- Medical Records ---
@router.post("/medical-records", response_model=MedicalRecordResponse, status_code=status.HTTP_201_CREATED)
def create_medical_record(
    record_data: MedicalRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify patient exists
    pat = db.query(Patient).filter(Patient.id == record_data.patient_id).first()
    if not pat:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    # Check permissions: Patients can upload their own. Doctors/Admins can upload too.
    if current_user.role == "PATIENT" and pat.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    new_record = MedicalRecord(
        patient_id=record_data.patient_id,
        title=record_data.title,
        record_type=record_data.record_type,
        file_path=record_data.file_path,
        notes=record_data.notes
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    
    audit_service.log_activity(db, current_user.id, "MEDICAL_RECORD_UPLOAD", f"Uploaded medical record ID {new_record.id} for Patient {pat.id}")
    return new_record

@router.get("/medical-records", response_model=List[MedicalRecordResponse])
def list_medical_records(
    patient_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(MedicalRecord)
    
    if current_user.role == "PATIENT":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        query = query.filter(MedicalRecord.patient_id == patient.id)
    elif current_user.role == "DOCTOR":
        if patient_id:
            query = query.filter(MedicalRecord.patient_id == patient_id)
        else:
            # Doctors can see records of patients who have appointments with them
            doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
            if not doctor:
                return []
            # Find patient IDs who booked with doctor
            from app.models.appointment import Appointment
            patient_ids = db.query(Appointment.patient_id).filter(Appointment.doctor_id == doctor.id).subquery()
            query = query.filter(MedicalRecord.patient_id.in_(patient_ids))
    else:
        # Admin can view all or filter by patient_id
        if patient_id:
            query = query.filter(MedicalRecord.patient_id == patient_id)
            
    return query.all()

# --- Lab & Tests ---
@router.post("/lab-tests/request", response_model=LabTestResponse, status_code=status.HTTP_201_CREATED)
async def request_lab_test(
    test_data: LabTestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["DOCTOR"]))
):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
        
    patient = db.query(Patient).filter(Patient.id == test_data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
        
    new_test = LabTest(
        patient_id=test_data.patient_id,
        doctor_id=doctor.id,
        test_name=test_data.test_name,
        status="PENDING"
    )
    db.add(new_test)
    db.commit()
    db.refresh(new_test)
    
    # Notify Patient
    await notification_service.push_notification(
        db,
        user_id=patient.user_id,
        message=f"Dr. {current_user.email.split('@')[0].capitalize()} has requested a lab test: '{test_data.test_name}'.",
        notification_type="LAB_TEST"
    )
    
    audit_service.log_activity(db, current_user.id, "LAB_TEST_REQUEST", f"Requested lab test {test_data.test_name} for Patient {patient.id}")
    return new_test

@router.post("/lab-tests/{id}/results", response_model=LabTestResponse)
async def upload_lab_result(
    id: int,
    result_data: LabTestUploadResult,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "DOCTOR"]))
):
    test = db.query(LabTest).filter(LabTest.id == id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Lab test request not found")
        
    test.result_text = result_data.result_text
    test.file_path = result_data.file_path
    test.status = "COMPLETED"
    
    db.commit()
    db.refresh(test)
    
    # Create a medical record automatically for the lab result
    med_rec = MedicalRecord(
        patient_id=test.patient_id,
        title=f"Lab Result: {test.test_name}",
        record_type="LAB_RESULT",
        file_path=result_data.file_path,
        notes=result_data.result_text
    )
    db.add(med_rec)
    db.commit()
    
    # Notify Patient
    await notification_service.push_notification(
        db,
        user_id=test.patient.user_id,
        message=f"Your laboratory results for '{test.test_name}' are now ready. Check your medical records.",
        notification_type="LAB_TEST"
    )
    
    audit_service.log_activity(db, current_user.id, "LAB_TEST_RESULT_UPLOAD", f"Uploaded results for lab test ID {id}")
    return test

@router.get("/lab-tests", response_model=List[LabTestResponse])
def get_lab_tests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "PATIENT":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        return db.query(LabTest).filter(LabTest.patient_id == patient.id).all()
    elif current_user.role == "DOCTOR":
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor:
            return []
        return db.query(LabTest).filter(LabTest.doctor_id == doctor.id).all()
    else:
        return db.query(LabTest).all()
