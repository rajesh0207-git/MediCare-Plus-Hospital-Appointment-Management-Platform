from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from app.core.dependencies import get_db, get_current_user, RoleChecker
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.schemas.user import UserCreate, UserResponse, Token, LoginRequest, PasswordResetRequest
from app.schemas.patient import PatientRegister
from app.schemas.doctor import DoctorRegister
from app.services.audit_service import audit_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_patient(patient_data: PatientRegister, db: Session = Depends(get_db)):
    # Check if email exists
    existing_user = db.query(User).filter(User.email == patient_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create User
    new_user = User(
        email=patient_data.email,
        hashed_password=get_password_hash(patient_data.password),
        role="PATIENT",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create Patient profile
    new_patient = Patient(
        user_id=new_user.id,
        full_name=patient_data.full_name,
        gender=patient_data.gender,
        age=patient_data.age,
        blood_group=patient_data.blood_group,
        phone=patient_data.phone,
        address=patient_data.address
    )
    db.add(new_patient)
    db.commit()

    # Log action
    audit_service.log_activity(db, new_user.id, "PATIENT_REGISTRATION", f"Registered user {patient_data.email}")
    return new_user

@router.post("/register-doctor", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_doctor(
    doctor_data: DoctorRegister,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN"]))
):
    # Check if email exists
    existing_user = db.query(User).filter(User.email == doctor_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create User
    new_user = User(
        email=doctor_data.email,
        hashed_password=get_password_hash(doctor_data.password),
        role="DOCTOR",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create Doctor profile
    new_doctor = Doctor(
        user_id=new_user.id,
        department_id=doctor_data.department_id,
        specialization=doctor_data.specialization,
        qualification=doctor_data.qualification,
        experience=doctor_data.experience,
        consultation_fee=doctor_data.consultation_fee,
        availability_status=True
    )
    db.add(new_doctor)
    db.commit()

    # Log action
    audit_service.log_activity(db, current_user.id, "DOCTOR_PROVISIONING", f"Created doctor account for {doctor_data.email}")
    return new_user

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive account"
        )
    
    access_token = create_access_token(subject=user.id)
    # Log login
    audit_service.log_activity(db, user.id, "USER_LOGIN", f"User {user.email} logged in successfully")
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

@router.post("/reset-password")
def reset_password(reset_data: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == reset_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    user.hashed_password = get_password_hash(reset_data.new_password)
    db.commit()
    # Log reset
    audit_service.log_activity(db, user.id, "PASSWORD_RESET", f"User {user.email} reset password")
    return {"message": "Password updated successfully"}
