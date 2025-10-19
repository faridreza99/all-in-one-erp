import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from datetime import datetime, timezone
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_data():
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'erp_database')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🌱 Seeding database...")
    
    # Clear existing data
    await db.users.delete_many({})
    await db.tenants.delete_many({})
    await db.products.delete_many({})
    await db.services.delete_many({})
    await db.sales.delete_many({})
    
    # Create Super Admin
    super_admin = {
        "id": str(uuid.uuid4()),
        "email": "superadmin@erp.com",
        "full_name": "Super Admin",
        "role": "super_admin",
        "tenant_id": None,
        "hashed_password": pwd_context.hash("admin123"),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(super_admin)
    print("✅ Created Super Admin (superadmin@erp.com / admin123)")
    
    # Create Pharmacy Tenant
    pharmacy_tenant = {
        "id": str(uuid.uuid4()),
        "tenant_id": str(uuid.uuid4()),
        "name": "MediCare Pharmacy",
        "email": "pharmacy@example.com",
        "business_type": "pharmacy",
        "modules_enabled": ["pharmacy", "pos"],
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tenants.insert_one(pharmacy_tenant)
    
    # Create Pharmacy Admin
    pharmacy_admin = {
        "id": str(uuid.uuid4()),
        "email": "pharmacy@example.com",
        "full_name": "Pharmacy Manager",
        "role": "tenant_admin",
        "tenant_id": pharmacy_tenant["tenant_id"],
        "hashed_password": pwd_context.hash("pharmacy123"),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(pharmacy_admin)
    print("✅ Created Pharmacy Tenant (pharmacy@example.com / pharmacy123)")
    
    # Add sample products for pharmacy
    products = [
        {
            "id": str(uuid.uuid4()),
            "tenant_id": pharmacy_tenant["tenant_id"],
            "name": "Paracetamol 500mg",
            "sku": "MED-001",
            "category": "Pain Relief",
            "price": 5.99,
            "stock": 150,
            "generic_name": "Acetaminophen",
            "brand": "GenericMed",
            "batch_number": "BATCH-2024-001",
            "expiry_date": "2025-12-31",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": pharmacy_tenant["tenant_id"],
            "name": "Amoxicillin 250mg",
            "sku": "MED-002",
            "category": "Antibiotics",
            "price": 12.99,
            "stock": 80,
            "generic_name": "Amoxicillin",
            "brand": "AntibioMax",
            "batch_number": "BATCH-2024-002",
            "expiry_date": "2025-10-31",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": pharmacy_tenant["tenant_id"],
            "name": "Vitamin C 1000mg",
            "sku": "MED-003",
            "category": "Supplements",
            "price": 8.99,
            "stock": 200,
            "generic_name": "Ascorbic Acid",
            "brand": "VitaHealth",
            "batch_number": "BATCH-2024-003",
            "expiry_date": "2026-06-30",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.products.insert_many(products)
    print("✅ Added 3 pharmacy products")
    
    # Create Salon Tenant
    salon_tenant = {
        "id": str(uuid.uuid4()),
        "tenant_id": str(uuid.uuid4()),
        "name": "Glamour Salon & Spa",
        "email": "salon@example.com",
        "business_type": "salon",
        "modules_enabled": ["salon", "appointments", "services"],
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tenants.insert_one(salon_tenant)
    
    salon_admin = {
        "id": str(uuid.uuid4()),
        "email": "salon@example.com",
        "full_name": "Salon Manager",
        "role": "tenant_admin",
        "tenant_id": salon_tenant["tenant_id"],
        "hashed_password": pwd_context.hash("salon123"),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(salon_admin)
    print("✅ Created Salon Tenant (salon@example.com / salon123)")
    
    # Add salon services
    services = [
        {
            "id": str(uuid.uuid4()),
            "tenant_id": salon_tenant["tenant_id"],
            "name": "Haircut & Styling",
            "duration_minutes": 60,
            "price": 45.00,
            "description": "Professional haircut with styling",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": salon_tenant["tenant_id"],
            "name": "Hair Coloring",
            "duration_minutes": 120,
            "price": 85.00,
            "description": "Full hair coloring service",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": salon_tenant["tenant_id"],
            "name": "Manicure & Pedicure",
            "duration_minutes": 90,
            "price": 55.00,
            "description": "Complete hand and foot care",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.services.insert_many(services)
    print("✅ Added 3 salon services")
    
    # Create Mobile Shop Tenant
    mobile_tenant = {
        "id": str(uuid.uuid4()),
        "tenant_id": str(uuid.uuid4()),
        "name": "TechMobile Store",
        "email": "mobile@example.com",
        "business_type": "mobile_shop",
        "modules_enabled": ["mobile_shop", "repairs", "pos"],
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tenants.insert_one(mobile_tenant)
    
    mobile_admin = {
        "id": str(uuid.uuid4()),
        "email": "mobile@example.com",
        "full_name": "Mobile Shop Manager",
        "role": "tenant_admin",
        "tenant_id": mobile_tenant["tenant_id"],
        "hashed_password": pwd_context.hash("mobile123"),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(mobile_admin)
    print("✅ Created Mobile Shop Tenant (mobile@example.com / mobile123)")
    
    # Add mobile products
    mobile_products = [
        {
            "id": str(uuid.uuid4()),
            "tenant_id": mobile_tenant["tenant_id"],
            "name": "iPhone 15 Pro",
            "sku": "PHONE-001",
            "category": "Smartphones",
            "price": 999.00,
            "stock": 15,
            "imei": "356789012345678",
            "warranty_months": 12,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": mobile_tenant["tenant_id"],
            "name": "Samsung Galaxy S24",
            "sku": "PHONE-002",
            "category": "Smartphones",
            "price": 899.00,
            "stock": 20,
            "imei": "356789012345679",
            "warranty_months": 12,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.products.insert_many(mobile_products)
    print("✅ Added 2 mobile shop products")
    
    print("\n🎉 Database seeded successfully!")
    print("\n📋 Login Credentials:")
    print("   Super Admin: superadmin@erp.com / admin123")
    print("   Pharmacy:    pharmacy@example.com / pharmacy123")
    print("   Salon:       salon@example.com / salon123")
    print("   Mobile Shop: mobile@example.com / mobile123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
