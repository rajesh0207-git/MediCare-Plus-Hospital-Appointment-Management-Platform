from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func

from sqlalchemy.orm import relationship as db_relationship
from app.core.database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    gender = Column(String(50), nullable=True)
    age = Column(Integer, nullable=True)
    blood_group = Column(String(20), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = db_relationship("User", back_populates="patient_profile")
    emergency_contacts = db_relationship("EmergencyContact", back_populates="patient", cascade="all, delete-orphan")
    appointments = db_relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    medical_records = db_relationship("MedicalRecord", back_populates="patient", cascade="all, delete-orphan")
    lab_tests = db_relationship("LabTest", back_populates="patient", cascade="all, delete-orphan")
    bills = db_relationship("Bill", back_populates="patient", cascade="all, delete-orphan")
    insurance = db_relationship("Insurance", back_populates="patient", cascade="all, delete-orphan")
    reviews = db_relationship("Review", back_populates="patient", cascade="all, delete-orphan")
    weight_records = db_relationship("WeightRecord", back_populates="patient", cascade="all, delete-orphan")
    height_records = db_relationship("HeightRecord", back_populates="patient", cascade="all, delete-orphan")
    blood_pressure_records = db_relationship("BloodPressureRecord", back_populates="patient", cascade="all, delete-orphan")
    sugar_level_records = db_relationship("SugarLevelRecord", back_populates="patient", cascade="all, delete-orphan")
    medicine_reminders = db_relationship("MedicineReminder", back_populates="patient", cascade="all, delete-orphan")

class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    relationship = Column(String(100), nullable=False)
    phone = Column(String(50), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    patient = db_relationship("Patient", back_populates="emergency_contacts")

