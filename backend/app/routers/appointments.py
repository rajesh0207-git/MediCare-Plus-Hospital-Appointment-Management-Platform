from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import json
import os
from datetime import date, datetime, timedelta, time
from app.core.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.models.patient import Patient
from app.models.doctor import Doctor, DoctorSlot, DoctorSchedule
from app.models.appointment import Appointment, Consultation
from app.models.prescription import Prescription
from app.schemas.appointment import AppointmentResponse, AppointmentCreate, AppointmentReschedule, AppointmentUpdateStatus, ConsultationCreate, ConsultationResponse
from app.schemas.prescription import PrescriptionResponse, PrescriptionBase
from app.services.notification_service import notification_service
from app.services.pdf_service import PDFService
from app.services.audit_service import audit_service
from typing import List, Optional

router = APIRouter(prefix="/appointments", tags=["Appointment Booking"])

@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def book_appointment(
    appt_data: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
        
    doctor = db.query(Doctor).filter(Doctor.id == appt_data.doctor_id).first()
    if not doctor or not doctor.availability_status:
        raise HTTPException(status_code=400, detail="Doctor is not available or does not exist")
        
    # Check slot availability in DoctorSlot database
    try:
        t_slot = datetime.strptime(appt_data.time_slot, "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid time slot format. Must be HH:MM")

    db_slot = db.query(DoctorSlot).filter(
        DoctorSlot.doctor_id == appt_data.doctor_id,
        DoctorSlot.slot_date == appt_data.appointment_date,
        DoctorSlot.start_time == t_slot
    ).first()
    
    if db_slot:
        if db_slot.status != "AVAILABLE" or not db_slot.is_available:
            raise HTTPException(status_code=400, detail=f"The requested slot is not available (Status: {db_slot.status})")
        db_slot.status = "BOOKED"
        db_slot.is_available = False
    else:
        # Fallback: if slots are not generated yet, validate against DoctorSchedule templates
        day_name = appt_data.appointment_date.strftime("%A")
        schedule = db.query(DoctorSchedule).filter(
            DoctorSchedule.doctor_id == appt_data.doctor_id,
            DoctorSchedule.day_of_week == day_name
        ).first()
        
        if not schedule:
            raise HTTPException(status_code=400, detail="Doctor is not scheduled to work on this day")
            
        start_time_secs = schedule.start_time.hour * 3600 + schedule.start_time.minute * 60
        end_time_secs = schedule.end_time.hour * 3600 + schedule.end_time.minute * 60
        req_time_secs = t_slot.hour * 3600 + t_slot.minute * 60
        
        if req_time_secs < start_time_secs or req_time_secs >= end_time_secs:
            raise HTTPException(status_code=400, detail="Requested slot is outside doctor working hours")
            
        offset = (req_time_secs - start_time_secs) / 60
        if offset % schedule.slot_duration_minutes != 0:
            raise HTTPException(status_code=400, detail="Requested slot is not aligned with doctor slot schedule")
            
        # Check if already booked
        exists = db.query(Appointment).filter(
            Appointment.doctor_id == appt_data.doctor_id,
            Appointment.appointment_date == appt_data.appointment_date,
            Appointment.time_slot == appt_data.time_slot,
            Appointment.status.in_(["PENDING", "CONFIRMED"])
        ).first()
        if exists:
            raise HTTPException(status_code=400, detail="This time slot is already booked")
            
        # Create DoctorSlot as booked
        delta_end = timedelta(minutes=schedule.slot_duration_minutes)
        curr_dt = datetime.combine(date.today(), t_slot)
        end_t = (curr_dt + delta_end).time()
        
        new_db_slot = DoctorSlot(
            doctor_id=appt_data.doctor_id,
            slot_date=appt_data.appointment_date,
            start_time=t_slot,
            end_time=end_t,
            is_available=False,
            status="BOOKED"
        )
        db.add(new_db_slot)

    # Create Appointment
    new_appt = Appointment(
        patient_id=patient.id,
        doctor_id=appt_data.doctor_id,
        appointment_date=appt_data.appointment_date,
        time_slot=appt_data.time_slot,
        status="PENDING",
        symptoms=appt_data.symptoms
    )
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)

    
    # Notify Doctor
    doctor_user_id = doctor.user_id
    await notification_service.push_notification(
        db,
        user_id=doctor_user_id,
        message=f"New appointment request from {patient.full_name} on {new_appt.appointment_date} at {new_appt.time_slot}.",
        notification_type="APPOINTMENT"
    )
    
    audit_service.log_activity(db, current_user.id, "APPOINTMENT_BOOK", f"Booked appointment ID {new_appt.id} with Doctor {doctor.id}")
    return new_appt

@router.get("", response_model=List[AppointmentResponse])
def get_appointment_history(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Appointment)
    
    if current_user.role == "PATIENT":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        query = query.filter(Appointment.patient_id == patient.id)
    elif current_user.role == "DOCTOR":
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor:
            return []
        query = query.filter(Appointment.doctor_id == doctor.id)
    # Admin sees all
    
    if status_filter:
        query = query.filter(Appointment.status == status_filter)
        
    return query.order_by(Appointment.appointment_date.desc(), Appointment.time_slot.desc()).all()

@router.post("/{id}/reschedule", response_model=AppointmentResponse)
async def reschedule_appointment(
    id: int,
    resched_data: AppointmentReschedule,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    # Check permissions (either the booking patient or the doctor)
    if current_user.role == "PATIENT":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or appt.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Forbidden")
    elif current_user.role == "DOCTOR":
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor or appt.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="Forbidden")
            
    # Check slot conflicts
    exists = db.query(Appointment).filter(
        Appointment.doctor_id == appt.doctor_id,
        Appointment.appointment_date == resched_data.appointment_date,
        Appointment.time_slot == resched_data.time_slot,
        Appointment.id != id,
        Appointment.status.in_(["PENDING", "CONFIRMED"])
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="Target slot is already booked")
        
    # Update appointment and slots
    old_date = appt.appointment_date
    old_slot = appt.time_slot

    # 1. Free up old slot
    try:
        old_time_slot_t = datetime.strptime(old_slot, "%H:%M").time()
        old_db_slot = db.query(DoctorSlot).filter(
            DoctorSlot.doctor_id == appt.doctor_id,
            DoctorSlot.slot_date == old_date,
            DoctorSlot.start_time == old_time_slot_t
        ).first()
        if old_db_slot:
            old_db_slot.status = "AVAILABLE"
            old_db_slot.is_available = True
    except Exception as e:
        print(f"Error freeing old slot: {e}")

    # 2. Claim new slot
    try:
        new_time_slot_t = datetime.strptime(resched_data.time_slot, "%H:%M").time()
        new_db_slot = db.query(DoctorSlot).filter(
            DoctorSlot.doctor_id == appt.doctor_id,
            DoctorSlot.slot_date == resched_data.appointment_date,
            DoctorSlot.start_time == new_time_slot_t
        ).first()
        
        if new_db_slot:
            if new_db_slot.status != "AVAILABLE" or not new_db_slot.is_available:
                raise HTTPException(status_code=400, detail="Target slot is not available")
            new_db_slot.status = "BOOKED"
            new_db_slot.is_available = False
        else:
            day_name = resched_data.appointment_date.strftime("%A")
            schedule = db.query(DoctorSchedule).filter(
                DoctorSchedule.doctor_id == appt.doctor_id,
                DoctorSchedule.day_of_week == day_name
            ).first()
            if schedule:
                delta_end = timedelta(minutes=schedule.slot_duration_minutes)
                curr_dt = datetime.combine(date.today(), new_time_slot_t)
                end_t = (curr_dt + delta_end).time()
                
                new_slot_rec = DoctorSlot(
                    doctor_id=appt.doctor_id,
                    slot_date=resched_data.appointment_date,
                    start_time=new_time_slot_t,
                    end_time=end_t,
                    is_available=False,
                    status="BOOKED"
                )
                db.add(new_slot_rec)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error booking new slot: {e}")

    appt.appointment_date = resched_data.appointment_date
    appt.time_slot = resched_data.time_slot
    appt.status = "PENDING"  # Needs re-confirmation
    db.commit()
    db.refresh(appt)
    
    # Notify opposite party
    target_user_id = None
    if current_user.role == "PATIENT":
        target_user_id = appt.doctor.user_id
        party_name = appt.patient.full_name
    else:
        target_user_id = appt.patient.user_id
        party_name = f"Dr. {appt.doctor.user.email.split('@')[0]}" if appt.doctor.user else "Doctor"
        
    await notification_service.push_notification(
        db,
        user_id=target_user_id,
        message=f"Appointment rescheduled by {party_name} from {old_date} {old_slot} to {appt.appointment_date} {appt.time_slot}.",
        notification_type="APPOINTMENT"
    )
    
    audit_service.log_activity(db, current_user.id, "APPOINTMENT_RESCHEDULE", f"Rescheduled appt ID {id} to {resched_data.appointment_date}")
    return appt

@router.post("/{id}/cancel", response_model=AppointmentResponse)
async def cancel_appointment(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    # Check permissions
    if current_user.role == "PATIENT":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or appt.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Forbidden")
    elif current_user.role == "DOCTOR":
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor or appt.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="Forbidden")
            
    # Free up the slot in database
    try:
        appt_time_t = datetime.strptime(appt.time_slot, "%H:%M").time()
        db_slot = db.query(DoctorSlot).filter(
            DoctorSlot.doctor_id == appt.doctor_id,
            DoctorSlot.slot_date == appt.appointment_date,
            DoctorSlot.start_time == appt_time_t
        ).first()
        if db_slot:
            db_slot.status = "AVAILABLE"
            db_slot.is_available = True
    except Exception as e:
        print(f"Error freeing slot during cancel: {e}")

    appt.status = "CANCELLED"
    db.commit()
    db.refresh(appt)
    
    # Notify opposite party
    target_user_id = None
    party_name = ""
    if current_user.role == "PATIENT":
        target_user_id = appt.doctor.user_id
        party_name = appt.patient.full_name
    else:
        target_user_id = appt.patient.user_id
        party_name = f"Dr. {appt.doctor.user.email.split('@')[0]}" if appt.doctor.user else "Doctor"
        
    await notification_service.push_notification(
        db,
        user_id=target_user_id,
        message=f"Appointment on {appt.appointment_date} at {appt.time_slot} has been cancelled by {party_name}.",
        notification_type="APPOINTMENT"
    )
    
    audit_service.log_activity(db, current_user.id, "APPOINTMENT_CANCEL", f"Cancelled appt ID {id}")
    return appt


@router.post("/{id}/status", response_model=AppointmentResponse)
async def update_appointment_status(
    id: int,
    status_data: AppointmentUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "DOCTOR"]))
):
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    # If Doctor, verify doctor owns this appointment
    if current_user.role == "DOCTOR":
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor or appt.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="Forbidden")
            
    appt.status = status_data.status
    db.commit()
    db.refresh(appt)
    
    # Notify Patient
    await notification_service.push_notification(
        db,
        user_id=appt.patient.user_id,
        message=f"Your appointment status is updated to {status_data.status}.",
        notification_type="APPOINTMENT"
    )
    
    audit_service.log_activity(db, current_user.id, "APPOINTMENT_STATUS_UPDATE", f"Appt ID {id} status set to {status_data.status}")
    return appt

# --- Consultation notes (Online Consultation System) ---
@router.post("/{id}/consultation", response_model=ConsultationResponse, status_code=status.HTTP_201_CREATED)
def create_consultation(
    id: int,
    consult_data: ConsultationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["DOCTOR"]))
):
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor or appt.doctor_id != doctor.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    # Create or update consultation notes
    consult = db.query(Consultation).filter(Consultation.appointment_id == id).first()
    if not consult:
        consult = Consultation(
            appointment_id=id,
            consultation_type=consult_data.consultation_type,
            doctor_notes=consult_data.doctor_notes,
            prescription_text=consult_data.prescription_text
        )
        db.add(consult)
    else:
        consult.consultation_type = consult_data.consultation_type
        consult.doctor_notes = consult_data.doctor_notes
        consult.prescription_text = consult_data.prescription_text
        
    # Mark appointment COMPLETED when doctor adds notes
    appt.status = "COMPLETED"
    
    db.commit()
    db.refresh(consult)
    
    audit_service.log_activity(db, current_user.id, "CONSULTATION_NOTES_SUBMIT", f"Submitted consult notes for appt ID {id}")
    return consult

# --- Prescriptions (Prescription Management) ---
@router.post("/{id}/prescription", response_model=PrescriptionResponse, status_code=status.HTTP_201_CREATED)
async def generate_prescription(
    id: int,
    presc_data: PrescriptionBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["DOCTOR"]))
):
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor or appt.doctor_id != doctor.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    # Standardize meds list for JSON storage
    meds_list = [med.model_dump() for med in presc_data.medications]
    meds_json_str = json.dumps(meds_list)
    
    # Save prescription in DB
    existing_presc = db.query(Prescription).filter(Prescription.appointment_id == id).first()
    if existing_presc:
        existing_presc.medications = meds_json_str
        existing_presc.instructions = presc_data.instructions
        presc = existing_presc
    else:
        presc = Prescription(
            appointment_id=id,
            patient_id=appt.patient_id,
            doctor_id=doctor.id,
            medications=meds_json_str,
            instructions=presc_data.instructions
        )
        db.add(presc)
        
    db.commit()
    db.refresh(presc)
    
    # Generate PDF Document
    date_str = date.today().strftime("%Y-%m-%d")
    doc_email = doctor.user.email if doctor.user else "doctor@medicare.com"
    doc_name = doc_email.split("@")[0].capitalize()
    pat_name = appt.patient.full_name
    pat_age = appt.patient.age or 0
    pat_gender = appt.patient.gender or "N/A"
    
    pdf_path = PDFService.generate_prescription_pdf(
        prescription_id=presc.id,
        date_str=date_str,
        doc_name=doc_name,
        specialization=doctor.specialization,
        pat_name=pat_name,
        pat_age=pat_age,
        pat_gender=pat_gender,
        medications=meds_list,
        instructions=presc.instructions
    )
    
    # Update PDF path in DB
    presc.pdf_path = pdf_path
    db.commit()
    
    # Notify Patient
    await notification_service.push_notification(
        db,
        user_id=appt.patient.user_id,
        message=f"Dr. {doc_name} uploaded a prescription for your appointment on {appt.appointment_date}. You can now download it.",
        notification_type="PRESCRIPTION"
    )
    
    audit_service.log_activity(db, current_user.id, "PRESCRIPTION_GENERATE", f"Generated prescription ID {presc.id} for appt ID {id}")
    return presc

@router.get("/prescriptions/{prescription_id}/download")
def download_prescription(prescription_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    presc = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not presc:
        raise HTTPException(status_code=404, detail="Prescription not found")
        
    # Authorization checks
    if current_user.role == "PATIENT":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or presc.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Forbidden")
    elif current_user.role == "DOCTOR":
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor or presc.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="Forbidden")
            
    if not presc.pdf_path or not os.path.exists(presc.pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found on disk")
        
    return FileResponse(
        presc.pdf_path,
        media_type="application/pdf",
        filename=os.path.basename(presc.pdf_path)
    )
