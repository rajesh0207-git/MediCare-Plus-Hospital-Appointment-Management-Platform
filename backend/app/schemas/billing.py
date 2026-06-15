from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# Insurance Claim Schemas
class InsuranceClaimBase(BaseModel):
    insurance_id: int
    claim_amount: float
    remarks: Optional[str] = None

class InsuranceClaimCreate(InsuranceClaimBase):
    bill_id: int

class InsuranceClaimResponse(InsuranceClaimBase):
    id: int
    bill_id: int
    status: str  # PENDING, APPROVED, REJECTED
    created_at: datetime

    class Config:
        from_attributes = True

# Bill Schemas
class BillBase(BaseModel):
    amount: float
    tax: Optional[float] = 0.0
    discount: Optional[float] = 0.0

class BillCreate(BillBase):
    patient_id: int
    appointment_id: Optional[int] = None

class BillPayRequest(BaseModel):
    payment_method: str  # CARD, UPI, NETBANKING
    transaction_id: str

class BillResponse(BillBase):
    id: int
    patient_id: int
    appointment_id: Optional[int] = None
    total_amount: float
    payment_status: str
    payment_method: Optional[str] = None
    transaction_id: Optional[str] = None
    pdf_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    claims: List[InsuranceClaimResponse] = []

    class Config:
        from_attributes = True

# Insurance Schemas
class InsuranceBase(BaseModel):
    provider_name: str
    policy_number: str
    coverage_amount: float

class InsuranceCreate(InsuranceBase):
    pass

class InsuranceResponse(InsuranceBase):
    id: int
    patient_id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
