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
-   **Technical Implementations**: Secure file uploads with Cloudinary signed URLs. Pydantic models strictly use `Field(default_factory=list/dict)` to prevent data leakage.
    -   **React Router Fix (Dec 2025)**: Complete refactoring from conditional routes (`{user.business_type && <Route path={/${user.business_type}/module} />}`) to static parameterized routes (`<Route path="/:sector/module" />`). Routes are always registered and use `ProtectedSectorRoute` wrapper component to handle loading states, auth checks, and access control. This eliminates "No routes matched location" errors on page reload.
    -   **Due Payment Request System (Dec 2025)**: Staff can request admin approval for customer credit/due payments from POS. Backend DueRequest model with status workflow (pending → approved/rejected). Admin receives real-time notifications with approve/reject modal. Notifications created for both admin and requesting staff.
    -   **WebSocket Real-Time Updates (Dec 2025)**: WebSocket endpoint at /ws/{token} with JWT authentication (signature + expiry verification). ConnectionManager tracks tenant-scoped connections with role-based targeting. Due request notifications broadcast only to admins. NotificationBell uses WebSocket with 60s polling fallback.
    -   **Performance Optimization (Dec 2025)**: React.lazy() code splitting for all page components with Suspense fallback. Reduces initial bundle size by loading pages on-demand.
    -   **Mobile Responsive Utilities (Dec 2025)**: Added CSS utility classes for touch-friendly tap targets (min 44x44px), safe-area padding for notched devices, mobile sticky footer, and reduced motion accessibility support.
    -   **Shared Sale Service (Dec 2025)**: Extracted sale creation logic into `backend/sales_service.py` to ensure consistency between POS sales and due request approvals. The service handles: stock validation, stock updates, low-stock notifications, customer auto-creation/update, sale creation, warranty auto-creation, payment records, customer dues, and unpaid invoice notifications. Due request approvals now use this shared service for full feature parity with direct POS sales.
    -   **Invoice Warranty Terms (Dec 2025)**: Optional warranty & return policy terms that can be added during Purchase creation. When enabled, terms are saved to both the purchase record and the products being purchased. When those products are later sold through POS, the warranty terms automatically inherit to the sale invoice. Default terms include 15-day replacement policy, 2-year service warranty, damage exclusions, and 20-25% return deduction. Invoice layout optimized for single-page fit with compact spacing, side-by-side warranty QR codes, and Payment History section removed.
    -   **Serial Number & Product Details in POS/Invoice (Dec 2025)**: Added serial_number and custom_description fields to sale items. POS cart now includes input fields for serial number and product details (specs, model info). These details display on the invoice under the product name. Invoice page includes an Edit button to modify serial number and custom description after sale creation. API endpoint PATCH /sales/{sale_id}/items allows updating item details.
    -   **Purchase Product Price Sync (Dec 2025)**: When selecting an existing product in Purchase form, the current price is auto-filled and displayed below the price input. If the price is changed, it shows a "will be updated" indicator. Upon purchase creation, if the price differs from the existing product price, the product's price, cost, and unit_cost are automatically updated to match the new purchase price.

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