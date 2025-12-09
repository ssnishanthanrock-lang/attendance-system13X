#!/usr/bin/env python3
"""
Payroll Discrepancy Investigation Test
Deep investigation of the 11,000 LKR discrepancy between Dashboard and Monthly Payroll.
"""

import requests
import json
import jwt
import os
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://erp-attendance-5.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class PayrollDiscrepancyTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        
    def setup_auth(self):
        """Setup authentication with test token"""
        try:
            # Create test auth token using real user data
            test_payload = {
                "user_id": "cfb58f53-79c7-4f12-85b0-268dde3f3fe0",  # Real user ID from DB
                "role": "admin", 
                "company_id": "dc1ff8de-3db3-4885-b6b7-168b00e3cef5",  # Real company ID from DB
                "mobile": "0773769019"
            }
            
            jwt_secret = "attendance-system-secret-key-change-in-production"
            self.auth_token = jwt.encode(test_payload, jwt_secret, algorithm="HS256")
            self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
            
            print("✅ Authentication setup complete")
            return True
            
        except Exception as e:
            print(f"❌ Authentication setup failed: {str(e)}")
            return False
    
    def investigate_payroll_discrepancy(self):
        """
        Deep investigation of the 11,000 LKR discrepancy between Dashboard and Monthly Payroll.
        
        **CRITICAL INFO FROM USER:**
        - Monthly Payroll `/payroll/month/2025-12`: **101,930.18 LKR**
        - Dashboard Live Salary Tracker: **112,645.06 LKR**
        - **Difference: 10,714.88 LKR** (User's concern!)
        """
        print("\n🔍 === DETAILED PAYROLL DISCREPANCY INVESTIGATION ===")
        print("🚨 USER REPORTED ISSUE: 10,714.88 LKR difference between endpoints")
        print("📊 Monthly Payroll: 101,930.18 LKR vs Dashboard: 112,645.06 LKR")
        
        try:
            # Step 1: Call Dashboard Live Current Month endpoint
            print("\n📋 Step 1: Calling Dashboard Live Current Month endpoint...")
            
            dashboard_response = self.session.get(f"{API_BASE}/payroll/live-current-month")
            
            if dashboard_response.status_code != 200:
                print(f"❌ Dashboard Live Endpoint Failed: {dashboard_response.status_code}")
                print(f"Response: {dashboard_response.text}")
                return False
            
            dashboard_data = dashboard_response.json()
            dashboard_total_gross = dashboard_data.get("total_gross", 0)
            dashboard_employees = dashboard_data.get("employees", [])
            
            print(f"✅ Dashboard Live Endpoint Response:")
            print(f"   📈 Total Gross: {dashboard_total_gross} LKR")
            print(f"   👥 Employee Count: {len(dashboard_employees)}")
            
            # Step 2: Call Monthly Payroll Detailed endpoint for December 2025
            print("\n📋 Step 2: Calling Monthly Payroll Detailed endpoint for 2025-12...")
            
            monthly_response = self.session.get(f"{API_BASE}/payroll/detailed/2025-12")
            
            if monthly_response.status_code != 200:
                print(f"❌ Monthly Payroll Endpoint Failed: {monthly_response.status_code}")
                print(f"Response: {monthly_response.text}")
                return False
            
            monthly_data = monthly_response.json()
            monthly_total_gross = monthly_data.get("total_gross", 0)
            monthly_employees = monthly_data.get("employees", [])
            
            print(f"✅ Monthly Payroll Endpoint Response:")
            print(f"   📈 Total Gross: {monthly_total_gross} LKR")
            print(f"   👥 Employee Count: {len(monthly_employees)}")
            
            # Step 3: Calculate the actual difference
            print(f"\n🔍 Step 3: Calculating Actual Difference...")
            
            actual_difference = dashboard_total_gross - monthly_total_gross
            
            print(f"📊 ACTUAL COMPARISON:")
            print(f"   🟢 Dashboard Live Total: {dashboard_total_gross} LKR")
            print(f"   🔵 Monthly Payroll Total: {monthly_total_gross} LKR")
            print(f"   🔴 Difference: {actual_difference} LKR")
            print(f"   📋 User Reported Difference: 10,714.88 LKR")
            
            if abs(actual_difference - 10714.88) < 1.0:  # Within 1 LKR tolerance
                print("✅ CONFIRMED: Difference matches user report!")
            else:
                print(f"⚠️  DIFFERENT: Actual difference ({actual_difference}) differs from user report (10,714.88)")
            
            # Step 4: Employee-by-Employee Comparison
            print(f"\n🔍 Step 4: Employee-by-Employee Comparison...")
            
            # Create dictionaries for easy comparison
            dashboard_emp_dict = {emp.get("employee_id", emp.get("employee_name", "unknown")): emp for emp in dashboard_employees}
            monthly_emp_dict = {emp.get("employee_id", emp.get("employee_name", "unknown")): emp for emp in monthly_employees}
            
            print(f"📋 Dashboard Employees: {len(dashboard_emp_dict)}")
            print(f"📋 Monthly Employees: {len(monthly_emp_dict)}")
            
            # Find employees in both datasets
            common_employees = set(dashboard_emp_dict.keys()) & set(monthly_emp_dict.keys())
            dashboard_only = set(dashboard_emp_dict.keys()) - set(monthly_emp_dict.keys())
            monthly_only = set(monthly_emp_dict.keys()) - set(dashboard_emp_dict.keys())
            
            print(f"👥 Common Employees: {len(common_employees)}")
            print(f"🟢 Dashboard Only: {len(dashboard_only)}")
            print(f"🔵 Monthly Only: {len(monthly_only)}")
            
            if dashboard_only:
                print(f"🟢 Employees ONLY in Dashboard: {list(dashboard_only)}")
            if monthly_only:
                print(f"🔵 Employees ONLY in Monthly: {list(monthly_only)}")
            
            # Step 5: Detailed Field Comparison for Common Employees
            print(f"\n🔍 Step 5: Detailed Field Comparison...")
            
            total_difference_breakdown = 0
            employees_with_differences = []
            
            for emp_id in common_employees:
                dashboard_emp = dashboard_emp_dict[emp_id]
                monthly_emp = monthly_emp_dict[emp_id]
                
                # Compare key fields
                dashboard_gross = dashboard_emp.get("gross_salary", 0)
                monthly_gross = monthly_emp.get("gross_salary", 0)
                
                dashboard_earnings = dashboard_emp.get("earnings", 0)
                monthly_earnings = monthly_emp.get("earnings", 0)
                
                dashboard_extra = dashboard_emp.get("extra_payment", 0)
                monthly_extra = monthly_emp.get("extra_payment", 0)
                
                dashboard_allowances = dashboard_emp.get("allowances", 0)
                monthly_allowances = monthly_emp.get("allowances", 0)
                
                gross_diff = dashboard_gross - monthly_gross
                earnings_diff = dashboard_earnings - monthly_earnings
                extra_diff = dashboard_extra - monthly_extra
                allowances_diff = dashboard_allowances - monthly_allowances
                
                if abs(gross_diff) > 0.01:  # Significant difference
                    employees_with_differences.append({
                        "employee_name": dashboard_emp.get("employee_name", "Unknown"),
                        "employee_id": emp_id,
                        "dashboard_gross": dashboard_gross,
                        "monthly_gross": monthly_gross,
                        "gross_difference": gross_diff,
                        "dashboard_earnings": dashboard_earnings,
                        "monthly_earnings": monthly_earnings,
                        "earnings_difference": earnings_diff,
                        "dashboard_extra": dashboard_extra,
                        "monthly_extra": monthly_extra,
                        "extra_difference": extra_diff,
                        "dashboard_allowances": dashboard_allowances,
                        "monthly_allowances": monthly_allowances,
                        "allowances_difference": allowances_diff
                    })
                    
                    total_difference_breakdown += gross_diff
            
            print(f"\n📊 EMPLOYEE DIFFERENCES FOUND: {len(employees_with_differences)}")
            print(f"💰 Total Difference from Employee Breakdown: {total_difference_breakdown} LKR")
            
            # Step 6: Detailed Analysis of Differences
            print(f"\n🔍 Step 6: Root Cause Analysis...")
            
            if employees_with_differences:
                print(f"\n🚨 EMPLOYEES WITH GROSS SALARY DIFFERENCES:")
                for i, emp in enumerate(employees_with_differences[:5]):  # Show first 5
                    print(f"\n   👤 Employee {i+1}: {emp['employee_name']} (ID: {emp['employee_id']})")
                    print(f"      🟢 Dashboard Gross: {emp['dashboard_gross']} LKR")
                    print(f"      🔵 Monthly Gross: {emp['monthly_gross']} LKR")
                    print(f"      🔴 Difference: {emp['gross_difference']} LKR")
                    print(f"      📋 Earnings - Dashboard: {emp['dashboard_earnings']}, Monthly: {emp['monthly_earnings']}, Diff: {emp['earnings_difference']}")
                    print(f"      💰 Extra Payment - Dashboard: {emp['dashboard_extra']}, Monthly: {emp['monthly_extra']}, Diff: {emp['extra_difference']}")
                    print(f"      🎁 Allowances - Dashboard: {emp['dashboard_allowances']}, Monthly: {emp['monthly_allowances']}, Diff: {emp['allowances_difference']}")
                
                if len(employees_with_differences) > 5:
                    print(f"   ... and {len(employees_with_differences) - 5} more employees with differences")
            
            # Step 7: Check for Formula Differences
            print(f"\n🔍 Step 7: Formula Analysis...")
            
            # Check if allowances are being added to gross in one endpoint but not the other
            dashboard_uses_allowances_in_gross = False
            monthly_uses_allowances_in_gross = False
            
            if dashboard_employees:
                first_dashboard = dashboard_employees[0]
                dashboard_basic = first_dashboard.get("basic_salary", 0)
                dashboard_allowances = first_dashboard.get("allowances", 0)
                dashboard_earnings = first_dashboard.get("earnings", 0)
                dashboard_gross = first_dashboard.get("gross_salary", 0)
                
                # Check if gross = earnings + extra_payments (without allowances)
                # OR gross = earnings + extra_payments + allowances (with allowances)
                expected_gross_without_allowances = dashboard_earnings + first_dashboard.get("extra_payment", 0)
                expected_gross_with_allowances = expected_gross_without_allowances + dashboard_allowances
                
                if abs(dashboard_gross - expected_gross_with_allowances) < 0.01:
                    dashboard_uses_allowances_in_gross = True
                    print(f"🟢 Dashboard Formula: gross = earnings + extra_payments + allowances")
                elif abs(dashboard_gross - expected_gross_without_allowances) < 0.01:
                    dashboard_uses_allowances_in_gross = False
                    print(f"🟢 Dashboard Formula: gross = earnings + extra_payments (no allowances)")
                else:
                    print(f"🟢 Dashboard Formula: Unknown/Complex")
            
            if monthly_employees:
                first_monthly = monthly_employees[0]
                monthly_basic = first_monthly.get("basic_salary", 0)
                monthly_allowances = first_monthly.get("allowances", 0)
                monthly_earnings = first_monthly.get("earnings", 0)
                monthly_gross = first_monthly.get("gross_salary", 0)
                
                expected_gross_without_allowances = monthly_earnings + first_monthly.get("extra_payment", 0)
                expected_gross_with_allowances = expected_gross_without_allowances + monthly_allowances
                
                if abs(monthly_gross - expected_gross_with_allowances) < 0.01:
                    monthly_uses_allowances_in_gross = True
                    print(f"🔵 Monthly Formula: gross = earnings + extra_payments + allowances")
                elif abs(monthly_gross - expected_gross_without_allowances) < 0.01:
                    monthly_uses_allowances_in_gross = False
                    print(f"🔵 Monthly Formula: gross = earnings + extra_payments (no allowances)")
                else:
                    print(f"🔵 Monthly Formula: Unknown/Complex")
            
            # Step 8: Final Summary and Recommendations
            print(f"\n📋 === INVESTIGATION SUMMARY ===")
            print(f"🔴 Confirmed Difference: {actual_difference} LKR")
            print(f"👥 Employees with Differences: {len(employees_with_differences)}")
            print(f"💰 Total from Employee Breakdown: {total_difference_breakdown} LKR")
            
            if dashboard_uses_allowances_in_gross != monthly_uses_allowances_in_gross:
                print(f"🚨 ROOT CAUSE IDENTIFIED: Different allowance handling in gross calculation!")
                print(f"   🟢 Dashboard includes allowances in gross: {dashboard_uses_allowances_in_gross}")
                print(f"   🔵 Monthly includes allowances in gross: {monthly_uses_allowances_in_gross}")
            else:
                print(f"🔍 Need deeper investigation - formulas appear similar")
            
            return True
                
        except Exception as e:
            print(f"❌ Investigation Error: {str(e)}")
            return False

def main():
    """Run the payroll discrepancy investigation"""
    print("🚀 Starting Payroll Discrepancy Investigation")
    print(f"Testing against: {API_BASE}")
    print("=" * 80)
    
    tester = PayrollDiscrepancyTester()
    
    # Setup authentication
    if not tester.setup_auth():
        print("❌ Authentication failed - cannot proceed")
        return
    
    # Run the investigation
    success = tester.investigate_payroll_discrepancy()
    
    if success:
        print("\n✅ Investigation completed successfully")
    else:
        print("\n❌ Investigation failed")

if __name__ == "__main__":
    main()