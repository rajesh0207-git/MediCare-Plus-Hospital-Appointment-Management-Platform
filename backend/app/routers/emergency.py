from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from app.core.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.models.patient import Patient
from app.models.emergency import EmergencyRequest, EmergencyStatus, PriorityLevel, EmergencyType
from app.schemas.emergency import (
    EmergencyRequestCreate, EmergencyRequestResponse, EmergencyRequestDetail,
    EmergencyDispatch, EmergencyUpdate, EmergencyStats
)
from app.services.audit_service import audit_service

router = APIRouter(prefix="/emergency", tags=["Emergency Service Requests"])


# ===================== CREATE EMERGENCY REQUEST =====================

@router.post("", response_model=EmergencyRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_emergency_request(
    request_data: EmergencyRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit an emergency request. Anyone can submit, but must be authenticated."""
    # Validate patient if provided
    if request_data.patient_id:
        patient = db.query(Patient).filter(Patient.id == request_data.patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")

    new_request = EmergencyRequest(
        patient_id=request_data.patient_id,
        requested_by=current_user.id,
        contact_number=request_data.contact_number,
        emergency_type=request_data.emergency_type,
        priority=request_data.priority,
        status=EmergencyStatus.PENDING,
        location=request_data.location,
        description=request_data.description,
        patient_condition=request_data.patient_condition
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    audit_service.log_activity(
        db, current_user.id, "EMERGENCY_REQUEST_CREATE",
        f"Created emergency request (ID: {new_request.id}) - Type: {request_data.emergency_type}, Priority: {request_data.priority}"
    )

    return new_request


# ===================== LIST EMERGENCY REQUESTS =====================

@router.get("", response_model=List[EmergencyRequestDetail])
def list_emergency_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List emergency requests. Patients see only their own, staff see all."""
    query = db.query(EmergencyRequest)

    # Patients can only see their own requests
    if current_user.role == "PATIENT":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        query = query.filter(EmergencyRequest.patient_id == patient.id)
    
    # Apply filters
    if status_filter:
        query = query.filter(EmergencyRequest.status == status_filter)
    if priority_filter:
        query = query.filter(EmergencyRequest.priority == priority_filter)

    requests = query.order_by(
        # CRITICAL first, then by created_at
        EmergencyRequest.priority == PriorityLevel.CRITICAL,
        EmergencyRequest.created_at.desc()
    ).limit(limit).all()

    return [_build_detail_response(r, db) for r in requests]


# ===================== EMERGENCY STATISTICS (MUST BE BEFORE /{request_id}) =====================

@router.get("/stats/summary", response_model=EmergencyStats)
def get_emergency_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "DOCTOR"]))
):
    """Get emergency service statistics."""
    total = db.query(EmergencyRequest).count()
    pending = db.query(EmergencyRequest).filter(EmergencyRequest.status == EmergencyStatus.PENDING).count()
    dispatched = db.query(EmergencyRequest).filter(EmergencyRequest.status == EmergencyStatus.DISPATCHED).count()
    in_progress = db.query(EmergencyRequest).filter(EmergencyRequest.status == EmergencyStatus.IN_PROGRESS).count()
    completed = db.query(EmergencyRequest).filter(EmergencyRequest.status == EmergencyStatus.COMPLETED).count()
    cancelled = db.query(EmergencyRequest).filter(EmergencyRequest.status == EmergencyStatus.CANCELLED).count()
    critical = db.query(EmergencyRequest).filter(EmergencyRequest.priority == PriorityLevel.CRITICAL).count()

    # Average response time
    completed_requests = db.query(EmergencyRequest).filter(
        EmergencyRequest.response_time_minutes.isnot(None)
    ).all()
    avg_response = sum(r.response_time_minutes for r in completed_requests) / len(completed_requests) if completed_requests else 0

    return EmergencyStats(
        total_requests=total,
        pending=pending,
        dispatched=dispatched,
        in_progress=in_progress,
        completed=completed,
        cancelled=cancelled,
        critical_count=critical,
        avg_response_time=round(avg_response, 1)
    )


# ===================== GET EMERGENCY REQUEST BY ID =====================

@router.get("/{request_id}", response_model=EmergencyRequestDetail)
def get_emergency_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get details of a specific emergency request."""
    request = db.query(EmergencyRequest).filter(EmergencyRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Emergency request not found")

    # Patients can only see their own requests
    if current_user.role == "PATIENT":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or request.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Access denied")

    return _build_detail_response(request, db)


# ===================== DISPATCH EMERGENCY TEAM =====================

@router.post("/{request_id}/dispatch", response_model=EmergencyRequestResponse)
def dispatch_emergency_team(
    request_id: int,
    dispatch_data: EmergencyDispatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "DOCTOR"]))
):
    """Dispatch emergency team to the request location."""
    request = db.query(EmergencyRequest).filter(EmergencyRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Emergency request not found")

    if request.status not in [EmergencyStatus.PENDING]:
        raise HTTPException(status_code=400, detail="Request is not pending dispatch")

    request.status = EmergencyStatus.DISPATCHED
    request.assigned_team = dispatch_data.assigned_team
    request.assigned_vehicle = dispatch_data.assigned_vehicle
    request.dispatched_at = datetime.utcnow()
    if dispatch_data.response_time_minutes:
        request.response_time_minutes = dispatch_data.response_time_minutes

    db.commit()
    db.refresh(request)

    audit_service.log_activity(
        db, current_user.id, "EMERGENCY_DISPATCH",
        f"Dispatched team '{dispatch_data.assigned_team}' to emergency request ID {request_id}"
    )

    return request


# ===================== UPDATE EMERGENCY REQUEST =====================

@router.put("/{request_id}", response_model=EmergencyRequestResponse)
def update_emergency_request(
    request_id: int,
    update_data: EmergencyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "DOCTOR"]))
):
    """Update emergency request status and details."""
    request = db.query(EmergencyRequest).filter(EmergencyRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Emergency request not found")

    # Update fields
    if update_data.status:
        old_status = request.status
        request.status = update_data.status
        
        # Auto-set timestamps
        if update_data.status == EmergencyStatus.IN_PROGRESS and request.status != EmergencyStatus.IN_PROGRESS:
            pass  # Could add in_progress_at timestamp
        elif update_data.status == EmergencyStatus.COMPLETED:
            request.completed_at = datetime.utcnow()
    
    if update_data.assigned_team:
        request.assigned_team = update_data.assigned_team
    if update_data.assigned_vehicle:
        request.assigned_vehicle = update_data.assigned_vehicle
    if update_data.treatment_given:
        request.treatment_given = update_data.treatment_given
    if update_data.transported_to:
        request.transported_to = update_data.transported_to
    if update_data.arrived_at_hospital:
        request.arrived_at_hospital = update_data.arrived_at_hospital
    if update_data.outcome_notes:
        request.outcome_notes = update_data.outcome_notes
    if update_data.cancelled_reason:
        request.cancelled_reason = update_data.cancelled_reason

    db.commit()
    db.refresh(request)

    audit_service.log_activity(
        db, current_user.id, "EMERGENCY_UPDATE",
        f"Updated emergency request ID {request_id} - Status: {update_data.status}"
    )

    return request


# ===================== CANCEL EMERGENCY REQUEST =====================

@router.post("/{request_id}/cancel", response_model=EmergencyRequestResponse)
def cancel_emergency_request(
    request_id: int,
    reason: str = Query(..., min_length=5),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel an emergency request."""
    request = db.query(EmergencyRequest).filter(EmergencyRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Emergency request not found")

    # Only allow cancellation if not completed
    if request.status in [EmergencyStatus.COMPLETED]:
        raise HTTPException(status_code=400, detail="Cannot cancel completed request")

    # Patients can only cancel their own requests
    if current_user.role == "PATIENT":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or request.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Access denied")

    request.status = EmergencyStatus.CANCELLED
    request.cancelled_reason = reason
    request.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(request)

    audit_service.log_activity(
        db, current_user.id, "EMERGENCY_CANCEL",
        f"Cancelled emergency request ID {request_id} - Reason: {reason}"
    )

    return request


# ===================== HELPER FUNCTIONS =====================

def _build_detail_response(request: EmergencyRequest, db: Session) -> EmergencyRequestDetail:
    """Build detailed response with patient and requester info."""
    patient = None
    if request.patient_id:
        patient = db.query(Patient).filter(Patient.id == request.patient_id).first()

    requester = db.query(User).filter(User.id == request.requested_by).first()

    # Calculate time since request
    time_since = None
    if request.created_at:
        time_since = int((datetime.utcnow() - request.created_at).total_seconds() / 60)

    return EmergencyRequestDetail(
        **request.__dict__,
        patient_name=patient.full_name if patient else None,
        patient_age=patient.age if patient else None,
        patient_gender=patient.gender if patient else None,
        requester_name=requester.email if requester else None,
        requester_phone=requester.contact_number if hasattr(requester, 'contact_number') else None,
        time_since_request_minutes=time_since
    )
