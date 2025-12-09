#!/usr/bin/env python3
"""
Detailed Payroll Analysis
Investigate why total_gross is 0.00 and check for employees with actual salary data
"""

import requests
import json
import jwt
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://erp-attendance-5.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class DetailedPayrollAnalyzer:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.setup_auth()
        
    def setup_auth(self):
        """Setup authentication using real user credentials"""
        test_payload = {
            "user_id": "cfb58f53-79c7-4f12-85b0-268dde3f3fe0",
            "role": "admin", 
            "company_id": "dc1ff8de-3db3-4885-b6b7-168b00e3cef5",
            "mobile": "0773769019"
        }
        
        jwt_secret = "attendance-system-secret-key-change-in-production"
        self.auth_token = jwt.encode(test_payload, jwt_secret, algorithm="HS256")
        self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
        
    def analyze_payroll_data(self):
        """Detailed analysis of payroll data to understand why totals are 0"""
        print("🔍 === DETAILED PAYROLL DATA ANALYSIS ===\n")
        
        try:
            # Step 1: Get all employees to understand the data
            print("👥 Step 1: Getting all employees...")
            employees_response = self.session.get(f"{API_BASE}/employees")
            
            if employees_response.status_code == 200:
                employees = employees_response.json()
                print(f"   ✅ Found {len(employees)} total employees")
                
                # Analyze employee salary data
                employees_with_salary = [emp for emp in employees if emp.get("basic_salary", 0) > 0]
                employees_with_allowances = [emp for emp in employees if emp.get("allowances", 0) > 0]
                
                print(f"   📊 Employees with basic salary > 0: {len(employees_with_salary)}")
                print(f"   📊 Employees with allowances > 0: {len(employees_with_allowances)}")
                
                if employees_with_salary:
                    print(f"   💰 Sample employees with salary:")
                    for i, emp in enumerate(employees_with_salary[:5]):
                        print(f"      {i+1}. {emp.get('name')} - Basic: LKR {emp.get('basic_salary', 0):,.2f}, Allowances: LKR {emp.get('allowances', 0):,.2f}")
            else:
                print(f"   ❌ Failed to get employees: {employees_response.status_code}")
                return
            
            # Step 2: Check attendance data for December 2025
            print(f"\n📅 Step 2: Checking attendance data for December 2025...")
            attendance_response = self.session.get(f"{API_BASE}/attendance", 
                                                 params={"from_date": "2025-12-01", "to_date": "2025-12-31"})
            
            if attendance_response.status_code == 200:
                attendance_records = attendance_response.json()
                print(f"   ✅ Found {len(attendance_records)} attendance records in December 2025")
                
                if attendance_records:
                    # Group by employee
                    employee_attendance = {}
                    for record in attendance_records:
                        emp_id = record.get('employee_id')
                        emp_name = record.get('employee_name', 'Unknown')
                        if emp_id not in employee_attendance:
                            employee_attendance[emp_id] = {'name': emp_name, 'days': 0}
                        employee_attendance[emp_id]['days'] += 1
                    
                    print(f"   📊 Attendance breakdown:")
                    for emp_id, data in employee_attendance.items():
                        print(f"      - {data['name']}: {data['days']} days")
            else:
                print(f"   ❌ Failed to get attendance: {attendance_response.status_code}")
            
            # Step 3: Analyze Live Payroll endpoint in detail
            print(f"\n📊 Step 3: Detailed Live Payroll Analysis...")
            live_response = self.session.get(f"{API_BASE}/payroll/live-current-month")
            
            if live_response.status_code == 200:
                live_data = live_response.json()
                live_employees = live_data.get("employees", [])
                
                print(f"   ✅ Live Payroll Response:")
                print(f"      - Total Employees: {len(live_employees)}")
                print(f"      - Total Gross: LKR {live_data.get('total_gross', 0):,.2f}")
                print(f"      - Total Net: LKR {live_data.get('total_net', 0):,.2f}")
                print(f"      - Month: {live_data.get('month')}")
                
                # Analyze why gross is 0
                employees_with_gross = [emp for emp in live_employees if emp.get("gross_salary", 0) > 0]
                employees_with_earnings = [emp for emp in live_employees if emp.get("earnings", 0) > 0]
                employees_with_basic = [emp for emp in live_employees if emp.get("basic_salary", 0) > 0]
                
                print(f"   📊 Live Payroll Breakdown:")
                print(f"      - Employees with gross_salary > 0: {len(employees_with_gross)}")
                print(f"      - Employees with earnings > 0: {len(employees_with_earnings)}")
                print(f"      - Employees with basic_salary > 0: {len(employees_with_basic)}")
                
                if employees_with_basic:
                    print(f"   💰 Sample employees with basic salary in live payroll:")
                    for i, emp in enumerate(employees_with_basic[:3]):
                        print(f"      {i+1}. {emp.get('employee_name')} - Basic: LKR {emp.get('basic_salary', 0):,.2f}")
                        print(f"         Earnings: LKR {emp.get('earnings', 0):,.2f}, Gross: LKR {emp.get('gross_salary', 0):,.2f}")
                        print(f"         Attendance Minutes: {emp.get('total_attendance_minutes', 0)}")
                        print(f"         Fixed Salary: {emp.get('fixed_salary', False)}")
                        print(f"         Salary per Minute: LKR {emp.get('salary_per_minute', 0):.4f}")
            else:
                print(f"   ❌ Failed to get live payroll: {live_response.status_code}")
            
            # Step 4: Analyze Monthly Payroll endpoint in detail
            print(f"\n📊 Step 4: Detailed Monthly Payroll Analysis...")
            detailed_response = self.session.get(f"{API_BASE}/payroll/detailed/2025-12")
            
            if detailed_response.status_code == 200:
                detailed_data = detailed_response.json()
                detailed_employees = detailed_data.get("employees", [])
                
                print(f"   ✅ Monthly Payroll Response:")
                print(f"      - Total Employees: {len(detailed_employees)}")
                print(f"      - Total Gross: LKR {detailed_data.get('total_gross', 0):,.2f}")
                print(f"      - Total Net: LKR {detailed_data.get('total_net', 0):,.2f}")
                print(f"      - Month: {detailed_data.get('month')}")
                
                # Analyze why gross is 0
                employees_with_gross = [emp for emp in detailed_employees if emp.get("gross_salary", 0) > 0]
                employees_with_earnings = [emp for emp in detailed_employees if emp.get("earnings", 0) > 0]
                employees_with_basic = [emp for emp in detailed_employees if emp.get("basic_salary", 0) > 0]
                
                print(f"   📊 Monthly Payroll Breakdown:")
                print(f"      - Employees with gross_salary > 0: {len(employees_with_gross)}")
                print(f"      - Employees with earnings > 0: {len(employees_with_earnings)}")
                print(f"      - Employees with basic_salary > 0: {len(employees_with_basic)}")
                
                if employees_with_basic:
                    print(f"   💰 Sample employees with basic salary in monthly payroll:")
                    for i, emp in enumerate(employees_with_basic[:3]):
                        print(f"      {i+1}. {emp.get('employee_name')} - Basic: LKR {emp.get('basic_salary', 0):,.2f}")
                        print(f"         Earnings: LKR {emp.get('earnings', 0):,.2f}, Gross: LKR {emp.get('gross_salary', 0):,.2f}")
                        print(f"         Present Days: {emp.get('present_days', 0)}, Working Days: {emp.get('working_days', 0)}")
                        print(f"         Fixed Salary: {emp.get('fixed_salary', False)}")
                        print(f"         Salary per Minute: LKR {emp.get('salary_per_minute', 0):.4f}")
            else:
                print(f"   ❌ Failed to get monthly payroll: {detailed_response.status_code}")
            
            # Step 5: Check if payroll has been generated for December 2025
            print(f"\n🔧 Step 5: Checking if payroll needs to be generated...")
            
            # Try to generate payroll for December 2025
            generate_response = self.session.post(f"{API_BASE}/payroll/generate", 
                                                json={"month": "2025-12"})
            
            if generate_response.status_code == 200:
                result = generate_response.json()
                print(f"   ✅ Payroll generation result: {result.get('message')}")
                print(f"   📊 Employees processed: {result.get('employee_count', 0)}")
                
                # Re-check the endpoints after generation
                print(f"\n🔄 Re-checking endpoints after payroll generation...")
                
                # Re-check live endpoint
                live_response2 = self.session.get(f"{API_BASE}/payroll/live-current-month")
                if live_response2.status_code == 200:
                    live_data2 = live_response2.json()
                    print(f"   📊 Live Payroll (after generation): LKR {live_data2.get('total_gross', 0):,.2f}")
                
                # Re-check detailed endpoint
                detailed_response2 = self.session.get(f"{API_BASE}/payroll/detailed/2025-12")
                if detailed_response2.status_code == 200:
                    detailed_data2 = detailed_response2.json()
                    print(f"   📊 Monthly Payroll (after generation): LKR {detailed_data2.get('total_gross', 0):,.2f}")
                    
                    # Final comparison
                    new_difference = live_data2.get('total_gross', 0) - detailed_data2.get('total_gross', 0)
                    print(f"   🔍 New Difference: LKR {new_difference:,.2f}")
                    
                    if abs(new_difference) > 0.01:
                        print(f"   ❌ DISCREPANCY FOUND AFTER GENERATION!")
                        print(f"      Dashboard: LKR {live_data2.get('total_gross', 0):,.2f}")
                        print(f"      Monthly: LKR {detailed_data2.get('total_gross', 0):,.2f}")
                        print(f"      Difference: LKR {new_difference:,.2f}")
                    else:
                        print(f"   ✅ No discrepancy after payroll generation")
            else:
                print(f"   ⚠️  Payroll generation response: {generate_response.status_code}")
                print(f"   Response: {generate_response.text}")
                
        except Exception as e:
            print(f"❌ Analysis error: {str(e)}")

def main():
    """Run the detailed payroll analysis"""
    print("🔍 DETAILED PAYROLL DATA ANALYSIS")
    print("=" * 50)
    
    analyzer = DetailedPayrollAnalyzer()
    analyzer.analyze_payroll_data()

if __name__ == "__main__":
    main()