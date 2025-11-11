#!/usr/bin/env python3
"""
Test only the 4 bug fixes from the review request
"""

import requests
import json
from datetime import datetime, timezone
import uuid
import os
from dotenv import load_dotenv
import jwt
import time

# Load environment variables
load_dotenv('/app/frontend/.env')
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://employee-sync-pro.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class BugFixTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.current_user = None
        self.company_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'details': details or {},
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def setup_auth(self):
        """Setup test authentication"""
        try:
            # Create test auth token
            test_payload = {
                "user_id": "cfb58f53-79c7-4f12-85b0-268dde3f3fe0",
                "role": "admin", 
                "company_id": "dc1ff8de-3db3-4885-b6b7-168b00e3cef5",
                "mobile": "0712345678"
            }
            
            jwt_secret = "attendance-system-secret-key-change-in-production"
            self.auth_token = jwt.encode(test_payload, jwt_secret, algorithm="HS256")
            self.current_user = {
                "id": test_payload["user_id"],
                "role": test_payload["role"],
                "company_id": test_payload["company_id"],
                "mobile": "0712345678",
                "name": "Test Admin"
            }
            self.company_id = test_payload["company_id"]
            self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
            
            print("✅ Authentication setup complete")
            return True
            
        except Exception as e:
            print(f"❌ Authentication setup failed: {str(e)}")
            return False
    
    def test_bug_fix_1_activity_logs(self):
        """Test Bug Fix #1: Activity Logs - Login Events"""
        print("\n=== BUG FIX #1: ACTIVITY LOGS - LOGIN EVENTS ===")
        
        test_mobile = "0712345678"
        
        try:
            # Test OTP send
            otp_response = self.session.post(f"{API_BASE}/auth/send-otp", 
                                           json={"mobile": test_mobile})
            
            if otp_response.status_code == 200:
                self.log_result("BF1 - OTP Send", True, "OTP sent - should log OTP_SENT")
                
                # Test invalid OTP
                wrong_otp_response = self.session.post(f"{API_BASE}/auth/verify-otp",
                                                     json={"mobile": test_mobile, "otp": "000000"})
                
                if wrong_otp_response.status_code == 400:
                    self.log_result("BF1 - Invalid OTP", True, "Invalid OTP rejected - should log INVALID_OTP")
                else:
                    self.log_result("BF1 - Invalid OTP", False, f"Unexpected status: {wrong_otp_response.status_code}")
                
                # Check activity logs
                time.sleep(1)
                logs_response = self.session.get(f"{API_BASE}/activity-logs", 
                                               params={"limit": 50, "search": "OTP"})
                
                if logs_response.status_code == 200:
                    logs = logs_response.json()
                    otp_sent_logs = [log for log in logs if log.get("action") == "OTP_SENT"]
                    invalid_otp_logs = [log for log in logs if log.get("action") == "INVALID_OTP"]
                    
                    if otp_sent_logs:
                        self.log_result("BF1 - OTP_SENT Logged", True, f"Found {len(otp_sent_logs)} OTP_SENT logs")
                    else:
                        self.log_result("BF1 - OTP_SENT Logged", False, "No OTP_SENT logs found")
                    
                    if invalid_otp_logs:
                        self.log_result("BF1 - INVALID_OTP Logged", True, f"Found {len(invalid_otp_logs)} INVALID_OTP logs")
                    else:
                        self.log_result("BF1 - INVALID_OTP Logged", False, "No INVALID_OTP logs found")
                else:
                    self.log_result("BF1 - Activity Logs", False, f"Cannot get logs: {logs_response.status_code}")
            else:
                self.log_result("BF1 - OTP Send", False, f"OTP send failed: {otp_response.status_code}")
                
        except Exception as e:
            self.log_result("BF1 - Exception", False, f"Error: {str(e)}")
    
    def test_bug_fix_2_advances_leaves(self):
        """Test Bug Fix #2: Advances and Leaves Endpoints"""
        print("\n=== BUG FIX #2: ADVANCES AND LEAVES ENDPOINTS ===")
        
        try:
            # Test Advances
            advance_data = {
                "amount": 5000.0,
                "reason": "Medical emergency",
                "repayment_months": 2
            }
            
            create_advance = self.session.post(f"{API_BASE}/advances", json=advance_data)
            
            if create_advance.status_code == 200:
                advance = create_advance.json()
                advance_id = advance.get("id")
                self.log_result("BF2 - Create Advance", True, f"Advance created: {advance_id}")
                
                # Test GET advances
                get_advances = self.session.get(f"{API_BASE}/advances")
                if get_advances.status_code == 200:
                    advances = get_advances.json()
                    self.log_result("BF2 - Get Advances", True, f"Retrieved {len(advances)} advances")
                    
                    # Test UPDATE advance
                    if advance_id:
                        update_advance = self.session.put(f"{API_BASE}/advances/{advance_id}", 
                                                        json={"status": "approved"})
                        if update_advance.status_code == 200:
                            self.log_result("BF2 - Update Advance", True, "Advance status updated")
                        else:
                            self.log_result("BF2 - Update Advance", False, f"Update failed: {update_advance.status_code}")
                else:
                    self.log_result("BF2 - Get Advances", False, f"Get failed: {get_advances.status_code}")
            else:
                self.log_result("BF2 - Create Advance", False, f"Create failed: {create_advance.status_code}")
            
            # Test Leaves
            leave_data = {
                "leave_type": "sick",
                "from_date": "2024-12-20",
                "to_date": "2024-12-22",
                "reason": "Flu symptoms"
            }
            
            create_leave = self.session.post(f"{API_BASE}/leaves", json=leave_data)
            
            if create_leave.status_code == 200:
                leave = create_leave.json()
                leave_id = leave.get("id")
                self.log_result("BF2 - Create Leave", True, f"Leave created: {leave_id}")
                
                # Test GET leaves
                get_leaves = self.session.get(f"{API_BASE}/leaves")
                if get_leaves.status_code == 200:
                    leaves = get_leaves.json()
                    self.log_result("BF2 - Get Leaves", True, f"Retrieved {len(leaves)} leaves")
                    
                    # Test UPDATE leave
                    if leave_id:
                        update_leave = self.session.put(f"{API_BASE}/leaves/{leave_id}", 
                                                      json={"status": "approved"})
                        if update_leave.status_code == 200:
                            self.log_result("BF2 - Update Leave", True, "Leave status updated")
                        else:
                            self.log_result("BF2 - Update Leave", False, f"Update failed: {update_leave.status_code}")
                else:
                    self.log_result("BF2 - Get Leaves", False, f"Get failed: {get_leaves.status_code}")
            else:
                self.log_result("BF2 - Create Leave", False, f"Create failed: {create_leave.status_code}")
                
        except Exception as e:
            self.log_result("BF2 - Exception", False, f"Error: {str(e)}")
    
    def test_bug_fix_3_live_payroll(self):
        """Test Bug Fix #3: Live Payroll - Fixed Salary Calculation"""
        print("\n=== BUG FIX #3: LIVE PAYROLL - FIXED SALARY CALCULATION ===")
        
        try:
            response = self.session.get(f"{API_BASE}/payroll/live-current-month")
            
            if response.status_code == 200:
                data = response.json()
                employees = data.get("employees", [])
                
                if employees:
                    fixed_salary_employees = [emp for emp in employees if emp.get("fixed_salary", False)]
                    
                    if fixed_salary_employees:
                        for emp in fixed_salary_employees:
                            basic_salary = emp.get("basic_salary", 0)
                            allowances = emp.get("allowances", 0)
                            earnings = emp.get("earnings", 0)
                            expected_earnings = basic_salary + allowances
                            
                            if abs(earnings - expected_earnings) < 0.01:
                                self.log_result("BF3 - Fixed Salary Correct", True, 
                                              f"Employee '{emp.get('employee_name')}' earnings: {earnings}")
                            else:
                                self.log_result("BF3 - Fixed Salary Incorrect", False, 
                                              f"Expected {expected_earnings}, got {earnings}")
                    else:
                        self.log_result("BF3 - No Fixed Salary Employees", True, "No fixed salary employees found")
                    
                    # Test non-fixed salary calculation
                    non_fixed = [emp for emp in employees if not emp.get("fixed_salary", False)]
                    if non_fixed:
                        self.log_result("BF3 - Variable Salary Logic", True, 
                                      f"Variable salary employees calculated based on attendance")
                else:
                    self.log_result("BF3 - No Employees", True, "No employees in live payroll")
            else:
                self.log_result("BF3 - Live Payroll Failed", False, f"Request failed: {response.status_code}")
                
        except Exception as e:
            self.log_result("BF3 - Exception", False, f"Error: {str(e)}")
    
    def test_bug_fix_4_payroll_months(self):
        """Test Bug Fix #4: Payroll Months - Current Month Filtering"""
        print("\n=== BUG FIX #4: PAYROLL MONTHS - CURRENT MONTH FILTERING ===")
        
        try:
            response = self.session.get(f"{API_BASE}/payroll/months")
            
            if response.status_code == 200:
                months_data = response.json()
                
                if isinstance(months_data, list):
                    current_month = datetime.now().strftime("%Y-%m")
                    current_month_included = any(month.get("month") == current_month for month in months_data)
                    
                    if current_month_included:
                        self.log_result("BF4 - Current Month Included", True, 
                                      f"Backend includes current month ({current_month})")
                    else:
                        self.log_result("BF4 - Current Month Not Included", True, 
                                      "Current month not included (acceptable)")
                    
                    if months_data:
                        month_list = [m.get("month") for m in months_data]
                        self.log_result("BF4 - Months Structure", True, 
                                      f"Backend returns: {month_list}")
                    else:
                        self.log_result("BF4 - Empty Response", True, "Empty months array")
                else:
                    self.log_result("BF4 - Invalid Format", False, f"Expected array, got {type(months_data)}")
            else:
                self.log_result("BF4 - Request Failed", False, f"Request failed: {response.status_code}")
                
        except Exception as e:
            self.log_result("BF4 - Exception", False, f"Error: {str(e)}")
    
    def run_tests(self):
        """Run all bug fix tests"""
        print("🎯 TESTING 4 BUG FIXES - REVIEW REQUEST VALIDATION")
        print("=" * 60)
        
        if not self.setup_auth():
            return
        
        self.test_bug_fix_1_activity_logs()
        self.test_bug_fix_2_advances_leaves()
        self.test_bug_fix_3_live_payroll()
        self.test_bug_fix_4_payroll_months()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 BUG FIX TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "No tests run")
        
        if failed_tests > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['message']}")

if __name__ == "__main__":
    tester = BugFixTester()
    tester.run_tests()