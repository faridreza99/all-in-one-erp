import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime

async def seed_billing_plans():
    """
    Seed the billing plans catalog in admin_hub database
    """
    mongo_url = os.environ.get("MONGO_URL")
    if not mongo_url:
        print("❌ MONGO_URL environment variable not set")
        return
    
    client = AsyncIOMotorClient(mongo_url)
    admin_db = client["admin_hub"]
    
    print("\n" + "="*60)
    print("🏷️  Seeding Billing Plans Catalog")
    print("="*60)
    
    # Define the four tiers
    plans = [
        {
            "plan_id": "free",
            "name": "Free Plan",
            "tier": "free",
            "description": "Basic features for small businesses getting started",
            "price": 0.0,
            "billing_cycle": "lifetime",
            "quotas": {
                "max_products": 100,
                "max_users": 2,
                "max_pos_terminals": 1,
                "max_storage_gb": 1,
                "max_orders_per_month": 500,
                "max_branches": 1,
                "max_appointments_per_month": 100
            },
            "features": [
                "pos",
                "inventory",
                "basic_reports"
            ],
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "plan_id": "basic",
            "name": "Basic Plan",
            "tier": "basic",
            "description": "Essential features for growing businesses",
            "price": 29.0,
            "billing_cycle": "monthly",
            "quotas": {
                "max_products": 1000,
                "max_users": 5,
                "max_pos_terminals": 3,
                "max_storage_gb": 10,
                "max_orders_per_month": 5000,
                "max_branches": 3,
                "max_appointments_per_month": 1000
            },
            "features": [
                "pos",
                "inventory",
                "sales",
                "purchases",
                "customers",
                "suppliers",
                "reports",
                "expenses"
            ],
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "plan_id": "pro",
            "name": "Professional Plan",
            "tier": "pro",
            "description": "Advanced features for established businesses",
            "price": 99.0,
            "billing_cycle": "monthly",
            "quotas": {
                "max_products": 10000,
                "max_users": 25,
                "max_pos_terminals": 10,
                "max_storage_gb": 100,
                "max_orders_per_month": 50000,
                "max_branches": 10,
                "max_appointments_per_month": 10000
            },
            "features": [
                "pos",
                "inventory",
                "sales",
                "purchases",
                "customers",
                "suppliers",
                "reports",
                "expenses",
                "analytics",
                "api_access",
                "advanced_reports",
                "multi_branch",
                "appointments",
                "services"
            ],
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "plan_id": "enterprise",
            "name": "Enterprise Plan",
            "tier": "enterprise",
            "description": "Unlimited features for large organizations",
            "price": 299.0,
            "billing_cycle": "monthly",
            "quotas": {
                "max_products": -1,  # -1 means unlimited
                "max_users": -1,
                "max_pos_terminals": -1,
                "max_storage_gb": -1,
                "max_orders_per_month": -1,
                "max_branches": -1,
                "max_appointments_per_month": -1
            },
            "features": [
                "pos",
                "inventory",
                "sales",
                "purchases",
                "customers",
                "suppliers",
                "reports",
                "expenses",
                "analytics",
                "api_access",
                "advanced_reports",
                "multi_branch",
                "appointments",
                "services",
                "custom_integrations",
                "priority_support",
                "custom_branding",
                "white_label",
                "advanced_security"
            ],
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    # Clear existing plans
    deleted = await admin_db.plans.delete_many({})
    print(f"📝 Cleared {deleted.deleted_count} existing plans")
    
    # Insert new plans
    result = await admin_db.plans.insert_many(plans)
    print(f"✅ Inserted {len(result.inserted_ids)} plans")
    
    # Display summary
    print("\n📊 Plans Summary:")
    for plan in plans:
        print(f"  • {plan['name']} ({plan['tier']}): ${plan['price']}/{plan['billing_cycle']}")
        print(f"    - Products: {plan['quotas']['max_products'] if plan['quotas']['max_products'] != -1 else 'Unlimited'}")
        print(f"    - Users: {plan['quotas']['max_users'] if plan['quotas']['max_users'] != -1 else 'Unlimited'}")
        print(f"    - Features: {len(plan['features'])}")
        print()
    
    client.close()
    print("="*60)
    print("✅ Billing Plans Seeding Complete!")
    print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(seed_billing_plans())
