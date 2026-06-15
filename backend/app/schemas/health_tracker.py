from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime


# ─── Weight Schemas ────────────────────────────────────────────────────────────

class WeightRecordCreate(BaseModel):
    weight_kg: float = Field(..., gt=0, lt=500, description="Weight in kilograms")
    notes: Optional[str] = None
    recorded_at: Optional[datetime] = None


class WeightRecordResponse(BaseModel):
    id: int
    patient_id: int
    weight_kg: float
    bmi: Optional[float]
    notes: Optional[str]
    recorded_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Height Schemas ────────────────────────────────────────────────────────────

class HeightRecordCreate(BaseModel):
    height_cm: float = Field(..., gt=0, lt=300, description="Height in centimetres")
    notes: Optional[str] = None
    recorded_at: Optional[datetime] = None


class HeightRecordResponse(BaseModel):
    id: int
    patient_id: int
    height_cm: float
    notes: Optional[str]
    recorded_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Blood Pressure Schemas ────────────────────────────────────────────────────

class BloodPressureCreate(BaseModel):
    systolic: int = Field(..., gt=0, lt=300)
    diastolic: int = Field(..., gt=0, lt=200)
    pulse: Optional[int] = Field(None, gt=0, lt=300)
    notes: Optional[str] = None
    recorded_at: Optional[datetime] = None


class BloodPressureResponse(BaseModel):
    id: int
    patient_id: int
    systolic: int
    diastolic: int
    pulse: Optional[int]
    category: Optional[str]
    notes: Optional[str]
    recorded_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Sugar Level Schemas ───────────────────────────────────────────────────────

class SugarLevelCreate(BaseModel):
    glucose_mgdl: float = Field(..., gt=0, lt=1000)
    measurement_type: str = Field(..., description="FASTING | POST_MEAL | RANDOM | HBA1C")
    notes: Optional[str] = None
    recorded_at: Optional[datetime] = None

    @validator("measurement_type")
    def validate_measurement_type(cls, v):
        allowed = {"FASTING", "POST_MEAL", "RANDOM", "HBA1C"}
        if v.upper() not in allowed:
            raise ValueError(f"measurement_type must be one of {allowed}")
        return v.upper()


class SugarLevelResponse(BaseModel):
    id: int
    patient_id: int
    glucose_mgdl: float
    measurement_type: str
    category: Optional[str]
    notes: Optional[str]
    recorded_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Analytics Summary ─────────────────────────────────────────────────────────

class HealthSummary(BaseModel):
    latest_weight_kg: Optional[float]
    latest_height_cm: Optional[float]
    latest_bmi: Optional[float]
    bmi_category: Optional[str]
    latest_bp_systolic: Optional[int]
    latest_bp_diastolic: Optional[int]
    bp_category: Optional[str]
    latest_glucose_mgdl: Optional[float]
    glucose_category: Optional[str]
    total_weight_records: int
    total_height_records: int
    total_bp_records: int
    total_sugar_records: int
