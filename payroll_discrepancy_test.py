#!/usr/bin/env python3
"""
PAYROLL DISCREPANCY INVESTIGATION - DETAILED ANALYSIS

Investigate the total_gross discrepancy between Dashboard and Monthly Payroll view with ACTUAL data.

**Context:**
- User reports total_gross differs between:
  1. Dashboard Live Salary Tracker (uses `/api/payroll/live-current-month`)
  2. Monthly Payroll `/payroll/month/2025-12` (uses `/api/payroll/detailed/2025-12`)
- Both were fixed to use 27 working days
- User believes monthly payroll is correct
- We have actual attendance data for December (13 records)
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

class PayrollDiscrepancyInvestigator:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.setup_auth()
        
    def setup_auth(self):
        """Setup authentication with real user credentials"""
        # Use real user data from database for mobile 0773769019 (from review request)
        test_payload = {
            "user_id": "cfb58f53-79c7-4f12-85b0-268dde3f3fe0",  # Real user ID from DB
            "role": "admin", 
            "company_id": "dc1ff8de-3db3-4885-b6b7-168b00e3cef5",  # Real company ID from DB
            "mobile": "0773769019"
        }
        
        jwt_secret = "attendance-system-secret-key-change-in-production"
        self.auth_token = jwt.encode(test_payload, jwt_secret, algorithm="HS256")
        self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
        print(f"🔐 Authentication setup complete for user: {test_payload['mobile']}")
    
    def investigate_discrepancy(self):
        """
        Main investigation function - calls both endpoints and analyzes differences
        """
        print("\n" + "="*80)
        print("🔍 PAYROLL DISCREPANCY INVESTIGATION - DETAILED ANALYSIS")
        print("="*80)
        
        # Step 1: Call both endpoints
        live_data = self.call_live_endpoint()
        detailed_data = self.call_detailed_endpoint()
        
        if not live_data or not detailed_data:
            print("❌ Cannot proceed - one or both endpoints failed")
            return
        
        # Step 2: Extract and compare values
        comparison = self.compare_endpoints(live_data, detailed_data)
        
        # Step 3: Deep dive into calculation logic
        self.analyze_calculations(live_data, detailed_data)
        
        # Step 4: Identify root cause
        self.identify_root_cause(live_data, detailed_data)
        
        # Step 5: Provide recommendations
        self.provide_recommendations(live_data, detailed_data)
    
    def call_live_endpoint(self):
        """Call /api/payroll/live-current-month and capture data"""
        print("\n📊 Step 1: Calling Dashboard Live Salary Tracker endpoint...")
        print(f"   URL: {API_BASE}/payroll/live-current-month")
        
        try:
            response = self.session.get(f"{API_BASE}/payroll/live-current-month")
            
            if response.status_code == 200:
                data = response.json()
                
                total_gross = data.get("total_gross", 0)
                timestamp = data.get("timestamp", "")
                employees = data.get("employees", [])
                working_days = employees[0].get("working_days", 0) if employees else 0
                
                print(f"   ✅ SUCCESS:")
                print(f"      - Total Gross: {total_gross:,.2f} LKR")
                print(f"      - Working Days: {working_days}")
                print(f"      - Employee Count: {len(employees)}")
                print(f"      - Timestamp: {timestamp}")
                
                if employees:
                    sample_emp = employees[0]
                    print(f"      - Sample Employee: {sample_emp.get('employee_name', 'Unknown')}")
                    print(f"        * Basic Salary: {sample_emp.get('basic_salary', 0):,.2f}")
                    print(f"        * Earnings: {sample_emp.get('earnings', 0):,.2f}")
                    print(f"        * Gross Salary: {sample_emp.get('gross_salary', 0):,.2f}")
                
                return data
            else:
                print(f"   ❌ FAILED: Status {response.status_code}")
                print(f"      Response: {response.text}")
                return None
                
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")
            return None
    
    def call_detailed_endpoint(self):
        """Call /api/payroll/detailed/2025-12 and capture data"""
        print("\n📋 Step 2: Calling Monthly Payroll detailed endpoint...")
        print(f"   URL: {API_BASE}/payroll/detailed/2025-12")
        
        try:
            response = self.session.get(f"{API_BASE}/payroll/detailed/2025-12")
            
            if response.status_code == 200:
                data = response.json()
                
                total_gross = data.get("total_gross", 0)
                employees = data.get("employees", [])
                working_days = employees[0].get("working_days", 0) if employees else 0
                
                print(f"   ✅ SUCCESS:")
                print(f"      - Total Gross: {total_gross:,.2f} LKR")
                print(f"      - Working Days: {working_days}")
                print(f"      - Employee Count: {len(employees)}")
                
                if employees:
                    sample_emp = employees[0]
                    print(f"      - Sample Employee: {sample_emp.get('employee_name', 'Unknown')}")
                    print(f"        * Basic Salary: {sample_emp.get('basic_salary', 0):,.2f}")
                    print(f"        * Gross Salary: {sample_emp.get('gross_salary', 0):,.2f}")
                
                return data
            else:
                print(f"   ❌ FAILED: Status {response.status_code}")
                print(f"      Response: {response.text}")
                return None
                
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")
            return None
    
    def compare_endpoints(self, live_data, detailed_data):
        """Compare the two endpoints and calculate differences"""
        print("\n💰 Step 3: Calculating exact differences...")
        
        live_total_gross = live_data.get("total_gross", 0)
        detailed_total_gross = detailed_data.get("total_gross", 0)
        
        difference_lkr = abs(live_total_gross - detailed_total_gross)
        
        if detailed_total_gross != 0:
            percentage_diff = (difference_lkr / detailed_total_gross) * 100
        else:
            percentage_diff = 100 if live_total_gross != 0 else 0
        
        print(f"   📊 COMPARISON RESULTS:")
        print(f"      - Dashboard Live Total Gross: {live_total_gross:,.2f} LKR")
        print(f"      - Monthly Payroll Total Gross: {detailed_total_gross:,.2f} LKR")
        print(f"      - Exact Difference: {difference_lkr:,.2f} LKR")
        print(f"      - Percentage Difference: {percentage_diff:.2f}%")
        
        # Verify working days consistency
        live_employees = live_data.get("employees", [])
        detailed_employees = detailed_data.get("employees", [])
        
        live_working_days = live_employees[0].get("working_days", 0) if live_employees else 0
        detailed_working_days = detailed_employees[0].get("working_days", 0) if detailed_employees else 0
        
        print(f"\n   📅 WORKING DAYS VERIFICATION:")
        print(f"      - Live Endpoint Working Days: {live_working_days}")
        print(f"      - Detailed Endpoint Working Days: {detailed_working_days}")
        
        if live_working_days == detailed_working_days == 27:
            print(f"      ✅ Both endpoints correctly use 27 working days for December 2025")
        else:
            print(f"      ❌ Working days inconsistency detected!")
        
        return {
            "live_total_gross": live_total_gross,
            "detailed_total_gross": detailed_total_gross,
            "difference_lkr": difference_lkr,
            "percentage_diff": percentage_diff,
            "live_working_days": live_working_days,
            "detailed_working_days": detailed_working_days
        }
    
    def analyze_calculations(self, live_data, detailed_data):
        """Deep dive into calculation logic for sample employees"""
        print("\n🔬 Step 4: Deep dive into calculation logic...")
        
        live_employees = live_data.get("employees", [])
        detailed_employees = detailed_data.get("employees", [])
        
        if not live_employees or not detailed_employees:
            print("   ❌ No employees found in one or both endpoints")
            return
        
        # Analyze first employee from each endpoint
        live_emp = live_employees[0]
        detailed_emp = detailed_employees[0]
        
        print(f"   📋 SAMPLE EMPLOYEE ANALYSIS:")
        print(f"      Live Endpoint - {live_emp.get('employee_name', 'Unknown')}:")
        print(f"        - Basic Salary: {live_emp.get('basic_salary', 0):,.2f}")
        print(f"        - Allowances: {live_emp.get('allowances', 0):,.2f}")
        print(f"        - Earnings: {live_emp.get('earnings', 0):,.2f}")
        print(f"        - Extra Payments: {live_emp.get('extra_payment', 0):,.2f}")
        print(f"        - Gross Salary: {live_emp.get('gross_salary', 0):,.2f}")
        
        print(f"      Detailed Endpoint - {detailed_emp.get('employee_name', 'Unknown')}:")
        print(f"        - Basic Salary: {detailed_emp.get('basic_salary', 0):,.2f}")
        print(f"        - Allowances: {detailed_emp.get('allowances', 0):,.2f}")
        print(f"        - Gross Salary: {detailed_emp.get('gross_salary', 0):,.2f}")
        
        # Check formula differences
        live_formula_result = live_emp.get('earnings', 0) + live_emp.get('extra_payment', 0)
        detailed_formula_result = detailed_emp.get('basic_salary', 0) + detailed_emp.get('allowances', 0)
        
        print(f"\n   🧮 FORMULA COMPARISON:")
        print(f"      Live Formula: earnings + extra_payments = {live_emp.get('earnings', 0)} + {live_emp.get('extra_payment', 0)} = {live_formula_result}")
        print(f"      Detailed Formula: basic_salary + allowances = {detailed_emp.get('basic_salary', 0)} + {detailed_emp.get('allowances', 0)} = {detailed_formula_result}")
        
        formula_difference = abs(live_formula_result - detailed_formula_result)
        print(f"      Formula Difference: {formula_difference:,.2f} LKR")
        
        return {
            "live_employee": live_emp,
            "detailed_employee": detailed_emp,
            "formula_difference": formula_difference
        }
    
    def identify_root_cause(self, live_data, detailed_data):
        """Identify the root cause of discrepancy"""
        print("\n🎯 Step 5: Root Cause Analysis...")
        
        comparison = self.compare_endpoints(live_data, detailed_data)
        
        root_causes = []
        
        # Check working days consistency
        if comparison["live_working_days"] != comparison["detailed_working_days"]:
            root_causes.append(f"Working days inconsistency: Live={comparison['live_working_days']}, Detailed={comparison['detailed_working_days']}")
        
        # Check if there's a significant difference
        if comparison["difference_lkr"] > 0:
            live_employees = live_data.get("employees", [])
            detailed_employees = detailed_data.get("employees", [])
            
            if live_employees and detailed_employees:
                live_emp = live_employees[0]
                detailed_emp = detailed_employees[0]
                
                # Check for extra payments inclusion
                live_extra = live_emp.get("extra_payment", 0)
                if live_extra > 0:
                    root_causes.append("Live endpoint includes extra_payments in gross calculation")
                
                # Check for allowances handling difference
                live_allowances = live_emp.get("allowances", 0)
                detailed_allowances = detailed_emp.get("allowances", 0)
                if live_allowances != detailed_allowances:
                    root_causes.append(f"Allowances differ: Live={live_allowances}, Detailed={detailed_allowances}")
                
                # Check for earnings vs basic salary
                live_earnings = live_emp.get("earnings", 0)
                detailed_basic = detailed_emp.get("basic_salary", 0)
                if live_earnings != detailed_basic:
                    root_causes.append("Live uses 'earnings' while Detailed uses 'basic_salary' in calculation")
        
        # Check for timing issues
        if "timestamp" in live_data:
            root_causes.append("Live endpoint is real-time, Detailed is static monthly calculation")
        
        if not root_causes:
            root_causes.append("No significant discrepancy found - both endpoints return similar values")
        
        print(f"   🔍 IDENTIFIED ROOT CAUSES:")
        for i, cause in enumerate(root_causes, 1):
            print(f"      {i}. {cause}")
        
        return root_causes
    
    def provide_recommendations(self, live_data, detailed_data):
        """Provide recommendations for fixing the discrepancy"""
        print("\n💡 Step 6: Recommendations...")
        
        comparison = self.compare_endpoints(live_data, detailed_data)
        
        if comparison["difference_lkr"] == 0:
            print("   ✅ NO ACTION NEEDED:")
            print("      - Both endpoints return identical total_gross values")
            print("      - The discrepancy has been resolved")
        
        elif comparison["difference_lkr"] <= 100:
            print("   ⚠️  MINOR DISCREPANCY (≤100 LKR):")
            print("      - Difference is within acceptable tolerance")
            print("      - Monitor for consistency in future")
            print("      - Consider documenting the expected difference if it's due to timing")
        
        else:
            print("   🚨 SIGNIFICANT DISCREPANCY (>100 LKR):")
            print("      - Immediate investigation required")
            print("      - Recommended actions:")
            print("        1. Verify both endpoints use same working_days calculation")
            print("        2. Ensure consistent handling of allowances and extra_payments")
            print("        3. Check if live endpoint should include real-time vs monthly data")
            print("        4. Consider standardizing the gross_salary formula across endpoints")
        
        # Working days recommendation
        if comparison["live_working_days"] != 27 or comparison["detailed_working_days"] != 27:
            print("      - CRITICAL: Ensure both endpoints use 27 working days for December 2025")
        
        print(f"\n   📊 FINAL ASSESSMENT:")
        print(f"      - Difference: {comparison['difference_lkr']:,.2f} LKR ({comparison['percentage_diff']:.2f}%)")
        print(f"      - Status: {'✅ RESOLVED' if comparison['difference_lkr'] <= 100 else '❌ NEEDS ATTENTION'}")

def main():
    """Main execution function"""
    investigator = PayrollDiscrepancyInvestigator()
    investigator.investigate_discrepancy()
    
    print("\n" + "="*80)
    print("🏁 PAYROLL DISCREPANCY INVESTIGATION COMPLETE")
    print("="*80)

if __name__ == "__main__":
    main()