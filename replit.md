# Smart Business ERP - Multi-Tenant SaaS System

## Overview
This project is a comprehensive, sector-specific ERP system designed to support 15 distinct business types. It features a complete multi-tenant architecture with data isolation, robust role-based access control, and specialized functionalities tailored for each industry. The system aims to provide a full-stack solution for business management, covering inventory, sales, purchases, customer relations, and reporting, with a strong emphasis on flexibility and scalability for various sectors. The business vision is to provide a versatile ERP solution with market potential across numerous specialized industries.

## Recent Changes (November 17, 2025)
- **Critical Production Bug Fixes - Multi-Tenant Database Resolution**: Fixed 8 critical routes that were still using global database instead of tenant-specific databases
  - **Fixed BusinessType Enum**: Added missing 'computer_shop' to BusinessType enum (was causing 500 errors on /api/tenants)
  - **Fixed Invoice Generation**: Updated `/api/sales/{sale_id}/invoice` to use tenant-specific database resolution
  - **Fixed Branches Routes**: Updated GET/POST `/api/branches` to resolve tenant databases
  - **Fixed Suppliers Routes**: Updated GET/POST `/api/suppliers` to resolve tenant databases
  - **Fixed Customers Routes**: Updated GET/POST `/api/customers` to resolve tenant databases
  - **Fixed Product-Branches Routes**: Updated GET/POST `/api/product-branches` to resolve tenant databases (includes notifications)
  - **Fixed Sales List Route**: Updated GET `/api/sales` to resolve tenant databases
  - **Removed Duplicate Route**: Eliminated duplicate `/api/sales/{sale_id}/invoice` endpoint
  - **Pattern Implemented**: All routes now follow consistent tenant resolution pattern:
    - Check for `tenant_slug` in JWT token
    - Call `resolve_tenant_db()` to get tenant-specific database connection
    - Use `target_db` for all queries instead of global `db`
    - Maintain backwards compatibility for legacy users (without tenant_slug)
    - Proper error handling with HTTP 500 on tenant resolution failure
  - **Architect Review**: ✅ All fixes validated - tenant isolation properly maintained, no data leakage risks, backwards compatible
- **Complete POS Multi-Tenant Migration**: Full multi-tenant database isolation for all POS operations
  - Migrated `/api/sales` endpoint to use tenant-specific databases for sales, products, stocks, customers, notifications, and warranties
  - Implemented strict tenant database resolution: multi-tenant requests abort with HTTP 500 on failure (no silent fallbacks to prevent data leakage)
  - Verified end-to-end POS flow: multi-tenant user (mobile@example.com) creates sale → data written exclusively to mobile_shop_db with zero leakage to global database
  - **Test Results**: mobile_shop_db has 2 sales and 2 customers from multi-tenant users; erp_database unchanged
- **Warranty QR Resolution End-to-End Verification**: Complete warranty lifecycle tested across tenant databases
  - POS sale auto-creates warranty in tenant-specific database (mobile_shop_db.warranty_records)
  - QR token generated with self-contained HMAC-SHA256 signature (includes tenant_id, warranty_id, guid, issued_at)
  - Public `/api/warranty/resolve` endpoint successfully queries tenant registry → resolves tenant database → retrieves warranty data
  - Token replay protection and constant-time signature verification working correctly
  - **Fixed Registry Issue**: Updated tenants_registry to include `tenant_id` field for proper warranty QR resolution
- **Legacy User Backwards Compatibility**: Verified pre-multi-tenant users continue working correctly
  - Created dev tool `backend/test_legacy_token.py` for generating legacy JWT tokens (tenant_slug: null)
  - Fixed critical SECRET_KEY mismatch: aligned JWT_SECRET fallback between server.py and test tool
  - Tested legacy user POS sale: data written to erp_database (global) as intended
  - **Test Results**: Legacy users write to erp_database (25 sales), multi-tenant users write to tenant-specific DBs (mobile_shop_db: 2 sales)
  - Perfect database isolation: no cross-contamination between legacy and multi-tenant modes
- **Architecture Decision**: Strict tenant resolution for multi-tenant users (fail fast), intentional global DB fallback for legacy users (backwards compatibility)

## Previous Changes (November 16, 2025)
- **Multi-Database Per Tenant Architecture**: Implemented complete tenant isolation with separate MongoDB databases
  - Created central admin database (`admin_hub`) with tenant registry
  - Implemented dynamic database connection helper with LRU caching for performance
  - Updated authentication to include `tenant_slug` in JWT (registry-first lookup)
  - Built TenantContext dependency system for FastAPI route injection
  - Added health check endpoints (`/api/health/tenant`) for monitoring
  - Created example migration routes demonstrating TenantContext usage
  - Seeded 5 demo tenants: Mobile Shop, TechLand Computers, GlobalTrade CNF, HealthCare Pharmacy, Beauty Salon
  - Complete documentation in README_MULTIDB.md with setup instructions and troubleshooting
  - **Test Results**: All 3 tenants verified working with isolated databases (mobile_shop_db, computer_techland_db, pharmacy_healthcare_db)
- **Project Import Completed**: Successfully migrated project to Replit environment
  - Installed all Python dependencies (uvicorn, fastapi, motor, bcrypt, etc.)
  - Installed all Node.js dependencies with legacy peer deps compatibility
  - Connected to MongoDB Atlas database using MONGO_URL secret
  - Seeded database with 17 demo accounts (1 Super Admin + 16 business sectors)
  - Both workflows running successfully (Backend on port 8000, Frontend on port 5000)
  - All login credentials functional and ready to use

## Previous Changes (November 12, 2025)
- **Role-Based Notification System**: Implemented comprehensive notification filtering with proper data isolation:
  - Tenant admins see all notifications across the system
  - Branch users see only their own notifications, branch-wide announcements, and tenant-wide messages
  - Enhanced Notification model with `branch_id`, `user_id`, `title`, and `metadata` fields
  - Fixed security issue where branch users could see other users' notifications
  - Automatic notification creation when products are assigned to branches
- **Product Assignment Enhancement**: Updated ProductBranchAssignmentPage with role-based restrictions:
  - Stock totals filtered by role: admins see all branches, branch users see only their assigned branch
  - Branch selection restricted for branch users to prevent cross-branch assignments
  - Improved user experience with role-aware UI elements

## Previous Changes (November 11, 2025)
- **POS Stock Display Fix**: Fixed role-aware stock calculation to properly display inventory
- **Branch-Specific Pricing**: Implemented branch-specific sale price display in POS with automatic fallback to base product price
- **Backend Enhancement**: Added `branch_sale_prices` mapping to `/api/products` endpoint for better pricing transparency
- **Project Cleanup**: Organized test files into `tests/` directory and removed unused placeholder files

## User Preferences
I prefer to receive clear, concise explanations and updates. For coding, I appreciate adherence to established architectural patterns and maintainable code. I value iterative development and would like to be consulted before any major architectural changes or significant feature implementations. Please ensure that user and configuration data in the database is preserved across restarts and avoid making changes that would lead to data loss.

## System Architecture
The ERP system is a full-stack application with multi-database per tenant architecture.
- **Backend**: Developed with FastAPI (Python) and utilizes MongoDB Atlas for data persistence. Features a **multi-database architecture** where each tenant has their own isolated MongoDB database for true data separation. The central `admin_hub` database stores the tenant registry. It implements JWT-based authentication with role-based access control and tenant-scoped database resolution. Key features include Point of Sale (POS), inventory management, sales/purchase management, customer/supplier management, expense tracking, and reports. Sector-specific modules are integrated for all supported business types. Backend validation ensures data integrity.
- **Frontend**: Built using React (with yarn), styled with TailwindCSS, and leverages Shadcn UI for componentry. The UI/UX emphasizes a modern dark theme with gradients, glass-morphism effects, professional iconography, and responsive layouts. Navigation includes a reusable `BackButton` component. Frontend forms incorporate features like auto-generated unique IDs, animated toggles, and real-time stock availability checks.
- **System Design**: Features a multi-tenant architecture with logical data isolation. The application runs in Replit, with the frontend on port 5000 and the backend on localhost:8000.
- **UI/UX Decisions**: A modern dark theme with gradients, glass-morphism effects, and professional iconography. Components from Shadcn UI are used for a consistent look and feel. Responsive layouts are prioritized across modules like Branch Management, Product Assignment, Stock Transfer, and Mobile Shop enhancements.
- **Technical Implementations**: JWT-based authentication, role-based access control, and secure file uploads with Cloudinary signed URLs for images. A daily notification system for customer dues is implemented. A comprehensive user management system allows CRUD operations for users with role and route-based permissions, though with broad access in current development.
- **Feature Specifications**:
    - **Multi-Database Architecture**: Each tenant operates in an isolated MongoDB database for true data separation
      - Central admin database (`admin_hub.tenants_registry`) manages tenant metadata and DB URIs
      - Dynamic database connection with LRU caching for performance
      - Registry-first authentication adds `tenant_slug` to JWT for tenant resolution
      - TenantContext dependency system for FastAPI routes
      - Health check endpoints for monitoring tenant connections
      - Backwards compatible with legacy single-database mode
    - **Multi-tenancy**: Data isolation for distinct business types.
    - **Authentication & Authorization**: JWT-based with RBAC, branch-based access control, and route guards.
    - **Inventory Management**: Product assignment to branches, stock transfers, critical stock alerts, and stock quantity standardization (`stock_quantity` field).
    - **Sales & Payments**: POS system with partial payments, invoice generation, customer due tracking, sales cancellations with stock restoration, and returns handling.
    - **Customer Relationship Management**: Daily reminders for customer dues.
    - **User Management**: CRUD operations for users with configurable roles and route permissions.
    - **Settings**: File upload system for logos and background images with Cloudinary integration.
    - **Deployment**: `build.sh` script handles frontend builds using yarn.

## External Dependencies
- **Database**: MongoDB Atlas (cloud-hosted NoSQL database, `erp_database`)
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt (via `passlib[bcrypt]`)
- **Frontend Framework**: React
- **Styling**: TailwindCSS
- **UI Components**: Shadcn UI
- **Frontend Package Manager**: Yarn
- **Backend Framework**: FastAPI (Python)
- **Cloud Storage**: Cloudinary (for image uploads, using authenticated and signed URLs)
- **Python Libraries**: `certifi` (for SSL/TLS connections to MongoDB Atlas)