from pydantic import BaseModel
from datetime import datetime, time, date
from typing import Optional, List

# Department Schemas
class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentResponse(DepartmentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Doctor Schedule Schemas
class DoctorScheduleBase(BaseModel):
    day_of_week: str
    start_time: time
    end_time: time
    slot_duration_minutes: Optional[int] = 30

class DoctorScheduleCreate(DoctorScheduleBase):
    pass

class DoctorScheduleResponse(DoctorScheduleBase):
    id: int
    doctor_id: int

    class Config:
        from_attributes = True

# Doctor Profile Schemas
class DoctorBase(BaseModel):
    specialization: str
    qualification: str
    experience: int
    consultation_fee: float
    availability_status: Optional[bool] = True

class DoctorCreate(DoctorBase):
    user_id: int
    department_id: Optional[int] = None

class DoctorRegister(BaseModel):
    email: str
    password: str
    specialization: str
    qualification: str
    experience: int
    consultation_fee: float
    department_id: Optional[int] = None

class DoctorUpdate(BaseModel):
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[int] = None
    consultation_fee: Optional[float] = None
    availability_status: Optional[bool] = None
    department_id: Optional[int] = None

class DoctorSimpleResponse(DoctorBase):
    id: int
    user_id: int
    department_id: Optional[int] = None

    class Config:
        from_attributes = True

class DoctorResponse(DoctorBase):
    id: int
    user_id: int
    email: str
    department: Optional[DepartmentResponse] = None
    schedules: List[DoctorScheduleResponse] = []
    average_rating: float = 0.0

    class Config:
        from_attributes = True

# Time slot schema
class AvailableSlotResponse(BaseModel):
    id: Optional[int] = None # Added slot ID support for dynamic slot tracking
    time: str  # e.g. "09:30"
    is_available: bool
    status: Optional[str] = "AVAILABLE"

class DepartmentStats(BaseModel):
    department_id: int
    name: str
    doctor_count: int
    total_appointments: int

class DoctorSlotCreate(BaseModel):
    slot_date: date
    start_time: str  # e.g., "14:30"
    end_time: str    # e.g., "15:00"

class DoctorSlotUpdate(BaseModel):
    is_available: Optional[bool] = None
    status: Optional[str] = None # AVAILABLE, BLOCKED, BOOKED

class DoctorSlotResponse(BaseModel):
    id: int
    doctor_id: int
    slot_date: date
    start_time: str  # HH:MM format string for client
    end_time: str    # HH:MM format string for client
    is_available: bool
    status: str

    class Config:
        from_attributes = True

class SlotGenerateRequest(BaseModel):
    start_date: date
    end_date: date

