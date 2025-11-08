# Smart Business ERP - Multi-Tenant SaaS System

## ✅ AUTHENTICATION PERSISTENCE - FIXED (Nov 8, 2025)

**Issue Resolved:** Database name mismatch was causing authentication failures after restarts. System now uses consistent `erp_database` configuration.

**Current Status:**
- ✅ All user credentials persist permanently in MongoDB Atlas
- ✅ Database name standardized to `erp_database`
- ✅ No automatic seeding on startup (users never deleted)
- ✅ JWT secrets stable and secure

**See [DATABASE_FIX_SUMMARY.md](./DATABASE_FIX_SUMMARY.md) for full technical details.**

## ⚠️ IMPORTANT: MongoDB Atlas Connection

**If you're experiencing "Authentication failed" errors:**

1. **Check MongoDB Atlas IP Whitelist:**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com) → Security → Network Access
   - Add IP address: `0.0.0.0/0` (Allow access from anywhere)
   - Wait 60 seconds, then restart the Backend workflow
   - Look for "✅ MongoDB Atlas connection successful!" in logs

2. **Verify Database Configuration:**
   - Backend uses database: `erp_database` (not `erp_db`)
   - Check `backend/.env` has `DB_NAME=erp_database`

**📖 Detailed Instructions:** See [MONGODB_SETUP.md](./MONGODB_SETUP.md) for setup guide.

---

## Overview
This project is a comprehensive, sector-specific ERP system designed to support 15 distinct business types. It features a complete multi-tenant architecture with data isolation, robust role-based access control, and specialized functionalities tailored for each industry. The system aims to provide a full-stack solution for business management, covering inventory, sales, purchases, customer relations, and reporting, with a strong emphasis on flexibility and scalability for various sectors.

## User Preferences
_This section can be used to track user-specific preferences and coding styles as the project evolves._

## Recent Changes

### Enhanced Sales & Payment System (November 8, 2025)
**Backend Features Implemented:**
- **Invoice Generation**: Auto-generated invoice numbers (INV-XXXXXX format)
- **Payment Tracking**: Full support for partial/full payments with status tracking (UNPAID → PARTIALLY_PAID → PAID)
- **Payment Validation**: Production-safe validation prevents negative amounts, overpayments, and ensures balance == 0 for PAID status
- **Customer Due Tracking**: Automatic customer due records for unpaid/partially paid invoices
- **Notifications System**: Four notification types (UNPAID_INVOICE, LOW_STOCK, PAYMENT_RECEIVED, SALE_CANCELLED) with sticky alerts for unpaid invoices
- **Returns & Cancellations**: Sale cancellation with stock restoration (prevented if payments made), return approval with refund handling
- **Stock Transfer**: Branch-to-branch transfers with atomic stock updates (already existed, verified functional)
- **Dashboard Alerts**: Notification counts endpoint with breakdown by type and recent activity

**New API Endpoints:**
- `POST /api/sales` - Enhanced with partial payment support and invoice generation
- `GET /api/sales/{id}/invoice` - Retrieve sale details with full payment history
- `POST /api/sales/{id}/payments` - Add payments to existing sales with cumulative validation
- `PATCH /api/sales/{id}/cancel` - Cancel sale with automatic stock restoration
- `GET /api/notifications` - Fetch notifications (filter by type/unread)
- `PATCH /api/notifications/{id}/read` - Mark notification as read
- `PATCH /api/returns/{id}/approve` - Enhanced to restore stock and handle refunds
- `GET /api/dashboard/alerts` - Notification counts and recent alerts
- `GET /api/dashboard/sales-chart` - Last 7 days sales data (already existed)

**Frontend Work Pending:**
- Invoice page with payment modal
- Notification bell component
- Stock transfer UI (backend ready)
- Returns UI with cancel buttons
- POS flow redirect to invoice page

## System Architecture
The ERP system is built as a full-stack application.
- **Backend**: Developed with FastAPI (Python) and utilizes MongoDB Atlas for data persistence. Database name: `erp_database` (configured in `backend/.env`). It implements JWT-based authentication with role-based access control to ensure secure, multi-tenant data isolation. Key features include a Point of Sale (POS) system, inventory management, sales and purchase management, customer/supplier management, expense tracking, and comprehensive reports/analytics. Sector-specific modules are integrated for all 16 supported business types.
- **Frontend**: Built using React (using yarn package manager), styled with TailwindCSS, and leverages Shadcn UI for componentry. It provides an intuitive user interface with sector-specific pages and a consistent design. UI/UX decisions emphasize a modern dark theme with gradients, glass-morphism effects, professional iconography, and responsive layouts across various modules (e.g., Branch Management, Product Assignment, Stock Transfer, Mobile Shop enhancements). Navigation includes a reusable `BackButton` component for improved user experience.
- **System Design**: Features a multi-tenant architecture with logical data isolation. The application is configured to run in Replit's environment, with the frontend accessible via webview on port 5000 and the backend on localhost:8000. Backend validation ensures data integrity, and front-end forms include features like auto-generated unique IDs, animated toggles, and real-time stock availability checks.
- **Deployment**: Build script (`build.sh`) uses yarn for frontend builds. Deployment configuration executes `sh build.sh` for production builds.

## External Dependencies
- **Database**: MongoDB Atlas (cloud-hosted NoSQL database) - Database name: `erp_database`
- **Authentication**: JWT (JSON Web Tokens) with bcrypt password hashing
- **Frontend Libraries**: React, TailwindCSS, Shadcn UI
- **Frontend Package Manager**: Yarn (yarn.lock file)
- **Backend Framework**: FastAPI (Python)
- **Python Libraries**: `certifi` (for SSL/TLS connections to MongoDB Atlas), `passlib[bcrypt]` (password hashing)

## Critical Configuration Notes
- **Database Name:** Always use `erp_database` (set in `backend/.env` as `DB_NAME=erp_database`)
- **Seed Scripts Warning:** ⚠️ Never manually run seed scripts (`seed_data.py`, `seed_all_sectors.py`) - they contain `delete_many({})` which deletes all users!
- **User Persistence:** User accounts are permanently stored in MongoDB Atlas and survive restarts
- **Active Accounts:** Multiple verified working accounts in `erp_database` (CNF, Mobile Shop, Infini, etc.)