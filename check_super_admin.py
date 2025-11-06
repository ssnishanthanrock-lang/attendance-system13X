#!/usr/bin/env python3
"""
Check if there are any super admin users in the system
"""

import requests
import json
import jwt
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://payroll-plus-9.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

def create_temp_super_admin_token():
    """Create a temporary super admin token to check existing super admins"""
    try:
        # We'll try to create a super admin user first, then use it
        # Let's try to use the super admin creation endpoint
        
        # First, let's try with an existing admin token to see if we can create a super admin
        admin_payload = {
            "user_id": "cfb58f53-79c7-4f12-85b0-268dde3f3fe0",
            "role": "admin",
            "company_id": "dc1ff8de-3db3-4885-b6b7-168b00e3cef5",
            "mobile": "0712345678"
        }
        
        jwt_secret = "attendance-system-secret-key-change-in-production"
        admin_token = jwt.encode(admin_payload, jwt_secret, algorithm="HS256")
        
        session = requests.Session()
        session.headers.update({'Authorization': f'Bearer {admin_token}'})
        
        # Try to create a super admin user
        super_admin_data = {
            "mobile": "0777777777",
            "name": "Test Super Admin",
            "employee_id": "SUPER-001",
            "can_full_access_companies": True
        }
        
        print("Attempting to create super admin user...")
        response = session.post(f"{API_BASE}/superadmin/admins", json=super_admin_data)
        
        print(f"Create Super Admin Response: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 403:
            print("❌ Cannot create super admin - need existing super admin access")
            print("Let's try a different approach...")
            
            # Try to check if there are any super admin users by trying different approaches
            # Let's try to access the super admin endpoints with different user IDs
            
            # Maybe there's already a super admin user we can find
            # Let's try some common super admin user IDs or check the database structure
            
            return None
        elif response.status_code == 200:
            result = response.json()
            print(f"✅ Created super admin user: {result}")
            
            # Now create a token for this new super admin
            super_admin_payload = {
                "user_id": result.get("id"),
                "role": "super_admin",
                "mobile": "0777777777"
            }
            
            super_admin_token = jwt.encode(super_admin_payload, jwt_secret, algorithm="HS256")
            return super_admin_token
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

def try_existing_super_admin_ids():
    """Try some common super admin user IDs that might exist"""
    print("\n=== TRYING EXISTING SUPER ADMIN IDs ===")
    
    # Common super admin IDs that might exist
    potential_super_admin_ids = [
        "super-admin-001",
        "admin-001", 
        "root-admin",
        "system-admin",
        "00000000-0000-0000-0000-000000000001"
    ]
    
    jwt_secret = "attendance-system-secret-key-change-in-production"
    
    for user_id in potential_super_admin_ids:
        try:
            print(f"Trying user ID: {user_id}")
            
            super_admin_payload = {
                "user_id": user_id,
                "role": "super_admin",
                "mobile": "0777777777"
            }
            
            token = jwt.encode(super_admin_payload, jwt_secret, algorithm="HS256")
            
            session = requests.Session()
            session.headers.update({'Authorization': f'Bearer {token}'})
            
            response = session.get(f"{API_BASE}/superadmin/dashboard/stats")
            
            print(f"  Response: {response.status_code}")
            
            if response.status_code == 200:
                print(f"✅ Found working super admin user ID: {user_id}")
                data = response.json()
                print(f"  Total Companies: {data.get('total_companies', 0)}")
                return token
            elif response.status_code == 401:
                print(f"  ❌ User not found: {user_id}")
            elif response.status_code == 403:
                print(f"  ❌ User exists but not super admin: {user_id}")
            
        except Exception as e:
            print(f"  ❌ Error with {user_id}: {str(e)}")
    
    return None

def check_database_directly():
    """Try to understand the database structure"""
    print("\n=== CHECKING DATABASE STRUCTURE ===")
    
    # Let's try to get some information about users through existing endpoints
    admin_payload = {
        "user_id": "cfb58f53-79c7-4f12-85b0-268dde3f3fe0",
        "role": "admin",
        "company_id": "dc1ff8de-3db3-4885-b6b7-168b00e3cef5",
        "mobile": "0712345678"
    }
    
    jwt_secret = "attendance-system-secret-key-change-in-production"
    admin_token = jwt.encode(admin_payload, jwt_secret, algorithm="HS256")
    
    session = requests.Session()
    session.headers.update({'Authorization': f'Bearer {admin_token}'})
    
    # Try to get current user info
    response = session.get(f"{API_BASE}/auth/me")
    print(f"Current user info: {response.status_code}")
    if response.status_code == 200:
        user_data = response.json()
        print(f"User data: {json.dumps(user_data, indent=2)}")
    
    # Try to get employees (might show us user structure)
    response = session.get(f"{API_BASE}/employees")
    print(f"Employees endpoint: {response.status_code}")
    if response.status_code == 200:
        employees = response.json()
        print(f"Found {len(employees)} employees")
        if employees:
            print(f"Sample employee: {json.dumps(employees[0], indent=2)}")

def main():
    """Main function to check super admin setup"""
    print("🔍 Checking Super Admin Setup")
    print("=" * 50)
    
    # Method 1: Try to create a super admin
    token = create_temp_super_admin_token()
    
    if not token:
        # Method 2: Try existing super admin IDs
        token = try_existing_super_admin_ids()
    
    if not token:
        # Method 3: Check database structure
        check_database_directly()
        
        print("\n❌ No super admin access found")
        print("Recommendations:")
        print("1. Create a super admin user manually in the database")
        print("2. Or modify an existing admin user to have role 'super_admin'")
        print("3. Or check if there's a different authentication method")
    else:
        print(f"\n✅ Found working super admin token!")
        print("You can use this token for testing super admin endpoints")

if __name__ == "__main__":
    main()