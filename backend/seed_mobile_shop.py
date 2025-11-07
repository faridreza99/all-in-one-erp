"""
Seed Mobile Shop Demo Data
Creates products with low stock, customer dues, and test data for Mobile Shop features
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import uuid
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL') or os.environ.get('Mongo_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'erp_db')]
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_mobile_shop():
    print("\n🔄 Seeding Mobile Shop Demo Data...")
    
    # Find or create Mobile Shop tenant
    mobile_tenant = await db.tenants.find_one({"business_type": "mobile_shop"})
    
    if not mobile_tenant:
        print("❌ No Mobile Shop tenant found. Please run seed_data.py first.")
        return
    
    tenant_id = mobile_tenant["tenant_id"]
    print(f"✅ Found Mobile Shop tenant: {mobile_tenant['name']}")
    
    # Clear existing mobile shop demo data
    await db.products.delete_many({"tenant_id": tenant_id})
    await db.sales.delete_many({"tenant_id": tenant_id})
    await db.customer_dues.delete_many({"tenant_id": tenant_id})
    print("🧹 Cleared existing Mobile Shop data")
    
    # Create products with varying stock levels (including low stock)
    products = [
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "iPhone 15 Pro Max",
            "sku": "PHONE-001",
            "category": "Smartphones",
            "price": 1299.00,
            "stock": 3,  # Low stock
            "supplier_name": "Apple Authorized Distributor",
            "imei": "356789012345678",
            "warranty_months": 12,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Samsung Galaxy S24 Ultra",
            "sku": "PHONE-002",
            "category": "Smartphones",
            "price": 1199.00,
            "stock": 2,  # Low stock
            "supplier_name": "Samsung Bangladesh Ltd",
            "imei": "356789012345679",
            "warranty_months": 12,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Xiaomi Redmi Note 13 Pro",
            "sku": "PHONE-003",
            "category": "Smartphones",
            "price": 299.00,
            "stock": 4,  # Low stock
            "supplier_name": "Xiaomi Bangladesh",
            "imei": "356789012345680",
            "warranty_months": 6,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "iPhone 14",
            "sku": "PHONE-004",
            "category": "Smartphones",
            "price": 899.00,
            "stock": 15,  # Good stock
            "supplier_name": "Apple Authorized Distributor",
            "imei": "356789012345681",
            "warranty_months": 12,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "OnePlus 12",
            "sku": "PHONE-005",
            "category": "Smartphones",
            "price": 699.00,
            "stock": 1,  # Low stock (Critical)
            "supplier_name": "OnePlus Official BD",
            "imei": "356789012345682",
            "warranty_months": 12,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    await db.products.insert_many(products)
    print(f"✅ Created {len(products)} products (3 with low stock < 5)")
    
    # Create sample sales with partial payments (customer dues)
    sale_1_id = str(uuid.uuid4())
    sale_1 = {
        "id": sale_1_id,
        "tenant_id": tenant_id,
        "sale_number": "SALE-000001",
        "items": [
            {
                "product_id": products[0]["id"],
                "quantity": 1,
                "price": 1299.00
            }
        ],
        "subtotal": 1299.00,
        "discount": 0,
        "tax": 0,
        "total": 1299.00,
        "paid_amount": 800.00,  # Partial payment
        "customer_name": "Karim Ahmed",
        "payment_method": "cash",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    sale_2_id = str(uuid.uuid4())
    sale_2 = {
        "id": sale_2_id,
        "tenant_id": tenant_id,
        "sale_number": "SALE-000002",
        "items": [
            {
                "product_id": products[1]["id"],
                "quantity": 2,
                "price": 1199.00
            }
        ],
        "subtotal": 2398.00,
        "discount": 98.00,
        "tax": 0,
        "total": 2300.00,
        "paid_amount": 1500.00,  # Partial payment
        "customer_name": "Fatima Rahman",
        "payment_method": "mobile_banking",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sales.insert_many([sale_1, sale_2])
    print(f"✅ Created 2 sales with partial payments")
    
    # Create customer dues for the partial payments
    dues = [
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "customer_name": "Karim Ahmed",
            "sale_id": sale_1_id,
            "sale_number": "SALE-000001",
            "total_amount": 1299.00,
            "paid_amount": 800.00,
            "due_amount": 499.00,
            "transaction_date": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "customer_name": "Fatima Rahman",
            "sale_id": sale_2_id,
            "sale_number": "SALE-000002",
            "total_amount": 2300.00,
            "paid_amount": 1500.00,
            "due_amount": 800.00,
            "transaction_date": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.customer_dues.insert_many(dues)
    print(f"✅ Created 2 customer dues (Total due: ৳{dues[0]['due_amount'] + dues[1]['due_amount']})")
    
    print("\n🎉 Mobile Shop Demo Data Seeded Successfully!")
    print("\n📋 Summary:")
    print(f"   • Products: 5 (3 with low stock)")
    print(f"   • Sales: 2 with partial payments")
    print(f"   • Customer Dues: 2 customers")
    print(f"   • Total Outstanding: ৳{dues[0]['due_amount'] + dues[1]['due_amount']}")
    print("\n💡 Test Features:")
    print("   1. Low Stock Alert: 3 products have stock < 5")
    print("   2. Customer Dues: 2 customers with outstanding payments")
    print("   3. Supplier Info: All products have supplier names")
    print("   4. Auto Stock: Create new sales to test automatic stock updates")
    print("\n🔐 Login: mobile@example.com / mobile123")

if __name__ == "__main__":
    asyncio.run(seed_mobile_shop())
