from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# Emergency Contact Schemas
class EmergencyContactBase(BaseModel):
    name: str
    relationship: str
    phone: str

class EmergencyContactCreate(EmergencyContactBase):
    pass

class EmergencyContactResponse(EmergencyContactBase):
    id: int
    patient_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Patient Schemas
class PatientBase(BaseModel):
    full_name: str
    gender: Optional[str] = None
    age: Optional[int] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class PatientCreate(PatientBase):
    user_id: int

class PatientRegister(BaseModel):
    email: str
    password: str
    full_name: str
    gender: Optional[str] = None
    age: Optional[int] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class PatientResponse(PatientBase):
    id: int
    user_id: int
    created_at: datetime
    emergency_contacts: List[EmergencyContactResponse] = []

    class Config:
        from_attributes = True
