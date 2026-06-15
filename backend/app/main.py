from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.core.config import settings
from app.routers import (
    auth, patients, doctors, departments, appointments, medical_records, billing, notifications, ai, admin, telemedicine, health_tracker, medicine_reminder, bed_management, admissions, emergency, feedback
)

# Ensure static folders exist for PDF serving
os.makedirs(os.path.join("static", "prescriptions"), exist_ok=True)
os.makedirs(os.path.join("static", "billing"), exist_ok=True)
os.makedirs(os.path.join("static", "discharge_reports"), exist_ok=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set CORS origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for development. Restrict in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static PDF files (prescriptions, invoices, reports)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Mount Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(patients.router, prefix=settings.API_V1_STR)
app.include_router(doctors.router, prefix=settings.API_V1_STR)
app.include_router(departments.router, prefix=settings.API_V1_STR)
app.include_router(appointments.router, prefix=settings.API_V1_STR)
app.include_router(telemedicine.router, prefix=settings.API_V1_STR)
app.include_router(medical_records.router, prefix=settings.API_V1_STR)
app.include_router(billing.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(ai.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(health_tracker.router, prefix=settings.API_V1_STR)
app.include_router(medicine_reminder.router, prefix=settings.API_V1_STR)
app.include_router(bed_management.router, prefix=settings.API_V1_STR)
app.include_router(admissions.router, prefix=settings.API_V1_STR)
app.include_router(emergency.router, prefix=settings.API_V1_STR)
app.include_router(feedback.router, prefix=settings.API_V1_STR)


@app.get("/")
def read_root():
    return {
        "message": "Welcome to MediCare Plus - Hospital & Appointment Management Platform API",
        "docs": "/docs"
    }
