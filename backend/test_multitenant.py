"""
Test script to verify multi-tenant database architecture is working correctly.
"""
import asyncio
import httpx
import os
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
import json

BASE_URL = "http://localhost:8000"

async def test_login_and_tenant_resolution():
    """Test login flow and verify tenant_slug is in JWT"""
    
    print("=" * 70)
    print("🧪 MULTI-TENANT ARCHITECTURE TEST")
    print("=" * 70)
    
    # Test accounts from different tenants
    test_accounts = [
        {
            "name": "Mobile Shop",
            "email": "mobile@example.com",
            "password": "mobile123",
            "expected_slug": "mobile",
            "expected_db": "mobile_shop_db"
        },
        {
            "name": "Computer Shop",
            "email": "computershop@example.com",
            "password": "computershop123",
            "expected_slug": "techland",
            "expected_db": "computer_techland_db"
        },
        {
            "name": "Pharmacy",
            "email": "pharmacy@example.com",
            "password": "pharmacy123",
            "expected_slug": "pharmacy",
            "expected_db": "pharmacy_healthcare_db"
        }
    ]
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for account in test_accounts:
            print(f"\n{'─' * 70}")
            print(f"📧 Testing: {account['name']} ({account['email']})")
            print(f"{'─' * 70}")
            
            # 1. Test Login
            print(f"\n1️⃣  Attempting login...")
            try:
                login_response = await client.post(
                    f"{BASE_URL}/api/auth/login",
                    json={
                        "email": account["email"],
                        "password": account["password"]
                    }
                )
                
                if login_response.status_code != 200:
                    print(f"   ❌ Login failed: {login_response.status_code}")
                    print(f"      {login_response.text}")
                    continue
                
                login_data = login_response.json()
                token = login_data.get("access_token")
                user = login_data.get("user", {})
                
                print(f"   ✅ Login successful!")
                print(f"   📧 Email: {user.get('email')}")
                print(f"   🏢 Business: {user.get('business_name')}")
                print(f"   🔖 Tenant Slug: {user.get('tenant_slug')}")
                
                # Verify tenant_slug is present
                tenant_slug = user.get('tenant_slug')
                if not tenant_slug:
                    print(f"   ⚠️  WARNING: tenant_slug is missing! (Legacy mode)")
                elif tenant_slug != account['expected_slug']:
                    print(f"   ⚠️  WARNING: Expected slug '{account['expected_slug']}', got '{tenant_slug}'")
                else:
                    print(f"   ✅ Tenant slug matches expected: {tenant_slug}")
                
            except Exception as e:
                print(f"   ❌ Login exception: {e}")
                continue
            
            # 2. Test Health Endpoint
            if token:
                print(f"\n2️⃣  Testing tenant health check...")
                try:
                    health_response = await client.get(
                        f"{BASE_URL}/api/health/tenant",
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    
                    if health_response.status_code != 200:
                        print(f"   ❌ Health check failed: {health_response.status_code}")
                        print(f"      {health_response.text}")
                    else:
                        health_data = health_response.json()
                        print(f"   ✅ Health check successful!")
                        print(f"   🔖 Tenant Slug: {health_data.get('tenant_slug')}")
                        print(f"   💾 Database: {health_data.get('database_name')}")
                        print(f"   🔌 Connected: {health_data.get('database_connected')}")
                        print(f"   📦 Collections: {health_data.get('collections_count')}")
                        
                        # Verify correct database
                        db_name = health_data.get('database_name')
                        if db_name == account['expected_db']:
                            print(f"   ✅ Database matches expected: {db_name}")
                        elif db_name == 'erp_database':
                            print(f"   ⚠️  WARNING: Using shared database (legacy mode)")
                        else:
                            print(f"   ⚠️  WARNING: Expected '{account['expected_db']}', got '{db_name}'")
                
                except Exception as e:
                    print(f"   ❌ Health check exception: {e}")
            
            # 3. Test Collections List
            if token:
                print(f"\n3️⃣  Testing collections endpoint...")
                try:
                    collections_response = await client.get(
                        f"{BASE_URL}/api/health/tenant/collections",
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    
                    if collections_response.status_code != 200:
                        print(f"   ❌ Collections check failed: {collections_response.status_code}")
                    else:
                        collections_data = collections_response.json()
                        print(f"   ✅ Collections endpoint working!")
                        print(f"   📦 Total: {collections_data.get('total_collections')}")
                        print(f"   💾 Database: {collections_data.get('database_name')}")
                
                except Exception as e:
                    print(f"   ❌ Collections exception: {e}")
    
    print(f"\n{'=' * 70}")
    print("✅ MULTI-TENANT TEST COMPLETE")
    print("=" * 70)
    print("\n📋 Summary:")
    print("   - If tenant_slug is present in user data → Multi-tenant mode active")
    print("   - If tenant_slug is None → Legacy/fallback mode")
    print("   - Health endpoint should show tenant-specific database name")
    print("\n")

async def check_registry():
    """Check tenant registry in admin_hub"""
    print("\n" + "=" * 70)
    print("📚 TENANT REGISTRY CHECK")
    print("=" * 70)
    
    mongo_url = os.environ.get('MONGO_URL')
    client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
    
    try:
        admin_db = client['admin_hub']
        tenants = await admin_db.tenants_registry.find({}, {"_id": 0}).to_list(100)
        
        print(f"\n✅ Found {len(tenants)} tenants in registry:\n")
        for tenant in tenants:
            print(f"   🏢 {tenant.get('business_name')}")
            print(f"      Slug:     {tenant.get('slug')}")
            print(f"      Email:    {tenant.get('admin_email')}")
            print(f"      Type:     {tenant.get('business_type')}")
            print(f"      Database: {tenant.get('db_name')}")
            print(f"      Status:   {tenant.get('status')}")
            print()
    
    except Exception as e:
        print(f"❌ Registry check failed: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    print("\n🚀 Starting Multi-Tenant Test Suite...")
    print("   Make sure backend is running on http://localhost:8000\n")
    
    asyncio.run(check_registry())
    asyncio.run(test_login_and_tenant_resolution())
