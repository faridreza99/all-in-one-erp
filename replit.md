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
-   **Feature Specifications**:
    -   **Multi-Database Architecture**: Each tenant operates in an isolated MongoDB database. A central admin database manages tenant metadata and DB URIs, with dynamic database connection and LRU caching.
    -   **Multi-tenancy**: Strict data isolation for distinct business types with tenant-scoped database resolution.
    -   **Authentication & Authorization**: JWT-based with RBAC, branch-based access control, and route guards.
    -   **Inventory Management**: Product assignment to branches, stock transfers, critical stock alerts, and stock quantity standardization.
    -   **Sales & Payments**: POS system with partial payments, invoice generation, customer due tracking, sales cancellations with stock restoration, and returns handling.
    -   **Customer Relationship Management**: Daily reminders for customer dues.
    -   **User Management**: CRUD operations for users with configurable roles and route permissions.
    -   **Settings**: File upload system for logos and background images with Cloudinary integration.
    -   **Billing & Subscription Management** (NEW): Manual billing system for tenant subscription management with 4-tier pricing (Free/Basic/Pro/Enterprise), manual payment recording, subscription lifecycle tracking (trial→active→grace→suspended), and payment history. All billing data stored in admin_hub database with Pydantic validation and audit logging. API routes include plan catalog, subscription CRUD, and payment recording with automatic expiration calculation based on billing cycle.
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