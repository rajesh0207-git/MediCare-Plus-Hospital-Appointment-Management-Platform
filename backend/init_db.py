import sys
import os
from datetime import time

# Add backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import Base, engine, SessionLocal
from app.core.security import get_password_hash
from app.models import (
    User, Patient, Doctor, Department, DoctorSchedule, EmergencyContact
)

def init_db():
    print("Dropping old tables in database...")
    Base.metadata.drop_all(bind=engine)
    print("Creating tables in database...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")

    db = SessionLocal()
    try:
        # Check if Admin already exists
        admin_user = db.query(User).filter(User.email == "admin@medicare.com").first()
        if not admin_user:
            print("Seeding database with default records...")
            # 1. Create Departments
            depts_data = [
                {"name": "Cardiology", "description": "Heart care and diagnostics"},
                {"name": "Pediatrics", "description": "Infant and child healthcare"},
                {"name": "Neurology", "description": "Brain and nervous system disorders"},
                {"name": "Orthopedics", "description": "Bone, joint, and muscle care"},
                {"name": "General Medicine", "description": "Primary healthcare and general medicine"}
            ]
            departments = []
            for d in depts_data:
                dept = Department(name=d["name"], description=d["description"])
                db.add(dept)
                departments.append(dept)
            db.commit() # Commit to get department IDs
            print(f"Created {len(departments)} departments.")

            # 2. Create Admin
            admin = User(
                email="admin@medicare.com",
                hashed_password=get_password_hash("Admin@123"),
                role="ADMIN",
                is_active=True
            )
            db.add(admin)

            # 3. Create Doctor
            doctor_user = User(
                email="doctor@medicare.com",
                hashed_password=get_password_hash("Doctor@123"),
                role="DOCTOR",
                is_active=True
            )
            db.add(doctor_user)
            db.commit() # Commit to get user IDs

            # Add Doctor Profile
            cardio_dept = db.query(Department).filter(Department.name == "Cardiology").first()
            doc_profile = Doctor(
                user_id=doctor_user.id,
                department_id=cardio_dept.id if cardio_dept else None,
                specialization="Cardiologist",
                qualification="MD - Cardiology, MBBS",
                experience=10,
                consultation_fee=150.0,
                availability_status=True
            )
            db.add(doc_profile)
            db.commit()

            # Add Doctor Schedule (Monday, Wednesday, Friday: 9 AM to 5 PM)
            days = ["Monday", "Wednesday", "Friday"]
            for day in days:
                sched = DoctorSchedule(
                    doctor_id=doc_profile.id,
                    day_of_week=day,
                    start_time=time(9, 0),
                    end_time=time(17, 0),
                    slot_duration_minutes=30
                )
                db.add(sched)
            
            # 4. Create Patient
            patient_user = User(
                email="patient@medicare.com",
                hashed_password=get_password_hash("Patient@123"),
                role="PATIENT",
                is_active=True
            )
            db.add(patient_user)
            db.commit()

            # Add Patient Profile
            pat_profile = Patient(
                user_id=patient_user.id,
                full_name="John Doe",
                gender="Male",
                age=35,
                blood_group="O+",
                phone="1234567890",
                address="123 Main St, New York, NY"
            )
            db.add(pat_profile)
            db.commit()

            # Add Patient Emergency Contact
            emergency = EmergencyContact(
                patient_id=pat_profile.id,
                name="Jane Doe",
                relationship="Spouse",
                phone="9876543210"
            )
            db.add(emergency)
            
            db.commit()
            print("Database seeding completed successfully!")
            print("\nSeeded User Accounts:")
            print("---------------------")
            print("Admin:   admin@medicare.com   / Password: Admin@123")
            print("Doctor:  doctor@medicare.com  / Password: Doctor@123")
            print("Patient: patient@medicare.com / Password: Patient@123")
        else:
            print("Admin already exists. Skipping database seeding.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
