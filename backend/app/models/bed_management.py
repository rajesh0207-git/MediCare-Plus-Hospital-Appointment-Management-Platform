from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, func, Enum as SQLEnum
from sqlalchemy.orm import relationship as db_relationship
from app.core.database import Base
import enum


class WardType(str, enum.Enum):
    GENERAL = "GENERAL"
    PRIVATE = "PRIVATE"
    ICU = "ICU"
    NICU = "NICU"
    EMERGENCY = "EMERGENCY"
    MATERNITY = "MATERNITY"
    PEDIATRIC = "PEDIATRIC"
    SURGICAL = "SURGICAL"


class BedStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    OCCUPIED = "OCCUPIED"
    MAINTENANCE = "MAINTENANCE"
    RESERVED = "RESERVED"


class AssignmentStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    DISCHARGED = "DISCHARGED"
    TRANSFERRED = "TRANSFERRED"


class Ward(Base):
    __tablename__ = "wards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    ward_type = Column(String(50), nullable=False, default=WardType.GENERAL)
    floor = Column(Integer, nullable=False, default=1)
    total_beds = Column(Integer, nullable=False, default=0)
    description = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    beds = db_relationship("Bed", back_populates="ward", cascade="all, delete-orphan")


class Bed(Base):
    __tablename__ = "beds"

    id = Column(Integer, primary_key=True, index=True)
    ward_id = Column(Integer, ForeignKey("wards.id", ondelete="CASCADE"), nullable=False)
    bed_number = Column(String(50), nullable=False)
    bed_type = Column(String(50), nullable=False, default="STANDARD")  # STANDARD, ELECTRIC, ICU_BED, CRIB
    status = Column(String(50), nullable=False, default=BedStatus.AVAILABLE)
    daily_rate = Column(Integer, nullable=False, default=100)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    ward = db_relationship("Ward", back_populates="beds")
    assignments = db_relationship("BedAssignment", back_populates="bed", cascade="all, delete-orphan")


class BedAssignment(Base):
    __tablename__ = "bed_assignments"

    id = Column(Integer, primary_key=True, index=True)
    bed_id = Column(Integer, ForeignKey("beds.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Doctor/Admin who assigned
    admission_date = Column(DateTime, server_default=func.now())
    discharge_date = Column(DateTime, nullable=True)
    status = Column(String(50), nullable=False, default=AssignmentStatus.ACTIVE)
    reason = Column(String(500), nullable=True)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    bed = db_relationship("Bed", back_populates="assignments")
    patient = db_relationship("Patient")
    assigned_by_user = db_relationship("User", foreign_keys=[assigned_by])
