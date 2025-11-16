"""
Tenant registry models for multi-database architecture.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class TenantRegistry(BaseModel):
    """
    Tenant registry model stored in the central admin database.
    Each tenant represents a separate business with its own isolated database.
    """
    slug: str = Field(..., description="Unique identifier for the tenant (URL-safe)")
    business_name: str = Field(..., description="Display name of the business")
    business_type: str = Field(..., description="Type of business (computer_shop, cnf, pharmacy, etc.)")
    db_uri: str = Field(..., description="MongoDB connection string for this tenant's database")
    db_name: Optional[str] = Field(None, description="Database name (optional if included in URI)")
    admin_email: str = Field(..., description="Primary admin email for this tenant")
    status: str = Field(default="active", description="Tenant status: active, suspended, inactive")
    license_type: Optional[str] = Field(None, description="License tier: free, pro, enterprise")
    max_users: Optional[int] = Field(None, description="Maximum users allowed")
    max_branches: Optional[int] = Field(None, description="Maximum branches allowed")
    features_enabled: List[str] = Field(default_factory=list, description="List of enabled features")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    billing_contact: Optional[str] = Field(None, description="Billing contact email")
    notes: Optional[str] = Field(None, description="Admin notes about this tenant")

    class Config:
        json_schema_extra = {
            "example": {
                "slug": "techland",
                "business_name": "TechLand Computers",
                "business_type": "computer_shop",
                "db_uri": "mongodb+srv://user:pass@cluster.mongodb.net/computer_techland_db",
                "db_name": "computer_techland_db",
                "admin_email": "admin@techland.com",
                "status": "active",
                "license_type": "pro",
                "max_users": 50,
                "max_branches": 10,
                "features_enabled": ["pos", "inventory", "repairs", "analytics"]
            }
        }


class TenantCreate(BaseModel):
    """Request model for creating a new tenant"""
    slug: str
    business_name: str
    business_type: str
    db_uri: str
    db_name: Optional[str] = None
    admin_email: str
    admin_password: str
    license_type: Optional[str] = "free"
    max_users: Optional[int] = 10
    max_branches: Optional[int] = 3


class TenantUpdate(BaseModel):
    """Request model for updating tenant information"""
    business_name: Optional[str] = None
    status: Optional[str] = None
    license_type: Optional[str] = None
    max_users: Optional[int] = None
    max_branches: Optional[int] = None
    features_enabled: Optional[List[str]] = None
    billing_contact: Optional[str] = None
    notes: Optional[str] = None


class TenantHealth(BaseModel):
    """Health check response for tenant connection"""
    tenant_slug: str
    database_name: str
    database_connected: bool
    collections_count: Optional[int] = None
    last_activity: Optional[datetime] = None
