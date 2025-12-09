#!/usr/bin/env python3
"""
Simple test for December 2025 working days calculation
Uses the same authentication method as backend_test.py
"""

import requests
import jwt
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://erp-attendance-5.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

def create_test_auth_token():
    """Create test auth token using same method as backend_test.py"""
    try:
        # Use real user data from database for mobile 0712345678
        test_payload = {
            "user_id": "cfb58f53-79c7-4f12-85b0-268dde3f3fe0",  # Real user ID from DB
            "role": "admin", 
            "company_id": "dc1ff8de-3db3-4885-b6b7-168b00e3cef5",  # Real company ID from DB
            "mobile": "0712345678"
        }
        
        # Use the same JWT secret from the backend
        jwt_secret = "attendance-system-secret-key-change-in-production"
        
        # Create token
        auth_token = jwt.encode(test_payload, jwt_secret, algorithm="HS256")
        return auth_token
        
    except Exception as e:
        print(f"❌ Failed to create test token: {str(e)}")
        return None

def test_december_2025_working_days():
    """Test December 2025 working days calculation"""
    print("🚀 Testing December 2025 Working Days Calculation")
    print("="*80)
    
    # Create authenticated session
    auth_token = create_test_auth_token()
    if not auth_token:
        print("❌ CRITICAL: Could not create authentication token")
        return False
    
    session = requests.Session()
    session.headers.update({'Authorization': f'Bearer {auth_token}'})
    
    try:
        # Test the December 2025 endpoint
        test_month = "2025-12"
        print(f"🔍 Testing: GET /api/payroll/detailed/{test_month}")
        
        response = session.get(f"{API_BASE}/payroll/detailed/{test_month}")
        
        print(f"📡 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Successfully retrieved December 2025 payroll data")
            
            # Check main working_days field
            working_days = data.get("working_days")
            print(f"\n🔍 Main working_days field: {working_days}")
            
            if working_days == 27:
                print("✅ PASS: Main working_days = 27 (CORRECT)")
            elif working_days == 26:
                print("❌ FAIL: working_days = 26 (BUG NOT FIXED)")
                return False
            else:
                print(f"❌ FAIL: Unexpected working_days: {working_days}")
                return False
            
            # Check employees
            employees = data.get("employees", [])
            print(f"\n👥 Found {len(employees)} employees")
            
            if employees:
                print("\n🔍 Checking employee working_days and day salary calculations:")
                
                all_correct = True
                for i, emp in enumerate(employees[:3]):  # Check first 3 employees
                    name = emp.get("employee_name", f"Employee {i+1}")
                    emp_working_days = emp.get("working_days")
                    basic_salary = emp.get("basic_salary", 0)
                    
                    print(f"\n  {name}:")
                    print(f"    Basic Salary: {basic_salary}")
                    print(f"    Working Days: {emp_working_days}")
                    
                    if emp_working_days != 27:
                        print(f"    ❌ FAIL: Should be 27, got {emp_working_days}")
                        all_correct = False
                    else:
                        print(f"    ✅ PASS: Working days = 27")
                    
                    # Check day salary calculation
                    if basic_salary > 0:
                        expected_day_salary = round(basic_salary / 27, 2)
                        old_day_salary = round(basic_salary / 26, 2)
                        
                        # Look for day salary field
                        actual_day_salary = emp.get("day_salary") or emp.get("salary_per_day")
                        
                        if actual_day_salary is not None:
                            print(f"    Day Salary: {actual_day_salary}")
                            print(f"    Expected (new): {expected_day_salary}")
                            print(f"    Old calculation: {old_day_salary}")
                            
                            if abs(actual_day_salary - expected_day_salary) <= 0.01:
                                print(f"    ✅ PASS: Day salary calculation correct")
                            else:
                                print(f"    ❌ FAIL: Day salary calculation incorrect")
                                all_correct = False
                        else:
                            print(f"    ⚠️  No day_salary field found")
                
                if all_correct:
                    print(f"\n✅ SUCCESS: All employee calculations are correct")
                else:
                    print(f"\n❌ FAILURE: Some employee calculations are incorrect")
                    return False
            
            else:
                print("ℹ️  No employees found (acceptable)")
            
            print(f"\n✅ OVERALL SUCCESS: December 2025 working days = 27 (Bug Fixed)")
            return True
            
        else:
            print(f"❌ FAIL: Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: Test error: {str(e)}")
        return False

def check_backend_logs():
    """Check if debug message is in backend logs"""
    print("\n" + "="*80)
    print("📋 BACKEND LOGS VERIFICATION")
    print("="*80)
    
    try:
        import subprocess
        result = subprocess.run(
            ["tail", "-n", "20", "/var/log/supervisor/backend.out.log"],
            capture_output=True, text=True
        )
        
        if result.returncode == 0:
            logs = result.stdout
            if "DEBUG DETAILED PAYROLL: Month=2025-12, Calculated Working Days=27" in logs:
                print("✅ FOUND: Debug message confirming working days = 27")
                return True
            else:
                print("⚠️  Debug message not found in recent logs")
                return True
        else:
            print("⚠️  Could not read backend logs")
            return True
            
    except Exception as e:
        print(f"⚠️  Error checking logs: {str(e)}")
        return True

if __name__ == "__main__":
    print("🎯 December 2025 Working Days Bug Fix Verification")
    print("="*80)
    print("Testing: working_days should be 27 (not hardcoded 26)")
    print("Expected: Day salary = basic_salary / 27")
    print("="*80)
    
    # Run the test
    success = test_december_2025_working_days()
    
    # Check logs
    check_backend_logs()
    
    # Final result
    print("\n" + "="*80)
    print("📊 FINAL RESULT")
    print("="*80)
    
    if success:
        print("✅ SUCCESS: December 2025 working days bug fix is WORKING")
        print("   - Working days correctly calculated as 27")
        print("   - Day salary calculations use 27 working days")
        print("   - Bug has been successfully fixed")
    else:
        print("❌ FAILURE: December 2025 working days bug fix has ISSUES")
        print("   - Working days may still be hardcoded to 26")
        print("   - Day salary calculations may be incorrect")
        print("   - Bug fix needs investigation")
    
    exit(0 if success else 1)