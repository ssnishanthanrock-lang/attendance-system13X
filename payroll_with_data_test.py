#!/usr/bin/env python3
"""
Payroll Discrepancy Test with Data Generation
Generate payroll data and then test both endpoints for consistency
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

class PayrollWithDataTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.setup_auth()
        
    def setup_auth(self):
        """Setup authentication for testing"""
        try:
            # Create test auth token using existing user
            test_payload = {
                "user_id": "cfb58f53-79c7-4f12-85b0-268dde3f3fe0",  # Real user ID from DB
                "role": "admin", 
                "company_id": "dc1ff8de-3db3-4885-b6b7-168b00e3cef5",  # Real company ID from DB
                "mobile": "0712345678"
            }
            
            jwt_secret = "attendance-system-secret-key-change-in-production"
            self.auth_token = jwt.encode(test_payload, jwt_secret, algorithm="HS256")
            self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
            
            print("✅ Authentication setup successful")
            return True
            
        except Exception as e:
            print(f"❌ Authentication setup failed: {str(e)}")
            return False
    
    def generate_payroll_data(self):
        """Generate payroll data for December 2025"""
        print("🔧 Generating payroll data for December 2025...")
        
        try:
            generate_data = {
                "month": "2025-12"
            }
            
            response = self.session.post(f"{API_BASE}/payroll/generate", json=generate_data)
            
            if response.status_code == 200:
                result = response.json()
                employee_count = result.get("employee_count", 0)
                print(f"✅ Payroll generated successfully for {employee_count} employees")
                return True
            else:
                print(f"❌ Failed to generate payroll: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error generating payroll: {str(e)}")
            return False
    
    def test_payroll_with_data(self):
        """Test both payroll endpoints with actual data"""
        print("\n" + "="*80)
        print("🔍 PAYROLL DISCREPANCY TEST WITH ACTUAL DATA")
        print("="*80)
        
        try:
            # Step 1: Generate payroll data
            if not self.generate_payroll_data():
                print("⚠️  Could not generate payroll data, testing with existing data...")
            
            print("\n📊 Step 1: Testing /api/payroll/live-current-month endpoint...")
            live_response = self.session.get(f"{API_BASE}/payroll/live-current-month")
            
            if live_response.status_code != 200:
                print(f"❌ Live payroll endpoint failed: {live_response.status_code}")
                return False
            
            live_data = live_response.json()
            live_total_gross = live_data.get("total_gross", 0)
            live_employees = live_data.get("employees", [])
            live_working_days = live_employees[0].get("working_days", 0) if live_employees else None
            
            print(f"✅ Live endpoint results:")
            print(f"   - Total Gross: {live_total_gross}")
            print(f"   - Employee Count: {len(live_employees)}")
            print(f"   - Working Days: {live_working_days}")
            
            # Step 2: Test detailed endpoint
            print(f"\n📋 Step 2: Testing /api/payroll/detailed/2025-12 endpoint...")
            detailed_response = self.session.get(f"{API_BASE}/payroll/detailed/2025-12")
            
            if detailed_response.status_code != 200:
                print(f"❌ Detailed payroll endpoint failed: {detailed_response.status_code}")
                return False
            
            detailed_data = detailed_response.json()
            detailed_total_gross = detailed_data.get("total_gross", 0)
            detailed_employees = detailed_data.get("employees", [])
            detailed_working_days = detailed_employees[0].get("working_days", 0) if detailed_employees else None
            
            print(f"✅ Detailed endpoint results:")
            print(f"   - Total Gross: {detailed_total_gross}")
            print(f"   - Employee Count: {len(detailed_employees)}")
            print(f"   - Working Days: {detailed_working_days}")
            
            # Step 3: Compare results
            print(f"\n💰 Step 3: Comparing results...")
            
            # Working days comparison
            working_days_match = (live_working_days == detailed_working_days == 27)
            if working_days_match:
                print(f"✅ Working days match: Both show 27 days")
            else:
                print(f"❌ Working days mismatch: Live={live_working_days}, Detailed={detailed_working_days}")
            
            # Total gross comparison
            if live_total_gross == 0 and detailed_total_gross == 0:
                print(f"ℹ️  Both endpoints return 0 total_gross (no salary data)")
                total_gross_match = True
            else:
                diff = abs(live_total_gross - detailed_total_gross)
                percentage_diff = (diff / max(detailed_total_gross, 1)) * 100
                
                print(f"   Live Total Gross: {live_total_gross}")
                print(f"   Detailed Total Gross: {detailed_total_gross}")
                print(f"   Difference: {diff}")
                print(f"   Percentage Diff: {percentage_diff:.2f}%")
                
                total_gross_match = percentage_diff <= 5
                
                if total_gross_match:
                    print(f"✅ Total gross values match within 5%")
                else:
                    print(f"❌ Total gross values differ by more than 5%")
            
            # Final result
            print(f"\n" + "="*80)
            print("📋 FINAL RESULTS")
            print("="*80)
            
            if working_days_match and total_gross_match:
                print("🎉 SUCCESS: Payroll discrepancy fix is working correctly!")
                print("   - Both endpoints use 27 working days for December 2025")
                print("   - Total gross values are consistent")
                return True
            else:
                print("⚠️  ISSUES DETECTED:")
                if not working_days_match:
                    print("   - Working days calculation inconsistency")
                if not total_gross_match:
                    print("   - Total gross values differ significantly")
                return False
                
        except Exception as e:
            print(f"❌ Test error: {str(e)}")
            return False

def main():
    """Run the payroll test with data generation"""
    tester = PayrollWithDataTester()
    
    print("🚀 IT Signature ERP - Payroll Discrepancy Test with Data")
    print(f"🌐 Testing against: {API_BASE}")
    
    success = tester.test_payroll_with_data()
    
    print(f"\n" + "="*80)
    print("🏁 TEST COMPLETE")
    print("="*80)
    
    if success:
        print("✅ PAYROLL DISCREPANCY FIX: VERIFIED WORKING")
    else:
        print("❌ PAYROLL DISCREPANCY FIX: NEEDS ATTENTION")
    
    return success

if __name__ == "__main__":
    main()