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

# Models
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
    sms_gateway: str = "textit"  # textit, dialog, hutch, mobitel, disabled
    sms_enabled: bool = False
    sms_username: Optional[str] = None
    sms_password: Optional[str] = None
    sms_api_key: Optional[str] = None
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

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: Optional[str] = None  # None for super admin
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
    custom_start_time: Optional[str] = None  # e.g., "09:30"
    custom_end_time: Optional[str] = None  # e.g., "18:00"
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
    custom_start_time: Optional[str] = None
    custom_end_time: Optional[str] = None
    ot_allowed: bool = False
    sms_notifications: bool = False

class OTPRequest(BaseModel):
    mobile: str

class OTPVerify(BaseModel):
    mobile: str
    otp: str
    login_as: Optional[str] = None  # "super_admin" or "company"

class CompanySettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    office_start_time: str = "09:00"
    office_end_time: str = "17:00"
    saturday_enabled: bool = True
    saturday_type: str = "full"  # full or half
    saturday_start_time: str = "09:00"
    saturday_end_time: str = "14:00"
    working_days_per_month: int = 26
    holidays: List[dict] = []  # [{"date": "2024-11-05", "name": "Poya Day"}]
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
    type: str = "public"  # public, poya, company

class Attendance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    employee_id: str
    employee_name: str
    date: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    status: str = "present"  # present, absent, half_day, late
    is_late: bool = False
    late_minutes: int = 0
    deduction_amount: float = 0.0
    notes: Optional[str] = None
    entered_by: Optional[str] = None  # For manual entry
    sms_sent: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ManualAttendanceEntry(BaseModel):
    employee_id: str
    date: str
    check_in: str
    check_out: Optional[str] = None
    notes: Optional[str] = None
    send_sms: bool = False

class ActivityLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    user_id: str
    user_name: str
    action: str
    description: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Helper Functions
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
            # Get company SMS settings
            company = db.companies.find_one({"id": company_id})
            if not company or not company.get("sms_enabled"):
                return False
            
            gateway = company.get("sms_gateway", "textit")
            username = company.get("sms_username") or DEFAULT_SMS_USERNAME
            password = company.get("sms_password") or DEFAULT_SMS_PASSWORD
        else:
            gateway = "textit"
            username = DEFAULT_SMS_USERNAME
            password = DEFAULT_SMS_PASSWORD
        
        if gateway == "textit":
            url = "https://www.textit.biz/sendmsg"
            params = {"id": username, "pw": password, "to": mobile, "text": message}
            response = requests.get(url, params=params, timeout=10)
            return response.status_code == 200
        # Add other gateways (dialog, hutch, mobitel) here
        
        return False
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
    """Log user activity"""
    log = ActivityLog(
        company_id=company_id,
        user_id=user_id,
        user_name=user_name,
        action=action,
        description=description
    )
    await db.activity_logs.insert_one(log.model_dump())

# Auth Endpoints
@api_router.post("/auth/send-otp")
async def send_otp(request: OTPRequest):
    if len(request.mobile) != 10 or not request.mobile.isdigit():
        raise HTTPException(status_code=400, detail="Invalid mobile number")
    
    # Check if user exists
    user = await db.users.find_one({"mobile": request.mobile}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate OTP
    otp_code = str(random.randint(100000, 999999))
    
    # Store OTP
    otp_doc = {
        "mobile": request.mobile,
        "otp": otp_code,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
        "verified": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.otps.insert_one(otp_doc)
    
    # Send SMS
    message = f"Your OTP for IT Signature ERP is: {otp_code}. Valid for 5 minutes."
    company_id = user.get("company_id") if user.get("role") != "super_admin" else None
    sms_sent = send_sms(request.mobile, message, company_id)
    
    return {"message": "OTP sent successfully", "sms_sent": sms_sent}

@api_router.post("/auth/verify-otp")
async def verify_otp(request: OTPVerify):
    # Find OTP
    otp_doc = await db.otps.find_one(
        {"mobile": request.mobile, "otp": request.otp, "verified": False},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    if not otp_doc:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Check expiration
    expires_at = datetime.fromisoformat(otp_doc["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="OTP expired")
    
    # Mark OTP as verified
    await db.otps.update_one(
        {"mobile": request.mobile, "otp": request.otp},
        {"$set": {"verified": True}}
    )
    
    # Get user - check if they have multiple roles
    users = await db.users.find({"mobile": request.mobile}, {"_id": 0}).to_list(10)
    if not users:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has both super_admin and company role
    has_super_admin = any(u["role"] == "super_admin" for u in users)
    has_company_role = any(u["role"] != "super_admin" for u in users)
    
    if has_super_admin and has_company_role and not request.login_as:
        return {
            "require_selection": True,
            "message": "This number has multiple access levels. Please select login type.",
            "options": ["super_admin", "company"]
        }
    
    # Select appropriate user
    if request.login_as == "super_admin":
        user = next((u for u in users if u["role"] == "super_admin"), None)
    elif request.login_as == "company" or not has_super_admin:
        user = next((u for u in users if u["role"] != "super_admin"), None)
    else:
        user = users[0]
    
    if not user:
        raise HTTPException(status_code=404, detail="User access not found")
    
    # Update last login for company
    if user.get("company_id"):
        await db.companies.update_one(
            {"id": user["company_id"]},
            {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
        )
    
    # Create token
    token = create_access_token({"user_id": user["id"], "role": user["role"], "company_id": user.get("company_id")})
    
    return {"token": token, "user": user, "require_selection": False}

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Super Admin - Company Management
@api_router.post("/superadmin/companies", response_model=Company)
async def create_company(company: CompanyCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Check if mobile already used
    existing = await db.companies.find_one({"admin_mobile": company.admin_mobile})
    if existing:
        raise HTTPException(status_code=400, detail="Mobile number already registered")
    
    # Create company
    company_obj = Company(**company.model_dump())
    await db.companies.insert_one(company_obj.model_dump())
    
    # Create company admin user
    admin_user = User(
        company_id=company_obj.id,
        employee_id=f"ADMIN-{company_obj.id[:8]}",
        mobile=company.admin_mobile,
        name=company.admin_name,
        role="admin",
        join_date=datetime.now(timezone.utc).date().isoformat()
    )
    await db.users.insert_one(admin_user.model_dump())
    
    # Create default settings
    settings = CompanySettings(company_id=company_obj.id)
    await db.settings.insert_one(settings.model_dump())
    
    # Send SMS with login instructions
    message = f"Welcome to IT Signature ERP! Your company {company.name} has been created. Login at: https://employee-pulse-12.preview.emergentagent.com with mobile {company.admin_mobile}"
    send_sms(company.admin_mobile, message)
    
    await log_activity("SUPER_ADMIN", current_user.id, current_user.name, "CREATE_COMPANY", f"Created company: {company.name}")
    
    return company_obj

@api_router.get("/superadmin/companies", response_model=List[Company])
async def get_all_companies(current_user: User = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    companies = await db.companies.find({}, {"_id": 0}).to_list(1000)
    return companies

@api_router.get("/superadmin/companies/{company_id}", response_model=Company)
async def get_company_details(company_id: str, current_user: User = Depends(get_current_user)):
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
    await log_activity("SUPER_ADMIN", current_user.id, current_user.name, "UPDATE_COMPANY_STATUS", f"Changed company {company['name']} status to {status}")
    
    return {"message": f"Company status updated to {status}"}

@api_router.get("/superadmin/dashboard/stats")
async def get_superadmin_stats(current_user: User = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    total_companies = await db.companies.count_documents({})
    active_companies = await db.companies.count_documents({"status": "active"})
    total_employees = await db.users.count_documents({"role": {"$ne": "super_admin"}})
    
    # Get companies with employee count
    companies = await db.companies.find({"status": "active"}, {"_id": 0}).to_list(100)
    company_stats = []
    
    for company in companies:
        emp_count = await db.users.count_documents({"company_id": company["id"]})
        today = datetime.now(timezone.utc).date().isoformat()
        today_attendance = await db.attendance.count_documents({"company_id": company["id"], "date": today})
        
        company_stats.append({
            "company_id": company["id"],
            "name": company["name"],
            "employee_count": emp_count,
            "today_attendance": today_attendance,
            "last_login": company.get("last_login"),
            "sms_enabled": company.get("sms_enabled", False)
        })
    
    return {
        "total_companies": total_companies,
        "active_companies": active_companies,
        "total_employees": total_employees,
        "company_stats": company_stats
    }

# Company Onboarding
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
    
    await log_activity(current_user.company_id, current_user.id, current_user.name, "UPDATE_COMPANY_INFO", "Updated company information")
    
    return {"message": "Company information updated successfully"}

# Continue with remaining endpoints...
# (Employee management, Settings, Attendance, etc. will be added next)

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
