import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.models.appointment import Appointment, VideoSession
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.schemas.telemedicine import VideoSessionResponse, VideoSessionUpdate
from app.services.audit_service import audit_service
from app.services.notification_service import notification_service
from typing import List

router = APIRouter(prefix="/appointments", tags=["Telemedicine Consultation"])

@router.post("/{id}/video-session", response_model=VideoSessionResponse, status_code=status.HTTP_201_CREATED)
async def generate_video_session(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["DOCTOR", "PATIENT"]))
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

    # Allowed for CONFIRMED or COMPLETED appointments
    if appt.status not in ["CONFIRMED", "COMPLETED"]:
        raise HTTPException(status_code=400, detail="Video sessions can only be created for confirmed or completed appointments")

    # Check if session already exists
    session = db.query(VideoSession).filter(VideoSession.appointment_id == id).first()
    if not session:
        session = VideoSession(
            appointment_id=id,
            room_id=f"medicare-{uuid.uuid4().hex[:12]}",
            status="WAITING"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        
        # Notify opposite party
        notify_user_id = appt.patient.user_id if current_user.role == "DOCTOR" else appt.doctor.user_id
        party_name = "Dr. " + (appt.doctor.user.email.split("@")[0].capitalize() if appt.doctor.user else "Doctor") if current_user.role == "PATIENT" else appt.patient.full_name
        
        await notification_service.push_notification(
            db,
            user_id=notify_user_id,
            message=f"{party_name} has generated a telemedicine video consultation room for your appointment on {appt.appointment_date}.",
            notification_type="APPOINTMENT"
        )
        
        audit_service.log_activity(db, current_user.id, "VIDEO_SESSION_CREATE", f"Generated video session room {session.room_id} for appt ID {id}")

    return session

@router.get("/{id}/video-session", response_model=VideoSessionResponse)
def get_video_session(
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

    session = db.query(VideoSession).filter(VideoSession.appointment_id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Video session not generated yet for this appointment")
    
    return session

@router.put("/{id}/video-session", response_model=VideoSessionResponse)
def update_video_session(
    id: int,
    session_data: VideoSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["DOCTOR", "PATIENT"]))
):
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Check permissions
    if current_user.role == "PATIENT":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or appt.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        if session_data.is_recording is not None or session_data.recording_path is not None:
            raise HTTPException(status_code=403, detail="Only doctors can control consultation recordings")
    elif current_user.role == "DOCTOR":
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor or appt.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="Forbidden")

    session = db.query(VideoSession).filter(VideoSession.appointment_id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Video session not found")

    if session_data.status is not None:
        session.status = session_data.status
            
    if session_data.is_recording is not None:
        session.is_recording = session_data.is_recording
        if not session_data.is_recording:
            # Stopped recording, save a mock recording path
            session.recording_path = f"/static/recordings/video_{session.room_id}.mp4"
            audit_service.log_activity(db, current_user.id, "VIDEO_SESSION_RECORD_STOP", f"Stopped recording for room {session.room_id}")
        else:
            audit_service.log_activity(db, current_user.id, "VIDEO_SESSION_RECORD_START", f"Started recording for room {session.room_id}")

    if session_data.recording_path is not None:
        session.recording_path = session_data.recording_path

    db.commit()
    db.refresh(session)
    return session

@router.get("/video-sessions/history", response_model=List[VideoSessionResponse])
def get_video_sessions_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(VideoSession).join(Appointment)
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
    
    return query.order_by(VideoSession.created_at.desc()).all()
