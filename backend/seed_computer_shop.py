"""
Seed script for computer_shop tenant database with comprehensive sample data.
Creates products, customers, suppliers, purchases, sales, and exports to JSON.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta
import bcrypt
import uuid
import json

load_dotenv()

TENANT_SLUG = "computer_shop"

async def get_tenant_db():
    """Get the computer_shop tenant database"""
    mongo_url = os.environ.get('MONGO_URL') or os.environ.get('Mongo_URL')
    if not mongo_url:
        raise ValueError("MONGO_URL environment variable must be set")
    
    client = AsyncIOMotorClient(mongo_url)
    
    admin_db = client['admin_hub']
    tenant = await admin_db.tenants.find_one({"slug": TENANT_SLUG})
    
    if tenant:
        db_name = tenant.get('database_name', f"tenant_{TENANT_SLUG}")
        tenant_id = str(tenant.get('_id') or tenant.get('id'))
        print(f"✅ Found tenant in admin_hub: {tenant.get('business_name', TENANT_SLUG)}")
        print(f"   Database: {db_name}")
        return client[db_name], tenant_id, client
    
    db = client[os.environ.get('DB_NAME', 'erp_database')]
    tenant = await db.tenants.find_one({"business_type": "computer_shop"})
    
    if tenant:
        tenant_id = str(tenant.get('tenant_id') or tenant.get('id'))
        print(f"✅ Found tenant in erp_database: {tenant.get('name', TENANT_SLUG)}")
        return db, tenant_id, client
    
    print(f"⚠️ Tenant '{TENANT_SLUG}' not found. Creating new tenant...")
    return db, None, client

async def seed_computer_shop():
    """Seed the computer_shop database with comprehensive sample data"""
    db, tenant_id, client = await get_tenant_db()
    
    if tenant_id is None:
        hashed_password = bcrypt.hashpw("computershop123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
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
        print(f"✅ Created new tenant with ID: {tenant_id}")
    
    print(f"\n🖥️ Seeding computer_shop database (tenant_id: {tenant_id})...")
    
    suppliers = [
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "TechWorld Distributors",
            "contact_person": "Rahim Ahmed",
            "phone": "+8801711234567",
            "email": "rahim@techworldbd.com",
            "address": "Elephant Road, Dhaka",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "GlobalPC Imports",
            "contact_person": "Karim Hossain",
            "phone": "+8801812345678",
            "email": "karim@globalpc.com",
            "address": "IDB Bhaban, Agargaon, Dhaka",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Silicon Valley BD",
            "contact_person": "Nasir Uddin",
            "phone": "+8801913456789",
            "email": "nasir@siliconvalleybd.com",
            "address": "Multiplan Center, Dhaka",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Asus Bangladesh",
            "contact_person": "Tanvir Rahman",
            "phone": "+8801614567890",
            "email": "tanvir@asusbd.com",
            "address": "Gulshan-2, Dhaka",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "HP Authorized Dealer",
            "contact_person": "Shahed Ali",
            "phone": "+8801515678901",
            "email": "shahed@hpbd.com",
            "address": "Banani, Dhaka",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.suppliers.delete_many({"tenant_id": tenant_id})
    await db.suppliers.insert_many(suppliers)
    print(f"✅ Added {len(suppliers)} suppliers")
    
    products = [
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "HP Pavilion 15 Laptop",
            "sku": "LAP-HP-001",
            "serial_number": f"SN-{datetime.now().strftime('%Y%m%d%H%M%S')}-001",
            "category": "Laptops",
            "price": 75000.00,
            "cost_price": 68000.00,
            "stock": 12,
            "critical_stock": 5,
            "description": "HP Pavilion 15, Intel Core i5, 8GB RAM, 512GB SSD",
            "supplier_name": "HP Authorized Dealer",
            "warranty_months": 24,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Asus ROG Strix G15",
            "sku": "LAP-ASUS-001",
            "serial_number": f"SN-{datetime.now().strftime('%Y%m%d%H%M%S')}-002",
            "category": "Gaming Laptops",
            "price": 145000.00,
            "cost_price": 128000.00,
            "stock": 5,
            "critical_stock": 3,
            "description": "Asus ROG Strix G15, AMD Ryzen 7, RTX 3060, 16GB RAM, 1TB SSD",
            "supplier_name": "Asus Bangladesh",
            "warranty_months": 24,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Dell Inspiron 14",
            "sku": "LAP-DELL-001",
            "serial_number": f"SN-{datetime.now().strftime('%Y%m%d%H%M%S')}-003",
            "category": "Laptops",
            "price": 65000.00,
            "cost_price": 58000.00,
            "stock": 8,
            "critical_stock": 4,
            "description": "Dell Inspiron 14, Intel Core i3, 8GB RAM, 256GB SSD",
            "supplier_name": "GlobalPC Imports",
            "warranty_months": 12,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Intel Core i7-13700K",
            "sku": "CPU-INTEL-001",
            "serial_number": f"SN-{datetime.now().strftime('%Y%m%d%H%M%S')}-004",
            "category": "Processors",
            "price": 45000.00,
            "cost_price": 40000.00,
            "stock": 15,
            "critical_stock": 5,
            "description": "Intel Core i7 13th Gen, 16 Cores, 24 Threads, 5.4GHz",
            "supplier_name": "TechWorld Distributors",
            "warranty_months": 36,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "AMD Ryzen 9 7900X",
            "sku": "CPU-AMD-001",
            "serial_number": f"SN-{datetime.now().strftime('%Y%m%d%H%M%S')}-005",
            "category": "Processors",
            "price": 52000.00,
            "cost_price": 46000.00,
            "stock": 10,
            "critical_stock": 3,
            "description": "AMD Ryzen 9 7900X, 12 Cores, 24 Threads, 5.6GHz",
            "supplier_name": "Silicon Valley BD",
            "warranty_months": 36,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Corsair Vengeance 32GB DDR5",
            "sku": "RAM-COR-001",
            "serial_number": f"SN-{datetime.now().strftime('%Y%m%d%H%M%S')}-006",
            "category": "Memory",
            "price": 18000.00,
            "cost_price": 15500.00,
            "stock": 25,
            "critical_stock": 8,
            "description": "Corsair Vengeance DDR5 32GB (2x16GB) 5600MHz",
            "supplier_name": "TechWorld Distributors",
            "warranty_months": 60,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Samsung 980 Pro 1TB NVMe",
            "sku": "SSD-SAM-001",
            "serial_number": f"SN-{datetime.now().strftime('%Y%m%d%H%M%S')}-007",
            "category": "Storage",
            "price": 12000.00,
            "cost_price": 10500.00,
            "stock": 30,
            "critical_stock": 10,
            "description": "Samsung 980 Pro 1TB NVMe SSD, 7000MB/s Read",
            "supplier_name": "GlobalPC Imports",
            "warranty_months": 60,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "NVIDIA RTX 4070 Ti",
            "sku": "GPU-NV-001",
            "serial_number": f"SN-{datetime.now().strftime('%Y%m%d%H%M%S')}-008",
            "category": "Graphics Cards",
            "price": 85000.00,
            "cost_price": 76000.00,
            "stock": 6,
            "critical_stock": 2,
            "description": "NVIDIA GeForce RTX 4070 Ti 12GB GDDR6X",
            "supplier_name": "Silicon Valley BD",
            "warranty_months": 36,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "AMD Radeon RX 7800 XT",
            "sku": "GPU-AMD-001",
            "serial_number": f"SN-{datetime.now().strftime('%Y%m%d%H%M%S')}-009",
            "category": "Graphics Cards",
            "price": 65000.00,
            "cost_price": 58000.00,
            "stock": 8,
            "critical_stock": 3,
            "description": "AMD Radeon RX 7800 XT 16GB GDDR6",
            "supplier_name": "Silicon Valley BD",
            "warranty_months": 36,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Asus ROG Strix B650-F",
            "sku": "MB-ASUS-001",
            "serial_number": f"SN-{datetime.now().strftime('%Y%m%d%H%M%S')}-010",
            "category": "Motherboards",
            "price": 32000.00,
            "cost_price": 28000.00,
            "stock": 12,
            "critical_stock": 4,
            "description": "Asus ROG Strix B650-F Gaming WiFi AM5 Motherboard",
            "supplier_name": "Asus Bangladesh",
            "warranty_months": 36,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Logitech MX Master 3S",
            "sku": "MOU-LOG-001",
            "serial_number": f"SN-{datetime.now().strftime('%Y%m%d%H%M%S')}-011",
            "category": "Peripherals",
            "price": 12500.00,
            "cost_price": 10800.00,
            "stock": 20,
            "critical_stock": 5,
            "description": "Logitech MX Master 3S Wireless Mouse",
            "supplier_name": "TechWorld Distributors",
            "warranty_months": 24,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Keychron K8 Pro",
            "sku": "KEY-KC-001",
            "serial_number": f"SN-{datetime.now().strftime('%Y%m%d%H%M%S')}-012",
            "category": "Peripherals",
            "price": 15000.00,
            "cost_price": 12800.00,
            "stock": 15,
            "critical_stock": 5,
            "description": "Keychron K8 Pro QMK/VIA Wireless Mechanical Keyboard",
            "supplier_name": "GlobalPC Imports",
            "warranty_months": 12,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "LG UltraGear 27GP850",
            "sku": "MON-LG-001",
            "serial_number": f"SN-{datetime.now().strftime('%Y%m%d%H%M%S')}-013",
            "category": "Monitors",
            "price": 45000.00,
            "cost_price": 40000.00,
            "stock": 7,
            "critical_stock": 3,
            "description": "LG UltraGear 27\" QHD 165Hz Gaming Monitor",
            "supplier_name": "GlobalPC Imports",
            "warranty_months": 36,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Corsair RM850x PSU",
            "sku": "PSU-COR-001",
            "serial_number": f"SN-{datetime.now().strftime('%Y%m%d%H%M%S')}-014",
            "category": "Power Supplies",
            "price": 16000.00,
            "cost_price": 14000.00,
            "stock": 18,
            "critical_stock": 6,
            "description": "Corsair RM850x 850W 80+ Gold Fully Modular PSU",
            "supplier_name": "TechWorld Distributors",
            "warranty_months": 120,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "NZXT H510 Case",
            "sku": "CASE-NZ-001",
            "serial_number": f"SN-{datetime.now().strftime('%Y%m%d%H%M%S')}-015",
            "category": "Cases",
            "price": 9500.00,
            "cost_price": 8200.00,
            "stock": 10,
            "critical_stock": 4,
            "description": "NZXT H510 Compact Mid-Tower ATX Case",
            "supplier_name": "Silicon Valley BD",
            "warranty_months": 24,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.products.delete_many({"tenant_id": tenant_id})
    await db.products.insert_many(products)
    print(f"✅ Added {len(products)} products")
    
    customers = [
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Mohammad Rakib",
            "phone": "+8801712345678",
            "email": "rakib@gmail.com",
            "address": "Dhanmondi, Dhaka",
            "credit_limit": 50000.00,
            "total_purchases": 125000.00,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Fatima Begum",
            "phone": "+8801823456789",
            "email": "fatima.begum@yahoo.com",
            "address": "Mirpur, Dhaka",
            "credit_limit": 30000.00,
            "total_purchases": 45000.00,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Abdul Karim",
            "phone": "+8801934567890",
            "email": "karim.abdul@hotmail.com",
            "address": "Uttara, Dhaka",
            "credit_limit": 100000.00,
            "total_purchases": 280000.00,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Nusrat Jahan",
            "phone": "+8801645678901",
            "email": "nusrat.jahan@gmail.com",
            "address": "Gulshan, Dhaka",
            "credit_limit": 75000.00,
            "total_purchases": 98000.00,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Habibur Rahman",
            "phone": "+8801556789012",
            "email": "habib.rahman@gmail.com",
            "address": "Banani, Dhaka",
            "credit_limit": 200000.00,
            "total_purchases": 450000.00,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Tahmina Akter",
            "phone": "+8801867890123",
            "email": "tahmina@outlook.com",
            "address": "Mohammadpur, Dhaka",
            "credit_limit": 25000.00,
            "total_purchases": 32000.00,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Imran Hossain",
            "phone": "+8801978901234",
            "email": "imran.tech@gmail.com",
            "address": "Bashundhara, Dhaka",
            "credit_limit": 150000.00,
            "total_purchases": 185000.00,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Sharmin Sultana",
            "phone": "+8801689012345",
            "email": "sharmin.sultana@gmail.com",
            "address": "Motijheel, Dhaka",
            "credit_limit": 40000.00,
            "total_purchases": 67000.00,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.customers.delete_many({"tenant_id": tenant_id})
    await db.customers.insert_many(customers)
    print(f"✅ Added {len(customers)} customers")
    
    sales = []
    for i in range(15):
        days_ago = (15 - i) * 2
        sale_date = datetime.now(timezone.utc) - timedelta(days=days_ago)
        customer = customers[i % len(customers)]
        product = products[i % len(products)]
        quantity = (i % 3) + 1
        subtotal = product["price"] * quantity
        discount = subtotal * 0.05 if i % 3 == 0 else 0
        total = subtotal - discount
        
        sale = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "invoice_number": f"INV-{datetime.now().strftime('%Y%m')}-{str(i+1).zfill(4)}",
            "customer_id": customer["id"],
            "customer_name": customer["name"],
            "customer_phone": customer["phone"],
            "items": [
                {
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "quantity": quantity,
                    "price": product["price"],
                    "subtotal": subtotal
                }
            ],
            "subtotal": subtotal,
            "discount": discount,
            "total": total,
            "paid_amount": total if i % 4 != 0 else total * 0.5,
            "due_amount": 0 if i % 4 != 0 else total * 0.5,
            "payment_status": "paid" if i % 4 != 0 else "partial",
            "payment_method": ["cash", "card", "bkash"][i % 3],
            "status": "completed",
            "created_at": sale_date.isoformat(),
            "updated_at": sale_date.isoformat()
        }
        sales.append(sale)
    
    await db.sales.delete_many({"tenant_id": tenant_id})
    await db.sales.insert_many(sales)
    print(f"✅ Added {len(sales)} sales records")
    
    purchases = []
    for i in range(8):
        days_ago = (8 - i) * 5
        purchase_date = datetime.now(timezone.utc) - timedelta(days=days_ago)
        supplier = suppliers[i % len(suppliers)]
        product = products[i % len(products)]
        quantity = (i % 5 + 1) * 5
        unit_price = product.get("cost_price", product["price"] * 0.85)
        
        purchase = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "purchase_number": f"PO-{datetime.now().strftime('%Y%m')}-{str(i+1).zfill(4)}",
            "supplier_id": supplier["id"],
            "supplier_name": supplier["name"],
            "items": [
                {
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "subtotal": unit_price * quantity,
                    "has_warranty": product.get("warranty_months", 0) > 0,
                    "warranty_months": product.get("warranty_months", 0)
                }
            ],
            "total_amount": unit_price * quantity,
            "payment_status": "paid" if i % 3 != 0 else "pending",
            "stock_status": "applied" if i % 2 == 0 else "pending",
            "notes": f"Regular stock replenishment for {product['category']}",
            "created_at": purchase_date.isoformat(),
            "updated_at": purchase_date.isoformat()
        }
        purchases.append(purchase)
    
    await db.purchases.delete_many({"tenant_id": tenant_id})
    await db.purchases.insert_many(purchases)
    print(f"✅ Added {len(purchases)} purchase orders")
    
    expenses = [
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "category": "Rent",
            "amount": 50000.00,
            "description": "Monthly shop rent - December 2025",
            "date": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "category": "Utilities",
            "amount": 8500.00,
            "description": "Electricity bill - November 2025",
            "date": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "category": "Salary",
            "amount": 45000.00,
            "description": "Staff salaries - November 2025",
            "date": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "category": "Marketing",
            "amount": 15000.00,
            "description": "Facebook & Google Ads - December",
            "date": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.expenses.delete_many({"tenant_id": tenant_id})
    await db.expenses.insert_many(expenses)
    print(f"✅ Added {len(expenses)} expense records")
    
    print("\n📦 Exporting data to JSON file...")
    export_data = {
        "tenant": TENANT_SLUG,
        "tenant_id": tenant_id,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "database_type": "MongoDB",
        "collections": {
            "suppliers": suppliers,
            "products": products,
            "customers": customers,
            "sales": sales,
            "purchases": purchases,
            "expenses": expenses
        },
        "summary": {
            "total_suppliers": len(suppliers),
            "total_products": len(products),
            "total_customers": len(customers),
            "total_sales": len(sales),
            "total_purchases": len(purchases),
            "total_expenses": len(expenses),
            "total_inventory_value": sum(p["price"] * p["stock"] for p in products),
            "total_sales_revenue": sum(s["total"] for s in sales),
            "total_expenses_amount": sum(e["amount"] for e in expenses)
        }
    }
    
    export_path = "computer_shop_data_export.json"
    with open(export_path, "w", encoding="utf-8") as f:
        json.dump(export_data, f, indent=2, ensure_ascii=False, default=str)
    
    print(f"✅ Data exported to: {export_path}")
    
    print("\n" + "="*60)
    print("🎉 Computer Shop seeding completed successfully!")
    print("="*60)
    print(f"\n📊 Summary:")
    print(f"   • Suppliers: {len(suppliers)}")
    print(f"   • Products: {len(products)}")
    print(f"   • Customers: {len(customers)}")
    print(f"   • Sales: {len(sales)}")
    print(f"   • Purchases: {len(purchases)}")
    print(f"   • Expenses: {len(expenses)}")
    print(f"\n💰 Financials:")
    print(f"   • Total Inventory Value: ৳{export_data['summary']['total_inventory_value']:,.2f}")
    print(f"   • Total Sales Revenue: ৳{export_data['summary']['total_sales_revenue']:,.2f}")
    print(f"   • Total Expenses: ৳{export_data['summary']['total_expenses_amount']:,.2f}")
    print(f"\n📁 Export file: {export_path}")
    print("="*60 + "\n")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_computer_shop())
