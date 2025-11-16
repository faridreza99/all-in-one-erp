"""
Example route demonstrating TenantContext usage for multi-tenant database access.
This example shows how to migrate existing routes to use tenant-scoped databases.

Add this to server.py to enable:
    from example_tenant_route import example_router
    app.include_router(example_router)
"""
from fastapi import APIRouter, HTTPException, Depends
from tenant_dependency import TenantContext, get_tenant_context
from typing import List, Optional

example_router = APIRouter(prefix="/api/example", tags=["Multi-Tenant Example"])


@example_router.get("/products")
async def get_tenant_products(
    ctx: TenantContext = Depends(get_tenant_context),
    limit: int = 100,
    skip: int = 0
):
    """
    Example: Get products for the current tenant using tenant-scoped database.
    
    This demonstrates the recommended pattern for multi-tenant routes:
    1. Use TenantContext dependency to get user + tenant DB
    2. Query only from ctx.db (tenant-specific database)
    3. Filter by tenant_id for additional safety
    
    Usage:
        GET /api/example/products
        Authorization: Bearer <jwt_token>
    """
    try:
        # Query products from tenant-specific database
        query = {"tenant_id": ctx.user.get("tenant_id")}
        
        # Additional branch filtering if user has branch_id
        branch_id = ctx.user.get("branch_id")
        if branch_id:
            query["branch_id"] = branch_id
        
        products = await ctx.db.products.find(query).skip(skip).limit(limit).to_list(limit)
        
        return {
            "tenant_slug": ctx.tenant_slug,
            "database": ctx.db.name,
            "count": len(products),
            "products": products
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch products: {str(e)}")


@example_router.get("/stats")
async def get_tenant_stats(ctx: TenantContext = Depends(get_tenant_context)):
    """
    Example: Get statistics for the current tenant.
    
    Shows how to:
    - Access multiple collections from tenant DB
    - Aggregate data within tenant scope
    - Return tenant-specific metadata
    """
    try:
        tenant_id = ctx.user.get("tenant_id")
        
        # Count documents in various collections
        products_count = await ctx.db.products.count_documents({"tenant_id": tenant_id})
        sales_count = await ctx.db.sales.count_documents({"tenant_id": tenant_id})
        customers_count = await ctx.db.customers.count_documents({"tenant_id": tenant_id})
        branches_count = await ctx.db.branches.count_documents({"tenant_id": tenant_id})
        
        # Get collection names
        all_collections = await ctx.db.list_collection_names()
        
        return {
            "tenant_info": {
                "slug": ctx.tenant_slug,
                "database": ctx.db.name,
                "user_email": ctx.user.get("email"),
                "business_type": ctx.user.get("business_type")
            },
            "statistics": {
                "products": products_count,
                "sales": sales_count,
                "customers": customers_count,
                "branches": branches_count
            },
            "database_info": {
                "total_collections": len(all_collections),
                "collections": sorted(all_collections)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


@example_router.post("/products")
async def create_tenant_product(
    product_data: dict,
    ctx: TenantContext = Depends(get_tenant_context)
):
    """
    Example: Create a product in tenant-specific database.
    
    Demonstrates:
    - Write operations to tenant DB
    - Automatic tenant_id injection
    - Transaction safety within tenant scope
    """
    try:
        # Ensure tenant_id is set
        product_data["tenant_id"] = ctx.user.get("tenant_id")
        
        # If user has branch, set it
        if ctx.user.get("branch_id"):
            product_data["branch_id"] = ctx.user.get("branch_id")
        
        # Insert into tenant-specific database
        result = await ctx.db.products.insert_one(product_data)
        
        return {
            "success": True,
            "tenant_slug": ctx.tenant_slug,
            "database": ctx.db.name,
            "product_id": str(result.inserted_id),
            "message": "Product created in tenant-specific database"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create product: {str(e)}")


# ==========================================
# MIGRATION PATTERN COMPARISON
# ==========================================

"""
BEFORE (Legacy - Shared Database):
-----------------------------------
@api_router.get("/products")
async def get_products(current_user: dict = Depends(get_current_user)):
    # All tenants share same database
    products = await db.products.find(
        {"tenant_id": current_user["tenant_id"]}
    ).to_list(100)
    return products


AFTER (Multi-Tenant - Separate Databases):
------------------------------------------
@api_router.get("/products")
async def get_products(ctx: TenantContext = Depends(get_tenant_context)):
    # Each tenant has isolated database
    products = await ctx.db.products.find(
        {"tenant_id": ctx.user["tenant_id"]}
    ).to_list(100)
    return products


KEY CHANGES:
1. Replace `current_user` with `ctx` (TenantContext)
2. Change `db.collection` to `ctx.db.collection`
3. Access user via `ctx.user` instead of `current_user`
4. Tenant DB is automatically resolved from JWT tenant_slug


BENEFITS:
✅ True data isolation (each tenant = separate database)
✅ Better security (no cross-tenant queries possible)
✅ Scalability (distribute tenants across DB clusters)
✅ Performance (smaller databases, better indexes)
✅ Compliance (GDPR, data residency requirements)
"""
