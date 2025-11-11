# Smart Business ERP - Multi-Tenant SaaS System

## Overview
This project is a comprehensive, sector-specific ERP system designed to support 15 distinct business types. It features a complete multi-tenant architecture with data isolation, robust role-based access control, and specialized functionalities tailored for each industry. The system aims to provide a full-stack solution for business management, covering inventory, sales, purchases, customer relations, and reporting, with a strong emphasis on flexibility and scalability for various sectors. The business vision is to provide a versatile ERP solution with market potential across numerous specialized industries.

## Recent Changes (November 11, 2025)
- **POS Stock Display Fix**: Fixed role-aware stock calculation to properly display inventory:
  - Tenant admins now see aggregated stock across all branches
  - Branch users see stock for their assigned branch only
  - Added fallback to legacy stock when no branch assignments exist
- **Branch-Specific Pricing**: Implemented branch-specific sale price display in POS with automatic fallback to base product price
- **Backend Enhancement**: Added `branch_sale_prices` mapping to `/api/products` endpoint for better pricing transparency
- **Project Cleanup**: Organized test files into `tests/` directory and removed unused placeholder files

## User Preferences
I prefer to receive clear, concise explanations and updates. For coding, I appreciate adherence to established architectural patterns and maintainable code. I value iterative development and would like to be consulted before any major architectural changes or significant feature implementations. Please ensure that user and configuration data in the database is preserved across restarts and avoid making changes that would lead to data loss.

## System Architecture
The ERP system is a full-stack application.
- **Backend**: Developed with FastAPI (Python) and utilizes MongoDB Atlas for data persistence. The database name is `erp_database`. It implements JWT-based authentication with role-based access control for secure, multi-tenant data isolation. Key features include Point of Sale (POS), inventory management, sales/purchase management, customer/supplier management, expense tracking, and reports. Sector-specific modules are integrated for all supported business types. Backend validation ensures data integrity.
- **Frontend**: Built using React (with yarn), styled with TailwindCSS, and leverages Shadcn UI for componentry. The UI/UX emphasizes a modern dark theme with gradients, glass-morphism effects, professional iconography, and responsive layouts. Navigation includes a reusable `BackButton` component. Frontend forms incorporate features like auto-generated unique IDs, animated toggles, and real-time stock availability checks.
- **System Design**: Features a multi-tenant architecture with logical data isolation. The application runs in Replit, with the frontend on port 5000 and the backend on localhost:8000.
- **UI/UX Decisions**: A modern dark theme with gradients, glass-morphism effects, and professional iconography. Components from Shadcn UI are used for a consistent look and feel. Responsive layouts are prioritized across modules like Branch Management, Product Assignment, Stock Transfer, and Mobile Shop enhancements.
- **Technical Implementations**: JWT-based authentication, role-based access control, and secure file uploads with Cloudinary signed URLs for images. A daily notification system for customer dues is implemented. A comprehensive user management system allows CRUD operations for users with role and route-based permissions, though with broad access in current development.
- **Feature Specifications**:
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