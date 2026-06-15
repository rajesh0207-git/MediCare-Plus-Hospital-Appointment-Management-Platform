from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional

# Medical Record Schemas
class MedicalRecordBase(BaseModel):
    title: str
    record_type: Optional[str] = "REPORT"  # REPORT, PRESCRIPTION, LAB_RESULT, OTHER
    notes: Optional[str] = None

class MedicalRecordCreate(MedicalRecordBase):
    patient_id: int
    file_path: Optional[str] = None

class MedicalRecordResponse(MedicalRecordBase):
    id: int
    patient_id: int
    file_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Lab Test Schemas
class LabTestBase(BaseModel):
    test_name: str

class LabTestCreate(LabTestBase):
    patient_id: int

class LabTestUploadResult(BaseModel):
    result_text: str
    file_path: Optional[str] = None

class LabTestResponse(LabTestBase):
    id: int
    patient_id: int
    doctor_id: int
    request_date: date
    status: str
    result_text: Optional[str] = None
    file_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
