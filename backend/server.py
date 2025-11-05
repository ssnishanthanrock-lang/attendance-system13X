from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
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

# Textit.biz SMS Configuration
TEXTIT_USERNAME = os.environ.get('TEXTIT_USERNAME', '942021070701')
TEXTIT_PASSWORD = os.environ.get('TEXTIT_PASSWORD', '7470')

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    mobile: str
    name: str
    role: str  # admin, manager, employee, staff_member
    department: Optional[str] = None
    position: Optional[str] = None
    basic_salary: float = 0.0
    allowances: float = 0.0
    join_date: str
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

class Attendance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    employee_name: str
    date: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    status: str = "present"  # present, absent, half_day
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AttendanceCheckIn(BaseModel):
    notes: Optional[str] = None

class AttendanceCheckOut(BaseModel):
    notes: Optional[str] = None

class Leave(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    employee_name: str
    leave_type: str  # annual, casual, sick, no_pay
    from_date: str
    to_date: str
    reason: str
    status: str = "pending"  # pending, approved, rejected
    applied_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    approved_by: Optional[str] = None

class LeaveCreate(BaseModel):
    leave_type: str
    from_date: str
    to_date: str
    reason: str

class LeaveUpdate(BaseModel):
    status: str

class Advance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    employee_name: str
    amount: float
    reason: str
    request_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "pending"  # pending, approved, rejected
    approved_by: Optional[str] = None
    repayment_months: int = 1

class AdvanceCreate(BaseModel):
    amount: float
    reason: str
    repayment_months: int = 1

class AdvanceUpdate(BaseModel):
    status: str

class Increment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    employee_name: str
    previous_salary: float
    new_salary: float
    increment_amount: float
    effective_date: str
    reason: str
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class IncrementCreate(BaseModel):
    employee_id: str
    new_salary: float
    effective_date: str
    reason: str

class Payroll(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    employee_name: str
    month: str
    year: int
    basic_salary: float
    allowances: float
    deductions: float
    advances: float
    net_salary: float
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Helper Functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def send_sms_textit(mobile: str, message: str):
    """Send SMS via textit.biz HTTP API"""
    try:
        url = "https://www.textit.biz/sendmsg"
        params = {
            "id": TEXTIT_USERNAME,
            "pw": TEXTIT_PASSWORD,
            "to": mobile,
            "text": message
        }
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

# Auth Endpoints
@api_router.post("/auth/send-otp")
async def send_otp(request: OTPRequest):
    # Validate mobile number (10 digits for Sri Lanka)
    if len(request.mobile) != 10 or not request.mobile.isdigit():
        raise HTTPException(status_code=400, detail="Invalid mobile number. Must be 10 digits.")
    
    # Check if user exists
    user = await db.users.find_one({"mobile": request.mobile}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate OTP
    otp_code = str(random.randint(100000, 999999))
    
    # Store OTP in database
    otp_doc = {
        "mobile": request.mobile,
        "otp": otp_code,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
        "verified": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.otps.insert_one(otp_doc)
    
    # Send SMS
    message = f"Your OTP for Employee Attendance System is: {otp_code}. Valid for 5 minutes."
    sms_sent = send_sms_textit(request.mobile, message)
    
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
    
    # Get user
    user = await db.users.find_one({"mobile": request.mobile}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create token
    token = create_access_token({"user_id": user["id"], "role": user["role"]})
    
    return {"token": token, "user": user}

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Employee Endpoints
@api_router.post("/employees", response_model=User)
async def create_employee(employee: UserCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if employee_id or mobile already exists
    existing = await db.users.find_one(
        {"$or": [{"employee_id": employee.employee_id}, {"mobile": employee.mobile}]}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Employee ID or mobile already exists")
    
    user_obj = User(**employee.model_dump())
    doc = user_obj.model_dump()
    await db.users.insert_one(doc)
    return user_obj

@api_router.get("/employees", response_model=List[User])
async def get_employees(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    return users

@api_router.get("/employees/{employee_id}", response_model=User)
async def get_employee(employee_id: str, current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"id": employee_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    return User(**user)

@api_router.put("/employees/{employee_id}", response_model=User)
async def update_employee(employee_id: str, employee_update: UserCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user = await db.users.find_one({"id": employee_id})
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    update_data = employee_update.model_dump()
    await db.users.update_one({"id": employee_id}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": employee_id}, {"_id": 0})
    return User(**updated_user)

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can delete employees")
    
    result = await db.users.delete_one({"id": employee_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return {"message": "Employee deleted successfully"}

# Attendance Endpoints
@api_router.post("/attendance/checkin")
async def check_in(checkin_data: AttendanceCheckIn, current_user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    
    # Check if already checked in today
    existing = await db.attendance.find_one({
        "employee_id": current_user.id,
        "date": today
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Already checked in today")
    
    attendance = Attendance(
        employee_id=current_user.id,
        employee_name=current_user.name,
        date=today,
        check_in=datetime.now(timezone.utc).isoformat(),
        notes=checkin_data.notes
    )
    
    doc = attendance.model_dump()
    await db.attendance.insert_one(doc)
    return attendance

@api_router.post("/attendance/checkout")
async def check_out(checkout_data: AttendanceCheckOut, current_user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    
    # Find today's attendance
    attendance = await db.attendance.find_one({
        "employee_id": current_user.id,
        "date": today
    })
    
    if not attendance:
        raise HTTPException(status_code=400, detail="No check-in found for today")
    
    if attendance.get("check_out"):
        raise HTTPException(status_code=400, detail="Already checked out today")
    
    # Update check out time
    await db.attendance.update_one(
        {"employee_id": current_user.id, "date": today},
        {"$set": {
            "check_out": datetime.now(timezone.utc).isoformat(),
            "notes": checkout_data.notes if checkout_data.notes else attendance.get("notes")
        }}
    )
    
    updated = await db.attendance.find_one({"employee_id": current_user.id, "date": today}, {"_id": 0})
    return Attendance(**updated)

@api_router.get("/attendance", response_model=List[Attendance])
async def get_attendance(employee_id: Optional[str] = None, from_date: Optional[str] = None, to_date: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    
    if current_user.role in ["admin", "manager"]:
        if employee_id:
            query["employee_id"] = employee_id
    else:
        query["employee_id"] = current_user.id
    
    if from_date and to_date:
        query["date"] = {"$gte": from_date, "$lte": to_date}
    
    attendance_records = await db.attendance.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return attendance_records

@api_router.get("/attendance/my", response_model=List[Attendance])
async def get_my_attendance(current_user: User = Depends(get_current_user)):
    records = await db.attendance.find({"employee_id": current_user.id}, {"_id": 0}).sort("date", -1).to_list(100)
    return records

# Leave Endpoints
@api_router.post("/leaves", response_model=Leave)
async def create_leave(leave_data: LeaveCreate, current_user: User = Depends(get_current_user)):
    leave = Leave(
        employee_id=current_user.id,
        employee_name=current_user.name,
        **leave_data.model_dump()
    )
    
    doc = leave.model_dump()
    await db.leaves.insert_one(doc)
    return leave

@api_router.get("/leaves", response_model=List[Leave])
async def get_leaves(status: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    
    if current_user.role in ["admin", "manager"]:
        if status:
            query["status"] = status
    else:
        query["employee_id"] = current_user.id
        if status:
            query["status"] = status
    
    leaves = await db.leaves.find(query, {"_id": 0}).sort("applied_date", -1).to_list(1000)
    return leaves

@api_router.put("/leaves/{leave_id}", response_model=Leave)
async def update_leave_status(leave_id: str, leave_update: LeaveUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    leave = await db.leaves.find_one({"id": leave_id})
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    
    await db.leaves.update_one(
        {"id": leave_id},
        {"$set": {"status": leave_update.status, "approved_by": current_user.name}}
    )
    
    updated = await db.leaves.find_one({"id": leave_id}, {"_id": 0})
    return Leave(**updated)

# Advance Endpoints
@api_router.post("/advances", response_model=Advance)
async def create_advance(advance_data: AdvanceCreate, current_user: User = Depends(get_current_user)):
    advance = Advance(
        employee_id=current_user.id,
        employee_name=current_user.name,
        **advance_data.model_dump()
    )
    
    doc = advance.model_dump()
    await db.advances.insert_one(doc)
    return advance

@api_router.get("/advances", response_model=List[Advance])
async def get_advances(status: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    
    if current_user.role in ["admin", "manager"]:
        if status:
            query["status"] = status
    else:
        query["employee_id"] = current_user.id
        if status:
            query["status"] = status
    
    advances = await db.advances.find(query, {"_id": 0}).sort("request_date", -1).to_list(1000)
    return advances

@api_router.put("/advances/{advance_id}", response_model=Advance)
async def update_advance_status(advance_id: str, advance_update: AdvanceUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    advance = await db.advances.find_one({"id": advance_id})
    if not advance:
        raise HTTPException(status_code=404, detail="Advance not found")
    
    await db.advances.update_one(
        {"id": advance_id},
        {"$set": {"status": advance_update.status, "approved_by": current_user.name}}
    )
    
    updated = await db.advances.find_one({"id": advance_id}, {"_id": 0})
    return Advance(**updated)

# Increment Endpoints
@api_router.post("/increments", response_model=Increment)
async def create_increment(increment_data: IncrementCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get employee current salary
    employee = await db.users.find_one({"id": increment_data.employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    previous_salary = employee["basic_salary"]
    increment_amount = increment_data.new_salary - previous_salary
    
    increment = Increment(
        employee_id=increment_data.employee_id,
        employee_name=employee["name"],
        previous_salary=previous_salary,
        new_salary=increment_data.new_salary,
        increment_amount=increment_amount,
        effective_date=increment_data.effective_date,
        reason=increment_data.reason,
        created_by=current_user.name
    )
    
    # Update employee salary
    await db.users.update_one(
        {"id": increment_data.employee_id},
        {"$set": {"basic_salary": increment_data.new_salary}}
    )
    
    doc = increment.model_dump()
    await db.increments.insert_one(doc)
    return increment

@api_router.get("/increments", response_model=List[Increment])
async def get_increments(employee_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    
    if current_user.role in ["admin", "manager"]:
        if employee_id:
            query["employee_id"] = employee_id
    else:
        query["employee_id"] = current_user.id
    
    increments = await db.increments.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return increments

# Payroll Endpoints
@api_router.get("/payroll", response_model=List[Payroll])
async def get_payroll(month: Optional[str] = None, year: Optional[int] = None, employee_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    
    if current_user.role in ["admin", "manager"]:
        if employee_id:
            query["employee_id"] = employee_id
    else:
        query["employee_id"] = current_user.id
    
    if month:
        query["month"] = month
    if year:
        query["year"] = year
    
    payrolls = await db.payroll.find(query, {"_id": 0}).sort("generated_at", -1).to_list(1000)
    return payrolls

@api_router.post("/payroll/generate")
async def generate_payroll(month: str, year: int, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get all active employees
    employees = await db.users.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    payrolls_generated = []
    
    for employee in employees:
        # Get approved advances for this employee
        advances = await db.advances.find({
            "employee_id": employee["id"],
            "status": "approved"
        }).to_list(1000)
        
        total_advances = sum(adv["amount"] for adv in advances)
        
        # Calculate payroll
        basic_salary = employee.get("basic_salary", 0)
        allowances = employee.get("allowances", 0)
        deductions = 0  # Can be calculated based on business logic
        net_salary = basic_salary + allowances - deductions - total_advances
        
        payroll = Payroll(
            employee_id=employee["id"],
            employee_name=employee["name"],
            month=month,
            year=year,
            basic_salary=basic_salary,
            allowances=allowances,
            deductions=deductions,
            advances=total_advances,
            net_salary=net_salary
        )
        
        # Check if payroll already exists
        existing = await db.payroll.find_one({
            "employee_id": employee["id"],
            "month": month,
            "year": year
        })
        
        if not existing:
            doc = payroll.model_dump()
            await db.payroll.insert_one(doc)
            payrolls_generated.append(payroll)
    
    return {"message": f"Generated payroll for {len(payrolls_generated)} employees", "payrolls": payrolls_generated}

@api_router.get("/payroll/my", response_model=List[Payroll])
async def get_my_payroll(current_user: User = Depends(get_current_user)):
    payrolls = await db.payroll.find({"employee_id": current_user.id}, {"_id": 0}).sort("generated_at", -1).to_list(100)
    return payrolls

# Dashboard Endpoints
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    if current_user.role in ["admin", "manager"]:
        # Admin/Manager stats
        total_employees = await db.users.count_documents({"is_active": True})
        total_attendance_today = await db.attendance.count_documents({"date": datetime.now(timezone.utc).date().isoformat()})
        pending_leaves = await db.leaves.count_documents({"status": "pending"})
        pending_advances = await db.advances.count_documents({"status": "pending"})
        
        # Recent activities
        recent_leaves = await db.leaves.find({}, {"_id": 0}).sort("applied_date", -1).limit(5).to_list(5)
        recent_advances = await db.advances.find({}, {"_id": 0}).sort("request_date", -1).limit(5).to_list(5)
        
        return {
            "total_employees": total_employees,
            "attendance_today": total_attendance_today,
            "pending_leaves": pending_leaves,
            "pending_advances": pending_advances,
            "recent_leaves": recent_leaves,
            "recent_advances": recent_advances
        }
    else:
        # Employee/Staff stats
        my_attendance = await db.attendance.count_documents({"employee_id": current_user.id})
        my_leaves = await db.leaves.find({"employee_id": current_user.id}, {"_id": 0}).to_list(100)
        my_advances = await db.advances.find({"employee_id": current_user.id}, {"_id": 0}).to_list(100)
        my_payroll = await db.payroll.find({"employee_id": current_user.id}, {"_id": 0}).sort("generated_at", -1).limit(1).to_list(1)
        
        # Check today's attendance
        today = datetime.now(timezone.utc).date().isoformat()
        today_attendance = await db.attendance.find_one({"employee_id": current_user.id, "date": today}, {"_id": 0})
        
        return {
            "total_attendance_days": my_attendance,
            "total_leaves": len(my_leaves),
            "approved_leaves": len([l for l in my_leaves if l["status"] == "approved"]),
            "total_advances": len(my_advances),
            "approved_advances": sum(a["amount"] for a in my_advances if a["status"] == "approved"),
            "latest_payroll": my_payroll[0] if my_payroll else None,
            "today_attendance": today_attendance
        }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
