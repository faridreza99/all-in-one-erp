import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
import os
from datetime import datetime, timezone
import uuid
import certifi

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def seed_remaining():
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL') or os.environ.get('Mongo_URL')
    db_name = os.environ.get('DB_NAME', 'erp_database')
    
    client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
    db = client[db_name]
    
    print("🌱 Seeding remaining sectors and Super Admin...")
    
    # Create Super Admin
    existing_super_admin = await db.users.find_one({"email": "superadmin@erp.com"})
    if not existing_super_admin:
        super_admin = {
            "id": str(uuid.uuid4()),
            "email": "superadmin@erp.com",
            "full_name": "Super Admin",
            "role": "super_admin",
            "tenant_id": None,
            "hashed_password": hash_password("admin123"),
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(super_admin)
        print("✅ Created Super Admin (superadmin@erp.com / admin123)")
    else:
        print("⏭️  Super Admin already exists")
    
    # Define remaining sectors
    remaining_sectors = [
        {
            "name": "MediCare Pharmacy",
            "email": "pharmacy@example.com",
            "password": "pharmacy123",
            "business_type": "pharmacy",
            "products": [
                {"name": "Aspirin 500mg", "sku": "PHAR-001", "category": "Medicine", "price": 5.99, "stock": 200, "batch_number": "BATCH001", "expiry_date": "2026-12-31"},
                {"name": "Vitamin C Tablets", "sku": "PHAR-002", "category": "Supplements", "price": 12.99, "stock": 150, "batch_number": "BATCH002", "expiry_date": "2027-06-30"},
                {"name": "Hand Sanitizer", "sku": "PHAR-003", "category": "Healthcare", "price": 3.99, "stock": 300, "batch_number": "BATCH003", "expiry_date": "2026-12-31"},
            ]
        },
        {
            "name": "Glamour Salon & Spa",
            "email": "salon@example.com",
            "password": "salon123",
            "business_type": "salon",
            "services": [
                {"name": "Haircut & Styling", "duration_minutes": 45, "price": 35.0, "description": "Professional haircut and styling"},
                {"name": "Manicure & Pedicure", "duration_minutes": 60, "price": 45.0, "description": "Complete nail care service"},
                {"name": "Facial Treatment", "duration_minutes": 90, "price": 65.0, "description": "Deep cleansing facial"},
            ]
        },
        {
            "name": "TechMobile Shop",
            "email": "mobile@example.com",
            "password": "mobile123",
            "business_type": "mobile_shop",
            "products": [
                {"name": "iPhone 14 Pro", "sku": "MOB-001", "category": "Smartphones", "price": 999.99, "stock": 10, "imei": "123456789012345"},
                {"name": "Samsung Galaxy S23", "sku": "MOB-002", "category": "Smartphones", "price": 849.99, "stock": 15, "imei": "987654321098765"},
            ]
        },
        {
            "name": "CompuTech Computer Shop",
            "email": "computershop@example.com",
            "password": "computershop123",
            "business_type": "computer_shop",
            "products": [
                {"name": "Dell XPS 15", "sku": "COMP-001", "category": "Laptops", "price": 1499.99, "stock": 8, "serial_number": "SN001"},
                {"name": "Gaming PC Build", "sku": "COMP-002", "category": "Desktops", "price": 1999.99, "stock": 5, "serial_number": "SN002"},
                {"name": "MacBook Pro 16", "sku": "COMP-003", "category": "Laptops", "price": 2399.99, "stock": 6, "serial_number": "SN003"},
            ]
        },
    ]
    
    for sector in remaining_sectors:
        # Check if tenant already exists
        existing_tenant = await db.tenants.find_one({"email": sector["email"]})
        if existing_tenant:
            print(f"⏭️  {sector['name']} already exists")
            continue
            
        print(f"\n{'='*60}")
        print(f"🏢 Creating {sector['name']} ({sector['business_type'].upper()})")
        print(f"{'='*60}")
        
        # Create tenant
        tenant_id = str(uuid.uuid4())
        tenant = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": sector["name"],
            "email": sector["email"],
            "business_type": sector["business_type"],
            "modules_enabled": [sector["business_type"], "pos"],
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.tenants.insert_one(tenant)
        print(f"✅ Tenant created")
        
        # Create admin user
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": sector["email"],
            "full_name": f"{sector['name']} Admin",
            "role": "tenant_admin",
            "tenant_id": tenant_id,
            "hashed_password": hash_password(sector["password"]),
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        print(f"✅ Admin user: {sector['email']} / {sector['password']}")
        
        # Add products
        if "products" in sector:
            for product_data in sector["products"]:
                product = {
                    "id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    **product_data,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.products.insert_one(product)
            print(f"✅ Added {len(sector['products'])} products")
        
        # Add services
        if "services" in sector:
            for service_data in sector["services"]:
                service = {
                    "id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    **service_data,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.services.insert_one(service)
            print(f"✅ Added {len(sector['services'])} services")
    
    print(f"\n{'='*60}")
    print("🎉 ALL REMAINING SECTORS SEEDED SUCCESSFULLY!")
    print(f"{'='*60}")
    
    # Count total tenants and users
    tenant_count = await db.tenants.count_documents({})
    user_count = await db.users.count_documents({})
    
    print(f"\n📊 Database Summary:")
    print(f"   Total Tenants: {tenant_count}")
    print(f"   Total Users: {user_count}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_remaining())
