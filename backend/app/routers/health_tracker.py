from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime

from app.core.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.models.patient import Patient
from app.models.health_tracker import (
    WeightRecord, HeightRecord, BloodPressureRecord, SugarLevelRecord
)
from app.schemas.health_tracker import (
    WeightRecordCreate, WeightRecordResponse,
    HeightRecordCreate, HeightRecordResponse,
    BloodPressureCreate, BloodPressureResponse,
    SugarLevelCreate, SugarLevelResponse,
    HealthSummary
)
from app.services.audit_service import audit_service

router = APIRouter(prefix="/health-tracker", tags=["Health Tracker"])

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_patient(db: Session, user: User) -> Patient:
    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return patient


def _classify_bp(systolic: int, diastolic: int) -> str:
    # AHA guidelines: check most severe first
    if systolic > 180 or diastolic > 120:
        return "CRISIS"
    elif systolic >= 140 or diastolic >= 90:
        return "HIGH_STAGE2"
    elif (130 <= systolic <= 139) or (80 <= diastolic <= 89):
        return "HIGH_STAGE1"
    elif (120 <= systolic <= 129) and diastolic < 80:
        return "ELEVATED"
    else:
        return "NORMAL"


def _classify_glucose(glucose: float, measure_type: str) -> str:
    if measure_type == "HBA1C":
        if glucose < 5.7:
            return "NORMAL"
        elif glucose < 6.5:
            return "PREDIABETES"
        else:
            return "DIABETES"
    elif measure_type == "FASTING":
        if glucose < 100:
            return "NORMAL"
        elif glucose < 126:
            return "PREDIABETES"
        else:
            return "DIABETES"
    else:  # POST_MEAL or RANDOM
        if glucose < 140:
            return "NORMAL"
        elif glucose < 200:
            return "PREDIABETES"
        else:
            return "DIABETES"


def _compute_bmi(weight_kg: float, height_cm: float) -> float:
    height_m = height_cm / 100
    return round(weight_kg / (height_m ** 2), 1)


def _bmi_category(bmi: float) -> str:
    if bmi < 18.5:
        return "UNDERWEIGHT"
    elif bmi < 25:
        return "NORMAL"
    elif bmi < 30:
        return "OVERWEIGHT"
    else:
        return "OBESE"


# ─── Weight Endpoints ─────────────────────────────────────────────────────────

@router.post("/weight", response_model=WeightRecordResponse, status_code=status.HTTP_201_CREATED)
def add_weight(
    payload: WeightRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    patient = _get_patient(db, current_user)

    # Try to compute BMI from latest height
    latest_height = (
        db.query(HeightRecord)
        .filter(HeightRecord.patient_id == patient.id)
        .order_by(desc(HeightRecord.recorded_at))
        .first()
    )
    bmi = _compute_bmi(payload.weight_kg, latest_height.height_cm) if latest_height else None

    record = WeightRecord(
        patient_id=patient.id,
        weight_kg=payload.weight_kg,
        bmi=bmi,
        notes=payload.notes,
        recorded_at=payload.recorded_at or datetime.utcnow()
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    audit_service.log_activity(db, current_user.id, "HEALTH_WEIGHT_ADD", f"Added weight {payload.weight_kg} kg")
    return record


@router.get("/weight", response_model=List[WeightRecordResponse])
def list_weight(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT", "DOCTOR"]))
):
    patient = _get_patient(db, current_user) if current_user.role == "PATIENT" else None
    query = db.query(WeightRecord)
    if patient:
        query = query.filter(WeightRecord.patient_id == patient.id)
    return query.order_by(desc(WeightRecord.recorded_at)).limit(limit).all()


@router.delete("/weight/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_weight(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    patient = _get_patient(db, current_user)
    record = db.query(WeightRecord).filter(
        WeightRecord.id == record_id,
        WeightRecord.patient_id == patient.id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()


# ─── Height Endpoints ─────────────────────────────────────────────────────────

@router.post("/height", response_model=HeightRecordResponse, status_code=status.HTTP_201_CREATED)
def add_height(
    payload: HeightRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    patient = _get_patient(db, current_user)
    record = HeightRecord(
        patient_id=patient.id,
        height_cm=payload.height_cm,
        notes=payload.notes,
        recorded_at=payload.recorded_at or datetime.utcnow()
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    audit_service.log_activity(db, current_user.id, "HEALTH_HEIGHT_ADD", f"Added height {payload.height_cm} cm")
    return record


@router.get("/height", response_model=List[HeightRecordResponse])
def list_height(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT", "DOCTOR"]))
):
    patient = _get_patient(db, current_user) if current_user.role == "PATIENT" else None
    query = db.query(HeightRecord)
    if patient:
        query = query.filter(HeightRecord.patient_id == patient.id)
    return query.order_by(desc(HeightRecord.recorded_at)).limit(limit).all()


@router.delete("/height/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_height(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    patient = _get_patient(db, current_user)
    record = db.query(HeightRecord).filter(
        HeightRecord.id == record_id,
        HeightRecord.patient_id == patient.id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()


# ─── Blood Pressure Endpoints ─────────────────────────────────────────────────

@router.post("/blood-pressure", response_model=BloodPressureResponse, status_code=status.HTTP_201_CREATED)
def add_blood_pressure(
    payload: BloodPressureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    patient = _get_patient(db, current_user)
    category = _classify_bp(payload.systolic, payload.diastolic)
    record = BloodPressureRecord(
        patient_id=patient.id,
        systolic=payload.systolic,
        diastolic=payload.diastolic,
        pulse=payload.pulse,
        category=category,
        notes=payload.notes,
        recorded_at=payload.recorded_at or datetime.utcnow()
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    audit_service.log_activity(db, current_user.id, "HEALTH_BP_ADD", f"BP {payload.systolic}/{payload.diastolic} ({category})")
    return record


@router.get("/blood-pressure", response_model=List[BloodPressureResponse])
def list_blood_pressure(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT", "DOCTOR"]))
):
    patient = _get_patient(db, current_user) if current_user.role == "PATIENT" else None
    query = db.query(BloodPressureRecord)
    if patient:
        query = query.filter(BloodPressureRecord.patient_id == patient.id)
    return query.order_by(desc(BloodPressureRecord.recorded_at)).limit(limit).all()


@router.delete("/blood-pressure/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_blood_pressure(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    patient = _get_patient(db, current_user)
    record = db.query(BloodPressureRecord).filter(
        BloodPressureRecord.id == record_id,
        BloodPressureRecord.patient_id == patient.id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()


# ─── Sugar Level Endpoints ────────────────────────────────────────────────────

@router.post("/sugar", response_model=SugarLevelResponse, status_code=status.HTTP_201_CREATED)
def add_sugar(
    payload: SugarLevelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    patient = _get_patient(db, current_user)
    category = _classify_glucose(payload.glucose_mgdl, payload.measurement_type)
    record = SugarLevelRecord(
        patient_id=patient.id,
        glucose_mgdl=payload.glucose_mgdl,
        measurement_type=payload.measurement_type,
        category=category,
        notes=payload.notes,
        recorded_at=payload.recorded_at or datetime.utcnow()
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    audit_service.log_activity(db, current_user.id, "HEALTH_SUGAR_ADD", f"Glucose {payload.glucose_mgdl} mg/dL ({category})")
    return record


@router.get("/sugar", response_model=List[SugarLevelResponse])
def list_sugar(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT", "DOCTOR"]))
):
    patient = _get_patient(db, current_user) if current_user.role == "PATIENT" else None
    query = db.query(SugarLevelRecord)
    if patient:
        query = query.filter(SugarLevelRecord.patient_id == patient.id)
    return query.order_by(desc(SugarLevelRecord.recorded_at)).limit(limit).all()


@router.delete("/sugar/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sugar(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    patient = _get_patient(db, current_user)
    record = db.query(SugarLevelRecord).filter(
        SugarLevelRecord.id == record_id,
        SugarLevelRecord.patient_id == patient.id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()


# ─── Health Analytics Summary ─────────────────────────────────────────────────

@router.get("/summary", response_model=HealthSummary)
def health_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    patient = _get_patient(db, current_user)

    latest_w = db.query(WeightRecord).filter(WeightRecord.patient_id == patient.id).order_by(desc(WeightRecord.recorded_at)).first()
    latest_h = db.query(HeightRecord).filter(HeightRecord.patient_id == patient.id).order_by(desc(HeightRecord.recorded_at)).first()
    latest_bp = db.query(BloodPressureRecord).filter(BloodPressureRecord.patient_id == patient.id).order_by(desc(BloodPressureRecord.recorded_at)).first()
    latest_s = db.query(SugarLevelRecord).filter(SugarLevelRecord.patient_id == patient.id).order_by(desc(SugarLevelRecord.recorded_at)).first()

    bmi = None
    bmi_cat = None
    if latest_w and latest_h:
        bmi = _compute_bmi(latest_w.weight_kg, latest_h.height_cm)
        bmi_cat = _bmi_category(bmi)

    total_w = db.query(WeightRecord).filter(WeightRecord.patient_id == patient.id).count()
    total_h = db.query(HeightRecord).filter(HeightRecord.patient_id == patient.id).count()
    total_bp = db.query(BloodPressureRecord).filter(BloodPressureRecord.patient_id == patient.id).count()
    total_s = db.query(SugarLevelRecord).filter(SugarLevelRecord.patient_id == patient.id).count()

    return HealthSummary(
        latest_weight_kg=latest_w.weight_kg if latest_w else None,
        latest_height_cm=latest_h.height_cm if latest_h else None,
        latest_bmi=bmi,
        bmi_category=bmi_cat,
        latest_bp_systolic=latest_bp.systolic if latest_bp else None,
        latest_bp_diastolic=latest_bp.diastolic if latest_bp else None,
        bp_category=latest_bp.category if latest_bp else None,
        latest_glucose_mgdl=latest_s.glucose_mgdl if latest_s else None,
        glucose_category=latest_s.category if latest_s else None,
        total_weight_records=total_w,
        total_height_records=total_h,
        total_bp_records=total_bp,
        total_sugar_records=total_s
    )
