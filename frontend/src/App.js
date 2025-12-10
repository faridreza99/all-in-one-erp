import React, { useState, useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
  Outlet,
} from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import "@/App.css";

// Critical components loaded immediately
import AuthPage from "./pages/AuthPage";
import SectorLayout from "./components/SectorLayout";
import { Toaster } from "./components/ui/sonner";
import { isSectorAllowed } from "./config/sectorModules";
import { SidebarProvider } from "./contexts/SidebarContext";

// Lazy-loaded pages for code splitting and reduced initial bundle size
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const SectorDashboard = lazy(() => import("./pages/SectorDashboard"));
const POSPage = lazy(() => import("./pages/POSPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const AppointmentsPage = lazy(() => import("./pages/AppointmentsPage"));
const RepairsPage = lazy(() => import("./pages/RepairsPage"));
const TablesPage = lazy(() => import("./pages/TablesPage"));
const SalesPage = lazy(() => import("./pages/SalesPage"));
const InvoicePage = lazy(() => import("./pages/InvoicePage"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const CustomerDuesPage = lazy(() => import("./pages/CustomerDuesPage"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const ClinicPage = lazy(() => import("./pages/ClinicPage"));
const WarrantiesPage = lazy(() => import("./pages/WarrantiesPage"));
const ReturnsPage = lazy(() => import("./pages/ReturnsPage"));
const BooksPage = lazy(() => import("./pages/BooksPage"));
const CustomOrdersPage = lazy(() => import("./pages/CustomOrdersPage"));
const OnlineOrdersPage = lazy(() => import("./pages/OnlineOrdersPage"));
const PropertiesPage = lazy(() => import("./pages/PropertiesPage"));
const PurchaseOrdersPage = lazy(() => import("./pages/PurchaseOrdersPage"));
const GoodsReceiptsPage = lazy(() => import("./pages/GoodsReceiptsPage"));
const OffersPage = lazy(() => import("./pages/OffersPage"));
const VehiclesPage = lazy(() => import("./pages/VehiclesPage"));
const DoctorsPage = lazy(() => import("./pages/DoctorsPage"));
const PatientsPage = lazy(() => import("./pages/PatientsPage"));
const ProductVariantsPage = lazy(() => import("./pages/ProductVariantsPage"));
const BranchesPage = lazy(() => import("./pages/BranchesPage"));
const ProductBranchAssignmentPage = lazy(() => import("./pages/ProductBranchAssignmentPage"));
const StockTransferPage = lazy(() => import("./pages/StockTransferPage"));
const ComponentsPage = lazy(() => import("./pages/ComponentsPage"));
const JobCardsPage = lazy(() => import("./pages/JobCardsPage"));
const DeviceHistoryPage = lazy(() => import("./pages/DeviceHistoryPage"));
const SuppliersPage = lazy(() => import("./pages/SuppliersPage"));
const PurchasesPage = lazy(() => import("./pages/PurchasesPage"));
const LowStockPage = lazy(() => import("./pages/LowStockPage"));
const CNFDashboard = lazy(() => import("./pages/cnf/CNFDashboard"));
const ShipmentsPage = lazy(() => import("./pages/cnf/ShipmentsPage"));
const JobFilesPage = lazy(() => import("./pages/cnf/JobFilesPage"));
const BillingPage = lazy(() => import("./pages/cnf/BillingPage"));
const DocumentsPage = lazy(() => import("./pages/cnf/DocumentsPage"));
const TransportPage = lazy(() => import("./pages/cnf/TransportPage"));
const CNFReportsPage = lazy(() => import("./pages/cnf/CNFReportsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage"));
const WarrantyResolve = lazy(() => import("./pages/WarrantyResolve"));
const WarrantyClaim = lazy(() => import("./pages/WarrantyClaim"));
const WarrantyClaimSuccess = lazy(() => import("./pages/WarrantyClaimSuccess"));
const WarrantyDetails = lazy(() => import("./pages/WarrantyDetails"));

// Loading spinner component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400"></div>
  </div>
);

// Protected Sector Route - handles auth check and module access (moved outside App for stable identity)
// Note: This component only renders after authChecked is true, so user state is already resolved
const ProtectedSectorRouteWrapper = ({ user, module, children, element }) => {
  // Redirect to auth if not logged in
  if (!user) return <Navigate to="/auth" replace />;
  if (!user.business_type) return <Navigate to="/auth" replace />;
  
  // Check if business type allows this module
  const isBusinessTypeAllowed = isSectorAllowed(user.business_type, module);
  if (!isBusinessTypeAllowed) {
    return <Navigate to={`/${user.business_type}`} replace />;
  }

  // Check if user's role allows this route
  const userRole = user.role;
  const allowedRoutes = user.allowed_routes || [];

  // Render the content (support both children and element prop patterns)
  const content = children || element;

  // Super admin and tenant admin can access everything
  if (userRole === "super_admin" || userRole === "tenant_admin") {
    return content;
  }

  // Dashboard is always allowed
  if (module === "dashboard") {
    return content;
  }

  // Check if module is in user's allowed_routes
  if (!allowedRoutes.includes(module)) {
    return <Navigate to={`/${user.business_type}`} replace />;
  }

  return content;
};


// Auto-detect backend URL based on environment
const getBackendUrl = () => {
  // Priority 1: Use explicit API URL environment variable if set
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Priority 2: If running on Render production (onrender.com)
  if (window.location.hostname.includes("onrender.com")) {
    // Use the backend URL from environment or construct from hostname
    // Replace 'frontend' with 'backend' in the hostname for the API
    const hostname = window.location.hostname;
    if (hostname.includes("-frontend")) {
      return `https://${hostname.replace("-frontend", "-backend")}`;
    }
    // If no 'frontend' in name, try using the REACT_APP_BACKEND_URL
    return process.env.REACT_APP_BACKEND_URL || window.location.origin;
  }
  
  // Priority 3: If running in Replit webview (hostname contains replit.dev)
  if (window.location.hostname.includes("replit.dev")) {
    const hostname = window.location.hostname;
    const backendPort = process.env.REACT_APP_BACKEND_PORT || "";
    const backendHost = process.env.REACT_APP_BACKEND_HOST || hostname;
    
    if (backendPort) {
      return `${window.location.protocol}//${backendHost}:${backendPort}`;
    }
    return window.location.origin;
  }
  
  // Priority 4: For local development
  return process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
};

const BACKEND_URL = getBackendUrl();
export const API = `${BACKEND_URL}/api`;

// Sector Guard component - validates URL sector matches user's business_type
const SectorGuard = ({ user, loading, children }) => {
  const location = window.location.pathname;
  const sectorFromUrl = location.split('/')[1]; // Get sector from URL like /computer_shop/products
  
  // While loading, show nothing (the main loading spinner handles this)
  if (loading) {
    return null;
  }
  
  // If not logged in, redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  // If user doesn't have business_type, redirect to auth
  if (!user.business_type) {
    return <Navigate to="/auth" replace />;
  }
  
  // If sector in URL doesn't match user's business_type, redirect to correct sector
  if (sectorFromUrl && sectorFromUrl !== user.business_type && 
      sectorFromUrl !== 'auth' && sectorFromUrl !== 'w' && sectorFromUrl !== 'warranty' &&
      sectorFromUrl !== 'notifications' && sectorFromUrl !== 'settings' && sectorFromUrl !== 'users') {
    return <Navigate to={`/${user.business_type}`} replace />;
  }
  
  return children;
};

// Protected route wrapper with route permission enforcement
const SectorRoute = ({ user, element, module }) => {
  const businessType = user?.business_type;

  if (!businessType) return element;

  // Check if business type allows this module
  const isBusinessTypeAllowed = isSectorAllowed(businessType, module);

  if (!isBusinessTypeAllowed) {
    return <Navigate to={`/${businessType}`} replace />;
  }

  // Check if user's role allows this route
  const userRole = user?.role;
  const allowedRoutes = user?.allowed_routes || [];

  // Super admin and tenant admin can access everything
  if (userRole === "super_admin" || userRole === "tenant_admin") {
    return element;
  }

  // Dashboard is always allowed
  if (module === "dashboard") {
    return element;
  }

  // Check if module is in user's allowed_routes
  if (!allowedRoutes.includes(module)) {
    return <Navigate to={`/${businessType}`} replace />;
  }

  return element;
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    console.log("[Auth] Checking auth, token exists:", !!token);
    if (token) {
      try {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        const response = await axios.get(`${API}/auth/me`);
        console.log("[Auth] Got user data:", response.data);
        console.log("[Auth] User business_type:", response.data?.business_type);
        setUser(response.data);
      } catch (error) {
        console.error("[Auth] Auth check failed:", error);
        localStorage.removeItem("token");
        delete axios.defaults.headers.common["Authorization"];
        setUser(null);
      }
    } else {
      console.log("[Auth] No token found in localStorage");
    }
    setLoading(false);
    setAuthChecked(true);
    console.log("[Auth] Auth check complete, authChecked=true");
  };

  const handleLogin = (userData, token) => {
    localStorage.setItem("token", token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    // Decode JWT to extract branch_id, role, tenant_id
    try {
      const decoded = jwtDecode(token);

      // Merge JWT data with user data to ensure branch context is available
      const enrichedUser = {
        ...userData,
        tenant_id: decoded.tenant_id || userData.tenant_id,
        branch_id: decoded.branch_id || userData.branch_id,
        role: decoded.role || userData.role,
      };

      // Store branch context in localStorage for easy access
      if (decoded.branch_id) {
        localStorage.setItem("branch_id", decoded.branch_id);
      }
      localStorage.setItem("user_role", decoded.role);

      setUser(enrichedUser);
    } catch (error) {
      console.error("Failed to decode JWT:", error);
      // Fallback to userData if decode fails
      setUser(userData);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("branch_id");
    localStorage.removeItem("user_role");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
  };


  // Don't render any routes until auth check completes - this prevents premature redirects
  if (!authChecked) {
    return <LoadingSpinner />;
  }

  return (
    <SidebarProvider>
      <div className="App">
        <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Auth Route */}
          <Route
            path="/auth"
            element={
              !user ? (
                <AuthPage onLogin={handleLogin} />
              ) : user.role === "super_admin" ? (
                <Navigate to="/" replace />
              ) : user.business_type ? (
                <Navigate to={`/${user.business_type}`} replace />
              ) : (
                <AuthPage onLogin={handleLogin} />
              )
            }
          />

          {/* Public Warranty QR Resolution Route */}
          <Route
            path="/w/:token"
            element={<WarrantyResolve />}
          />

          {/* Public Warranty Claim Registration Route */}
          <Route
            path="/warranty/:warranty_id/claim"
            element={<WarrantyClaim />}
          />

          {/* Public Warranty Claim Success Route */}
          <Route
            path="/warranty/claim-success"
            element={<WarrantyClaimSuccess />}
          />

          {/* Super Admin Route */}
          <Route
            path="/"
            element={
              !user ? (
                <Navigate to="/auth" replace />
              ) : user.role === "super_admin" ? (
                <SuperAdminDashboard user={user} onLogout={handleLogout} />
              ) : user.business_type ? (
                <Navigate to={`/${user.business_type}`} replace />
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />

          {/* Static Sector Routes - Always registered, handle auth inside */}
          <Route
            path="/:sector"
            element={
              !user ? (
                <Navigate to="/auth" replace />
              ) : !user.business_type ? (
                <Navigate to="/auth" replace />
              ) : user.business_type === "cnf" ? (
                <CNFDashboard user={user} onLogout={handleLogout} />
              ) : (
                <SectorDashboard user={user} onLogout={handleLogout} />
              )
            }
          />

          <Route
            path="/:sector/products"
            element={
              <ProtectedSectorRouteWrapper user={user} module="products">
                <ProductsPage user={user} onLogout={handleLogout} />
              </ProtectedSectorRouteWrapper>
            }
          />
          <Route
            path="/:sector/pos"
            element={
              <ProtectedSectorRouteWrapper user={user} module="pos">
                <POSPage user={user} onLogout={handleLogout} />
              </ProtectedSectorRouteWrapper>
            }
          />
          <Route
            path="/:sector/services"
            element={
              <ProtectedSectorRouteWrapper user={user} module="services">
                <ServicesPage user={user} onLogout={handleLogout} />
              </ProtectedSectorRouteWrapper>
            }
          />
          <Route
            path="/:sector/appointments"
            element={
              <ProtectedSectorRouteWrapper user={user} module="appointments">
                <AppointmentsPage user={user} onLogout={handleLogout} />
              </ProtectedSectorRouteWrapper>
            }
          />
          <Route
            path="/:sector/repairs"
            element={
              <ProtectedSectorRouteWrapper user={user} module="repairs">
                <RepairsPage user={user} onLogout={handleLogout} />
              </ProtectedSectorRouteWrapper>
            }
          />
          <Route
            path="/:sector/tables"
            element={
              <ProtectedSectorRouteWrapper user={user} module="tables">
                <TablesPage user={user} onLogout={handleLogout} />
              </ProtectedSectorRouteWrapper>
            }
          />
          <Route
            path="/:sector/customers"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="customers"
                element={<CustomersPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/customer-dues"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="customer-dues"
                element={<CustomerDuesPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/suppliers"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="suppliers"
                element={<SuppliersPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/purchases"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="purchases"
                element={<PurchasesPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/low-stock"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="low-stock"
                element={<LowStockPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/expenses"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="expenses"
                element={<ExpensesPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/doctors"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="doctors"
                element={<DoctorsPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/patients"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="patients"
                element={<PatientsPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/vehicles"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="vehicles"
                element={<VehiclesPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/properties"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="properties"
                element={<PropertiesPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/offers"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="offers"
                element={<OffersPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/variants"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="variants"
                element={<ProductVariantsPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/branches"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="branches"
                element={<BranchesPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/product-assignment"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="product-assignment"
                element={<ProductBranchAssignmentPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/stock-transfer"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="stock-transfer"
                element={<StockTransferPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/components"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="components"
                element={<ComponentsPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/job-cards"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="job-cards"
                element={<JobCardsPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/device-history"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="device-history"
                element={<DeviceHistoryPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/warranties"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="warranties"
                element={<WarrantiesPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/warranty/:warranty_id/details"
            element={
              loading ? (
                <LoadingSpinner />
              ) : !user ? (
                <Navigate to="/auth" replace />
              ) : (
                <SectorLayout user={user} onLogout={handleLogout}>
                  <WarrantyDetails />
                </SectorLayout>
              )
            }
          />
          <Route
            path="/:sector/returns"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="returns"
                element={<ReturnsPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/books"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="books"
                element={<BooksPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/custom-orders"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="custom-orders"
                element={<CustomOrdersPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/purchase-orders"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="purchase-orders"
                element={<PurchaseOrdersPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/goods-receipts"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="goods-receipts"
                element={<GoodsReceiptsPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/online-orders"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="online-orders"
                element={<OnlineOrdersPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/sales"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="sales"
                element={<SalesPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/invoice/:saleId"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="sales"
                element={<InvoicePage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/reports"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="reports"
                element={<ReportsPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/notifications"
            element={
              loading ? (
                <LoadingSpinner />
              ) : !user ? (
                <Navigate to="/auth" replace />
              ) : (
                <NotificationsPage user={user} onLogout={handleLogout} />
              )
            }
          />
          <Route
            path="/:sector/settings"
            element={
              loading ? (
                <LoadingSpinner />
              ) : !user ? (
                <Navigate to="/auth" replace />
              ) : (
                <SettingsPage user={user} onLogout={handleLogout} />
              )
            }
          />
          <Route
            path="/:sector/user-management"
            element={
              loading ? (
                <LoadingSpinner />
              ) : !user ? (
                <Navigate to="/auth" replace />
              ) : (
                <UserManagementPage user={user} onLogout={handleLogout} />
              )
            }
          />

          {/* CNF Routes */}
          <Route
            path="/:sector/shipments"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="shipments"
                element={<ShipmentsPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/jobs"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="jobs"
                element={<JobFilesPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/billing"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="billing"
                element={<BillingPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/documents"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="documents"
                element={<DocumentsPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/transport"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="transport"
                element={<TransportPage user={user} onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/:sector/cnf-reports"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading}
                module="cnf-reports"
                element={<CNFReportsPage user={user} onLogout={handleLogout} />}
              />
            }
          />

          {/* Catch-all route for unmatched paths */}
          <Route
            path="*"
            element={
              loading ? (
                <LoadingSpinner />
              ) : !user ? (
                <Navigate to="/auth" replace />
              ) : user.role === "super_admin" ? (
                <Navigate to="/" replace />
              ) : user.business_type ? (
                <Navigate to={`/${user.business_type}`} replace />
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
        </Routes>
        </Suspense>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </div>
    </SidebarProvider>
  );
};

export default App;
