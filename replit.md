# Smart Business ERP - Multi-Tenant SaaS System

A comprehensive, sector-specific ERP system supporting **15 business types** with complete multi-tenant data isolation, role-based access control, and specialized features for each industry.

## Project Overview

This is a full-stack ERP application built with:
- **Backend**: FastAPI (Python) + MongoDB Atlas
- **Frontend**: React + TailwindCSS + Shadcn UI
- **Database**: MongoDB Atlas (cloud-hosted)
- **Authentication**: JWT-based with role-based access control

## Supported Business Sectors

1. **Pharmacy** 💊 - Batch/expiry tracking, generic/brand management
2. **Salon & Spa** ✂️ - Services, appointments, customer tracking
3. **Restaurant** 🍽️ - Table management, menu, POS
4. **Mobile Shop** 📱 - IMEI tracking, repairs, warranties
5. **Clinic** 🏥 - Doctors, patients, appointments
6. **Grocery Store** 🛒 - Products, offers, suppliers
7. **Electronics Store** 💻 - Warranties, returns
8. **Fashion Boutique** 👗 - Product variants, SKU management
9. **Stationery Shop** 📚 - Books inventory, ISBN tracking
10. **Hardware Store** 🔧 - Bulk pricing, multi-unit
11. **Furniture Store** 🛋️ - Custom orders, installments
12. **Auto Garage** 🚗 - Vehicle registry, service history
13. **Wholesale Business** 📦 - Multi-tier pricing, PO, GRN
14. **E-commerce** 🛍️ - Online orders, shipping
15. **Real Estate** 🏘️ - Property listing, lease tracking

## Current Setup

### Environment Variables
- `Mongo_URL`: MongoDB Atlas connection string (stored in Replit Secrets)
- `DB_NAME`: Database name (default: erp_db)
- `JWT_SECRET`: Secret key for JWT tokens
- `REACT_APP_BACKEND_URL`: Backend API URL (http://localhost:8000)

### Workflows
1. **Backend** - FastAPI server running on localhost:8000
2. **Frontend** - React development server running on 0.0.0.0:5000

### Key Features Implemented
- ✅ Multi-tenant architecture with data isolation
- ✅ JWT authentication and authorization
- ✅ Point of Sale (POS) system
- ✅ Inventory management
- ✅ Sales & purchase management
- ✅ Customer & supplier management
- ✅ Expense tracking
- ✅ Reports & analytics
- ✅ Dashboard with charts
- ✅ Sector-specific modules for all 15 business types

## Development

### Running Locally
Both workflows are configured and will start automatically:
- Frontend: Accessible through the Replit webview
- Backend: API accessible at http://localhost:8000

### API Endpoints
- `POST /api/auth/register` - Register new tenant
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- All business-specific endpoints under `/api/`

### Database
The application uses MongoDB Atlas. The connection is configured to use:
- TLS/SSL with certifi for secure connections
- Handles both `MONGO_URL` and `Mongo_URL` environment variables
- Database name from environment or defaults to `erp_db`

## Demo Accounts

To seed the database with demo data for testing, you can:
1. Use the registration API to create new tenant accounts
2. Use the seed scripts in the `backend/` directory (requires MongoDB connection)
3. Create accounts manually through the Sign Up interface

Example tenant creation:
```json
{
  "name": "My Business",
  "email": "mybusiness@example.com",
  "business_type": "pharmacy",
  "admin_password": "yourpassword"
}
```

## Important Notes

### Replit-Specific Configuration
- Frontend is configured to accept all hosts (required for Replit iframe proxy)
- Dev server bound to 0.0.0.0:5000
- Backend runs on localhost:8000 to avoid conflicts
- SSL/TLS configured with certifi for MongoDB Atlas connections

### Known Issues
- Standalone seed scripts may have SSL/TLS connection issues due to async event loop
- Database seeding is best done through the API endpoints while backend is running
- Some peer dependency warnings in frontend (cosmetic, doesn't affect functionality)

## Architecture

### Frontend Structure
```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   │   └── ui/        # Shadcn UI components
│   ├── pages/         # Page components for each sector
│   ├── config/        # Sector-specific configurations
│   └── utils/         # Utility functions
```

### Backend Structure
```
backend/
├── server.py          # Main FastAPI application
├── seed_*.py         # Database seeding scripts
└── requirements.txt  # Python dependencies
```

## Deployment

The application is configured to run in Replit's environment with:
- Frontend on port 5000 (webview)
- Backend on port 8000 (console)
- MongoDB Atlas for database (cloud-hosted)

For production deployment, see DEPLOYMENT_GUIDE.md for detailed instructions.

## Recent Changes (Setup in Replit)

1. **MongoDB Connection**: Updated to use certifi for SSL/TLS certificates
2. **Environment Variables**: Configured to handle both `MONGO_URL` and `Mongo_URL`
3. **Frontend Dev Server**: Configured to allow all hosts for Replit proxy
4. **Dependencies**: Installed all required packages including react-is
5. **Workflows**: Set up automated workflows for both frontend and backend

## User Preferences

_This section can be used to track user-specific preferences and coding styles as the project evolves._

## Next Steps

1. ✅ Application is running and accessible
2. 🔄 Seed database with demo data through API or seed scripts
3. 🔄 Test all sector-specific features
4. 🔄 Configure production deployment settings

---

Last Updated: November 3, 2025
Project Status: ✅ Running Successfully
