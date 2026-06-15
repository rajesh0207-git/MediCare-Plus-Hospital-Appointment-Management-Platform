from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class PatientFeedback(Base):
    __tablename__ = "patient_feedback"

    id = Column(Integer, primary_key=True, index=True)

    # Who submitted
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)

    # What they're rating
    service_category = Column(String(100), nullable=False)  # Overall, Doctor, Nursing, Food, Cleanliness, Facilities, Wait Time
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)

    # Ratings (1-5)
    overall_rating = Column(Integer, nullable=False)
    doctor_rating = Column(Integer, nullable=True)
    nursing_rating = Column(Integer, nullable=True)
    food_rating = Column(Integer, nullable=True)
    cleanliness_rating = Column(Integer, nullable=True)
    facilities_rating = Column(Integer, nullable=True)
    wait_time_rating = Column(Integer, nullable=True)

    # Feedback text
    title = Column(String(255), nullable=True)
    comment = Column(Text, nullable=True)
    suggestions = Column(Text, nullable=True)
    positive_aspects = Column(Text, nullable=True)
    negative_aspects = Column(Text, nullable=True)

    # Would recommend?
    would_recommend = Column(Integer, default=1)  # 1=Yes, 0=No

    # Admin response
    admin_response = Column(Text, nullable=True)
    responded_at = Column(DateTime, nullable=True)
    responded_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    patient = relationship("Patient", foreign_keys=[patient_id])
    doctor = relationship("Doctor", foreign_keys=[doctor_id])
    department = relationship("Department", foreign_keys=[department_id])
    responder = relationship("User", foreign_keys=[responded_by])
