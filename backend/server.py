from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import random
import requests
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"

# SMS Configuration
DEFAULT_SMS_USERNAME = os.environ.get('TEXTIT_USERNAME', '942021070701')
DEFAULT_SMS_PASSWORD = os.environ.get('TEXTIT_PASSWORD', '7470')

# ============= MODELS =============
class Company(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    admin_name: str
    admin_mobile: str
    email: Optional[str] = None
    address: Optional[str] = None
    contact_number: Optional[str] = None
    status: str = "pending"  # pending, active, suspended
    sms_gateway: str = "textit"
    sms_enabled: bool = False
    sms_username: Optional[str] = None
    sms_password: Optional[str] = None
    company_info_completed: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_login: Optional[str] = None

class CompanyCreate(BaseModel):
    name: str
    admin_name: str
    admin_mobile: str
    email: Optional[str] = None

class CompanyInfoUpdate(BaseModel):
    name: str
    address: str
    contact_number: str
    email: str

class SMSSettings(BaseModel):
    sms_gateway: str  # textit, dialog, hutch, mobitel, disabled
    sms_enabled: bool
    # Textit.biz
    sms_username: Optional[str] = None
    sms_password: Optional[str] = None
    # Dialog
    dialog_username: Optional[str] = None
    dialog_password: Optional[str] = None
    dialog_mask: Optional[str] = None  # Sender ID
    # Hutch
    hutch_client_id: Optional[str] = None
    hutch_client_secret: Optional[str] = None
    hutch_access_token: Optional[str] = None
    hutch_refresh_token: Optional[str] = None
    # Mobitel
    mobitel_app_id: Optional[str] = None
    mobitel_app_key: Optional[str] = None
    mobitel_client_id: Optional[str] = None

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: Optional[str] = None
    employee_id: Optional[str] = None
    mobile: str
    name: str
    role: str  # super_admin, admin, manager, employee, staff_member
    department: Optional[str] = None
    position: Optional[str] = None
    basic_salary: float = 0.0
    allowances: float = 0.0
    join_date: str
    profile_pic: Optional[str] = None
    start_time: Optional[str] = None
    finish_time: Optional[str] = None
    fixed_salary: bool = False
    custom_start_time: Optional[str] = None
    custom_end_time: Optional[str] = None
    ot_allowed: bool = False
    sms_notifications: bool = False
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserCreate(BaseModel):
    employee_id: Optional[str] = None
    mobile: str
    name: str
    role: str
    department: Optional[str] = None
    position: Optional[str] = None
    basic_salary: float = 0.0
    allowances: float = 0.0
    join_date: str
    start_time: Optional[str] = None
    finish_time: Optional[str] = None
    fixed_salary: Optional[bool] = False

class OTPRequest(BaseModel):
    mobile: str

class OTPVerify(BaseModel):
    mobile: str
    otp: str
    login_as: Optional[str] = None

class ActivityLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    user_id: str
    user_name: str
    action: str
    details: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============= HELPER FUNCTIONS =============
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def send_sms(mobile: str, message: str, company_id: Optional[str] = None):
    """Send SMS via configured gateway"""
    try:
        if company_id:
            company_doc = db.companies.find_one({"id": company_id})
            if not company_doc or not company_doc.get("sms_enabled"):
                return False
            
            gateway = company_doc.get("sms_gateway", "textit")
            
            if gateway == "textit":
                username = company_doc.get("sms_username") or DEFAULT_SMS_USERNAME
                password = company_doc.get("sms_password") or DEFAULT_SMS_PASSWORD
                url = "https://www.textit.biz/sendmsg"
                params = {"id": username, "pw": password, "to": mobile, "text": message}
                response = requests.get(url, params=params, timeout=10)
                return response.status_code == 200
            
            elif gateway == "dialog":
                import hashlib
                username = company_doc.get("dialog_username")
                password = company_doc.get("dialog_password")
                mask = company_doc.get("dialog_mask")
                
                if not all([username, password, mask]):
                    logging.error("Dialog SMS: Missing credentials")
                    return False
                
                digest = hashlib.md5(password.encode()).hexdigest()
                url = "https://bulksms.dialog.lk/api/v2/send"
                payload = {
                    "user": username,
                    "digest": digest,
                    "mask": mask,
                    "destination": mobile,
                    "message": message
                }
                response = requests.post(url, json=payload, timeout=10)
                return response.status_code == 200
            
            elif gateway == "hutch":
                access_token = company_doc.get("hutch_access_token")
                if not access_token:
                    logging.error("Hutch SMS: Missing access token")
                    return False
                
                url = "https://bsms.hutch.lk/api/sms/send"
                headers = {"Authorization": f"Bearer {access_token}"}
                payload = {
                    "recipient": mobile,
                    "message": message
                }
                response = requests.post(url, json=payload, headers=headers, timeout=10)
                
                # If token expired, try to refresh
                if response.status_code == 401:
                    refresh_token = company_doc.get("hutch_refresh_token")
                    if refresh_token:
                        refresh_url = "https://bsms.hutch.lk/api/token/accessToken"
                        refresh_headers = {"Authorization": f"Bearer {refresh_token}"}
                        refresh_response = requests.post(refresh_url, headers=refresh_headers, timeout=10)
                        
                        if refresh_response.status_code == 200:
                            new_token = refresh_response.json().get("accessToken")
                            # Update token in database
                            db.companies.update_one(
                                {"id": company_id},
                                {"$set": {"hutch_access_token": new_token}}
                            )
                            # Retry send
                            headers["Authorization"] = f"Bearer {new_token}"
                            response = requests.post(url, json=payload, headers=headers, timeout=10)
                
                return response.status_code == 200
            
            elif gateway == "mobitel":
                app_id = company_doc.get("mobitel_app_id")
                app_key = company_doc.get("mobitel_app_key")
                client_id = company_doc.get("mobitel_client_id")
                
                if not all([app_id, app_key, client_id]):
                    logging.error("Mobitel SMS: Missing credentials")
                    return False
                
                url = "https://apphub.mobitel.lk/mobext/mapi/mspacesms/send"
                headers = {
                    "x-ibm-client-id": client_id,
                    "content-type": "application/json"
                }
                payload = {
                    "recipientMask": mobile,
                    "message": message,
                    "characterEncoding": "ascii",
                    "appID": app_id,
                    "appKey": app_key
                }
                response = requests.post(url, json=payload, headers=headers, timeout=10)
                return response.status_code == 200
            
        else:
            # System-wide gateway (for LOGIN OTP)
            url = "https://www.textit.biz/sendmsg"
            params = {"id": DEFAULT_SMS_USERNAME, "pw": DEFAULT_SMS_PASSWORD, "to": mobile, "text": message}
            response = requests.get(url, params=params, timeout=10)
            return response.status_code == 200
            
    except Exception as e:
        logging.error(f"SMS send error: {str(e)}")
        return False

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

async def log_activity(company_id: str, user_id: str, user_name: str, action: str, details: str):
    log = ActivityLog(
        company_id=company_id,
        user_id=user_id,
        user_name=user_name,
        action=action,
        details=details
    )
    await db.activity_logs.insert_one(log.model_dump())

# ============= AUTH ENDPOINTS =============
@api_router.post("/auth/send-otp")
async def send_otp(request: OTPRequest):
    if len(request.mobile) != 10 or not request.mobile.isdigit():
        raise HTTPException(status_code=400, detail="Invalid mobile number")
    
    user = await db.users.find_one({"mobile": request.mobile}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    otp_code = str(random.randint(100000, 999999))
    
    otp_doc = {
        "mobile": request.mobile,
        "otp": otp_code,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
        "verified": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.otps.insert_one(otp_doc)
    
    # Send SMS - LOGIN OTP always uses system-wide gateway (not company-specific)
    message = f"Your OTP for IT Signature ERP is: {otp_code}. Valid for 5 minutes."
    sms_sent = send_sms(request.mobile, message, None)  # None = use default system gateway
    
    return {"message": "OTP sent successfully", "sms_sent": sms_sent}

@api_router.post("/auth/verify-otp")
async def verify_otp(request: OTPVerify):
    otp_doc = await db.otps.find_one(
        {"mobile": request.mobile, "otp": request.otp, "verified": False},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    if not otp_doc:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    expires_at = datetime.fromisoformat(otp_doc["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="OTP expired")
    
    await db.otps.update_one(
        {"mobile": request.mobile, "otp": request.otp},
        {"$set": {"verified": True}}
    )
    
    # Check for multiple roles
    users = await db.users.find({"mobile": request.mobile}, {"_id": 0}).to_list(10)
    if not users:
        raise HTTPException(status_code=404, detail="User not found")
    
    has_super_admin = any(u["role"] == "super_admin" for u in users)
    has_company_role = any(u["role"] != "super_admin" for u in users)
    
    if has_super_admin and has_company_role and not request.login_as:
        return {
            "require_selection": True,
            "message": "This number has multiple access levels",
            "options": [{"value": "super_admin", "label": "Super Admin"}, {"value": "company", "label": "Company Portal"}]
        }
    
    # Select user
    if request.login_as == "super_admin":
        user = next((u for u in users if u["role"] == "super_admin"), None)
    elif request.login_as == "company" or not has_super_admin:
        user = next((u for u in users if u["role"] != "super_admin"), None)
    else:
        user = users[0]
    
    if not user:
        raise HTTPException(status_code=404, detail="User access not found")
    
    # Update last login
    if user.get("company_id"):
        await db.companies.update_one(
            {"id": user["company_id"]},
            {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
        )
    
    token = create_access_token({"user_id": user["id"], "role": user["role"], "company_id": user.get("company_id")})
    
    return {"token": token, "user": user, "require_selection": False}

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ============= SUPER ADMIN ENDPOINTS =============
@api_router.post("/superadmin/companies", response_model=Company)
async def create_company(company: CompanyCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    existing = await db.companies.find_one({"admin_mobile": company.admin_mobile})
    if existing:
        raise HTTPException(status_code=400, detail="Mobile number already registered")
    
    company_obj = Company(**company.model_dump())
    await db.companies.insert_one(company_obj.model_dump())
    
    # Create admin user
    admin_user = User(
        company_id=company_obj.id,
        employee_id=f"ADMIN-{company_obj.id[:8]}",
        mobile=company.admin_mobile,
        name=company.admin_name,
        role="admin",
        join_date=datetime.now(timezone.utc).date().isoformat()
    )
    await db.users.insert_one(admin_user.model_dump())
    
    # Send SMS
    message = f"Welcome to IT Signature ERP! Your company '{company.name}' has been created. Login with mobile {company.admin_mobile}. URL: https://employee-pulse-13.preview.emergentagent.com"
    send_sms(company.admin_mobile, message)
    
    await log_activity("SUPER_ADMIN", current_user.id, current_user.name, "CREATE_COMPANY", f"Created company: {company.name}")
    
    return company_obj

@api_router.get("/superadmin/companies", response_model=List[Company])
async def get_all_companies(current_user: User = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    companies = await db.companies.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return companies

@api_router.get("/superadmin/companies/{company_id}")
async def get_company(company_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Get settings to include logo and favicon
    settings = await db.settings.find_one({"company_id": company_id}, {"_id": 0})
    
    company_data = Company(**company).model_dump()
    if settings:
        company_data["logo"] = settings.get("company_logo")
        company_data["favicon"] = settings.get("favicon")
    
    return company_data

@api_router.put("/superadmin/companies/{company_id}/status")
async def update_company_status(company_id: str, status: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    if status not in ["active", "suspended", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.companies.update_one(
        {"id": company_id},
        {"$set": {"status": status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    await log_activity("SUPER_ADMIN", current_user.id, current_user.name, "UPDATE_STATUS", f"Changed {company['name']} status to {status}")
    
    return {"message": f"Company status updated to {status}"}

@api_router.put("/superadmin/companies/{company_id}/sms")
async def update_company_sms(company_id: str, sms_settings: SMSSettings, current_user: User = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    result = await db.companies.update_one(
        {"id": company_id},
        {"$set": sms_settings.model_dump()}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    await log_activity("SUPER_ADMIN", current_user.id, current_user.name, "UPDATE_SMS", f"Updated SMS settings for {company['name']}")
    
    return {"message": "SMS settings updated"}

@api_router.get("/superadmin/admins")
async def get_super_admins(current_user: User = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    admins = await db.users.find({"role": "super_admin"}, {"_id": 0}).to_list(100)
    return admins

@api_router.post("/superadmin/admins")
async def create_super_admin(admin_data: UserCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Check if mobile already exists
    existing = await db.users.find_one({"mobile": admin_data.mobile})
    if existing:
        raise HTTPException(status_code=400, detail="Mobile number already registered")
    
    # Create super admin
    new_admin = User(
        company_id=None,
        employee_id=admin_data.employee_id,
        mobile=admin_data.mobile,
        name=admin_data.name,
        role="super_admin",
        join_date=datetime.now(timezone.utc).date().isoformat()
    )
    
    await db.users.insert_one(new_admin.model_dump())
    await log_activity("SUPER_ADMIN", current_user.id, current_user.name, "CREATE_SUPER_ADMIN", f"Created super admin: {admin_data.name}")
    
    return new_admin

@api_router.delete("/superadmin/admins/{admin_id}")
async def delete_super_admin(admin_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Check if trying to delete self
    if admin_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    # Check if last super admin
    super_admin_count = await db.users.count_documents({"role": "super_admin"})
    if super_admin_count <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last super admin")
    
    admin = await db.users.find_one({"id": admin_id, "role": "super_admin"})
    if not admin:
        raise HTTPException(status_code=404, detail="Super admin not found")
    
    await db.users.delete_one({"id": admin_id})
    await log_activity("SUPER_ADMIN", current_user.id, current_user.name, "DELETE_SUPER_ADMIN", f"Deleted super admin: {admin['name']}")
    
    return {"message": "Super admin deleted successfully"}

@api_router.get("/superadmin/dashboard/stats")
async def get_superadmin_stats(current_user: User = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    total_companies = await db.companies.count_documents({})
    active_companies = await db.companies.count_documents({"status": "active"})
    pending_companies = await db.companies.count_documents({"status": "pending"})
    total_employees = await db.users.count_documents({"role": {"$ne": "super_admin"}})
    
    # Get companies with stats
    companies = await db.companies.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    company_stats = []
    
    for company in companies:
        emp_count = await db.users.count_documents({"company_id": company["id"]})
        
        company_stats.append({
            "company_id": company["id"],
            "name": company["name"],
            "admin_name": company["admin_name"],
            "admin_mobile": company["admin_mobile"],
            "status": company["status"],
            "employee_count": emp_count,
            "last_login": company.get("last_login"),
            "sms_enabled": company.get("sms_enabled", False),
            "created_at": company["created_at"]
        })
    
    return {
        "total_companies": total_companies,
        "active_companies": active_companies,
        "pending_companies": pending_companies,
        "total_employees": total_employees,
        "company_stats": company_stats
    }

# Settings Model
class CompanySettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    office_start_time: str = "09:00"
    office_end_time: str = "17:00"
    saturday_enabled: bool = True
    saturday_type: str = "full"
    saturday_start_time: str = "09:00"
    saturday_end_time: str = "14:00"
    working_days_per_month: int = 26
    holidays: List[dict] = []
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SettingsUpdate(BaseModel):
    office_start_time: Optional[str] = None
    office_end_time: Optional[str] = None
    saturday_enabled: Optional[bool] = None
    saturday_type: Optional[str] = None
    saturday_start_time: Optional[str] = None
    saturday_end_time: Optional[str] = None
    working_days_per_month: Optional[int] = None

class Holiday(BaseModel):
    date: str
    name: str
    type: str = "public"

# ============= COMPANY ENDPOINTS =============
@api_router.get("/company/info")
async def get_company_info(current_user: User = Depends(get_current_user)):
    if current_user.role == "super_admin":
        raise HTTPException(status_code=400, detail="Not applicable for super admin")
    
    company = await db.companies.find_one({"id": current_user.company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Get settings to include logo and favicon
    settings = await db.settings.find_one({"company_id": current_user.company_id}, {"_id": 0})
    
    company_data = Company(**company).model_dump()
    if settings:
        company_data["logo"] = settings.get("company_logo")
        company_data["favicon"] = settings.get("favicon")
    
    return company_data

@api_router.put("/company/info")
async def update_company_info(info: CompanyInfoUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin or manager access required")
    
    result = await db.companies.update_one(
        {"id": current_user.company_id},
        {"$set": {
            "name": info.name,
            "address": info.address,
            "contact_number": info.contact_number,
            "email": info.email,
            "company_info_completed": True
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Company not found")
    
    changes = f"Name: {info.name}, Address: {info.address}, Contact: {info.contact_number}, Email: {info.email}"
    await log_activity(current_user.company_id, current_user.id, current_user.name, "UPDATE_INFO", f"Updated company information - {changes}")
    
    return {"message": "Company information updated successfully"}

@api_router.get("/company/logs")
async def get_company_logs(limit: int = 100, current_user: User = Depends(get_current_user)):
    if current_user.role == "super_admin":
        raise HTTPException(status_code=400, detail="Not applicable for super admin")
    
    logs = await db.activity_logs.find(
        {"company_id": current_user.company_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return logs

@api_router.get("/activity-logs")
async def get_activity_logs(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    action_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "super_admin":
        raise HTTPException(status_code=403, detail="Super admin cannot access company logs directly. View via company portal.")
    
    query = {"company_id": current_user.company_id}
    
    # Filter by date range
    if from_date and to_date:
        query["timestamp"] = {"$gte": from_date, "$lte": to_date}
    elif from_date:
        query["timestamp"] = {"$gte": from_date}
    elif to_date:
        query["timestamp"] = {"$lte": to_date}
    
    # Filter by action type
    if action_type:
        query["action"] = {"$regex": action_type, "$options": "i"}
    
    # Search in user_name, action, or details
    if search:
        query["$or"] = [
            {"user_name": {"$regex": search, "$options": "i"}},
            {"action": {"$regex": search, "$options": "i"}},
            {"details": {"$regex": search, "$options": "i"}}
        ]
    
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return logs

# ============= DASHBOARD ENDPOINTS =============
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    if current_user.role == "super_admin":
        raise HTTPException(status_code=400, detail="Not applicable for super admin")
    
    if current_user.role in ["admin", "manager"]:
        # Admin/Manager stats
        total_employees = await db.users.count_documents({"company_id": current_user.company_id, "is_active": True})
        total_attendance_today = await db.attendance.count_documents({"company_id": current_user.company_id, "date": datetime.now(timezone.utc).date().isoformat()})
        pending_leaves = await db.leaves.count_documents({"company_id": current_user.company_id, "status": "pending"})
        pending_advances = await db.advances.count_documents({"company_id": current_user.company_id, "status": "pending"})
        
        # Recent activities
        recent_leaves = await db.leaves.find({"company_id": current_user.company_id}, {"_id": 0}).sort("applied_date", -1).limit(5).to_list(5)
        recent_advances = await db.advances.find({"company_id": current_user.company_id}, {"_id": 0}).sort("request_date", -1).limit(5).to_list(5)
        
        # Current month salary summary
        current_month = datetime.now(timezone.utc).strftime("%B")
        current_year = datetime.now(timezone.utc).year
        
        monthly_payrolls = await db.payroll.find({
            "company_id": current_user.company_id,
            "month": current_month,
            "year": current_year
        }, {"_id": 0}).to_list(1000)
        
        # Calculate monthly stats
        total_expected_salary = sum(p.get("expected_salary", 0) for p in monthly_payrolls)
        total_calculated_salary = sum(p.get("calculated_salary", 0) for p in monthly_payrolls)
        total_net_salary = sum(p.get("net_salary", 0) for p in monthly_payrolls)
        
        # Current month attendance summary (last 7 days)
        from datetime import timedelta
        today = datetime.now(timezone.utc).date()
        last_7_days = [(today - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]
        
        attendance_summary = []
        for date in last_7_days:
            count = await db.attendance.count_documents({
                "company_id": current_user.company_id,
                "date": date
            })
            attendance_summary.append({
                "date": date,
                "count": count
            })
        
        return {
            "total_employees": total_employees,
            "attendance_today": total_attendance_today,
            "pending_leaves": pending_leaves,
            "pending_advances": pending_advances,
            "recent_leaves": recent_leaves,
            "recent_advances": recent_advances,
            "monthly_salary_summary": {
                "month": current_month,
                "year": current_year,
                "total_expected": total_expected_salary,
                "total_calculated": total_calculated_salary,
                "total_net": total_net_salary,
                "employee_count": len(monthly_payrolls)
            },
            "attendance_summary": attendance_summary
        }
    else:
        # Employee/Staff stats
        my_attendance = await db.attendance.count_documents({"company_id": current_user.company_id, "employee_id": current_user.id})
        my_leaves = await db.leaves.find({"company_id": current_user.company_id, "employee_id": current_user.id}, {"_id": 0}).to_list(100)
        my_advances = await db.advances.find({"company_id": current_user.company_id, "employee_id": current_user.id}, {"_id": 0}).to_list(100)
        my_payroll = await db.payroll.find({"company_id": current_user.company_id, "employee_id": current_user.id}, {"_id": 0}).sort("generated_at", -1).limit(1).to_list(1)
        
        # Check today's attendance
        today = datetime.now(timezone.utc).date().isoformat()
        today_attendance = await db.attendance.find_one({"company_id": current_user.company_id, "employee_id": current_user.id, "date": today}, {"_id": 0})
        
        return {
            "total_attendance_days": my_attendance,
            "total_leaves": len(my_leaves),
            "approved_leaves": len([l for l in my_leaves if l["status"] == "approved"]),
            "total_advances": len(my_advances),
            "approved_advances": sum(a["amount"] for a in my_advances if a["status"] == "approved"),
            "latest_payroll": my_payroll[0] if my_payroll else None,
            "today_attendance": today_attendance
        }

# ============= EMPLOYEE ENDPOINTS =============
@api_router.get("/employees")
async def get_employees(current_user: User = Depends(get_current_user)):
    if current_user.role == "super_admin":
        raise HTTPException(status_code=403, detail="Super admin cannot access company employees")
    
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin or manager access required")
    
    employees = await db.users.find(
        {"company_id": current_user.company_id, "role": {"$ne": "super_admin"}},
        {"_id": 0}
    ).to_list(1000)
    
    return employees

@api_router.post("/employees")
async def create_employee(employee: UserCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin or manager access required")
    
    # Check if employee already exists
    existing = await db.users.find_one({"mobile": employee.mobile, "company_id": current_user.company_id})
    if existing:
        raise HTTPException(status_code=400, detail="Employee with this mobile number already exists")
    
    # Get company settings for default times
    settings = await db.settings.find_one({"company_id": current_user.company_id})
    default_start_time = settings.get("office_start_time", "09:00") if settings else "09:00"
    default_finish_time = settings.get("office_end_time", "17:00") if settings else "17:00"
    
    # Create new employee
    new_employee = User(
        id=str(uuid.uuid4()),
        company_id=current_user.company_id,
        employee_id=employee.employee_id or f"EMP-{str(uuid.uuid4())[:8]}",
        mobile=employee.mobile,
        name=capitalize_name(employee.name),
        role=employee.role,
        department=employee.department or "",
        position=employee.position or "",
        basic_salary=employee.basic_salary or 0,
        allowances=employee.allowances or 0,
        join_date=employee.join_date,
        start_time=employee.start_time or default_start_time,
        finish_time=employee.finish_time or default_finish_time,
        fixed_salary=employee.fixed_salary or False,
        is_active=True,
        created_at=datetime.now(timezone.utc).isoformat()
    )
    
    await db.users.insert_one(new_employee.model_dump())
    await log_activity(current_user.company_id, current_user.id, current_user.name, "CREATE_EMPLOYEE", f"Created employee: {capitalize_name(employee.name)}, Role: {employee.role}, Mobile: {employee.mobile}, Department: {employee.department or 'N/A'}")
    
    return new_employee

@api_router.put("/employees/{employee_id}")
async def update_employee(employee_id: str, updates: dict, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin or manager access required")
    
    # Check if employee exists and belongs to the same company
    employee = await db.users.find_one({"id": employee_id, "company_id": current_user.company_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Update employee
    await db.users.update_one(
        {"id": employee_id},
        {"$set": updates}
    )
    
    await log_activity(current_user.company_id, current_user.id, current_user.name, "UPDATE_EMPLOYEE", f"Updated employee: {employee['name']}. Changes: {', '.join([f'{k}={v}' for k, v in updates.items() if k not in ['_id', 'created_at']])}")
    
    return {"message": "Employee updated successfully"}

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if employee exists and belongs to the same company
    employee = await db.users.find_one({"id": employee_id, "company_id": current_user.company_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Soft delete - mark as inactive
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {"is_active": False}}
    )
    
    await log_activity(current_user.company_id, current_user.id, current_user.name, "DELETE_EMPLOYEE", f"Deleted employee: {employee['name']}, ID: {employee.get('employee_id', 'N/A')}, Role: {employee.get('role', 'N/A')}")
    
    return {"message": "Employee deleted successfully"}

# ============= ATTENDANCE ENDPOINTS =============
@api_router.get("/attendance")
async def get_attendance(
    employee_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "super_admin":
        raise HTTPException(status_code=403, detail="Super admin cannot access company attendance")
    
    query = {"company_id": current_user.company_id}
    
    # Filter by employee if provided
    if employee_id:
        query["employee_id"] = employee_id
    elif current_user.role not in ["admin", "manager"]:
        # Regular employees can only see their own attendance
        query["employee_id"] = current_user.id
    
    # Filter by date range if provided
    if from_date and to_date:
        query["date"] = {"$gte": from_date, "$lte": to_date}
    elif from_date:
        query["date"] = {"$gte": from_date}
    elif to_date:
        query["date"] = {"$lte": to_date}
    
    attendance = await db.attendance.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    
    return attendance

@api_router.post("/attendance")
async def add_manual_attendance(attendance_data: dict, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin or manager access required")
    
    # Validate employee belongs to same company
    employee = await db.users.find_one({"id": attendance_data["employee_id"], "company_id": current_user.company_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check if attendance already exists for this date
    existing = await db.attendance.find_one({
        "company_id": current_user.company_id,
        "employee_id": attendance_data["employee_id"],
        "date": attendance_data["date"]
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Attendance already exists for this date")
    
    # Create attendance record
    # Combine date with times to create ISO datetime strings
    check_in_datetime = None
    check_out_datetime = None
    
    if attendance_data.get("check_in"):
        check_in_datetime = f"{attendance_data['date']}T{attendance_data['check_in']}:00"
    
    if attendance_data.get("check_out"):
        check_out_datetime = f"{attendance_data['date']}T{attendance_data['check_out']}:00"
    
    new_attendance = {
        "id": str(uuid.uuid4()),
        "company_id": current_user.company_id,
        "employee_id": attendance_data["employee_id"],
        "employee_name": capitalize_name(employee["name"]),
        "date": attendance_data["date"],
        "check_in": check_in_datetime,
        "check_out": check_out_datetime,
        "status": attendance_data.get("status", "present"),
        "leave_type": attendance_data.get("leave_type"),
        "created_by": current_user.id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Store a copy for response before inserting (to avoid _id field)
    attendance_response = new_attendance.copy()
    
    await db.attendance.insert_one(new_attendance)
    await log_activity(current_user.company_id, current_user.id, current_user.name, "ADD_ATTENDANCE", f"Added attendance for {capitalize_name(employee['name'])} on {attendance_data['date']}, Status: {attendance_data.get('status', 'present')}, Check-in: {attendance_data.get('check_in', 'N/A')}, Check-out: {attendance_data.get('check_out', 'N/A')}")
    
    return {"message": "Attendance added successfully", "attendance": attendance_response}

@api_router.delete("/attendance/{attendance_id}")
async def delete_attendance(attendance_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin or manager access required")
    
    # Check if attendance exists and belongs to same company
    attendance = await db.attendance.find_one({"id": attendance_id, "company_id": current_user.company_id})
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    # Store in deleted_attendance collection
    deleted_record = {
        **attendance,
        "deleted_by": current_user.id,
        "deleted_by_name": current_user.name,
        "deleted_at": datetime.now(timezone.utc).isoformat()
    }
    await db.deleted_attendance.insert_one(deleted_record)
    
    # Delete from attendance
    await db.attendance.delete_one({"id": attendance_id})
    await log_activity(current_user.company_id, current_user.id, current_user.name, "DELETE_ATTENDANCE", f"Deleted attendance for {attendance.get('employee_name', 'employee')} on {attendance.get('date', 'N/A')}, Status: {attendance.get('status', 'N/A')}, Check-in: {attendance.get('check_in', 'N/A')}")
    
    return {"message": "Attendance deleted successfully"}

@api_router.get("/attendance/deleted")
async def get_deleted_attendance(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin or manager access required")
    
    deleted_records = await db.deleted_attendance.find(
        {"company_id": current_user.company_id},
        {"_id": 0}
    ).sort("deleted_at", -1).to_list(1000)
    
    return deleted_records

# ============= UTILITY FUNCTIONS =============
def capitalize_name(name: str) -> str:
    """Capitalize first letter of each word in a name"""
    return ' '.join(word.capitalize() for word in name.split())

def calculate_working_days(year: int, month: int, holidays: List[dict], saturday_enabled: bool = True, saturday_type: str = "full") -> dict:
    """
    Calculate working days for a given month considering:
    - Sundays (weekly off)
    - Public holidays from holiday calendar
    - Saturday settings (full day, half day, or off)
    """
    import calendar
    from datetime import date
    
    # Get total days in month
    total_days = calendar.monthrange(year, month)[1]
    
    # Count working days
    working_days = 0
    half_days = 0
    
    # Convert holidays to date strings for comparison
    holiday_dates = set()
    for holiday in holidays:
        try:
            holiday_date = datetime.fromisoformat(holiday['date']).date()
            if holiday_date.year == year and holiday_date.month == month:
                holiday_dates.add(holiday['date'])
        except:
            continue
    
    for day in range(1, total_days + 1):
        current_date = date(year, month, day)
        date_str = current_date.isoformat()
        weekday = current_date.weekday()  # 0=Monday, 6=Sunday
        
        # Skip Sundays
        if weekday == 6:
            continue
        
        # Skip holidays
        if date_str in holiday_dates:
            continue
        
        # Handle Saturday
        if weekday == 5:  # Saturday
            if not saturday_enabled:
                continue
            elif saturday_type == "half":
                half_days += 1
            else:  # full day
                working_days += 1
        else:
            working_days += 1
    
    # Convert half days to working days (2 half days = 1 full day)
    total_working_days = working_days + (half_days * 0.5)
    
    return {
        "total_days": total_days,
        "working_days": round(total_working_days, 1),
        "full_days": working_days,
        "half_days": half_days,
        "holidays": len(holiday_dates),
        "sundays": sum(1 for day in range(1, total_days + 1) if date(year, month, day).weekday() == 6)
    }

# ============= SETTINGS ENDPOINTS =============
@api_router.get("/settings")
async def get_settings(current_user: User = Depends(get_current_user)):
    if current_user.role == "super_admin":
        raise HTTPException(status_code=400, detail="Not applicable for super admin")
    
    settings = await db.settings.find_one({"company_id": current_user.company_id}, {"_id": 0})
    
    if not settings:
        # Create default settings
        default_settings = CompanySettings(company_id=current_user.company_id)
        await db.settings.insert_one(default_settings.model_dump())
        return default_settings
    
    return CompanySettings(**settings)

@api_router.put("/settings")
async def update_settings(updates: SettingsUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin or manager access required")
    
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Create detailed log of changes
    settings_changes = ', '.join([f'{k}: {v}' for k, v in update_data.items() if k not in ['updated_at', '_id']])
    
    result = await db.settings.update_one(
        {"company_id": current_user.company_id},
        {"$set": update_data},
        upsert=True
    )
    
    # Log activity regardless of whether it was an insert or update
    await log_activity(current_user.company_id, current_user.id, current_user.name, "UPDATE_SETTINGS", f"Updated settings: {settings_changes}")
    
    return {"message": "Settings updated successfully"}

@api_router.post("/settings/holidays")
async def add_holiday(holiday: Holiday, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin or manager access required")
    
    result = await db.settings.update_one(
        {"company_id": current_user.company_id},
        {"$push": {"holidays": holiday.model_dump()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    await log_activity(current_user.company_id, current_user.id, current_user.name, "ADD_HOLIDAY", f"Added holiday: {holiday.name} on {holiday.date}, Type: {holiday.type}")
    
    return {"message": "Holiday added successfully"}

@api_router.delete("/settings/holidays/{date}")
async def delete_holiday(date: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin or manager access required")
    
    result = await db.settings.update_one(
        {"company_id": current_user.company_id},
        {"$pull": {"holidays": {"date": date}}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    holiday_name = next((h['name'] for h in holidays if h['date'] == date), 'Unknown')
    await log_activity(current_user.company_id, current_user.id, current_user.name, "DELETE_HOLIDAY", f"Removed holiday: {holiday_name} on {date}")
    
    return {"message": "Holiday removed successfully"}

@api_router.get("/settings/working-days/{year}/{month}")
async def get_working_days(year: int, month: int, current_user: User = Depends(get_current_user)):
    if current_user.role == "super_admin":
        raise HTTPException(status_code=400, detail="Not applicable for super admin")
    
    # Get company settings
    settings = await db.settings.find_one({"company_id": current_user.company_id}, {"_id": 0})
    
    if not settings:
        # Use default settings
        holidays = []
        saturday_enabled = True
        saturday_type = "full"
    else:
        holidays = settings.get("holidays", [])
        saturday_enabled = settings.get("saturday_enabled", True)
        saturday_type = settings.get("saturday_type", "full")
    
    # Calculate working days
    result = calculate_working_days(year, month, holidays, saturday_enabled, saturday_type)
    
    return result

# ============= BRANDING ENDPOINTS =============
@api_router.post("/company/branding")
async def upload_branding(file: UploadFile = File(...), type: str = Form(...), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin or manager access required")
    
    if type not in ["logo", "favicon"]:
        raise HTTPException(status_code=400, detail="Invalid type. Must be 'logo' or 'favicon'")
    
    try:
        # Read file and convert to base64
        contents = await file.read()
        base64_image = base64.b64encode(contents).decode('utf-8')
        data_url = f"data:{file.content_type};base64,{base64_image}"
        
        # Update settings with the uploaded image
        field_name = "company_logo" if type == "logo" else "favicon"
        await db.settings.update_one(
            {"company_id": current_user.company_id},
            {"$set": {field_name: data_url}},
            upsert=True
        )
        
        await log_activity(current_user.company_id, current_user.id, current_user.name, f"UPLOAD_{type.upper()}", f"Uploaded company {type}, File: {file.filename}, Size: {len(contents)} bytes, Type: {file.content_type}")
        
        return {"message": f"{type.capitalize()} uploaded successfully", field_name: data_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/superadmin/branding")
async def upload_superadmin_branding(
    file: UploadFile = File(...), 
    type: str = Form(...), 
    company_id: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    if type not in ["logo", "favicon"]:
        raise HTTPException(status_code=400, detail="Invalid type. Must be 'logo' or 'favicon'")
    
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id})
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Read file and convert to base64
        contents = await file.read()
        base64_image = base64.b64encode(contents).decode('utf-8')
        data_url = f"data:{file.content_type};base64,{base64_image}"
        
        # Update settings with the uploaded image
        field_name = "company_logo" if type == "logo" else "favicon"
        await db.settings.update_one(
            {"company_id": company_id},
            {"$set": {field_name: data_url}},
            upsert=True
        )
        
        await log_activity("SUPER_ADMIN", current_user.id, current_user.name, f"UPLOAD_{type.upper()}", f"Uploaded {type} for company {company['name']}")
        
        return {"message": f"{type.capitalize()} uploaded successfully for {company['name']}", field_name: data_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= PROFILE PICTURE ENDPOINTS =============
@api_router.post("/employees/profile-picture")
async def upload_employee_profile_pic(
    file: UploadFile = File(...),
    employee_id: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin or manager access required")
    
    try:
        # Read file and convert to base64
        contents = await file.read()
        base64_image = base64.b64encode(contents).decode('utf-8')
        data_url = f"data:{file.content_type};base64,{base64_image}"
        
        # Update employee profile picture
        await db.users.update_one(
            {"id": employee_id, "company_id": current_user.company_id},
            {"$set": {"profile_pic": data_url}}
        )
        
        employee = await db.users.find_one({"id": employee_id, "company_id": current_user.company_id})
        await log_activity(current_user.company_id, current_user.id, current_user.name, "UPLOAD_PROFILE_PIC", f"Uploaded profile picture for employee: {employee.get('name', 'Unknown')}, Size: {len(contents)} bytes")
        
        return {"message": "Profile picture uploaded successfully", "profile_pic": data_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/upload/profile-pic")
async def upload_profile_pic(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    try:
        # Read file and convert to base64
        contents = await file.read()
        base64_image = base64.b64encode(contents).decode('utf-8')
        data_url = f"data:{file.content_type};base64,{base64_image}"
        
        # Update user profile picture
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": {"profile_pic": data_url}}
        )
        
        await log_activity(current_user.company_id or "SUPER_ADMIN", current_user.id, current_user.name, "UPDATE_PROFILE_PIC", "Updated profile picture")
        
        return {"message": "Profile picture uploaded successfully", "profile_pic": data_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
