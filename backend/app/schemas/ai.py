from pydantic import BaseModel
from typing import Optional, List, Dict


# --------- AI Chat Schemas ---------
class AIChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default_session"


class DoctorRecommendation(BaseModel):
    id: Optional[int] = None
    name: str
    specialization: str
    fee: float
    experience_years: Optional[int] = None
    availability_status: bool


class MedicationInfo(BaseModel):
    name: str
    category: str
    description: str
    common_dosage: str
    precautions: Optional[str] = None


class HealthFAQ(BaseModel):
    question: str
    answer: str
    category: str


class SymptomAnalysis(BaseModel):
    detected_symptoms: List[str]
    severity: str  # LOW, MODERATE, HIGH, CRITICAL
    suggested_specialization: Optional[str] = None
    urgency_advice: str
    self_care_tips: List[str]


class AIChatResponse(BaseModel):
    response: str
    symptom_analysis: Optional[SymptomAnalysis] = None
    suggested_specialization: Optional[str] = None
    recommended_doctors: Optional[List[DoctorRecommendation]] = None
    appointment_recommended: bool = False
    medications: Optional[List[MedicationInfo]] = None
    faqs: Optional[List[HealthFAQ]] = None
    quick_actions: Optional[List[str]] = None


class MedicationQueryRequest(BaseModel):
    symptom: str


class MedicationQueryResponse(BaseModel):
    medications: List[MedicationInfo]
    disclaimer: str = "This is general information only. Always consult a doctor before taking any medication."


class FAQListResponse(BaseModel):
    faqs: List[HealthFAQ]
    total: int
