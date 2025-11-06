import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from datetime import datetime, timezone
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_cnf_data():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'erp_database')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🌱 Seeding CNF (Clearing & Forwarding) data...")
    
    cnf_tenant = {
        "id": str(uuid.uuid4()),
        "tenant_id": str(uuid.uuid4()),
        "name": "MaxTech CNF Services",
        "email": "cnf@maxtech.com",
        "business_type": "cnf",
        "modules_enabled": ["cnf", "shipments", "jobs", "billing", "documents", "transport"],
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tenants.insert_one(cnf_tenant)
    
    cnf_admin = {
        "id": str(uuid.uuid4()),
        "email": "cnf@maxtech.com",
        "full_name": "CNF Manager",
        "role": "tenant_admin",
        "business_type": "cnf",
        "tenant_id": cnf_tenant["tenant_id"],
        "hashed_password": pwd_context.hash("cnf123"),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(cnf_admin)
    print("✅ Created CNF Tenant (cnf@maxtech.com / cnf123)")
    
    shipments = [
        {
            "id": str(uuid.uuid4()),
            "tenant_id": cnf_tenant["tenant_id"],
            "shipment_number": "SHP-2024-001",
            "bill_of_lading": "BL-2024-001",
            "client_name": "ABC Textiles Ltd",
            "vessel_name": "MV Ocean Star",
            "port_of_loading": "Shanghai, China",
            "port_of_discharge": "Chittagong, Bangladesh",
            "eta": "2024-12-15",
            "commodity": "Cotton Fabrics",
            "weight": 25000.0,
            "volume": 45.0,
            "container_numbers": ["MSCU1234567", "MSCU1234568"],
            "status": "in_transit",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": cnf_tenant["tenant_id"],
            "shipment_number": "SHP-2024-002",
            "bill_of_lading": "BL-2024-002",
            "client_name": "XYZ Electronics",
            "vessel_name": "MV Pacific Glory",
            "port_of_loading": "Busan, South Korea",
            "port_of_discharge": "Chittagong, Bangladesh",
            "eta": "2024-12-20",
            "commodity": "Electronic Components",
            "weight": 18000.0,
            "volume": 32.0,
            "container_numbers": ["TEMU9876543"],
            "status": "at_port",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.cnf_shipments.insert_many(shipments)
    print("✅ Added 2 shipments")
    
    jobs = [
        {
            "id": str(uuid.uuid4()),
            "tenant_id": cnf_tenant["tenant_id"],
            "job_number": "JOB-2024-001",
            "shipment_id": shipments[0]["id"],
            "client_name": "ABC Textiles Ltd",
            "importer_name": "ABC Textiles Ltd",
            "exporter_name": "Shanghai Fabrics Export Co.",
            "port_of_loading": "Shanghai, China",
            "port_of_discharge": "Chittagong, Bangladesh",
            "commodity": "Cotton Fabrics",
            "hs_code": "5208.31.00",
            "duty_amount": 125000.0,
            "vat_amount": 187500.0,
            "other_charges": 25000.0,
            "status": "in_progress",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": cnf_tenant["tenant_id"],
            "job_number": "JOB-2024-002",
            "shipment_id": shipments[1]["id"],
            "client_name": "XYZ Electronics",
            "importer_name": "XYZ Electronics",
            "exporter_name": "Korea Electronics Ltd",
            "port_of_loading": "Busan, South Korea",
            "port_of_discharge": "Chittagong, Bangladesh",
            "commodity": "Electronic Components",
            "hs_code": "8541.10.00",
            "duty_amount": 90000.0,
            "vat_amount": 135000.0,
            "other_charges": 18000.0,
            "status": "documentation",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.cnf_jobs.insert_many(jobs)
    print("✅ Added 2 job files")
    
    billings = [
        {
            "id": str(uuid.uuid4()),
            "tenant_id": cnf_tenant["tenant_id"],
            "invoice_number": "INV-CNF-2024-001",
            "job_file_id": jobs[0]["id"],
            "client_name": "ABC Textiles Ltd",
            "cnf_charges": 45000.0,
            "transport_charges": 25000.0,
            "documentation_charges": 15000.0,
            "port_charges": 35000.0,
            "other_charges": 10000.0,
            "discount": 5000.0,
            "total_amount": 125000.0,
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": cnf_tenant["tenant_id"],
            "invoice_number": "INV-CNF-2024-002",
            "job_file_id": jobs[1]["id"],
            "client_name": "XYZ Electronics",
            "cnf_charges": 38000.0,
            "transport_charges": 22000.0,
            "documentation_charges": 12000.0,
            "port_charges": 28000.0,
            "other_charges": 8000.0,
            "discount": 3000.0,
            "total_amount": 105000.0,
            "payment_status": "paid",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.cnf_billing.insert_many(billings)
    print("✅ Added 2 invoices")
    
    documents = [
        {
            "id": str(uuid.uuid4()),
            "tenant_id": cnf_tenant["tenant_id"],
            "shipment_id": shipments[0]["id"],
            "job_file_id": jobs[0]["id"],
            "document_type": "Bill of Lading",
            "document_number": "BL-2024-001",
            "issue_date": "2024-11-20",
            "expiry_date": None,
            "notes": "Original BL received",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": cnf_tenant["tenant_id"],
            "shipment_id": shipments[0]["id"],
            "job_file_id": jobs[0]["id"],
            "document_type": "Invoice",
            "document_number": "CI-2024-001",
            "issue_date": "2024-11-18",
            "expiry_date": None,
            "notes": "Commercial Invoice",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": cnf_tenant["tenant_id"],
            "shipment_id": shipments[1]["id"],
            "job_file_id": jobs[1]["id"],
            "document_type": "Import License",
            "document_number": "IL-2024-002",
            "issue_date": "2024-11-15",
            "expiry_date": "2025-11-15",
            "notes": "Valid for one year",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.cnf_documents.insert_many(documents)
    print("✅ Added 3 documents")
    
    transports = [
        {
            "id": str(uuid.uuid4()),
            "tenant_id": cnf_tenant["tenant_id"],
            "transport_number": "TR-2024-001",
            "job_file_id": jobs[0]["id"],
            "shipment_id": shipments[0]["id"],
            "vehicle_number": "DHK-GA-1234",
            "driver_name": "Karim Uddin",
            "driver_phone": "+8801712345678",
            "pickup_location": "Chittagong Port",
            "delivery_location": "ABC Textiles Warehouse, Dhaka",
            "scheduled_date": "2024-12-16",
            "transport_cost": 25000.0,
            "status": "scheduled",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": cnf_tenant["tenant_id"],
            "transport_number": "TR-2024-002",
            "job_file_id": jobs[1]["id"],
            "shipment_id": shipments[1]["id"],
            "vehicle_number": "CHT-BA-5678",
            "driver_name": "Rahim Ahmed",
            "driver_phone": "+8801812345678",
            "pickup_location": "Chittagong Port",
            "delivery_location": "XYZ Electronics Factory, Gazipur",
            "scheduled_date": "2024-12-21",
            "transport_cost": 22000.0,
            "status": "scheduled",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.cnf_transport.insert_many(transports)
    print("✅ Added 2 transport records")
    
    print("\n" + "="*60)
    print("🎉 CNF seed data completed successfully!")
    print("="*60)
    print("\n📋 Demo Account:")
    print("   Email: cnf@maxtech.com")
    print("   Password: cnf123")
    print("   Business Type: CNF (Clearing & Forwarding)")
    print("\n📦 Sample Data Created:")
    print("   • 2 Shipments")
    print("   • 2 Job Files")
    print("   • 2 Invoices")
    print("   • 3 Documents")
    print("   • 2 Transport Records")
    print("="*60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_cnf_data())
