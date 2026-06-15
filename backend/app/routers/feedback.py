from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from typing import Optional, List
from datetime import datetime, timedelta
from collections import Counter

from app.core.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.models.patient import Patient
from app.models.doctor import Doctor, Department
from app.models.feedback import PatientFeedback
from app.schemas.feedback import (
    FeedbackCreate, FeedbackResponse, AdminRespond,
    FeedbackAnalytics, RatingBreakdown, CategoryAvg,
    SatisfactionReport, DepartmentSatisfaction
)

router = APIRouter(prefix="/feedback", tags=["Patient Feedback & Satisfaction"])


# ============================================================
# FEATURE 1: SUBMIT FEEDBACK (Patient)
# ============================================================
@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    data: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Patient submits feedback about their hospital experience."""
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    feedback = PatientFeedback(
        patient_id=patient.id,
        service_category=data.service_category,
        doctor_id=data.doctor_id,
        department_id=data.department_id,
        overall_rating=data.overall_rating,
        doctor_rating=data.doctor_rating,
        nursing_rating=data.nursing_rating,
        food_rating=data.food_rating,
        cleanliness_rating=data.cleanliness_rating,
        facilities_rating=data.facilities_rating,
        wait_time_rating=data.wait_time_rating,
        title=data.title,
        comment=data.comment,
        suggestions=data.suggestions,
        positive_aspects=data.positive_aspects,
        negative_aspects=data.negative_aspects,
        would_recommend=data.would_recommend,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


# ============================================================
# FEATURE 2: LIST FEEDBACK / SERVICE RATINGS
# ============================================================
@router.get("", response_model=List[FeedbackResponse])
def list_feedback(
    category: Optional[str] = Query(None),
    min_rating: Optional[int] = Query(None, ge=1, le=5),
    max_rating: Optional[int] = Query(None, ge=1, le=5),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List feedback. Patients see only their own, Admin/Doctor see all."""
    query = db.query(PatientFeedback)

    if current_user.role == "PATIENT":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        query = query.filter(PatientFeedback.patient_id == patient.id)

    if category:
        query = query.filter(PatientFeedback.service_category == category)
    if min_rating:
        query = query.filter(PatientFeedback.overall_rating >= min_rating)
    if max_rating:
        query = query.filter(PatientFeedback.overall_rating <= max_rating)

    return query.order_by(PatientFeedback.created_at.desc()).limit(limit).all()


@router.get("/{feedback_id}", response_model=FeedbackResponse)
def get_feedback(
    feedback_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific feedback entry."""
    fb = db.query(PatientFeedback).filter(PatientFeedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")

    if current_user.role == "PATIENT":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or fb.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    return fb


# ============================================================
# ADMIN: Respond to Feedback
# ============================================================
@router.post("/{feedback_id}/respond", response_model=FeedbackResponse)
def respond_to_feedback(
    feedback_id: int,
    data: AdminRespond,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN"]))
):
    """Admin responds to patient feedback."""
    fb = db.query(PatientFeedback).filter(PatientFeedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")

    fb.admin_response = data.admin_response
    fb.responded_at = datetime.utcnow()
    fb.responded_by = current_user.id
    db.commit()
    db.refresh(fb)
    return fb


# ============================================================
# FEATURE 3: FEEDBACK ANALYTICS (Admin/Doctor)
# ============================================================
@router.get("/analytics/summary", response_model=FeedbackAnalytics)
def get_feedback_analytics(
    days: int = Query(90, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "DOCTOR"]))
):
    """Get comprehensive feedback analytics."""
    since = datetime.utcnow() - timedelta(days=days)
    query = db.query(PatientFeedback).filter(PatientFeedback.created_at >= since)
    all_feedback = query.all()

    if not all_feedback:
        return FeedbackAnalytics(
            total_feedback=0, avg_overall_rating=0, avg_doctor_rating=0,
            avg_nursing_rating=0, avg_food_rating=0, avg_cleanliness_rating=0,
            avg_facilities_rating=0, avg_wait_time_rating=0, recommendation_rate=0,
            rating_breakdown=RatingBreakdown(), category_averages=[],
            monthly_trend=[], top_positive_aspects=[], top_negative_aspects=[]
        )

    total = len(all_feedback)

    def safe_avg(values):
        filtered = [v for v in values if v is not None]
        return round(sum(filtered) / len(filtered), 2) if filtered else 0

    avg_overall = safe_avg([f.overall_rating for f in all_feedback])
    avg_doctor = safe_avg([f.doctor_rating for f in all_feedback])
    avg_nursing = safe_avg([f.nursing_rating for f in all_feedback])
    avg_food = safe_avg([f.food_rating for f in all_feedback])
    avg_cleanliness = safe_avg([f.cleanliness_rating for f in all_feedback])
    avg_facilities = safe_avg([f.facilities_rating for f in all_feedback])
    avg_wait = safe_avg([f.wait_time_rating for f in all_feedback])

    # Recommendation rate
    recommenders = sum(1 for f in all_feedback if f.would_recommend == 1)
    rec_rate = round((recommenders / total) * 100, 1) if total > 0 else 0

    # Rating breakdown
    ratings = [f.overall_rating for f in all_feedback]
    breakdown = RatingBreakdown(
        five_star=ratings.count(5),
        four_star=ratings.count(4),
        three_star=ratings.count(3),
        two_star=ratings.count(2),
        one_star=ratings.count(1),
    )

    # Category averages
    categories = {}
    for f in all_feedback:
        cat = f.service_category
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(f.overall_rating)
    cat_avgs = [
        CategoryAvg(category=k, avg_rating=round(sum(v) / len(v), 2), count=len(v))
        for k, v in categories.items()
    ]

    # Monthly trend
    monthly = {}
    for f in all_feedback:
        month_key = f.created_at.strftime("%Y-%m")
        if month_key not in monthly:
            monthly[month_key] = []
        monthly[month_key].append(f.overall_rating)
    trend = [
        {"month": k, "avg_rating": round(sum(v) / len(v), 2), "count": len(v)}
        for k, v in sorted(monthly.items())
    ]

    # Top aspects
    positives = []
    negatives = []
    for f in all_feedback:
        if f.positive_aspects:
            positives.extend([a.strip() for a in f.positive_aspects.split(",") if a.strip()])
        if f.negative_aspects:
            negatives.extend([a.strip() for a in f.negative_aspects.split(",") if a.strip()])

    top_pos = [item for item, _ in Counter(positives).most_common(5)]
    top_neg = [item for item, _ in Counter(negatives).most_common(5)]

    return FeedbackAnalytics(
        total_feedback=total,
        avg_overall_rating=avg_overall,
        avg_doctor_rating=avg_doctor,
        avg_nursing_rating=avg_nursing,
        avg_food_rating=avg_food,
        avg_cleanliness_rating=avg_cleanliness,
        avg_facilities_rating=avg_facilities,
        avg_wait_time_rating=avg_wait,
        recommendation_rate=rec_rate,
        rating_breakdown=breakdown,
        category_averages=cat_avgs,
        monthly_trend=trend,
        top_positive_aspects=top_pos,
        top_negative_aspects=top_neg,
    )


# ============================================================
# FEATURE 4: SATISFACTION REPORT (Admin)
# ============================================================
@router.get("/analytics/satisfaction-report", response_model=SatisfactionReport)
def get_satisfaction_report(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN"]))
):
    """Get patient satisfaction report with department breakdown."""
    since = datetime.utcnow() - timedelta(days=days)
    all_feedback = db.query(PatientFeedback).filter(PatientFeedback.created_at >= since).all()

    total_patients = db.query(Patient).count()
    total_responses = len(all_feedback)
    response_rate = round((total_responses / total_patients) * 100, 1) if total_patients > 0 else 0

    # Overall satisfaction score (0-100)
    if all_feedback:
        avg_rating = sum(f.overall_rating for f in all_feedback) / total_responses
        satisfaction_score = round((avg_rating / 5) * 100, 1)
    else:
        satisfaction_score = 0
        avg_rating = 0

    # NPS estimate: promoters (4-5) - detractors (1-2) / total * 100
    promoters = sum(1 for f in all_feedback if f.overall_rating >= 4)
    detractors = sum(1 for f in all_feedback if f.overall_rating <= 2)
    nps = round(((promoters - detractors) / total_responses) * 100, 1) if total_responses > 0 else 0

    # Department satisfaction
    dept_map = {}
    for f in all_feedback:
        if f.department_id:
            if f.department_id not in dept_map:
                dept_map[f.department_id] = []
            dept_map[f.department_id].append(f)

    dept_satisfaction = []
    for dept_id, fbs in dept_map.items():
        dept = db.query(Department).filter(Department.id == dept_id).first()
        dept_name = dept.name if dept else f"Department {dept_id}"
        dept_avg = round(sum(f.overall_rating for f in fbs) / len(fbs), 2)
        dept_rec = round((sum(1 for f in fbs if f.would_recommend == 1) / len(fbs)) * 100, 1)
        dept_satisfaction.append(DepartmentSatisfaction(
            department_name=dept_name,
            avg_rating=dept_avg,
            total_feedback=len(fbs),
            recommendation_rate=dept_rec,
        ))

    # Also include feedback without department
    no_dept = [f for f in all_feedback if not f.department_id]
    if no_dept:
        dept_avg = round(sum(f.overall_rating for f in no_dept) / len(no_dept), 2)
        dept_rec = round((sum(1 for f in no_dept if f.would_recommend == 1) / len(no_dept)) * 100, 1)
        dept_satisfaction.append(DepartmentSatisfaction(
            department_name="General / Unspecified",
            avg_rating=dept_avg,
            total_feedback=len(no_dept),
            recommendation_rate=dept_rec,
        ))

    return SatisfactionReport(
        overall_satisfaction_score=satisfaction_score,
        total_responses=total_responses,
        response_rate=response_rate,
        department_satisfaction=dept_satisfaction,
        nps_score=nps,
        period=f"Last {days} days",
    )
