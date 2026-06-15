from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func, Text, Boolean, Time
from sqlalchemy.orm import relationship
from app.core.database import Base


class MedicineReminder(Base):
    __tablename__ = "medicine_reminders"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    medicine_name = Column(String(200), nullable=False)
    dosage = Column(String(100), nullable=True)          # e.g. "500mg", "1 tablet"
    frequency = Column(String(50), nullable=False)       # DAILY, TWICE_DAILY, THREE_TIMES, WEEKLY, AS_NEEDED
    reminder_time = Column(String(20), nullable=False)   # "08:00", "14:00" etc (stored as string HH:MM)
    reminder_time_2 = Column(String(20), nullable=True)  # Second time for TWICE_DAILY
    reminder_time_3 = Column(String(20), nullable=True)  # Third time for THREE_TIMES
    start_date = Column(String(20), nullable=False)      # ISO date string
    end_date = Column(String(20), nullable=True)         # Optional end date
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    patient = relationship("Patient", back_populates="medicine_reminders")
    history = relationship("MedicineReminderHistory", back_populates="reminder", cascade="all, delete-orphan")


class MedicineReminderHistory(Base):
    __tablename__ = "medicine_reminder_history"

    id = Column(Integer, primary_key=True, index=True)
    reminder_id = Column(Integer, ForeignKey("medicine_reminders.id", ondelete="CASCADE"), nullable=False)
    scheduled_time = Column(String(20), nullable=False)   # "HH:MM"
    scheduled_date = Column(String(20), nullable=False)   # ISO date "YYYY-MM-DD"
    status = Column(String(20), nullable=False, default="PENDING")  # PENDING, TAKEN, MISSED, SKIPPED
    taken_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    reminder = relationship("MedicineReminder", back_populates="history")
