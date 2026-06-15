from sqlalchemy import Column, Integer, String, Date, ForeignKey, DateTime, Boolean, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    appointment_date = Column(Date, nullable=False)
    time_slot = Column(String(50), nullable=False)  # e.g., "10:00" or "10:30"
    status = Column(String(50), nullable=False, default="PENDING")  # PENDING, CONFIRMED, CANCELLED, COMPLETED
    symptoms = Column(String(1000), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    consultation = relationship("Consultation", back_populates="appointment", uselist=False, cascade="all, delete-orphan")
    video_session = relationship("VideoSession", back_populates="appointment", uselist=False, cascade="all, delete-orphan")
    prescription = relationship("Prescription", back_populates="appointment", uselist=False, cascade="all, delete-orphan")
    bills = relationship("Bill", back_populates="appointment")

class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), unique=True, nullable=False)
    consultation_type = Column(String(50), nullable=False, default="ONLINE")  # ONLINE, IN_PERSON
    doctor_notes = Column(String(2000), nullable=True)
    prescription_text = Column(String(2000), nullable=True)  # Simple summary notes
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    appointment = relationship("Appointment", back_populates="consultation")

class VideoSession(Base):
    __tablename__ = "video_sessions"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), unique=True, nullable=False)
    room_id = Column(String(255), nullable=False, unique=True)
    status = Column(String(50), nullable=False, default="WAITING")  # WAITING, ACTIVE, COMPLETED
    is_recording = Column(Boolean, default=False)
    recording_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    appointment = relationship("Appointment", back_populates="video_session")

