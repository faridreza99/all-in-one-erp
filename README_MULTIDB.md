# Multi-Database Per Tenant Architecture

## Overview

This Smart Business ERP system now supports **multi-database architecture** where each tenant (vendor/client) operates in their own **isolated MongoDB database**. This provides true data isolation, enhanced security, and better scalability.

## Architecture

### Components

1. **Central Admin Database (`admin_hub`)**
   - Stores the tenant registry
   - Manages tenant metadata, licenses, and database URIs
   - Collection: `tenants_registry`

2. **Tenant Databases**
   - Each tenant has its own MongoDB database
   - Complete isolation between tenants
   - Database name format: `{business_type}_{slug}_db`
   - Examples:
     - `computer_techland_db` (TechLand Computers)
     - `cnf_globaltrade_db` (GlobalTrade CNF)
     - `pharmacy_healthcare_db` (HealthCare Pharmacy)

3. **Dynamic Database Resolution**
   - JWT token contains `tenant_slug`
   - Middleware resolves tenant database from slug
   - Cached connections for performance

## How It Works

### 1. Authentication Flow

```
User Login
   ↓
Verify credentials (default DB)
   ↓
Look up tenant in admin_hub.tenants_registry
   ↓
Create JWT with tenant_slug, business_name, business_type
   ↓
Return token to client
```

### 2. Request Flow

```
API Request + JWT
   ↓
Extract tenant_slug from JWT
   ↓
Resolve tenant DB from registry (cached)
   ↓
Execute query on tenant-specific database
   ↓
Return response
```

## Environment Variables

### Required Secrets (Replit)

```bash
# Admin database for tenant registry
ADMIN_MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/admin_hub

# Default/fallback database for legacy mode
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/

# Database name for default/legacy mode
DB_NAME=erp_database

# JWT and security keys
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here
```

### Optional

```bash
# Specific default DB for legacy single-tenant mode
DEFAULT_MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/
```

## Demo Tenants

### Pre-configured Demo Accounts

| Business Name | Slug | Email | Password | Database |
|--------------|------|-------|----------|----------|
| TechLand Computers | `techland` | `computershop@example.com` | `computershop123` | `computer_techland_db` |
| GlobalTrade CNF | `globaltrade` | `cnf@example.com` | `cnf123` | `cnf_globaltrade_db` |
| Mobile Shop Pro | `mobile` | `mobile@example.com` | `mobile123` | `mobile_shop_db` |
| HealthCare Pharmacy | `pharmacy` | `pharmacy@example.com` | `pharmacy123` | `pharmacy_healthcare_db` |
| Beauty Salon Elite | `salon` | `salon@example.com` | `salon123` | `salon_elite_db` |

## Setup Instructions

### Step 1: Configure MongoDB Atlas

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Navigate to **Security → Network Access**
3. Click **Add IP Address**
4. Select **Allow access from anywhere** (`0.0.0.0/0`) for Replit compatibility
5. Save and wait ~60 seconds for changes to apply

### Step 2: Set Environment Secrets in Replit

1. In Replit, go to **Tools → Secrets**
2. Add these secrets:
   ```
   ADMIN_MONGO_URL = mongodb+srv://user:pass@cluster.mongodb.net/
   MONGO_URL = mongodb+srv://user:pass@cluster.mongodb.net/
   SECRET_KEY = your-random-secret-key
   JWT_SECRET_KEY = your-jwt-secret-key
   ```

### Step 3: Seed the Tenant Registry

```bash
cd backend
python3 seed_tenants_registry.py
```

This creates demo tenants in the `admin_hub` database.

### Step 4: Seed Individual Tenant Databases

For each tenant, seed their specific database:

```bash
# TechLand Computers (computer_techland_db)
python3 seed_computer_shop_tenant.py

# GlobalTrade CNF (cnf_globaltrade_db)
python3 seed_cnf_tenant.py

# Mobile Shop (mobile_shop_db)
python3 seed_mobile_shop_tenant.py

# HealthCare Pharmacy (pharmacy_healthcare_db)
python3 seed_pharmacy_tenant.py
```

### Step 5: Restart Workflows

Restart both Backend and Frontend workflows in Replit to apply changes.

## Adding a New Tenant

### Method 1: Manual Database Insert

1. Connect to your `admin_hub` database
2. Insert a document into `tenants_registry` collection:

```javascript
db.tenants_registry.insertOne({
  "slug": "newbiz",
  "business_name": "New Business Inc",
  "business_type": "retail",
  "db_uri": "mongodb+srv://user:pass@cluster.mongodb.net/",
  "db_name": "retail_newbiz_db",
  "admin_email": "admin@newbiz.com",
  "status": "active",
  "license_type": "free",
  "max_users": 10,
  "max_branches": 3,
  "features_enabled": ["pos", "inventory", "sales"],
  "created_at": new Date(),
  "updated_at": new Date(),
  "billing_contact": "billing@newbiz.com",
  "notes": "Production tenant"
})
```

3. Create a user in the default `erp_database`:

```javascript
db.users.insertOne({
  "id": "uuid-here",
  "email": "admin@newbiz.com",
  "full_name": "Admin User",
  "hashed_password": "bcrypt-hash",
  "role": "tenant_admin",
  "tenant_id": "tenant-uuid",
  // ... other fields
})
```

### Method 2: Create Seed Script

Create a custom seed script like `seed_new_tenant.py`:

```python
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
import os

async def seed_new_tenant():
    mongo_url = os.environ.get('MONGO_URL')
    client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
    
    # Add to registry
    admin_db = client['admin_hub']
    await admin_db.tenants_registry.insert_one({
        "slug": "newbiz",
        "business_name": "New Business Inc",
        # ... rest of fields
    })
    
    # Seed tenant database
    tenant_db = client['retail_newbiz_db']
    await tenant_db.settings.insert_one({
        "business_name": "New Business Inc",
        # ... settings
    })
    
    client.close()

asyncio.run(seed_new_tenant())
```

## Health Check Endpoints

### Check Tenant Connection

```bash
GET /api/health/tenant
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "tenant_slug": "techland",
  "database_name": "computer_techland_db",
  "database_connected": true,
  "collections_count": 25,
  "last_activity": "2025-11-16T12:34:56"
}
```

### List Tenant Collections

```bash
GET /api/health/tenant/collections
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "tenant_slug": "techland",
  "database_name": "computer_techland_db",
  "collections": ["products", "sales", "customers", "branches"],
  "total_collections": 25
}
```

## Verification & Testing

### Test Tenant Isolation

1. **Login as TechLand:**
   ```bash
   POST /api/auth/login
   {
     "email": "computershop@example.com",
     "password": "computershop123"
   }
   ```
   JWT will contain: `tenant_slug: "techland"`

2. **Verify Database:**
   ```bash
   GET /api/health/tenant
   ```
   Should return: `database_name: "computer_techland_db"`

3. **Check Products:**
   ```bash
   GET /api/products
   ```
   Returns products from `computer_techland_db` only

4. **Login as GlobalTrade CNF:**
   Repeat steps with `cnf@example.com` / `cnf123`
   Should connect to `cnf_globaltrade_db`

### Verify No Cross-Tenant Access

1. Login as TechLand user
2. Check products (should see TechLand products only)
3. Login as GlobalTrade CNF user
4. Check products (should see CNF products only, NO TechLand data)

## Common Pitfalls & Solutions

### ❌ MongoDB Atlas Connection Blocked

**Problem:** Replit IP not whitelisted

**Solution:**
1. MongoDB Atlas → Security → Network Access
2. Add IP: `0.0.0.0/0` (allow all for development)
3. Wait 60 seconds, restart workflows

### ❌ Tenant Not Found Error

**Problem:** Tenant not in registry or inactive

**Solution:**
```bash
# Check registry
python3 -c "
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os

async def check():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    tenants = await client.admin_hub.tenants_registry.find().to_list(100)
    for t in tenants:
        print(f'{t[\"slug\"]}: {t[\"status\"]}')
    client.close()

asyncio.run(check())
"

# Re-seed if needed
python3 seed_tenants_registry.py
```

### ❌ No Database URI Configured

**Problem:** Tenant record missing `db_uri`

**Solution:**
```javascript
// Update tenant in admin_hub
db.tenants_registry.updateOne(
  { "slug": "techland" },
  { $set: { "db_uri": "mongodb+srv://..." } }
)
```

### ❌ Replit Restarts Break Connections

**Problem:** Cached clients need re-initialization

**Solution:** Automatic! LRU cache (`@lru_cache`) handles reconnection on restart.

## File Structure

```
backend/
├── db_connection.py              # Multi-tenant DB connection manager
├── tenant_models.py              # Pydantic models for tenant registry
├── tenant_dependency.py          # FastAPI dependencies for tenant resolution
├── health_tenant.py              # Health check endpoints
├── seed_tenants_registry.py      # Seed admin_hub registry
├── seed_computer_shop_tenant.py  # Seed TechLand database
├── seed_cnf_tenant.py            # Seed GlobalTrade CNF database
├── seed_mobile_shop_tenant.py    # Seed Mobile Shop database
├── seed_pharmacy_tenant.py       # Seed Pharmacy database
└── server.py                     # Main FastAPI application
```

## Database Schema

### admin_hub.tenants_registry

```javascript
{
  "_id": ObjectId("..."),
  "slug": "techland",                    // Unique identifier (URL-safe)
  "business_name": "TechLand Computers", // Display name
  "business_type": "computer_shop",      // Business category
  "db_uri": "mongodb+srv://...",         // MongoDB connection string
  "db_name": "computer_techland_db",     // Database name
  "admin_email": "admin@techland.com",   // Primary admin email
  "status": "active",                    // active|suspended|inactive
  "license_type": "pro",                 // free|pro|enterprise
  "max_users": 50,                       // User limit
  "max_branches": 10,                    // Branch limit
  "features_enabled": ["pos", "inventory"],
  "created_at": ISODate("..."),
  "updated_at": ISODate("..."),
  "billing_contact": "billing@...",
  "notes": "..."
}
```

## Performance Considerations

### Connection Pooling

- Uses `@lru_cache(maxsize=256)` for MongoDB client reuse
- Prevents socket exhaustion
- Automatic reconnection on Replit restart

### Tenant Caching

- In-memory cache for tenant registry lookups
- Reduces admin_hub queries
- Use `clear_tenant_cache()` to refresh

### Database Indexes

Ensure indexes on tenant databases:

```javascript
// Each tenant database
db.products.createIndex({ "tenant_id": 1, "branch_id": 1 })
db.sales.createIndex({ "tenant_id": 1, "created_at": -1 })
db.customers.createIndex({ "tenant_id": 1, "email": 1 })
```

## Migration from Single-Database

### Legacy Compatibility

The system supports both modes:
- **Multi-tenant mode:** Uses tenant registry and separate databases
- **Legacy mode:** Falls back to single shared database

### Migration Steps

1. **Export data from shared database** for each tenant
2. **Create new tenant databases** in MongoDB Atlas
3. **Add tenants to registry** (admin_hub)
4. **Import data** into respective tenant databases
5. **Update users** to link with tenant_slug
6. **Test** each tenant independently
7. **Deprecate** shared database access

## Security Best Practices

1. **Environment Secrets:** Never commit database URIs to git
2. **IP Whitelist:** Use specific IPs in production (not 0.0.0.0/0)
3. **TLS/SSL:** Always use `mongodb+srv://` (not `mongodb://`)
4. **JWT Expiry:** Tokens expire after 7 days (configurable)
5. **Role-Based Access:** Enforce tenant_admin vs staff permissions
6. **Audit Logging:** Track all cross-collection operations

## Troubleshooting

### Enable Debug Logging

```python
import logging
logging.basicConfig(level=logging.INFO)
```

### Check Logs

```bash
# Backend logs
tail -f /tmp/logs/Backend_*.log | grep -E "tenant|database"
```

### Test Connection Manually

```python
from db_connection import resolve_tenant_db
import asyncio

async def test():
    db = await resolve_tenant_db("techland")
    print(f"Connected to: {db.name}")
    collections = await db.list_collection_names()
    print(f"Collections: {collections}")

asyncio.run(test())
```

## Support

For issues or questions:
1. Check logs: `/tmp/logs/Backend_*.log`
2. Verify MongoDB Atlas whitelist
3. Confirm tenant registry exists in admin_hub
4. Test health endpoints
5. Review this documentation

## License & Credits

Smart Business ERP Multi-Tenant Architecture
© 2025 All Rights Reserved
