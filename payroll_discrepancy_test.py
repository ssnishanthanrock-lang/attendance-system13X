#!/usr/bin/env python3
"""
Specific Payroll Discrepancy Test for Review Request
Tests the exact scenario mentioned in the review request
"""

import requests
import json
import jwt
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://erp-attendance-5.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

def create_auth_token(mobile="0773769019"):
    """Create auth token for specific mobile number"""
    # Use real user data - we'll need to find the actual user_id and company_id for this mobile
    test_payload = {
        "user_id": "cfb58f53-79c7-4f12-85b0-268dde3f3fe0",  # Using existing admin user
        "role": "admin", 
        "company_id": "dc1ff8de-3db3-4885-b6b7-168b00e3cef5",  # Using existing company
        "mobile": mobile
    }
    
    jwt_secret = "attendance-system-secret-key-change-in-production"
    return jwt.encode(test_payload, jwt_secret, algorithm="HS256")

def test_payroll_discrepancy():
    """Test the specific payroll discrepancy scenario"""
    print("🔍 PAYROLL DISCREPANCY INVESTIGATION")
    print("=" * 50)
    
    # Create session with authentication
    session = requests.Session()
    auth_token = create_auth_token("0773769019")
    session.headers.update({'Authorization': f'Bearer {auth_token}'})
    
    print(f"Testing with mobile: 0773769019")
    print(f"API Base: {API_BASE}")
    
    # Step 1: Call live-current-month endpoint
    print("\n1. Testing GET /api/payroll/live-current-month")
    live_response = session.get(f"{API_BASE}/payroll/live-current-month")
    
    if live_response.status_code == 200:
        live_data = live_response.json()
        live_total_gross = live_data.get("total_gross", 0)
        live_employees = live_data.get("employees", [])
        live_working_days = live_employees[0].get("working_days") if live_employees else None
        
        print(f"   ✅ Status: {live_response.status_code}")
        print(f"   📊 Total Gross: {live_total_gross}")
        print(f"   👥 Employee Count: {len(live_employees)}")
        print(f"   📅 Working Days: {live_working_days}")
        
        if live_employees:
            print(f"   📋 First Employee Sample:")
            emp = live_employees[0]
            print(f"      - Name: {emp.get('employee_name')}")
            print(f"      - Basic Salary: {emp.get('basic_salary')}")
            print(f"      - Allowances: {emp.get('allowances')}")
            print(f"      - Gross Salary: {emp.get('gross_salary')}")
            print(f"      - Working Days: {emp.get('working_days')}")
    else:
        print(f"   ❌ Status: {live_response.status_code}")
        print(f"   📄 Response: {live_response.text}")
        live_total_gross = None
        live_working_days = None
    
    # Step 2: Call detailed/2025-12 endpoint
    print("\n2. Testing GET /api/payroll/detailed/2025-12")
    detailed_response = session.get(f"{API_BASE}/payroll/detailed/2025-12")
    
    if detailed_response.status_code == 200:
        detailed_data = detailed_response.json()
        detailed_total_gross = detailed_data.get("total_gross", 0)
        detailed_employees = detailed_data.get("employees", [])
        detailed_working_days = detailed_employees[0].get("working_days") if detailed_employees else None
        
        print(f"   ✅ Status: {detailed_response.status_code}")
        print(f"   📊 Total Gross: {detailed_total_gross}")
        print(f"   👥 Employee Count: {len(detailed_employees)}")
        print(f"   📅 Working Days: {detailed_working_days}")
        
        if detailed_employees:
            print(f"   📋 First Employee Sample:")
            emp = detailed_employees[0]
            print(f"      - Name: {emp.get('employee_name')}")
            print(f"      - Basic Salary: {emp.get('basic_salary')}")
            print(f"      - Allowances: {emp.get('allowances')}")
            print(f"      - Gross Salary: {emp.get('gross_salary')}")
            print(f"      - Working Days: {emp.get('working_days')}")
    else:
        print(f"   ❌ Status: {detailed_response.status_code}")
        print(f"   📄 Response: {detailed_response.text}")
        detailed_total_gross = None
        detailed_working_days = None
    
    # Step 3: Analysis
    print("\n3. ANALYSIS")
    print("-" * 30)
    
    # Working Days Check
    if live_working_days == 27 and detailed_working_days == 27:
        print("   ✅ Working Days: Both endpoints correctly use 27 working days")
    elif live_working_days == 27 and detailed_working_days != 27:
        print(f"   ⚠️  Working Days: Live correct (27), Detailed wrong ({detailed_working_days})")
    elif live_working_days != 27 and detailed_working_days == 27:
        print(f"   ⚠️  Working Days: Detailed correct (27), Live wrong ({live_working_days})")
    else:
        print(f"   ❌ Working Days: Both wrong - Live: {live_working_days}, Detailed: {detailed_working_days}")
    
    # Total Gross Check
    if live_total_gross is not None and detailed_total_gross is not None:
        if abs(live_total_gross - detailed_total_gross) < 0.01:
            print(f"   ✅ Total Gross: Values match ({live_total_gross})")
        else:
            difference = abs(live_total_gross - detailed_total_gross)
            print(f"   🚨 DISCREPANCY FOUND!")
            print(f"      Live Total Gross: {live_total_gross}")
            print(f"      Detailed Total Gross: {detailed_total_gross}")
            print(f"      Difference: {difference}")
            
            # Determine which is likely correct
            if detailed_working_days == 27 and live_working_days != 27:
                print(f"      💡 Detailed endpoint likely correct (uses 27 working days)")
            elif live_working_days == 27 and detailed_working_days != 27:
                print(f"      💡 Live endpoint likely correct (uses 27 working days)")
            else:
                print(f"      💡 Need further investigation")
    
    # Step 4: Recommendations
    print("\n4. RECOMMENDATIONS")
    print("-" * 30)
    
    if live_working_days != 27:
        print("   🔧 Live endpoint needs to use updated calculate_working_days() function")
    
    if detailed_working_days != 27:
        print("   🔧 Detailed endpoint needs to use updated calculate_working_days() function")
    
    if live_total_gross != detailed_total_gross:
        print("   🔧 Investigate total_gross calculation differences between endpoints")
        print("   🔧 Ensure both endpoints use same calculation logic for December 2025")
    
    if live_working_days == 27 and detailed_working_days == 27 and live_total_gross == detailed_total_gross:
        print("   ✅ No issues found - both endpoints working correctly")

if __name__ == "__main__":
    test_payroll_discrepancy()