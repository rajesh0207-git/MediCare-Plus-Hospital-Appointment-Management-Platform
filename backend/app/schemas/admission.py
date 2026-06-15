from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


# --------- Admission Schemas ---------
class AdmissionCreate(BaseModel):
    patient_id: int
    bed_id: Optional[int] = None  # NEW: Direct bed selection
    bed_assignment_id: Optional[int] = None  # For linking existing assignment
    admission_type: str = "EMERGENCY"  # EMERGENCY, ELECTIVE, REFERRAL, TRANSFER
    diagnosis: Optional[str] = None
    admission_notes: Optional[str] = None
    insurance_id: Optional[int] = None
    estimated_discharge_date: Optional[datetime] = None


class DischargeRequest(BaseModel):
    discharge_status: str  # RECOVERED, REFERRED, AMA, DECEASED
    discharge_summary: Optional[str] = None
    discharge_medication: Optional[str] = None
    followup_instructions: Optional[str] = None
    followup_date: Optional[datetime] = None


class AdmissionResponse(BaseModel):
    id: int
    patient_id: int
    bed_assignment_id: Optional[int] = None
    admitted_by: Optional[int] = None
    admission_type: str
    diagnosis: Optional[str] = None
    admission_notes: Optional[str] = None
    insurance_claim_id: Optional[int] = None
    estimated_discharge_date: Optional[datetime] = None
    discharge_status: Optional[str] = None
    discharge_summary: Optional[str] = None
    discharge_medication: Optional[str] = None
    followup_instructions: Optional[str] = None
    followup_date: Optional[datetime] = None
    discharged_by: Optional[int] = None
    actual_discharge_date: Optional[datetime] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AdmissionDetailResponse(AdmissionResponse):
    patient_name: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    patient_phone: Optional[str] = None
    bed_number: Optional[str] = None
    ward_name: Optional[str] = None
    admitted_by_name: Optional[str] = None
    discharged_by_name: Optional[str] = None
    insurance_provider: Optional[str] = None
    length_of_stay_days: Optional[int] = None


# --------- Dashboard Stats ---------
class AdmissionStats(BaseModel):
    total_admissions: int = 0
    currently_admitted: int = 0
    discharged_today: int = 0
    average_stay_days: float = 0.0
