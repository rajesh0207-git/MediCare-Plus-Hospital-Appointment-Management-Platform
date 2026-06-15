from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List
from app.schemas.patient import PatientBase
from app.schemas.doctor import DoctorSimpleResponse
from app.schemas.prescription import PrescriptionResponse

# Consultation Schemas
class ConsultationBase(BaseModel):
    consultation_type: Optional[str] = "ONLINE"  # ONLINE, IN_PERSON
    doctor_notes: Optional[str] = None
    prescription_text: Optional[str] = None

class ConsultationCreate(ConsultationBase):
    pass

class ConsultationResponse(ConsultationBase):
    id: int
    appointment_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Appointment Schemas
class AppointmentBase(BaseModel):
    doctor_id: int
    appointment_date: date
    time_slot: str  # e.g., "10:30"
    symptoms: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentReschedule(BaseModel):
    appointment_date: date
    time_slot: str

class AppointmentUpdateStatus(BaseModel):
    status: str  # PENDING, CONFIRMED, CANCELLED, COMPLETED

class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    appointment_date: date
    time_slot: str
    status: str
    symptoms: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Nested info
    patient: Optional[PatientBase] = None
    doctor: Optional[DoctorSimpleResponse] = None
    consultation: Optional[ConsultationResponse] = None
    prescription: Optional[PrescriptionResponse] = None

    class Config:
        from_attributes = True
