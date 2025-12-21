"""
Multi-tenant database connection management.
Provides dynamic database connections per tenant with client caching.
"""
from functools import lru_cache
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional, Dict
import os
import certifi
import logging

logger = logging.getLogger(__name__)

# Admin database for tenant registry
ADMIN_MONGO_URL = os.environ.get('ADMIN_MONGO_URL') or os.environ.get('MONGO_URL')
ADMIN_DB_NAME = os.environ.get('ADMIN_DB_NAME', 'admin_hub')

# Default/fallback database for legacy support
DEFAULT_MONGO_URL = os.environ.get('DEFAULT_MONGO_URL') or os.environ.get('MONGO_URL')
DEFAULT_DB_NAME = os.environ.get('DB_NAME', 'erp_database')


@lru_cache(maxsize=256)
def get_mongo_client(uri: str) -> AsyncIOMotorClient:
    """
    Get a cached MongoDB client for the given URI.
    Uses LRU cache to reuse connections and avoid creating new sockets.
    
    Args:
        uri: MongoDB connection string
        
    Returns:
        AsyncIOMotorClient instance
    """
    logger.info(f"Creating new MongoDB client for URI: {uri[:30]}...")
    return AsyncIOMotorClient(
        uri,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=10000
    )


def get_admin_db():
    """
    Get the admin database for tenant registry.
    
    Returns:
        Database handle for admin_hub
    """
    client = get_mongo_client(ADMIN_MONGO_URL)
    return client[ADMIN_DB_NAME]


def get_default_db():
    """
    Get the default/fallback database for legacy single-tenant mode.
    
    Returns:
        Database handle for default database
    """
    client = get_mongo_client(DEFAULT_MONGO_URL)
    return client[DEFAULT_DB_NAME]


async def get_tenant_from_registry(tenant_slug: str) -> Optional[Dict]:
    """
    Fetch tenant configuration from the admin registry.
    
    Args:
        tenant_slug: Unique identifier for the tenant
        
    Returns:
        Tenant document or None if not found
    """
    admin_db = get_admin_db()
    tenant = await admin_db.tenants_registry.find_one(
        {"slug": tenant_slug, "status": "active"},
        {"_id": 0}
    )
    return tenant


def get_tenant_db(db_uri: str, db_name: Optional[str] = None):
    """
    Get database connection for a specific tenant.
    
    Args:
        db_uri: MongoDB connection string for the tenant
        db_name: Optional database name (extracted from URI if not provided)
        
    Returns:
        Database handle for the tenant
    """
    client = get_mongo_client(db_uri)
    
    # If db_name is provided, use it; otherwise use the default from client
    if db_name:
        return client[db_name]
    else:
        # Extract database name from URI or use default
        return client.get_database()


async def resolve_tenant_db(tenant_slug: str):
    """
    Resolve and return the database connection for a tenant.
    
    Args:
        tenant_slug: Unique identifier for the tenant
        
    Returns:
        Database handle for the tenant
        
    Raises:
        ValueError: If tenant not found or inactive
    """
    # Fetch tenant from registry
    tenant = await get_tenant_from_registry(tenant_slug)
    
    if not tenant:
        logger.error(f"Tenant not found or inactive: {tenant_slug}")
        raise ValueError(f"Tenant '{tenant_slug}' not found or inactive")
    
    # Get tenant's database connection
    db_uri = tenant.get('db_uri')
    db_name = tenant.get('db_name')
    
    if not db_uri:
        logger.error(f"Tenant {tenant_slug} has no db_uri configured")
        raise ValueError(f"Tenant '{tenant_slug}' has no database configured")
    
    logger.info(f"Resolved tenant '{tenant_slug}' to database: {db_name or 'default'}")
    return get_tenant_db(db_uri, db_name)


# In-memory tenant cache to reduce registry lookups
_tenant_cache: Dict[str, Dict] = {}

async def get_cached_tenant(tenant_slug: str) -> Optional[Dict]:
    """
    Get tenant from cache or fetch from registry.
    
    Args:
        tenant_slug: Unique identifier for the tenant
        
    Returns:
        Tenant document or None
    """
    if tenant_slug in _tenant_cache:
        return _tenant_cache[tenant_slug]
    
    tenant = await get_tenant_from_registry(tenant_slug)
    if tenant:
        _tenant_cache[tenant_slug] = tenant
    
    return tenant


def clear_tenant_cache(tenant_slug: Optional[str] = None):
    """
    Clear tenant cache for a specific tenant or all tenants.
    
    Args:
        tenant_slug: Optional tenant to clear, clears all if None
    """
    global _tenant_cache
    if tenant_slug:
        _tenant_cache.pop(tenant_slug, None)
        logger.info(f"Cleared cache for tenant: {tenant_slug}")
    else:
        _tenant_cache.clear()
        logger.info("Cleared all tenant cache")


async def get_all_tenants():
    """
    Get all active tenants from the registry.
    
    Returns:
        List of tenant documents
    """
    admin_db = get_admin_db()
    tenants = await admin_db.tenants_registry.find(
        {"status": "active"},
        {"_id": 0}
    ).to_list(1000)
    return tenants
