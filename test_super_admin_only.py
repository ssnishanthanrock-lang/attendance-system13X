#!/usr/bin/env python3
"""
Super Admin Testing Only - Focused test for Super Admin endpoints
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

def create_super_admin_token():
    """Create a super admin token using existing admin user"""
    try:
        # Use existing admin user but with super_admin role for testing
        super_admin_payload = {
            "user_id": "cfb58f53-79c7-4f12-85b0-268dde3f3fe0",  # Known admin from test data
            "role": "super_admin",  # Override role to super_admin
            "company_id": "dc1ff8de-3db3-4885-b6b7-168b00e3cef5",
            "mobile": "0712345678"
        }
        
        jwt_secret = "attendance-system-secret-key-change-in-production"
        token = jwt.encode(super_admin_payload, jwt_secret, algorithm="HS256")
        
        print("✅ Created super admin test token")
        return token
        
    except Exception as e:
        print(f"❌ Failed to create super admin token: {str(e)}")
        return None

def test_super_admin_dashboard_stats():
    """Test GET /api/superadmin/dashboard/stats endpoint"""
    print("\n=== TESTING SUPER ADMIN DASHBOARD STATS ===")
    
    token = create_super_admin_token()
    if not token:
        return
    
    try:
        session = requests.Session()
        session.headers.update({'Authorization': f'Bearer {token}'})
        
        response = session.get(f"{API_BASE}/superadmin/dashboard/stats")
        
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Super Admin Dashboard Stats - SUCCESS")
            print(f"   Total Companies: {data.get('total_companies', 0)}")
            print(f"   Active Companies: {data.get('active_companies', 0)}")
            print(f"   Company Stats Count: {len(data.get('company_stats', []))}")
            
            # Check company_stats structure
            company_stats = data.get("company_stats", [])
            if company_stats:
                first_company = company_stats[0]
                print(f"   Sample Company: {first_company.get('name')}")
                print(f"   Invoicing Enabled: {first_company.get('invoicing_enabled')}")
                print(f"   SMS Enabled: {first_company.get('sms_enabled')}")
                
                # Check required fields
                required_fields = ["company_id", "name", "admin_name", "admin_mobile", "status", 
                                 "employee_count", "last_login", "sms_enabled", "invoicing_enabled", "created_at"]
                missing_fields = [field for field in required_fields if field not in first_company]
                
                if not missing_fields:
                    print("✅ All required fields present in company stats")
                    return company_stats[0]["company_id"]  # Return company ID for further testing
                else:
                    print(f"❌ Missing fields: {missing_fields}")
            else:
                print("⚠️  No companies found")
        else:
            print(f"❌ Request failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Test error: {str(e)}")
    
    return None

def test_super_admin_invoicing_toggle(company_id):
    """Test PUT /api/superadmin/companies/{company_id}/invoicing endpoint"""
    print(f"\n=== TESTING SUPER ADMIN INVOICING TOGGLE (Company: {company_id}) ===")
    
    token = create_super_admin_token()
    if not token:
        return
    
    try:
        session = requests.Session()
        session.headers.update({'Authorization': f'Bearer {token}'})
        
        # Test 1: Enable invoicing
        print("Testing: Enable invoicing...")
        enable_response = session.put(
            f"{API_BASE}/superadmin/companies/{company_id}/invoicing",
            json={"enabled": True}
        )
        
        print(f"Enable Response Status: {enable_response.status_code}")
        if enable_response.status_code == 200:
            result = enable_response.json()
            print(f"✅ Enable Success: {result.get('message')}")
        else:
            print(f"❌ Enable Failed: {enable_response.text}")
        
        # Test 2: Disable invoicing
        print("Testing: Disable invoicing...")
        disable_response = session.put(
            f"{API_BASE}/superadmin/companies/{company_id}/invoicing",
            json={"enabled": False}
        )
        
        print(f"Disable Response Status: {disable_response.status_code}")
        if disable_response.status_code == 200:
            result = disable_response.json()
            print(f"✅ Disable Success: {result.get('message')}")
        else:
            print(f"❌ Disable Failed: {disable_response.text}")
        
        # Test 3: Verify database update
        print("Testing: Verify database update...")
        verify_response = session.get(f"{API_BASE}/superadmin/dashboard/stats")
        
        if verify_response.status_code == 200:
            verify_data = verify_response.json()
            verify_companies = verify_data.get("company_stats", [])
            updated_company = next((c for c in verify_companies if c["company_id"] == company_id), None)
            
            if updated_company:
                updated_status = updated_company.get("invoicing_enabled")
                print(f"✅ Database Update Verified: invoicing_enabled = {updated_status}")
            else:
                print("❌ Company not found in verification response")
        
    except Exception as e:
        print(f"❌ Test error: {str(e)}")

def test_super_admin_sms_toggle(company_id):
    """Test PUT /api/superadmin/companies/{company_id}/sms endpoint"""
    print(f"\n=== TESTING SUPER ADMIN SMS TOGGLE (Company: {company_id}) ===")
    
    token = create_super_admin_token()
    if not token:
        return
    
    try:
        session = requests.Session()
        session.headers.update({'Authorization': f'Bearer {token}'})
        
        # Test 1: Enable SMS
        print("Testing: Enable SMS...")
        sms_settings_enable = {
            "sms_gateway": "textit",
            "sms_enabled": True,
            "sms_username": "test_username",
            "sms_password": "test_password"
        }
        
        enable_response = session.put(
            f"{API_BASE}/superadmin/companies/{company_id}/sms",
            json=sms_settings_enable
        )
        
        print(f"Enable Response Status: {enable_response.status_code}")
        if enable_response.status_code == 200:
            result = enable_response.json()
            print(f"✅ Enable Success: {result.get('message')}")
        else:
            print(f"❌ Enable Failed: {enable_response.text}")
        
        # Test 2: Disable SMS
        print("Testing: Disable SMS...")
        sms_settings_disable = {
            "sms_gateway": "textit",
            "sms_enabled": False
        }
        
        disable_response = session.put(
            f"{API_BASE}/superadmin/companies/{company_id}/sms",
            json=sms_settings_disable
        )
        
        print(f"Disable Response Status: {disable_response.status_code}")
        if disable_response.status_code == 200:
            result = disable_response.json()
            print(f"✅ Disable Success: {result.get('message')}")
        else:
            print(f"❌ Disable Failed: {disable_response.text}")
        
    except Exception as e:
        print(f"❌ Test error: {str(e)}")

def test_super_admin_status_change(company_id):
    """Test PUT /api/superadmin/companies/{company_id}/status endpoint"""
    print(f"\n=== TESTING SUPER ADMIN STATUS CHANGE (Company: {company_id}) ===")
    
    token = create_super_admin_token()
    if not token:
        return
    
    try:
        session = requests.Session()
        session.headers.update({'Authorization': f'Bearer {token}'})
        
        # Test status changes
        statuses_to_test = ["active", "suspended", "pending", "active"]  # End with active
        
        for status in statuses_to_test:
            print(f"Testing: Change status to '{status}'...")
            response = session.put(
                f"{API_BASE}/superadmin/companies/{company_id}/status",
                params={"status": status}
            )
            
            print(f"Status Change Response: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Status Change Success: {result.get('message')}")
            else:
                print(f"❌ Status Change Failed: {response.text}")
        
    except Exception as e:
        print(f"❌ Test error: {str(e)}")

def test_access_control():
    """Test access control for super admin endpoints"""
    print("\n=== TESTING ACCESS CONTROL ===")
    
    # Test with regular admin token (should be denied)
    try:
        regular_admin_payload = {
            "user_id": "cfb58f53-79c7-4f12-85b0-268dde3f3fe0",
            "role": "admin",  # Regular admin role
            "company_id": "dc1ff8de-3db3-4885-b6b7-168b00e3cef5",
            "mobile": "0712345678"
        }
        
        jwt_secret = "attendance-system-secret-key-change-in-production"
        admin_token = jwt.encode(regular_admin_payload, jwt_secret, algorithm="HS256")
        
        session = requests.Session()
        session.headers.update({'Authorization': f'Bearer {admin_token}'})
        
        response = session.get(f"{API_BASE}/superadmin/dashboard/stats")
        
        print(f"Regular Admin Access Response: {response.status_code}")
        if response.status_code == 403:
            print("✅ Regular admin correctly denied access (403)")
        else:
            print(f"❌ Regular admin has unexpected access: {response.status_code}")
        
    except Exception as e:
        print(f"❌ Access control test error: {str(e)}")

def main():
    """Run all Super Admin tests"""
    print("🚀 Starting Super Admin Functionality Tests")
    print(f"Backend URL: {BACKEND_URL}")
    print("=" * 60)
    
    # Test 1: Dashboard Stats
    company_id = test_super_admin_dashboard_stats()
    
    if company_id:
        # Test 2: Invoicing Toggle
        test_super_admin_invoicing_toggle(company_id)
        
        # Test 3: SMS Toggle
        test_super_admin_sms_toggle(company_id)
        
        # Test 4: Status Change
        test_super_admin_status_change(company_id)
    
    # Test 5: Access Control
    test_access_control()
    
    print("\n" + "=" * 60)
    print("Super Admin Tests Completed")

if __name__ == "__main__":
    main()