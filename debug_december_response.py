#!/usr/bin/env python3
"""
Debug script to see the actual response structure for December 2025
"""

import requests
import jwt
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://erp-attendance-5.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

def create_test_auth_token():
    """Create test auth token"""
    try:
        test_payload = {
            "user_id": "cfb58f53-79c7-4f12-85b0-268dde3f3fe0",
            "role": "admin", 
            "company_id": "dc1ff8de-3db3-4885-b6b7-168b00e3cef5",
            "mobile": "0712345678"
        }
        
        jwt_secret = "attendance-system-secret-key-change-in-production"
        auth_token = jwt.encode(test_payload, jwt_secret, algorithm="HS256")
        return auth_token
        
    except Exception as e:
        print(f"❌ Failed to create test token: {str(e)}")
        return None

def debug_december_response():
    """Debug the actual response structure"""
    print("🔍 Debugging December 2025 Response Structure")
    print("="*80)
    
    auth_token = create_test_auth_token()
    if not auth_token:
        return
    
    session = requests.Session()
    session.headers.update({'Authorization': f'Bearer {auth_token}'})
    
    try:
        response = session.get(f"{API_BASE}/payroll/detailed/2025-12")
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            print("\n📋 FULL RESPONSE STRUCTURE:")
            print("="*50)
            print(json.dumps(data, indent=2))
            
            print("\n🔍 TOP-LEVEL KEYS:")
            print("="*30)
            for key in data.keys():
                print(f"  - {key}: {type(data[key])}")
            
            print("\n👥 EMPLOYEES STRUCTURE:")
            print("="*30)
            employees = data.get("employees", [])
            print(f"Number of employees: {len(employees)}")
            
            if employees:
                print("\nFirst employee structure:")
                first_emp = employees[0]
                for key, value in first_emp.items():
                    print(f"  - {key}: {value} ({type(value)})")
                
                # Check for working_days in employees
                working_days_values = []
                for emp in employees:
                    wd = emp.get("working_days")
                    if wd is not None:
                        working_days_values.append(wd)
                
                if working_days_values:
                    print(f"\n📊 Working Days Values Found:")
                    print(f"  Values: {set(working_days_values)}")
                    if all(wd == 27 for wd in working_days_values):
                        print("  ✅ All employees have working_days = 27")
                    else:
                        print("  ❌ Not all employees have working_days = 27")
                else:
                    print("  ⚠️  No working_days field found in employees")
            
        else:
            print(f"❌ Request failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    debug_december_response()