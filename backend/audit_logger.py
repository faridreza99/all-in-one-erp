"""
Audit logging utility for tracking system actions.
All audit logs are stored in the admin_hub database for centralized monitoring.
"""
import os
from datetime import datetime
from typing import Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
import uuid

# Admin database connection
ADMIN_MONGO_URL = os.getenv("MONGO_URL")
ADMIN_DB_NAME = "admin_hub"

# Singleton client
_audit_client = None


def get_audit_client():
    """Get or create the audit log database client"""
    global _audit_client
    if _audit_client is None:
        _audit_client = AsyncIOMotorClient(ADMIN_MONGO_URL, tlsCAFile=certifi.where())
    return _audit_client


async def log_action(
    user_id: str,
    action: str,
    tenant_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
):
    """
    Log an action to the audit_logs collection.
    
    Args:
        user_id: ID of the user who performed the action
        action: Action type (e.g., "LOGIN", "CREATE_SALE", "SUSPEND_TENANT")
        tenant_id: Tenant ID (optional, null for system-wide actions)
        resource_type: Type of resource (e.g., "tenant", "sale", "user")
        resource_id: ID of the affected resource
        metadata: Additional context as a dictionary
    """
    client = get_audit_client()
    admin_db = client[ADMIN_DB_NAME]
    
    log_entry = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": action,
        "tenant_id": tenant_id,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "metadata": metadata or {},
        "created_at": datetime.utcnow()
    }
    
    await admin_db.audit_logs.insert_one(log_entry)


async def get_tenant_audit_logs(tenant_id: str, limit: int = 50):
    """Get recent audit logs for a specific tenant"""
    client = get_audit_client()
    admin_db = client[ADMIN_DB_NAME]
    
    logs = await admin_db.audit_logs.find(
        {"tenant_id": tenant_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return logs


async def get_system_audit_logs(limit: int = 100):
    """Get recent system-wide audit logs (for Super Admin)"""
    client = get_audit_client()
    admin_db = client[ADMIN_DB_NAME]
    
    logs = await admin_db.audit_logs.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return logs


async def get_user_audit_logs(user_id: str, limit: int = 50):
    """Get recent audit logs for a specific user"""
    client = get_audit_client()
    admin_db = client[ADMIN_DB_NAME]
    
    logs = await admin_db.audit_logs.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return logs
