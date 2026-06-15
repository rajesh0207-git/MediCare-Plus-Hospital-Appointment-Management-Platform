from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


# --------- Ward Schemas ---------
class WardBase(BaseModel):
    name: str
    ward_type: str = "GENERAL"
    floor: int = 1
    total_beds: int = 0
    description: Optional[str] = None


class WardCreate(WardBase):
    pass


class WardUpdate(BaseModel):
    name: Optional[str] = None
    ward_type: Optional[str] = None
    floor: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class WardResponse(WardBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WardWithStats(WardResponse):
    available_beds: int = 0
    occupied_beds: int = 0
    maintenance_beds: int = 0
    reserved_beds: int = 0


# --------- Bed Schemas ---------
class BedBase(BaseModel):
    ward_id: int
    bed_number: str
    bed_type: str = "STANDARD"
    daily_rate: int = 100
    notes: Optional[str] = None


class BedCreate(BedBase):
    pass


class BedUpdate(BaseModel):
    bed_type: Optional[str] = None
    status: Optional[str] = None
    daily_rate: Optional[int] = None
    notes: Optional[str] = None


class BedResponse(BedBase):
    id: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BedDetailResponse(BedResponse):
    ward_name: Optional[str] = None
    current_patient: Optional[str] = None


# --------- Bed Assignment Schemas ---------
class BedAssignmentBase(BaseModel):
    bed_id: int
    patient_id: int
    reason: Optional[str] = None
    notes: Optional[str] = None


class BedAssignmentCreate(BedAssignmentBase):
    pass


class DischargeRequest(BaseModel):
    notes: Optional[str] = None


class TransferRequest(BaseModel):
    new_bed_id: int
    notes: Optional[str] = None


class BedAssignmentResponse(BedAssignmentBase):
    id: int
    assigned_by: Optional[int] = None
    admission_date: datetime
    discharge_date: Optional[datetime] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BedAssignmentDetailResponse(BedAssignmentResponse):
    patient_name: Optional[str] = None
    bed_number: Optional[str] = None
    ward_name: Optional[str] = None
    assigned_by_name: Optional[str] = None


# --------- Dashboard / Stats ---------
class BedDashboardStats(BaseModel):
    total_wards: int = 0
    total_beds: int = 0
    available_beds: int = 0
    occupied_beds: int = 0
    maintenance_beds: int = 0
    reserved_beds: int = 0
    occupancy_rate: float = 0.0
    active_admissions: int = 0
