from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1 to 5 stars
    comment = Column(String(1000), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    patient = relationship("Patient", back_populates="reviews")
    doctor = relationship("Doctor", back_populates="reviews")
