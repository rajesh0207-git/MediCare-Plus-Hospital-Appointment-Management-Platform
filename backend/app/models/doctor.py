from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Time, Date, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    doctors = relationship("Doctor", back_populates="department")

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    specialization = Column(String(255), nullable=False)
    qualification = Column(String(255), nullable=False)
    experience = Column(Integer, nullable=False)  # Years of experience
    consultation_fee = Column(Float, nullable=False)
    availability_status = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="doctor_profile")
    department = relationship("Department", back_populates="doctors")
    schedules = relationship("DoctorSchedule", back_populates="doctor", cascade="all, delete-orphan")
    slots = relationship("DoctorSlot", back_populates="doctor", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="doctor", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="doctor", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="doctor", cascade="all, delete-orphan")
    lab_tests = relationship("LabTest", back_populates="doctor", cascade="all, delete-orphan")

class DoctorSchedule(Base):
    __tablename__ = "doctor_schedules"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(String(50), nullable=False)  # Monday, Tuesday, etc.
    start_time = Column(Time, nullable=False)         # e.g., 09:00:00
    end_time = Column(Time, nullable=False)           # e.g., 17:00:00
    slot_duration_minutes = Column(Integer, default=30)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    doctor = relationship("Doctor", back_populates="schedules")

class DoctorSlot(Base):
    __tablename__ = "doctor_slots"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    slot_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_available = Column(Boolean, default=True)
    status = Column(String(50), nullable=False, default="AVAILABLE")  # AVAILABLE, BLOCKED, BOOKED
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    doctor = relationship("Doctor", back_populates="slots")

