from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.ai import (
    AIChatRequest, AIChatResponse,
    MedicationQueryRequest, MedicationQueryResponse,
    FAQListResponse
)
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["AI Health Assistant"])


@router.post("/chat", response_model=AIChatResponse)
def ai_health_assistant(
    chat_data: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Main AI chat — symptom analysis, doctor suggestions, medication info, FAQs."""
    result = AIService.get_healthcare_assistance(db, chat_data.message)
    return result


@router.get("/faqs", response_model=FAQListResponse)
def get_health_faqs(
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Get health FAQs, optionally filtered by category."""
    faqs = AIService.get_faqs(category)
    return {"faqs": faqs, "total": len(faqs)}


@router.post("/medications", response_model=MedicationQueryResponse)
def get_medications(
    query: MedicationQueryRequest,
    current_user: User = Depends(get_current_user)
):
    """Get general medication information for a symptom."""
    meds = AIService.get_medications(query.symptom)
    return {"medications": meds}


@router.post("/analyze-symptoms")
def analyze_symptoms(
    chat_data: AIChatRequest,
    current_user: User = Depends(get_current_user)
):
    """Standalone symptom analysis endpoint."""
    result = AIService.analyze_symptoms(chat_data.message)
    return result
