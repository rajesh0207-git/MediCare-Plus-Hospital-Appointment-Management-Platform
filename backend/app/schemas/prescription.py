from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import datetime
import json

class MedicationItem(BaseModel):
    name: str
    dosage: str       # e.g. "500mg" or "1 tablet"
    frequency: str    # e.g. "Twice daily" or "Once at night"
    duration: str     # e.g. "5 days" or "1 month"

class PrescriptionBase(BaseModel):
    medications: List[MedicationItem]
    instructions: Optional[str] = None

class PrescriptionCreate(PrescriptionBase):
    appointment_id: int

class PrescriptionResponse(BaseModel):
    id: int
    appointment_id: int
    patient_id: int
    doctor_id: int
    medications: List[MedicationItem]
    instructions: Optional[str] = None
    pdf_path: Optional[str] = None
    created_at: datetime

    @field_validator("medications", mode="before")
    @classmethod
    def parse_medications(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v

    class Config:
        from_attributes = True
