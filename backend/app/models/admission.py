from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text, func
from sqlalchemy.orm import relationship as db_relationship
from app.core.database import Base


class Admission(Base):
    """Complete patient admission record tracking the full admission-to-discharge lifecycle."""
    __tablename__ = "admissions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    bed_assignment_id = Column(Integer, ForeignKey("bed_assignments.id", ondelete="SET NULL"), nullable=True)
    admitted_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Doctor/Admin who admitted

    # Admission details
    admission_type = Column(String(50), nullable=False, default="EMERGENCY")  # EMERGENCY, ELECTIVE, REFERRAL, TRANSFER
    diagnosis = Column(String(500), nullable=True)
    admission_notes = Column(Text, nullable=True)
    insurance_claim_id = Column(Integer, ForeignKey("insurances.id", ondelete="SET NULL"), nullable=True)
    estimated_discharge_date = Column(DateTime, nullable=True)

    # Discharge details (filled on discharge)
    discharge_status = Column(String(50), nullable=True)  # RECOVERED, REFERRED, AMA (Against Medical Advice), DECEASED
    discharge_summary = Column(Text, nullable=True)
    discharge_medication = Column(Text, nullable=True)
    followup_instructions = Column(Text, nullable=True)
    followup_date = Column(DateTime, nullable=True)
    discharged_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    actual_discharge_date = Column(DateTime, nullable=True)

    # Status tracking
    status = Column(String(50), nullable=False, default="ADMITTED")  # ADMITTED, DISCHARGED, TRANSFERRED
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    patient = db_relationship("Patient")
    bed_assignment = db_relationship("BedAssignment")
    admitted_by_user = db_relationship("User", foreign_keys=[admitted_by])
    discharged_by_user = db_relationship("User", foreign_keys=[discharged_by])
    insurance = db_relationship("Insurance")
