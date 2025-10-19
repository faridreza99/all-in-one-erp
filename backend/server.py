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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
    STAFF = "staff"
    CASHIER = "cashier"

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
    
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    
    user_response = user.model_dump()
    user_response.pop("hashed_password")
    
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
    
    token = create_access_token({"sub": user["id"], "email": user["email"], "role": user["role"]})
    
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