from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timedelta, time
from app.core.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.models.doctor import Doctor, Department, DoctorSchedule, DoctorSlot
from app.models.appointment import Appointment
from app.models.patient import Patient
from app.models.review import Review
from app.schemas.doctor import (
    DoctorResponse, DoctorScheduleCreate, DoctorScheduleResponse, AvailableSlotResponse,
    DoctorSlotCreate, DoctorSlotResponse, DoctorSlotUpdate, SlotGenerateRequest
)
from app.schemas.review import ReviewResponse, ReviewCreate
from app.services.audit_service import audit_service
from typing import List, Optional


router = APIRouter(prefix="/doctors", tags=["Doctors & Schedules"])

@router.get("", response_model=List[DoctorResponse])
def list_doctors(
    specialization: Optional[str] = None,
    department_id: Optional[int] = None,
    availability_status: Optional[bool] = None,
    max_fee: Optional[float] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Doctor)
    
    if specialization:
        query = query.filter(Doctor.specialization.like(f"%{specialization}%"))
    if department_id:
        query = query.filter(Doctor.department_id == department_id)
    if availability_status is not None:
        query = query.filter(Doctor.availability_status == availability_status)
    if max_fee:
        query = query.filter(Doctor.consultation_fee <= max_fee)
        
    doctors = query.all()
    
    # Map responses and calculate average ratings
    response_data = []
    for doc in doctors:
        # Calculate average rating
        avg_rating = db.query(func.avg(Review.rating)).filter(Review.doctor_id == doc.id).scalar() or 0.0
        
        response_data.append({
            "id": doc.id,
            "user_id": doc.user_id,
            "email": doc.user.email if doc.user else "",
            "department": doc.department,
            "specialization": doc.specialization,
            "qualification": doc.qualification,
            "experience": doc.experience,
            "consultation_fee": doc.consultation_fee,
            "availability_status": doc.availability_status,
            "schedules": doc.schedules,
            "average_rating": float(round(avg_rating, 1))
        })
        
    return response_data

@router.get("/{id}", response_model=DoctorResponse)
def get_doctor_profile(id: int, db: Session = Depends(get_db)):
    doc = db.query(Doctor).filter(Doctor.id == id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
        
    avg_rating = db.query(func.avg(Review.rating)).filter(Review.doctor_id == doc.id).scalar() or 0.0
    
    return {
        "id": doc.id,
        "user_id": doc.user_id,
        "email": doc.user.email if doc.user else "",
        "department": doc.department,
        "specialization": doc.specialization,
        "qualification": doc.qualification,
        "experience": doc.experience,
        "consultation_fee": doc.consultation_fee,
        "availability_status": doc.availability_status,
        "schedules": doc.schedules,
        "average_rating": float(round(avg_rating, 1))
    }

@router.post("/me/schedule", response_model=DoctorScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_doctor_schedule(
    schedule_data: DoctorScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["DOCTOR"]))
):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
        
    new_sched = DoctorSchedule(
        doctor_id=doctor.id,
        day_of_week=schedule_data.day_of_week,
        start_time=schedule_data.start_time,
        end_time=schedule_data.end_time,
        slot_duration_minutes=schedule_data.slot_duration_minutes
    )
    db.add(new_sched)
    db.commit()
    db.refresh(new_sched)
    
    audit_service.log_activity(db, current_user.id, "DOCTOR_SCHEDULE_UPDATE", f"Updated weekly schedule for {schedule_data.day_of_week}")
    return new_sched

@router.get("/{id}/slots", response_model=List[AvailableSlotResponse])
def get_available_slots(id: int, appointment_date: date, db: Session = Depends(get_db)):
    doc = db.query(Doctor).filter(Doctor.id == id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
        
    # 1. Query DoctorSlot first
    db_slots = db.query(DoctorSlot).filter(
        DoctorSlot.doctor_id == id,
        DoctorSlot.slot_date == appointment_date
    ).all()
    
    if db_slots:
        slots = []
        for s in db_slots:
            slots.append({
                "id": s.id,
                "time": s.start_time.strftime("%H:%M"),
                "is_available": s.is_available,
                "status": s.status
            })
        slots.sort(key=lambda x: x["time"])
        return slots
        
    # 2. No slots in DB yet, dynamically generate them from weekly template
    day_name = appointment_date.strftime("%A")
    schedules = db.query(DoctorSchedule).filter(
        DoctorSchedule.doctor_id == id,
        DoctorSchedule.day_of_week == day_name
    ).all()
    
    booked_appointments = db.query(Appointment.time_slot).filter(
        Appointment.doctor_id == id,
        Appointment.appointment_date == appointment_date,
        Appointment.status.in_(["PENDING", "CONFIRMED"])
    ).all()
    booked_slots = {app[0] for app in booked_appointments}
    
    new_slots = []
    for sched in schedules:
        start_dt = datetime.combine(date.today(), sched.start_time)
        end_dt = datetime.combine(date.today(), sched.end_time)
        delta = timedelta(minutes=sched.slot_duration_minutes)
        
        curr = start_dt
        while curr < end_dt:
            slot_time = curr.time()
            slot_str = slot_time.strftime("%H:%M")
            
            # Determine availability & status
            is_booked = slot_str in booked_slots
            slot_status = "BOOKED" if is_booked else "AVAILABLE"
            is_avail = not is_booked
            
            db_slot = DoctorSlot(
                doctor_id=id,
                slot_date=appointment_date,
                start_time=slot_time,
                end_time=(curr + delta).time(),
                is_available=is_avail,
                status=slot_status
            )
            db.add(db_slot)
            new_slots.append(db_slot)
            curr += delta
            
    if new_slots:
        db.commit()
        slots = []
        for s in new_slots:
            slots.append({
                "id": s.id,
                "time": s.start_time.strftime("%H:%M"),
                "is_available": s.is_available,
                "status": s.status
            })
        slots.sort(key=lambda x: x["time"])
        return slots
        
    return []


@router.post("/{id}/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def submit_doctor_review(
    id: int,
    review_data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
        
    # Verify doctor exists
    doc = db.query(Doctor).filter(Doctor.id == id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
        
    new_review = Review(
        patient_id=patient.id,
        doctor_id=id,
        rating=review_data.rating,
        comment=review_data.comment
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    
    audit_service.log_activity(db, current_user.id, "SUBMIT_DOCTOR_REVIEW", f"Submitted {review_data.rating} stars review for doctor ID {id}")
    return new_review

@router.post("/me/slots", response_model=DoctorSlotResponse, status_code=status.HTTP_201_CREATED)
def create_custom_slot(
    slot_data: DoctorSlotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["DOCTOR"]))
):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
        
    try:
        start_t = datetime.strptime(slot_data.start_time, "%H:%M").time()
        end_t = datetime.strptime(slot_data.end_time, "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")

    conflict = db.query(DoctorSlot).filter(
        DoctorSlot.doctor_id == doctor.id,
        DoctorSlot.slot_date == slot_data.slot_date,
        DoctorSlot.start_time < end_t,
        DoctorSlot.end_time > start_t
    ).first()
    if conflict:
        raise HTTPException(status_code=400, detail="Slot conflicts with an existing slot on this date")

    new_slot = DoctorSlot(
        doctor_id=doctor.id,
        slot_date=slot_data.slot_date,
        start_time=start_t,
        end_time=end_t,
        is_available=True,
        status="AVAILABLE"
    )
    db.add(new_slot)
    db.commit()
    db.refresh(new_slot)
    
    audit_service.log_activity(db, current_user.id, "DOCTOR_SLOT_CREATE", f"Created custom slot {slot_data.start_time}-{slot_data.end_time} on {slot_data.slot_date}")
    
    return {
        "id": new_slot.id,
        "doctor_id": new_slot.doctor_id,
        "slot_date": new_slot.slot_date,
        "start_time": new_slot.start_time.strftime("%H:%M"),
        "end_time": new_slot.end_time.strftime("%H:%M"),
        "is_available": new_slot.is_available,
        "status": new_slot.status
    }

@router.put("/me/slots/{slot_id}", response_model=DoctorSlotResponse)
def update_slot_status(
    slot_id: int,
    slot_update: DoctorSlotUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["DOCTOR"]))
):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    slot = db.query(DoctorSlot).filter(DoctorSlot.id == slot_id, DoctorSlot.doctor_id == doctor.id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    if slot_update.status is not None:
        slot.status = slot_update.status
        if slot_update.status == "AVAILABLE":
            slot.is_available = True
        else:
            slot.is_available = False
            
    if slot_update.is_available is not None:
        slot.is_available = slot_update.is_available
        if slot_update.is_available:
            slot.status = "AVAILABLE"
        else:
            if slot.status == "AVAILABLE":
                slot.status = "BLOCKED"

    db.commit()
    db.refresh(slot)
    
    audit_service.log_activity(db, current_user.id, "DOCTOR_SLOT_UPDATE", f"Updated slot ID {slot_id} to status {slot.status} (Available: {slot.is_available})")
    
    return {
        "id": slot.id,
        "doctor_id": slot.doctor_id,
        "slot_date": slot.slot_date,
        "start_time": slot.start_time.strftime("%H:%M"),
        "end_time": slot.end_time.strftime("%H:%M"),
        "is_available": slot.is_available,
        "status": slot.status
    }

@router.delete("/me/slots/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["DOCTOR"]))
):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    slot = db.query(DoctorSlot).filter(DoctorSlot.id == slot_id, DoctorSlot.doctor_id == doctor.id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    if slot.status == "BOOKED":
        raise HTTPException(status_code=400, detail="Cannot delete a booked slot")

    db.delete(slot)
    db.commit()
    
    audit_service.log_activity(db, current_user.id, "DOCTOR_SLOT_DELETE", f"Deleted slot ID {slot_id} on {slot.slot_date}")
    return None

@router.post("/me/slots/generate", response_model=List[DoctorSlotResponse])
def batch_generate_slots(
    gen_data: SlotGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["DOCTOR"]))
):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    if gen_data.start_date > gen_data.end_date:
        raise HTTPException(status_code=400, detail="Start date must be before or equal to end date")

    curr_date = gen_data.start_date
    delta_day = timedelta(days=1)
    
    generated_slots = []
    
    while curr_date <= gen_data.end_date:
        day_name = curr_date.strftime("%A")
        schedules = db.query(DoctorSchedule).filter(
            DoctorSchedule.doctor_id == doctor.id,
            DoctorSchedule.day_of_week == day_name
        ).all()
        
        exists = db.query(DoctorSlot).filter(
            DoctorSlot.doctor_id == doctor.id,
            DoctorSlot.slot_date == curr_date
        ).first()
        
        if not exists and schedules:
            booked_appointments = db.query(Appointment.time_slot).filter(
                Appointment.doctor_id == doctor.id,
                Appointment.appointment_date == curr_date,
                Appointment.status.in_(["PENDING", "CONFIRMED"])
            ).all()
            booked_slots = {app[0] for app in booked_appointments}
            
            for sched in schedules:
                start_dt = datetime.combine(date.today(), sched.start_time)
                end_dt = datetime.combine(date.today(), sched.end_time)
                delta = timedelta(minutes=sched.slot_duration_minutes)
                
                curr = start_dt
                while curr < end_dt:
                    slot_time = curr.time()
                    slot_str = slot_time.strftime("%H:%M")
                    
                    is_booked = slot_str in booked_slots
                    slot_status = "BOOKED" if is_booked else "AVAILABLE"
                    is_avail = not is_booked
                    
                    db_slot = DoctorSlot(
                        doctor_id=doctor.id,
                        slot_date=curr_date,
                        start_time=slot_time,
                        end_time=(curr + delta).time(),
                        is_available=is_avail,
                        status=slot_status
                    )
                    db.add(db_slot)
                    generated_slots.append(db_slot)
                    curr += delta
                    
        curr_date += delta_day
        
    db.commit()
    
    result = db.query(DoctorSlot).filter(
        DoctorSlot.doctor_id == doctor.id,
        DoctorSlot.slot_date >= gen_data.start_date,
        DoctorSlot.slot_date <= gen_data.end_date
    ).all()
    
    audit_service.log_activity(db, current_user.id, "DOCTOR_SLOTS_GENERATE", f"Batch generated slots from {gen_data.start_date} to {gen_data.end_date}")
    
    return [
        {
            "id": s.id,
            "doctor_id": s.doctor_id,
            "slot_date": s.slot_date,
            "start_time": s.start_time.strftime("%H:%M"),
            "end_time": s.end_time.strftime("%H:%M"),
            "is_available": s.is_available,
            "status": s.status
        }
        for s in result
    ]

