from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime


# ─── Medicine Reminder Schemas ─────────────────────────────────────────────────

class MedicineReminderCreate(BaseModel):
    medicine_name: str
    dosage: Optional[str] = None
    frequency: str  # DAILY, TWICE_DAILY, THREE_TIMES, WEEKLY, AS_NEEDED
    reminder_time: str   # "HH:MM"
    reminder_time_2: Optional[str] = None
    reminder_time_3: Optional[str] = None
    start_date: str   # "YYYY-MM-DD"
    end_date: Optional[str] = None
    notes: Optional[str] = None

    @validator('frequency')
    def validate_frequency(cls, v):
        allowed = ['DAILY', 'TWICE_DAILY', 'THREE_TIMES', 'WEEKLY', 'AS_NEEDED']
        if v not in allowed:
            raise ValueError(f"frequency must be one of {allowed}")
        return v


class MedicineReminderUpdate(BaseModel):
    medicine_name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    reminder_time: Optional[str] = None
    reminder_time_2: Optional[str] = None
    reminder_time_3: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class MedicineReminderResponse(BaseModel):
    id: int
    patient_id: int
    medicine_name: str
    dosage: Optional[str]
    frequency: str
    reminder_time: str
    reminder_time_2: Optional[str]
    reminder_time_3: Optional[str]
    start_date: str
    end_date: Optional[str]
    notes: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Reminder History Schemas ──────────────────────────────────────────────────

class ReminderHistoryCreate(BaseModel):
    reminder_id: int
    scheduled_time: str   # "HH:MM"
    scheduled_date: str   # "YYYY-MM-DD"
    status: str = "TAKEN"  # TAKEN, MISSED, SKIPPED
    notes: Optional[str] = None


class MarkMedicineTaken(BaseModel):
    status: str = "TAKEN"  # TAKEN, MISSED, SKIPPED
    notes: Optional[str] = None

    @validator('status')
    def validate_status(cls, v):
        allowed = ['TAKEN', 'MISSED', 'SKIPPED']
        if v not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v


class ReminderHistoryResponse(BaseModel):
    id: int
    reminder_id: int
    scheduled_time: str
    scheduled_date: str
    status: str
    taken_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    medicine_name: Optional[str] = None

    class Config:
        from_attributes = True


class ReminderWithHistory(MedicineReminderResponse):
    history: List[ReminderHistoryResponse] = []

    class Config:
        from_attributes = True
