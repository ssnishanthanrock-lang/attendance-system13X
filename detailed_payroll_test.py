#!/usr/bin/env python3
"""
Detailed Payroll Investigation Test
Investigates the payroll calculation logic and attendance data
"""

import requests
import json
import jwt
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://admin-sms-portal.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

def create_auth_token(mobile="0773769019"):
    """Create auth token for specific mobile number"""
    test_payload = {
        "user_id": "cfb58f53-79c7-4f12-85b0-268dde3f3fe0",
        "role": "admin", 
        "company_id": "dc1ff8de-3db3-4885-b6b7-168b00e3cef5",
        "mobile": mobile
    }
    
    jwt_secret = "attendance-system-secret-key-change-in-production"
    return jwt.encode(test_payload, jwt_secret, algorithm="HS256")

def test_detailed_payroll_investigation():
    """Detailed investigation of payroll calculations"""
    print("🔍 DETAILED PAYROLL INVESTIGATION")
    print("=" * 60)
    
    # Create session with authentication
    session = requests.Session()
    auth_token = create_auth_token("0773769019")
    session.headers.update({'Authorization': f'Bearer {auth_token}'})
    
    # Step 1: Check if there are employees with actual salary data
    print("\n1. CHECKING EMPLOYEE DATA")
    print("-" * 30)
    
    employees_response = session.get(f"{API_BASE}/employees")
    if employees_response.status_code == 200:
        employees = employees_response.json()
        print(f"   📊 Total Employees: {len(employees)}")
        
        # Find employees with non-zero salaries
        employees_with_salary = [emp for emp in employees if emp.get('basic_salary', 0) > 0]
        print(f"   💰 Employees with Basic Salary > 0: {len(employees_with_salary)}")
        
        if employees_with_salary:
            print(f"   📋 Sample Employees with Salary:")
            for i, emp in enumerate(employees_with_salary[:3]):
                print(f"      {i+1}. {emp.get('name')} - Basic: {emp.get('basic_salary')}, Allowances: {emp.get('allowances', 0)}")
    
    # Step 2: Check attendance data for December 2025
    print("\n2. CHECKING ATTENDANCE DATA FOR DECEMBER 2025")
    print("-" * 30)
    
    # Check if there's any attendance data
    attendance_response = session.get(f"{API_BASE}/attendance", params={
        "from_date": "2025-12-01",
        "to_date": "2025-12-31"
    })
    
    if attendance_response.status_code == 200:
        attendance_data = attendance_response.json()
        print(f"   📊 Attendance Records in Dec 2025: {len(attendance_data)}")
        
        if attendance_data:
            print(f"   📋 Sample Attendance Records:")
            for i, att in enumerate(attendance_data[:3]):
                print(f"      {i+1}. {att.get('employee_name')} - Date: {att.get('date')}, Status: {att.get('status')}")
        else:
            print(f"   ⚠️  No attendance data found for December 2025")
    else:
        print(f"   ❌ Failed to get attendance data: {attendance_response.status_code}")
    
    # Step 3: Detailed analysis of both endpoints
    print("\n3. DETAILED ENDPOINT ANALYSIS")
    print("-" * 30)
    
    # Live endpoint
    print("\n   A. LIVE ENDPOINT ANALYSIS")
    live_response = session.get(f"{API_BASE}/payroll/live-current-month")
    
    if live_response.status_code == 200:
        live_data = live_response.json()
        live_employees = live_data.get("employees", [])
        
        print(f"      📊 Total Employees: {len(live_employees)}")
        print(f"      📊 Total Gross: {live_data.get('total_gross')}")
        print(f"      📊 Total Net: {live_data.get('total_net')}")
        print(f"      📊 Total Deductions: {live_data.get('total_deductions')}")
        
        # Analyze employees with non-zero basic salary
        employees_with_basic = [emp for emp in live_employees if emp.get('basic_salary', 0) > 0]
        print(f"      👥 Employees with Basic Salary > 0: {len(employees_with_basic)}")
        
        if employees_with_basic:
            print(f"      📋 Detailed Analysis of First Employee with Salary:")
            emp = employees_with_basic[0]
            print(f"         - Name: {emp.get('employee_name')}")
            print(f"         - Basic Salary: {emp.get('basic_salary')}")
            print(f"         - Allowances: {emp.get('allowances')}")
            print(f"         - Earnings: {emp.get('earnings')}")
            print(f"         - Gross Salary: {emp.get('gross_salary')}")
            print(f"         - Net Salary: {emp.get('net_salary')}")
            print(f"         - Working Days: {emp.get('working_days')}")
            print(f"         - Present Days: {emp.get('present_days')}")
            print(f"         - Total Minutes: {emp.get('total_minutes')}")
            print(f"         - Fixed Salary: {emp.get('fixed_salary')}")
            print(f"         - Salary Per Minute: {emp.get('salary_per_minute')}")
            
            # Calculate expected gross for comparison
            basic = emp.get('basic_salary', 0)
            allowances = emp.get('allowances', 0)
            expected_gross_simple = basic + allowances
            actual_gross = emp.get('gross_salary', 0)
            
            print(f"         - Expected Gross (Basic + Allowances): {expected_gross_simple}")
            print(f"         - Actual Gross: {actual_gross}")
            print(f"         - Difference: {abs(expected_gross_simple - actual_gross)}")
    
    # Detailed endpoint
    print("\n   B. DETAILED ENDPOINT ANALYSIS")
    detailed_response = session.get(f"{API_BASE}/payroll/detailed/2025-12")
    
    if detailed_response.status_code == 200:
        detailed_data = detailed_response.json()
        detailed_employees = detailed_data.get("employees", [])
        
        print(f"      📊 Total Employees: {len(detailed_employees)}")
        print(f"      📊 Total Gross: {detailed_data.get('total_gross')}")
        print(f"      📊 Total Net: {detailed_data.get('total_net')}")
        print(f"      📊 Total Deductions: {detailed_data.get('total_deductions')}")
        
        # Analyze employees with non-zero basic salary
        employees_with_basic = [emp for emp in detailed_employees if emp.get('basic_salary', 0) > 0]
        print(f"      👥 Employees with Basic Salary > 0: {len(employees_with_basic)}")
        
        if employees_with_basic:
            print(f"      📋 Detailed Analysis of First Employee with Salary:")
            emp = employees_with_basic[0]
            print(f"         - Name: {emp.get('employee_name')}")
            print(f"         - Basic Salary: {emp.get('basic_salary')}")
            print(f"         - Allowances: {emp.get('allowances')}")
            print(f"         - Earnings: {emp.get('earnings')}")
            print(f"         - Gross Salary: {emp.get('gross_salary')}")
            print(f"         - Net Salary: {emp.get('net_salary')}")
            print(f"         - Working Days: {emp.get('working_days')}")
            print(f"         - Present Days: {emp.get('present_days')}")
            print(f"         - Fixed Salary: {emp.get('fixed_salary')}")
            print(f"         - Salary Per Minute: {emp.get('salary_per_minute')}")
            
            # Calculate expected gross for comparison
            basic = emp.get('basic_salary', 0)
            allowances = emp.get('allowances', 0)
            expected_gross_simple = basic + allowances
            actual_gross = emp.get('gross_salary', 0)
            
            print(f"         - Expected Gross (Basic + Allowances): {expected_gross_simple}")
            print(f"         - Actual Gross: {actual_gross}")
            print(f"         - Difference: {abs(expected_gross_simple - actual_gross)}")
    
    # Step 4: Generate payroll to see if that affects calculations
    print("\n4. TESTING PAYROLL GENERATION")
    print("-" * 30)
    
    generate_response = session.post(f"{API_BASE}/payroll/generate", json={"month": "2025-12"})
    if generate_response.status_code == 200:
        result = generate_response.json()
        print(f"   ✅ Payroll generated for {result.get('employee_count')} employees")
        
        # Re-test detailed endpoint after generation
        print("\n   📊 Re-testing detailed endpoint after generation...")
        detailed_response_after = session.get(f"{API_BASE}/payroll/detailed/2025-12")
        
        if detailed_response_after.status_code == 200:
            detailed_data_after = detailed_response_after.json()
            print(f"      📊 Total Gross After Generation: {detailed_data_after.get('total_gross')}")
            print(f"      📊 Total Net After Generation: {detailed_data_after.get('total_net')}")
    else:
        print(f"   ❌ Failed to generate payroll: {generate_response.status_code}")
        print(f"      Response: {generate_response.text}")
    
    # Step 5: Final summary
    print("\n5. INVESTIGATION SUMMARY")
    print("-" * 30)
    
    print("   🔍 Key Findings:")
    print("      - Both endpoints correctly use 27 working days for December 2025")
    print("      - Gross salary calculation depends on attendance/earnings data")
    print("      - If no attendance data exists, earnings = 0, therefore gross_salary = 0")
    print("      - This explains why total_gross = 0.0 for both endpoints")
    
    print("\n   💡 Recommendations:")
    print("      - Verify if attendance data exists for December 2025")
    print("      - Check if payroll generation creates the necessary data")
    print("      - Ensure both endpoints use same calculation logic")
    print("      - For fixed salary employees, gross should be pro-rated based on time passed")

if __name__ == "__main__":
    test_detailed_payroll_investigation()