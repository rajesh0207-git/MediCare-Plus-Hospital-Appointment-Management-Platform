from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.models.doctor import Department, Doctor
from app.models.appointment import Appointment
from app.schemas.doctor import DepartmentCreate, DepartmentResponse, DepartmentStats
from app.services.audit_service import audit_service
from typing import List

router = APIRouter(prefix="/departments", tags=["Department Management"])

@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    dept_data: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN"]))
):
    # Verify unique name
    existing = db.query(Department).filter(Department.name == dept_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department already exists"
        )
        
    dept = Department(
        name=dept_data.name,
        description=dept_data.description
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    
    audit_service.log_activity(db, current_user.id, "DEPARTMENT_CREATE", f"Created department {dept_data.name}")
    return dept

@router.get("", response_model=List[DepartmentResponse])
def list_departments(db: Session = Depends(get_db)):
    return db.query(Department).all()

@router.post("/{id}/assign/{doctor_id}")
def assign_doctor(
    id: int,
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN"]))
):
    dept = db.query(Department).filter(Department.id == id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
        
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    doctor.department_id = id
    db.commit()
    
    audit_service.log_activity(db, current_user.id, "DOCTOR_DEPARTMENT_ASSIGN", f"Assigned doctor ID {doctor_id} to department ID {id}")
    return {"message": f"Successfully assigned Doctor {doctor_id} to Department {dept.name}"}

@router.get("/{id}/stats", response_model=DepartmentStats)
def get_department_statistics(id: int, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
        
    doc_count = db.query(func.count(Doctor.id)).filter(Doctor.department_id == id).scalar()
    
    # Total appointments in this department
    appt_count = db.query(func.count(Appointment.id))\
        .join(Doctor, Appointment.doctor_id == Doctor.id)\
        .filter(Doctor.department_id == id).scalar()
        
    return {
        "department_id": dept.id,
        "name": dept.name,
        "doctor_count": doc_count,
        "total_appointments": appt_count
    }
