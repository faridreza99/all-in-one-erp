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

**Required Secrets (Must be added in Replit Secrets panel):**
- `Mongo_URL` or `MONGO_URL`: MongoDB Atlas connection string
  - ⚠️ **CRITICAL**: This must be set before running the application
  - The backend will fail to start without this secret
  - Get your connection string from MongoDB Atlas: https://www.mongodb.com/cloud/atlas

**Optional Environment Variables (.env files):**
- `DB_NAME`: Database name (default: erp_db)
- `JWT_SECRET`: Secret key for JWT tokens (change in production!)
- `REACT_APP_BACKEND_URL`: Backend API URL (http://localhost:8000 for development)
  - For production deployment, set this as a Replit Secret to your deployed backend URL

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
- ✅ Back button on all module pages for easy navigation

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
- Secure TLS/SSL connections to MongoDB Atlas
- Handles both `MONGO_URL` and `Mongo_URL` environment variables
- Database name from environment or defaults to `erp_db`

**IMPORTANT - MongoDB Atlas Network Access:**
- You must whitelist Replit's IP address in MongoDB Atlas for the connection to work
- Go to: MongoDB Atlas → Security → **Network Access** → Add IP Address
- Add Replit server IP or `0.0.0.0/0` (allow from anywhere) for testing
- Without IP whitelisting, you'll get "TLSV1_ALERT_INTERNAL_ERROR" errors

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
│   │   ├── BackButton.js   # Reusable navigation back button
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
6. **Navigation Enhancement** (Nov 4, 2025): Added Back button to all module pages
   - Created reusable BackButton component with dark theme styling
   - Integrated into 30+ module pages (Branches, Products, Repairs, Job Cards, etc.)
   - Uses React Router navigation for seamless page transitions
7. **Branch Management Form Redesign** (Nov 4, 2025): Complete UI/UX overhaul
   - Modern 2-column responsive grid layout for efficient data entry
   - Dark gradient background with glass-morphism effects
   - Enhanced input fields with icons (Building2, Phone, MapPin, User) and focus effects
   - Auto-generated unique branch codes (BR-XXXXXX format) with full persistence
   - Beautiful animated toggle switch for Active/Inactive status (replacing checkbox)
   - Gradient submit button with hover animations and scale effects
   - Modernized branch cards with icons, gradients, and improved badges
   - Professional empty state with icon and call-to-action
   - Branch codes properly saved to database and displayed on cards with Hash icon
8. **Product Creation Integer Validation Fix** (Nov 4, 2025): Fixed backend validation error
   - Resolved "Input should be a valid integer" error when creating products
   - Modified ProductsPage to properly convert numeric fields before API submission
   - Price field now uses parseFloat to support decimal values (e.g., 99.99)
   - Stock field uses parseInt for whole numbers
   - Warranty_months field properly handles 0 values and empty inputs
   - Backend validation now accepts properly formatted numeric data
9. **Multi-Branch Inventory Management** (Nov 4, 2025): Added branch selection to product forms
   - Branch dropdown added below form title (required field with red asterisk)
   - Loads all active branches from the database
   - Displays branch name and code in dropdown options
   - Pre-selects branch when editing existing products
   - Added branch filter dropdown to product list for easy filtering
   - Products can now be filtered by branch alongside search functionality
   - Type conversion fix ensures proper filtering (string to integer conversion)
10. **Product-Branch Assignment Page Redesign** (Nov 4, 2025): Complete UI/UX overhaul with table layout
   - Modern dark theme with gradient backgrounds and glass-morphism effects
   - Clear table layout showing Active, Branch, Stock, Purchase Price, Sale Price, and Reorder Level columns
   - Editable input fields for stock and pricing per branch with color-coded focus states
   - Icons for each data type (Building2, Package, DollarSign) for better visual clarity
   - "Apply same details to all branches" checkbox feature with live sync across all branches
   - Input fields disabled when branch is not active (better UX)
   - Success and error toast notifications replacing alerts
   - Row highlighting for active branches
   - Responsive design with proper spacing and alignment
   - Professional gradient action buttons with hover animations
11. **Stock Transfer Page Complete Redesign** (Nov 4, 2025): Full functionality with modern UI
   - Modern dark theme with gradient backgrounds and glass-morphism effects
   - Dropdowns for Product, From Branch (red), and To Branch (green) with icons
   - Quantity field and Reference Note textarea with color-coded focus states
   - Real-time stock availability display with alerts
   - Comprehensive stock validation before transfer (quantity, branch mismatch, insufficient stock)
   - Confirmation modal with transfer summary before finalizing
   - Success and error toast notifications replacing alerts
   - Transfer history table with search and branch filtering
   - Color-coded branch badges (red for source, green for destination)
   - Export transfer history to CSV functionality
   - Auto-generated transfer numbers (backend handles TRF-XXXX format)
   - Professional section titles and improved layout alignment
   - Backend automatically handles stock deduction from source and addition to destination

## User Preferences

_This section can be used to track user-specific preferences and coding styles as the project evolves._

## Next Steps

1. ✅ Application is running and accessible
2. ✅ MongoDB connection configured securely via Replit Secrets
3. 🔄 Seed database with demo data (create tenant accounts via Sign Up or API)
4. 🔄 Test end-to-end login and API functionality
5. 🔄 For production: Add `REACT_APP_BACKEND_URL` secret with deployed backend domain
6. 🔄 Test all sector-specific features for each business type

## Troubleshooting

### Application won't start
- **Check**: Is `Mongo_URL` added to Replit Secrets?
- **Check**: Are both Backend and Frontend workflows running?
- **Solution**: Add MongoDB connection string to Secrets, restart workflows

### Frontend can't connect to backend
- **Development**: Ensure backend is running on localhost:8000
- **Production**: Set `REACT_APP_BACKEND_URL` secret to deployed backend URL
- **Check**: Look for CORS errors in browser console

### MongoDB connection failed with "TLSV1_ALERT_INTERNAL_ERROR"
- **Root Cause**: MongoDB Atlas is blocking the connection due to IP whitelist
- **Solution**: Add Replit's IP to MongoDB Atlas Network Access:
  1. Go to MongoDB Atlas → Security → Network Access
  2. Click "Add IP Address"
  3. Add `0.0.0.0/0` (allow all) or specific Replit IP
  4. Wait ~1 minute for changes to propagate
- **Note**: This is NOT a TLS/SSL certificate issue - it's IP-based access control
- **Check**: Verify the connection string is correct
- **Check**: Ensure MongoDB Atlas credentials are valid

---

Last Updated: November 4, 2025
Project Status: ✅ Running Successfully - MongoDB Atlas Connected
