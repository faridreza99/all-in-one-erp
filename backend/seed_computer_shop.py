import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta
import bcrypt
import uuid

load_dotenv()

async def seed_computer_shop():
    mongo_url = os.environ.get('MONGO_URL') or os.environ.get('Mongo_URL')
    client = AsyncIOMotorClient(mongo_url, tlsInsecure=True)
    db = client[os.environ.get('DB_NAME', 'erp_db')]
    
    print("🖥️ Seeding Computer Shop Tenant...")
    
    # Check if already exists
    existing = await db.tenants.find_one({"email": "computershop@example.com"})
    if existing:
        print("⚠️  Computer Shop tenant already exists. Skipping...")
        client.close()
        return
    
    # Create tenant
    tenant_id = str(uuid.uuid4())
    tenant = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "name": "TechMart Computer Shop",
        "business_type": "computer_shop",
        "email": "computershop@example.com",
        "phone": "+880171234567",
        "address": "Shop 45, Multiplan Center, Elephant Road, Dhaka",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tenants.insert_one(tenant)
    print(f"✅ Tenant created: {tenant['name']}")
    
    # Create admin user
    hashed_password = bcrypt.hashpw("computershop123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user = {
        "id": str(uuid.uuid4()),
        "email": "computershop@example.com",
        "full_name": "Computer Shop Admin",
        "role": "tenant_admin",
        "tenant_id": tenant_id,
        "branch_id": None,
        "hashed_password": hashed_password,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    print(f"✅ Admin user created: {user['email']}")
    
    # Create sample components
    components = [
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Intel Core i5-13400F",
            "category": "CPU",
            "brand": "Intel",
            "model": "i5-13400F",
            "specifications": {
                "cores": 10,
                "threads": 16,
                "base_clock": "2.5 GHz",
                "boost_clock": "4.6 GHz"
            },
            "price": 19500.00,
            "stock": 15,
            "serial_numbers": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Kingston Fury 16GB DDR4",
            "category": "RAM",
            "brand": "Kingston",
            "model": "Fury Beast 3200MHz",
            "specifications": {
                "capacity": "16GB",
                "type": "DDR4",
                "speed": "3200MHz"
            },
            "price": 4500.00,
            "stock": 25,
            "serial_numbers": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Samsung 980 Pro 1TB NVMe",
            "category": "SSD",
            "brand": "Samsung",
            "model": "980 Pro",
            "specifications": {
                "capacity": "1TB",
                "interface": "NVMe PCIe 4.0",
                "read_speed": "7000 MB/s",
                "write_speed": "5000 MB/s"
            },
            "price": 12000.00,
            "stock": 12,
            "serial_numbers": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "ASUS TUF B660M-PLUS",
            "category": "Motherboard",
            "brand": "ASUS",
            "model": "TUF B660M-PLUS",
            "specifications": {
                "socket": "LGA1700",
                "chipset": "B660",
                "ram_slots": 4,
                "max_ram": "128GB"
            },
            "price": 16500.00,
            "stock": 8,
            "serial_numbers": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "NVIDIA RTX 4060 Ti 8GB",
            "category": "GPU",
            "brand": "NVIDIA",
            "model": "RTX 4060 Ti",
            "specifications": {
                "memory": "8GB GDDR6",
                "cuda_cores": 4352,
                "clock_speed": "2535 MHz"
            },
            "price": 52000.00,
            "stock": 6,
            "serial_numbers": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.components.insert_many(components)
    print(f"✅ Created {len(components)} sample components")
    
    # Create sample computer products
    warranty_expiry = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
    
    products = [
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "HP EliteBook 840 G9",
            "sku": "HP-EB840-001",
            "category": "Laptop",
            "brand": "HP",
            "model": "EliteBook 840 G9",
            "serial_number": "5CD2230XYZ",
            "specifications": {
                "processor": "Intel Core i7-1255U",
                "ram": "16GB DDR4",
                "storage": "512GB NVMe SSD",
                "display": "14-inch FHD",
                "graphics": "Intel Iris Xe"
            },
            "purchase_price": 95000.00,
            "sale_price": 115000.00,
            "warranty_months": 12,
            "warranty_expiry_date": warranty_expiry,
            "supplier_id": "",
            "components": [],
            "status": "in_stock",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Dell OptiPlex 7090 Desktop",
            "sku": "DELL-OPT7090-001",
            "category": "Desktop",
            "brand": "Dell",
            "model": "OptiPlex 7090",
            "serial_number": "3GF9812ABC",
            "specifications": {
                "processor": "Intel Core i5-11500",
                "ram": "8GB DDR4",
                "storage": "256GB SSD",
                "graphics": "Intel UHD 750"
            },
            "purchase_price": 52000.00,
            "sale_price": 65000.00,
            "warranty_months": 12,
            "warranty_expiry_date": warranty_expiry,
            "supplier_id": "",
            "components": [],
            "status": "in_stock",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Custom Gaming PC Build",
            "sku": "CUSTOM-GAMING-001",
            "category": "Desktop",
            "brand": "Custom Build",
            "model": "Gaming Pro",
            "serial_number": "CUSTOM-001-2024",
            "specifications": {
                "processor": "Intel Core i5-13400F",
                "ram": "16GB DDR4",
                "storage": "1TB NVMe SSD",
                "graphics": "NVIDIA RTX 4060 Ti 8GB",
                "motherboard": "ASUS TUF B660M-PLUS"
            },
            "purchase_price": 105000.00,
            "sale_price": 135000.00,
            "warranty_months": 12,
            "warranty_expiry_date": warranty_expiry,
            "supplier_id": "",
            "components": [components[0]["id"], components[1]["id"], components[2]["id"], components[3]["id"], components[4]["id"]],
            "status": "in_stock",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.computer_products.insert_many(products)
    print(f"✅ Created {len(products)} sample computer products")
    
    # Create sample job cards
    job_cards = [
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "job_number": f"JOB-{datetime.now(timezone.utc).strftime('%Y%m%d')}001",
            "customer_id": "",
            "device_type": "Laptop",
            "device_brand": "HP",
            "device_model": "Pavilion 15",
            "serial_number": "5CD1234ABC",
            "issue_description": "Screen not displaying, possible backlight failure",
            "estimated_cost": 8500.00,
            "actual_cost": 0.00,
            "technician_id": None,
            "parts_used": [],
            "status": "pending",
            "received_date": datetime.now(timezone.utc).isoformat(),
            "completion_date": None,
            "delivery_date": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "job_number": f"JOB-{datetime.now(timezone.utc).strftime('%Y%m%d')}002",
            "customer_id": "",
            "device_type": "Desktop",
            "device_brand": "Dell",
            "device_model": "Vostro 3888",
            "serial_number": "8HG5678XYZ",
            "issue_description": "Not powering on, suspected motherboard issue",
            "estimated_cost": 12000.00,
            "actual_cost": 0.00,
            "technician_id": None,
            "parts_used": [],
            "status": "in_progress",
            "received_date": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
            "completion_date": None,
            "delivery_date": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.job_cards.insert_many(job_cards)
    print(f"✅ Created {len(job_cards)} sample job cards")
    
    print("\n" + "="*60)
    print("🎉 Computer Shop seeding completed successfully!")
    print("="*60)
    print(f"\n📧 Email: computershop@example.com")
    print(f"🔑 Password: computershop123")
    print(f"🏢 Business Type: computer_shop")
    print(f"🌐 Dashboard: /computer_shop")
    print("="*60 + "\n")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_computer_shop())
