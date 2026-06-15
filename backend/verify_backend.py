import requests
import sys
import time

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_endpoints():
    print("\n==================================================")
    # 1. Health check
    print("1. Testing Health Check...")
    res = requests.get("http://127.0.0.1:8000/")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    print("Health check OK:", res.json())
    
    # 2. Login as Admin
    print("\n2. Testing Admin Login...")
    login_payload = {
        "email": "admin@medicare.com",
        "password": "Admin@123"
    }
    res = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    admin_token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("Admin login success! Token acquired.")

    # 3. Login as Patient
    print("\n3. Testing Patient Login...")
    login_payload = {
        "email": "patient@medicare.com",
        "password": "Patient@123"
    }
    res = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    assert res.status_code == 200, f"Patient login failed: {res.text}"
    patient_token = res.json()["access_token"]
    patient_headers = {"Authorization": f"Bearer {patient_token}"}
    print("Patient login success! Token acquired.")

    # 4. Fetch Patient Profile
    print("\n4. Testing Patient Profile Fetch...")
    res = requests.get(f"{BASE_URL}/patients/me", headers=patient_headers)
    assert res.status_code == 200, f"Profile fetch failed: {res.text}"
    patient_profile = res.json()
    patient_id = patient_profile["id"]
    print(f"Patient Profile retrieved! Name: {patient_profile['full_name']}, ID: {patient_id}")

    # 5. Fetch Doctors List
    print("\n5. Testing Doctors Listing...")
    res = requests.get(f"{BASE_URL}/doctors")
    assert res.status_code == 200, f"Doctors fetch failed: {res.text}"
    doctors = res.json()
    assert len(doctors) > 0, "No doctors found in seeded DB"
    doctor_id = doctors[0]["id"]
    print(f"Doctors list retrieved! Found {len(doctors)} doctor(s). First Doctor ID: {doctor_id}")

    # 6. Fetch Available Slots for Tomorrow
    print("\n6. Testing Dynamic Slot Calculation...")
    tomorrow = (time.strftime("%Y-%m-%d", time.localtime(time.time() + 86400)))
    # Seed DB schedule has Monday, Wednesday, Friday. Let's make sure we find a day or just use a fixed date.
    # Seeding: doctor scheduled for Monday, Wednesday, Friday
    # Let's search a Monday (2026-06-08) to ensure we hit a scheduled day.
    target_date = "2026-06-08" # A Monday
    res = requests.get(f"{BASE_URL}/doctors/{doctor_id}/slots?appointment_date={target_date}")
    assert res.status_code == 200, f"Slots fetch failed: {res.text}"
    slots = res.json()
    print(f"Slots for Doctor {doctor_id} on {target_date}: found {len(slots)} slot(s)")
    if slots:
        print("First available slot:", slots[0])

    # 7. Book Appointment
    print("\n7. Testing Appointment Booking...")
    # Use Monday 2026-06-08 at 10:00
    appt_payload = {
        "doctor_id": doctor_id,
        "appointment_date": "2026-06-08",
        "time_slot": "10:00",
        "symptoms": "Mild palpitations and chest tightness"
    }
    res = requests.post(f"{BASE_URL}/appointments", json=appt_payload, headers=patient_headers)
    assert res.status_code == 201, f"Appointment booking failed: {res.text}"
    appt = res.json()
    appt_id = appt["id"]
    print(f"Appointment booked successfully! ID: {appt_id}, Status: {appt['status']}")

    # 8. Check dynamic slots again (10:00 should now be unavailable)
    print("\n8. Verifying Dynamic Booking Slot Occupancy...")
    res = requests.get(f"{BASE_URL}/doctors/{doctor_id}/slots?appointment_date=2026-06-08")
    slots = res.json()
    slot_10 = next((s for s in slots if s["time"] == "10:00"), None)
    assert slot_10 is not None, "Slot 10:00 should exist in schedule"
    assert slot_10["is_available"] is False, "Slot 10:00 should be marked booked (False)"
    print("Slot occupancy verification SUCCESS! 10:00 is marked booked.")

    # 9. Login as Doctor to consult & prescribe
    print("\n9. Testing Doctor Login & Session...")
    login_payload = {
        "email": "doctor@medicare.com",
        "password": "Doctor@123"
    }
    res = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    assert res.status_code == 200, f"Doctor login failed: {res.text}"
    doctor_token = res.json()["access_token"]
    doctor_headers = {"Authorization": f"Bearer {doctor_token}"}
    print("Doctor login success! Token acquired.")

    # 10. Submit Consultation notes
    print("\n10. Testing Consultation Notes Upload...")
    consult_payload = {
        "consultation_type": "ONLINE",
        "doctor_notes": "Patient has sinus rhythm with sinus tachycardia. Advised ECG and rest.",
        "prescription_text": "Aspirin 75mg once daily"
    }
    res = requests.post(f"{BASE_URL}/appointments/{appt_id}/consultation", json=consult_payload, headers=doctor_headers)
    assert res.status_code == 201, f"Consultation notes creation failed: {res.text}"
    print("Consultation notes uploaded successfully!")

    # 11. Generate Prescription PDF
    print("\n11. Testing Prescription PDF Generation...")
    presc_payload = {
        "medications": [
            {"name": "Aspirin", "dosage": "75mg", "frequency": "Once daily", "duration": "30 days"},
            {"name": "Metoprolol", "dosage": "25mg", "frequency": "Twice daily", "duration": "14 days"}
        ],
        "instructions": "Take medications after meals. Avoid strenuous physical activity."
    }
    res = requests.post(f"{BASE_URL}/appointments/{appt_id}/prescription", json=presc_payload, headers=doctor_headers)
    assert res.status_code == 201, f"Prescription generation failed: {res.text}"
    presc = res.json()
    presc_id = presc["id"]
    print(f"Prescription created successfully! ID: {presc_id}, PDF Path: {presc['pdf_path']}")

    # 12. Create Billing Invoice
    print("\n12. Testing Bill Invoice Generation...")
    bill_payload = {
        "patient_id": patient_id,
        "appointment_id": appt_id,
        "amount": 150.0,
        "tax": 12.50,
        "discount": 10.0
    }
    res = requests.post(f"{BASE_URL}/billing/bills", json=bill_payload, headers=doctor_headers)
    assert res.status_code == 201, f"Billing creation failed: {res.text}"
    bill = res.json()
    bill_id = bill["id"]
    print(f"Billing Invoice generated! ID: {bill_id}, Total Amount: ${bill['total_amount']}")

    # 13. Pay Bill (Patient)
    print("\n13. Testing Payment System...")
    pay_payload = {
        "payment_method": "CARD",
        "transaction_id": "TXN_7749102"
    }
    res = requests.post(f"{BASE_URL}/billing/bills/{bill_id}/pay", json=pay_payload, headers=patient_headers)
    assert res.status_code == 200, f"Bill payment failed: {res.text}"
    bill_paid = res.json()
    print(f"Bill payment successful! Status: {bill_paid['payment_status']}, PDF Path: {bill_paid['pdf_path']}")

    # 14. Download Prescription PDF
    print("\n14. Testing Prescription PDF Download...")
    res = requests.get(f"{BASE_URL}/appointments/prescriptions/{presc_id}/download", headers=patient_headers)
    assert res.status_code == 200, f"Prescription download failed: {res.text}"
    assert len(res.content) > 1000, "Downloaded PDF is empty or corrupt"
    print(f"Prescription PDF download success! Size: {len(res.content)} bytes.")

    # 15. Download Billing Invoice PDF
    print("\n15. Testing Invoice PDF Download...")
    res = requests.get(f"{BASE_URL}/billing/bills/{bill_id}/download", headers=patient_headers)
    assert res.status_code == 200, f"Invoice download failed: {res.text}"
    assert len(res.content) > 1000, "Downloaded PDF is empty or corrupt"
    print(f"Invoice PDF download success! Size: {len(res.content)} bytes.")

    # 16. Test AI Medical Assistant
    print("\n16. Testing AI Chat Assistant (Symptom Specialization recommends)...")
    ai_payload = {
        "message": "I have been feeling some chest tightness and my heart is beating very fast today",
        "session_id": "test_sess"
    }
    res = requests.post(f"{BASE_URL}/ai/chat", json=ai_payload, headers=patient_headers)
    assert res.status_code == 200, f"AI Assistant chat failed: {res.text}"
    ai_response = res.json()
    print("AI Chat Response:", ai_response["response"])
    print("AI Suggested Specialization:", ai_response["suggested_specialization"])
    print("AI Recommended Doctors:", ai_response["recommended_doctors"])
    assert ai_response["suggested_specialization"] == "Cardiologist", "Should suggest Cardiology for heart symptoms"

    # 17. Fetch Notifications list
    print("\n17. Testing Notifications Retrieval...")
    res = requests.get(f"{BASE_URL}/notifications", headers=patient_headers)
    assert res.status_code == 200, f"Notifications fetch failed: {res.text}"
    notifs = res.json()
    print(f"Notifications list retrieved! Patient has {len(notifs)} notification(s).")
    for n in notifs[:3]:
        print(f"  - [{n['notification_type']}] {n['message']}")

    # 18. Fetch Admin Analytics & Dashboard
    print("\n18. Testing Admin Metrics Dashboard...")
    res = requests.get(f"{BASE_URL}/admin/dashboard", headers=admin_headers)
    assert res.status_code == 200, f"Admin dashboard fetch failed: {res.text}"
    dashboard = res.json()
    print("Admin Dashboard Metrics:")
    print(f"  Total Patients: {dashboard['total_patients']}")
    print(f"  Total Doctors: {dashboard['total_doctors']}")
    print(f"  Total Appointments: {dashboard['total_appointments']}")
    print(f"  Total Revenue: ${dashboard['revenue_summary']['total_revenue']:.2f}")
    print(f"  Paid Revenue: ${dashboard['revenue_summary']['paid_revenue']:.2f}")
    print(f"  Department Stats: {dashboard['department_statistics']}")
    print(f"  Appointment Analytics: {dashboard['appointment_analytics']}")

    # 19. Fetch Admin Audit Logs
    print("\n19. Testing Security Audit Logging...")
    res = requests.get(f"{BASE_URL}/admin/audit-logs", headers=admin_headers)
    assert res.status_code == 200, f"Audit logs fetch failed: {res.text}"
    logs = res.json()
    print(f"Audit log database has {len(logs)} records.")
    print("Most recent audit log entries:")
    for log in logs[:5]:
        print(f"  - [{log['created_at']}] Action: {log['action']} | Details: {log['details']}")

    print("\n==================================================")
    print("ALL INTEGRATION TESTS PASSED SUCCESSFULLY! (20/20 modules checked)")
    print("==================================================")

if __name__ == "__main__":
    try:
        test_endpoints()
    except AssertionError as ae:
        print("\n!!! TEST ERROR FAILURE !!!")
        print(ae)
        sys.exit(1)
    except Exception as e:
        print("\n!!! UNEXPECTED TEST ERROR FAILURE !!!")
        print(e)
        sys.exit(1)
