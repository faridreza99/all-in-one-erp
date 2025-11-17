from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum

class BillingCycleEnum(str, Enum):
    """Valid billing cycle values"""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    LIFETIME = "lifetime"

class CreateSubscriptionRequest(BaseModel):
    """Request model for creating a subscription"""
    tenant_id: str = Field(..., description="Tenant ID to assign subscription to")
    plan_id: str = Field(..., description="Plan ID (free, basic, pro, enterprise)")
    billing_cycle: Optional[BillingCycleEnum] = Field(default=None, description="Billing cycle override (uses plan default if not specified)")
    notes: Optional[str] = Field(default="", description="Admin notes")

class RecordPaymentRequest(BaseModel):
    """Request model for recording a manual payment"""
    subscription_id: str = Field(..., description="Subscription ID")
    amount: float = Field(..., description="Payment amount", gt=0)
    payment_method: str = Field(default="bank_transfer", description="Payment method")
    payment_date: Optional[str] = Field(default=None, description="Payment date (ISO format)")
    receipt_number: Optional[str] = Field(default=None, description="Receipt/invoice number")
    notes: Optional[str] = Field(default="", description="Payment notes")
