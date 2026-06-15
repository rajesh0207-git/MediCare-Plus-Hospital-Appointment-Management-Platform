from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.models.patient import Patient, EmergencyContact
from app.schemas.patient import PatientResponse, PatientUpdate, EmergencyContactResponse, EmergencyContactCreate
from app.services.audit_service import audit_service
from typing import List

router = APIRouter(prefix="/patients", tags=["Patient Profile"])

@router.get("/me", response_model=PatientResponse)
def get_patient_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
    return patient

@router.put("/me", response_model=PatientResponse)
def update_patient_profile(
    profile_data: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
    
    # Update fields
    for key, value in profile_data.model_dump(exclude_unset=True).items():
        setattr(patient, key, value)
        
    db.commit()
    db.refresh(patient)
    
    # Log audit
    audit_service.log_activity(db, current_user.id, "PATIENT_PROFILE_UPDATE", f"Patient {current_user.email} updated profile details.")
    return patient

@router.post("/me/emergency-contacts", response_model=EmergencyContactResponse, status_code=status.HTTP_201_CREATED)
def add_emergency_contact(
    contact_data: EmergencyContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
        
    new_contact = EmergencyContact(
        patient_id=patient.id,
        name=contact_data.name,
        relationship=contact_data.relationship,
        phone=contact_data.phone
    )
    db.add(new_contact)
    db.commit()
    db.refresh(new_contact)
    
    # Log audit
    audit_service.log_activity(db, current_user.id, "ADD_EMERGENCY_CONTACT", f"Added contact {contact_data.name}")
    return new_contact

@router.get("/me/emergency-contacts", response_model=List[EmergencyContactResponse])
def get_emergency_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
    return patient.emergency_contacts
