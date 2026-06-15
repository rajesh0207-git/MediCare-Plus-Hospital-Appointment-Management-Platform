from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# --------- Create ---------
class FeedbackCreate(BaseModel):
    service_category: str = Field(..., description="Overall, Doctor, Nursing, Food, Cleanliness, Facilities, Wait Time")
    doctor_id: Optional[int] = None
    department_id: Optional[int] = None
    overall_rating: int = Field(..., ge=1, le=5)
    doctor_rating: Optional[int] = Field(None, ge=1, le=5)
    nursing_rating: Optional[int] = Field(None, ge=1, le=5)
    food_rating: Optional[int] = Field(None, ge=1, le=5)
    cleanliness_rating: Optional[int] = Field(None, ge=1, le=5)
    facilities_rating: Optional[int] = Field(None, ge=1, le=5)
    wait_time_rating: Optional[int] = Field(None, ge=1, le=5)
    title: Optional[str] = None
    comment: Optional[str] = None
    suggestions: Optional[str] = None
    positive_aspects: Optional[str] = None
    negative_aspects: Optional[str] = None
    would_recommend: int = Field(1, ge=0, le=1)


# --------- Response ---------
class FeedbackResponse(BaseModel):
    id: int
    patient_id: int
    service_category: str
    doctor_id: Optional[int]
    department_id: Optional[int]
    overall_rating: int
    doctor_rating: Optional[int]
    nursing_rating: Optional[int]
    food_rating: Optional[int]
    cleanliness_rating: Optional[int]
    facilities_rating: Optional[int]
    wait_time_rating: Optional[int]
    title: Optional[str]
    comment: Optional[str]
    suggestions: Optional[str]
    positive_aspects: Optional[str]
    negative_aspects: Optional[str]
    would_recommend: int
    admin_response: Optional[str]
    responded_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# --------- Admin Respond ---------
class AdminRespond(BaseModel):
    admin_response: str = Field(..., min_length=10)


# --------- Analytics ---------
class RatingBreakdown(BaseModel):
    five_star: int = 0
    four_star: int = 0
    three_star: int = 0
    two_star: int = 0
    one_star: int = 0


class CategoryAvg(BaseModel):
    category: str
    avg_rating: float
    count: int


class FeedbackAnalytics(BaseModel):
    total_feedback: int
    avg_overall_rating: float
    avg_doctor_rating: float
    avg_nursing_rating: float
    avg_food_rating: float
    avg_cleanliness_rating: float
    avg_facilities_rating: float
    avg_wait_time_rating: float
    recommendation_rate: float  # percentage
    rating_breakdown: RatingBreakdown
    category_averages: List[CategoryAvg]
    monthly_trend: List[dict]  # [{month, avg_rating, count}]
    top_positive_aspects: List[str]
    top_negative_aspects: List[str]


# --------- Satisfaction Report ---------
class DepartmentSatisfaction(BaseModel):
    department_name: str
    avg_rating: float
    total_feedback: int
    recommendation_rate: float


class SatisfactionReport(BaseModel):
    overall_satisfaction_score: float  # 0-100
    total_responses: int
    response_rate: float  # percentage of patients who gave feedback
    department_satisfaction: List[DepartmentSatisfaction]
    nps_score: float  # Net Promoter Score estimate
    period: str  # e.g. "Last 30 days"
