from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class WeightRecord(Base):
    __tablename__ = "weight_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    weight_kg = Column(Float, nullable=False)
    bmi = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    recorded_at = Column(DateTime, nullable=False, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())

    patient = relationship("Patient", back_populates="weight_records")


class HeightRecord(Base):
    __tablename__ = "height_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    height_cm = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    recorded_at = Column(DateTime, nullable=False, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())

    patient = relationship("Patient", back_populates="height_records")


class BloodPressureRecord(Base):
    __tablename__ = "blood_pressure_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    systolic = Column(Integer, nullable=False)    # mmHg
    diastolic = Column(Integer, nullable=False)   # mmHg
    pulse = Column(Integer, nullable=True)        # bpm
    category = Column(String(50), nullable=True)  # NORMAL, ELEVATED, HIGH_STAGE1, HIGH_STAGE2, CRISIS
    notes = Column(Text, nullable=True)
    recorded_at = Column(DateTime, nullable=False, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())

    patient = relationship("Patient", back_populates="blood_pressure_records")


class SugarLevelRecord(Base):
    __tablename__ = "sugar_level_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    glucose_mgdl = Column(Float, nullable=False)   # mg/dL
    measurement_type = Column(String(50), nullable=False)  # FASTING, POST_MEAL, RANDOM, HBA1C
    category = Column(String(50), nullable=True)   # NORMAL, PREDIABETES, DIABETES
    notes = Column(Text, nullable=True)
    recorded_at = Column(DateTime, nullable=False, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())

    patient = relationship("Patient", back_populates="sugar_level_records")
