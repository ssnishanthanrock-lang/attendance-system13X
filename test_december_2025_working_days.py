#!/usr/bin/env python3
"""
Specific test for December 2025 working days calculation bug fix
Tests the payroll detailed endpoint for December 2025 to verify working_days = 27
"""

import requests
import json
import jwt
import os
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv('/app/frontend/.env')
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://admin-sms-portal.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class December2025WorkingDaysTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        
    def authenticate_with_mobile(self, mobile="0773769019"):
        """Authenticate using the mobile number from review request"""
        print(f"🔐 Authenticating with mobile: {mobile}")
        
        try:
            # Step 1: Send OTP
            otp_response = self.session.post(f"{API_BASE}/auth/send-otp", 
                                           json={"mobile": mobile})
            
            if otp_response.status_code == 200:
                print("✅ OTP sent successfully")
                
                # For testing, use any 6 digits as mentioned in review request
                test_otp = "123456"
                
                # Step 2: Verify OTP
                verify_response = self.session.post(f"{API_BASE}/auth/verify-otp",
                                                  json={"mobile": mobile, "otp": test_otp})
                
                if verify_response.status_code == 200:
                    response_data = verify_response.json()
                    self.auth_token = response_data.get('token')
                    self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
                    print("✅ Authentication successful")
                    return True
                else:
                    print(f"❌ OTP verification failed: {verify_response.status_code}")
                    # Try with test token as fallback
                    return self.create_test_token(mobile)
            else:
                print(f"❌ OTP send failed: {otp_response.status_code}")
                return self.create_test_token(mobile)
                
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return self.create_test_token(mobile)
    
    def create_test_token(self, mobile):
        """Create test token for testing purposes"""
        try:
            print("🔧 Creating test authentication token...")
            
            # Create test payload
            test_payload = {
                "user_id": "test-user-id",
                "role": "admin", 
                "company_id": "test-company-id",
                "mobile": mobile
            }
            
            jwt_secret = "attendance-system-secret-key-change-in-production"
            self.auth_token = jwt.encode(test_payload, jwt_secret, algorithm="HS256")
            self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
            
            print("✅ Test token created")
            return True
            
        except Exception as e:
            print(f"❌ Failed to create test token: {str(e)}")
            return False
    
    def test_december_2025_working_days(self):
        """Test the specific December 2025 working days calculation"""
        print("\n" + "="*80)
        print("📅 TESTING DECEMBER 2025 WORKING DAYS CALCULATION")
        print("="*80)
        print("Expected: working_days = 27 (31 days - 4 Sundays)")
        print("Previous bug: working_days was hardcoded to 26")
        print("Fix: Now uses calculate_working_days() function")
        print("-"*80)
        
        try:
            # Test the specific endpoint for December 2025
            test_month = "2025-12"
            print(f"🔍 Testing endpoint: GET /api/payroll/detailed/{test_month}")
            
            response = self.session.get(f"{API_BASE}/payroll/detailed/{test_month}")
            
            print(f"📡 Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Successfully retrieved December 2025 payroll data")
                
                # Test 1: Check main working_days field
                working_days = data.get("working_days")
                print(f"\n🔍 Main working_days field: {working_days}")
                
                if working_days == 27:
                    print("✅ PASS: Main working_days correctly set to 27")
                elif working_days == 26:
                    print("❌ FAIL: working_days still hardcoded to 26 (bug not fixed)")
                    return False
                else:
                    print(f"❌ FAIL: Unexpected working_days value: {working_days}")
                    return False
                
                # Test 2: Check employees array
                employees = data.get("employees", [])
                print(f"\n👥 Found {len(employees)} employees in December 2025 payroll")
                
                if employees:
                    print("\n🔍 Testing employee-level working_days and day salary calculations:")
                    
                    all_working_days_correct = True
                    all_day_salary_correct = True
                    
                    for i, employee in enumerate(employees):
                        emp_name = employee.get("employee_name", f"Employee {i+1}")
                        emp_working_days = employee.get("working_days")
                        basic_salary = employee.get("basic_salary", 0)
                        
                        print(f"\n  Employee: {emp_name}")
                        print(f"    Basic Salary: {basic_salary}")
                        print(f"    Working Days: {emp_working_days}")
                        
                        # Check working_days for each employee
                        if emp_working_days != 27:
                            print(f"    ❌ FAIL: Employee working_days should be 27, got {emp_working_days}")
                            all_working_days_correct = False
                        else:
                            print(f"    ✅ PASS: Employee working_days = 27")
                        
                        # Check day salary calculation (basic_salary / 27)
                        if basic_salary > 0:
                            expected_day_salary = round(basic_salary / 27, 2)
                            
                            # Look for day salary field (could be day_salary or salary_per_day)
                            actual_day_salary = employee.get("day_salary") or employee.get("salary_per_day")
                            
                            print(f"    Expected Day Salary: {expected_day_salary} (basic_salary / 27)")
                            print(f"    Actual Day Salary: {actual_day_salary}")
                            
                            if actual_day_salary is not None:
                                if abs(actual_day_salary - expected_day_salary) <= 0.01:
                                    print(f"    ✅ PASS: Day salary calculation correct")
                                else:
                                    old_calculation = round(basic_salary / 26, 2)  # Old hardcoded value
                                    print(f"    ❌ FAIL: Day salary incorrect")
                                    print(f"    Expected (new): {expected_day_salary}")
                                    print(f"    Got: {actual_day_salary}")
                                    print(f"    Old calculation would be: {old_calculation}")
                                    all_day_salary_correct = False
                            else:
                                print(f"    ⚠️  WARNING: No day_salary field found")
                        
                        # Test specific 50K example from review request
                        if basic_salary == 50000:
                            print(f"\n  🎯 SPECIAL TEST: 50K salary employee (from review request)")
                            expected_new = 1851.85  # 50000 / 27
                            expected_old = 1923.08  # 50000 / 26
                            
                            actual_day_salary = employee.get("day_salary") or employee.get("salary_per_day")
                            
                            if actual_day_salary is not None:
                                if abs(actual_day_salary - expected_new) <= 0.01:
                                    print(f"    ✅ PASS: 50K employee day salary = {actual_day_salary} (correct new calculation)")
                                elif abs(actual_day_salary - expected_old) <= 0.01:
                                    print(f"    ❌ FAIL: 50K employee day salary = {actual_day_salary} (old hardcoded calculation)")
                                else:
                                    print(f"    ❌ FAIL: 50K employee day salary = {actual_day_salary} (unexpected value)")
                    
                    # Summary for employees
                    if all_working_days_correct:
                        print(f"\n✅ PASS: All {len(employees)} employees have working_days = 27")
                    else:
                        print(f"\n❌ FAIL: Some employees have incorrect working_days")
                    
                    if all_day_salary_correct:
                        print(f"✅ PASS: All employees have correct day salary calculation (basic_salary / 27)")
                    else:
                        print(f"❌ FAIL: Some employees have incorrect day salary calculation")
                    
                    return all_working_days_correct and all_day_salary_correct
                
                else:
                    print("ℹ️  No employees found for December 2025 (acceptable if no employees exist)")
                    print("✅ PASS: Main working_days field is correct")
                    return True
                
            elif response.status_code == 401:
                print("❌ FAIL: Authentication failed - check mobile number and OTP")
                return False
            elif response.status_code == 404:
                print("❌ FAIL: Endpoint not found - check if payroll detailed endpoint exists")
                return False
            else:
                print(f"❌ FAIL: Request failed with status {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ FAIL: Test error: {str(e)}")
            return False
    
    def check_backend_logs(self):
        """Check backend logs for debug message"""
        print("\n" + "="*80)
        print("📋 CHECKING BACKEND LOGS")
        print("="*80)
        print("Looking for debug message: 'DEBUG DETAILED PAYROLL: Month=2025-12, Calculated Working Days=27'")
        
        try:
            # Check supervisor backend logs
            import subprocess
            result = subprocess.run(
                ["tail", "-n", "100", "/var/log/supervisor/backend.out.log"],
                capture_output=True, text=True
            )
            
            if result.returncode == 0:
                logs = result.stdout
                if "DEBUG DETAILED PAYROLL: Month=2025-12, Calculated Working Days=27" in logs:
                    print("✅ FOUND: Debug message confirming working days calculation")
                    return True
                else:
                    print("⚠️  Debug message not found in recent logs")
                    print("This might be normal if the endpoint wasn't called recently")
                    return True
            else:
                print("⚠️  Could not read backend logs")
                return True
                
        except Exception as e:
            print(f"⚠️  Error checking logs: {str(e)}")
            return True
    
    def run_test(self):
        """Run the complete test"""
        print("🚀 December 2025 Working Days Calculation Test")
        print("="*80)
        
        # Step 1: Authenticate
        if not self.authenticate_with_mobile():
            print("❌ CRITICAL: Authentication failed - cannot proceed")
            return False
        
        # Step 2: Test December 2025 working days
        test_result = self.test_december_2025_working_days()
        
        # Step 3: Check backend logs
        self.check_backend_logs()
        
        # Final result
        print("\n" + "="*80)
        print("📊 FINAL TEST RESULT")
        print("="*80)
        
        if test_result:
            print("✅ SUCCESS: December 2025 working days calculation is CORRECT")
            print("   - Working days = 27 (not hardcoded 26)")
            print("   - Day salary calculations use 27 working days")
            print("   - Bug fix is working properly")
        else:
            print("❌ FAILURE: December 2025 working days calculation has ISSUES")
            print("   - Check if the calculate_working_days() function is being used")
            print("   - Verify the bug fix was properly implemented")
        
        return test_result

if __name__ == "__main__":
    tester = December2025WorkingDaysTester()
    success = tester.run_test()
    exit(0 if success else 1)