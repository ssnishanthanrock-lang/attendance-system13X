#!/usr/bin/env python3
"""
Payroll Discrepancy Investigation Test
Focused test for comparing Dashboard vs Monthly Payroll total_gross values
"""

import requests
import json
import jwt
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://admin-sms-portal.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class PayrollInvestigator:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.setup_auth()
        
    def setup_auth(self):
        """Setup authentication using real user credentials"""
        # Use real user data from database (mobile: 0773769019 as requested)
        test_payload = {
            "user_id": "cfb58f53-79c7-4f12-85b0-268dde3f3fe0",  # Real user ID from DB
            "role": "admin", 
            "company_id": "dc1ff8de-3db3-4885-b6b7-168b00e3cef5",  # Real company ID from DB
            "mobile": "0773769019"
        }
        
        # Use the same JWT secret from the backend
        jwt_secret = "attendance-system-secret-key-change-in-production"
        
        # Create token
        self.auth_token = jwt.encode(test_payload, jwt_secret, algorithm="HS256")
        self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
        
        print(f"✅ Authentication setup complete for user: {test_payload['mobile']}")
    
    def investigate_payroll_discrepancy(self):
        """
        DETAILED PAYROLL DISCREPANCY INVESTIGATION
        
        Compare ACTUAL total_gross values between Dashboard and Monthly Payroll with REAL working data.
        """
        print("\n🔍 === PAYROLL DISCREPANCY INVESTIGATION ===")
        print("User reports: Dashboard shows DIFFERENT total_gross than Monthly Payroll view")
        print("User believes: Monthly Payroll is correct")
        print("Investigation: Compare both endpoints with REAL data\n")
        
        try:
            # Step 1: Check for employees with actual attendance in December 2025
            print("📋 Step 1: Checking for employees with actual attendance in December 2025...")
            
            attendance_response = self.session.get(f"{API_BASE}/attendance", 
                                                 params={"from_date": "2025-12-01", "to_date": "2025-12-31"})
            
            if attendance_response.status_code == 200:
                attendance_records = attendance_response.json()
                december_attendance_count = len(attendance_records)
                
                if december_attendance_count > 0:
                    employees_with_attendance = set(record.get('employee_id') for record in attendance_records)
                    employee_names = set(record.get('employee_name', 'Unknown') for record in attendance_records)
                    
                    print(f"   ✅ Found {december_attendance_count} attendance records for {len(employees_with_attendance)} employees")
                    print(f"   📋 Employees with attendance: {', '.join(list(employee_names)[:5])}")
                else:
                    print("   ⚠️  No attendance records found for December 2025")
            else:
                print(f"   ❌ Failed to check attendance: {attendance_response.status_code}")
            
            # Step 2: Call Dashboard Live Payroll endpoint
            print("\n📊 Step 2: Getting Dashboard Live Payroll data...")
            live_response = self.session.get(f"{API_BASE}/payroll/live-current-month")
            
            if live_response.status_code != 200:
                print(f"   ❌ Live payroll endpoint failed: {live_response.status_code}")
                print(f"   Response: {live_response.text}")
                return
            
            live_data = live_response.json()
            live_total_gross = live_data.get("total_gross", 0)
            live_employees = live_data.get("employees", [])
            live_employee_count = len(live_employees)
            
            # Get sample employee data
            live_sample_employee = None
            live_working_days = None
            if live_employees:
                for emp in live_employees:
                    if emp.get("basic_salary", 0) > 0:
                        live_sample_employee = emp
                        live_working_days = emp.get("working_days")
                        break
            
            print(f"   ✅ Dashboard Live Payroll Results:")
            print(f"      - Total Gross: LKR {live_total_gross:,.2f}")
            print(f"      - Employee Count: {live_employee_count}")
            print(f"      - Working Days: {live_working_days}")
            if live_sample_employee:
                print(f"      - Sample Employee: {live_sample_employee.get('employee_name')}")
                print(f"        • Basic Salary: LKR {live_sample_employee.get('basic_salary', 0):,.2f}")
                print(f"        • Earnings: LKR {live_sample_employee.get('earnings', 0):,.2f}")
                print(f"        • Gross Salary: LKR {live_sample_employee.get('gross_salary', 0):,.2f}")
                print(f"        • Salary per Minute: LKR {live_sample_employee.get('salary_per_minute', 0):.4f}")
            
            # Step 3: Call Monthly Payroll detailed endpoint for December 2025
            print("\n📊 Step 3: Getting Monthly Payroll detailed data for December 2025...")
            detailed_response = self.session.get(f"{API_BASE}/payroll/detailed/2025-12")
            
            if detailed_response.status_code != 200:
                print(f"   ❌ Detailed payroll endpoint failed: {detailed_response.status_code}")
                print(f"   Response: {detailed_response.text}")
                return
            
            detailed_data = detailed_response.json()
            detailed_total_gross = detailed_data.get("total_gross", 0)
            detailed_employees = detailed_data.get("employees", [])
            detailed_employee_count = len(detailed_employees)
            
            # Get sample employee data (try to match the same employee)
            detailed_sample_employee = None
            detailed_working_days = None
            if detailed_employees:
                # Try to find the same employee as in live data
                if live_sample_employee:
                    live_employee_id = live_sample_employee.get("employee_id")
                    for emp in detailed_employees:
                        if emp.get("employee_id") == live_employee_id:
                            detailed_sample_employee = emp
                            detailed_working_days = emp.get("working_days")
                            break
                
                # If not found, use first employee with salary
                if not detailed_sample_employee:
                    for emp in detailed_employees:
                        if emp.get("basic_salary", 0) > 0:
                            detailed_sample_employee = emp
                            detailed_working_days = emp.get("working_days")
                            break
            
            print(f"   ✅ Monthly Payroll Detailed Results:")
            print(f"      - Total Gross: LKR {detailed_total_gross:,.2f}")
            print(f"      - Employee Count: {detailed_employee_count}")
            print(f"      - Working Days: {detailed_working_days}")
            if detailed_sample_employee:
                print(f"      - Sample Employee: {detailed_sample_employee.get('employee_name')}")
                print(f"        • Basic Salary: LKR {detailed_sample_employee.get('basic_salary', 0):,.2f}")
                print(f"        • Earnings: LKR {detailed_sample_employee.get('earnings', 0):,.2f}")
                print(f"        • Gross Salary: LKR {detailed_sample_employee.get('gross_salary', 0):,.2f}")
                print(f"        • Salary per Minute: LKR {detailed_sample_employee.get('salary_per_minute', 0):.4f}")
            
            # Step 4: Calculate exact difference and analyze
            print("\n🔍 Step 4: Calculating exact difference and analyzing...")
            
            difference_lkr = live_total_gross - detailed_total_gross
            difference_percentage = (difference_lkr / detailed_total_gross * 100) if detailed_total_gross > 0 else 0
            
            print(f"   📊 COMPARISON RESULTS:")
            print(f"      - Dashboard Total Gross: LKR {live_total_gross:,.2f}")
            print(f"      - Monthly Payroll Total Gross: LKR {detailed_total_gross:,.2f}")
            print(f"      - Exact Difference: LKR {difference_lkr:,.2f}")
            print(f"      - Percentage Difference: {difference_percentage:.2f}%")
            
            if difference_lkr > 0:
                print(f"      - Dashboard is LKR {difference_lkr:,.2f} HIGHER")
            elif difference_lkr < 0:
                print(f"      - Monthly Payroll is LKR {abs(difference_lkr):,.2f} HIGHER")
            else:
                print(f"      - ✅ PERFECT MATCH - No difference found!")
            
            # Step 5: Deep dive into specific employee comparison
            if live_sample_employee and detailed_sample_employee:
                print(f"\n🔍 Step 5: Deep dive into employee comparison...")
                
                employee_name = live_sample_employee.get("employee_name", "Unknown")
                print(f"   📋 Comparing employee: {employee_name}")
                
                # Compare all critical fields
                comparison_fields = [
                    ("basic_salary", "Basic Salary"),
                    ("earnings", "Earnings"),
                    ("allowances", "Allowances"),
                    ("gross_salary", "Gross Salary"),
                    ("salary_per_minute", "Salary per Minute"),
                    ("total_attendance_minutes", "Total Attendance Minutes"),
                    ("working_days", "Working Days")
                ]
                
                field_differences = []
                for field, label in comparison_fields:
                    live_value = live_sample_employee.get(field, 0)
                    detailed_value = detailed_sample_employee.get(field, 0)
                    
                    if abs(live_value - detailed_value) > 0.01:  # Significant difference
                        field_differences.append({
                            "field": label,
                            "live": live_value,
                            "detailed": detailed_value,
                            "difference": live_value - detailed_value
                        })
                        print(f"      ❌ {label}: Live={live_value}, Detailed={detailed_value}, Diff={live_value - detailed_value}")
                    else:
                        print(f"      ✅ {label}: {live_value} (matches)")
                
                if not field_differences:
                    print(f"      ✅ All fields match for employee {employee_name}")
            
            # Step 6: Identify root causes
            print(f"\n🎯 Step 6: Root Cause Analysis...")
            
            root_causes = []
            
            # Check working days consistency
            if live_working_days != detailed_working_days:
                root_causes.append(f"Working days differ: Live={live_working_days}, Detailed={detailed_working_days}")
            
            # Check employee count consistency
            if live_employee_count != detailed_employee_count:
                root_causes.append(f"Employee counts differ: Live={live_employee_count}, Detailed={detailed_employee_count}")
            
            # Check for calculation method differences
            if live_sample_employee and detailed_sample_employee:
                live_earnings = live_sample_employee.get("earnings", 0)
                detailed_earnings = detailed_sample_employee.get("earnings", 0)
                
                if abs(live_earnings - detailed_earnings) > 0.01:
                    root_causes.append("Earnings calculation differs between endpoints")
                
                # Check if live includes extra payments
                live_extra = live_sample_employee.get("extra_payment", 0)
                if live_extra > 0:
                    root_causes.append("Live endpoint may include extra_payments not in detailed")
            
            # Check for timing issues
            live_timestamp = live_data.get("timestamp", "")
            if "live" in live_timestamp.lower() or datetime.now().strftime("%Y-%m-%d") in live_timestamp:
                root_causes.append("Timing issue: Live endpoint calculates real-time vs historical data")
            
            if not root_causes:
                root_causes.append("No obvious differences found - may be calculation rounding")
            
            print(f"   🔍 Identified Root Causes:")
            for i, cause in enumerate(root_causes, 1):
                print(f"      {i}. {cause}")
            
            # Step 7: Final recommendation
            print(f"\n📋 Step 7: Final Recommendation...")
            
            if abs(difference_lkr) < 0.01:
                status = "✅ NO DISCREPANCY"
                recommendation = "Both endpoints return identical values. No action needed."
            elif abs(difference_lkr) < 100:
                status = "⚠️  MINOR DISCREPANCY"
                recommendation = f"Small difference of LKR {abs(difference_lkr):,.2f}. Likely due to rounding or timing. Monitor but no immediate action needed."
            else:
                status = "❌ SIGNIFICANT DISCREPANCY"
                recommendation = f"Large difference of LKR {abs(difference_lkr):,.2f}. Requires investigation: {', '.join(root_causes[:2])}"
            
            print(f"   {status}")
            print(f"   💡 Recommendation: {recommendation}")
            print(f"   📝 User Belief: Monthly Payroll is correct")
            
            if abs(difference_lkr) > 0.01:
                higher_endpoint = "Dashboard Live" if difference_lkr > 0 else "Monthly Payroll"
                print(f"   📊 Which is higher: {higher_endpoint} by LKR {abs(difference_lkr):,.2f}")
            
            return {
                "dashboard_total": live_total_gross,
                "monthly_total": detailed_total_gross,
                "difference": difference_lkr,
                "percentage_diff": difference_percentage,
                "root_causes": root_causes,
                "recommendation": recommendation,
                "status": status
            }
                
        except Exception as e:
            print(f"❌ Investigation error: {str(e)}")
            return None

def main():
    """Run the payroll discrepancy investigation"""
    print("🔍 PAYROLL DISCREPANCY INVESTIGATION")
    print("=" * 50)
    
    investigator = PayrollInvestigator()
    result = investigator.investigate_payroll_discrepancy()
    
    if result:
        print("\n" + "=" * 50)
        print("📋 INVESTIGATION SUMMARY")
        print("=" * 50)
        print(f"Dashboard Total Gross: LKR {result['dashboard_total']:,.2f}")
        print(f"Monthly Payroll Total Gross: LKR {result['monthly_total']:,.2f}")
        print(f"Difference: LKR {result['difference']:,.2f} ({result['percentage_diff']:.2f}%)")
        print(f"Status: {result['status']}")
        print(f"Recommendation: {result['recommendation']}")
    else:
        print("\n❌ Investigation failed - check logs above")

if __name__ == "__main__":
    main()