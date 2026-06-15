from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
from datetime import date
from app.core.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.models.patient import Patient
from app.models.billing import Bill, Insurance, InsuranceClaim
from app.schemas.billing import BillResponse, BillCreate, BillPayRequest, InsuranceResponse, InsuranceCreate, InsuranceClaimResponse, InsuranceClaimCreate
from app.services.notification_service import notification_service
from app.services.pdf_service import PDFService
from app.services.audit_service import audit_service
from typing import List, Optional

router = APIRouter(prefix="/billing", tags=["Billing & Payments"])

@router.post("/bills", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
def generate_bill(
    bill_data: BillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "DOCTOR"]))
):
    patient = db.query(Patient).filter(Patient.id == bill_data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
        
    total = bill_data.amount + bill_data.tax - bill_data.discount
    new_bill = Bill(
        patient_id=bill_data.patient_id,
        appointment_id=bill_data.appointment_id,
        amount=bill_data.amount,
        tax=bill_data.tax,
        discount=bill_data.discount,
        total_amount=total,
        payment_status="PENDING"
    )
    db.add(new_bill)
    db.commit()
    db.refresh(new_bill)
    
    audit_service.log_activity(db, current_user.id, "BILL_GENERATE", f"Generated bill ID {new_bill.id} of total {total} for Patient {patient.id}")
    return new_bill

@router.post("/bills/{id}/pay", response_model=BillResponse)
async def make_payment(
    id: int,
    pay_data: BillPayRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    bill = db.query(Bill).filter(Bill.id == id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
        
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient or bill.patient_id != patient.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    if bill.payment_status == "PAID":
        raise HTTPException(status_code=400, detail="Bill has already been paid")
        
    # Process payment (simulated)
    bill.payment_status = "PAID"
    bill.payment_method = pay_data.payment_method
    bill.transaction_id = pay_data.transaction_id
    db.commit()
    
    # Generate receipt PDF
    date_str = date.today().strftime("%Y-%m-%d")
    pdf_path = PDFService.generate_invoice_pdf(
        bill_id=bill.id,
        date_str=date_str,
        pat_name=patient.full_name,
        pat_phone=patient.phone or "N/A",
        amount=bill.amount,
        tax=bill.tax,
        discount=bill.discount,
        total=bill.total_amount,
        status="PAID"
    )
    bill.pdf_path = pdf_path
    db.commit()
    db.refresh(bill)
    
    # Notify patient
    await notification_service.push_notification(
        db,
        user_id=current_user.id,
        message=f"Payment of ${bill.total_amount:.2f} was successful. Transaction ID: {pay_data.transaction_id}.",
        notification_type="BILLING"
    )
    
    audit_service.log_activity(db, current_user.id, "BILL_PAYMENT", f"Paid bill ID {bill.id} via {pay_data.payment_method}")
    return bill

@router.get("/bills", response_model=List[BillResponse])
def list_bills(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "PATIENT":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        return db.query(Bill).filter(Bill.patient_id == patient.id).all()
    else:
        # Doctor / Admin sees all
        return db.query(Bill).all()

@router.get("/bills/{id}/download")
def download_invoice(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bill = db.query(Bill).filter(Bill.id == id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
        
    if current_user.role == "PATIENT":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or bill.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Forbidden")
            
    if not bill.pdf_path or not os.path.exists(bill.pdf_path):
        # Dynamically generate if missing
        pat = db.query(Patient).filter(Patient.id == bill.patient_id).first()
        date_str = bill.created_at.strftime("%Y-%m-%d") if bill.created_at else date.today().strftime("%Y-%m-%d")
        pdf_path = PDFService.generate_invoice_pdf(
            bill_id=bill.id,
            date_str=date_str,
            pat_name=pat.full_name if pat else "Patient",
            pat_phone=(pat.phone if pat else "N/A") or "N/A",
            amount=bill.amount,
            tax=bill.tax,
            discount=bill.discount,
            total=bill.total_amount,
            status=bill.payment_status
        )
        bill.pdf_path = pdf_path
        db.commit()
        
    return FileResponse(
        bill.pdf_path,
        media_type="application/pdf",
        filename=os.path.basename(bill.pdf_path)
    )

# --- Insurance (Insurance Management) ---
@router.get("/insurance", response_model=List[InsuranceResponse])
def list_insurance(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    """List all insurance policies for the current patient."""
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        return []
    return db.query(Insurance).filter(Insurance.patient_id == patient.id).all()


@router.get("/insurance/claims", response_model=List[InsuranceClaimResponse])
def list_claims(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    """List all insurance claims for the current patient."""
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        return []
    # Get all insurance IDs for this patient
    insurance_ids = [i.id for i in db.query(Insurance).filter(Insurance.patient_id == patient.id).all()]
    if not insurance_ids:
        return []
    return db.query(InsuranceClaim).filter(InsuranceClaim.insurance_id.in_(insurance_ids)).all()


@router.post("/insurance", response_model=InsuranceResponse, status_code=status.HTTP_201_CREATED)
def add_insurance(
    ins_data: InsuranceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
        
    # Check if duplicate policy number
    exists = db.query(Insurance).filter(Insurance.policy_number == ins_data.policy_number).first()
    if exists:
        raise HTTPException(status_code=400, detail="Policy number already registered")
        
    new_ins = Insurance(
        patient_id=patient.id,
        provider_name=ins_data.provider_name,
        policy_number=ins_data.policy_number,
        coverage_amount=ins_data.coverage_amount,
        status="PENDING_VERIFICATION"
    )
    db.add(new_ins)
    db.commit()
    db.refresh(new_ins)
    
    audit_service.log_activity(db, current_user.id, "ADD_INSURANCE", f"Added insurance policy {ins_data.policy_number}")
    return new_ins

@router.post("/insurance/claims", response_model=InsuranceClaimResponse, status_code=status.HTTP_201_CREATED)
def claim_insurance(
    claim_data: InsuranceClaimCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["PATIENT"]))
):
    # Verify policy
    insurance = db.query(Insurance).filter(Insurance.id == claim_data.insurance_id).first()
    if not insurance:
        raise HTTPException(status_code=404, detail="Insurance policy not found")
        
    # Verify bill
    bill = db.query(Bill).filter(Bill.id == claim_data.bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
        
    # Verify owner
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient or insurance.patient_id != patient.id or bill.patient_id != patient.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    # Perform claim creation
    new_claim = InsuranceClaim(
        insurance_id=claim_data.insurance_id,
        bill_id=claim_data.bill_id,
        claim_amount=claim_data.claim_amount,
        status="PENDING",
        remarks=claim_data.remarks
    )
    db.add(new_claim)
    db.commit()
    db.refresh(new_claim)
    
    audit_service.log_activity(db, current_user.id, "CLAIM_INSURANCE", f"Submitted insurance claim ID {new_claim.id} for Bill ID {claim_data.bill_id}")
    return new_claim
