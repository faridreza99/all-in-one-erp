from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
import shutil
import secrets
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
import cloudinary
import cloudinary.uploader
from tenant_dependency import TenantContext, get_tenant_context
from db_connection import resolve_tenant_db
from sales_models import Sale, SaleCreate
from audit_logger import log_action
from billing_models import (
    Plan, PlanTier, Subscription, SubscriptionStatus, BillingCycle,
    PaymentRecord, BillingEvent, UsageSnapshot
)
from billing_request_models import CreateSubscriptionRequest, RecordPaymentRequest, UpdatePlanRequest
from subscription_state_manager import SubscriptionStateManager
from billing_scheduler import start_scheduler, stop_scheduler
from notification_models import (
    Announcement, CreateAnnouncementRequest, NotificationChannel,
    AnnouncementType, AudienceType
)
from notification_service import NotificationService

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Cloudinary configuration
cloudinary_url = os.environ.get('CLOUDINARY_URL')
if cloudinary_url:
    cloudinary.config(cloudinary_url=cloudinary_url)

# MongoDB connection - handle both Mongo_URL and MONGO_URL
mongo_url = os.environ.get('MONGO_URL') or os.environ.get('Mongo_URL')
if not mongo_url:
    raise ValueError("MONGO_URL or Mongo_URL environment variable must be set")

# MongoDB Atlas connection with proper TLS
client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=10000)
db = client[os.environ.get('DB_NAME', 'erp_database')]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

app = FastAPI()

# Add CORS middleware FIRST before any routes
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

# MongoDB connection test on startup
@app.on_event("startup")
async def test_database_connection():
    """Test MongoDB connection on startup and fail fast if connection cannot be established."""
    try:
        print("=" * 60)
        print("🔍 Testing MongoDB Atlas connection...")
        print(f"   Database: {os.environ.get('DB_NAME', 'erp_database')}")
        
        await client.admin.command('ping')
        
        print("✅ MongoDB Atlas connection successful!")
        print("=" * 60)
    except Exception as e:
        error_msg = str(e)
        print("=" * 60)
        print("❌ CRITICAL ERROR: Cannot connect to MongoDB Atlas")
        print("=" * 60)
        
        if "TLSV1_ALERT_INTERNAL_ERROR" in error_msg or "SSL" in error_msg:
            print("\n🔒 SSL/TLS Handshake Error Detected")
            print("\nROOT CAUSE: MongoDB Atlas is blocking your connection")
            print("This usually means Replit's IP address is not whitelisted.\n")
            print("🛠️  HOW TO FIX:")
            print("   1. Go to https://cloud.mongodb.com")
            print("   2. Navigate to: Security → Network Access")
            print("   3. Click 'Add IP Address'")
            print("   4. Select 'Allow access from anywhere' (0.0.0.0/0)")
            print("      OR add Replit's specific IP address")
            print("   5. Save and wait ~60 seconds for changes to apply")
            print("   6. Restart this Replit server")
        elif "authentication failed" in error_msg.lower():
            print("\n🔐 Authentication Error Detected")
            print("\nROOT CAUSE: Invalid MongoDB credentials")
            print("\n🛠️  HOW TO FIX:")
            print("   1. Verify MONGO_URL secret has correct username/password")
            print("   2. Check MongoDB Atlas user permissions")
        else:
            print(f"\n📋 Error Details: {error_msg}")
        
        print("\n⚠️  Server will continue but authentication will NOT work!")
        print("⚠️  All login/register attempts will fail until MongoDB is connected.")
        print("=" * 60)
    
    # Start the billing scheduler
    try:
        start_scheduler()
        print("✅ Billing scheduler started - checking subscriptions hourly")
    except Exception as e:
        print(f"⚠️  Failed to start billing scheduler: {str(e)}")

@app.on_event("shutdown")
async def shutdown_scheduler():
    """Stop the billing scheduler on shutdown"""
    try:
        stop_scheduler()
    except Exception as e:
        print(f"⚠️  Error stopping scheduler: {str(e)}")

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
    COMPUTER_SHOP = "computer_shop"
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
    CNF = "cnf"

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

class ShipmentStatus(str, Enum):
    PENDING = "pending"
    IN_TRANSIT = "in_transit"
    AT_PORT = "at_port"
    CUSTOMS_CLEARANCE = "customs_clearance"
    CLEARED = "cleared"
    DELIVERED = "delivered"

class JobFileStatus(str, Enum):
    CREATED = "created"
    IN_PROGRESS = "in_progress"
    DOCUMENTATION = "documentation"
    CLEARANCE = "clearance"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class TransportStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class SaleStatus(str, Enum):
    DRAFT = "draft"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class PaymentStatus(str, Enum):
    UNPAID = "unpaid"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"

class PaymentMethod(str, Enum):
    CASH = "cash"
    CARD = "card"
    BKASH = "bkash"
    NAGAD = "nagad"
    ROCKET = "rocket"
    BANK = "bank"

class NotificationType(str, Enum):
    UNPAID_INVOICE = "unpaid_invoice"
    LOW_STOCK = "low_stock"
    PAYMENT_RECEIVED = "payment_received"
    SALE_CANCELLED = "sale_cancelled"
    ACTIVITY = "activity"

class ActivitySubtype(str, Enum):
    POS_SALE_CREATED = "pos_sale_created"
    INVOICE_CREATED = "invoice_created"
    PAYMENT_ADDED = "payment_added"
    REFUND_PROCESSED = "refund_processed"
    SALE_CANCELLED_BY_STAFF = "sale_cancelled_by_staff"

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
    username: Optional[str] = None
    branch_id: Optional[str] = None
    allowed_routes: Optional[List[str]] = None

class User(BaseDBModel):
    email: EmailStr
    full_name: str
    role: UserRole
    tenant_id: Optional[str] = None
    branch_id: Optional[str] = None
    hashed_password: str
    is_active: bool = True
    username: Optional[str] = None
    allowed_routes: Optional[List[str]] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

class Category(BaseDBModel):
    tenant_id: str
    name: str
    description: Optional[str] = None

class BrandCreate(BaseModel):
    name: str
    description: Optional[str] = None

class Brand(BaseDBModel):
    tenant_id: str
    name: str
    description: Optional[str] = None

class ProductCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    category: Optional[str] = None
    category_id: Optional[str] = None
    price: float
    stock: int = 0
    description: Optional[str] = None
    supplier_name: Optional[str] = None
    branch_id: Optional[str] = None
    # Pharmacy specific
    generic_name: Optional[str] = None
    brand: Optional[str] = None
    brand_id: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[str] = None
    # Mobile shop specific
    imei: Optional[str] = None
    warranty_months: Optional[int] = None

class Product(BaseDBModel):
    tenant_id: str
    name: str
    sku: Optional[str] = None
    category: Optional[str] = None
    category_id: Optional[str] = None
    price: float
    stock: int
    description: Optional[str] = None
    supplier_name: Optional[str] = None
    branch_id: Optional[str] = None
    generic_name: Optional[str] = None
    brand: Optional[str] = None
    brand_id: Optional[str] = None
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
    unit_cost: Optional[float] = None

class SaleCreate(BaseModel):
    items: List[SaleItemCreate]
    branch_id: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    payment_method: str = "cash"
    discount: float = 0
    tax: float = 0
    paid_amount: Optional[float] = None
    reference: Optional[str] = None

class Sale(BaseDBModel):
    tenant_id: str
    sale_number: str
    invoice_no: Optional[str] = None
    branch_id: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    items: List[Dict[str, Any]]
    subtotal: float
    discount: float
    tax: float
    total: float
    amount_paid: float = 0
    balance_due: float = 0
    status: SaleStatus = SaleStatus.COMPLETED
    payment_status: PaymentStatus = PaymentStatus.UNPAID
    payment_method: str = "cash"
    reference: Optional[str] = None
    created_by: Optional[str] = None

class PaymentCreate(BaseModel):
    amount: float
    method: PaymentMethod
    reference: Optional[str] = None

class Payment(BaseDBModel):
    tenant_id: str
    sale_id: str
    amount: float
    method: PaymentMethod
    reference: Optional[str] = None
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationCreate(BaseModel):
    type: NotificationType
    sale_id: Optional[str] = None
    reference_id: Optional[str] = None
    message: str
    is_sticky: bool = False

class Notification(BaseDBModel):
    tenant_id: str
    type: NotificationType
    sale_id: Optional[str] = None
    reference_id: Optional[str] = None
    message: str
    is_sticky: bool = False
    is_read: bool = False
    branch_id: Optional[str] = None
    user_id: Optional[str] = None
    title: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class CustomerDueCreate(BaseModel):
    customer_name: str
    sale_id: str
    total_amount: float
    paid_amount: float

class CustomerDue(BaseDBModel):
    tenant_id: str
    customer_name: str
    sale_id: str
    sale_number: str
    total_amount: float
    paid_amount: float
    due_amount: float
    transaction_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    stock_quantity: int
    purchase_price: float = 0.0
    sale_price: float = 0.0
    reorder_level: int = 5

class ProductBranch(BaseDBModel):
    tenant_id: str
    product_id: str
    branch_id: str
    stock_quantity: int
    purchase_price: float = 0.0
    sale_price: float = 0.0
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

class ShipmentCreate(BaseModel):
    shipment_number: str
    customer_name: str
    consignee: str
    origin_country: str
    destination: str
    shipping_line: str
    vessel_name: Optional[str] = None
    bl_number: str
    container_number: Optional[str] = None
    cargo_description: str
    weight: float
    arrival_date: str
    clearance_date: Optional[str] = None
    delivery_date: Optional[str] = None

class Shipment(BaseDBModel):
    tenant_id: str
    shipment_number: str
    customer_name: str
    consignee: str
    origin_country: str
    destination: str
    shipping_line: str
    vessel_name: Optional[str] = None
    bl_number: str
    container_number: Optional[str] = None
    cargo_description: str
    weight: float
    arrival_date: str
    clearance_date: Optional[str] = None
    delivery_date: Optional[str] = None
    status: ShipmentStatus = ShipmentStatus.PENDING

class JobFileCreate(BaseModel):
    job_number: str
    shipment_id: str
    client_name: str
    importer_name: str
    exporter_name: str
    port_of_loading: str
    port_of_discharge: str
    commodity: str
    hs_code: Optional[str] = None
    duty_amount: float = 0
    vat_amount: float = 0
    other_charges: float = 0

class JobFile(BaseDBModel):
    tenant_id: str
    job_number: str
    shipment_id: str
    client_name: str
    importer_name: str
    exporter_name: str
    port_of_loading: str
    port_of_discharge: str
    commodity: str
    hs_code: Optional[str] = None
    duty_amount: float = 0
    vat_amount: float = 0
    other_charges: float = 0
    status: JobFileStatus = JobFileStatus.CREATED
    completion_date: Optional[str] = None

class CNFBillingCreate(BaseModel):
    job_file_id: str
    client_name: str
    cnf_charges: float
    transport_charges: float
    documentation_charges: float
    port_charges: float
    other_charges: float = 0
    discount: float = 0
    payment_status: str = "pending"

class CNFBilling(BaseDBModel):
    tenant_id: str
    invoice_number: str
    job_file_id: str
    client_name: str
    cnf_charges: float
    transport_charges: float
    documentation_charges: float
    port_charges: float
    other_charges: float = 0
    subtotal: float
    discount: float = 0
    total_amount: float
    payment_status: str = "pending"
    payment_date: Optional[str] = None

class DocumentCreate(BaseModel):
    shipment_id: str
    job_file_id: str
    document_type: str
    document_number: str
    issue_date: str
    expiry_date: Optional[str] = None
    file_path: Optional[str] = None
    notes: Optional[str] = None

class Document(BaseDBModel):
    tenant_id: str
    shipment_id: str
    job_file_id: str
    document_type: str
    document_number: str
    issue_date: str
    expiry_date: Optional[str] = None
    file_path: Optional[str] = None
    notes: Optional[str] = None

class TransportCreate(BaseModel):
    job_file_id: str
    shipment_id: str
    vehicle_number: str
    driver_name: str
    driver_phone: str
    pickup_location: str
    delivery_location: str
    scheduled_date: str
    transport_cost: float

class Transport(BaseDBModel):
    tenant_id: str
    transport_number: str
    job_file_id: str
    shipment_id: str
    vehicle_number: str
    driver_name: str
    driver_phone: str
    pickup_location: str
    delivery_location: str
    scheduled_date: str
    actual_delivery_date: Optional[str] = None
    transport_cost: float
    status: TransportStatus = TransportStatus.SCHEDULED

# ========== SETTINGS MODELS ==========
class SettingsCreate(BaseModel):
    logo_url: Optional[str] = None
    website_name: Optional[str] = None
    background_image_url: Optional[str] = None

class Settings(BaseDBModel):
    tenant_id: str
    logo_url: Optional[str] = None
    website_name: Optional[str] = "Smart Business ERP"
    background_image_url: Optional[str] = None

# ========== UTILITY FUNCTIONS ==========
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    import bcrypt
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash using bcrypt"""
    import bcrypt
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

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
        
        # Extract tenant info from JWT payload (for multi-tenant support)
        user["tenant_slug"] = payload.get("tenant_slug")
        user["business_name"] = payload.get("business_name")
        
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

async def require_user_management_access(current_user: dict = Depends(get_current_user)):
    """Restrict user management to tenant_admin and super_admin only"""
    allowed_roles = [UserRole.TENANT_ADMIN.value, UserRole.SUPER_ADMIN.value]
    if current_user["role"] not in allowed_roles:
        raise HTTPException(
            status_code=403, 
            detail="Access denied. Only Tenant Admins and Super Admins can manage users."
        )
    return current_user

def apply_branch_filter(current_user: dict, base_query: dict = None, explicit_branch_id: str = None) -> dict:
    """
    Apply branch filtering based on user role.
    
    Args:
        current_user: Current authenticated user with role, tenant_id, branch_id
        base_query: Existing query dict to extend (optional)
        explicit_branch_id: Override branch_id for specific queries (optional)
    
    Returns:
        Query dict with appropriate filters applied
    
    Raises:
        HTTPException 403 if user tries to access data from a different branch or lacks branch assignment
    """
    query = base_query.copy() if base_query else {}
    
    # Always filter by tenant
    if current_user.get("tenant_id"):
        query["tenant_id"] = current_user["tenant_id"]
    
    # Branch filtering based on role
    user_role = current_user.get("role")
    
    # Admins see all branches within their tenant
    if user_role in [UserRole.SUPER_ADMIN.value, UserRole.TENANT_ADMIN.value, UserRole.HEAD_OFFICE.value]:
        # If explicit branch specified, filter by it
        if explicit_branch_id:
            query["branch_id"] = explicit_branch_id
        # Otherwise, show all branches (no branch filter)
    else:
        # Branch managers and staff MUST have a branch assignment
        user_branch_id = current_user.get("branch_id")
        
        if not user_branch_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied. Your account must be assigned to a branch. Please contact your administrator."
            )
        
        # If explicit branch requested, verify it matches user's branch
        if explicit_branch_id:
            if explicit_branch_id != user_branch_id:
                raise HTTPException(
                    status_code=403, 
                    detail="Access denied. You can only access data from your assigned branch."
                )
            query["branch_id"] = explicit_branch_id
        else:
            # Apply user's branch filter
            query["branch_id"] = user_branch_id
    
    return query

def check_route_permission(current_user: dict, required_route: str):
    """
    Check if user has permission to access a specific route.
    
    Args:
        current_user: Current authenticated user
        required_route: Route name to check (e.g., 'products', 'sales', 'pos')
    
    Raises:
        HTTPException 403 if user doesn't have permission
    """
    # Super admin and tenant admin have access to everything
    user_role = current_user.get("role")
    if user_role in [UserRole.SUPER_ADMIN.value, UserRole.TENANT_ADMIN.value]:
        return
    
    # Check if route is in allowed_routes
    allowed_routes = current_user.get("allowed_routes", [])
    if required_route not in allowed_routes:
        raise HTTPException(
            status_code=403,
            detail=f"Access denied. You don't have permission to access {required_route}."
        )

async def create_activity_notification(
    tenant_id: str,
    actor_user: dict,
    activity_subtype: ActivitySubtype,
    title: str,
    message: str,
    target_db=None
):
    """
    Create activity notifications for all tenant_admins when non-admin users perform actions.
    Only sends notifications if the actor is NOT a tenant_admin or super_admin.
    
    Args:
        target_db: Tenant-specific database connection for writing notifications (defaults to global db if not provided)
    """
    # Use provided database for notifications, fall back to global
    notification_db = target_db if target_db is not None else db
    
    # Don't notify if the actor is already an admin
    if actor_user["role"] in [UserRole.TENANT_ADMIN.value, UserRole.SUPER_ADMIN.value]:
        return
    
    # Find all tenant_admins for this tenant from global users collection
    # Note: Users are stored in the global database, not tenant-specific databases
    tenant_admins = await db.users.find(
        {"tenant_id": tenant_id, "role": UserRole.TENANT_ADMIN.value},
        {"_id": 0}
    ).to_list(100)
    
    # Create a notification for each tenant_admin in the tenant-specific database
    for admin in tenant_admins:
        notification = Notification(
            tenant_id=tenant_id,
            user_id=admin["id"],
            type=NotificationType.ACTIVITY,
            title=title,
            message=message,
            is_read=False,
            is_sticky=False,
            metadata={"activity_subtype": activity_subtype, "actor_name": actor_user.get("full_name", "User")}
        )
        notif_doc = notification.model_dump()
        notif_doc['created_at'] = notif_doc['created_at'].isoformat()
        notif_doc['updated_at'] = notif_doc['updated_at'].isoformat()
        await notification_db.notifications.insert_one(notif_doc)

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
    
    # Get tenant information for JWT (including tenant_slug for multi-tenant support)
    business_type = None
    tenant_slug = None
    business_name = None
    
    if user.tenant_id:
        from db_connection import get_admin_db
        admin_db = get_admin_db()
        
        # Try to find tenant in registry first (multi-tenant mode)
        tenant_registry = await admin_db.tenants_registry.find_one(
            {"tenant_id": user.tenant_id, "status": "active"},
            {"_id": 0}
        )
        
        if tenant_registry:
            tenant_slug = tenant_registry.get("slug")
            business_name = tenant_registry.get("business_name")
            business_type = tenant_registry.get("business_type")
        else:
            # Fallback to legacy tenants collection
            tenant = await db.tenants.find_one({"tenant_id": user.tenant_id}, {"_id": 0})
            if tenant:
                business_type = tenant.get("business_type")
                business_name = tenant.get("name")
    
    token = create_access_token({
        "sub": user.id, 
        "email": user.email,
        "tenant_id": user.tenant_id,
        "tenant_slug": tenant_slug,
        "role": user.role,
        "branch_id": user.branch_id,
        "business_type": business_type,
        "business_name": business_name
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
    try:
        from db_connection import get_admin_db
        
        # First, check admin_hub tenant registry for multi-tenant mode
        admin_db = get_admin_db()
        
        # Look up user in default database (users are stored centrally for now)
        user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
        if not user or not verify_password(credentials.password, user["hashed_password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Get business_type, tenant_slug, and business_name from tenant
        # Priority: admin_hub registry (source of truth) → legacy tenants collection
        business_type = None
        tenant_slug = None
        business_name = None
        
        # 1. FIRST: Try admin_hub registry (multi-tenant mode - source of truth)
        tenant_from_registry = await admin_db.tenants_registry.find_one(
            {
                "admin_email": user["email"], 
                "status": "active"
            },
            {"_id": 0}
        )
        
        # If found in registry, use it (multi-tenant mode)
        if tenant_from_registry:
            tenant_slug = tenant_from_registry.get("slug")
            business_name = tenant_from_registry.get("business_name")
            business_type = tenant_from_registry.get("business_type")
            user["business_type"] = business_type
            user["business_name"] = business_name
            user["tenant_slug"] = tenant_slug
            logger.info(f"✅ Multi-tenant login: {user['email']} → tenant_slug: {tenant_slug}, db: {tenant_from_registry.get('db_name')}")
        
        # 2. FALLBACK: Try legacy tenants collection if registry not found
        elif user.get("tenant_id"):
            tenant = await db.tenants.find_one({"tenant_id": user["tenant_id"]}, {"_id": 0})
            if tenant:
                business_type = tenant.get("business_type")
                business_name = tenant.get("name")
                
                # Try to find by business_type in registry (for migrated demo accounts)
                tenant_from_registry = await admin_db.tenants_registry.find_one(
                    {
                        "business_type": business_type,
                        "status": "active"
                    },
                    {"_id": 0}
                )
                
                if tenant_from_registry:
                    # Found in registry by business_type
                    tenant_slug = tenant_from_registry.get("slug")
                    business_name = tenant_from_registry.get("business_name")
                    user["business_type"] = business_type
                    user["business_name"] = business_name
                    user["tenant_slug"] = tenant_slug
                    logger.info(f"✅ Multi-tenant login (via business_type): {user['email']} → tenant_slug: {tenant_slug}, db: {tenant_from_registry.get('db_name')}")
                else:
                    # Legacy mode: tenant exists but not in registry
                    user["business_type"] = business_type
                    user["business_name"] = business_name
                    logger.info(f"⚠️  Legacy login: {user['email']} → tenant_id: {user.get('tenant_id')}, no tenant_slug (using shared DB)")
        else:
            # No tenant_id and not in registry
            logger.warning(f"⚠️  User {user['email']} has no tenant association")
        
        # Create JWT with tenant information
        token = create_access_token({
            "sub": user["id"], 
            "email": user["email"],
            "tenant_id": user.get("tenant_id"),
            "tenant_slug": tenant_slug,
            "role": user["role"],
            "branch_id": user.get("branch_id"),
            "business_type": business_type,
            "business_name": business_name
        })
        
        user.pop("hashed_password")
        
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=user
        )
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "SSL" in error_msg or "TLS" in error_msg or "ServerSelectionTimeoutError" in error_msg:
            raise HTTPException(
                status_code=503,
                detail="Database connection failed. MongoDB Atlas is not accessible. Please check server logs and verify IP whitelist settings."
            )
        raise HTTPException(status_code=500, detail=f"Login failed: {error_msg}")

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    current_user.pop("hashed_password", None)
    return current_user

@api_router.post("/auth/signup", response_model=TokenResponse)
async def signup_tenant(tenant_data: TenantCreate):
    try:
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
        
        # Note: This is legacy signup, not multi-tenant (no registry entry)
        token = create_access_token({
            "sub": admin_user.id, 
            "email": admin_user.email,
            "tenant_id": admin_user.tenant_id,
            "tenant_slug": None,  # Legacy mode - no tenant_slug
            "role": admin_user.role.value,
            "branch_id": admin_user.branch_id,
            "business_type": tenant.business_type.value,
            "business_name": tenant.name
        })
        
        user_response = admin_user.model_dump()
        user_response.pop("hashed_password")
        user_response["business_type"] = tenant.business_type.value
        
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=user_response
        )
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "SSL" in error_msg or "TLS" in error_msg or "ServerSelectionTimeoutError" in error_msg:
            raise HTTPException(
                status_code=503,
                detail="Database connection failed. MongoDB Atlas is not accessible. Please check server logs and verify IP whitelist settings."
            )
        raise HTTPException(status_code=500, detail=f"Signup failed: {error_msg}")

@api_router.post("/auth/change-password")
async def change_password(
    password_data: Dict[str, str],
    current_user: dict = Depends(get_current_user)
):
    old_password = password_data.get("old_password")
    new_password = password_data.get("new_password")
    
    if not old_password or not new_password:
        raise HTTPException(
            status_code=400,
            detail="Both old_password and new_password are required"
        )
    
    if len(new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 6 characters"
        )
    
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(old_password, user["hashed_password"]):
        raise HTTPException(
            status_code=401,
            detail="Old password is incorrect"
        )
    
    new_hashed_password = hash_password(new_password)
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "hashed_password": new_hashed_password,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Password changed successfully"}

# ========== USER MANAGEMENT ROUTES (Super Admin or Mobile Shop) ==========
@api_router.get("/users")
async def get_users(
    current_user: dict = Depends(require_user_management_access)
):
    users = await db.users.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0, "hashed_password": 0}
    ).to_list(1000)
    
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
        if isinstance(user.get('updated_at'), str):
            user['updated_at'] = datetime.fromisoformat(user['updated_at'])
    
    return users

@api_router.post("/users")
async def create_user(
    user_data: UserCreate,
    current_user: dict = Depends(require_user_management_access)
):
    # Check if email exists
    existing_email = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username exists (if provided)
    if user_data.username:
        existing_username = await db.users.find_one(
            {"username": user_data.username, "tenant_id": current_user["tenant_id"]},
            {"_id": 0}
        )
        if existing_username:
            raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create user under same tenant as super admin
    user_dict = user_data.model_dump()
    user_dict["tenant_id"] = current_user["tenant_id"]
    user_dict["hashed_password"] = hash_password(user_dict.pop("password"))
    user = User(**user_dict)
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    # Return user without hashed_password and _id (MongoDB ObjectId)
    user_response = {k: v for k, v in doc.items() if k not in ["hashed_password", "_id"]}
    return user_response

@api_router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    user_data: Dict[str, Any],
    current_user: dict = Depends(require_user_management_access)
):
    # Don't allow updating super admin's own account through this endpoint
    if user_id == current_user["id"]:
        raise HTTPException(
            status_code=400,
            detail="Use profile settings to update your own account"
        )
    
    # Verify user exists and belongs to same tenant
    existing_user = await db.users.find_one(
        {"id": user_id, "tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Safety guard: Only super_admin can manage other super_admin accounts
    if existing_user.get("role") == UserRole.SUPER_ADMIN.value and current_user["role"] != UserRole.SUPER_ADMIN.value:
        raise HTTPException(
            status_code=403,
            detail="Only super administrators can manage super admin accounts"
        )
    
    # Remove fields that shouldn't be updated
    update_data = {k: v for k, v in user_data.items() if k not in ["id", "tenant_id", "hashed_password", "created_at"]}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # If email is being updated, check it's not taken
    if "email" in update_data and update_data["email"]:
        existing_email = await db.users.find_one(
            {
                "email": update_data["email"],
                "id": {"$ne": user_id}
            },
            {"_id": 0}
        )
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already in use")
    
    # If username is being updated, check it's not taken
    if "username" in update_data and update_data["username"]:
        existing_username = await db.users.find_one(
            {
                "username": update_data["username"],
                "tenant_id": current_user["tenant_id"],
                "id": {"$ne": user_id}
            },
            {"_id": 0}
        )
        if existing_username:
            raise HTTPException(status_code=400, detail="Username already taken")
    
    await db.users.update_one(
        {"id": user_id, "tenant_id": current_user["tenant_id"]},
        {"$set": update_data}
    )
    
    return {"message": "User updated successfully"}

@api_router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_user_management_access)
):
    # Don't allow deleting own account
    if user_id == current_user["id"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete your own account"
        )
    
    # Verify user exists and belongs to same tenant
    existing_user = await db.users.find_one(
        {"id": user_id, "tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Safety guard: Only super_admin can delete other super_admin accounts
    if existing_user.get("role") == UserRole.SUPER_ADMIN.value and current_user["role"] != UserRole.SUPER_ADMIN.value:
        raise HTTPException(
            status_code=403,
            detail="Only super administrators can delete super admin accounts"
        )
    
    result = await db.users.delete_one(
        {"id": user_id, "tenant_id": current_user["tenant_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

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

# ========== SUPER ADMIN ANALYTICS & CONTROL ROUTES ==========
@api_router.get("/super/tenants/{tenant_id}/stats")
async def get_tenant_stats(
    tenant_id: str,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """
    Get sales statistics for a specific tenant.
    Accepts both UUID tenant_id or slug.
    Returns: total_sales, today_sales, sales_count
    """
    admin_client = AsyncIOMotorClient(mongo_url)
    admin_db = admin_client["admin_hub"]
    
    try:
        # First, try to find tenant by UUID in main database
        tenant = await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})
        
        # If not found, try by slug in registry
        if not tenant:
            tenant_registry = await admin_db.tenants.find_one({"slug": tenant_id})
            
            if not tenant_registry:
                raise HTTPException(status_code=404, detail="Tenant not found")
            
            tenant_slug = tenant_registry.get("slug")
            db_name = tenant_registry.get("db_name")
        else:
            # Found by UUID, now get the registry info to find the slug and db_name
            # Try to match by email
            tenant_registry = await admin_db.tenants.find_one({"admin_email": tenant.get("email")})
            
            if not tenant_registry:
                # Tenant doesn't have a registry entry (legacy mode)
                # Return empty stats
                return {
                    "tenant_id": tenant_id,
                    "tenant_slug": None,
                    "total_sales": 0,
                    "today_sales": 0,
                    "sales_count": 0,
                    "recent_sales": [],
                    "message": "Tenant is in legacy mode - no sales data available"
                }
            
            tenant_slug = tenant_registry.get("slug")
            db_name = tenant_registry.get("db_name")
        
        if not db_name:
            # No database configured, return empty stats
            return {
                "tenant_id": tenant_id,
                "tenant_slug": tenant_slug,
                "total_sales": 0,
                "today_sales": 0,
                "sales_count": 0,
                "recent_sales": [],
                "message": "Tenant database not configured"
            }
        
        # Connect to tenant's database
        tenant_db = admin_client[db_name]
        
        # Aggregate sales statistics
        now = datetime.utcnow()
        today_start = datetime(now.year, now.month, now.day)
        
        # Total sales amount
        total_pipeline = [
            {"$group": {"_id": None, "total": {"$sum": "$total"}}}
        ]
        total_result = await tenant_db.sales.aggregate(total_pipeline).to_list(1)
        total_sales = total_result[0]["total"] if total_result else 0
        
        # Today's sales amount
        today_pipeline = [
            {"$match": {"created_at": {"$gte": today_start}}},
            {"$group": {"_id": None, "total": {"$sum": "$total"}}}
        ]
        today_result = await tenant_db.sales.aggregate(today_pipeline).to_list(1)
        today_sales = today_result[0]["total"] if today_result else 0
        
        # Sales count
        sales_count = await tenant_db.sales.count_documents({})
        
        # Recent sales (last 7 days)
        week_ago = now - timedelta(days=7)
        recent_sales = await tenant_db.sales.find(
            {"created_at": {"$gte": week_ago}},
            {"_id": 0}
        ).sort("created_at", -1).limit(10).to_list(10)
        
        return {
            "tenant_id": tenant_id,
            "tenant_slug": tenant_slug,
            "total_sales": round(total_sales, 2),
            "today_sales": round(today_sales, 2),
            "sales_count": sales_count,
            "recent_sales": recent_sales
        }
    finally:
        admin_client.close()

@api_router.patch("/super/tenants/{tenant_id}/status")
async def update_tenant_status(
    tenant_id: str,
    status_update: dict,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """
    Update tenant status: active, suspended, or deleted.
    Updates both registry status and tenant's is_active flag.
    """
    new_status = status_update.get("status")
    if new_status not in ["active", "suspended", "deleted"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be: active, suspended, or deleted")
    
    # Get current tenant from main database
    current_tenant = await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not current_tenant:
        raise HTTPException(status_code=404, detail="Tenant not found in main database")
    
    old_status = "active" if current_tenant.get("is_active") else "suspended"
    
    # Map status to is_active flag
    is_active = new_status == "active"
    
    # Update in main database (tenants collection)
    await db.tenants.update_one(
        {"tenant_id": tenant_id},
        {"$set": {
            "is_active": is_active,
            "status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update in tenant registry (admin_hub)
    admin_client = AsyncIOMotorClient(mongo_url)
    admin_db = admin_client["admin_hub"]
    
    await admin_db.tenants.update_one(
        {"slug": tenant_id},
        {"$set": {
            "status": new_status,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Log the action with actual old status
    await log_action(
        user_id=current_user["id"],
        action=f"UPDATE_TENANT_STATUS_{new_status.upper()}",
        tenant_id=tenant_id,
        resource_type="tenant",
        resource_id=tenant_id,
        metadata={"old_status": old_status, "new_status": new_status}
    )
    
    admin_client.close()
    
    return {
        "message": f"Tenant status updated to {new_status}", 
        "status": new_status,
        "is_active": is_active
    }

@api_router.post("/super/tenants/{tenant_id}/impersonate")
async def impersonate_tenant_admin(
    tenant_id: str,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """
    Impersonate a tenant admin - Super Admin logs in as tenant admin.
    Returns a new JWT token with tenant_admin role and tenant context.
    """
    # Find the tenant's admin user
    admin_user = await db.users.find_one({
        "tenant_id": tenant_id,
        "role": UserRole.TENANT_ADMIN.value
    }, {"_id": 0})
    
    if not admin_user:
        raise HTTPException(status_code=404, detail="Tenant admin not found for this tenant")
    
    # Create impersonation token
    token_payload = {
        "sub": admin_user["id"],
        "email": admin_user["email"],
        "role": UserRole.TENANT_ADMIN.value,
        "tenant_id": tenant_id,
        "business_type": admin_user.get("business_type"),
        "impersonated_by": current_user["id"],
        "impersonation_started": datetime.utcnow().isoformat(),
        "exp": datetime.utcnow() + timedelta(hours=8)
    }
    
    access_token = jwt.encode(token_payload, SECRET_KEY, algorithm=ALGORITHM)
    
    # Log the impersonation
    await log_action(
        user_id=current_user["id"],
        action="IMPERSONATE_TENANT_ADMIN",
        tenant_id=tenant_id,
        resource_type="user",
        resource_id=admin_user["id"],
        metadata={
            "super_admin_id": current_user["id"],
            "tenant_admin_email": admin_user["email"]
        }
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": admin_user["id"],
            "email": admin_user["email"],
            "name": admin_user.get("full_name"),
            "role": UserRole.TENANT_ADMIN.value,
            "tenant_id": tenant_id,
            "business_type": admin_user.get("business_type"),
            "impersonated": True,
            "impersonated_by": current_user["id"]
        }
    }

# ========== BILLING & SUBSCRIPTION MANAGEMENT ROUTES ==========
@api_router.get("/super/plans")
async def get_plans(
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """
    Get all available billing plans.
    """
    admin_client = AsyncIOMotorClient(mongo_url)
    admin_db = admin_client["admin_hub"]
    
    try:
        plans = await admin_db.plans.find({"is_active": True}, {"_id": 0}).to_list(100)
        return {"plans": plans}
    finally:
        admin_client.close()

@api_router.patch("/super/plans/{plan_id}")
async def update_plan(
    plan_id: str,
    request: UpdatePlanRequest,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """
    Update plan price and limits.
    Super Admin only.
    """
    admin_client = AsyncIOMotorClient(mongo_url)
    admin_db = admin_client["admin_hub"]
    
    try:
        # Build update document
        update_data = {}
        if request.price is not None:
            update_data["price"] = request.price
        if request.quotas is not None:
            update_data["quotas"] = request.quotas
        if request.features is not None:
            update_data["features"] = request.features
        if request.description is not None:
            update_data["description"] = request.description
        if request.is_active is not None:
            update_data["is_active"] = request.is_active
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No update fields provided")
        
        update_data["updated_at"] = datetime.utcnow()
        
        # Update plan
        result = await admin_db.plans.update_one(
            {"plan_id": plan_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail=f"Plan '{plan_id}' not found")
        
        # Get updated plan
        updated_plan = await admin_db.plans.find_one({"plan_id": plan_id}, {"_id": 0})
        
        # Log the action
        await log_action(
            user_id=current_user["id"],
            action="UPDATE_PLAN",
            tenant_id=None,
            resource_type="plan",
            resource_id=plan_id,
            metadata={
                "updated_fields": list(update_data.keys()),
                "new_price": request.price
            }
        )
        
        return {
            "success": True,
            "message": f"Plan '{plan_id}' updated successfully",
            "plan": updated_plan
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating plan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        admin_client.close()

@api_router.get("/super/subscriptions")
async def get_all_subscriptions(
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """
    Get all tenant subscriptions.
    """
    admin_client = AsyncIOMotorClient(mongo_url)
    admin_db = admin_client["admin_hub"]
    
    try:
        subscriptions = await admin_db.subscriptions.find({}, {"_id": 0}).to_list(1000)
        return {"subscriptions": subscriptions}
    finally:
        admin_client.close()

@api_router.get("/super/subscriptions/{tenant_id}")
async def get_tenant_subscription(
    tenant_id: str,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """
    Get subscription for a specific tenant.
    """
    admin_client = AsyncIOMotorClient(mongo_url)
    admin_db = admin_client["admin_hub"]
    
    try:
        subscription = await admin_db.subscriptions.find_one(
            {"tenant_id": tenant_id},
            {"_id": 0}
        )
        
        if not subscription:
            return {"subscription": None, "message": "No subscription found"}
        
        return {"subscription": subscription}
    finally:
        admin_client.close()

@api_router.post("/super/subscriptions")
async def create_subscription(
    request: CreateSubscriptionRequest,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """
    Create or assign a subscription to a tenant.
    Uses Pydantic validation and plan billing_cycle for expiration calculation.
    """
    admin_client = AsyncIOMotorClient(mongo_url)
    admin_db = admin_client["admin_hub"]
    
    try:
        # Get plan details
        plan = await admin_db.plans.find_one({"plan_id": request.plan_id}, {"_id": 0})
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        # Check if subscription already exists
        existing = await admin_db.subscriptions.find_one({"tenant_id": request.tenant_id})
        if existing:
            raise HTTPException(status_code=400, detail="Subscription already exists for this tenant")
        
        # Create subscription
        now = datetime.now(timezone.utc)
        subscription_id = f"sub_{uuid.uuid4().hex[:12]}"
        
        # Use plan's billing_cycle if not specified in request
        effective_billing_cycle = request.billing_cycle.value if request.billing_cycle else plan.get("billing_cycle", "monthly")
        
        # Validate billing_cycle (should be one of: monthly, quarterly, yearly, lifetime)
        valid_cycles = ["monthly", "quarterly", "yearly", "lifetime"]
        if effective_billing_cycle not in valid_cycles:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid billing_cycle: {effective_billing_cycle}. Must be one of: {', '.join(valid_cycles)}"
            )
        
        # Calculate expiration based on effective billing cycle
        if effective_billing_cycle == "lifetime":
            expires_on = None
            current_period_end = None
        elif effective_billing_cycle == "yearly":
            expires_on = now + timedelta(days=365)
            current_period_end = expires_on
        elif effective_billing_cycle == "quarterly":
            expires_on = now + timedelta(days=90)
            current_period_end = expires_on
        else:  # monthly
            expires_on = now + timedelta(days=30)
            current_period_end = expires_on
        
        subscription_doc = {
            "subscription_id": subscription_id,
            "tenant_id": request.tenant_id,
            "plan_id": request.plan_id,
            "status": SubscriptionStatus.TRIAL.value if plan["price"] > 0 else SubscriptionStatus.ACTIVE.value,
            "billing_cycle": effective_billing_cycle,
            "starts_on": now,
            "expires_on": expires_on,
            "current_period_start": now,
            "current_period_end": current_period_end,
            "trial_ends_at": now + timedelta(days=14) if plan["price"] > 0 else None,
            "grace_period_days": 3,
            "plan_snapshot": plan,
            "metadata": {},
            "notes": request.notes,
            "created_at": now,
            "updated_at": now
        }
        
        await admin_db.subscriptions.insert_one(subscription_doc)
        
        # Create billing event
        event_doc = {
            "event_id": f"evt_{uuid.uuid4().hex[:12]}",
            "subscription_id": subscription_id,
            "tenant_id": request.tenant_id,
            "event_type": "subscription_created",
            "old_status": None,
            "new_status": subscription_doc["status"],
            "triggered_by": current_user["email"],
            "reason": "Subscription created by Super Admin",
            "metadata": {"plan_id": request.plan_id, "billing_cycle": effective_billing_cycle},
            "created_at": now
        }
        await admin_db.billing_events.insert_one(event_doc)
        
        # Log the action
        await log_action(
            user_id=current_user["id"],
            action="CREATE_SUBSCRIPTION",
            tenant_id=request.tenant_id,
            resource_type="subscription",
            resource_id=subscription_id,
            metadata={"plan_id": request.plan_id, "billing_cycle": effective_billing_cycle}
        )
        
        return {
            "message": "Subscription created successfully",
            "subscription": {k: v for k, v in subscription_doc.items() if k != "_id"}
        }
    finally:
        admin_client.close()

@api_router.post("/super/payments")
async def record_payment(
    request: RecordPaymentRequest,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """
    Record a manual payment for a subscription.
    Uses Pydantic validation and extends subscription based on billing_cycle.
    """
    admin_client = AsyncIOMotorClient(mongo_url)
    admin_db = admin_client["admin_hub"]
    
    try:
        # Get subscription
        subscription = await admin_db.subscriptions.find_one({"subscription_id": request.subscription_id})
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        # Parse payment date
        if request.payment_date:
            payment_dt = datetime.fromisoformat(request.payment_date.replace('Z', '+00:00'))
        else:
            payment_dt = datetime.now(timezone.utc)
        
        # Calculate new period based on subscription billing_cycle
        billing_cycle = subscription["billing_cycle"]
        if billing_cycle == "lifetime":
            new_period_end = None
        elif billing_cycle == "yearly":
            new_period_end = payment_dt + timedelta(days=365)
        elif billing_cycle == "quarterly":
            new_period_end = payment_dt + timedelta(days=90)
        else:  # monthly (default)
            new_period_end = payment_dt + timedelta(days=30)
        
        # Create payment record with all required fields
        payment_id = f"pay_{uuid.uuid4().hex[:12]}"
        payment_doc = {
            "payment_id": payment_id,
            "subscription_id": request.subscription_id,
            "tenant_id": subscription["tenant_id"],
            "amount": float(request.amount),
            "currency": "USD",
            "payment_method": request.payment_method,
            "payment_date": payment_dt,
            "period_start": payment_dt,
            "period_end": new_period_end,
            "receipt_number": request.receipt_number,
            "notes": request.notes,
            "recorded_by": current_user["email"],
            "created_at": datetime.now(timezone.utc)
        }
        
        await admin_db.payment_ledger.insert_one(payment_doc)
        
        # Update subscription status to active and extend expiration
        await admin_db.subscriptions.update_one(
            {"subscription_id": request.subscription_id},
            {"$set": {
                "status": SubscriptionStatus.ACTIVE.value,
                "expires_on": new_period_end,
                "current_period_start": payment_dt,
                "current_period_end": new_period_end,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        # Create billing event
        event_doc = {
            "event_id": f"evt_{uuid.uuid4().hex[:12]}",
            "subscription_id": request.subscription_id,
            "tenant_id": subscription["tenant_id"],
            "event_type": "payment_recorded",
            "old_status": subscription["status"],
            "new_status": SubscriptionStatus.ACTIVE.value,
            "triggered_by": current_user["email"],
            "reason": f"Manual payment recorded: ${request.amount}",
            "metadata": {
                "payment_id": payment_id,
                "amount": request.amount,
                "payment_method": request.payment_method
            },
            "created_at": datetime.now(timezone.utc)
        }
        await admin_db.billing_events.insert_one(event_doc)
        
        # Log the action
        await log_action(
            user_id=current_user["id"],
            action="RECORD_PAYMENT",
            tenant_id=subscription["tenant_id"],
            resource_type="payment",
            resource_id=payment_id,
            metadata={"subscription_id": request.subscription_id, "amount": request.amount}
        )
        
        return {
            "message": "Payment recorded successfully",
            "payment": {k: v for k, v in payment_doc.items() if k != "_id"}
        }
    finally:
        admin_client.close()

@api_router.get("/super/payments/{subscription_id}")
async def get_payment_history(
    subscription_id: str,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """
    Get payment history for a subscription.
    """
    admin_client = AsyncIOMotorClient(mongo_url)
    admin_db = admin_client["admin_hub"]
    
    try:
        payments = await admin_db.payment_ledger.find(
            {"subscription_id": subscription_id},
            {"_id": 0}
        ).sort("payment_date", -1).to_list(100)
        
        return {"payments": payments}
    finally:
        admin_client.close()

@api_router.patch("/super/subscriptions/{subscription_id}/status")
async def update_subscription_status(
    subscription_id: str,
    data: dict,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """
    Manually transition subscription to a new status.
    """
    new_status_str = data.get("status")
    reason = data.get("reason", "Manual status change by Super Admin")
    
    if not new_status_str:
        raise HTTPException(status_code=400, detail="status is required")
    
    try:
        new_status = SubscriptionStatus(new_status_str)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {new_status_str}")
    
    try:
        updated_sub = await SubscriptionStateManager.transition_state(
            subscription_id,
            new_status,
            reason,
            current_user["email"]
        )
        
        if not updated_sub:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        # Log the action
        await log_action(
            user_id=current_user["id"],
            action="UPDATE_SUBSCRIPTION_STATUS",
            tenant_id=updated_sub["tenant_id"],
            resource_type="subscription",
            resource_id=subscription_id,
            metadata={"new_status": new_status_str, "reason": reason}
        )
        
        return {"message": "Status updated successfully", "subscription": updated_sub}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/super/subscriptions/{subscription_id}/status")
async def get_subscription_status_endpoint(
    subscription_id: str,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """
    Get current status and lifecycle details of a subscription.
    """
    admin_client = AsyncIOMotorClient(mongo_url)
    admin_db = admin_client["admin_hub"]
    
    try:
        subscription = await admin_db.subscriptions.find_one(
            {"subscription_id": subscription_id},
            {"_id": 0}
        )
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        # Get recent billing events
        events = await admin_db.billing_events.find(
            {"subscription_id": subscription_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(10).to_list(10)
        
        return {
            "subscription": subscription,
            "recent_events": events,
            "is_active": subscription["status"] in ["active", "trial", "grace"]
        }
    finally:
        admin_client.close()

@api_router.get("/super/tenants/{tenant_id}/access")
async def check_tenant_access(
    tenant_id: str,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """
    Check if a tenant has active subscription access.
    """
    is_active = await SubscriptionStateManager.is_subscription_active(tenant_id)
    subscription = await SubscriptionStateManager.get_subscription_status(tenant_id)
    
    return {
        "tenant_id": tenant_id,
        "has_access": is_active,
        "subscription": subscription
    }

# ========== ANNOUNCEMENT & NOTIFICATION ROUTES ==========
@api_router.post("/super/announcements")
async def create_announcement(
    request: CreateAnnouncementRequest,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """
    Create a new announcement for tenants.
    Super Admin only.
    """
    try:
        announcement_data = Announcement(
            **request.dict(),
            created_by=current_user["email"]
        )
        
        result = await NotificationService.create_announcement(
            announcement_data,
            created_by=current_user["email"]
        )
        
        return {
            "success": True,
            "announcement": result,
            "message": f"Announcement created for {result['total_recipients']} recipients"
        }
    except Exception as e:
        logger.error(f"Error creating announcement: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/super/announcements")
async def get_all_announcements(
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """
    Get all announcements (for Super Admin dashboard).
    """
    try:
        announcements = await NotificationService.get_all_announcements(skip, limit)
        return {
            "success": True,
            "announcements": announcements,
            "count": len(announcements)
        }
    except Exception as e:
        logger.error(f"Error fetching announcements: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/super/announcements/{announcement_id}")
async def delete_announcement(
    announcement_id: str,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """
    Delete an announcement (soft delete).
    """
    try:
        deleted = await NotificationService.delete_announcement(announcement_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Announcement not found")
        
        return {
            "success": True,
            "message": "Announcement deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting announcement: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/notifications")
async def get_tenant_notifications(
    current_user: dict = Depends(get_current_user)
):
    """
    Get all active announcements for the current tenant.
    """
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    try:
        notifications = await NotificationService.get_announcements_for_tenant(tenant_id)
        unread_count = await NotificationService.get_unread_count(tenant_id)
        
        return {
            "success": True,
            "notifications": notifications,
            "unread_count": unread_count
        }
    except Exception as e:
        logger.error(f"Error fetching notifications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.patch("/notifications/{announcement_id}/read")
async def mark_notification_as_read(
    announcement_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Mark a notification as read for the current tenant.
    """
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    try:
        updated = await NotificationService.mark_as_read(announcement_id, tenant_id)
        if not updated:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {
            "success": True,
            "message": "Notification marked as read"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.patch("/notifications/{announcement_id}/dismiss")
async def dismiss_notification(
    announcement_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Dismiss a notification for the current tenant.
    """
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    try:
        updated = await NotificationService.mark_as_dismissed(announcement_id, tenant_id)
        if not updated:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {
            "success": True,
            "message": "Notification dismissed"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error dismissing notification: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/notifications/unread-count")
async def get_unread_notifications_count(
    current_user: dict = Depends(get_current_user)
):
    """
    Get count of unread notifications for badge counter.
    """
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    try:
        count = await NotificationService.get_unread_count(tenant_id)
        return {
            "success": True,
            "unread_count": count
        }
    except Exception as e:
        logger.error(f"Error getting unread count: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ========== SETTINGS ROUTES ==========
@api_router.get("/settings", response_model=Settings)
async def get_settings(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    settings = await db.settings.find_one(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    
    if not settings:
        default_settings = Settings(
            tenant_id=current_user["tenant_id"]
        )
        
        doc = default_settings.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        
        await db.settings.insert_one(doc)
        return default_settings
    
    if isinstance(settings.get('created_at'), str):
        settings['created_at'] = datetime.fromisoformat(settings['created_at'])
    if isinstance(settings.get('updated_at'), str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
    
    return Settings(**settings)

@api_router.put("/settings", response_model=Settings)
async def update_settings(
    settings_data: SettingsCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    existing_settings = await db.settings.find_one(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    
    update_data = settings_data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if existing_settings:
        await db.settings.update_one(
            {"tenant_id": current_user["tenant_id"]},
            {"$set": update_data}
        )
        
        updated_settings = await db.settings.find_one(
            {"tenant_id": current_user["tenant_id"]},
            {"_id": 0}
        )
        
        if not updated_settings:
            raise HTTPException(status_code=500, detail="Failed to retrieve updated settings")
        
        if isinstance(updated_settings.get('created_at'), str):
            updated_settings['created_at'] = datetime.fromisoformat(updated_settings['created_at'])
        if isinstance(updated_settings.get('updated_at'), str):
            updated_settings['updated_at'] = datetime.fromisoformat(updated_settings['updated_at'])
        
        return Settings(**updated_settings)
    else:
        new_settings = Settings(
            tenant_id=current_user["tenant_id"],
            **settings_data.model_dump(exclude_unset=True)
        )
        
        doc = new_settings.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        
        await db.settings.insert_one(doc)
        return new_settings

# ========== FILE UPLOAD ROUTES ==========
@api_router.post("/upload/logo")
async def upload_logo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Validate file type
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Validate file size (5MB max)
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB in bytes
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size must be less than 5MB"
        )
    
    # Upload to Cloudinary if configured, otherwise use local storage
    if cloudinary_url:
        try:
            # Upload as authenticated to prevent untrusted customer errors
            upload_result = cloudinary.uploader.upload(
                file_content,
                folder=f"erp/{current_user['tenant_id']}/logos",
                public_id=f"logo_{secrets.token_hex(8)}",
                resource_type="image",
                type="authenticated"
            )
            
            # Generate authenticated signed URL
            public_id = upload_result.get("public_id")
            file_url = cloudinary.CloudinaryImage(public_id).build_url(
                secure=True,
                type="authenticated",
                sign_url=True
            )
            filename = public_id
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload to Cloudinary: {str(e)}"
            )
    else:
        # Fallback to local storage
        secure_filename = f"logo_{current_user['tenant_id']}_{secrets.token_hex(8)}{file_ext}"
        upload_dir = Path(__file__).parent / "static" / "uploads" / "settings"
        upload_dir.mkdir(parents=True, exist_ok=True)
        file_path = upload_dir / secure_filename
        
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        
        file_url = f"/uploads/settings/{secure_filename}"
        filename = secure_filename
    
    # Update settings with new logo URL
    await db.settings.update_one(
        {"tenant_id": current_user["tenant_id"]},
        {"$set": {"logo_url": file_url, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"url": file_url, "filename": filename}

@api_router.post("/upload/background")
async def upload_background(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Validate file type
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Validate file size (5MB max)
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB in bytes
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size must be less than 5MB"
        )
    
    # Upload to Cloudinary if configured, otherwise use local storage
    if cloudinary_url:
        try:
            # Upload as authenticated to prevent untrusted customer errors
            upload_result = cloudinary.uploader.upload(
                file_content,
                folder=f"erp/{current_user['tenant_id']}/backgrounds",
                public_id=f"background_{secrets.token_hex(8)}",
                resource_type="image",
                type="authenticated"
            )
            
            # Generate authenticated signed URL
            public_id = upload_result.get("public_id")
            file_url = cloudinary.CloudinaryImage(public_id).build_url(
                secure=True,
                type="authenticated",
                sign_url=True
            )
            filename = public_id
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload to Cloudinary: {str(e)}"
            )
    else:
        # Fallback to local storage
        secure_filename = f"background_{current_user['tenant_id']}_{secrets.token_hex(8)}{file_ext}"
        upload_dir = Path(__file__).parent / "static" / "uploads" / "settings"
        upload_dir.mkdir(parents=True, exist_ok=True)
        file_path = upload_dir / secure_filename
        
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        
        file_url = f"/uploads/settings/{secure_filename}"
        filename = secure_filename
    
    # Update settings with new background URL
    await db.settings.update_one(
        {"tenant_id": current_user["tenant_id"]},
        {"$set": {"background_image_url": file_url, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"url": file_url, "filename": filename}

# ========== CATEGORY ROUTES ==========
@api_router.post("/categories", response_model=Category)
async def create_category(
    category_data: CategoryCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for category creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    category = Category(
        tenant_id=current_user["tenant_id"],
        **category_data.model_dump()
    )
    
    doc = category.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.categories.insert_one(doc)
    return category

@api_router.get("/categories", response_model=List[Category])
async def get_categories(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for categories: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    categories = await target_db.categories.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for category in categories:
        if isinstance(category.get('created_at'), str):
            category['created_at'] = datetime.fromisoformat(category['created_at'])
        if isinstance(category.get('updated_at'), str):
            category['updated_at'] = datetime.fromisoformat(category['updated_at'])
    
    return categories

@api_router.patch("/categories/{category_id}")
async def update_category(
    category_id: str,
    category_data: CategoryCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for category update: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    update_data = category_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await target_db.categories.update_one(
        {"id": category_id, "tenant_id": current_user["tenant_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category updated"}

@api_router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for category deletion: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    result = await target_db.categories.delete_one(
        {"id": category_id, "tenant_id": current_user["tenant_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category deleted"}

# ========== BRAND ROUTES ==========
@api_router.post("/brands", response_model=Brand)
async def create_brand(
    brand_data: BrandCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for brand creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    brand = Brand(
        tenant_id=current_user["tenant_id"],
        **brand_data.model_dump()
    )
    
    doc = brand.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.brands.insert_one(doc)
    return brand

@api_router.get("/brands", response_model=List[Brand])
async def get_brands(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for brands: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    brands = await target_db.brands.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for brand in brands:
        if isinstance(brand.get('created_at'), str):
            brand['created_at'] = datetime.fromisoformat(brand['created_at'])
        if isinstance(brand.get('updated_at'), str):
            brand['updated_at'] = datetime.fromisoformat(brand['updated_at'])
    
    return brands

@api_router.patch("/brands/{brand_id}")
async def update_brand(
    brand_id: str,
    brand_data: BrandCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for brand update: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    update_data = brand_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await target_db.brands.update_one(
        {"id": brand_id, "tenant_id": current_user["tenant_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    return {"message": "Brand updated"}

@api_router.delete("/brands/{brand_id}")
async def delete_brand(
    brand_id: str,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for brand deletion: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    result = await target_db.brands.delete_one(
        {"id": brand_id, "tenant_id": current_user["tenant_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    return {"message": "Brand deleted"}

# ========== PRODUCT ROUTES ==========
@api_router.post("/products", response_model=Product)
async def create_product(
    product_data: ProductCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for product creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    product = Product(
        tenant_id=current_user["tenant_id"],
        **product_data.model_dump()
    )
    
    doc = product.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.products.insert_one(doc)
    return product

@api_router.get("/products", response_model=List[Product])
async def get_products(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for products: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    user_role = current_user.get("role")
    user_branch_id = current_user.get("branch_id")
    
    # For non-admin users, only show products assigned to their branch
    if user_role not in [UserRole.SUPER_ADMIN.value, UserRole.TENANT_ADMIN.value, UserRole.HEAD_OFFICE.value]:
        if not user_branch_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied. Your account must be assigned to a branch."
            )
        
        # Get product IDs assigned to this branch
        branch_assignments = await target_db.product_branches.find(
            {
                "tenant_id": current_user["tenant_id"],
                "branch_id": user_branch_id
            },
            {"_id": 0, "product_id": 1}
        ).to_list(1000)
        
        assigned_product_ids = [assignment["product_id"] for assignment in branch_assignments]
        
        # Only fetch products that are assigned to this branch
        products = await target_db.products.find(
            {
                "tenant_id": current_user["tenant_id"],
                "id": {"$in": assigned_product_ids}
            },
            {"_id": 0}
        ).to_list(1000)
    else:
        # Admins see all products
        products = await target_db.products.find(
            {"tenant_id": current_user["tenant_id"]},
            {"_id": 0}
        ).to_list(1000)
    
    for product in products:
        if isinstance(product.get('created_at'), str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
        if isinstance(product.get('updated_at'), str):
            product['updated_at'] = datetime.fromisoformat(product['updated_at'])
        
        # Add branch stock mapping
        product_assignments = await target_db.product_branches.find(
            {
                "tenant_id": current_user["tenant_id"],
                "product_id": product["id"]
            },
            {"_id": 0, "branch_id": 1, "stock_quantity": 1, "sale_price": 1}
        ).to_list(100)
        
        # Create branch_stock mapping
        product["branch_stock"] = {
            assignment["branch_id"]: assignment.get("stock_quantity", 0)
            for assignment in product_assignments
        }
        
        # Create branch_sale_prices mapping for all users
        product["branch_sale_prices"] = {
            assignment["branch_id"]: assignment.get("sale_price")
            for assignment in product_assignments
            if assignment.get("sale_price") is not None
        }
        
        # For branch users, override price with branch-specific sale_price
        if user_branch_id and user_role not in [UserRole.SUPER_ADMIN.value, UserRole.TENANT_ADMIN.value, UserRole.HEAD_OFFICE.value]:
            branch_assignment = next(
                (a for a in product_assignments if a["branch_id"] == user_branch_id),
                None
            )
            if branch_assignment and branch_assignment.get("sale_price"):
                product["price"] = branch_assignment["sale_price"]
    
    return products

@api_router.put("/products/{product_id}")
async def update_product(
    product_id: str,
    product_data: ProductCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for product update: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    update_data = product_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await target_db.products.update_one(
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for product deletion: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    result = await target_db.products.delete_one(
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for service creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    service = Service(
        tenant_id=current_user["tenant_id"],
        **service_data.model_dump()
    )
    
    doc = service.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.services.insert_one(doc)
    return service

@api_router.get("/services", response_model=List[Service])
async def get_services(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for services: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    services = await target_db.services.find(
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for appointment creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    appointment = Appointment(
        tenant_id=current_user["tenant_id"],
        **appointment_data.model_dump()
    )
    
    doc = appointment.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.appointments.insert_one(doc)
    return appointment

@api_router.get("/appointments", response_model=List[Appointment])
async def get_appointments(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for appointments: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    appointments = await target_db.appointments.find(
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
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for appointment status update: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    result = await target_db.appointments.update_one(
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for repair creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    # Generate ticket number
    count = await target_db.repairs.count_documents({"tenant_id": current_user["tenant_id"]})
    ticket_number = f"REP-{count + 1:05d}"
    
    repair = RepairTicket(
        tenant_id=current_user["tenant_id"],
        ticket_number=ticket_number,
        **repair_data.model_dump()
    )
    
    doc = repair.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.repairs.insert_one(doc)
    return repair

@api_router.get("/repairs", response_model=List[RepairTicket])
async def get_repair_tickets(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for repairs: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    repairs = await target_db.repairs.find(
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
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for repair status update: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    result = await target_db.repairs.update_one(
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for table creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    table = Table(
        tenant_id=current_user["tenant_id"],
        **table_data.model_dump()
    )
    
    doc = table.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.tables.insert_one(doc)
    return table

@api_router.get("/tables", response_model=List[Table])
async def get_tables(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for tables: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    tables = await target_db.tables.find(
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
    
    # Resolve tenant-specific database for multi-tenant isolation
    target_db = db  # Default to global DB for backwards compatibility (legacy mode)
    if current_user.get("tenant_slug"):
        # STRICT: Multi-tenant users MUST use tenant-specific database
        try:
            from db_connection import resolve_tenant_db
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ POS Sale using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ CRITICAL: Failed to resolve tenant DB for multi-tenant user: {resolve_error}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to resolve tenant database. Please contact support. Error: {str(resolve_error)}"
            )
    else:
        # Legacy mode: No tenant_slug means this is a pre-multi-tenant user
        logger.info("⚠️  POS Sale using global DB (legacy mode - no tenant_slug)")
    
    # Calculate totals
    subtotal = sum(item.price * item.quantity for item in sale_data.items)
    total = subtotal - sale_data.discount + sale_data.tax
    
    # Validate and handle paid amount
    if sale_data.paid_amount is not None:
        if sale_data.paid_amount < 0:
            raise HTTPException(status_code=400, detail="Payment amount cannot be negative")
        if sale_data.paid_amount > total:
            raise HTTPException(status_code=400, detail=f"Payment amount (৳{sale_data.paid_amount:.2f}) cannot exceed total (৳{total:.2f})")
        paid_amount = sale_data.paid_amount
    else:
        paid_amount = total
    
    balance_due = total - paid_amount
    
    # Determine payment status
    if paid_amount >= total:
        payment_status = PaymentStatus.PAID
    elif paid_amount > 0:
        payment_status = PaymentStatus.PARTIALLY_PAID
    else:
        payment_status = PaymentStatus.UNPAID
    
    # Generate sale number and invoice number
    count = await target_db.sales.count_documents({"tenant_id": current_user["tenant_id"]})
    sale_number = f"SALE-{count + 1:06d}"
    invoice_no = f"INV-{count + 1:06d}"
    
    # Update stock (auto stock adjustment)
    # If branch_id is provided, use product_branches, otherwise use products
    for item in sale_data.items:
        if sale_data.branch_id:
            # Update branch-specific stock
            result = await target_db.product_branches.update_one(
                {"product_id": item.product_id, "branch_id": sale_data.branch_id, "tenant_id": current_user["tenant_id"]},
                {"$inc": {"stock": -item.quantity}}
            )
            if result.matched_count == 0:
                raise HTTPException(status_code=400, detail=f"Product {item.product_id} not assigned to branch or insufficient stock")
        else:
            # Update global stock
            await target_db.products.update_one(
                {"id": item.product_id, "tenant_id": current_user["tenant_id"]},
                {"$inc": {"stock": -item.quantity}}
            )
    
    # Check for low stock and create notifications (≤5 units)
    for item in sale_data.items:
        if sale_data.branch_id:
            # Check branch-specific stock
            product_branch = await target_db.product_branches.find_one({
                "product_id": item.product_id,
                "branch_id": sale_data.branch_id,
                "tenant_id": current_user["tenant_id"]
            }, {"_id": 0})
            
            if product_branch and product_branch.get("stock", 0) <= 5:
                # Get product name
                product = await target_db.products.find_one(
                    {"id": item.product_id, "tenant_id": current_user["tenant_id"]},
                    {"_id": 0, "name": 1}
                )
                if product:
                    # Check if notification already exists for this product
                    existing_notif = await target_db.notifications.find_one({
                        "tenant_id": current_user["tenant_id"],
                        "type": NotificationType.LOW_STOCK,
                        "reference_id": f"{item.product_id}_{sale_data.branch_id}"
                    })
                    
                    if not existing_notif:
                        notification = Notification(
                            tenant_id=current_user["tenant_id"],
                            type=NotificationType.LOW_STOCK,
                            reference_id=f"{item.product_id}_{sale_data.branch_id}",
                            message=f"Low stock alert: {product['name']} (Branch) - Only {product_branch['stock']} units left!",
                            is_sticky=False
                        )
                        notif_doc = notification.model_dump()
                        notif_doc['created_at'] = notif_doc['created_at'].isoformat()
                        notif_doc['updated_at'] = notif_doc['updated_at'].isoformat()
                        await target_db.notifications.insert_one(notif_doc)
        else:
            # Check global stock
            product = await target_db.products.find_one(
                {"id": item.product_id, "tenant_id": current_user["tenant_id"]},
                {"_id": 0}
            )
            
            if product and product.get("stock", 0) <= 5:
                # Check if notification already exists for this product
                existing_notif = await target_db.notifications.find_one({
                    "tenant_id": current_user["tenant_id"],
                    "type": NotificationType.LOW_STOCK,
                    "reference_id": item.product_id
                })
                
                if not existing_notif:
                    notification = Notification(
                        tenant_id=current_user["tenant_id"],
                        type=NotificationType.LOW_STOCK,
                        reference_id=item.product_id,
                        message=f"Low stock alert: {product['name']} - Only {product['stock']} units left!",
                        is_sticky=False
                    )
                    notif_doc = notification.model_dump()
                    notif_doc['created_at'] = notif_doc['created_at'].isoformat()
                    notif_doc['updated_at'] = notif_doc['updated_at'].isoformat()
                    await target_db.notifications.insert_one(notif_doc)
    
    # Auto-create or update customer if customer details are provided
    actual_customer_id = sale_data.customer_id
    if sale_data.customer_name and (sale_data.customer_phone or sale_data.customer_address):
        # Try to find existing customer by phone (more reliable) or name
        existing_customer = None
        if sale_data.customer_phone:
            existing_customer = await target_db.customers.find_one({
                "tenant_id": current_user["tenant_id"],
                "phone": sale_data.customer_phone
            }, {"_id": 0})
        
        if not existing_customer and sale_data.customer_name:
            # Fallback: try to find by name
            existing_customer = await target_db.customers.find_one({
                "tenant_id": current_user["tenant_id"],
                "name": sale_data.customer_name
            }, {"_id": 0})
        
        if existing_customer:
            # Update existing customer
            actual_customer_id = existing_customer['id']
            update_data = {}
            
            # Update fields if provided and different
            if sale_data.customer_address and sale_data.customer_address != existing_customer.get('address'):
                update_data['address'] = sale_data.customer_address
            if sale_data.customer_phone and sale_data.customer_phone != existing_customer.get('phone'):
                update_data['phone'] = sale_data.customer_phone
            
            # Always increment total_purchases
            update_data['total_purchases'] = existing_customer.get('total_purchases', 0) + total
            update_data['updated_at'] = datetime.utcnow().isoformat()
            
            if update_data:
                await target_db.customers.update_one(
                    {"id": actual_customer_id, "tenant_id": current_user["tenant_id"]},
                    {"$set": update_data}
                )
        else:
            # Create new customer
            from uuid import uuid4
            new_customer_id = str(uuid4())
            new_customer = {
                "id": new_customer_id,
                "tenant_id": current_user["tenant_id"],
                "name": sale_data.customer_name,
                "phone": sale_data.customer_phone or "",
                "email": None,
                "address": sale_data.customer_address or "",
                "credit_limit": 0.0,
                "total_purchases": total,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            await target_db.customers.insert_one(new_customer)
            actual_customer_id = new_customer_id
    
    sale = Sale(
        tenant_id=current_user["tenant_id"],
        sale_number=sale_number,
        invoice_no=invoice_no,
        branch_id=sale_data.branch_id,
        customer_id=actual_customer_id,
        customer_name=sale_data.customer_name,
        customer_phone=sale_data.customer_phone,
        customer_address=sale_data.customer_address,
        items=[item.model_dump() for item in sale_data.items],
        subtotal=subtotal,
        discount=sale_data.discount,
        tax=sale_data.tax,
        total=total,
        amount_paid=paid_amount,
        balance_due=balance_due,
        status=SaleStatus.COMPLETED,
        payment_status=payment_status,
        payment_method=sale_data.payment_method,
        reference=sale_data.reference,
        created_by=current_user.get("email")
    )
    
    doc = sale.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    sale_id = doc['id']
    await target_db.sales.insert_one(doc)
    
    # Auto-create warranty records for products with warranty
    try:
        for item in sale_data.items:
            product = await target_db.products.find_one(
                {"id": item.product_id, "tenant_id": current_user["tenant_id"]},
                {"_id": 0}
            )
            
            if product and product.get('warranty_months', 0) > 0:
                from warranty_utils import generate_warranty_token
                from datetime import timedelta
                
                warranty_count = await target_db.warranty_records.count_documents({"tenant_id": current_user["tenant_id"]})
                warranty_code = f"W-{datetime.now().year}-{warranty_count + 1:07d}"
                warranty_id = str(uuid4())
                
                purchase_date = datetime.now(timezone.utc)
                warranty_expiry = purchase_date + timedelta(days=product['warranty_months'] * 30)
                warranty_token = generate_warranty_token(warranty_id, current_user["tenant_id"])
                
                warranty_record = {
                    "id": warranty_id,
                    "tenant_id": current_user["tenant_id"],
                    "warranty_code": warranty_code,
                    "warranty_token": warranty_token,
                    "invoice_id": sale_id,
                    "invoice_no": invoice_no,
                    "sale_id": sale_id,
                    "product_id": product['id'],
                    "product_name": product.get('name', ''),
                    "serial_number": product.get('imei') or product.get('serial_number'),
                    "customer_id": actual_customer_id,
                    "customer_name": sale_data.customer_name,
                    "customer_phone": sale_data.customer_phone,
                    "customer_email": None,
                    "supplier_id": product.get('supplier_id'),
                    "supplier_name": product.get('supplier_name'),
                    "purchase_date": purchase_date.isoformat(),
                    "warranty_period_months": product['warranty_months'],
                    "warranty_start_date": purchase_date.isoformat(),
                    "warranty_expiry_date": warranty_expiry.isoformat(),
                    "current_status": "active",
                    "replaced_by_warranty_id": None,
                    "transferable": False,
                    "fraud_score": 0.0,
                    "created_by": current_user.get('email'),
                    "updated_by": None,
                    "created_at": purchase_date.isoformat(),
                    "updated_at": purchase_date.isoformat()
                }
                
                await target_db.warranty_records.insert_one(warranty_record)
                logger.info(f"Created warranty {warranty_code} in {target_db.name}")
                
                # Create initial warranty event
                warranty_event = {
                    "id": str(uuid4()),
                    "tenant_id": current_user["tenant_id"],
                    "warranty_id": warranty_id,
                    "event_type": "status_changed",
                    "actor_type": "system",
                    "actor_id": None,
                    "actor_name": "System",
                    "note": "Warranty activated on purchase",
                    "attachments": [],
                    "meta": {"warranty_code": warranty_code, "qr_url": f"https://myerp.com/w/{warranty_token}"},
                    "created_at": purchase_date.isoformat(),
                    "updated_at": purchase_date.isoformat()
                }
                
                await target_db.warranty_events.insert_one(warranty_event)
    except Exception as e:
        logger.warning(f"Warranty auto-creation failed for sale {sale_id}: {e}")
    
    # Create payment record if initial payment was made
    if paid_amount > 0:
        payment = Payment(
            tenant_id=current_user["tenant_id"],
            sale_id=sale_id,
            amount=paid_amount,
            method=PaymentMethod(sale_data.payment_method.lower())
        )
        payment_doc = payment.model_dump()
        payment_doc['created_at'] = payment_doc['created_at'].isoformat()
        payment_doc['updated_at'] = payment_doc['updated_at'].isoformat()
        payment_doc['received_at'] = payment_doc['received_at'].isoformat()
        await target_db.payments.insert_one(payment_doc)
    
    # Create customer due if partial payment
    if paid_amount < total and sale_data.customer_name:
        due_amount = total - paid_amount
        customer_due = CustomerDue(
            tenant_id=current_user["tenant_id"],
            customer_name=sale_data.customer_name,
            sale_id=sale_id,
            sale_number=sale_number,
            total_amount=total,
            paid_amount=paid_amount,
            due_amount=due_amount
        )
        
        due_doc = customer_due.model_dump()
        due_doc['created_at'] = due_doc['created_at'].isoformat()
        due_doc['updated_at'] = due_doc['updated_at'].isoformat()
        due_doc['transaction_date'] = due_doc['transaction_date'].isoformat()
        
        await target_db.customer_dues.insert_one(due_doc)
    
    # Create sticky notification for unpaid/partially paid invoices
    if balance_due > 0:
        notification = Notification(
            tenant_id=current_user["tenant_id"],
            type=NotificationType.UNPAID_INVOICE,
            sale_id=sale_id,
            message=f"Invoice {invoice_no} has outstanding balance: ৳{balance_due:.2f}",
            is_sticky=True
        )
        notif_doc = notification.model_dump()
        notif_doc['created_at'] = notif_doc['created_at'].isoformat()
        notif_doc['updated_at'] = notif_doc['updated_at'].isoformat()
        await target_db.notifications.insert_one(notif_doc)
    
    # Create activity notification for tenant_admins (if user is not admin)
    await create_activity_notification(
        tenant_id=current_user["tenant_id"],
        actor_user=current_user,
        activity_subtype=ActivitySubtype.POS_SALE_CREATED,
        title="New POS Sale Created",
        message=f"{current_user.get('full_name', 'Staff')} created a sale {invoice_no} for ৳{total:.2f}",
        target_db=target_db
    )
    
    return sale

@api_router.get("/sales", response_model=List[Sale])
async def get_sales(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for sales: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    # Apply branch filtering based on user role
    query = apply_branch_filter(current_user)
    
    sales = await target_db.sales.find(query, {"_id": 0}).to_list(1000)
    
    for sale in sales:
        if isinstance(sale.get('created_at'), str):
            sale['created_at'] = datetime.fromisoformat(sale['created_at'])
        if isinstance(sale.get('updated_at'), str):
            sale['updated_at'] = datetime.fromisoformat(sale['updated_at'])
    
    return sales

# Invoice data endpoint removed - use PDF endpoint directly

@api_router.post("/sales/{sale_id}/payments")
async def add_payment_to_sale(
    sale_id: str,
    payment_data: PaymentCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for sale payment: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    # Get the sale
    sale = await target_db.sales.find_one(
        {"id": sale_id, "tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    # Validate payment amount
    if payment_data.amount < 0:
        raise HTTPException(status_code=400, detail="Payment amount cannot be negative")
    
    if payment_data.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")
    
    current_balance = sale.get('balance_due', 0)
    
    # Strict validation: ensure payment doesn't exceed remaining balance
    if payment_data.amount > current_balance:
        raise HTTPException(status_code=400, detail=f"Payment amount (৳{payment_data.amount:.2f}) exceeds remaining balance (৳{current_balance:.2f})")
    
    # Additional safeguard: verify total payments won't exceed sale total
    current_amount_paid = sale.get('amount_paid', 0)
    total_after_payment = current_amount_paid + payment_data.amount
    if total_after_payment > sale['total']:
        raise HTTPException(status_code=400, detail=f"Total payments (৳{total_after_payment:.2f}) would exceed sale total (৳{sale['total']:.2f})")
    
    # Create payment record
    payment = Payment(
        tenant_id=current_user["tenant_id"],
        sale_id=sale_id,
        amount=payment_data.amount,
        method=payment_data.method,
        reference=payment_data.reference
    )
    
    payment_doc = payment.model_dump()
    payment_doc['created_at'] = payment_doc['created_at'].isoformat()
    payment_doc['updated_at'] = payment_doc['updated_at'].isoformat()
    payment_doc['received_at'] = payment_doc['received_at'].isoformat()
    await target_db.payments.insert_one(payment_doc)
    
    # Update sale amounts and status
    new_amount_paid = sale.get('amount_paid', 0) + payment_data.amount
    new_balance_due = sale['total'] - new_amount_paid
    
    # Determine new payment status (use == 0 for exact zero check to avoid negative balance edge cases)
    if new_balance_due == 0:
        new_payment_status = PaymentStatus.PAID
    elif new_amount_paid > 0:
        new_payment_status = PaymentStatus.PARTIALLY_PAID
    else:
        new_payment_status = PaymentStatus.UNPAID
    
    # Update sale
    await target_db.sales.update_one(
        {"id": sale_id, "tenant_id": current_user["tenant_id"]},
        {
            "$set": {
                "amount_paid": new_amount_paid,
                "balance_due": new_balance_due,
                "payment_status": new_payment_status.value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Update or delete customer due if exists
    if sale.get('customer_name'):
        if new_balance_due == 0:
            # Delete customer due record when fully paid
            await target_db.customer_dues.delete_one(
                {"sale_id": sale_id, "tenant_id": current_user["tenant_id"]}
            )
        else:
            # Update customer due with new amounts
            await target_db.customer_dues.update_one(
                {"sale_id": sale_id, "tenant_id": current_user["tenant_id"]},
                {
                    "$set": {
                        "paid_amount": new_amount_paid,
                        "due_amount": new_balance_due,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
    
    # Remove sticky notification only when balance is exactly zero (fully paid)
    if new_balance_due == 0:
        await target_db.notifications.update_many(
            {"sale_id": sale_id, "tenant_id": current_user["tenant_id"], "type": NotificationType.UNPAID_INVOICE.value},
            {
                "$set": {
                    "is_read": True,
                    "is_sticky": False,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Create payment received notification
        notif = Notification(
            tenant_id=current_user["tenant_id"],
            type=NotificationType.PAYMENT_RECEIVED,
            sale_id=sale_id,
            message=f"Payment of ৳{payment_data.amount:.2f} received for Invoice {sale['invoice_no']}",
            is_sticky=False
        )
        notif_doc = notif.model_dump()
        notif_doc['created_at'] = notif_doc['created_at'].isoformat()
        notif_doc['updated_at'] = notif_doc['updated_at'].isoformat()
        await target_db.notifications.insert_one(notif_doc)
    
    # Create activity notification for tenant_admins (if user is not admin)
    await create_activity_notification(
        tenant_id=current_user["tenant_id"],
        actor_user=current_user,
        activity_subtype=ActivitySubtype.PAYMENT_ADDED,
        title="Payment Added to Invoice",
        message=f"{current_user.get('full_name', 'Staff')} added payment of ৳{payment_data.amount:.2f} to Invoice {sale['invoice_no']}",
        target_db=target_db
    )
    
    return {
        "message": "Payment added successfully",
        "payment_id": payment.id,
        "new_balance_due": new_balance_due,
        "payment_status": new_payment_status.value
    }

@api_router.patch("/sales/{sale_id}/cancel")
async def cancel_sale(
    sale_id: str,
    reason: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for sale cancellation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    # Get the sale
    sale = await target_db.sales.find_one(
        {"id": sale_id, "tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    # Check if sale is already cancelled
    if sale.get('status') == SaleStatus.CANCELLED.value:
        raise HTTPException(status_code=400, detail="Sale is already cancelled")
    
    # Prevent cancellation if payments have been made (business rule)
    if sale.get('amount_paid', 0) > 0:
        raise HTTPException(
            status_code=400, 
            detail="Cannot cancel sale with payments. Please process a return instead."
        )
    
    # Restore stock for each item
    for item in sale.get('items', []):
        if sale.get('branch_id'):
            # Restore branch-specific stock
            await target_db.product_branches.update_one(
                {
                    "product_id": item['product_id'],
                    "branch_id": sale['branch_id'],
                    "tenant_id": current_user["tenant_id"]
                },
                {
                    "$inc": {"stock": item['quantity']},
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
                }
            )
        else:
            # Restore global stock
            await target_db.products.update_one(
                {"id": item['product_id'], "tenant_id": current_user["tenant_id"]},
                {
                    "$inc": {"stock": item['quantity']},
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
                }
            )
    
    # Update sale status
    await target_db.sales.update_one(
        {"id": sale_id, "tenant_id": current_user["tenant_id"]},
        {
            "$set": {
                "status": SaleStatus.CANCELLED.value,
                "cancelled_by": current_user["id"],
                "cancellation_reason": reason,
                "cancelled_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Remove customer due if exists
    if sale.get('customer_name'):
        await target_db.customer_dues.delete_one(
            {"sale_id": sale_id, "tenant_id": current_user["tenant_id"]}
        )
    
    # Remove unpaid invoice notifications
    await target_db.notifications.delete_many(
        {
            "sale_id": sale_id,
            "tenant_id": current_user["tenant_id"],
            "type": NotificationType.UNPAID_INVOICE.value
        }
    )
    
    # Create cancellation notification
    notif = Notification(
        tenant_id=current_user["tenant_id"],
        type=NotificationType.SALE_CANCELLED,
        sale_id=sale_id,
        message=f"Sale {sale['sale_number']} has been cancelled",
        is_sticky=False
    )
    notif_doc = notif.model_dump()
    notif_doc['created_at'] = notif_doc['created_at'].isoformat()
    notif_doc['updated_at'] = notif_doc['updated_at'].isoformat()
    await target_db.notifications.insert_one(notif_doc)
    
    return {
        "message": "Sale cancelled successfully",
        "sale_id": sale_id,
        "stock_restored": len(sale.get('items', []))
    }

# ========== CUSTOMER DUES ROUTES ==========
@api_router.get("/customer-dues", response_model=List[CustomerDue])
async def get_customer_dues(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for customer dues: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    dues = await target_db.customer_dues.find(
        {
            "tenant_id": current_user["tenant_id"],
            "due_amount": {"$gt": 0}
        },
        {"_id": 0}
    ).to_list(1000)
    
    for due in dues:
        if isinstance(due.get('created_at'), str):
            due['created_at'] = datetime.fromisoformat(due['created_at'])
        if isinstance(due.get('updated_at'), str):
            due['updated_at'] = datetime.fromisoformat(due['updated_at'])
        if isinstance(due.get('transaction_date'), str):
            due['transaction_date'] = datetime.fromisoformat(due['transaction_date'])
    
    return dues

@api_router.get("/customer-dues/{due_id}", response_model=CustomerDue)
async def get_customer_due(
    due_id: str,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for customer due: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    due = await target_db.customer_dues.find_one(
        {"id": due_id, "tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    
    if not due:
        raise HTTPException(status_code=404, detail="Customer due not found")
    
    if isinstance(due.get('created_at'), str):
        due['created_at'] = datetime.fromisoformat(due['created_at'])
    if isinstance(due.get('updated_at'), str):
        due['updated_at'] = datetime.fromisoformat(due['updated_at'])
    if isinstance(due.get('transaction_date'), str):
        due['transaction_date'] = datetime.fromisoformat(due['transaction_date'])
    
    return due

# ========== NOTIFICATIONS ROUTES ==========
@api_router.get("/notifications")
async def get_notifications(
    type: Optional[NotificationType] = None,
    unread_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for notifications: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    query = {"tenant_id": current_user["tenant_id"]}
    
    # Role-based filtering
    user_role = current_user.get("role")
    user_branch_id = current_user.get("branch_id")
    user_id = current_user.get("id")
    
    # Tenant admins and super admins see all notifications
    if user_role not in [UserRole.TENANT_ADMIN.value, UserRole.SUPER_ADMIN.value]:
        # For other users, show notifications that match ANY of these criteria:
        # 1. Notification is specifically for this user (user_id matches)
        # 2. Notification is for their branch but not for a specific user (branch_id matches AND user_id is None)
        # 3. Notification has no branch_id and no user_id (tenant-wide notification)
        or_conditions = [
            {"user_id": user_id},  # User-specific notification
            {"branch_id": None, "user_id": None}  # Tenant-wide notification
        ]
        
        # Add branch-wide notifications (branch_id matches but user_id is None)
        if user_branch_id:
            or_conditions.append({"branch_id": user_branch_id, "user_id": None})
        
        query["$or"] = or_conditions
    
    if type:
        query["type"] = type.value
    
    if unread_only:
        query["is_read"] = False
    
    notifications = await target_db.notifications.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for notif in notifications:
        if isinstance(notif.get('created_at'), str):
            notif['created_at'] = datetime.fromisoformat(notif['created_at'])
        if isinstance(notif.get('updated_at'), str):
            notif['updated_at'] = datetime.fromisoformat(notif['updated_at'])
    
    return notifications

@api_router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for notification read: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    result = await target_db.notifications.update_one(
        {"id": notification_id, "tenant_id": current_user["tenant_id"]},
        {
            "$set": {
                "is_read": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}

@api_router.post("/notifications/scheduled-check")
async def scheduled_notification_check(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for scheduled notification check: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    tenant_id = current_user["tenant_id"]
    created_count = 0
    
    # 1. Check for low stock products (≤5 units)
    low_stock_products = await target_db.products.find(
        {"tenant_id": tenant_id, "stock": {"$lte": 5}},
        {"_id": 0}
    ).to_list(1000)
    
    for product in low_stock_products:
        # Check if notification already exists
        existing_notif = await target_db.notifications.find_one({
            "tenant_id": tenant_id,
            "type": NotificationType.LOW_STOCK,
            "reference_id": product['id']
        })
        
        if not existing_notif:
            notification = Notification(
                tenant_id=tenant_id,
                type=NotificationType.LOW_STOCK,
                reference_id=product['id'],
                message=f"Low stock alert: {product['name']} - Only {product['stock']} units left!",
                is_sticky=False
            )
            notif_doc = notification.model_dump()
            notif_doc['created_at'] = notif_doc['created_at'].isoformat()
            notif_doc['updated_at'] = notif_doc['updated_at'].isoformat()
            await target_db.notifications.insert_one(notif_doc)
            created_count += 1
    
    # 2. Check for unpaid/partially paid invoices older than 7 days
    from datetime import timedelta
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    
    overdue_sales = await target_db.sales.find(
        {
            "tenant_id": tenant_id,
            "payment_status": {"$in": [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID]},
            "created_at": {"$lt": seven_days_ago.isoformat()}
        },
        {"_id": 0}
    ).to_list(1000)
    
    for sale in overdue_sales:
        # Check if notification already exists and is still unread
        existing_notif = await target_db.notifications.find_one({
            "tenant_id": tenant_id,
            "type": NotificationType.UNPAID_INVOICE,
            "sale_id": sale['id'],
            "is_read": False
        })
        
        # Only create if no unread notification exists
        if not existing_notif:
            notification = Notification(
                tenant_id=tenant_id,
                type=NotificationType.UNPAID_INVOICE,
                sale_id=sale['id'],
                message=f"Overdue invoice {sale['invoice_no']}: ৳{sale.get('balance_due', 0):.2f} outstanding for 7+ days",
                is_sticky=True
            )
            notif_doc = notification.model_dump()
            notif_doc['created_at'] = notif_doc['created_at'].isoformat()
            notif_doc['updated_at'] = notif_doc['updated_at'].isoformat()
            await target_db.notifications.insert_one(notif_doc)
            created_count += 1
    
    # 3. Daily notifications for all customer dues (check last notification was 24+ hours ago)
    twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    
    all_customer_dues = await target_db.customer_dues.find(
        {"tenant_id": tenant_id},
        {"_id": 0}
    ).to_list(1000)
    
    daily_due_notifications = 0
    for due in all_customer_dues:
        # Check if a notification was created in the last 24 hours for this due
        recent_notif = await target_db.notifications.find_one({
            "tenant_id": tenant_id,
            "type": NotificationType.UNPAID_INVOICE.value,
            "reference_id": due['id'],
            "created_at": {"$gte": twenty_four_hours_ago.isoformat()}
        })
        
        # Only create daily notification if no notification in last 24 hours
        if not recent_notif:
            notification = Notification(
                tenant_id=tenant_id,
                type=NotificationType.UNPAID_INVOICE,
                reference_id=due['id'],
                sale_id=due.get('sale_id'),
                message=f"Daily Reminder: {due['customer_name']} has outstanding due of ৳{due['due_amount']:.2f} (Invoice: {due['sale_number']})",
                is_sticky=False
            )
            notif_doc = notification.model_dump()
            notif_doc['created_at'] = notif_doc['created_at'].isoformat()
            notif_doc['updated_at'] = notif_doc['updated_at'].isoformat()
            await target_db.notifications.insert_one(notif_doc)
            created_count += 1
            daily_due_notifications += 1
    
    return {
        "message": "Scheduled check completed",
        "notifications_created": created_count,
        "low_stock_products": len(low_stock_products),
        "overdue_invoices": len(overdue_sales),
        "daily_due_reminders": daily_due_notifications
    }

# ========== LOW STOCK ROUTES ==========
@api_router.get("/products/low-stock", response_model=List[Product])
async def get_low_stock_products(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for low-stock: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    products = await target_db.products.find(
        {"tenant_id": current_user["tenant_id"], "stock": {"$lt": 5}},
        {"_id": 0}
    ).to_list(1000)
    
    for product in products:
        if isinstance(product.get('created_at'), str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
        if isinstance(product.get('updated_at'), str):
            product['updated_at'] = datetime.fromisoformat(product['updated_at'])
    
    return products

# ========== DASHBOARD ROUTES ==========
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for dashboard stats: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    # Apply branch filtering based on user role
    query = apply_branch_filter(current_user)
    
    # Total sales (branch-filtered)
    sales = await target_db.sales.find(query, {"_id": 0}).to_list(10000)
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
    
    # Products stats (tenant-wide, not branch-specific)
    products = await target_db.products.find({"tenant_id": current_user["tenant_id"]}, {"_id": 0}).to_list(10000)
    total_products = len(products)
    low_stock_items = len([p for p in products if p.get("stock", 0) < 5])
    
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for sales chart: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    # Apply branch filtering based on user role
    query = apply_branch_filter(current_user)
    
    # Get last 7 days sales (branch-filtered)
    sales = await target_db.sales.find(query, {"_id": 0}).to_list(10000)
    
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

@api_router.get("/dashboard/alerts")
async def get_dashboard_alerts(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for dashboard alerts: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    tenant_id = current_user["tenant_id"]
    
    # Get all notifications
    all_notifications = await target_db.notifications.find(
        {"tenant_id": tenant_id},
        {"_id": 0}
    ).to_list(10000)
    
    # Count unread notifications
    unread_count = len([n for n in all_notifications if not n.get('is_read', False)])
    
    # Count by type
    unpaid_invoices = len([n for n in all_notifications if n.get('type') == NotificationType.UNPAID_INVOICE.value and not n.get('is_read', False)])
    low_stock_alerts = len([n for n in all_notifications if n.get('type') == NotificationType.LOW_STOCK.value and not n.get('is_read', False)])
    payment_received = len([n for n in all_notifications if n.get('type') == NotificationType.PAYMENT_RECEIVED.value and not n.get('is_read', False)])
    sale_cancelled = len([n for n in all_notifications if n.get('type') == NotificationType.SALE_CANCELLED.value and not n.get('is_read', False)])
    
    # Count sticky notifications (critical alerts)
    sticky_count = len([n for n in all_notifications if n.get('is_sticky', False) and not n.get('is_read', False)])
    
    # Get recent notifications (last 5)
    recent_notifications = sorted(
        all_notifications,
        key=lambda x: x.get('created_at', ''),
        reverse=True
    )[:5]
    
    return {
        "total_unread": unread_count,
        "sticky_alerts": sticky_count,
        "by_type": {
            "unpaid_invoices": unpaid_invoices,
            "low_stock": low_stock_alerts,
            "payment_received": payment_received,
            "sale_cancelled": sale_cancelled
        },
        "recent": recent_notifications
    }

# ========== PDF INVOICE ==========
@api_router.get("/sales/{sale_id}/invoice")
async def download_invoice(
    sale_id: str,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db  # Default to global DB for backwards compatibility
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Invoice generation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for invoice: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    sale = await target_db.sales.find_one({"id": sale_id, "tenant_id": current_user["tenant_id"]}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    # Enrich sale items with product names
    if "items" in sale and isinstance(sale["items"], list):
        for item in sale["items"]:
            if "product_id" in item and item["product_id"]:
                # Fetch product details
                product = await target_db.products.find_one(
                    {"id": item["product_id"], "tenant_id": current_user["tenant_id"]},
                    {"_id": 0, "name": 1, "sku": 1}
                )
                if product:
                    item["product_name"] = product.get("name", "Unknown Product")
                    item["product_sku"] = product.get("sku", "")
                else:
                    item["product_name"] = "Unknown Product"
                    item["product_sku"] = ""
    
    # Get payments for this sale if they exist
    payments = await target_db.payments.find(
        {"sale_id": sale_id},
        {"_id": 0}
    ).to_list(None) if hasattr(target_db, 'payments') else []
    
    # Return invoice data as JSON for the frontend
    return {
        "sale": sale,
        "payments": payments
    }

# ========== SUPPLIER ROUTES ==========
@api_router.post("/suppliers", response_model=Supplier)
async def create_supplier(
    supplier_data: SupplierCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Supplier creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for supplier: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    supplier = Supplier(
        tenant_id=current_user["tenant_id"],
        **supplier_data.model_dump()
    )
    
    doc = supplier.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.suppliers.insert_one(doc)
    return supplier

@api_router.get("/suppliers", response_model=List[Supplier])
async def get_suppliers(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for suppliers: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    # Apply branch filtering based on user role
    query = apply_branch_filter(current_user)
    
    suppliers = await target_db.suppliers.find(query, {"_id": 0}).to_list(1000)
    
    for supplier in suppliers:
        if isinstance(supplier.get('created_at'), str):
            supplier['created_at'] = datetime.fromisoformat(supplier['created_at'])
        if isinstance(supplier.get('updated_at'), str):
            supplier['updated_at'] = datetime.fromisoformat(supplier['updated_at'])
    
    return suppliers

@api_router.put("/suppliers/{supplier_id}", response_model=Supplier)
async def update_supplier(
    supplier_id: str,
    supplier_data: SupplierCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for supplier update: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    # Check if supplier exists
    existing = await target_db.suppliers.find_one(
        {"id": supplier_id, "tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Update supplier
    update_data = supplier_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await target_db.suppliers.update_one(
        {"id": supplier_id, "tenant_id": current_user["tenant_id"]},
        {"$set": update_data}
    )
    
    # Return updated supplier
    updated = await target_db.suppliers.find_one(
        {"id": supplier_id, "tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return updated

@api_router.delete("/suppliers/{supplier_id}")
async def delete_supplier(
    supplier_id: str,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for supplier deletion: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    # Check if supplier exists
    existing = await target_db.suppliers.find_one(
        {"id": supplier_id, "tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Delete supplier
    result = await target_db.suppliers.delete_one(
        {"id": supplier_id, "tenant_id": current_user["tenant_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    return {"message": "Supplier deleted successfully"}

# ========== CUSTOMER ROUTES ==========
@api_router.post("/customers", response_model=Customer)
async def create_customer(
    customer_data: CustomerCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Customer creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for customer: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    customer = Customer(
        tenant_id=current_user["tenant_id"],
        **customer_data.model_dump()
    )
    
    doc = customer.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.customers.insert_one(doc)
    return customer

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for customers: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    # Apply branch filtering based on user role
    query = apply_branch_filter(current_user)
    
    customers = await target_db.customers.find(query, {"_id": 0}).to_list(1000)
    
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for expense creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    expense = Expense(
        tenant_id=current_user["tenant_id"],
        **expense_data.model_dump()
    )
    
    doc = expense.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.expenses.insert_one(doc)
    return expense

@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for expenses: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    # Apply branch filtering based on user role
    query = apply_branch_filter(current_user)
    
    expenses = await target_db.expenses.find(query, {"_id": 0}).to_list(1000)
    
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for purchase creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    # Generate purchase number
    count = await target_db.purchases.count_documents({"tenant_id": current_user["tenant_id"]})
    purchase_number = f"PO-{count + 1:06d}"
    
    purchase = Purchase(
        tenant_id=current_user["tenant_id"],
        purchase_number=purchase_number,
        **purchase_data.model_dump()
    )
    
    doc = purchase.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.purchases.insert_one(doc)
    return purchase

@api_router.get("/purchases", response_model=List[Purchase])
async def get_purchases(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for purchases: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    # Apply branch filtering based on user role
    query = apply_branch_filter(current_user)
    
    purchases = await target_db.purchases.find(query, {"_id": 0}).to_list(1000)
    
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for profit-loss report: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    tenant_id = current_user["tenant_id"]
    
    # Get sales
    sales = await target_db.sales.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(10000)
    total_revenue = sum(sale.get("total", 0) for sale in sales)
    
    # Get expenses
    expenses = await target_db.expenses.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(10000)
    total_expenses = sum(expense.get("amount", 0) for expense in expenses)
    
    # Get purchases
    purchases = await target_db.purchases.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(10000)
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for top-products report: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    # Get all sales and aggregate by product
    sales = await target_db.sales.find({"tenant_id": current_user["tenant_id"]}, {"_id": 0}).to_list(10000)
    
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
    
    # Enrich with product details
    enriched_products = []
    for pid, data in top_products:
        product = await target_db.products.find_one(
            {"id": pid, "tenant_id": current_user["tenant_id"]},
            {"_id": 0}
        )
        enriched_data = {
            "product_id": pid,
            "quantity": data["quantity"],
            "revenue": data["revenue"]
        }
        if product:
            enriched_data["product_name"] = product.get("name")
            enriched_data["product_sku"] = product.get("sku")
        enriched_products.append(enriched_data)
    
    return enriched_products

# ========== DOCTOR ROUTES (Clinic) ==========
@api_router.post("/doctors", response_model=Doctor)
async def create_doctor(
    doctor_data: DoctorCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Doctor creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for doctor creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    doctor = Doctor(
        tenant_id=current_user["tenant_id"],
        **doctor_data.model_dump()
    )
    
    doc = doctor.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.doctors.insert_one(doc)
    return doctor

@api_router.get("/doctors", response_model=List[Doctor])
async def get_doctors(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for doctors list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    doctors = await target_db.doctors.find(
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Patient creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for patient creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    patient = Patient(
        tenant_id=current_user["tenant_id"],
        **patient_data.model_dump()
    )
    
    doc = patient.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.patients.insert_one(doc)
    return patient

@api_router.get("/patients", response_model=List[Patient])
async def get_patients(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for patients list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    patients = await target_db.patients.find(
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Vehicle creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for vehicle creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    vehicle = Vehicle(
        tenant_id=current_user["tenant_id"],
        **vehicle_data.model_dump()
    )
    
    doc = vehicle.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.vehicles.insert_one(doc)
    return vehicle

@api_router.get("/vehicles", response_model=List[Vehicle])
async def get_vehicles(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for vehicles list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    vehicles = await target_db.vehicles.find(
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Property creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for property creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    property_obj = Property(
        tenant_id=current_user["tenant_id"],
        **property_data.model_dump()
    )
    
    doc = property_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.properties.insert_one(doc)
    return property_obj

@api_router.get("/properties", response_model=List[Property])
async def get_properties(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for properties list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    properties = await target_db.properties.find(
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Product variant creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for product variant creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    variant = ProductVariant(
        tenant_id=current_user["tenant_id"],
        **variant_data.model_dump()
    )
    
    doc = variant.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.product_variants.insert_one(doc)
    return variant

@api_router.get("/product-variants", response_model=List[ProductVariant])
async def get_product_variants(
    product_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for product variants list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    query = {"tenant_id": current_user["tenant_id"]}
    if product_id:
        query["product_id"] = product_id
    
    variants = await target_db.product_variants.find(query, {"_id": 0}).to_list(1000)
    
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Offer creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for offer creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    offer = Offer(
        tenant_id=current_user["tenant_id"],
        **offer_data.model_dump()
    )
    
    doc = offer.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.offers.insert_one(doc)
    return offer

@api_router.get("/offers", response_model=List[Offer])
async def get_offers(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for offers list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    offers = await target_db.offers.find(
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
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for offer toggle: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    offer = await target_db.offers.find_one({"id": offer_id, "tenant_id": current_user["tenant_id"]}, {"_id": 0})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    new_status = not offer.get("is_active", True)
    await target_db.offers.update_one(
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for warranty creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
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
    
    await target_db.warranties.insert_one(doc)
    return warranty

@api_router.get("/warranties", response_model=List[Warranty])
async def get_warranties(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for warranties list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    warranties = await target_db.warranties.find(
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for return creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    return_request = ReturnRequest(
        tenant_id=current_user["tenant_id"],
        **return_data.model_dump()
    )
    
    doc = return_request.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.returns.insert_one(doc)
    return return_request

@api_router.get("/returns", response_model=List[ReturnRequest])
async def get_returns(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for returns list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    returns = await target_db.returns.find(
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
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for return approval: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    return_req = await target_db.returns.find_one({"id": return_id, "tenant_id": current_user["tenant_id"]}, {"_id": 0})
    if not return_req:
        raise HTTPException(status_code=404, detail="Return request not found")
    
    # Check if already approved
    if return_req.get('status') == 'approved':
        raise HTTPException(status_code=400, detail="Return already approved")
    
    # Get the associated sale to find branch_id
    sale = await target_db.sales.find_one(
        {"id": return_req['sale_id'], "tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    
    if sale:
        # Restore stock based on branch_id
        if sale.get('branch_id'):
            # Restore to branch-specific stock
            await target_db.product_branches.update_one(
                {
                    "product_id": return_req['product_id'],
                    "branch_id": sale['branch_id'],
                    "tenant_id": current_user["tenant_id"]
                },
                {
                    "$inc": {"stock": return_req['quantity']},
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
                }
            )
        else:
            # Restore to global stock
            await target_db.products.update_one(
                {"id": return_req['product_id'], "tenant_id": current_user["tenant_id"]},
                {
                    "$inc": {"stock": return_req['quantity']},
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
                }
            )
        
        # Update sale total and payment status if needed
        refund_amount = return_req.get('refund_amount', 0)
        if refund_amount > 0:
            new_total = sale['total'] - refund_amount
            new_amount_paid = max(0, sale.get('amount_paid', 0) - refund_amount)
            new_balance_due = new_total - new_amount_paid
            
            # Determine new payment status
            if new_balance_due == 0:
                new_payment_status = PaymentStatus.PAID
            elif new_amount_paid > 0:
                new_payment_status = PaymentStatus.PARTIALLY_PAID
            else:
                new_payment_status = PaymentStatus.UNPAID
            
            await target_db.sales.update_one(
                {"id": return_req['sale_id'], "tenant_id": current_user["tenant_id"]},
                {
                    "$set": {
                        "total": new_total,
                        "amount_paid": new_amount_paid,
                        "balance_due": new_balance_due,
                        "payment_status": new_payment_status.value,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            # Update or delete customer due if exists
            if sale.get('customer_name'):
                if new_balance_due == 0:
                    # Delete customer due record when fully paid after refund
                    await target_db.customer_dues.delete_one(
                        {"sale_id": return_req['sale_id'], "tenant_id": current_user["tenant_id"]}
                    )
                else:
                    # Update customer due with new amounts
                    await target_db.customer_dues.update_one(
                        {"sale_id": return_req['sale_id'], "tenant_id": current_user["tenant_id"]},
                        {
                            "$set": {
                                "total_amount": new_total,
                                "paid_amount": new_amount_paid,
                                "due_amount": new_balance_due,
                                "updated_at": datetime.now(timezone.utc).isoformat()
                            }
                        }
                    )
    
    # Update return request status
    await target_db.returns.update_one(
        {"id": return_id, "tenant_id": current_user["tenant_id"]},
        {
            "$set": {
                "status": "approved",
                "approved_by": current_user["id"],
                "approved_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "message": "Return request approved and stock restored",
        "refund_amount": return_req.get('refund_amount', 0)
    }

# ========== BOOK ROUTES (Stationery) ==========
@api_router.post("/books", response_model=Book)
async def create_book(
    book_data: BookCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Book creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for book creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    book = Book(
        tenant_id=current_user["tenant_id"],
        **book_data.model_dump()
    )
    
    doc = book.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.books.insert_one(doc)
    return book

@api_router.get("/books", response_model=List[Book])
async def get_books(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for books list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    books = await target_db.books.find(
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Bulk pricing creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for bulk pricing creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    pricing = BulkPricing(
        tenant_id=current_user["tenant_id"],
        **pricing_data.model_dump()
    )
    
    doc = pricing.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.bulk_pricing.insert_one(doc)
    return pricing

@api_router.get("/bulk-pricing", response_model=List[BulkPricing])
async def get_bulk_pricing(
    product_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for bulk pricing list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    query = {"tenant_id": current_user["tenant_id"]}
    if product_id:
        query["product_id"] = product_id
    
    pricing = await target_db.bulk_pricing.find(query, {"_id": 0}).to_list(1000)
    
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Custom order creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for custom order creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    order_number = f"CO-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    
    order = CustomOrder(
        tenant_id=current_user["tenant_id"],
        order_number=order_number,
        **order_data.model_dump()
    )
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.custom_orders.insert_one(doc)
    return order

@api_router.get("/custom-orders", response_model=List[CustomOrder])
async def get_custom_orders(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for custom orders list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    orders = await target_db.custom_orders.find(
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
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for custom order installment: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    order = await target_db.custom_orders.find_one({"id": order_id, "tenant_id": current_user["tenant_id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    installments = order.get("installments", [])
    installments.append(installment)
    
    await target_db.custom_orders.update_one(
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Tier pricing creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for tier pricing creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    pricing = TierPricing(
        tenant_id=current_user["tenant_id"],
        **pricing_data.model_dump()
    )
    
    doc = pricing.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.tier_pricing.insert_one(doc)
    return pricing

@api_router.get("/tier-pricing", response_model=List[TierPricing])
async def get_tier_pricing(
    product_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for tier pricing list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    query = {"tenant_id": current_user["tenant_id"]}
    if product_id:
        query["product_id"] = product_id
    
    pricing = await target_db.tier_pricing.find(query, {"_id": 0}).to_list(1000)
    
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Purchase order creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for purchase order creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    po_number = f"PO-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    
    po = PurchaseOrder(
        tenant_id=current_user["tenant_id"],
        po_number=po_number,
        **po_data.model_dump()
    )
    
    doc = po.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.purchase_orders.insert_one(doc)
    return po

@api_router.get("/purchase-orders", response_model=List[PurchaseOrder])
async def get_purchase_orders(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for purchase orders list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    orders = await target_db.purchase_orders.find(
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Goods receipt creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for goods receipt creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    grn_number = f"GRN-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    
    grn = GoodsReceipt(
        tenant_id=current_user["tenant_id"],
        grn_number=grn_number,
        **grn_data.model_dump()
    )
    
    doc = grn.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.goods_receipts.insert_one(doc)
    return grn

@api_router.get("/goods-receipts", response_model=List[GoodsReceipt])
async def get_goods_receipts(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for goods receipts list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    receipts = await target_db.goods_receipts.find(
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Online order creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for online order creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    order_number = f"ORD-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    
    order = OnlineOrder(
        tenant_id=current_user["tenant_id"],
        order_number=order_number,
        **order_data.model_dump()
    )
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.online_orders.insert_one(doc)
    return order

@api_router.get("/online-orders", response_model=List[OnlineOrder])
async def get_online_orders(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for online orders list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    orders = await target_db.online_orders.find(
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
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for online order update: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    order = await target_db.online_orders.find_one({"id": order_id, "tenant_id": current_user["tenant_id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await target_db.online_orders.update_one(
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Branch creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for branch creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    branch = Branch(
        tenant_id=current_user["tenant_id"],
        **branch_data.model_dump()
    )
    
    doc = branch.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.branches.insert_one(doc)
    return branch

@api_router.get("/branches", response_model=List[Branch])
async def get_branches(
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for branches: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    branches = await target_db.branches.find(
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
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for branch retrieval: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    branch = await target_db.branches.find_one(
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for branch update: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    branch = await target_db.branches.find_one({"id": branch_id, "tenant_id": current_user["tenant_id"]}, {"_id": 0})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    await target_db.branches.update_one(
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for branch deletion: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    result = await target_db.branches.delete_one({"id": branch_id, "tenant_id": current_user["tenant_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    # Also delete associated product-branch records
    await target_db.product_branches.delete_many({"branch_id": branch_id, "tenant_id": current_user["tenant_id"]})
    
    return {"message": "Branch deleted successfully"}

# ========== PRODUCT-BRANCH ASSIGNMENT ROUTES ==========
@api_router.post("/product-branches", response_model=ProductBranch)
async def assign_product_to_branch(
    assignment: ProductBranchCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Product-branch assignment using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for product-branch: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    # Check if assignment already exists
    existing = await target_db.product_branches.find_one({
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
    
    await target_db.product_branches.insert_one(doc)
    
    # Create notifications for users in this branch about new stock
    product = await target_db.products.find_one(
        {"id": assignment.product_id, "tenant_id": current_user["tenant_id"]},
        {"_id": 0, "name": 1}
    )
    
    branch = await target_db.branches.find_one(
        {"id": assignment.branch_id, "tenant_id": current_user["tenant_id"]},
        {"_id": 0, "name": 1}
    )
    
    if product and branch:
        # Get all users assigned to this branch
        branch_users = await target_db.users.find(
            {"branch_id": assignment.branch_id, "tenant_id": current_user["tenant_id"]},
            {"_id": 0, "id": 1}
        ).to_list(1000)
        
        # Create notification for each branch user
        for user in branch_users:
            notification = Notification(
                tenant_id=current_user["tenant_id"],
                branch_id=assignment.branch_id,
                user_id=user["id"],
                type=NotificationType.ACTIVITY,
                title="New Stock Available",
                message=f"New product '{product['name']}' with {assignment.stock_quantity} units has been assigned to {branch['name']}",
                is_sticky=False,
                is_read=False,
                metadata={"product_id": assignment.product_id, "stock_quantity": assignment.stock_quantity}
            )
            notif_doc = notification.model_dump()
            notif_doc['created_at'] = notif_doc['created_at'].isoformat()
            notif_doc['updated_at'] = notif_doc['updated_at'].isoformat()
            await target_db.notifications.insert_one(notif_doc)
    
    return product_branch

@api_router.get("/product-branches", response_model=List[ProductBranch])
async def get_product_branches(
    product_id: Optional[str] = None,
    branch_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for product-branches: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    query = {"tenant_id": current_user["tenant_id"]}
    
    # Branch managers can only see their branch
    if current_user["role"] == "branch_manager" and current_user.get("branch_id"):
        query["branch_id"] = current_user["branch_id"]
    elif branch_id:
        query["branch_id"] = branch_id
    
    if product_id:
        query["product_id"] = product_id
    
    assignments = await target_db.product_branches.find(query, {"_id": 0}).to_list(10000)
    
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
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for product-branch update: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    assignment = await target_db.product_branches.find_one(
        {"id": assignment_id, "tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Branch managers can only update their branch
    if current_user["role"] == "branch_manager":
        if assignment["branch_id"] != current_user.get("branch_id"):
            raise HTTPException(status_code=403, detail="Can only update own branch")
    
    await target_db.product_branches.update_one(
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for product-branch deletion: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    result = await target_db.product_branches.delete_one({
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for stock transfer creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    # Verify source branch has enough stock
    source_assignment = await target_db.product_branches.find_one({
        "product_id": transfer_data.product_id,
        "branch_id": transfer_data.from_branch_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    if not source_assignment:
        raise HTTPException(status_code=404, detail="Product not found in source branch")
    
    if source_assignment.get("stock_quantity", 0) < transfer_data.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock in source branch")
    
    # Verify destination branch exists
    dest_assignment = await target_db.product_branches.find_one({
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
    
    await target_db.stock_transfers.insert_one(doc)
    
    # Update source branch stock (deduct)
    await target_db.product_branches.update_one(
        {"id": source_assignment["id"], "tenant_id": current_user["tenant_id"]},
        {
            "$inc": {"stock_quantity": -transfer_data.quantity},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Update destination branch stock (add)
    await target_db.product_branches.update_one(
        {"id": dest_assignment["id"], "tenant_id": current_user["tenant_id"]},
        {
            "$inc": {"stock_quantity": transfer_data.quantity},
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for stock transfers list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
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
    
    transfers = await target_db.stock_transfers.find(query, {"_id": 0}).to_list(10000)
    
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for branch stats: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    # Verify branch exists and user has access
    branch = await target_db.branches.find_one({
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
    products_count = await target_db.product_branches.count_documents({
        "branch_id": branch_id,
        "tenant_id": current_user["tenant_id"]
    })
    
    # Get total stock value
    product_branches = await target_db.product_branches.find({
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Component creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for component creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    component = Component(
        tenant_id=current_user["tenant_id"],
        **component_data.model_dump()
    )
    
    doc = component.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.components.insert_one(doc)
    return component

@api_router.get("/components", response_model=List[Component])
async def get_components(
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for components list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    query = {"tenant_id": current_user["tenant_id"]}
    if category:
        query["category"] = category
    
    components = await target_db.components.find(query, {"_id": 0}).to_list(10000)
    
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Computer product creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for computer product creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    product = ComputerProduct(
        tenant_id=current_user["tenant_id"],
        **product_data.model_dump()
    )
    
    doc = product.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.computer_products.insert_one(doc)
    return product

@api_router.get("/computer-products", response_model=List[ComputerProduct])
async def get_computer_products(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for computer products list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    query = {"tenant_id": current_user["tenant_id"]}
    if status:
        query["status"] = status
    
    products = await target_db.computer_products.find(query, {"_id": 0}).to_list(10000)
    
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
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for computer product retrieval: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    product = await target_db.computer_products.find_one({
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Job card creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for job card creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
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
    
    await target_db.job_cards.insert_one(doc)
    return job_card

@api_router.get("/job-cards", response_model=List[JobCard])
async def get_job_cards(
    status: Optional[str] = None,
    technician_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for job cards list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    query = {"tenant_id": current_user["tenant_id"]}
    if status:
        query["status"] = status
    if technician_id:
        query["technician_id"] = technician_id
    
    job_cards = await target_db.job_cards.find(query, {"_id": 0}).to_list(10000)
    
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
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for job card status update: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    job_card = await target_db.job_cards.find_one({
        "id": job_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    if not job_card:
        raise HTTPException(status_code=404, detail="Job card not found")
    
    update_data = {**status_data, "updated_at": datetime.now(timezone.utc).isoformat()}
    
    if status_data.get("status") == "completed" and not job_card.get("completion_date"):
        update_data["completion_date"] = datetime.now(timezone.utc).isoformat()
    
    await target_db.job_cards.update_one(
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
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for job card part addition: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    job_card = await target_db.job_cards.find_one({
        "id": job_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    if not job_card:
        raise HTTPException(status_code=404, detail="Job card not found")
    
    parts_used = job_card.get("parts_used", [])
    parts_used.append(part_data)
    
    actual_cost = job_card.get("actual_cost", 0) + part_data.get("cost", 0)
    
    await target_db.job_cards.update_one(
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
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ Device history creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for device history creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    device = DeviceHistory(
        tenant_id=current_user["tenant_id"],
        **device_data.model_dump()
    )
    
    doc = device.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.device_history.insert_one(doc)
    return device

@api_router.get("/device-history", response_model=List[DeviceHistory])
async def get_device_history(
    customer_id: Optional[str] = None,
    serial_number: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for device history list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    query = {"tenant_id": current_user["tenant_id"]}
    if customer_id:
        query["customer_id"] = customer_id
    if serial_number:
        query["serial_number"] = serial_number
    
    devices = await target_db.device_history.find(query, {"_id": 0}).to_list(10000)
    
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
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for device repair addition: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    device = await target_db.device_history.find_one({
        "id": device_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    repair_history = device.get("repair_history", [])
    if job_card_id not in repair_history:
        repair_history.append(job_card_id)
    
    await target_db.device_history.update_one(
        {"id": device_id, "tenant_id": current_user["tenant_id"]},
        {"$set": {
            "repair_history": repair_history,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Repair added to device history"}

# ========== CNF SHIPMENT ROUTES ==========
@api_router.post("/cnf/shipments", response_model=Shipment)
async def create_shipment(
    shipment_data: ShipmentCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ CNF shipment creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF shipment creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    shipment = Shipment(
        tenant_id=current_user["tenant_id"],
        **shipment_data.model_dump()
    )
    
    doc = shipment.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.cnf_shipments.insert_one(doc)
    return shipment

@api_router.get("/cnf/shipments", response_model=List[Shipment])
async def get_shipments(current_user: dict = Depends(get_current_user)):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF shipments list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    shipments = await target_db.cnf_shipments.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(10000)
    
    for shipment in shipments:
        if isinstance(shipment.get('created_at'), str):
            shipment['created_at'] = datetime.fromisoformat(shipment['created_at'])
        if isinstance(shipment.get('updated_at'), str):
            shipment['updated_at'] = datetime.fromisoformat(shipment['updated_at'])
    
    return shipments

@api_router.put("/cnf/shipments/{shipment_id}")
async def update_shipment(
    shipment_id: str,
    shipment_data: ShipmentCreate,
    current_user: dict = Depends(get_current_user)
):
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF shipment update: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    shipment = await target_db.cnf_shipments.find_one({
        "id": shipment_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    update_data = shipment_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await target_db.cnf_shipments.update_one(
        {"id": shipment_id, "tenant_id": current_user["tenant_id"]},
        {"$set": update_data}
    )
    
    return {"message": "Shipment updated successfully"}

@api_router.patch("/cnf/shipments/{shipment_id}/status")
async def update_shipment_status(
    shipment_id: str,
    status: ShipmentStatus,
    current_user: dict = Depends(get_current_user)
):
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF shipment status update: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    result = await target_db.cnf_shipments.update_one(
        {"id": shipment_id, "tenant_id": current_user["tenant_id"]},
        {"$set": {
            "status": status.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    return {"message": "Shipment status updated"}

@api_router.delete("/cnf/shipments/{shipment_id}")
async def delete_shipment(
    shipment_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF shipment deletion: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    result = await target_db.cnf_shipments.delete_one({
        "id": shipment_id,
        "tenant_id": current_user["tenant_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    return {"message": "Shipment deleted successfully"}

# ========== CNF JOB FILE ROUTES ==========
@api_router.post("/cnf/jobs", response_model=JobFile)
async def create_job_file(
    job_data: JobFileCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ CNF job file creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF job file creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    job = JobFile(
        tenant_id=current_user["tenant_id"],
        **job_data.model_dump()
    )
    
    doc = job.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.cnf_job_files.insert_one(doc)
    return job

@api_router.get("/cnf/jobs", response_model=List[JobFile])
async def get_job_files(current_user: dict = Depends(get_current_user)):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF job files list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    jobs = await target_db.cnf_job_files.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(10000)
    
    for job in jobs:
        if isinstance(job.get('created_at'), str):
            job['created_at'] = datetime.fromisoformat(job['created_at'])
        if isinstance(job.get('updated_at'), str):
            job['updated_at'] = datetime.fromisoformat(job['updated_at'])
    
    return jobs

@api_router.put("/cnf/jobs/{job_id}")
async def update_job_file(
    job_id: str,
    job_data: JobFileCreate,
    current_user: dict = Depends(get_current_user)
):
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF job file update: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    job = await target_db.cnf_job_files.find_one({
        "id": job_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    if not job:
        raise HTTPException(status_code=404, detail="Job file not found")
    
    update_data = job_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await target_db.cnf_job_files.update_one(
        {"id": job_id, "tenant_id": current_user["tenant_id"]},
        {"$set": update_data}
    )
    
    return {"message": "Job file updated successfully"}

@api_router.patch("/cnf/jobs/{job_id}/status")
async def update_job_status(
    job_id: str,
    status: JobFileStatus,
    current_user: dict = Depends(get_current_user)
):
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF job status update: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    result = await target_db.cnf_job_files.update_one(
        {"id": job_id, "tenant_id": current_user["tenant_id"]},
        {"$set": {
            "status": status.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Job file not found")
    
    return {"message": "Job status updated"}

@api_router.delete("/cnf/jobs/{job_id}")
async def delete_job_file(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF job file deletion: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    result = await target_db.cnf_job_files.delete_one({
        "id": job_id,
        "tenant_id": current_user["tenant_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job file not found")
    
    return {"message": "Job file deleted successfully"}

# ========== CNF BILLING ROUTES ==========
@api_router.post("/cnf/billing", response_model=CNFBilling)
async def create_billing(
    billing_data: CNFBillingCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ CNF billing creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF billing creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    # Calculate totals
    subtotal = (
        billing_data.cnf_charges +
        billing_data.transport_charges +
        billing_data.documentation_charges +
        billing_data.port_charges +
        billing_data.other_charges
    )
    total_amount = subtotal - billing_data.discount
    
    # Generate invoice number
    invoice_count = await target_db.cnf_billing.count_documents({"tenant_id": current_user["tenant_id"]})
    invoice_number = f"INV-CNF-{invoice_count + 1:05d}"
    
    billing = CNFBilling(
        tenant_id=current_user["tenant_id"],
        invoice_number=invoice_number,
        subtotal=subtotal,
        total_amount=total_amount,
        **billing_data.model_dump()
    )
    
    doc = billing.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.cnf_billing.insert_one(doc)
    return billing

@api_router.get("/cnf/billing", response_model=List[CNFBilling])
async def get_billings(current_user: dict = Depends(get_current_user)):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF billing list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    billings = await target_db.cnf_billing.find(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    ).to_list(10000)
    
    for billing in billings:
        if isinstance(billing.get('created_at'), str):
            billing['created_at'] = datetime.fromisoformat(billing['created_at'])
        if isinstance(billing.get('updated_at'), str):
            billing['updated_at'] = datetime.fromisoformat(billing['updated_at'])
    
    return billings

@api_router.patch("/cnf/billing/{billing_id}/payment")
async def update_payment_status(
    billing_id: str,
    payment_status: str,
    payment_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF billing payment update: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    update_data = {
        "payment_status": payment_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if payment_date:
        update_data["payment_date"] = payment_date
    
    result = await target_db.cnf_billing.update_one(
        {"id": billing_id, "tenant_id": current_user["tenant_id"]},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Billing record not found")
    
    return {"message": "Payment status updated"}

# ========== CNF DOCUMENT ROUTES ==========
@api_router.post("/cnf/documents", response_model=Document)
async def create_document(
    document_data: DocumentCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ CNF document creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF document creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    document = Document(
        tenant_id=current_user["tenant_id"],
        **document_data.model_dump()
    )
    
    doc = document.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.cnf_documents.insert_one(doc)
    return document

@api_router.get("/cnf/documents", response_model=List[Document])
async def get_documents(
    shipment_id: Optional[str] = None,
    job_file_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF documents list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    query = {"tenant_id": current_user["tenant_id"]}
    if shipment_id:
        query["shipment_id"] = shipment_id
    if job_file_id:
        query["job_file_id"] = job_file_id
    
    documents = await target_db.cnf_documents.find(query, {"_id": 0}).to_list(10000)
    
    for document in documents:
        if isinstance(document.get('created_at'), str):
            document['created_at'] = datetime.fromisoformat(document['created_at'])
        if isinstance(document.get('updated_at'), str):
            document['updated_at'] = datetime.fromisoformat(document['updated_at'])
    
    return documents

@api_router.put("/cnf/documents/{document_id}")
async def update_document(
    document_id: str,
    document_data: DocumentCreate,
    current_user: dict = Depends(get_current_user)
):
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF document update: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    document = await target_db.cnf_documents.find_one({
        "id": document_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    update_data = document_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await target_db.cnf_documents.update_one(
        {"id": document_id, "tenant_id": current_user["tenant_id"]},
        {"$set": update_data}
    )
    
    return {"message": "Document updated successfully"}

@api_router.delete("/cnf/documents/{document_id}")
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF document deletion: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    result = await target_db.cnf_documents.delete_one({
        "id": document_id,
        "tenant_id": current_user["tenant_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"message": "Document deleted successfully"}

# ========== CNF TRANSPORT ROUTES ==========
@api_router.post("/cnf/transport", response_model=Transport)
async def create_transport(
    transport_data: TransportCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
            logger.info(f"✅ CNF transport creation using tenant-specific DB: {target_db.name}")
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF transport creation: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    # Generate transport number
    transport_count = await target_db.cnf_transport.count_documents({"tenant_id": current_user["tenant_id"]})
    transport_number = f"TRN-{transport_count + 1:05d}"
    
    transport = Transport(
        tenant_id=current_user["tenant_id"],
        transport_number=transport_number,
        **transport_data.model_dump()
    )
    
    doc = transport.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await target_db.cnf_transport.insert_one(doc)
    return transport

@api_router.get("/cnf/transport", response_model=List[Transport])
async def get_transports(
    job_file_id: Optional[str] = None,
    shipment_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF transport list: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    query = {"tenant_id": current_user["tenant_id"]}
    if job_file_id:
        query["job_file_id"] = job_file_id
    if shipment_id:
        query["shipment_id"] = shipment_id
    
    transports = await target_db.cnf_transport.find(query, {"_id": 0}).to_list(10000)
    
    for transport in transports:
        if isinstance(transport.get('created_at'), str):
            transport['created_at'] = datetime.fromisoformat(transport['created_at'])
        if isinstance(transport.get('updated_at'), str):
            transport['updated_at'] = datetime.fromisoformat(transport['updated_at'])
    
    return transports

@api_router.put("/cnf/transport/{transport_id}")
async def update_transport(
    transport_id: str,
    transport_data: TransportCreate,
    current_user: dict = Depends(get_current_user)
):
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF transport update: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    transport = await target_db.cnf_transport.find_one({
        "id": transport_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    if not transport:
        raise HTTPException(status_code=404, detail="Transport not found")
    
    update_data = transport_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await target_db.cnf_transport.update_one(
        {"id": transport_id, "tenant_id": current_user["tenant_id"]},
        {"$set": update_data}
    )
    
    return {"message": "Transport updated successfully"}

@api_router.patch("/cnf/transport/{transport_id}/status")
async def update_transport_status(
    transport_id: str,
    status: TransportStatus,
    actual_delivery_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF transport status update: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    update_data = {
        "status": status.value,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if actual_delivery_date:
        update_data["actual_delivery_date"] = actual_delivery_date
    
    result = await target_db.cnf_transport.update_one(
        {"id": transport_id, "tenant_id": current_user["tenant_id"]},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Transport not found")
    
    return {"message": "Transport status updated"}

@api_router.delete("/cnf/transport/{transport_id}")
async def delete_transport(
    transport_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF transport deletion: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    result = await target_db.cnf_transport.delete_one({
        "id": transport_id,
        "tenant_id": current_user["tenant_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transport not found")
    
    return {"message": "Transport deleted successfully"}

# ========== CNF REPORTS ROUTE ==========
@api_router.get("/cnf/reports/summary")
async def get_cnf_reports_summary(current_user: dict = Depends(get_current_user)):
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    # Resolve tenant-specific database
    target_db = db
    if current_user.get("tenant_slug"):
        try:
            target_db = await resolve_tenant_db(current_user["tenant_slug"])
        except Exception as resolve_error:
            logger.error(f"❌ Failed to resolve tenant DB for CNF reports: {resolve_error}")
            raise HTTPException(status_code=500, detail="Failed to resolve tenant database")
    
    tenant_id = current_user["tenant_id"]
    
    # Get counts
    total_shipments = await target_db.cnf_shipments.count_documents({"tenant_id": tenant_id})
    active_shipments = await target_db.cnf_shipments.count_documents({
        "tenant_id": tenant_id,
        "status": {"$nin": ["delivered"]}
    })
    total_jobs = await target_db.cnf_job_files.count_documents({"tenant_id": tenant_id})
    active_jobs = await target_db.cnf_job_files.count_documents({
        "tenant_id": tenant_id,
        "status": {"$nin": ["completed", "cancelled"]}
    })
    
    # Get billing summary
    billings = await target_db.cnf_billing.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(10000)
    total_revenue = sum(b.get("total_amount", 0) for b in billings)
    pending_payments = sum(
        b.get("total_amount", 0) for b in billings 
        if b.get("payment_status") == "pending"
    )
    
    # Get transport summary
    total_transports = await target_db.cnf_transport.count_documents({"tenant_id": tenant_id})
    active_transports = await target_db.cnf_transport.count_documents({
        "tenant_id": tenant_id,
        "status": {"$nin": ["delivered", "cancelled"]}
    })
    
    return {
        "total_shipments": total_shipments,
        "active_shipments": active_shipments,
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "total_revenue": total_revenue,
        "pending_payments": pending_payments,
        "total_transports": total_transports,
        "active_transports": active_transports
    }

app.include_router(api_router)

# Include health check router for multi-tenant monitoring
try:
    from health_tenant import health_router
    app.include_router(health_router)
except ImportError:
    logger.warning("Health check router not available - multi-tenant health endpoints disabled")

# Include example router for multi-tenant demonstration
try:
    from example_tenant_route import example_router
    app.include_router(example_router)
except ImportError:
    logger.warning("Example router not available - multi-tenant demo endpoints disabled")

# Include warranty management router
try:
    from warranty_routes import warranty_router
    app.include_router(warranty_router, prefix="/api")
except ImportError as e:
    logger.warning(f"Warranty router not available - warranty management endpoints disabled: {e}")

# Mount uploads directory for settings images
uploads_path = Path(__file__).parent / "static" / "uploads"
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

# Add OPTIONS handler for CORS preflight requests
@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    return {}

frontend_build_path = Path(__file__).parent.parent / "frontend" / "build"

if frontend_build_path.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_build_path / "static")), name="static")
    
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        file_path = frontend_build_path / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_build_path / "index.html")
else:
    print(f"⚠️  Warning: Frontend build directory not found at {frontend_build_path}")
    print("   The React app needs to be built before deployment.")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()