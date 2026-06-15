import requests
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.doctor import Doctor, Department
from app.models.user import User


# ============================================================
# SYMPTOM → SPECIALIZATION MAPPING (Enhanced)
# ============================================================
SYMPTOM_MAP = {
    "heart": ("Cardiology", "HIGH"),
    "chest pain": ("Cardiology", "CRITICAL"),
    "palpitation": ("Cardiology", "HIGH"),
    "breathless": ("Cardiology", "HIGH"),
    "shortness of breath": ("Cardiology", "HIGH"),
    "high blood pressure": ("Cardiology", "MODERATE"),
    "child": ("Pediatrics", "MODERATE"),
    "baby": ("Pediatrics", "MODERATE"),
    "infant": ("Pediatrics", "MODERATE"),
    "brain": ("Neurology", "HIGH"),
    "headache": ("Neurology", "MODERATE"),
    "migraine": ("Neurology", "MODERATE"),
    "nerve": ("Neurology", "MODERATE"),
    "stroke": ("Neurology", "CRITICAL"),
    "paralysis": ("Neurology", "CRITICAL"),
    "seizure": ("Neurology", "CRITICAL"),
    "dizzy": ("Neurology", "MODERATE"),
    "dizziness": ("Neurology", "MODERATE"),
    "bone": ("Orthopedics", "MODERATE"),
    "joint": ("Orthopedics", "MODERATE"),
    "fracture": ("Orthopedics", "HIGH"),
    "muscle": ("Orthopedics", "MODERATE"),
    "back pain": ("Orthopedics", "MODERATE"),
    "knee pain": ("Orthopedics", "LOW"),
    "sprain": ("Orthopedics", "LOW"),
    "fever": ("General Medicine", "MODERATE"),
    "cough": ("General Medicine", "LOW"),
    "cold": ("General Medicine", "LOW"),
    "flu": ("General Medicine", "LOW"),
    "stomach": ("Gastroenterology", "MODERATE"),
    "nausea": ("Gastroenterology", "LOW"),
    "vomiting": ("Gastroenterology", "MODERATE"),
    "diarrhea": ("Gastroenterology", "MODERATE"),
    "acidity": ("Gastroenterology", "LOW"),
    "skin": ("Dermatology", "LOW"),
    "rash": ("Dermatology", "LOW"),
    "itching": ("Dermatology", "LOW"),
    "allergy": ("Dermatology", "LOW"),
    "eye": ("Ophthalmology", "MODERATE"),
    "vision": ("Ophthalmology", "MODERATE"),
    "blurry vision": ("Ophthalmology", "HIGH"),
    "ear": ("ENT", "LOW"),
    "throat": ("ENT", "LOW"),
    "nose": ("ENT", "LOW"),
    "sinus": ("ENT", "LOW"),
    "tooth": ("Dentistry", "LOW"),
    "dental": ("Dentistry", "LOW"),
    "gum": ("Dentistry", "LOW"),
    "anxiety": ("Psychiatry", "MODERATE"),
    "depression": ("Psychiatry", "MODERATE"),
    "stress": ("Psychiatry", "LOW"),
    "insomnia": ("Psychiatry", "MODERATE"),
    "diabetes": ("Endocrinology", "MODERATE"),
    "thyroid": ("Endocrinology", "MODERATE"),
    "weight loss": ("Endocrinology", "MODERATE"),
    "weight gain": ("Endocrinology", "LOW"),
    "kidney": ("Nephrology", "HIGH"),
    "urinary": ("Urology", "MODERATE"),
    "pregnancy": ("Obstetrics & Gynecology", "MODERATE"),
    "menstrual": ("Obstetrics & Gynecology", "LOW"),
}

# ============================================================
# MEDICATION DATABASE (General Reference)
# ============================================================
MEDICATION_DB = {
    "fever": [
        {"name": "Paracetamol (Acetaminophen)", "category": "Antipyretic", "description": "Reduces fever and mild pain", "common_dosage": "500mg every 4-6 hours (max 4g/day)", "precautions": "Avoid with alcohol; consult doctor if fever persists >3 days"},
        {"name": "Ibuprofen", "category": "NSAID", "description": "Reduces fever, pain and inflammation", "common_dosage": "200-400mg every 4-6 hours", "precautions": "Take with food; avoid if stomach ulcers or kidney issues"},
    ],
    "headache": [
        {"name": "Paracetamol", "category": "Analgesic", "description": "First-line treatment for tension headaches", "common_dosage": "500-1000mg every 4-6 hours", "precautions": "Do not exceed 4g per day"},
        {"name": "Ibuprofen", "category": "NSAID", "description": "For moderate headaches with inflammation", "common_dosage": "200-400mg every 6 hours", "precautions": "Take with food"},
    ],
    "cough": [
        {"name": "Dextromethorphan", "category": "Antitussive", "description": "Suppresses dry cough", "common_dosage": "10-20mg every 4 hours", "precautions": "Not for productive cough; avoid with MAO inhibitors"},
        {"name": "Guaifenesin", "category": "Expectorant", "description": "Loosens mucus in productive cough", "common_dosage": "200-400mg every 4 hours", "precautions": "Drink plenty of water"},
    ],
    "cold": [
        {"name": "Cetirizine", "category": "Antihistamine", "description": "Relieves runny nose, sneezing", "common_dosage": "10mg once daily", "precautions": "May cause drowsiness"},
        {"name": "Phenylephrine", "category": "Decongestant", "description": "Relieves nasal congestion", "common_dosage": "10mg every 4 hours", "precautions": "Avoid if high blood pressure"},
    ],
    "stomach": [
        {"name": "Omeprazole", "category": "Proton Pump Inhibitor", "description": "Reduces stomach acid production", "common_dosage": "20mg once daily before breakfast", "precautions": "Not for long-term use without doctor supervision"},
        {"name": "Antacid (Calcium Carbonate)", "category": "Antacid", "description": "Neutralizes stomach acid for quick relief", "common_dosage": "500-1000mg as needed", "precautions": "Temporary relief only; see doctor if persistent"},
    ],
    "pain": [
        {"name": "Paracetamol", "category": "Analgesic", "description": "General pain relief", "common_dosage": "500-1000mg every 4-6 hours", "precautions": "Max 4g per day"},
        {"name": "Ibuprofen", "category": "NSAID", "description": "Pain with inflammation", "common_dosage": "200-400mg every 6 hours", "precautions": "Take with food; avoid with stomach issues"},
    ],
    "allergy": [
        {"name": "Cetirizine", "category": "Antihistamine", "description": "Relieves allergy symptoms", "common_dosage": "10mg once daily", "precautions": "May cause mild drowsiness"},
        {"name": "Loratadine", "category": "Antihistamine", "description": "Non-drowsy allergy relief", "common_dosage": "10mg once daily", "precautions": "Generally well-tolerated"},
    ],
    "diarrhea": [
        {"name": "ORS (Oral Rehydration Salts)", "category": "Rehydration", "description": "Replaces lost fluids and electrolytes", "common_dosage": "After each loose stool", "precautions": "Essential for preventing dehydration"},
        {"name": "Loperamide", "category": "Antidiarrheal", "description": "Slows bowel movements", "common_dosage": "4mg initially, then 2mg after each loose stool", "precautions": "Do not use if bloody stool or fever; see doctor"},
    ],
}

# ============================================================
# HEALTH FAQ DATABASE
# ============================================================
HEALTH_FAQS = [
    # General
    {"question": "What are the hospital visiting hours?", "answer": "OPD services are available Monday-Saturday, 9:00 AM - 6:00 PM. Emergency services are available 24/7.", "category": "General"},
    {"question": "How do I book an appointment?", "answer": "Navigate to 'Book Appointment' from the sidebar, select a doctor, choose date and time slot, then confirm. You'll receive instant confirmation.", "category": "General"},
    {"question": "How do I view my medical records?", "answer": "Go to 'Medical Records' in your patient dashboard to view all your prescriptions, lab results, and consultation history.", "category": "General"},
    {"question": "What insurance plans do you accept?", "answer": "We accept most major insurance providers. Check your coverage under 'Billing & Payments' in your dashboard.", "category": "General"},
    {"question": "How do I contact my doctor after hours?", "answer": "Use our telemedicine video consultation feature for after-hours appointments, or call our 24/7 emergency line.", "category": "General"},
    # Symptoms
    {"question": "When should I seek emergency care?", "answer": "Seek emergency care for: chest pain, difficulty breathing, severe bleeding, sudden weakness/numbness, severe allergic reactions, or loss of consciousness.", "category": "Symptoms"},
    {"question": "How long should a fever last before seeing a doctor?", "answer": "See a doctor if fever lasts more than 3 days, exceeds 103°F (39.4°C), or is accompanied by stiff neck, rash, or difficulty breathing.", "category": "Symptoms"},
    {"question": "Is a persistent cough serious?", "answer": "A cough lasting more than 2-3 weeks, producing blood, or causing chest pain should be evaluated by a doctor promptly.", "category": "Symptoms"},
    # Medication
    {"question": "Can I take antibiotics without a prescription?", "answer": "No. Antibiotics require a doctor's prescription. Misuse contributes to antibiotic resistance. Always complete the full course prescribed.", "category": "Medication"},
    {"question": "How should I store my medications?", "answer": "Store most medications at room temperature, away from moisture and direct sunlight. Check labels for specific storage instructions.", "category": "Medication"},
    # Prevention
    {"question": "How often should I get a health checkup?", "answer": "Adults should have a general checkup annually. Those over 40 or with chronic conditions should check every 6 months.", "category": "Prevention"},
    {"question": "What vaccines do adults need?", "answer": "Adults should consider: annual flu shot, Tdap booster every 10 years, and age-appropriate screenings. Consult your doctor for personalized advice.", "category": "Prevention"},
    # Lifestyle
    {"question": "How much water should I drink daily?", "answer": "General guideline is 8 glasses (2 liters) per day. Needs increase with exercise, hot weather, or illness. Urine color (pale yellow) is a good indicator.", "category": "Lifestyle"},
    {"question": "What is a healthy BMI range?", "answer": "A healthy BMI is 18.5-24.9. Use our Health Tracker to monitor your weight and vital signs over time.", "category": "Lifestyle"},
]

# ============================================================
# SELF-CARE TIPS DATABASE
# ============================================================
SELF_CARE_TIPS = {
    "fever": ["Rest and stay hydrated", "Use a cool compress on forehead", "Wear light clothing", "Monitor temperature every 4 hours"],
    "headache": ["Rest in a quiet, dark room", "Stay hydrated", "Apply cold compress to temples", "Practice relaxation techniques"],
    "cough": ["Stay hydrated with warm fluids", "Use a humidifier", "Try honey and lemon in warm water", "Elevate your head while sleeping"],
    "cold": ["Rest and drink plenty of fluids", "Gargle with warm salt water", "Use saline nasal spray", "Eat warm soups and broths"],
    "stomach": ["Eat bland foods (BRAT diet: bananas, rice, applesauce, toast)", "Stay hydrated with small sips", "Avoid spicy, fatty, or dairy foods", "Rest your stomach between meals"],
    "back pain": ["Apply ice for first 48 hours, then heat", "Maintain good posture", "Gentle stretching exercises", "Avoid prolonged sitting"],
    "skin": ["Keep affected area clean and dry", "Avoid scratching", "Use gentle, fragrance-free soap", "Apply moisturizer after bathing"],
    "anxiety": ["Practice deep breathing (4-7-8 technique)", "Regular physical exercise", "Limit caffeine and alcohol", "Try meditation or mindfulness"],
    "diarrhea": ["Drink ORS to prevent dehydration", "Eat bland, easy-to-digest foods", "Avoid dairy and high-fiber foods", "Rest and monitor for signs of dehydration"],
    "default": ["Stay hydrated", "Get adequate rest", "Monitor your symptoms", "Seek medical help if symptoms worsen"],
}


class AIService:

    @staticmethod
    def _get_gemini_response(prompt: str, api_key: str) -> Optional[str]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception:
            pass
        return None

    @classmethod
    def analyze_symptoms(cls, message: str) -> Dict[str, Any]:
        """Feature 1: Symptom-Based Guidance — analyze symptoms and assess severity."""
        msg_lower = message.lower()
        detected = []
        best_spec = None
        best_severity = "LOW"
        severity_order = {"LOW": 0, "MODERATE": 1, "HIGH": 2, "CRITICAL": 3}

        for symptom, (spec, sev) in SYMPTOM_MAP.items():
            if symptom in msg_lower:
                detected.append(symptom)
                if severity_order.get(sev, 0) > severity_order.get(best_severity, 0):
                    best_severity = sev
                    best_spec = spec

        # If no symptoms detected, try keyword matching
        if not detected:
            for keyword in msg_lower.split():
                if keyword in SYMPTOM_MAP:
                    spec, sev = SYMPTOM_MAP[keyword]
                    detected.append(keyword)
                    if severity_order.get(sev, 0) > severity_order.get(best_severity, 0):
                        best_severity = sev
                        best_spec = spec

        # Urgency advice based on severity
        urgency = {
            "LOW": "Your symptoms appear mild. Self-care measures may help, but see a doctor if they persist beyond a few days.",
            "MODERATE": "Your symptoms suggest you should schedule a doctor's appointment within the next few days for proper evaluation.",
            "HIGH": "Your symptoms require prompt medical attention. Please book an appointment as soon as possible.",
            "CRITICAL": "⚠️ Your symptoms may indicate a serious condition. Please seek immediate medical attention or call emergency services."
        }

        # Self-care tips
        tips_key = detected[0] if detected else "default"
        tips = SELF_CARE_TIPS.get(tips_key, SELF_CARE_TIPS["default"])

        return {
            "detected_symptoms": detected,
            "severity": best_severity,
            "suggested_specialization": best_spec,
            "urgency_advice": urgency.get(best_severity, urgency["LOW"]),
            "self_care_tips": tips,
        }

    @classmethod
    def get_medications(cls, symptom: str) -> List[Dict]:
        """Feature 5: Medication Assistance — return general medication info for a symptom."""
        symptom_lower = symptom.lower()
        meds = []
        for key, med_list in MEDICATION_DB.items():
            if key in symptom_lower:
                meds.extend(med_list)
        # Deduplicate by name
        seen = set()
        unique = []
        for m in meds:
            if m["name"] not in seen:
                seen.add(m["name"])
                unique.append(m)
        return unique if unique else MEDICATION_DB.get("pain", [])

    @classmethod
    def get_faqs(cls, category: str = None) -> List[Dict]:
        """Feature 2: Health FAQs — return relevant FAQs."""
        if category:
            return [f for f in HEALTH_FAQS if f["category"].lower() == category.lower()]
        return HEALTH_FAQS

    @classmethod
    def get_recommended_doctors(cls, db: Session, specialization: str) -> List[Dict]:
        """Feature 4: Doctor Suggestions — find available doctors for a specialization."""
        if not specialization:
            return []

        docs = db.query(Doctor).filter(
            Doctor.specialization.like(f"%{specialization}%"),
            Doctor.availability_status == True
        ).limit(5).all()

        results = []
        for doc in docs:
            dept = db.query(Department).filter(Department.id == doc.department_id).first()
            dept_name = dept.name if dept else "General"
            user_email = doc.user.email if doc.user else "doctor@medicare.com"
            results.append({
                "id": doc.id,
                "name": f"Dr. {user_email.split('@')[0].capitalize()}",
                "specialization": doc.specialization,
                "fee": doc.consultation_fee,
                "experience_years": doc.experience,
                "availability_status": doc.availability_status,
            })
        return results

    @classmethod
    def get_healthcare_assistance(cls, db: Session, message: str) -> Dict[str, Any]:
        """Main AI chat handler — orchestrates all 5 features."""
        msg_lower = message.lower()

        # Feature 1: Symptom Analysis
        symptom_analysis = cls.analyze_symptoms(message)
        suggested_spec = symptom_analysis["suggested_specialization"]

        # Feature 4: Doctor Suggestions
        recommended_docs = cls.get_recommended_doctors(db, suggested_spec) if suggested_spec else []

        # Feature 5: Medication Assistance
        detected_symptoms = symptom_analysis["detected_symptoms"]
        medications = []
        if detected_symptoms:
            medications = cls.get_medications(detected_symptoms[0])

        # Feature 2: Relevant FAQs
        faqs = []
        if any(w in msg_lower for w in ["appointment", "book", "schedule", "how"]):
            faqs = cls.get_faqs("General")[:3]
        elif any(w in msg_lower for w in ["medicine", "medication", "drug", "pill", "tablet"]):
            faqs = cls.get_faqs("Medication")[:3]
        elif any(w in msg_lower for w in ["symptom", "fever", "pain", "cough"]):
            faqs = cls.get_faqs("Symptoms")[:3]
        else:
            faqs = cls.get_faqs()[:2]

        # Feature 3: Appointment Recommendation
        appointment_recommended = symptom_analysis["severity"] in ("MODERATE", "HIGH", "CRITICAL")

        # Quick actions
        quick_actions = []
        if appointment_recommended:
            quick_actions.append("Book Appointment")
        if detected_symptoms:
            quick_actions.append("View Medications")
        quick_actions.append("Browse FAQs")
        quick_actions.append("Track Symptoms")

        # Build response text
        response_parts = []

        if symptom_analysis["detected_symptoms"]:
            symptoms_list = ", ".join(detected_symptoms)
            response_parts.append(f"🔍 **Detected Symptoms:** {symptoms_list}")
            response_parts.append(f"📊 **Severity:** {symptom_analysis['severity']}")
            response_parts.append(f"💡 **Advice:** {symptom_analysis['urgency_advice']}")

            if symptom_analysis["self_care_tips"]:
                tips_text = "\n".join([f"  • {tip}" for tip in symptom_analysis["self_care_tips"][:3]])
                response_parts.append(f"🩹 **Self-Care Tips:**\n{tips_text}")

        if suggested_spec:
            response_parts.append(f"👨‍⚕️ **Recommended Specialist:** {suggested_spec}")
            if recommended_docs:
                doc_names = [d["name"] for d in recommended_docs[:3]]
                response_parts.append(f"   Available doctors: {', '.join(doc_names)}")

        if appointment_recommended:
            response_parts.append("📅 **Recommendation:** I suggest booking an appointment for proper evaluation.")

        if medications:
            med_names = [m["name"] for m in medications[:2]]
            response_parts.append(f"💊 **Common Medications:** {', '.join(med_names)} (consult doctor before use)")

        if not response_parts:
            response_parts.append(
                "Hello! I am the MediCare Plus AI Health Assistant. I can help you with:\n"
                "  🔍 **Symptom Analysis** — Describe your symptoms for assessment\n"
                "  ❓ **Health FAQs** — Ask common health questions\n"
                "  📅 **Appointment Guidance** — Get booking recommendations\n"
                "  👨‍⚕️ **Doctor Suggestions** — Find the right specialist\n"
                "  💊 **Medication Info** — Learn about common medications\n\n"
                "How can I assist you today?"
            )

        response_text = "\n\n".join(response_parts)

        # Try Gemini AI for enhanced response
        if settings.GEMINI_API_KEY:
            system_context = (
                "You are the MediCare Plus AI Health Assistant. Analyze the patient's query and provide "
                "helpful, professional medical guidance. Include symptom analysis, self-care tips, and "
                "when to see a doctor. Always remind them this is not a replacement for professional diagnosis. "
                f"Patient query: '{message}'"
            )
            ai_res = cls._get_gemini_response(system_context, settings.GEMINI_API_KEY)
            if ai_res:
                response_text = ai_res

        return {
            "response": response_text,
            "symptom_analysis": symptom_analysis if detected_symptoms else None,
            "suggested_specialization": suggested_spec,
            "recommended_doctors": recommended_docs,
            "appointment_recommended": appointment_recommended,
            "medications": medications,
            "faqs": faqs,
            "quick_actions": quick_actions,
        }
