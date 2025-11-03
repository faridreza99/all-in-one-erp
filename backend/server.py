from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from enum import Enum
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from io import BytesIO
from fastapi.responses import StreamingResponse
import certifi

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection - handle both Mongo_URL and MONGO_URL
mongo_url = os.environ.get('MONGO_URL') or os.environ.get('Mongo_URL')
if not mongo_url:
    raise ValueError("MONGO_URL or Mongo_URL environment variable must be set")
# Add TLS configuration for MongoDB Atlas using certifi
client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
db = client[os.environ.get('DB_NAME', 'erp_db')]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ========== ENUMS ==========
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    TENANT_ADMIN = "tenant_admin"
    HEAD_OFFICE = "head_office"
    BRANCH_MANAGER = "branch_manager"
    STAFF = "staff"
    CASHIER = "cashier"
    TECHNICIAN = "technician"

class BusinessType(str, Enum):
    PHARMACY = "pharmacy"
    SALON = "salon"
    RESTAURANT = "restaurant"
    MOBILE_SHOP = "mobile_shop"
    GROCERY = "grocery"
    CLINIC = "clinic"
    ELECTRONICS = "electronics"
    FASHION = "fashion"
    STATIONERY = "stationery"
    HARDWARE = "hardware"
    FURNITURE = "furniture"
    GARAGE = "garage"
    WHOLESALE = "wholesale"
    ECOMMERCE = "ecommerce"
    REAL_ESTATE = "real_estate"

class RepairStatus(str, Enum):
    RECEIVED = "received"
    IN_REPAIR = "in_repair"
    READY = "ready"
    DELIVERED = "delivered"

class AppointmentStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class TableStatus(str, Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    RESERVED = "reserved"

# ========== MODELS ==========
class BaseDBModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TenantCreate(BaseModel):
    name: str
    email: EmailStr
    business_type: BusinessType
    admin_password: str

class Tenant(BaseDBModel):
    name: str
    email: EmailStr
    business_type: BusinessType
    modules_enabled: List[str] = []
    is_active: bool = True
    tenant_id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole
    tenant_id: Optional[str] = None

class User(BaseDBModel):
    email: EmailStr
    full_name: str
    role: UserRole
    tenant_id: Optional[str] = None
    branch_id: Optional[str] = None
    hashed_password: str
    is_active: bool = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class ProductCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    category: str
    price: float
    stock: int = 0
    description: Optional[str] = None
    # Pharmacy specific
    generic_name: Optional[str] = None
    brand: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[str] = None
    # Mobile shop specific
    imei: Optional[str] = None
    warranty_months: Optional[int] = None

class Product(BaseDBModel):
    tenant_id: str
    name: str
    sku: Optional[str] = None
    category: str
    price: float
    stock: int
    description: Optional[str] = None
    generic_name: Optional[str] = None
    brand: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[str] = None
    imei: Optional[str] = None
    warranty_months: Optional[int] = None

class ServiceCreate(BaseModel):
    name: str
    duration_minutes: int
    price: float
    description: Optional[str] = None

class Service(BaseDBModel):
    tenant_id: str
    name: str
    duration_minutes: int
    price: float
    description: Optional[str] = None

class AppointmentCreate(BaseModel):
    customer_name: str
    customer_phone: str
    service_id: str
    staff_id: Optional[str] = None
    appointment_date: str
    appointment_time: str
    notes: Optional[str] = None

class Appointment(BaseDBModel):
    tenant_id: str
    customer_name: str
    customer_phone: str
    service_id: str
    staff_id: Optional[str] = None
    appointment_date: str
    appointment_time: str
    status: AppointmentStatus = AppointmentStatus.PENDING
    notes: Optional[str] = None

class RepairTicketCreate(BaseModel):
    customer_name: str
    customer_phone: str
    device_model: str
    imei: Optional[str] = None
    issue_description: str
    estimated_cost: float

class RepairTicket(BaseDBModel):
    tenant_id: str
    ticket_number: str
    customer_name: str
    customer_phone: str
    device_model: str
    imei: Optional[str] = None
    issue_description: str
    estimated_cost: float
    status: RepairStatus = RepairStatus.RECEIVED

class TableCreate(BaseModel):
    table_number: str
    capacity: int

class Table(BaseDBModel):
    tenant_id: str
    table_number: str
    capacity: int
    status: TableStatus = TableStatus.AVAILABLE
    current_order_id: Optional[str] = None

class SaleItemCreate(BaseModel):
    product_id: str
    quantity: int
    price: float

class SaleCreate(BaseModel):
    items: List[SaleItemCreate]
    customer_name: Optional[str] = None
    payment_method: str = "cash"
    discount: float = 0
    tax: float = 0

class Sale(BaseDBModel):
    tenant_id: str
    sale_number: str
    items: List[Dict[str, Any]]
    subtotal: float
    discount: float
    tax: float
    total: float
    customer_name: Optional[str] = None
    payment_method: str

class DashboardStats(BaseModel):
    total_sales: float
    total_orders: int
    total_products: int
    low_stock_items: int
    today_sales: float
    monthly_sales: float

class SupplierCreate(BaseModel):
    name: str
    contact_person: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None

class Supplier(BaseDBModel):
    tenant_id: str
    name: str
    contact_person: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None

class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    credit_limit: float = 0

class Customer(BaseDBModel):
    tenant_id: str
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    credit_limit: float
    total_purchases: float = 0

class ExpenseCreate(BaseModel):
    category: str
    amount: float
    description: str
    date: str

class Expense(BaseDBModel):
    tenant_id: str
    category: str
    amount: float
    description: str
    date: str

class PurchaseCreate(BaseModel):
    supplier_id: str
    items: List[Dict[str, Any]]
    total_amount: float
    payment_status: str = "pending"

class Purchase(BaseDBModel):
    tenant_id: str
    purchase_number: str
    supplier_id: str
    items: List[Dict[str, Any]]
    total_amount: float
    payment_status: str

class DoctorCreate(BaseModel):
    name: str
    specialization: str
    phone: str
    email: Optional[str] = None
    consultation_fee: float
    available_days: List[str] = []

class Doctor(BaseDBModel):
    tenant_id: str
    name: str
    specialization: str
    phone: str
    email: Optional[str] = None
    consultation_fee: float
    available_days: List[str]

class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None

class Patient(BaseDBModel):
    tenant_id: str
    name: str
    age: int
    gender: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    medical_history: List[str] = []

class VehicleCreate(BaseModel):
    owner_name: str
    phone: str
    vehicle_number: str
    vehicle_model: str
    vehicle_type: str

class Vehicle(BaseDBModel):
    tenant_id: str
    owner_name: str
    phone: str
    vehicle_number: str
    vehicle_model: str
    vehicle_type: str
    service_history: List[str] = []

class PropertyCreate(BaseModel):
    property_name: str
    property_type: str
    address: str
    size: str
    rent_amount: float
    status: str = "available"

class Property(BaseDBModel):
    tenant_id: str
    property_name: str
    property_type: str
    address: str
    size: str
    rent_amount: float
    status: str

class ProductVariantCreate(BaseModel):
    product_id: str
    size: Optional[str] = None
    color: Optional[str] = None
    sku: str
    price: float
    stock: int

class ProductVariant(BaseDBModel):
    tenant_id: str
    product_id: str
    size: Optional[str] = None
    color: Optional[str] = None
    sku: str
    price: float
    stock: int

class OfferCreate(BaseModel):
    title: str
    discount_percentage: float
    start_date: str
    end_date: str
    applicable_categories: List[str] = []

class Offer(BaseDBModel):
    tenant_id: str
    title: str
    discount_percentage: float
    start_date: str
    end_date: str
    applicable_categories: List[str]
    is_active: bool = True

# ========== ELECTRONICS MODELS ==========
class WarrantyCreate(BaseModel):
    product_id: str
    serial_number: str
    customer_name: str
    customer_phone: str
    purchase_date: str
    warranty_period_months: int

class Warranty(BaseDBModel):
    tenant_id: str
    product_id: str
    serial_number: str
    customer_name: str
    customer_phone: str
    purchase_date: str
    warranty_period_months: int
    expiry_date: str
    is_active: bool = True

class ReturnRequestCreate(BaseModel):
    sale_id: str
    product_id: str
    reason: str
    refund_amount: float

class ReturnRequest(BaseDBModel):
    tenant_id: str
    sale_id: str
    product_id: str
    reason: str
    refund_amount: float
    status: str = "pending"
    approved_by: Optional[str] = None

# ========== STATIONERY MODELS ==========
class BookCreate(BaseModel):
    title: str
    author: str
    publisher: str
    isbn: str
    price: float
    stock: int
    category: str

class Book(BaseDBModel):
    tenant_id: str
    title: str
    author: str
    publisher: str
    isbn: str
    price: float
    stock: int
    category: str

# ========== HARDWARE MODELS ==========
class BulkPricingCreate(BaseModel):
    product_id: str
    unit_type: str  # kg, ft, bag, etc.
    min_quantity: float
    max_quantity: float
    price_per_unit: float

class BulkPricing(BaseDBModel):
    tenant_id: str
    product_id: str
    unit_type: str
    min_quantity: float
    max_quantity: float
    price_per_unit: float

# ========== FURNITURE MODELS ==========
class CustomOrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    product_description: str
    specifications: Dict[str, Any]
    total_amount: float
    advance_payment: float
    balance_amount: float
    delivery_date: str

class CustomOrder(BaseDBModel):
    tenant_id: str
    order_number: str
    customer_name: str
    customer_phone: str
    product_description: str
    specifications: Dict[str, Any]
    total_amount: float
    advance_payment: float
    balance_amount: float
    delivery_date: str
    status: str = "pending"
    installments: List[Dict[str, Any]] = []

# ========== WHOLESALE MODELS ==========
class TierPricingCreate(BaseModel):
    product_id: str
    tier_name: str
    min_quantity: int
    discount_percentage: float

class TierPricing(BaseDBModel):
    tenant_id: str
    product_id: str
    tier_name: str
    min_quantity: int
    discount_percentage: float

class PurchaseOrderCreate(BaseModel):
    supplier_id: str
    items: List[Dict[str, Any]]
    total_amount: float
    expected_delivery: str

class PurchaseOrder(BaseDBModel):
    tenant_id: str
    po_number: str
    supplier_id: str
    items: List[Dict[str, Any]]
    total_amount: float
    expected_delivery: str
    status: str = "pending"

class GoodsReceiptCreate(BaseModel):
    po_number: str
    received_items: List[Dict[str, Any]]
    received_date: str

class GoodsReceipt(BaseDBModel):
    tenant_id: str
    grn_number: str
    po_number: str
    received_items: List[Dict[str, Any]]
    received_date: str

# ========== ECOMMERCE MODELS ==========
class OnlineOrderCreate(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: str
    shipping_address: str
    items: List[Dict[str, Any]]
    total_amount: float
    payment_method: str

class OnlineOrder(BaseDBModel):
    tenant_id: str
    order_number: str
    customer_name: str
    customer_email: str
    customer_phone: str
    shipping_address: str
    items: List[Dict[str, Any]]
    total_amount: float
    payment_method: str
    payment_status: str = "pending"
    order_status: str = "processing"
    tracking_number: Optional[str] = None

# ========== MULTI-BRANCH MODELS ==========
class BranchCreate(BaseModel):
    name: str
    address: str
    contact_phone: str
    manager_name: Optional[str] = None
    is_active: bool = True

class Branch(BaseDBModel):
    tenant_id: str
    name: str
    address: str
    contact_phone: str
    manager_name: Optional[str] = None
    manager_user_id: Optional[str] = None
    is_active: bool = True

class ProductBranchCreate(BaseModel):
    product_id: str
    branch_id: str
    stock: int
    purchase_price: float
    sale_price: float
    reorder_level: int = 5

class ProductBranch(BaseDBModel):
    tenant_id: str
    product_id: str
    branch_id: str
    stock: int
    purchase_price: float
    sale_price: float
    reorder_level: int

class StockTransferCreate(BaseModel):
    product_id: str
    from_branch_id: str
    to_branch_id: str
    quantity: int
    reference_note: Optional[str] = None

class StockTransfer(BaseDBModel):
    tenant_id: str
    transfer_number: str
    product_id: str
    from_branch_id: str
    to_branch_id: str
    quantity: int
    reference_note: Optional[str] = None
    status: str = "completed"
    transferred_by: str

# ========== COMPUTER SHOP SPECIFIC MODELS ==========
class ComponentCreate(BaseModel):
    name: str
    category: str  # CPU, RAM, HDD, SSD, GPU, Motherboard, etc.
    brand: str
    model: str
    specifications: Dict[str, Any]
    price: float
    stock: int
    supplier_id: Optional[str] = None

class Component(BaseDBModel):
    tenant_id: str
    name: str
    category: str
    brand: str
    model: str
    specifications: Dict[str, Any]
    price: float
    stock: int
    supplier_id: Optional[str] = None
    serial_numbers: List[str] = []

class ComputerProductCreate(BaseModel):
    name: str
    sku: str
    category: str  # Desktop, Laptop, Server, Workstation
    brand: str
    model: str
    serial_number: str
    specifications: Dict[str, Any]
    purchase_price: float
    sale_price: float
    warranty_months: int
    warranty_expiry_date: str
    supplier_id: str
    components: List[str] = []  # Component IDs if assembled

class ComputerProduct(BaseDBModel):
    tenant_id: str
    name: str
    sku: str
    category: str
    brand: str
    model: str
    serial_number: str
    specifications: Dict[str, Any]
    purchase_price: float
    sale_price: float
    warranty_months: int
    warranty_expiry_date: str
    supplier_id: str
    components: List[str] = []
    status: str = "in_stock"  # in_stock, sold, in_repair

class JobCardCreate(BaseModel):
    customer_id: str
    device_type: str
    device_brand: str
    device_model: str
    serial_number: Optional[str] = None
    issue_description: str
    estimated_cost: float
    technician_id: Optional[str] = None

class JobCard(BaseDBModel):
    tenant_id: str
    job_number: str
    customer_id: str
    device_type: str
    device_brand: str
    device_model: str
    serial_number: Optional[str] = None
    issue_description: str
    estimated_cost: float
    actual_cost: float = 0
    technician_id: Optional[str] = None
    parts_used: List[Dict[str, Any]] = []
    status: str = "pending"  # pending, in_progress, completed, delivered, cancelled
    received_date: str
    completion_date: Optional[str] = None
    delivery_date: Optional[str] = None

class DeviceHistoryCreate(BaseModel):
    customer_id: str
    device_type: str
    device_brand: str
    device_model: str
    serial_number: str
    purchase_date: str
    warranty_expiry: str
    sale_id: Optional[str] = None

class DeviceHistory(BaseDBModel):
    tenant_id: str
    customer_id: str
    device_type: str
    device_brand: str
    device_model: str
    serial_number: str
    purchase_date: str
    warranty_expiry: str
    sale_id: Optional[str] = None
    repair_history: List[str] = []  # Job card IDs

# ========== UTILITY FUNCTIONS ==========
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Add business_type from tenant if tenant_id exists
        if user.get("tenant_id"):
            tenant = await db.tenants.find_one({"tenant_id": user["tenant_id"]}, {"_id": 0})
            if tenant:
                user["business_type"] = tenant.get("business_type")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(allowed_roles: List[UserRole]):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in [r.value for r in allowed_roles]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker

# ========== AUTH ROUTES ==========
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = user_data.model_dump()
    user_dict["hashed_password"] = hash_password(user_dict.pop("password"))
    user = User(**user_dict)
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    # Get business_type from tenant if available
    business_type = None
    if user.tenant_id:
        tenant = await db.tenants.find_one({"tenant_id": user.tenant_id}, {"_id": 0})
        if tenant:
            business_type = tenant.get("business_type")
    
    token = create_access_token({
        "sub": user.id, 
        "email": user.email, 
        "role": user.role,
        "business_type": business_type
    })
    
    user_response = user.model_dump()
    user_response.pop("hashed_password")
    if business_type:
        user_response["business_type"] = business_type
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_response
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Get business_type from tenant if available
    business_type = None
    if user.get("tenant_id"):
        tenant = await db.tenants.find_one({"tenant_id": user["tenant_id"]}, {"_id": 0})
        if tenant:
            business_type = tenant.get("business_type")
            user["business_type"] = business_type
    
    token = create_access_token({
        "sub": user["id"], 
        "email": user["email"], 
        "role": user["role"],
        "business_type": business_type
    })
    
    user.pop("hashed_password")
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user
    )

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    current_user.pop("hashed_password", None)
    return current_user

@api_router.post("/auth/signup", response_model=TokenResponse)
async def signup_tenant(tenant_data: TenantCreate):
    existing_email = await db.users.find_one({"email": tenant_data.email}, {"_id": 0})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    tenant = Tenant(
        name=tenant_data.name,
        email=tenant_data.email,
        business_type=tenant_data.business_type,
        modules_enabled=[tenant_data.business_type.value]
    )
    
    doc = tenant.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.tenants.insert_one(doc)
    
    admin_user = User(
        email=tenant_data.email,
        full_name=f"{tenant_data.name} Admin",
        role=UserRole.TENANT_ADMIN,
        tenant_id=tenant.tenant_id,
        hashed_password=hash_password(tenant_data.admin_password)
    )
    
    admin_doc = admin_user.model_dump()
    admin_doc['created_at'] = admin_doc['created_at'].isoformat()
    admin_doc['updated_at'] = admin_doc['updated_at'].isoformat()
    
    await db.users.insert_one(admin_doc)
    
    token = create_access_token({
        "sub": admin_user.id, 
        "email": admin_user.email, 
        "role": admin_user.role.value,
        "business_type": tenant.business_type.value
    })
    
    user_response = admin_user.model_dump()
    user_response.pop("hashed_password")
    user_response["business_type"] = tenant.business_type.value
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_response
    )

# ========== TENANT ROUTES (Super Admin Only) ==========
@api_router.post("/tenants", response_model=Tenant)
async def create_tenant(
    tenant_data: TenantCreate,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    # Create tenant
    tenant = Tenant(
        name=tenant_data.name,
        email=tenant_data.email,
        business_type=tenant_data.business_type,
        modules_enabled=[tenant_data.business_type.value]
    )
    
    doc = tenant.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.tenants.insert_one(doc)
    
    # Create tenant admin user
    admin_user = User(
        email=tenant_data.email,
        full_name=f"{tenant_data.name} Admin",
        role=UserRole.TENANT_ADMIN,
        tenant_id=tenant.tenant_id,
        hashed_password=hash_password(tenant_data.admin_password)
    )
    
    admin_doc = admin_user.model_dump()
    admin_doc['created_at'] = admin_doc['created_at'].isoformat()
    admin_doc['updated_at'] = admin_doc['updated_at'].isoformat()
    
    await db.users.insert_one(admin_doc)
    
    return tenant

@api_router.get("/tenants", response_model=List[Tenant])
async def get_tenants(
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    tenants = await db.tenants.find({}, {"_id": 0}).to_list(1000)
    for tenant in tenants:
        if isinstance(tenant.get('created_at'), str):
            tenant['created_at'] = datetime.fromisoformat(tenant['created_at'])
        if isinstance(tenant.get('updated_at'), str):
            tenant['updated_at'] = datetime.fromisoformat(tenant['updated_at'])
    return tenants

@api_router.patch("/tenants/{tenant_id}/toggle-module")
async def toggle_tenant_module(
    tenant_id: str,
    module: str,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    tenant = await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    modules = tenant.get("modules_enabled", [])
    if module in modules:
        modules.remove(module)
    else:
        modules.append(module)
    
    await db.tenants.update_one(
        {"tenant_id": tenant_id},
        {"$set": {"modules_enabled": modules, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Module toggled", "modules_enabled": modules}

# ========== PRODUCT ROUTES ==========
@api_router.post("/products", response_model=Product)
async def create_product(
    product_data: ProductCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    product = Product(
        tenant_id=current_user["tenant_id"],
        **product_data.model_dump()
    )
    
    doc = product.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.products.insert_one(doc)
    return product

@api_router.get("/products", response_model=List[Product])
async def get_products(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    products = await db.products.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for product in products:
        if isinstance(product.get('created_at'), str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
        if isinstance(product.get('updated_at'), str):
            product['updated_at'] = datetime.fromisoformat(product['updated_at'])
    
    return products

@api_router.put("/products/{product_id}")
async def update_product(
    product_id: str,
    product_data: ProductCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    update_data = product_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.products.update_one(
        {"id": product_id, "tenant_id": current_user["tenant_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product updated"}

@api_router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    result = await db.products.delete_one(
        {"id": product_id, "tenant_id": current_user["tenant_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product deleted"}

# ========== SERVICE ROUTES (Salon/Clinic) ==========
@api_router.post("/services", response_model=Service)
async def create_service(
    service_data: ServiceCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    service = Service(
        tenant_id=current_user["tenant_id"],
        **service_data.model_dump()
    )
    
    doc = service.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.services.insert_one(doc)
    return service

@api_router.get("/services", response_model=List[Service])
async def get_services(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    services = await db.services.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for service in services:
        if isinstance(service.get('created_at'), str):
            service['created_at'] = datetime.fromisoformat(service['created_at'])
        if isinstance(service.get('updated_at'), str):
            service['updated_at'] = datetime.fromisoformat(service['updated_at'])
    
    return services

# ========== APPOINTMENT ROUTES ==========
@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(
    appointment_data: AppointmentCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    appointment = Appointment(
        tenant_id=current_user["tenant_id"],
        **appointment_data.model_dump()
    )
    
    doc = appointment.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.appointments.insert_one(doc)
    return appointment

@api_router.get("/appointments", response_model=List[Appointment])
async def get_appointments(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    appointments = await db.appointments.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for appointment in appointments:
        if isinstance(appointment.get('created_at'), str):
            appointment['created_at'] = datetime.fromisoformat(appointment['created_at'])
        if isinstance(appointment.get('updated_at'), str):
            appointment['updated_at'] = datetime.fromisoformat(appointment['updated_at'])
    
    return appointments

@api_router.patch("/appointments/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: str,
    status: AppointmentStatus,
    current_user: dict = Depends(get_current_user)
):
    result = await db.appointments.update_one(
        {"id": appointment_id, "tenant_id": current_user["tenant_id"]},
        {"$set": {"status": status.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    return {"message": "Status updated"}

# ========== REPAIR TICKET ROUTES ==========
@api_router.post("/repairs", response_model=RepairTicket)
async def create_repair_ticket(
    repair_data: RepairTicketCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Generate ticket number
    count = await db.repairs.count_documents({"tenant_id": current_user["tenant_id"]})
    ticket_number = f"REP-{count + 1:05d}"
    
    repair = RepairTicket(
        tenant_id=current_user["tenant_id"],
        ticket_number=ticket_number,
        **repair_data.model_dump()
    )
    
    doc = repair.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.repairs.insert_one(doc)
    return repair

@api_router.get("/repairs", response_model=List[RepairTicket])
async def get_repair_tickets(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    repairs = await db.repairs.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for repair in repairs:
        if isinstance(repair.get('created_at'), str):
            repair['created_at'] = datetime.fromisoformat(repair['created_at'])
        if isinstance(repair.get('updated_at'), str):
            repair['updated_at'] = datetime.fromisoformat(repair['updated_at'])
    
    return repairs

@api_router.patch("/repairs/{repair_id}/status")
async def update_repair_status(
    repair_id: str,
    status: RepairStatus,
    current_user: dict = Depends(get_current_user)
):
    result = await db.repairs.update_one(
        {"id": repair_id, "tenant_id": current_user["tenant_id"]},
        {"$set": {"status": status.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Repair ticket not found")
    
    return {"message": "Status updated"}

# ========== TABLE ROUTES (Restaurant) ==========
@api_router.post("/tables", response_model=Table)
async def create_table(
    table_data: TableCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    table = Table(
        tenant_id=current_user["tenant_id"],
        **table_data.model_dump()
    )
    
    doc = table.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.tables.insert_one(doc)
    return table

@api_router.get("/tables", response_model=List[Table])
async def get_tables(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    tables = await db.tables.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for table in tables:
        if isinstance(table.get('created_at'), str):
            table['created_at'] = datetime.fromisoformat(table['created_at'])
        if isinstance(table.get('updated_at'), str):
            table['updated_at'] = datetime.fromisoformat(table['updated_at'])
    
    return tables

# ========== SALES/POS ROUTES ==========
@api_router.post("/sales", response_model=Sale)
async def create_sale(
    sale_data: SaleCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Calculate totals
    subtotal = sum(item.price * item.quantity for item in sale_data.items)
    total = subtotal - sale_data.discount + sale_data.tax
    
    # Generate sale number
    count = await db.sales.count_documents({"tenant_id": current_user["tenant_id"]})
    sale_number = f"SALE-{count + 1:06d}"
    
    # Update stock
    for item in sale_data.items:
        await db.products.update_one(
            {"id": item.product_id, "tenant_id": current_user["tenant_id"]},
            {"$inc": {"stock": -item.quantity}}
        )
    
    sale = Sale(
        tenant_id=current_user["tenant_id"],
        sale_number=sale_number,
        items=[item.model_dump() for item in sale_data.items],
        subtotal=subtotal,
        discount=sale_data.discount,
        tax=sale_data.tax,
        total=total,
        customer_name=sale_data.customer_name,
        payment_method=sale_data.payment_method
    )
    
    doc = sale.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.sales.insert_one(doc)
    return sale

@api_router.get("/sales", response_model=List[Sale])
async def get_sales(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    sales = await db.sales.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for sale in sales:
        if isinstance(sale.get('created_at'), str):
            sale['created_at'] = datetime.fromisoformat(sale['created_at'])
        if isinstance(sale.get('updated_at'), str):
            sale['updated_at'] = datetime.fromisoformat(sale['updated_at'])
    
    return sales

# ========== DASHBOARD ROUTES ==========
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    tenant_id = current_user["tenant_id"]
    
    # Total sales
    sales = await db.sales.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(10000)
    total_sales = sum(sale.get("total", 0) for sale in sales)
    total_orders = len(sales)
    
    # Today's sales
    today = datetime.now(timezone.utc).date()
    today_sales = sum(
        sale.get("total", 0) for sale in sales 
        if datetime.fromisoformat(sale.get("created_at", "")).date() == today
    )
    
    # Monthly sales
    current_month = datetime.now(timezone.utc).month
    monthly_sales = sum(
        sale.get("total", 0) for sale in sales 
        if datetime.fromisoformat(sale.get("created_at", "")).month == current_month
    )
    
    # Products stats
    products = await db.products.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(10000)
    total_products = len(products)
    low_stock_items = len([p for p in products if p.get("stock", 0) < 10])
    
    return DashboardStats(
        total_sales=total_sales,
        total_orders=total_orders,
        total_products=total_products,
        low_stock_items=low_stock_items,
        today_sales=today_sales,
        monthly_sales=monthly_sales
    )

@api_router.get("/dashboard/sales-chart")
async def get_sales_chart(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Get last 7 days sales
    sales = await db.sales.find({"tenant_id": current_user["tenant_id"]}, {"_id": 0}).to_list(10000)
    
    daily_sales = {}
    for i in range(7):
        date = (datetime.now(timezone.utc) - timedelta(days=i)).date()
        daily_sales[str(date)] = 0
    
    for sale in sales:
        sale_date = datetime.fromisoformat(sale.get("created_at", "")).date()
        if str(sale_date) in daily_sales:
            daily_sales[str(sale_date)] += sale.get("total", 0)
    
    chart_data = [{"date": date, "sales": amount} for date, amount in sorted(daily_sales.items())]
    
    return chart_data

# ========== PDF INVOICE ==========
@api_router.get("/sales/{sale_id}/invoice")
async def download_invoice(
    sale_id: str,
    current_user: dict = Depends(get_current_user)
):
    sale = await db.sales.find_one({"id": sale_id, "tenant_id": current_user["tenant_id"]}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    tenant = await db.tenants.find_one({"tenant_id": current_user["tenant_id"]}, {"_id": 0})
    
    # Create PDF
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    
    # Header
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 750, tenant.get("name", "Business Name"))
    c.setFont("Helvetica", 10)
    c.drawString(50, 735, f"Invoice: {sale.get('sale_number')}")
    c.drawString(50, 720, f"Date: {sale.get('created_at', '')[:10]}")
    
    # Items
    y = 680
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Items")
    y -= 20
    
    c.setFont("Helvetica", 10)
    for item in sale.get("items", []):
        c.drawString(50, y, f"{item.get('quantity')}x - ${item.get('price'):.2f}")
        y -= 15
    
    # Total
    y -= 20
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, f"Total: ${sale.get('total', 0):.2f}")
    
    c.save()
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice-{sale.get('sale_number')}.pdf"}
    )

# ========== SUPPLIER ROUTES ==========
@api_router.post("/suppliers", response_model=Supplier)
async def create_supplier(
    supplier_data: SupplierCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    supplier = Supplier(
        tenant_id=current_user["tenant_id"],
        **supplier_data.model_dump()
    )
    
    doc = supplier.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.suppliers.insert_one(doc)
    return supplier

@api_router.get("/suppliers", response_model=List[Supplier])
async def get_suppliers(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    suppliers = await db.suppliers.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for supplier in suppliers:
        if isinstance(supplier.get('created_at'), str):
            supplier['created_at'] = datetime.fromisoformat(supplier['created_at'])
        if isinstance(supplier.get('updated_at'), str):
            supplier['updated_at'] = datetime.fromisoformat(supplier['updated_at'])
    
    return suppliers

# ========== CUSTOMER ROUTES ==========
@api_router.post("/customers", response_model=Customer)
async def create_customer(
    customer_data: CustomerCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    customer = Customer(
        tenant_id=current_user["tenant_id"],
        **customer_data.model_dump()
    )
    
    doc = customer.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.customers.insert_one(doc)
    return customer

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    customers = await db.customers.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for customer in customers:
        if isinstance(customer.get('created_at'), str):
            customer['created_at'] = datetime.fromisoformat(customer['created_at'])
        if isinstance(customer.get('updated_at'), str):
            customer['updated_at'] = datetime.fromisoformat(customer['updated_at'])
    
    return customers

# ========== EXPENSE ROUTES ==========
@api_router.post("/expenses", response_model=Expense)
async def create_expense(
    expense_data: ExpenseCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    expense = Expense(
        tenant_id=current_user["tenant_id"],
        **expense_data.model_dump()
    )
    
    doc = expense.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.expenses.insert_one(doc)
    return expense

@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    expenses = await db.expenses.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for expense in expenses:
        if isinstance(expense.get('created_at'), str):
            expense['created_at'] = datetime.fromisoformat(expense['created_at'])
        if isinstance(expense.get('updated_at'), str):
            expense['updated_at'] = datetime.fromisoformat(expense['updated_at'])
    
    return expenses

# ========== PURCHASE ROUTES ==========
@api_router.post("/purchases", response_model=Purchase)
async def create_purchase(
    purchase_data: PurchaseCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Generate purchase number
    count = await db.purchases.count_documents({"tenant_id": current_user["tenant_id"]})
    purchase_number = f"PO-{count + 1:06d}"
    
    purchase = Purchase(
        tenant_id=current_user["tenant_id"],
        purchase_number=purchase_number,
        **purchase_data.model_dump()
    )
    
    doc = purchase.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.purchases.insert_one(doc)
    return purchase

@api_router.get("/purchases", response_model=List[Purchase])
async def get_purchases(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    purchases = await db.purchases.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for purchase in purchases:
        if isinstance(purchase.get('created_at'), str):
            purchase['created_at'] = datetime.fromisoformat(purchase['created_at'])
        if isinstance(purchase.get('updated_at'), str):
            purchase['updated_at'] = datetime.fromisoformat(purchase['updated_at'])
    
    return purchases

# ========== REPORTS ==========
@api_router.get("/reports/profit-loss")
async def get_profit_loss_report(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    tenant_id = current_user["tenant_id"]
    
    # Get sales
    sales = await db.sales.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(10000)
    total_revenue = sum(sale.get("total", 0) for sale in sales)
    
    # Get expenses
    expenses = await db.expenses.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(10000)
    total_expenses = sum(expense.get("amount", 0) for expense in expenses)
    
    # Get purchases
    purchases = await db.purchases.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(10000)
    total_purchases = sum(purchase.get("total_amount", 0) for purchase in purchases)
    
    profit = total_revenue - total_expenses - total_purchases
    
    return {
        "revenue": total_revenue,
        "expenses": total_expenses,
        "purchases": total_purchases,
        "profit": profit,
        "profit_margin": (profit / total_revenue * 100) if total_revenue > 0 else 0
    }

@api_router.get("/reports/top-products")
async def get_top_products(
    current_user: dict = Depends(get_current_user),
    limit: int = 10
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Get all sales and aggregate by product
    sales = await db.sales.find({"tenant_id": current_user["tenant_id"]}, {"_id": 0}).to_list(10000)
    
    product_sales = {}
    for sale in sales:
        for item in sale.get("items", []):
            product_id = item.get("product_id")
            if product_id not in product_sales:
                product_sales[product_id] = {
                    "quantity": 0,
                    "revenue": 0
                }
            product_sales[product_id]["quantity"] += item.get("quantity", 0)
            product_sales[product_id]["revenue"] += item.get("price", 0) * item.get("quantity", 0)
    
    # Sort by revenue
    top_products = sorted(
        product_sales.items(),
        key=lambda x: x[1]["revenue"],
        reverse=True
    )[:limit]
    
    return [{"product_id": pid, **data} for pid, data in top_products]

# ========== DOCTOR ROUTES (Clinic) ==========
@api_router.post("/doctors", response_model=Doctor)
async def create_doctor(
    doctor_data: DoctorCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    doctor = Doctor(
        tenant_id=current_user["tenant_id"],
        **doctor_data.model_dump()
    )
    
    doc = doctor.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.doctors.insert_one(doc)
    return doctor

@api_router.get("/doctors", response_model=List[Doctor])
async def get_doctors(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    doctors = await db.doctors.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for doctor in doctors:
        if isinstance(doctor.get('created_at'), str):
            doctor['created_at'] = datetime.fromisoformat(doctor['created_at'])
        if isinstance(doctor.get('updated_at'), str):
            doctor['updated_at'] = datetime.fromisoformat(doctor['updated_at'])
    
    return doctors

# ========== PATIENT ROUTES (Clinic) ==========
@api_router.post("/patients", response_model=Patient)
async def create_patient(
    patient_data: PatientCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    patient = Patient(
        tenant_id=current_user["tenant_id"],
        **patient_data.model_dump()
    )
    
    doc = patient.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.patients.insert_one(doc)
    return patient

@api_router.get("/patients", response_model=List[Patient])
async def get_patients(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    patients = await db.patients.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for patient in patients:
        if isinstance(patient.get('created_at'), str):
            patient['created_at'] = datetime.fromisoformat(patient['created_at'])
        if isinstance(patient.get('updated_at'), str):
            patient['updated_at'] = datetime.fromisoformat(patient['updated_at'])
    
    return patients

# ========== VEHICLE ROUTES (Garage) ==========
@api_router.post("/vehicles", response_model=Vehicle)
async def create_vehicle(
    vehicle_data: VehicleCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    vehicle = Vehicle(
        tenant_id=current_user["tenant_id"],
        **vehicle_data.model_dump()
    )
    
    doc = vehicle.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.vehicles.insert_one(doc)
    return vehicle

@api_router.get("/vehicles", response_model=List[Vehicle])
async def get_vehicles(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    vehicles = await db.vehicles.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for vehicle in vehicles:
        if isinstance(vehicle.get('created_at'), str):
            vehicle['created_at'] = datetime.fromisoformat(vehicle['created_at'])
        if isinstance(vehicle.get('updated_at'), str):
            vehicle['updated_at'] = datetime.fromisoformat(vehicle['updated_at'])
    
    return vehicles

# ========== PROPERTY ROUTES (Real Estate) ==========
@api_router.post("/properties", response_model=Property)
async def create_property(
    property_data: PropertyCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    property_obj = Property(
        tenant_id=current_user["tenant_id"],
        **property_data.model_dump()
    )
    
    doc = property_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.properties.insert_one(doc)
    return property_obj

@api_router.get("/properties", response_model=List[Property])
async def get_properties(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    properties = await db.properties.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for prop in properties:
        if isinstance(prop.get('created_at'), str):
            prop['created_at'] = datetime.fromisoformat(prop['created_at'])
        if isinstance(prop.get('updated_at'), str):
            prop['updated_at'] = datetime.fromisoformat(prop['updated_at'])
    
    return properties

# ========== PRODUCT VARIANT ROUTES (Fashion) ==========
@api_router.post("/product-variants", response_model=ProductVariant)
async def create_product_variant(
    variant_data: ProductVariantCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    variant = ProductVariant(
        tenant_id=current_user["tenant_id"],
        **variant_data.model_dump()
    )
    
    doc = variant.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.product_variants.insert_one(doc)
    return variant

@api_router.get("/product-variants", response_model=List[ProductVariant])
async def get_product_variants(
    product_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    query = {"tenant_id": current_user["tenant_id"]}
    if product_id:
        query["product_id"] = product_id
    
    variants = await db.product_variants.find(query, {"_id": 0}).to_list(1000)
    
    for variant in variants:
        if isinstance(variant.get('created_at'), str):
            variant['created_at'] = datetime.fromisoformat(variant['created_at'])
        if isinstance(variant.get('updated_at'), str):
            variant['updated_at'] = datetime.fromisoformat(variant['updated_at'])
    
    return variants

# ========== OFFER ROUTES (Grocery/Fashion) ==========
@api_router.post("/offers", response_model=Offer)
async def create_offer(
    offer_data: OfferCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    offer = Offer(
        tenant_id=current_user["tenant_id"],
        **offer_data.model_dump()
    )
    
    doc = offer.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.offers.insert_one(doc)
    return offer

@api_router.get("/offers", response_model=List[Offer])
async def get_offers(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    offers = await db.offers.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for offer in offers:
        if isinstance(offer.get('created_at'), str):
            offer['created_at'] = datetime.fromisoformat(offer['created_at'])
        if isinstance(offer.get('updated_at'), str):
            offer['updated_at'] = datetime.fromisoformat(offer['updated_at'])
    
    return offers

@api_router.patch("/offers/{offer_id}/toggle")
async def toggle_offer(
    offer_id: str,
    current_user: dict = Depends(get_current_user)
):
    offer = await db.offers.find_one({"id": offer_id, "tenant_id": current_user["tenant_id"]}, {"_id": 0})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    new_status = not offer.get("is_active", True)
    await db.offers.update_one(
        {"id": offer_id, "tenant_id": current_user["tenant_id"]},
        {"$set": {"is_active": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Offer status updated", "is_active": new_status}

# ========== WARRANTY ROUTES (Electronics) ==========
@api_router.post("/warranties", response_model=Warranty)
async def create_warranty(
    warranty_data: WarrantyCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Calculate expiry date
    purchase_date = datetime.fromisoformat(warranty_data.purchase_date)
    expiry_date = purchase_date + timedelta(days=warranty_data.warranty_period_months * 30)
    
    warranty = Warranty(
        tenant_id=current_user["tenant_id"],
        expiry_date=expiry_date.isoformat(),
        **warranty_data.model_dump()
    )
    
    doc = warranty.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.warranties.insert_one(doc)
    return warranty

@api_router.get("/warranties", response_model=List[Warranty])
async def get_warranties(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    warranties = await db.warranties.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for warranty in warranties:
        if isinstance(warranty.get('created_at'), str):
            warranty['created_at'] = datetime.fromisoformat(warranty['created_at'])
        if isinstance(warranty.get('updated_at'), str):
            warranty['updated_at'] = datetime.fromisoformat(warranty['updated_at'])
    
    return warranties

# ========== RETURN REQUEST ROUTES (Electronics) ==========
@api_router.post("/returns", response_model=ReturnRequest)
async def create_return_request(
    return_data: ReturnRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    return_request = ReturnRequest(
        tenant_id=current_user["tenant_id"],
        **return_data.model_dump()
    )
    
    doc = return_request.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.returns.insert_one(doc)
    return return_request

@api_router.get("/returns", response_model=List[ReturnRequest])
async def get_returns(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    returns = await db.returns.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for ret in returns:
        if isinstance(ret.get('created_at'), str):
            ret['created_at'] = datetime.fromisoformat(ret['created_at'])
        if isinstance(ret.get('updated_at'), str):
            ret['updated_at'] = datetime.fromisoformat(ret['updated_at'])
    
    return returns

@api_router.patch("/returns/{return_id}/approve")
async def approve_return(
    return_id: str,
    current_user: dict = Depends(get_current_user)
):
    return_req = await db.returns.find_one({"id": return_id, "tenant_id": current_user["tenant_id"]}, {"_id": 0})
    if not return_req:
        raise HTTPException(status_code=404, detail="Return request not found")
    
    await db.returns.update_one(
        {"id": return_id, "tenant_id": current_user["tenant_id"]},
        {"$set": {"status": "approved", "approved_by": current_user["id"], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Return request approved"}

# ========== BOOK ROUTES (Stationery) ==========
@api_router.post("/books", response_model=Book)
async def create_book(
    book_data: BookCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    book = Book(
        tenant_id=current_user["tenant_id"],
        **book_data.model_dump()
    )
    
    doc = book.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.books.insert_one(doc)
    return book

@api_router.get("/books", response_model=List[Book])
async def get_books(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    books = await db.books.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for book in books:
        if isinstance(book.get('created_at'), str):
            book['created_at'] = datetime.fromisoformat(book['created_at'])
        if isinstance(book.get('updated_at'), str):
            book['updated_at'] = datetime.fromisoformat(book['updated_at'])
    
    return books

# ========== BULK PRICING ROUTES (Hardware) ==========
@api_router.post("/bulk-pricing", response_model=BulkPricing)
async def create_bulk_pricing(
    pricing_data: BulkPricingCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    pricing = BulkPricing(
        tenant_id=current_user["tenant_id"],
        **pricing_data.model_dump()
    )
    
    doc = pricing.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.bulk_pricing.insert_one(doc)
    return pricing

@api_router.get("/bulk-pricing", response_model=List[BulkPricing])
async def get_bulk_pricing(
    product_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    query = {"tenant_id": current_user["tenant_id"]}
    if product_id:
        query["product_id"] = product_id
    
    pricing = await db.bulk_pricing.find(query, {"_id": 0}).to_list(1000)
    
    for p in pricing:
        if isinstance(p.get('created_at'), str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
        if isinstance(p.get('updated_at'), str):
            p['updated_at'] = datetime.fromisoformat(p['updated_at'])
    
    return pricing

# ========== CUSTOM ORDER ROUTES (Furniture) ==========
@api_router.post("/custom-orders", response_model=CustomOrder)
async def create_custom_order(
    order_data: CustomOrderCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    order_number = f"CO-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    
    order = CustomOrder(
        tenant_id=current_user["tenant_id"],
        order_number=order_number,
        **order_data.model_dump()
    )
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.custom_orders.insert_one(doc)
    return order

@api_router.get("/custom-orders", response_model=List[CustomOrder])
async def get_custom_orders(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    orders = await db.custom_orders.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if isinstance(order.get('updated_at'), str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    
    return orders

@api_router.post("/custom-orders/{order_id}/installment")
async def add_installment(
    order_id: str,
    installment: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    order = await db.custom_orders.find_one({"id": order_id, "tenant_id": current_user["tenant_id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    installments = order.get("installments", [])
    installments.append(installment)
    
    await db.custom_orders.update_one(
        {"id": order_id, "tenant_id": current_user["tenant_id"]},
        {"$set": {"installments": installments, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Installment added successfully"}

# ========== TIER PRICING ROUTES (Wholesale) ==========
@api_router.post("/tier-pricing", response_model=TierPricing)
async def create_tier_pricing(
    pricing_data: TierPricingCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    pricing = TierPricing(
        tenant_id=current_user["tenant_id"],
        **pricing_data.model_dump()
    )
    
    doc = pricing.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.tier_pricing.insert_one(doc)
    return pricing

@api_router.get("/tier-pricing", response_model=List[TierPricing])
async def get_tier_pricing(
    product_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    query = {"tenant_id": current_user["tenant_id"]}
    if product_id:
        query["product_id"] = product_id
    
    pricing = await db.tier_pricing.find(query, {"_id": 0}).to_list(1000)
    
    for p in pricing:
        if isinstance(p.get('created_at'), str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
        if isinstance(p.get('updated_at'), str):
            p['updated_at'] = datetime.fromisoformat(p['updated_at'])
    
    return pricing

# ========== PURCHASE ORDER ROUTES (Wholesale) ==========
@api_router.post("/purchase-orders", response_model=PurchaseOrder)
async def create_purchase_order(
    po_data: PurchaseOrderCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    po_number = f"PO-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    
    po = PurchaseOrder(
        tenant_id=current_user["tenant_id"],
        po_number=po_number,
        **po_data.model_dump()
    )
    
    doc = po.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.purchase_orders.insert_one(doc)
    return po

@api_router.get("/purchase-orders", response_model=List[PurchaseOrder])
async def get_purchase_orders(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    orders = await db.purchase_orders.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if isinstance(order.get('updated_at'), str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    
    return orders

# ========== GOODS RECEIPT ROUTES (Wholesale) ==========
@api_router.post("/goods-receipts", response_model=GoodsReceipt)
async def create_goods_receipt(
    grn_data: GoodsReceiptCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    grn_number = f"GRN-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    
    grn = GoodsReceipt(
        tenant_id=current_user["tenant_id"],
        grn_number=grn_number,
        **grn_data.model_dump()
    )
    
    doc = grn.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.goods_receipts.insert_one(doc)
    return grn

@api_router.get("/goods-receipts", response_model=List[GoodsReceipt])
async def get_goods_receipts(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    receipts = await db.goods_receipts.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for receipt in receipts:
        if isinstance(receipt.get('created_at'), str):
            receipt['created_at'] = datetime.fromisoformat(receipt['created_at'])
        if isinstance(receipt.get('updated_at'), str):
            receipt['updated_at'] = datetime.fromisoformat(receipt['updated_at'])
    
    return receipts

# ========== ONLINE ORDER ROUTES (E-commerce) ==========
@api_router.post("/online-orders", response_model=OnlineOrder)
async def create_online_order(
    order_data: OnlineOrderCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    order_number = f"ORD-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    
    order = OnlineOrder(
        tenant_id=current_user["tenant_id"],
        order_number=order_number,
        **order_data.model_dump()
    )
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.online_orders.insert_one(doc)
    return order

@api_router.get("/online-orders", response_model=List[OnlineOrder])
async def get_online_orders(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    orders = await db.online_orders.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if isinstance(order.get('updated_at'), str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    
    return orders

@api_router.patch("/online-orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    status_update: Dict[str, str],
    current_user: dict = Depends(get_current_user)
):
    order = await db.online_orders.find_one({"id": order_id, "tenant_id": current_user["tenant_id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await db.online_orders.update_one(
        {"id": order_id, "tenant_id": current_user["tenant_id"]},
        {"$set": {**status_update, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Order status updated"}

# ========== BRANCH MANAGEMENT ROUTES ==========
@api_router.post("/branches", response_model=Branch)
async def create_branch(
    branch_data: BranchCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Only tenant_admin, head_office, or super_admin can create branches
    if current_user["role"] not in ["tenant_admin", "head_office", "super_admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    branch = Branch(
        tenant_id=current_user["tenant_id"],
        **branch_data.model_dump()
    )
    
    doc = branch.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.branches.insert_one(doc)
    return branch

@api_router.get("/branches", response_model=List[Branch])
async def get_branches(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    branches = await db.branches.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for branch in branches:
        if isinstance(branch.get('created_at'), str):
            branch['created_at'] = datetime.fromisoformat(branch['created_at'])
        if isinstance(branch.get('updated_at'), str):
            branch['updated_at'] = datetime.fromisoformat(branch['updated_at'])
    
    return branches

@api_router.get("/branches/{branch_id}", response_model=Branch)
async def get_branch(
    branch_id: str,
    current_user: dict = Depends(get_current_user)
):
    branch = await db.branches.find_one(
        {"id": branch_id, "tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    if isinstance(branch.get('created_at'), str):
        branch['created_at'] = datetime.fromisoformat(branch['created_at'])
    if isinstance(branch.get('updated_at'), str):
        branch['updated_at'] = datetime.fromisoformat(branch['updated_at'])
    
    return branch

@api_router.put("/branches/{branch_id}")
async def update_branch(
    branch_id: str,
    branch_data: BranchCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in ["tenant_admin", "head_office", "super_admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    branch = await db.branches.find_one({"id": branch_id, "tenant_id": current_user["tenant_id"]}, {"_id": 0})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    await db.branches.update_one(
        {"id": branch_id, "tenant_id": current_user["tenant_id"]},
        {"$set": {**branch_data.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Branch updated successfully"}

@api_router.delete("/branches/{branch_id}")
async def delete_branch(
    branch_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in ["tenant_admin", "head_office", "super_admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    result = await db.branches.delete_one({"id": branch_id, "tenant_id": current_user["tenant_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    # Also delete associated product-branch records
    await db.product_branches.delete_many({"branch_id": branch_id, "tenant_id": current_user["tenant_id"]})
    
    return {"message": "Branch deleted successfully"}

# ========== PRODUCT-BRANCH ASSIGNMENT ROUTES ==========
@api_router.post("/product-branches", response_model=ProductBranch)
async def assign_product_to_branch(
    assignment: ProductBranchCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Check if assignment already exists
    existing = await db.product_branches.find_one({
        "product_id": assignment.product_id,
        "branch_id": assignment.branch_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="Product already assigned to this branch")
    
    product_branch = ProductBranch(
        tenant_id=current_user["tenant_id"],
        **assignment.model_dump()
    )
    
    doc = product_branch.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.product_branches.insert_one(doc)
    return product_branch

@api_router.get("/product-branches", response_model=List[ProductBranch])
async def get_product_branches(
    product_id: Optional[str] = None,
    branch_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    query = {"tenant_id": current_user["tenant_id"]}
    
    # Branch managers can only see their branch
    if current_user["role"] == "branch_manager" and current_user.get("branch_id"):
        query["branch_id"] = current_user["branch_id"]
    elif branch_id:
        query["branch_id"] = branch_id
    
    if product_id:
        query["product_id"] = product_id
    
    assignments = await db.product_branches.find(query, {"_id": 0}).to_list(10000)
    
    for assignment in assignments:
        if isinstance(assignment.get('created_at'), str):
            assignment['created_at'] = datetime.fromisoformat(assignment['created_at'])
        if isinstance(assignment.get('updated_at'), str):
            assignment['updated_at'] = datetime.fromisoformat(assignment['updated_at'])
    
    return assignments

@api_router.put("/product-branches/{assignment_id}")
async def update_product_branch(
    assignment_id: str,
    update_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    assignment = await db.product_branches.find_one(
        {"id": assignment_id, "tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Branch managers can only update their branch
    if current_user["role"] == "branch_manager":
        if assignment["branch_id"] != current_user.get("branch_id"):
            raise HTTPException(status_code=403, detail="Can only update own branch")
    
    await db.product_branches.update_one(
        {"id": assignment_id, "tenant_id": current_user["tenant_id"]},
        {"$set": {**update_data, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Product-branch assignment updated"}

@api_router.delete("/product-branches/{assignment_id}")
async def delete_product_branch(
    assignment_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in ["tenant_admin", "head_office", "super_admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    result = await db.product_branches.delete_one({
        "id": assignment_id,
        "tenant_id": current_user["tenant_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    return {"message": "Product-branch assignment deleted"}

# ========== STOCK TRANSFER ROUTES ==========
@api_router.post("/stock-transfers", response_model=StockTransfer)
async def create_stock_transfer(
    transfer_data: StockTransferCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Verify source branch has enough stock
    source_assignment = await db.product_branches.find_one({
        "product_id": transfer_data.product_id,
        "branch_id": transfer_data.from_branch_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    if not source_assignment:
        raise HTTPException(status_code=404, detail="Product not found in source branch")
    
    if source_assignment["stock"] < transfer_data.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock in source branch")
    
    # Verify destination branch exists
    dest_assignment = await db.product_branches.find_one({
        "product_id": transfer_data.product_id,
        "branch_id": transfer_data.to_branch_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    if not dest_assignment:
        raise HTTPException(status_code=404, detail="Product not assigned to destination branch")
    
    # Create transfer record
    transfer_number = f"ST-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    
    stock_transfer = StockTransfer(
        tenant_id=current_user["tenant_id"],
        transfer_number=transfer_number,
        transferred_by=current_user["id"],
        **transfer_data.model_dump()
    )
    
    doc = stock_transfer.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.stock_transfers.insert_one(doc)
    
    # Update source branch stock (deduct)
    await db.product_branches.update_one(
        {"id": source_assignment["id"], "tenant_id": current_user["tenant_id"]},
        {
            "$inc": {"stock": -transfer_data.quantity},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Update destination branch stock (add)
    await db.product_branches.update_one(
        {"id": dest_assignment["id"], "tenant_id": current_user["tenant_id"]},
        {
            "$inc": {"stock": transfer_data.quantity},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return stock_transfer

@api_router.get("/stock-transfers", response_model=List[StockTransfer])
async def get_stock_transfers(
    branch_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    query = {"tenant_id": current_user["tenant_id"]}
    
    # Branch managers can only see transfers involving their branch
    if current_user["role"] == "branch_manager" and current_user.get("branch_id"):
        query["$or"] = [
            {"from_branch_id": current_user["branch_id"]},
            {"to_branch_id": current_user["branch_id"]}
        ]
    elif branch_id:
        query["$or"] = [
            {"from_branch_id": branch_id},
            {"to_branch_id": branch_id}
        ]
    
    transfers = await db.stock_transfers.find(query, {"_id": 0}).to_list(10000)
    
    for transfer in transfers:
        if isinstance(transfer.get('created_at'), str):
            transfer['created_at'] = datetime.fromisoformat(transfer['created_at'])
        if isinstance(transfer.get('updated_at'), str):
            transfer['updated_at'] = datetime.fromisoformat(transfer['updated_at'])
    
    return transfers

# ========== BRANCH-SPECIFIC DASHBOARD STATS ==========
@api_router.get("/branches/{branch_id}/stats")
async def get_branch_stats(
    branch_id: str,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Verify branch exists and user has access
    branch = await db.branches.find_one({
        "id": branch_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    # Branch managers can only view their own branch
    if current_user["role"] == "branch_manager":
        if branch_id != current_user.get("branch_id"):
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Get total products in branch
    products_count = await db.product_branches.count_documents({
        "branch_id": branch_id,
        "tenant_id": current_user["tenant_id"]
    })
    
    # Get total stock value
    product_branches = await db.product_branches.find({
        "branch_id": branch_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0}).to_list(10000)
    
    total_stock = sum(pb.get("stock", 0) for pb in product_branches)
    total_value = sum(pb.get("stock", 0) * pb.get("purchase_price", 0) for pb in product_branches)
    
    # Get low stock items (below reorder level)
    low_stock_count = len([pb for pb in product_branches if pb.get("stock", 0) <= pb.get("reorder_level", 5)])
    
    return {
        "branch_id": branch_id,
        "branch_name": branch.get("name"),
        "total_products": products_count,
        "total_stock": total_stock,
        "total_value": total_value,
        "low_stock_items": low_stock_count
    }

# ========== COMPUTER COMPONENTS ROUTES ==========
@api_router.post("/components", response_model=Component)
async def create_component(
    component_data: ComponentCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    component = Component(
        tenant_id=current_user["tenant_id"],
        **component_data.model_dump()
    )
    
    doc = component.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.components.insert_one(doc)
    return component

@api_router.get("/components", response_model=List[Component])
async def get_components(
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    query = {"tenant_id": current_user["tenant_id"]}
    if category:
        query["category"] = category
    
    components = await db.components.find(query, {"_id": 0}).to_list(10000)
    
    for comp in components:
        if isinstance(comp.get('created_at'), str):
            comp['created_at'] = datetime.fromisoformat(comp['created_at'])
        if isinstance(comp.get('updated_at'), str):
            comp['updated_at'] = datetime.fromisoformat(comp['updated_at'])
    
    return components

# ========== COMPUTER PRODUCTS ROUTES ==========
@api_router.post("/computer-products", response_model=ComputerProduct)
async def create_computer_product(
    product_data: ComputerProductCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    product = ComputerProduct(
        tenant_id=current_user["tenant_id"],
        **product_data.model_dump()
    )
    
    doc = product.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.computer_products.insert_one(doc)
    return product

@api_router.get("/computer-products", response_model=List[ComputerProduct])
async def get_computer_products(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    query = {"tenant_id": current_user["tenant_id"]}
    if status:
        query["status"] = status
    
    products = await db.computer_products.find(query, {"_id": 0}).to_list(10000)
    
    for product in products:
        if isinstance(product.get('created_at'), str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
        if isinstance(product.get('updated_at'), str):
            product['updated_at'] = datetime.fromisoformat(product['updated_at'])
    
    return products

@api_router.get("/computer-products/{product_id}", response_model=ComputerProduct)
async def get_computer_product(
    product_id: str,
    current_user: dict = Depends(get_current_user)
):
    product = await db.computer_products.find_one({
        "id": product_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if isinstance(product.get('created_at'), str):
        product['created_at'] = datetime.fromisoformat(product['created_at'])
    if isinstance(product.get('updated_at'), str):
        product['updated_at'] = datetime.fromisoformat(product['updated_at'])
    
    return product

# ========== JOB CARD ROUTES ==========
@api_router.post("/job-cards", response_model=JobCard)
async def create_job_card(
    job_data: JobCardCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    job_number = f"JOB-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    received_date = datetime.now(timezone.utc).isoformat()
    
    job_card = JobCard(
        tenant_id=current_user["tenant_id"],
        job_number=job_number,
        received_date=received_date,
        **job_data.model_dump()
    )
    
    doc = job_card.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.job_cards.insert_one(doc)
    return job_card

@api_router.get("/job-cards", response_model=List[JobCard])
async def get_job_cards(
    status: Optional[str] = None,
    technician_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    query = {"tenant_id": current_user["tenant_id"]}
    if status:
        query["status"] = status
    if technician_id:
        query["technician_id"] = technician_id
    
    job_cards = await db.job_cards.find(query, {"_id": 0}).to_list(10000)
    
    for job in job_cards:
        if isinstance(job.get('created_at'), str):
            job['created_at'] = datetime.fromisoformat(job['created_at'])
        if isinstance(job.get('updated_at'), str):
            job['updated_at'] = datetime.fromisoformat(job['updated_at'])
    
    return job_cards

@api_router.patch("/job-cards/{job_id}/status")
async def update_job_status(
    job_id: str,
    status_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    job_card = await db.job_cards.find_one({
        "id": job_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    if not job_card:
        raise HTTPException(status_code=404, detail="Job card not found")
    
    update_data = {**status_data, "updated_at": datetime.now(timezone.utc).isoformat()}
    
    if status_data.get("status") == "completed" and not job_card.get("completion_date"):
        update_data["completion_date"] = datetime.now(timezone.utc).isoformat()
    
    await db.job_cards.update_one(
        {"id": job_id, "tenant_id": current_user["tenant_id"]},
        {"$set": update_data}
    )
    
    return {"message": "Job card updated successfully"}

@api_router.post("/job-cards/{job_id}/add-part")
async def add_part_to_job(
    job_id: str,
    part_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    job_card = await db.job_cards.find_one({
        "id": job_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    if not job_card:
        raise HTTPException(status_code=404, detail="Job card not found")
    
    parts_used = job_card.get("parts_used", [])
    parts_used.append(part_data)
    
    actual_cost = job_card.get("actual_cost", 0) + part_data.get("cost", 0)
    
    await db.job_cards.update_one(
        {"id": job_id, "tenant_id": current_user["tenant_id"]},
        {"$set": {
            "parts_used": parts_used,
            "actual_cost": actual_cost,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Part added to job card"}

# ========== DEVICE HISTORY ROUTES ==========
@api_router.post("/device-history", response_model=DeviceHistory)
async def create_device_history(
    device_data: DeviceHistoryCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    device = DeviceHistory(
        tenant_id=current_user["tenant_id"],
        **device_data.model_dump()
    )
    
    doc = device.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.device_history.insert_one(doc)
    return device

@api_router.get("/device-history", response_model=List[DeviceHistory])
async def get_device_history(
    customer_id: Optional[str] = None,
    serial_number: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    query = {"tenant_id": current_user["tenant_id"]}
    if customer_id:
        query["customer_id"] = customer_id
    if serial_number:
        query["serial_number"] = serial_number
    
    devices = await db.device_history.find(query, {"_id": 0}).to_list(10000)
    
    for device in devices:
        if isinstance(device.get('created_at'), str):
            device['created_at'] = datetime.fromisoformat(device['created_at'])
        if isinstance(device.get('updated_at'), str):
            device['updated_at'] = datetime.fromisoformat(device['updated_at'])
    
    return devices

@api_router.post("/device-history/{device_id}/add-repair")
async def add_repair_to_device(
    device_id: str,
    job_card_id: str,
    current_user: dict = Depends(get_current_user)
):
    device = await db.device_history.find_one({
        "id": device_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    repair_history = device.get("repair_history", [])
    if job_card_id not in repair_history:
        repair_history.append(job_card_id)
    
    await db.device_history.update_one(
        {"id": device_id, "tenant_id": current_user["tenant_id"]},
        {"$set": {
            "repair_history": repair_history,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Repair added to device history"}

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