from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Float, nullable=False, default=0.0)
    tax = Column(Float, nullable=False, default=0.0)
    discount = Column(Float, nullable=False, default=0.0)
    total_amount = Column(Float, nullable=False, default=0.0)
    payment_status = Column(String(50), nullable=False, default="PENDING")  # PENDING, PAID, FAILED
    payment_method = Column(String(100), nullable=True)                     # CARD, UPI, NETBANKING
    transaction_id = Column(String(255), nullable=True)
    pdf_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    patient = relationship("Patient", back_populates="bills")
    appointment = relationship("Appointment", back_populates="bills")
    claims = relationship("InsuranceClaim", back_populates="bill", cascade="all, delete-orphan")

class Insurance(Base):
    __tablename__ = "insurances"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    provider_name = Column(String(255), nullable=False)
    policy_number = Column(String(100), unique=True, nullable=False)
    coverage_amount = Column(Float, nullable=False, default=0.0)
    status = Column(String(50), nullable=False, default="PENDING_VERIFICATION")  # ACTIVE, EXPIRED, PENDING_VERIFICATION
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    patient = relationship("Patient", back_populates="insurance")
    claims = relationship("InsuranceClaim", back_populates="insurance", cascade="all, delete-orphan")

class InsuranceClaim(Base):
    __tablename__ = "insurance_claims"

    id = Column(Integer, primary_key=True, index=True)
    insurance_id = Column(Integer, ForeignKey("insurances.id", ondelete="CASCADE"), nullable=False)
    bill_id = Column(Integer, ForeignKey("bills.id", ondelete="CASCADE"), nullable=False)
    claim_amount = Column(Float, nullable=False)
    status = Column(String(50), nullable=False, default="PENDING")  # PENDING, APPROVED, REJECTED
    remarks = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    insurance = relationship("Insurance", back_populates="claims")
    bill = relationship("Bill", back_populates="claims")
