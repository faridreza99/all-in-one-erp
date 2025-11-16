"""
Tenant health check endpoints for multi-tenant architecture.
Add these routes to server.py for monitoring tenant database connections.
"""
from fastapi import APIRouter, Depends, HTTPException
from tenant_dependency import get_tenant_context, TenantContext
from tenant_models import TenantHealth
from datetime import datetime

# Create router for health check endpoints
health_router = APIRouter(prefix="/api/health", tags=["Health"])


@health_router.get("/tenant", response_model=TenantHealth)
async def get_tenant_health(ctx: TenantContext = Depends(get_tenant_context)):
    """
    Get health check information for the current tenant's database connection.
    
    Returns tenant slug, database name, connection status, and metadata.
    """
    try:
        # Get database info
        db_name = ctx.db.name
        tenant_slug = ctx.tenant_slug or "default"
        
        # Test database connection
        try:
            # Count collections as a simple health check
            collections = await ctx.db.list_collection_names()
            collections_count = len(collections)
            connected = True
        except Exception as e:
            collections_count = None
            connected = False
        
        return TenantHealth(
            tenant_slug=tenant_slug,
            database_name=db_name,
            database_connected=connected,
            collections_count=collections_count,
            last_activity=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Health check failed: {str(e)}"
        )


@health_router.get("/tenant/collections")
async def get_tenant_collections(ctx: TenantContext = Depends(get_tenant_context)):
    """
    List all collections in the current tenant's database.
    Useful for debugging and verifying tenant database structure.
    """
    try:
        collections = await ctx.db.list_collection_names()
        
        return {
            "tenant_slug": ctx.tenant_slug or "default",
            "database_name": ctx.db.name,
            "collections": sorted(collections),
            "total_collections": len(collections)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list collections: {str(e)}"
        )
