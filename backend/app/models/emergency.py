from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class EmergencyStatus(str, enum.Enum):
    PENDING = "PENDING"
    DISPATCHED = "DISPATCHED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class PriorityLevel(str, enum.Enum):
    CRITICAL = "CRITICAL"      # Life-threatening, immediate response
    HIGH = "HIGH"              # Urgent, rapid response
    MEDIUM = "MEDIUM"          # Moderate urgency
    LOW = "LOW"                # Non-urgent


class EmergencyType(str, enum.Enum):
    CARDIAC = "CARDIAC"
    TRAUMA = "TRAUMA"
    STROKE = "STROKE"
    RESPIRATORY = "RESPIRATORY"
    PEDIATRIC = "PEDIATRIC"
    OBSTETRIC = "OBSTETRIC"
    PSYCHIATRIC = "PSYCHIATRIC"
    OTHER = "OTHER"


class EmergencyRequest(Base):
    __tablename__ = "emergency_requests"

    id = Column(Integer, primary_key=True, index=True)
    
    # Requester information
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    contact_number = Column(String(20), nullable=True)
    
    # Emergency details
    emergency_type = Column(String(50), nullable=False, default=EmergencyType.OTHER)
    priority = Column(String(50), nullable=False, default=PriorityLevel.HIGH)
    status = Column(String(50), nullable=False, default=EmergencyStatus.PENDING)
    
    # Location and situation
    location = Column(String(500), nullable=False)  # Where the emergency is
    description = Column(Text, nullable=False)  # What happened
    patient_condition = Column(Text, nullable=True)  # Current condition
    
    # Response tracking
    dispatched_at = Column(DateTime, nullable=True)
    response_time_minutes = Column(Integer, nullable=True)  # Time to respond
    assigned_team = Column(String(255), nullable=True)  # Ambulance/medical team
    assigned_vehicle = Column(String(100), nullable=True)  # Vehicle number
    
    # Treatment details
    treatment_given = Column(Text, nullable=True)
    transported_to = Column(String(255), nullable=True)  # Hospital name
    arrived_at_hospital = Column(DateTime, nullable=True)
    
    # Completion
    completed_at = Column(DateTime, nullable=True)
    outcome_notes = Column(Text, nullable=True)
    cancelled_reason = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    requester = relationship("User", foreign_keys=[requested_by])
    patient = relationship("Patient", foreign_keys=[patient_id])
