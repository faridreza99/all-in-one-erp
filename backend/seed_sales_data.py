"""
Seed demo sales data for all tenants in the ERP system.
This creates sample sales records for analytics and Super Admin dashboard.
"""
import asyncio
import os
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
import random
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL")
if not MONGO_URL:
    raise ValueError("MONGO_URL environment variable is required")

# Demo tenants with their database names
DEMO_TENANTS = [
    {"slug": "mobile", "db_name": "mobile_shop_db"},
    {"slug": "techland", "db_name": "computer_techland_db"},
    {"slug": "globaltrade", "db_name": "cnf_globaltrade_db"},
    {"slug": "pharmacy", "db_name": "pharmacy_healthplus_db"},
]

# Sample customer names
CUSTOMER_NAMES = [
    "John Doe", "Jane Smith", "Ahmed Khan", "Fatima Ali", "Chen Wei",
    "Maria Garcia", "David Brown", "Sarah Johnson", "Michael Lee", "Emily Davis",
    "Robert Wilson", "Lisa Anderson", "James Taylor", "Patricia Martinez", "None"
]

# Payment methods
PAYMENT_METHODS = ["cash", "card", "mobile_money", "bank_transfer"]


def generate_sales_for_tenant(tenant_slug: str, count: int = 50) -> list:
    """Generate random sales data for a tenant"""
    sales = []
    now = datetime.utcnow()
    
    for i in range(count):
        # Generate sales over the last 30 days
        days_ago = random.randint(0, 30)
        hours_ago = random.randint(0, 23)
        created_at = now - timedelta(days=days_ago, hours=hours_ago)
        
        # Different price ranges based on business type
        if tenant_slug == "mobile":
            total = round(random.uniform(5000, 50000), 2)  # Mobile phones
        elif tenant_slug == "techland":
            total = round(random.uniform(15000, 150000), 2)  # Computers
        elif tenant_slug == "globaltrade":
            total = round(random.uniform(100000, 500000), 2)  # CNF services
        else:  # pharmacy
            total = round(random.uniform(500, 15000), 2)  # Medicines
        
        sale = {
            "id": f"sale-{tenant_slug}-{i+1}",
            "tenant_id": tenant_slug,
            "total": total,
            "customer_name": random.choice(CUSTOMER_NAMES),
            "payment_method": random.choice(PAYMENT_METHODS),
            "items_count": random.randint(1, 10),
            "created_at": created_at,
            "metadata": {
                "branch": random.choice(["main", "branch1", "branch2"]),
                "staff": random.choice(["admin", "staff1", "staff2"])
            }
        }
        sales.append(sale)
    
    return sales


async def seed_sales_data():
    """Seed sales data for all demo tenants"""
    print("=" * 60)
    print("🌱 Seeding Sales Data for All Tenants")
    print("=" * 60)
    
    client = AsyncIOMotorClient(MONGO_URL, tlsCAFile=certifi.where())
    
    try:
        for tenant in DEMO_TENANTS:
            tenant_slug = tenant["slug"]
            db_name = tenant["db_name"]
            
            print(f"\n📊 Processing tenant: {tenant_slug} ({db_name})")
            
            # Connect to tenant's database
            tenant_db = client[db_name]
            sales_collection = tenant_db["sales"]
            
            # Clear existing sales data
            deleted = await sales_collection.delete_many({})
            print(f"   - Cleared {deleted.deleted_count} existing sales records")
            
            # Generate and insert new sales data
            sales = generate_sales_for_tenant(tenant_slug, count=50)
            result = await sales_collection.insert_many(sales)
            print(f"   - Inserted {len(result.inserted_ids)} sales records")
            
            # Calculate stats
            total_sales = sum(sale["total"] for sale in sales)
            today_sales = sum(
                sale["total"] for sale in sales
                if sale["created_at"].date() == datetime.utcnow().date()
            )
            
            print(f"   - Total sales: ${total_sales:,.2f}")
            print(f"   - Today's sales: ${today_sales:,.2f}")
            print(f"   - Average sale: ${total_sales/len(sales):,.2f}")
        
        print("\n" + "=" * 60)
        print("✅ Sales Data Seeding Complete!")
        print("=" * 60)
        print("\n📈 Summary:")
        print(f"   - Tenants seeded: {len(DEMO_TENANTS)}")
        print(f"   - Sales per tenant: 50")
        print(f"   - Total sales records: {len(DEMO_TENANTS) * 50}")
        print("\n🎯 You can now:")
        print("   - View tenant stats in Super Admin dashboard")
        print("   - Test sales analytics endpoints")
        print("   - See revenue trends over the last 30 days")
        print()
        
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(seed_sales_data())
