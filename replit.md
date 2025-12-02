# Smart Business ERP - Multi-Tenant SaaS System

## Overview
This project is a comprehensive, sector-specific ERP system designed to support 15 distinct business types. It features a complete multi-tenant architecture with data isolation, robust role-based access control, and specialized functionalities tailored for each industry. The system aims to provide a full-stack solution for business management, covering inventory, sales, purchases, customer relations, and reporting, with a strong emphasis on flexibility and scalability for various sectors. The business vision is to provide a versatile ERP solution with market potential across numerous specialized industries.

## User Preferences
I prefer to receive clear, concise explanations and updates. For coding, I appreciate adherence to established architectural patterns and maintainable code. I value iterative development and would like to be consulted before any major architectural changes or significant feature implementations. Please ensure that user and configuration data in the database is preserved across restarts and avoid making changes that would lead to data loss.

## System Architecture
The ERP system is a full-stack application with multi-database per tenant architecture.

-   **Backend**: Developed with FastAPI (Python) and utilizes MongoDB Atlas for data persistence. Features a multi-database architecture where each tenant has their own isolated MongoDB database for true data separation. The central `admin_hub` database stores the tenant registry. It implements JWT-based authentication with role-based access control and tenant-scoped database resolution. Key features include Point of Sale (POS), inventory management, sales/purchase management, customer/supplier management, expense tracking, and reports. Sector-specific modules are integrated for all supported business types. Backend validation ensures data integrity.
-   **Frontend**: Built using React (with yarn), styled with TailwindCSS, and leverages Shadcn UI for componentry. The UI/UX emphasizes a modern dark theme with gradients, glass-morphism effects, professional iconography, and responsive layouts.
-   **System Design**: Features a multi-tenant architecture with logical data isolation, ensuring zero data leakage between tenants. The application runs in Replit, with the frontend on port 5000 and the backend on localhost:8000. It supports backwards compatibility for legacy users operating in a single-database mode.
-   **UI/UX Decisions**: A modern dark theme with gradients, glass-morphism effects, and professional iconography. Components from Shadcn UI are used for a consistent look and feel. Responsive layouts are prioritized.
-   **Technical Implementations**: JWT-based authentication, role-based access control, and secure file uploads with Cloudinary signed URLs. A daily notification system for customer dues is implemented. A comprehensive user management system allows CRUD operations for users with role and route-based permissions.
-   **Code Quality & Data Safety**: All Pydantic models use `Field(default_factory=list/dict)` instead of bare mutable defaults (`[]`, `{}`) to prevent cross-request data leakage. This critical pattern is enforced across 20+ model files including server.py, warranty_models.py, notification_models.py, billing_models.py, and all other model definitions. NEVER use bare list/dict defaults in Pydantic models - always use `Field(default_factory=list)` or `Field(default_factory=lambda: [default_value])`.
-   **Feature Specifications**:
    -   **Multi-Database Architecture**: Each tenant operates in an isolated MongoDB database. A central admin database manages tenant metadata and DB URIs, with dynamic database connection and LRU caching.
    -   **Multi-tenancy**: Strict data isolation for distinct business types with tenant-scoped database resolution.
    -   **Authentication & Authorization**: JWT-based with RBAC, branch-based access control, and route guards.
    -   **Inventory Management**: Product assignment to branches, stock transfers, critical stock alerts, and stock quantity standardization.
    -   **Sales & Payments**: POS system with partial payments, invoice generation, customer due tracking, sales cancellations with stock restoration, and returns handling.
    -   **Customer Relationship Management**: Automated daily reminders for customer dues (scheduled at 9 AM via APScheduler). Customer dues widget on dashboard showing top 5 outstanding payments with total amount. Instant notifications when sales created with unpaid/partially paid status.
    -   **User Management**: CRUD operations for users with configurable roles and route permissions.
    -   **Settings**: File upload system for logos and background images with Cloudinary integration.
    -   **Billing & Subscription Management**: Manual billing system for tenant subscription management with 4-tier pricing in BDT (Taka): Free (৳0), Basic (৳3,000/month), Pro (৳10,000/month), Enterprise (৳30,000/month). Features manual payment recording, subscription lifecycle tracking (trial→active→grace→suspended), automated enforcement via APScheduler, and payment history. Super Admin can edit plan prices and quotas via PATCH /api/super/plans/{plan_id}. All billing data stored in admin_hub database with Pydantic validation and audit logging.
        - **Subscription Enforcement**: Dashboard warning banner for tenant admins with inactive subscriptions (suspended/expired/cancelled). Banner displays subscription status, expiry date, and support contact information with logout button. Non-blocking UI design allows continued access while clearly indicating subscription issues. Backend enriches login and /auth/me responses with subscription_status, subscription_plan, and subscription_expires_at fields from admin_hub database.
    -   **Announcement & Notification System**: 
        - **Super Admin Features**: Complete announcement management UI in Super Admin Dashboard (Announcements tab). Create system-wide announcements with audience targeting (all tenants, specific sectors, specific tenant IDs). Support for multiple announcement types (info, warning, critical, maintenance, feature, promotion) with priority levels and expiration dates.
        - **Tenant Features**: In-app notification feed with real-time badge counter showing unread announcements. Notifications slide-in panel with read/unread tracking, mark-as-read functionality, and dismiss capability. Automatically updates every 30 seconds. Only visible to tenant users (not super admins). Full-page notification center at /notifications with filter options (all/unread).
        - **Backend Infrastructure**: Unified `/api/notifications` endpoint merges tenant-specific notifications (sales, customer dues, low stock) with super admin announcements. Idempotent mark-as-read endpoint gracefully handles orphaned notifications. Automatic orphan receipt cleanup: when fetching announcements, invalid receipts are automatically detected and removed. Cascade deletion: when announcements are deleted, all associated receipts are cleaned up. API endpoints: /api/super/announcements (CRUD), /api/notifications (unified feed), /api/notifications/{id}/read (idempotent).
    -   **Email Campaign Infrastructure**:
        - **Email Service** (backend/email_service.py): Python-based async email service supporting SMTP with rate limiting. Features batch email sending, campaign tracking, queue management, and delivery status monitoring.
        - **Email Models**: EmailCampaign and EmailQueue models with status tracking (draft, scheduled, sending, sent, failed). Support for HTML/text templates, personalization placeholders, and configurable rate limits.
        - **Dependencies**: aiosmtplib for async SMTP operations. Configurable SMTP settings via environment variables or database.
    -   **Warranty Management System**:
        - **Backend Infrastructure** (backend/warranty_models.py, warranty_utils.py, warranty_routes.py): Comprehensive warranty tracking with database models for warranty_records, warranty_events, and supplier_actions. QR token generation with GUID + HMAC-SHA256 signature for security. State machine managing warranty lifecycle (active → claimed → under_inspection → replaced/refunded/declined → closed).
        - **Automatic Warranty Creation**: Integrated into sales flow (server.py lines 3834-3906). Automatically creates warranty records for products with warranty_months > 0, generates secure QR tokens, and creates initial warranty events.
        - **API Endpoints**: Public QR resolution (GET /api/warranty/resolve), claim registration (POST /api/warranty/{id}/claim), staff inspection workflows (POST /api/warranty/{id}/inspection/start, /api/warranty/{id}/inspect), supplier action management (POST /api/warranty/{id}/supplier-action).
        - **Frontend Components**: Public warranty resolution page (/w/{token}) for QR code scanning, customer claim registration form (/warranty/{warranty_id}/claim) with image upload support. Staff warranty pages (WarrantyDashboard, WarrantyDetails) with WarrantySidebar component for consistent navigation. Modern UI with glass-morphism effects showing warranty status, expiry dates, and available actions.
        - **Security**: Token-based authentication with signature verification, fraud detection heuristics (invoice mismatch, duplicate claims, high-value refund dual approval), and anti-replay attack protection.
        - **Business Logic**: Eligibility checks with grace periods, SLA enforcement, status transition validation, and financial transaction tracking for refunds.
    -   **Product Serial Number Management**: Automatic generation of unique product serial numbers using timestamp-based identifiers (format: SN-{timestamp}-{random}). Serial numbers are auto-generated when creating new products or editing products without existing serial numbers. Users can also manually enter serial numbers or regenerate them via the "Generate" button in the product form.
    -   **Purchase Management System**:
        - **Frontend Features** (frontend/src/pages/PurchasesPage.js): Enhanced purchase management UI with expandable rows showing detailed purchase items, quantities, and prices. Chevron icons toggle row expansion for viewing complete purchase details.
        - **Add Items Form**: Uses text input for product name instead of dropdown select. Includes quantity and unit price inputs with validation.
        - **Per-Item Warranty Support**: Checkbox "This item has warranty" conditionally displays warranty duration (months) and warranty serial number input fields. Warranty details are validated when checkbox is checked and stored with each purchase item. Added items display warranty info in orange with shield icon.
        - **Receipt Upload During Creation**: File upload input in New Purchase Order form supports JPG, PNG, WEBP, and PDF files up to 10MB. Shows image preview or PDF indicator before submission. Receipt is uploaded as multipart/form-data with purchase data.
        - **Receipt Upload (Post-Creation)**: Complete receipt upload system with file selection, preview (image thumbnails for JPG/PNG/GIF/WEBP, PDF file indicator), and real-time upload progress tracking (0-100% progress bar). Integrates with Axios onUploadProgress for smooth UX. Endpoint: POST /api/purchases/{id}/receipts.
        - **Supplier Warranty Linking**: Modal form for adding supplier warranties to purchase items. Features product selection, serial number input, warranty terms, coverage details, and warranty period configuration. Enables tracking of supplier warranty obligations for customer claim linkage. Endpoint: POST /api/purchases/{id}/supplier-warranties.
        - **Stock Application**: Apply Stock button with loading states, idempotency protection, and disabled states when stock already applied. Automatically adds purchased inventory to stock with proper status tracking (pending/queued/applied). Endpoint: POST /api/purchases/{id}/apply-stock.
        - **Visual Status Indicators**: Color-coded stock status badges (applied=green, queued=blue, pending=gray), payment status display, receipt file count, and contextual action icons (CheckCircle, Clock, AlertCircle).
        - **Backend Support**: Create purchase endpoint accepts multipart/form-data with items (JSON string), supplier_id, total_amount, payment_status, and optional receipt file. Items include has_warranty, warranty_months, and warranty_serial fields.
    -   **Deployment**: `build.sh` script handles frontend builds using yarn.

## External Dependencies
-   **Database**: MongoDB Atlas (cloud-hosted NoSQL database)
-   **Authentication**: JWT (JSON Web Tokens)
-   **Password Hashing**: bcrypt (via `passlib[bcrypt]`)
-   **Frontend Framework**: React
-   **Styling**: TailwindCSS
-   **UI Components**: Shadcn UI
-   **Frontend Package Manager**: Yarn
-   **Backend Framework**: FastAPI (Python)
-   **Cloud Storage**: Cloudinary (for image uploads)
-   **Python Libraries**: `certifi`