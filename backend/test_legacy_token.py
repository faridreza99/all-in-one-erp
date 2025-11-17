"""
Dev-only script to generate JWT tokens for legacy users (no tenant_slug).
Used for testing backwards compatibility with pre-multi-tenant users.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timedelta, timezone
from jose import jwt

# JWT config (MUST match server.py exactly) - read from environment just like server does
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')  # Fixed: removed "this"
ALGORITHM = "HS256"

async def generate_legacy_token():
    """
    Generate a JWT token for a legacy user (no tenant_slug).
    This simulates the old authentication flow before multi-tenant migration.
    """
    mongo_url = os.getenv('MONGO_URL')
    client = AsyncIOMotorClient(mongo_url)
    global_db = client['erp_database']
    
    # Find a legacy user (not in admin_hub.tenants_registry)
    legacy_user = await global_db.users.find_one(
        {"email": "supertech@example.com"},
        {"_id": 0}
    )
    
    if not legacy_user:
        print("❌ Legacy user not found")
        client.close()
        return None
    
    # Get tenant info from legacy tenants collection
    tenant = await global_db.tenants.find_one(
        {"tenant_id": legacy_user["tenant_id"]},
        {"_id": 0}
    )
    
    business_type = tenant.get("business_type") if tenant else None
    business_name = tenant.get("name") if tenant else None
    
    # Create JWT payload WITHOUT tenant_slug (legacy mode)
    payload = {
        "sub": legacy_user["id"],
        "email": legacy_user["email"],
        "tenant_id": legacy_user["tenant_id"],
        "tenant_slug": None,  # IMPORTANT: Legacy users have no tenant_slug
        "role": legacy_user.get("role", "tenant_admin"),
        "branch_id": legacy_user.get("branch_id"),
        "business_type": business_type,
        "business_name": business_name,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)  # Match server's token expiration
    }
    
    # Encode JWT
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
    print("✅ Generated Legacy JWT Token")
    print(f"\n📋 User Info:")
    print(f"   Email: {legacy_user['email']}")
    print(f"   ID: {legacy_user['id']}")
    print(f"   Tenant ID: {legacy_user['tenant_id']}")
    print(f"   Business Type: {business_type}")
    print(f"   Role: {payload['role']}")
    print(f"\n⚠️  Token has NO tenant_slug (legacy mode)")
    print(f"\n🔑 Token:\n{token}")
    
    client.close()
    return token

if __name__ == "__main__":
    token = asyncio.run(generate_legacy_token())
