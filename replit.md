# Smart Business ERP - Multi-Tenant SaaS System

## ⚠️ IMPORTANT: Authentication Data Persists to MongoDB Atlas

**If you're experiencing "Authentication failed" errors or data loss after restart:**

Your MongoDB Atlas connection is likely being blocked due to IP whitelisting. **All user authentication data is stored in MongoDB Atlas (cloud database)**, not locally. If the connection fails, no data will be saved.

**📋 QUICK FIX:**
1. Go to [MongoDB Atlas](https://cloud.mongodb.com) → Security → Network Access
2. Add IP address: `0.0.0.0/0` (Allow access from anywhere)
3. Wait 60 seconds, then restart the Backend workflow
4. Look for "✅ MongoDB Atlas connection successful!" in the logs

**📖 Detailed Instructions:** See [MONGODB_SETUP.md](./MONGODB_SETUP.md) for complete step-by-step guide.

---

## Overview
This project is a comprehensive, sector-specific ERP system designed to support 15 distinct business types. It features a complete multi-tenant architecture with data isolation, robust role-based access control, and specialized functionalities tailored for each industry. The system aims to provide a full-stack solution for business management, covering inventory, sales, purchases, customer relations, and reporting, with a strong emphasis on flexibility and scalability for various sectors.

## User Preferences
_This section can be used to track user-specific preferences and coding styles as the project evolves._

## System Architecture
The ERP system is built as a full-stack application.
- **Backend**: Developed with FastAPI (Python) and utilizes MongoDB Atlas for data persistence. It implements JWT-based authentication with role-based access control to ensure secure, multi-tenant data isolation. Key features include a Point of Sale (POS) system, inventory management, sales and purchase management, customer/supplier management, expense tracking, and comprehensive reports/analytics. Sector-specific modules are integrated for all 15 supported business types.
- **Frontend**: Built using React, styled with TailwindCSS, and leverages Shadcn UI for componentry. It provides an intuitive user interface with sector-specific pages and a consistent design. UI/UX decisions emphasize a modern dark theme with gradients, glass-morphism effects, professional iconography, and responsive layouts across various modules (e.g., Branch Management, Product Assignment, Stock Transfer, Mobile Shop enhancements). Navigation includes a reusable `BackButton` component for improved user experience.
- **System Design**: Features a multi-tenant architecture with logical data isolation. The application is configured to run in Replit's environment, with the frontend accessible via webview on port 5000 and the backend on localhost:8000. Backend validation ensures data integrity, and front-end forms include features like auto-generated unique IDs, animated toggles, and real-time stock availability checks.

## External Dependencies
- **Database**: MongoDB Atlas (cloud-hosted NoSQL database)
- **Authentication**: JWT (JSON Web Tokens)
- **Frontend Libraries**: React, TailwindCSS, Shadcn UI
- **Backend Framework**: FastAPI (Python)
- **Python Libraries**: `certifi` (for SSL/TLS connections to MongoDB Atlas)