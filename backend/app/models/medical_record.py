from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    record_type = Column(String(100), nullable=False, default="REPORT")  # REPORT, PRESCRIPTION, LAB_RESULT, OTHER
    file_path = Column(String(500), nullable=True)  # Path to stored file / mock file URL
    notes = Column(String(1000), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    patient = relationship("Patient", back_populates="medical_records")

class LabTest(Base):
    __tablename__ = "lab_tests"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    test_name = Column(String(255), nullable=False)
    request_date = Column(Date, nullable=False, default=func.current_date())
    status = Column(String(50), nullable=False, default="PENDING")  # PENDING, COMPLETED
    result_text = Column(String(2000), nullable=True)
    file_path = Column(String(500), nullable=True)  # Path to result document
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    patient = relationship("Patient", back_populates="lab_tests")
    doctor = relationship("Doctor", back_populates="lab_tests")
