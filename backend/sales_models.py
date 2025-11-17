"""
Sales and audit log models for tenant analytics and tracking.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
import uuid


class Sale(BaseModel):
    """
    Sales record stored in each tenant's database.
    Used for analytics and revenue tracking in Super Admin dashboard.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str = Field(..., description="Tenant slug/ID this sale belongs to")
    total: float = Field(..., description="Total sale amount")
    customer_name: Optional[str] = Field(None, description="Customer name")
    payment_method: Optional[str] = Field("cash", description="Payment method: cash, card, etc")
    items_count: int = Field(default=1, description="Number of items sold")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional sale data")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "sale-123",
                "tenant_id": "mobile",
                "total": 45000.00,
                "customer_name": "John Doe",
                "payment_method": "card",
                "items_count": 3,
                "created_at": "2025-01-15T10:30:00",
                "metadata": {"branch": "main", "staff": "admin"}
            }
        }


class AuditLog(BaseModel):
    """
    Audit log entry stored in admin_hub database.
    Tracks all important system actions for compliance and debugging.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: Optional[str] = Field(None, description="Tenant ID (null for system-wide actions)")
    user_id: str = Field(..., description="User ID who performed the action")
    action: str = Field(..., description="Action type: CREATE_SALE, LOGIN, SUSPEND_TENANT, etc")
    resource_type: Optional[str] = Field(None, description="Type of resource: tenant, sale, user, etc")
    resource_id: Optional[str] = Field(None, description="ID of the resource affected")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "id": "log-456",
                "tenant_id": "mobile",
                "user_id": "user-789",
                "action": "CREATE_SALE",
                "resource_type": "sale",
                "resource_id": "sale-123",
                "metadata": {"amount": 45000, "ip": "192.168.1.1"},
                "created_at": "2025-01-15T10:30:00"
            }
        }


class SaleCreate(BaseModel):
    """Request model for creating a new sale"""
    total: float
    customer_name: Optional[str] = None
    payment_method: str = "cash"
    items_count: int = 1
    metadata: Optional[Dict[str, Any]] = None
