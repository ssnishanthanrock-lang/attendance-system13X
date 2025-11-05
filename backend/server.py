from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
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
    sms_username: Optional[str] = None
    sms_password: Optional[str] = None
    sms_api_key: Optional[str] = None

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: Optional[str] = None
    employee_id: str
    mobile: str
    name: str
    role: str  # super_admin, admin, manager, employee, staff_member
    department: Optional[str] = None
    position: Optional[str] = None
    basic_salary: float = 0.0
    allowances: float = 0.0
    join_date: str
    profile_pic: Optional[str] = None
    custom_start_time: Optional[str] = None
    custom_end_time: Optional[str] = None
    ot_allowed: bool = False
    sms_notifications: bool = False
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserCreate(BaseModel):
    employee_id: str
    mobile: str
    name: str
    role: str
    department: Optional[str] = None
    position: Optional[str] = None
    basic_salary: float = 0.0
    allowances: float = 0.0
    join_date: str

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
    description: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============= HELPER FUNCTIONS =============
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def send_sms(mobile: str, message: str, company_id: Optional[str] = None):
    try:
        if company_id:
            company_doc = db.companies.find_one({"id": company_id})
            if company_doc and company_doc.get("sms_enabled"):
                username = company_doc.get("sms_username") or DEFAULT_SMS_USERNAME
                password = company_doc.get("sms_password") or DEFAULT_SMS_PASSWORD
            else:
                return False
        else:
            username = DEFAULT_SMS_USERNAME
            password = DEFAULT_SMS_PASSWORD
        
        url = "https://www.textit.biz/sendmsg"
        params = {"id": username, "pw": password, "to": mobile, "text": message}
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

async def log_activity(company_id: str, user_id: str, user_name: str, action: str, description: str):
    log = ActivityLog(
        company_id=company_id,
        user_id=user_id,
        user_name=user_name,
        action=action,
        description=description
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
    message = f"Welcome to IT Signature ERP! Your company '{company.name}' has been created. Login with mobile {company.admin_mobile}. URL: https://employee-pulse-12.preview.emergentagent.com"
    send_sms(company.admin_mobile, message)
    
    await log_activity("SUPER_ADMIN", current_user.id, current_user.name, "CREATE_COMPANY", f"Created company: {company.name}")
    
    return company_obj

@api_router.get("/superadmin/companies", response_model=List[Company])
async def get_all_companies(current_user: User = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    companies = await db.companies.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return companies

@api_router.get("/superadmin/companies/{company_id}", response_model=Company)
async def get_company(company_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return Company(**company)

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
    
    return Company(**company)

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
    
    await log_activity(current_user.company_id, current_user.id, current_user.name, "UPDATE_INFO", "Updated company information")
    
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
    
    result = await db.settings.update_one(
        {"company_id": current_user.company_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    await log_activity(current_user.company_id, current_user.id, current_user.name, "UPDATE_SETTINGS", "Updated company settings")
    
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
    
    await log_activity(current_user.company_id, current_user.id, current_user.name, "ADD_HOLIDAY", f"Added holiday: {holiday.name}")
    
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
    
    await log_activity(current_user.company_id, current_user.id, current_user.name, "DELETE_HOLIDAY", f"Removed holiday on {date}")
    
    return {"message": "Holiday removed successfully"}

# ============= PROFILE PICTURE ENDPOINTS =============
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
