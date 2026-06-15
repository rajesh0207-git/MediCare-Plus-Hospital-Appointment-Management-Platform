from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime

from app.core.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.models.patient import Patient
from app.models.medicine_reminder import MedicineReminder, MedicineReminderHistory
from app.schemas.medicine_reminder import (
    MedicineReminderCreate, MedicineReminderUpdate, MedicineReminderResponse,
    ReminderHistoryCreate, MarkMedicineTaken, ReminderHistoryResponse,
    ReminderWithHistory
)
from app.services.audit_service import audit_service

router = APIRouter(prefix="/medicine-reminders", tags=["Medicine Reminders"])


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_patient(db: Session, user: User) -> Patient:
    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return patient


# ─── Reminder CRUD ─────────────────────────────────────────────────────────────

@router.post("", response_model=MedicineReminderResponse, status_code=status.HTTP_201_CREATED)
def create_reminder(
    payload: MedicineReminderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    """Create a new medicine reminder schedule."""
    patient = _get_patient(db, current_user)

    reminder = MedicineReminder(
        patient_id=patient.id,
        medicine_name=payload.medicine_name,
        dosage=payload.dosage,
        frequency=payload.frequency,
        reminder_time=payload.reminder_time,
        reminder_time_2=payload.reminder_time_2,
        reminder_time_3=payload.reminder_time_3,
        start_date=payload.start_date,
        end_date=payload.end_date,
        notes=payload.notes,
        is_active=True
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    audit_service.log_activity(
        db, current_user.id, "MEDICINE_REMINDER_CREATE",
        f"Created reminder for {payload.medicine_name}"
    )
    return reminder


@router.get("", response_model=List[MedicineReminderResponse])
def list_reminders(
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    """List all medicine reminders for the current patient."""
    patient = _get_patient(db, current_user)
    query = db.query(MedicineReminder).filter(MedicineReminder.patient_id == patient.id)
    if active_only:
        query = query.filter(MedicineReminder.is_active == True)
    return query.order_by(desc(MedicineReminder.created_at)).all()


@router.get("/{reminder_id}", response_model=ReminderWithHistory)
def get_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    """Get a single reminder with its full history."""
    patient = _get_patient(db, current_user)
    reminder = db.query(MedicineReminder).filter(
        MedicineReminder.id == reminder_id,
        MedicineReminder.patient_id == patient.id
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    # Enrich history with medicine_name
    for h in reminder.history:
        h.medicine_name = reminder.medicine_name
    return reminder


@router.patch("/{reminder_id}", response_model=MedicineReminderResponse)
def update_reminder(
    reminder_id: int,
    payload: MedicineReminderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    """Update a medicine reminder (e.g., toggle active, change time)."""
    patient = _get_patient(db, current_user)
    reminder = db.query(MedicineReminder).filter(
        MedicineReminder.id == reminder_id,
        MedicineReminder.patient_id == patient.id
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(reminder, key, value)

    db.commit()
    db.refresh(reminder)
    audit_service.log_activity(
        db, current_user.id, "MEDICINE_REMINDER_UPDATE",
        f"Updated reminder #{reminder_id}"
    )
    return reminder


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    """Delete a medicine reminder and all its history."""
    patient = _get_patient(db, current_user)
    reminder = db.query(MedicineReminder).filter(
        MedicineReminder.id == reminder_id,
        MedicineReminder.patient_id == patient.id
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(reminder)
    db.commit()


# ─── Reminder History / Mark as Taken ─────────────────────────────────────────

@router.post("/{reminder_id}/log", response_model=ReminderHistoryResponse, status_code=status.HTTP_201_CREATED)
def log_reminder_action(
    reminder_id: int,
    payload: MarkMedicineTaken,
    scheduled_date: str = Query(..., description="Date in YYYY-MM-DD format"),
    scheduled_time: str = Query(..., description="Time in HH:MM format"),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    """Log a medicine as TAKEN, MISSED, or SKIPPED."""
    patient = _get_patient(db, current_user)
    reminder = db.query(MedicineReminder).filter(
        MedicineReminder.id == reminder_id,
        MedicineReminder.patient_id == patient.id
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    # Check for duplicate log entry
    existing = db.query(MedicineReminderHistory).filter(
        MedicineReminderHistory.reminder_id == reminder_id,
        MedicineReminderHistory.scheduled_date == scheduled_date,
        MedicineReminderHistory.scheduled_time == scheduled_time
    ).first()

    if existing:
        # Update existing entry
        existing.status = payload.status
        existing.taken_at = datetime.utcnow() if payload.status == "TAKEN" else None
        existing.notes = payload.notes
        db.commit()
        db.refresh(existing)
        return existing

    history_entry = MedicineReminderHistory(
        reminder_id=reminder_id,
        scheduled_time=scheduled_time,
        scheduled_date=scheduled_date,
        status=payload.status,
        taken_at=datetime.utcnow() if payload.status == "TAKEN" else None,
        notes=payload.notes
    )
    db.add(history_entry)
    db.commit()
    db.refresh(history_entry)
    audit_service.log_activity(
        db, current_user.id, "MEDICINE_LOG",
        f"Logged {payload.status} for reminder #{reminder_id} on {scheduled_date}"
    )
    return history_entry


@router.get("/history/all", response_model=List[ReminderHistoryResponse])
def get_all_history(
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    """Get complete medicine history log for the patient."""
    patient = _get_patient(db, current_user)

    # Get all reminders for this patient
    reminder_ids = [r.id for r in db.query(MedicineReminder).filter(
        MedicineReminder.patient_id == patient.id
    ).all()]

    if not reminder_ids:
        return []

    history = db.query(MedicineReminderHistory).filter(
        MedicineReminderHistory.reminder_id.in_(reminder_ids)
    ).order_by(desc(MedicineReminderHistory.scheduled_date)).limit(limit).all()

    # Enrich with medicine name
    reminders_map = {r.id: r.medicine_name for r in db.query(MedicineReminder).filter(
        MedicineReminder.patient_id == patient.id
    ).all()}
    for h in history:
        h.medicine_name = reminders_map.get(h.reminder_id, "Unknown")

    return history


@router.get("/history/today", response_model=List[ReminderHistoryResponse])
def get_today_reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    """Get today's medicine reminder schedule with status."""
    patient = _get_patient(db, current_user)
    today = datetime.utcnow().strftime("%Y-%m-%d")

    reminders = db.query(MedicineReminder).filter(
        MedicineReminder.patient_id == patient.id,
        MedicineReminder.is_active == True
    ).all()

    result = []
    for reminder in reminders:
        # Get today's history entries
        history_today = db.query(MedicineReminderHistory).filter(
            MedicineReminderHistory.reminder_id == reminder.id,
            MedicineReminderHistory.scheduled_date == today
        ).all()

        # Build time slots for today
        times = [reminder.reminder_time]
        if reminder.frequency in ('TWICE_DAILY', 'THREE_TIMES') and reminder.reminder_time_2:
            times.append(reminder.reminder_time_2)
        if reminder.frequency == 'THREE_TIMES' and reminder.reminder_time_3:
            times.append(reminder.reminder_time_3)

        for t in times:
            existing = next((h for h in history_today if h.scheduled_time == t), None)
            if existing:
                existing.medicine_name = reminder.medicine_name
                result.append(existing)
            else:
                # Virtual pending entry
                virtual = ReminderHistoryResponse(
                    id=0,
                    reminder_id=reminder.id,
                    scheduled_time=t,
                    scheduled_date=today,
                    status="PENDING",
                    taken_at=None,
                    notes=None,
                    created_at=datetime.utcnow(),
                    medicine_name=reminder.medicine_name
                )
                result.append(virtual)

    result.sort(key=lambda x: x.scheduled_time)
    return result
