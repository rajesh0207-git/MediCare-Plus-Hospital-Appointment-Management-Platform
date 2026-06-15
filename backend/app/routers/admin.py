from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, extract
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from app.core.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.models.patient import Patient
from app.models.doctor import Doctor, Department
from app.models.appointment import Appointment
from app.models.billing import Bill
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogResponse
from app.models.admission import Admission
from app.models.feedback import PatientFeedback
from app.models.review import Review

router = APIRouter(prefix="/admin", tags=["Admin Dashboard & Analytics"])

@router.get("/dashboard")
def get_admin_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN"]))
):
    # Total Patients
    total_patients = db.query(func.count(Patient.id)).scalar() or 0
    
    # Total Doctors
    total_doctors = db.query(func.count(Doctor.id)).scalar() or 0
    
    # Total Appointments
    total_appointments = db.query(func.count(Appointment.id)).scalar() or 0
    
    # Revenue summary
    revenue_data = db.query(
        func.sum(Bill.total_amount).label("total_rev"),
        func.sum(case((Bill.payment_status == 'PAID', Bill.total_amount), else_=0)).label("paid_rev"),
        func.sum(case((Bill.payment_status == 'PENDING', Bill.total_amount), else_=0)).label("pending_rev")
    ).first()
    
    revenue_summary = {
        "total_revenue": float(revenue_data.total_rev or 0.0),
        "paid_revenue": float(revenue_data.paid_rev or 0.0),
        "pending_revenue": float(revenue_data.pending_rev or 0.0)
    }
    
    # Department Statistics (Doctors count)
    dept_stats = []
    departments = db.query(Department).all()
    for dept in departments:
        doc_count = db.query(func.count(Doctor.id)).filter(Doctor.department_id == dept.id).scalar() or 0
        appt_count = db.query(func.count(Appointment.id))\
            .join(Doctor, Appointment.doctor_id == Doctor.id)\
            .filter(Doctor.department_id == dept.id).scalar() or 0
            
        dept_stats.append({
            "department_id": dept.id,
            "name": dept.name,
            "doctor_count": doc_count,
            "total_appointments": appt_count
        })
        
    # Appointment Analytics (status splits)
    status_splits = db.query(
        Appointment.status,
        func.count(Appointment.id)
    ).group_by(Appointment.status).all()
    
    appointment_analytics = {item[0]: item[1] for item in status_splits}
    
    # Ensure standard keys are present
    for s in ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]:
        if s not in appointment_analytics:
            appointment_analytics[s] = 0
            
    return {
        "total_patients": total_patients,
        "total_doctors": total_doctors,
        "total_appointments": total_appointments,
        "revenue_summary": revenue_summary,
        "department_statistics": dept_stats,
        "appointment_analytics": appointment_analytics
    }

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN"]))
):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).all()


# ============================================================
# ADVANCED ANALYTICS ENDPOINT
# ============================================================
@router.get("/analytics/advanced")
def get_advanced_analytics(
    days: int = Query(90, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN"]))
):
    """Comprehensive admin analytics dashboard with all metrics."""
    since = datetime.utcnow() - timedelta(days=days)

    # 1. Total Appointments (with status breakdown)
    total_appts = db.query(func.count(Appointment.id)).scalar() or 0
    appt_statuses = db.query(Appointment.status, func.count(Appointment.id)).group_by(Appointment.status).all()
    appt_status_map = {s: c for s, c in appt_statuses}

    recent_appts = db.query(func.count(Appointment.id)).filter(Appointment.created_at >= since).scalar() or 0

    # 2. Total Consultations (completed appointments)
    total_consultations = appt_status_map.get("COMPLETED", 0)
    recent_consultations = db.query(func.count(Appointment.id)).filter(
        Appointment.status == "COMPLETED",
        Appointment.created_at >= since
    ).scalar() or 0

    # 3. Total Admissions
    total_admissions = db.query(func.count(Admission.id)).scalar() or 0
    recent_admissions = db.query(func.count(Admission.id)).filter(Admission.created_at >= since).scalar() or 0
    active_admissions = db.query(func.count(Admission.id)).filter(Admission.actual_discharge_date.is_(None)).scalar() or 0

    # 4. Revenue Analytics
    revenue_data = db.query(
        func.sum(Bill.total_amount).label("total"),
        func.sum(case((Bill.payment_status == "PAID", Bill.total_amount), else_=0)).label("paid"),
        func.sum(case((Bill.payment_status == "PENDING", Bill.total_amount), else_=0)).label("pending"),
        func.avg(Bill.total_amount).label("avg")
    ).first()

    total_revenue = float(revenue_data.total or 0)
    paid_revenue = float(revenue_data.paid or 0)
    pending_revenue = float(revenue_data.pending or 0)
    avg_bill = float(revenue_data.avg or 0)

    # Monthly revenue trend
    monthly_revenue = db.query(
        extract("year", Bill.created_at).label("year"),
        extract("month", Bill.created_at).label("month"),
        func.sum(Bill.total_amount)
    ).group_by("year", "month").order_by("year", "month").all()

    revenue_trend = [
        {"month": f"{int(y)}-{int(m):02d}", "revenue": float(amt)}
        for y, m, amt in monthly_revenue[-12:]
    ]

    # 5. Department Performance
    departments = db.query(Department).all()
    dept_performance = []
    for dept in departments:
        doc_count = db.query(func.count(Doctor.id)).filter(Doctor.department_id == dept.id).scalar() or 0
        appt_count = db.query(func.count(Appointment.id)).join(Doctor).filter(Doctor.department_id == dept.id).scalar() or 0
        completed = db.query(func.count(Appointment.id)).join(Doctor).filter(
            Doctor.department_id == dept.id,
            Appointment.status == "COMPLETED"
        ).scalar() or 0
        revenue = db.query(func.sum(Bill.total_amount)).join(Appointment).join(Doctor).filter(
            Doctor.department_id == dept.id,
            Bill.payment_status == "PAID"
        ).scalar() or 0

        dept_performance.append({
            "department_id": dept.id,
            "name": dept.name,
            "doctor_count": doc_count,
            "total_appointments": appt_count,
            "completed_appointments": completed,
            "completion_rate": round((completed / appt_count * 100), 1) if appt_count > 0 else 0,
            "revenue": float(revenue)
        })

    # Sort by revenue
    dept_performance.sort(key=lambda x: x["revenue"], reverse=True)

    # 6. Doctor Performance Metrics
    doctors = db.query(Doctor).all()
    doctor_performance = []
    for doc in doctors:
        user = db.query(User).filter(User.id == doc.user_id).first()
        doc_email = user.email if user else "unknown"

        appt_count = db.query(func.count(Appointment.id)).filter(Appointment.doctor_id == doc.id).scalar() or 0
        completed = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doc.id,
            Appointment.status == "COMPLETED"
        ).scalar() or 0
        cancelled = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doc.id,
            Appointment.status == "CANCELLED"
        ).scalar() or 0

        # Average rating
        avg_rating = db.query(func.avg(Review.rating)).filter(Review.doctor_id == doc.id).scalar()
        review_count = db.query(func.count(Review.id)).filter(Review.doctor_id == doc.id).scalar() or 0

        doctor_performance.append({
            "doctor_id": doc.id,
            "name": f"Dr. {doc_email.split('@')[0].capitalize()}",
            "specialization": doc.specialization,
            "total_appointments": appt_count,
            "completed": completed,
            "cancelled": cancelled,
            "completion_rate": round((completed / appt_count * 100), 1) if appt_count > 0 else 0,
            "avg_rating": round(float(avg_rating), 1) if avg_rating else None,
            "review_count": review_count,
            "consultation_fee": doc.consultation_fee
        })

    # Sort by rating then appointments
    doctor_performance.sort(key=lambda x: (x["avg_rating"] or 0, x["total_appointments"]), reverse=True)

    # 7. Patient Satisfaction Scores
    total_feedback = db.query(func.count(PatientFeedback.id)).scalar() or 0
    avg_satisfaction = db.query(func.avg(PatientFeedback.overall_rating)).scalar()
    recommendation_rate = 0
    if total_feedback > 0:
        recommenders = db.query(func.count(PatientFeedback.id)).filter(
            PatientFeedback.would_recommend == 1
        ).scalar() or 0
        recommendation_rate = round((recommenders / total_feedback) * 100, 1)

    # Rating distribution
    rating_dist = db.query(PatientFeedback.overall_rating, func.count(PatientFeedback.id)).group_by(
        PatientFeedback.overall_rating
    ).all()
    rating_breakdown = {r: c for r, c in rating_dist}

    # Category-wise satisfaction
    category_satisfaction = db.query(
        PatientFeedback.service_category,
        func.avg(PatientFeedback.overall_rating),
        func.count(PatientFeedback.id)
    ).group_by(PatientFeedback.service_category).all()

    cat_scores = [
        {"category": cat, "avg_rating": round(float(avg), 1), "count": cnt}
        for cat, avg, cnt in category_satisfaction
    ]

    return {
        "period": f"Last {days} days",
        "summary": {
            "total_appointments": total_appts,
            "recent_appointments": recent_appts,
            "total_consultations": total_consultations,
            "recent_consultations": recent_consultations,
            "total_admissions": total_admissions,
            "recent_admissions": recent_admissions,
            "active_admissions": active_admissions,
        },
        "revenue": {
            "total_revenue": round(total_revenue, 2),
            "paid_revenue": round(paid_revenue, 2),
            "pending_revenue": round(pending_revenue, 2),
            "average_bill": round(avg_bill, 2),
            "collection_rate": round((paid_revenue / total_revenue * 100), 1) if total_revenue > 0 else 0,
            "monthly_trend": revenue_trend
        },
        "department_performance": dept_performance,
        "doctor_performance": doctor_performance[:20],  # Top 20
        "patient_satisfaction": {
            "total_feedback": total_feedback,
            "avg_satisfaction_score": round(float(avg_satisfaction), 1) if avg_satisfaction else 0,
            "recommendation_rate": recommendation_rate,
            "rating_breakdown": rating_breakdown,
            "category_scores": cat_scores
        }
    }
