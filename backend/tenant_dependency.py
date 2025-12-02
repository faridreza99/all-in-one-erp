"""
FastAPI dependencies for multi-tenant database resolution.
"""
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from typing import Optional
import os
import logging
from db_connection import resolve_tenant_db, get_cached_tenant, get_default_db

logger = logging.getLogger(__name__)

security = HTTPBearer()
# Use JWT_SECRET_KEY (same as server.py) for compatibility
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', os.environ.get('JWT_SECRET', os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')))
ALGORITHM = "HS256"


async def get_current_user_from_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Extract and validate user from JWT token.
    Returns user data including tenant_slug.
    """
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Extract tenant information from token
        tenant_slug = payload.get("tenant_slug")
        
        return {
            "id": user_id,
            "email": payload.get("email"),
            "tenant_id": payload.get("tenant_id"),
            "tenant_slug": tenant_slug,
            "role": payload.get("role"),
            "branch_id": payload.get("branch_id"),
            "business_type": payload.get("business_type"),
            "business_name": payload.get("business_name")
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        logger.error(f"Token validation failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_tenant_db_dependency(
    current_user: dict = Depends(get_current_user_from_token)
):
    """
    Dependency to get the tenant-specific database connection.
    Resolves the database based on tenant_slug from JWT.
    
    Returns:
        Database handle for the authenticated tenant
    """
    tenant_slug = current_user.get("tenant_slug")
    
    # If no tenant_slug (legacy/default mode), use default database
    if not tenant_slug:
        logger.warning(f"No tenant_slug for user {current_user.get('email')}, using default DB")
        return get_default_db()
    
    try:
        # Resolve tenant database
        tenant_db = await resolve_tenant_db(tenant_slug)
        logger.info(f"Resolved DB for tenant '{tenant_slug}': {tenant_db.name}")
        return tenant_db
    except ValueError as e:
        logger.error(f"Tenant resolution failed for '{tenant_slug}': {e}")
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Database connection failed for tenant '{tenant_slug}': {e}")
        raise HTTPException(status_code=503, detail="Database connection failed")


class TenantContext:
    """
    Helper class to provide both user and tenant DB in a single dependency.
    """
    def __init__(self, user: dict, db):
        self.user = user
        self.db = db
        self.tenant_slug = user.get("tenant_slug")


async def get_tenant_context(
    current_user: dict = Depends(get_current_user_from_token),
    tenant_db = Depends(get_tenant_db_dependency)
) -> TenantContext:
    """
    Combined dependency that provides both user context and tenant database.
    
    Usage in routes:
        @api_router.get("/products")
        async def get_products(ctx: TenantContext = Depends(get_tenant_context)):
            products = await ctx.db.products.find({"tenant_id": ctx.user["tenant_id"]}).to_list(100)
            return products
    """
    return TenantContext(user=current_user, db=tenant_db)


async def get_tenant_info(tenant_slug: str) -> Optional[dict]:
    """
    Helper function to get tenant information from the registry.
    
    Args:
        tenant_slug: Tenant slug/identifier
        
    Returns:
        Tenant information dict or None
    """
    return await get_cached_tenant(tenant_slug)
