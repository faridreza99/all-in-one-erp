import React, { useState, useEffect } from "react";
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

import AuthPage from "./pages/AuthPage";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SectorDashboard from "./pages/SectorDashboard";
import POSPage from "./pages/POSPage";
import ProductsPage from "./pages/ProductsPage";
import ServicesPage from "./pages/ServicesPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import RepairsPage from "./pages/RepairsPage";
import TablesPage from "./pages/TablesPage";
import SalesPage from "./pages/SalesPage";
import InvoicePage from "./pages/InvoicePage";
import CustomersPage from "./pages/CustomersPage";
import CustomerDuesPage from "./pages/CustomerDuesPage";
import ExpensesPage from "./pages/ExpensesPage";
import ReportsPage from "./pages/ReportsPage";
import NotificationsPage from "./pages/NotificationsPage";
import ClinicPage from "./pages/ClinicPage";
import WarrantiesPage from "./pages/WarrantiesPage";
import ReturnsPage from "./pages/ReturnsPage";
import BooksPage from "./pages/BooksPage";
import CustomOrdersPage from "./pages/CustomOrdersPage";
import OnlineOrdersPage from "./pages/OnlineOrdersPage";
import PropertiesPage from "./pages/PropertiesPage";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage";
import GoodsReceiptsPage from "./pages/GoodsReceiptsPage";
import OffersPage from "./pages/OffersPage";
import VehiclesPage from "./pages/VehiclesPage";
import DoctorsPage from "./pages/DoctorsPage";
import PatientsPage from "./pages/PatientsPage";
import ProductVariantsPage from "./pages/ProductVariantsPage";
import BranchesPage from "./pages/BranchesPage";
import ProductBranchAssignmentPage from "./pages/ProductBranchAssignmentPage";
import StockTransferPage from "./pages/StockTransferPage";
import ComponentsPage from "./pages/ComponentsPage";
import JobCardsPage from "./pages/JobCardsPage";
import DeviceHistoryPage from "./pages/DeviceHistoryPage";
import SuppliersPage from "./pages/SuppliersPage";
import PurchasesPage from "./pages/PurchasesPage";
import LowStockPage from "./pages/LowStockPage";
import CNFDashboard from "./pages/cnf/CNFDashboard";
import ShipmentsPage from "./pages/cnf/ShipmentsPage";
import JobFilesPage from "./pages/cnf/JobFilesPage";
import BillingPage from "./pages/cnf/BillingPage";
import DocumentsPage from "./pages/cnf/DocumentsPage";
import TransportPage from "./pages/cnf/TransportPage";
import CNFReportsPage from "./pages/cnf/CNFReportsPage";
import SettingsPage from "./pages/SettingsPage";
import UserManagementPage from "./pages/UserManagementPage";
import WarrantyResolve from "./pages/WarrantyResolve";
import WarrantyClaim from "./pages/WarrantyClaim";
import WarrantyClaimSuccess from "./pages/WarrantyClaimSuccess";
import WarrantyDetails from "./pages/WarrantyDetails";
import SectorLayout from "./components/SectorLayout";
import { Toaster } from "./components/ui/sonner";
import { isSectorAllowed } from "./config/sectorModules";
import { SidebarProvider } from "./contexts/SidebarContext";

// Loading spinner component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400"></div>
  </div>
);

// Protected Sector Route - handles auth check and module access (moved outside App for stable identity)
const ProtectedSectorRouteWrapper = ({ user, loading, module, children, element }) => {
  // Show loading spinner while checking auth
  if (loading) return <LoadingSpinner />;
  
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
  // If running in Replit webview (hostname contains replit.dev)
  if (window.location.hostname.includes("replit.dev")) {
    // In Replit, use the public hostname for API calls
    // The backend must be on port 5000 or use a separate deployment URL
    const hostname = window.location.hostname;
    // Use the hostname with the backend port from environment or default to same origin
    const backendPort = process.env.REACT_APP_BACKEND_PORT || "";
    const backendHost = process.env.REACT_APP_BACKEND_HOST || hostname;
    
    if (backendPort) {
      return `${window.location.protocol}//${backendHost}:${backendPort}`;
    }
    // For production, backend and frontend are on same domain
    return window.location.origin;
  }
  // For local development
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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        const response = await axios.get(`${API}/auth/me`);
        setUser(response.data);
      } catch (error) {
        localStorage.removeItem("token");
        delete axios.defaults.headers.common["Authorization"];
      }
    }
    setLoading(false);
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


  return (
    <SidebarProvider>
      <div className="App">
        <BrowserRouter>
        <Routes>
          {/* Auth Route */}
          <Route
            path="/auth"
            element={
              loading ? (
                <LoadingSpinner />
              ) : !user ? (
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
              loading ? (
                <LoadingSpinner />
              ) : !user ? (
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
              loading ? (
                <LoadingSpinner />
              ) : !user ? (
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
              <ProtectedSectorRouteWrapper user={user} loading={loading} module="products">
                <ProductsPage user={user} onLogout={handleLogout} />
              </ProtectedSectorRouteWrapper>
            }
          />
          <Route
            path="/:sector/pos"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading} module="pos">
                <POSPage user={user} onLogout={handleLogout} />
              </ProtectedSectorRouteWrapper>
            }
          />
          <Route
            path="/:sector/services"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading} module="services">
                <ServicesPage user={user} onLogout={handleLogout} />
              </ProtectedSectorRouteWrapper>
            }
          />
          <Route
            path="/:sector/appointments"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading} module="appointments">
                <AppointmentsPage user={user} onLogout={handleLogout} />
              </ProtectedSectorRouteWrapper>
            }
          />
          <Route
            path="/:sector/repairs"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading} module="repairs">
                <RepairsPage user={user} onLogout={handleLogout} />
              </ProtectedSectorRouteWrapper>
            }
          />
          <Route
            path="/:sector/tables"
            element={
              <ProtectedSectorRouteWrapper user={user} loading={loading} module="tables">
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
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </div>
    </SidebarProvider>
  );
};

export default App;
