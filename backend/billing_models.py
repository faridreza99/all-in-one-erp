from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime
from enum import Enum

class PlanTier(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class SubscriptionStatus(str, Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    GRACE = "grace"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"

class BillingCycle(str, Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    LIFETIME = "lifetime"

class Plan(BaseModel):
    """
    Subscription plan definition stored in admin_hub.plans
    """
    plan_id: str = Field(..., description="Unique plan identifier (e.g., 'free', 'pro')")
    name: str = Field(..., description="Display name (e.g., 'Professional Plan')")
    tier: PlanTier
    description: Optional[str] = Field(None, description="Plan description")
    price: float = Field(0.0, description="Price in USD")
    billing_cycle: BillingCycle = Field(BillingCycle.MONTHLY)
    
    quotas: Dict = Field(default_factory=dict, description="Resource limits")
    features: List[str] = Field(default_factory=list, description="Enabled features")
    
    is_active: bool = Field(True, description="Whether plan is available for new subscriptions")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "plan_id": "pro",
                "name": "Professional Plan",
                "tier": "pro",
                "price": 99.0,
                "billing_cycle": "monthly",
                "quotas": {
                    "max_products": 10000,
                    "max_users": 50,
                    "max_pos_terminals": 10,
                    "max_storage_gb": 100,
                    "max_orders_per_month": 50000,
                    "max_branches": 10
                },
                "features": ["pos", "inventory", "analytics", "reports", "api_access"]
            }
        }

class Subscription(BaseModel):
    """
    Tenant subscription stored in admin_hub.subscriptions
    One subscription per tenant at a time
    """
    subscription_id: str = Field(..., description="Unique subscription ID")
    tenant_id: str = Field(..., description="Reference to tenant")
    plan_id: str = Field(..., description="Current plan ID")
    
    status: SubscriptionStatus = Field(SubscriptionStatus.TRIAL)
    billing_cycle: BillingCycle = Field(BillingCycle.MONTHLY)
    
    starts_on: datetime = Field(..., description="Subscription start date")
    expires_on: Optional[datetime] = Field(None, description="Expiration date")
    next_review_at: Optional[datetime] = Field(None, description="Next scheduled check")
    auto_disable_at: Optional[datetime] = Field(None, description="Auto-suspend date")
    
    current_period_start: datetime = Field(..., description="Current billing period start")
    current_period_end: Optional[datetime] = Field(None, description="Current billing period end")
    
    trial_ends_at: Optional[datetime] = Field(None, description="Trial period end")
    grace_period_days: int = Field(3, description="Grace period after expiry")
    
    plan_snapshot: Dict = Field(default_factory=dict, description="Plan details at subscription time")
    
    metadata: Dict = Field(default_factory=dict, description="Additional metadata")
    notes: Optional[str] = Field(None, description="Admin notes")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "subscription_id": "sub_123abc",
                "tenant_id": "tenant_456def",
                "plan_id": "pro",
                "status": "active",
                "billing_cycle": "monthly",
                "starts_on": "2025-01-01T00:00:00Z",
                "expires_on": "2025-02-01T00:00:00Z",
                "grace_period_days": 3
            }
        }

class PaymentRecord(BaseModel):
    """
    Manual payment entry in admin_hub.payment_ledger
    """
    payment_id: str = Field(..., description="Unique payment ID")
    subscription_id: str = Field(..., description="Associated subscription")
    tenant_id: str = Field(..., description="Tenant who paid")
    
    amount: float = Field(..., description="Payment amount")
    currency: str = Field("USD", description="Currency code")
    
    payment_method: str = Field(..., description="How they paid (bank transfer, cash, check, etc)")
    payment_date: datetime = Field(..., description="Date payment received")
    
    period_start: datetime = Field(..., description="Period this payment covers from")
    period_end: datetime = Field(..., description="Period this payment covers to")
    
    receipt_number: Optional[str] = Field(None, description="Receipt/invoice number")
    notes: Optional[str] = Field(None, description="Admin notes about payment")
    
    recorded_by: str = Field(..., description="Super admin who recorded this")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "payment_id": "pay_789ghi",
                "subscription_id": "sub_123abc",
                "tenant_id": "tenant_456def",
                "amount": 99.0,
                "payment_method": "bank_transfer",
                "payment_date": "2025-01-15T10:30:00Z",
                "period_start": "2025-01-01T00:00:00Z",
                "period_end": "2025-02-01T00:00:00Z",
                "receipt_number": "REC-2025-001",
                "recorded_by": "superadmin@erp.com"
            }
        }

class BillingEvent(BaseModel):
    """
    Audit log for subscription lifecycle events in admin_hub.billing_events
    """
    event_id: str = Field(..., description="Unique event ID")
    subscription_id: str = Field(..., description="Associated subscription")
    tenant_id: str = Field(..., description="Affected tenant")
    
    event_type: str = Field(..., description="Event type (created, renewed, suspended, etc)")
    old_status: Optional[str] = Field(None, description="Previous subscription status")
    new_status: str = Field(..., description="New subscription status")
    
    triggered_by: str = Field(..., description="Who/what triggered this (user email or 'system')")
    reason: Optional[str] = Field(None, description="Reason for change")
    
    metadata: Dict = Field(default_factory=dict, description="Additional event data")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "event_id": "evt_abc123",
                "subscription_id": "sub_123abc",
                "tenant_id": "tenant_456def",
                "event_type": "subscription_suspended",
                "old_status": "active",
                "new_status": "suspended",
                "triggered_by": "system",
                "reason": "Payment expired, grace period ended"
            }
        }

class UsageSnapshot(BaseModel):
    """
    Daily usage tracking for future metering in admin_hub.usage_snapshots
    """
    snapshot_id: str = Field(..., description="Unique snapshot ID")
    tenant_id: str = Field(..., description="Tenant being measured")
    subscription_id: str = Field(..., description="Associated subscription")
    
    snapshot_date: datetime = Field(..., description="Date of this snapshot")
    
    usage_metrics: Dict = Field(default_factory=dict, description="Usage counts")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "snapshot_id": "snap_xyz789",
                "tenant_id": "tenant_456def",
                "subscription_id": "sub_123abc",
                "snapshot_date": "2025-01-15T00:00:00Z",
                "usage_metrics": {
                    "products_count": 1250,
                    "users_count": 15,
                    "pos_terminals_count": 3,
                    "storage_used_gb": 25.5,
                    "orders_this_month": 3420,
                    "branches_count": 2,
                    "api_calls_today": 15000
                }
            }
        }
