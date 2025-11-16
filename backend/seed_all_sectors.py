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

async def seed_all_sectors():
    # Connect to MongoDB - handle both Mongo_URL and MONGO_URL
    mongo_url = os.environ.get('MONGO_URL') or os.environ.get('Mongo_URL') or 'mongodb://localhost:27017'
    db_name = os.environ.get('DB_NAME', 'erp_database')
    
    # Add TLS configuration for MongoDB Atlas using certifi
    client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
    db = client[db_name]
    
    print("🌱 Seeding ALL 15 business sectors...")
    
    # Define all sectors
    sectors_data = [
        {
            "name": "City Clinic & Diagnostics",
            "email": "clinic@example.com",
            "password": "clinic123",
            "business_type": "clinic",
            "doctors": [
                {"name": "Dr. Sarah Johnson", "specialization": "General Physician", "phone": "+1234567890", "consultation_fee": 50.0, "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]},
                {"name": "Dr. Michael Chen", "specialization": "Cardiologist", "phone": "+1234567891", "consultation_fee": 100.0, "available_days": ["Monday", "Wednesday", "Friday"]},
            ],
            "patients": [
                {"name": "John Smith", "age": 35, "gender": "male", "phone": "+1234567892", "blood_group": "O+"},
                {"name": "Emily Davis", "age": 28, "gender": "female", "phone": "+1234567893", "blood_group": "A+"},
            ]
        },
        {
            "name": "FreshMart Grocery",
            "email": "grocery@example.com",
            "password": "grocery123",
            "business_type": "grocery",
            "products": [
                {"name": "Organic Apples", "sku": "GROC-001", "category": "Fruits", "price": 4.99, "stock": 100, "description": "Fresh organic apples - 1kg"},
                {"name": "Whole Wheat Bread", "sku": "GROC-002", "category": "Bakery", "price": 2.99, "stock": 50, "description": "Freshly baked whole wheat bread"},
                {"name": "Fresh Milk", "sku": "GROC-003", "category": "Dairy", "price": 3.49, "stock": 80, "description": "Fresh pasteurized milk - 1 liter"},
            ],
            "offers": [
                {"title": "Weekend Special", "discount_percentage": 15.0, "start_date": "2025-01-20", "end_date": "2025-01-22", "applicable_categories": ["Fruits", "Vegetables"]},
            ]
        },
        {
            "name": "AutoCare Garage",
            "email": "garage@example.com",
            "password": "garage123",
            "business_type": "garage",
            "vehicles": [
                {"owner_name": "Robert Brown", "phone": "+1234567894", "vehicle_number": "ABC-1234", "vehicle_model": "Toyota Camry 2020", "vehicle_type": "Sedan"},
                {"owner_name": "Jennifer Wilson", "phone": "+1234567895", "vehicle_number": "XYZ-5678", "vehicle_model": "Honda CR-V 2021", "vehicle_type": "SUV"},
            ],
            "services": [
                {"name": "Oil Change", "duration_minutes": 30, "price": 45.0, "description": "Full synthetic oil change"},
                {"name": "Brake Service", "duration_minutes": 60, "price": 150.0, "description": "Complete brake inspection and service"},
            ]
        },
        {
            "name": "Prime Properties Real Estate",
            "email": "realestate@example.com",
            "password": "realestate123",
            "business_type": "real_estate",
            "properties": [
                {"property_name": "Sunset Villa", "property_type": "House", "address": "123 Ocean Drive, Miami", "size": "3000 sqft", "rent_amount": 3500.0, "status": "available"},
                {"property_name": "Downtown Apartment", "property_type": "Apartment", "address": "456 City Center, New York", "size": "1200 sqft", "rent_amount": 2800.0, "status": "rented"},
                {"property_name": "Garden Cottage", "property_type": "Cottage", "address": "789 Green Lane, Portland", "size": "1800 sqft", "rent_amount": 2200.0, "status": "available"},
            ]
        },
        {
            "name": "Bella Fashion Boutique",
            "email": "fashion@example.com",
            "password": "fashion123",
            "business_type": "fashion",
            "products": [
                {"name": "Designer Summer Dress", "sku": "FASH-001", "category": "Dresses", "price": 89.99, "stock": 25, "description": "Elegant summer dress"},
                {"name": "Casual Denim Jeans", "sku": "FASH-002", "category": "Bottoms", "price": 59.99, "stock": 40, "description": "Comfortable casual jeans"},
            ],
            "variants": [
                {"product_id": "placeholder", "size": "S", "color": "Red", "sku": "FASH-001-S-RED", "price": 89.99, "stock": 5},
                {"product_id": "placeholder", "size": "M", "color": "Blue", "sku": "FASH-001-M-BLUE", "price": 89.99, "stock": 8},
                {"product_id": "placeholder", "size": "L", "color": "Black", "sku": "FASH-001-L-BLACK", "price": 89.99, "stock": 7},
            ]
        },
        {
            "name": "Grand Hotel & Restaurant",
            "email": "restaurant@example.com",
            "password": "restaurant123",
            "business_type": "restaurant",
            "products": [
                {"name": "Grilled Salmon", "sku": "REST-001", "category": "Main Course", "price": 24.99, "stock": 50, "description": "Fresh grilled salmon with vegetables"},
                {"name": "Caesar Salad", "sku": "REST-002", "category": "Appetizers", "price": 12.99, "stock": 100, "description": "Classic Caesar salad"},
                {"name": "Chocolate Lava Cake", "sku": "REST-003", "category": "Desserts", "price": 8.99, "stock": 30, "description": "Warm chocolate lava cake"},
            ],
            "tables": [
                {"table_number": "T1", "capacity": 4},
                {"table_number": "T2", "capacity": 2},
                {"table_number": "T3", "capacity": 6},
                {"table_number": "T4", "capacity": 4},
            ]
        },
        {
            "name": "TechZone Electronics",
            "email": "electronics@example.com",
            "password": "electronics123",
            "business_type": "electronics",
            "products": [
                {"name": "Gaming Laptop", "sku": "ELEC-001", "category": "Computers", "price": 1299.99, "stock": 15, "description": "High-performance gaming laptop"},
                {"name": "Wireless Headphones", "sku": "ELEC-002", "category": "Audio", "price": 149.99, "stock": 35, "description": "Premium wireless headphones"},
                {"name": "4K Smart TV", "sku": "ELEC-003", "category": "TVs", "price": 799.99, "stock": 10, "description": "55-inch 4K Smart TV"},
            ]
        },
        {
            "name": "Scholar's Stationery",
            "email": "stationery@example.com",
            "password": "stationery123",
            "business_type": "stationery",
            "products": [
                {"name": "Premium Notebook Set", "sku": "STAT-001", "category": "Notebooks", "price": 15.99, "stock": 100, "description": "Set of 5 premium notebooks"},
                {"name": "Art Supplies Kit", "sku": "STAT-002", "category": "Art", "price": 45.99, "stock": 25, "description": "Complete art supplies kit"},
                {"name": "Calculator Scientific", "sku": "STAT-003", "category": "Electronics", "price": 29.99, "stock": 40, "description": "Scientific calculator"},
            ]
        },
        {
            "name": "BuildMart Hardware",
            "email": "hardware@example.com",
            "password": "hardware123",
            "business_type": "hardware",
            "products": [
                {"name": "Power Drill Set", "sku": "HARD-001", "category": "Tools", "price": 89.99, "stock": 20, "description": "18V cordless power drill set"},
                {"name": "Paint Premium White", "sku": "HARD-002", "category": "Paint", "price": 35.99, "stock": 50, "description": "Premium white paint - 5 liters"},
                {"name": "Cement Bag", "sku": "HARD-003", "category": "Construction", "price": 12.99, "stock": 200, "description": "Portland cement - 50kg bag"},
            ]
        },
        {
            "name": "ComfortHome Furniture",
            "email": "furniture@example.com",
            "password": "furniture123",
            "business_type": "furniture",
            "products": [
                {"name": "Leather Sofa", "sku": "FURN-001", "category": "Living Room", "price": 1299.99, "stock": 8, "description": "Premium leather 3-seater sofa"},
                {"name": "Dining Table Set", "sku": "FURN-002", "category": "Dining", "price": 899.99, "stock": 5, "description": "6-seater solid wood dining set"},
                {"name": "Office Chair Ergonomic", "sku": "FURN-003", "category": "Office", "price": 249.99, "stock": 15, "description": "Ergonomic office chair"},
            ]
        },
        {
            "name": "MegaTrade Wholesale",
            "email": "wholesale@example.com",
            "password": "wholesale123",
            "business_type": "wholesale",
            "products": [
                {"name": "Rice Premium - 25kg", "sku": "WHOLE-001", "category": "Grains", "price": 45.99, "stock": 500, "description": "Premium quality rice bulk pack"},
                {"name": "Cooking Oil - 5L", "sku": "WHOLE-002", "category": "Oil", "price": 18.99, "stock": 300, "description": "Vegetable cooking oil bulk"},
                {"name": "Sugar - 50kg", "sku": "WHOLE-003", "category": "Sugar", "price": 35.99, "stock": 200, "description": "White sugar bulk pack"},
            ]
        },
        {
            "name": "ShopOnline E-commerce",
            "email": "ecommerce@example.com",
            "password": "ecommerce123",
            "business_type": "ecommerce",
            "products": [
                {"name": "Smartphone Case", "sku": "ECOM-001", "category": "Accessories", "price": 19.99, "stock": 150, "description": "Premium smartphone protective case"},
                {"name": "Wireless Charger", "sku": "ECOM-002", "category": "Accessories", "price": 29.99, "stock": 100, "description": "Fast wireless charging pad"},
                {"name": "Bluetooth Speaker", "sku": "ECOM-003", "category": "Audio", "price": 49.99, "stock": 75, "description": "Portable Bluetooth speaker"},
            ]
        },
    ]
    
    for sector in sectors_data:
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
        
        # Add sector-specific data
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
        
        if "doctors" in sector:
            for doctor_data in sector["doctors"]:
                doctor = {
                    "id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    **doctor_data,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.doctors.insert_one(doctor)
            print(f"✅ Added {len(sector['doctors'])} doctors")
        
        if "patients" in sector:
            for patient_data in sector["patients"]:
                patient = {
                    "id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    **patient_data,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.patients.insert_one(patient)
            print(f"✅ Added {len(sector['patients'])} patients")
        
        if "vehicles" in sector:
            for vehicle_data in sector["vehicles"]:
                vehicle = {
                    "id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    **vehicle_data,
                    "service_history": [],
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.vehicles.insert_one(vehicle)
            print(f"✅ Added {len(sector['vehicles'])} vehicles")
        
        if "properties" in sector:
            for property_data in sector["properties"]:
                property_doc = {
                    "id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    **property_data,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.properties.insert_one(property_doc)
            print(f"✅ Added {len(sector['properties'])} properties")
        
        if "tables" in sector:
            for table_data in sector["tables"]:
                table = {
                    "id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    "status": "available",
                    "current_order_id": None,
                    **table_data,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.tables.insert_one(table)
            print(f"✅ Added {len(sector['tables'])} tables")
        
        if "offers" in sector:
            for offer_data in sector["offers"]:
                offer = {
                    "id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    "is_active": True,
                    **offer_data,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.offers.insert_one(offer)
            print(f"✅ Added {len(sector['offers'])} offers")
        
        if "variants" in sector:
            for variant_data in sector["variants"]:
                variant = {
                    "id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    **variant_data,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.product_variants.insert_one(variant)
            print(f"✅ Added {len(sector['variants'])} product variants")
    
    print(f"\n{'='*60}")
    print("🎉 ALL 12 NEW SECTORS SEEDED SUCCESSFULLY!")
    print(f"{'='*60}")
    print("\n📋 NEW LOGIN CREDENTIALS:")
    print("-" * 60)
    for sector in sectors_data:
        print(f"🏢 {sector['name']:30} | {sector['email']:25} | {sector['password']}")
    print("-" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_all_sectors())
