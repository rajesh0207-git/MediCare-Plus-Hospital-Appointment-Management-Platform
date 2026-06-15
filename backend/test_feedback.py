"""Test feedback endpoints"""
import requests

BASE_URL = "http://localhost:8000/api/v1"

# Test 1: Check if feedback endpoint exists (should return 401 if auth required)
print("Test 1: Checking feedback endpoint...")
res = requests.get(f"{BASE_URL}/feedback")
print(f"Status: {res.status_code}")
print(f"Response: {res.json() if res.status_code != 500 else 'Server error'}\n")

# Test 2: Try to access analytics
print("Test 2: Checking analytics endpoint...")
res = requests.get(f"{BASE_URL}/feedback/analytics/summary")
print(f"Status: {res.status_code}")
print(f"Response: {res.json() if res.status_code != 500 else 'Server error'}\n")

print("Tests complete!")
