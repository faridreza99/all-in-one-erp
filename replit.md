# Smart Business ERP - Multi-Tenant SaaS System

## Overview
This project is a comprehensive, sector-specific ERP system designed to support 15 distinct business types. It features a complete multi-tenant architecture with data isolation, robust role-based access control, and specialized functionalities tailored for each industry. The system aims to provide a full-stack solution for business management, covering inventory, sales, purchases, customer relations, and reporting, with a strong emphasis on flexibility and scalability. The business vision is to provide a versatile ERP solution with market potential across numerous specialized industries.

## User Preferences
I prefer to receive clear, concise explanations and updates. For coding, I appreciate adherence to established architectural patterns and maintainable code. I value iterative development and would like to be consulted before any major architectural changes or significant feature implementations. Please ensure that user and configuration data in the database is preserved across restarts and avoid making changes that would lead to data loss.

## System Architecture
The ERP system is a full-stack application with a multi-database per tenant architecture.

-   **Backend**: Developed with FastAPI (Python), utilizing MongoDB Atlas. It features a multi-database architecture with isolated MongoDB databases for each tenant and a central `admin_hub` database for tenant registry. JWT-based authentication with role-based access control and tenant-scoped database resolution is implemented. Core modules include POS, inventory, sales/purchase, customer/supplier management, expense tracking, and reporting, alongside sector-specific modules.
-   **Frontend**: Built using React (with yarn), styled with TailwindCSS, and leveraging Shadcn UI. The UI/UX features a modern dark theme with gradients, glass-morphism effects, professional iconography, and responsive layouts.
-   **System Design**: Employs a multi-tenant architecture with logical data isolation. The application runs in Replit, with the frontend on port 5000 and the backend on localhost:8000. It supports backwards compatibility for legacy single-database users.
-   **Core Features**:
    -   **Multi-Database & Multi-tenancy**: Isolated MongoDB databases per tenant, managed by a central `admin_hub`.
    -   **Authentication & Authorization**: JWT-based with Role-Based Access Control (RBAC) and route guards.
    -   **Inventory Management**: Product assignment, stock transfers, critical stock alerts.
    -   **Sales & Payments**: POS, partial payments, invoice generation, customer due tracking, returns.
    -   **Customer Relationship Management**: Automated daily reminders for customer dues.
    -   **User Management**: CRUD operations for users with configurable roles and permissions.
    -   **Billing & Subscription**: Manual 4-tier billing system with subscription lifecycle tracking and automated enforcement.
    -   **Announcement & Notification System**: System-wide announcements by Super Admin (targetable by sector/tenant), in-app tenant notifications with real-time updates and read tracking.
    -   **Email Campaign Infrastructure**: Python-based async email service with batch sending, campaign tracking, and personalization.
    -   **Warranty Management System**: Comprehensive tracking with QR token generation, state machine for lifecycle, automatic creation during sales, public resolution, and staff workflows.
    -   **Product Serial Number Management**: Automatic generation and manual entry of unique serial numbers.
    -   **Purchase Management System**: Enhanced UI, per-item warranty support, receipt upload (Cloudinary), supplier warranty linking, and stock application with auto-creation of products.
-   **Technical Implementations**: Secure file uploads with Cloudinary signed URLs. Pydantic models strictly use `Field(default_factory=list/dict)` to prevent data leakage. React Router fix for static parameterized catch-all routes ensures robust navigation on reload.

## External Dependencies
-   **Database**: MongoDB Atlas
-   **Authentication**: JWT
-   **Password Hashing**: bcrypt (via `passlib[bcrypt]`)
-   **Frontend Framework**: React
-   **Styling**: TailwindCSS
-   **UI Components**: Shadcn UI
-   **Frontend Package Manager**: Yarn
-   **Backend Framework**: FastAPI (Python)
-   **Cloud Storage**: Cloudinary (for image uploads)
-   **Email Service**: aiosmtplib
-   **Scheduling**: APScheduler (for notifications and subscription enforcement)