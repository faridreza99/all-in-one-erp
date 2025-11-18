from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid

class WarrantyStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CLAIMED = "claimed"
    UNDER_INSPECTION = "under_inspection"
    REPLACEMENT_PENDING = "replacement_pending"
    REPLACED = "replaced"
    REFUNDED = "refunded"
    DECLINED = "declined"
    CLOSED = "closed"

class EventType(str, Enum):
    CLAIM_REGISTERED = "claim_registered"
    CLAIM_UPDATED = "claim_updated"
    INSPECTION_STARTED = "inspection_started"
    INSPECTION_PASSED = "inspection_passed"
    INSPECTION_FAILED = "inspection_failed"
    SUPPLIER_ACTION_REQUESTED = "supplier_action_requested"
    SUPPLIER_ACTION_RECORDED = "supplier_action_recorded"
    REPLACEMENT_ISSUED = "replacement_issued"
    CASH_REFUND_ISSUED = "cash_refund_issued"
    MANUAL_VERIFICATION = "manual_verification"
    ESCALATED = "escalated"
    STATUS_CHANGED = "status_changed"

class ActorType(str, Enum):
    CUSTOMER = "customer"
    STAFF = "staff"
    SUPPLIER = "supplier"
    SYSTEM = "system"

class SupplierActionType(str, Enum):
    REPLACEMENT_SENT = "replacement_sent"
    REPAIR_SENT = "repair_sent"
    CASH_REFUND_OFFERED = "cash_refund_offered"
    DECLINED = "declined"
    PARTIAL_REFUND = "partial_refund"

class SupplierActionStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"

class BaseDBModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WarrantyRecord(BaseDBModel):
    tenant_id: str
    warranty_code: str
    warranty_token: str
    invoice_id: str
    invoice_no: str
    sale_id: str
    product_id: str
    product_name: str
    serial_number: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    purchase_date: datetime
    warranty_period_months: int
    warranty_start_date: datetime
    warranty_expiry_date: datetime
    current_status: WarrantyStatus = WarrantyStatus.ACTIVE
    replaced_by_warranty_id: Optional[str] = None
    supplier_warranty_id: Optional[str] = None
    transferable: bool = False
    fraud_score: float = 0.0
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

class WarrantyEvent(BaseDBModel):
    tenant_id: str
    warranty_id: str
    event_type: EventType
    actor_type: ActorType
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    note: Optional[str] = None
    attachments: List[str] = Field(default_factory=list)
    meta: Dict[str, Any] = Field(default_factory=dict)

class SupplierAction(BaseDBModel):
    tenant_id: str
    warranty_id: str
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    action_type: SupplierActionType
    action_details: Dict[str, Any] = Field(default_factory=dict)
    status: SupplierActionStatus = SupplierActionStatus.PENDING
    notes: Optional[str] = None

class FinancialTransaction(BaseDBModel):
    tenant_id: str
    warranty_id: str
    transaction_type: str
    amount: float
    reference: Optional[str] = None
    notes: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

class ClaimCreate(BaseModel):
    warranty_token: str  # Required HMAC-signed token for authentication
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    reported_issue: str
    images: List[str] = Field(default_factory=list)
    preferred_action: Optional[str] = None

class InspectionCreate(BaseModel):
    inspection_result: str
    notes: Optional[str] = None
    estimated_cost: Optional[float] = None
    attachments: List[str] = Field(default_factory=list)

class SupplierActionCreate(BaseModel):
    action_type: SupplierActionType
    action_details: Dict[str, Any] = Field(default_factory=dict)
    notes: Optional[str] = None

class WarrantyResolveResponse(BaseModel):
    warranty_id: str
    warranty_code: str
    product: Dict[str, Any]
    purchase_date: str
    expiry_date: str
    status: str
    can_claim: bool
    allowed_actions: List[str]
    days_remaining: Optional[int] = None
    customer_name: Optional[str] = None

class SupplierWarrantyStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CLAIM_FILED = "claim_filed"
    CLAIM_APPROVED = "claim_approved"
    CLAIM_REJECTED = "claim_rejected"
    SETTLED = "settled"
    CLOSED = "closed"

class SupplierWarrantyRecord(BaseDBModel):
    tenant_id: str
    warranty_code: str
    purchase_id: str
    purchase_item_id: str
    supplier_id: str
    supplier_name: str
    product_id: str
    product_name: str
    serial_number: Optional[str] = None
    warranty_terms: str
    coverage_details: Optional[str] = None
    warranty_period_months: int
    coverage_start_date: datetime
    coverage_expiry_date: datetime
    current_status: SupplierWarrantyStatus = SupplierWarrantyStatus.ACTIVE
    attachments: List[Dict[str, Any]] = Field(default_factory=list)
    claim_filed_at: Optional[datetime] = None
    claim_resolved_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

class SupplierWarrantyEvent(BaseDBModel):
    tenant_id: str
    supplier_warranty_id: str
    event_type: str
    actor_type: ActorType
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    note: Optional[str] = None
    attachments: List[str] = Field(default_factory=list)
    meta: Dict[str, Any] = Field(default_factory=dict)

class SupplierWarrantyCreate(BaseModel):
    purchase_item_id: str
    product_id: str
    product_name: str
    serial_number: Optional[str] = None
    warranty_terms: str
    coverage_details: Optional[str] = None
    warranty_period_months: int
    coverage_start_date: Optional[str] = None
    attachments: List[Dict[str, Any]] = Field(default_factory=list)
    notes: Optional[str] = None
