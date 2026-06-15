from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), unique=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    medications = Column(Text, nullable=False)     # JSON string of medications: [{"name": "Aspirin", "dosage": "100mg", "frequency": "Once daily", "duration": "5 days"}]
    instructions = Column(Text, nullable=True)      # General instructions
    pdf_path = Column(String(500), nullable=True)    # Path to generated PDF file
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    appointment = relationship("Appointment", back_populates="prescription")
    doctor = relationship("Doctor", back_populates="prescriptions")
