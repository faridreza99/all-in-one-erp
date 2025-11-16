"""
Seed script for populating the tenant registry in admin_hub database.
Creates demo tenants with separate database configurations.
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import certifi

# MongoDB connection
ADMIN_MONGO_URL = os.environ.get('ADMIN_MONGO_URL') or os.environ.get('MONGO_URL')
ADMIN_DB_NAME = 'admin_hub'

# Get base MongoDB URL (without database name) for creating tenant databases
BASE_MONGO_URL = os.environ.get('MONGO_URL')

async def seed_tenant_registry():
    """Create demo tenants in the tenant registry"""
    
    print("=" * 60)
    print("🌱 Seeding Tenant Registry (admin_hub)")
    print("=" * 60)
    
    # Connect to admin database
    client = AsyncIOMotorClient(ADMIN_MONGO_URL, tlsCAFile=certifi.where())
    admin_db = client[ADMIN_DB_NAME]
    
    # Demo tenants configuration
    demo_tenants = [
        {
            "slug": "techland",
            "business_name": "TechLand Computers",
            "business_type": "computer_shop",
            "db_uri": BASE_MONGO_URL,
            "db_name": "computer_techland_db",
            "admin_email": "computershop@example.com",
            "status": "active",
            "license_type": "pro",
            "max_users": 50,
            "max_branches": 10,
            "features_enabled": ["pos", "inventory", "repairs", "sales", "analytics"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "billing_contact": "billing@techland.com",
            "notes": "Demo Computer Shop tenant"
        },
        {
            "slug": "globaltrade",
            "business_name": "GlobalTrade CNF",
            "business_type": "cnf",
            "db_uri": BASE_MONGO_URL,
            "db_name": "cnf_globaltrade_db",
            "admin_email": "cnf@example.com",
            "status": "active",
            "license_type": "enterprise",
            "max_users": 100,
            "max_branches": 20,
            "features_enabled": ["shipments", "job_files", "customs", "transport", "analytics"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "billing_contact": "billing@globaltrade.com",
            "notes": "Demo CNF (Clearing & Forwarding) tenant"
        },
        {
            "slug": "mobile",
            "business_name": "Mobile Shop Pro",
            "business_type": "mobile_shop",
            "db_uri": BASE_MONGO_URL,
            "db_name": "mobile_shop_db",
            "admin_email": "mobile@example.com",
            "status": "active",
            "license_type": "pro",
            "max_users": 30,
            "max_branches": 5,
            "features_enabled": ["pos", "inventory", "repairs", "sales"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "billing_contact": "billing@mobileshop.com",
            "notes": "Demo Mobile Shop tenant"
        },
        {
            "slug": "pharmacy",
            "business_name": "HealthCare Pharmacy",
            "business_type": "pharmacy",
            "db_uri": BASE_MONGO_URL,
            "db_name": "pharmacy_healthcare_db",
            "admin_email": "pharmacy@example.com",
            "status": "active",
            "license_type": "pro",
            "max_users": 40,
            "max_branches": 8,
            "features_enabled": ["pos", "inventory", "prescriptions", "sales", "analytics"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "billing_contact": "billing@healthcarepharmacy.com",
            "notes": "Demo Pharmacy tenant"
        },
        {
            "slug": "salon",
            "business_name": "Beauty Salon Elite",
            "business_type": "salon",
            "db_uri": BASE_MONGO_URL,
            "db_name": "salon_elite_db",
            "admin_email": "salon@example.com",
            "status": "active",
            "license_type": "free",
            "max_users": 10,
            "max_branches": 2,
            "features_enabled": ["appointments", "services", "sales"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "billing_contact": "billing@beautysalon.com",
            "notes": "Demo Salon tenant"
        }
    ]
    
    # Clear existing registry (for clean demo)
    print("\n🗑️  Clearing existing tenant registry...")
    await admin_db.tenants_registry.delete_many({})
    
    # Insert demo tenants
    print(f"\n📝 Inserting {len(demo_tenants)} demo tenants...")
    result = await admin_db.tenants_registry.insert_many(demo_tenants)
    
    print(f"✅ Inserted {len(result.inserted_ids)} tenants into registry")
    
    # Display tenant information
    print("\n" + "=" * 60)
    print("📋 TENANT REGISTRY SUMMARY")
    print("=" * 60)
    
    for tenant in demo_tenants:
        print(f"\n🏢 {tenant['business_name']}")
        print(f"   Slug:        {tenant['slug']}")
        print(f"   Type:        {tenant['business_type']}")
        print(f"   Database:    {tenant['db_name']}")
        print(f"   Admin Email: {tenant['admin_email']}")
        print(f"   License:     {tenant['license_type']}")
        print(f"   Status:      {tenant['status']}")
    
    print("\n" + "=" * 60)
    print("✅ Tenant Registry Seeding Complete!")
    print("=" * 60)
    print("\n📌 Next Steps:")
    print("   1. Run seed scripts to populate each tenant's database")
    print("   2. Test login with tenant accounts (e.g., computershop@example.com)")
    print("   3. Verify tenant isolation with health check endpoint")
    print("\n")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_tenant_registry())
