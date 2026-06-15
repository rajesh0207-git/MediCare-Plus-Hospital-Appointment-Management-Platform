from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


# --------- Emergency Request Schemas ---------
class EmergencyRequestCreate(BaseModel):
    patient_id: Optional[int] = None
    contact_number: Optional[str] = None
    emergency_type: str = "OTHER"  # CARDIAC, TRAUMA, STROKE, etc.
    priority: str = "HIGH"  # CRITICAL, HIGH, MEDIUM, LOW
    location: str = Field(..., min_length=3, max_length=500)
    description: str = Field(..., min_length=10)
    patient_condition: Optional[str] = None


class EmergencyDispatch(BaseModel):
    assigned_team: str
    assigned_vehicle: str
    response_time_minutes: Optional[int] = None


class EmergencyUpdate(BaseModel):
    status: Optional[str] = None
    assigned_team: Optional[str] = None
    assigned_vehicle: Optional[str] = None
    treatment_given: Optional[str] = None
    transported_to: Optional[str] = None
    arrived_at_hospital: Optional[datetime] = None
    outcome_notes: Optional[str] = None
    cancelled_reason: Optional[str] = None


class EmergencyRequestResponse(BaseModel):
    id: int
    patient_id: Optional[int] = None
    requested_by: int
    contact_number: Optional[str] = None
    emergency_type: str
    priority: str
    status: str
    location: str
    description: str
    patient_condition: Optional[str] = None
    dispatched_at: Optional[datetime] = None
    response_time_minutes: Optional[int] = None
    assigned_team: Optional[str] = None
    assigned_vehicle: Optional[str] = None
    treatment_given: Optional[str] = None
    transported_to: Optional[str] = None
    arrived_at_hospital: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    outcome_notes: Optional[str] = None
    cancelled_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EmergencyRequestDetail(EmergencyRequestResponse):
    patient_name: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    requester_name: Optional[str] = None
    requester_phone: Optional[str] = None
    time_since_request_minutes: Optional[int] = None


class EmergencyStats(BaseModel):
    total_requests: int = 0
    pending: int = 0
    dispatched: int = 0
    in_progress: int = 0
    completed: int = 0
    cancelled: int = 0
    critical_count: int = 0
    avg_response_time: float = 0.0
