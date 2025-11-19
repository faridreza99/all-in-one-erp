import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
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

  // Check subscription status for tenant admins
  useEffect(() => {
    if (!user) return;
    
    // Only check for tenant admins
    if (user.role !== "tenant_admin") return;
    
    const subscriptionStatus = user.subscription_status;
    
    // Allowed statuses: active, trial, grace (or null/undefined for legacy users)
    const allowedStatuses = ["active", "trial", "grace"];
    
    // If subscription status exists and is not in allowed statuses, show alert
    if (subscriptionStatus && !allowedStatuses.includes(subscriptionStatus)) {
      const statusMessages = {
        suspended: "Your subscription has been suspended due to non-payment.",
        expired: "Your subscription has expired.",
        cancelled: "Your subscription has been cancelled.",
      };
      
      const message = statusMessages[subscriptionStatus] || "Your subscription is not active.";
      const expiryDate = user.subscription_expires_at 
        ? new Date(user.subscription_expires_at).toLocaleDateString()
        : "N/A";
      
      Swal.fire({
        title: "⚠️ Subscription Required",
        html: `
          <div class="text-left space-y-3">
            <p class="text-gray-700"><strong>Status:</strong> <span class="text-red-600 font-semibold">${subscriptionStatus.toUpperCase()}</span></p>
            <p class="text-gray-700">${message}</p>
            <p class="text-gray-700"><strong>Expiry Date:</strong> ${expiryDate}</p>
            <hr class="my-4" />
            <p class="text-gray-600">Please contact support to renew your subscription and restore access to your account.</p>
            <p class="text-gray-600 font-semibold">Support: support@smartbusiness.com</p>
          </div>
        `,
        icon: "warning",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: true,
        confirmButtonText: "I Understand",
        confirmButtonColor: "#dc2626",
        customClass: {
          popup: "subscription-alert",
          confirmButton: "px-6 py-2 rounded-lg font-semibold"
        },
        didOpen: () => {
          // Remove the close button if it exists
          const closeButton = document.querySelector('.swal2-close');
          if (closeButton) {
            closeButton.style.display = 'none';
          }
        }
      });
    }
  }, [user]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="App">
        <BrowserRouter>
        <Routes>
          <Route
            path="/auth"
            element={
              !user ? (
                <AuthPage onLogin={handleLogin} />
              ) : user.role === "super_admin" ? (
                <Navigate to="/" />
              ) : (
                <Navigate to={`/${user.business_type}`} />
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

          {user ? (
            <>
              {/* Super Admin Route */}
              {user.role === "super_admin" && (
                <Route
                  path="/"
                  element={
                    <SuperAdminDashboard user={user} onLogout={handleLogout} />
                  }
                />
              )}

              {/* Sector-Specific Routes */}
              {user.business_type && (
                <>
                  {/* Dashboard - CNF gets special dashboard */}
                  <Route
                    path={`/${user.business_type}`}
                    element={
                      user.business_type === "cnf" ? (
                        <CNFDashboard user={user} onLogout={handleLogout} />
                      ) : (
                        <SectorDashboard user={user} onLogout={handleLogout} />
                      )
                    }
                  />

                  {/* Module Routes with access control */}
                  <Route
                    path={`/${user.business_type}/products`}
                    element={
                      <SectorRoute
                        user={user}
                        module="products"
                        element={
                          <ProductsPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/pos`}
                    element={
                      <SectorRoute
                        user={user}
                        module="pos"
                        element={
                          <POSPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/services`}
                    element={
                      <SectorRoute
                        user={user}
                        module="services"
                        element={
                          <ServicesPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/appointments`}
                    element={
                      <SectorRoute
                        user={user}
                        module="appointments"
                        element={
                          <AppointmentsPage
                            user={user}
                            onLogout={handleLogout}
                          />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/repairs`}
                    element={
                      <SectorRoute
                        user={user}
                        module="repairs"
                        element={
                          <RepairsPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/tables`}
                    element={
                      <SectorRoute
                        user={user}
                        module="tables"
                        element={
                          <TablesPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/customers`}
                    element={
                      <SectorRoute
                        user={user}
                        module="customers"
                        element={
                          <CustomersPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/customer-dues`}
                    element={
                      <SectorRoute
                        user={user}
                        module="customer-dues"
                        element={
                          <CustomerDuesPage
                            user={user}
                            onLogout={handleLogout}
                          />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/suppliers`}
                    element={
                      <SectorRoute
                        user={user}
                        module="suppliers"
                        element={
                          <SuppliersPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/purchases`}
                    element={
                      <SectorRoute
                        user={user}
                        module="purchases"
                        element={
                          <PurchasesPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/low-stock`}
                    element={
                      <SectorRoute
                        user={user}
                        module="low-stock"
                        element={
                          <LowStockPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/expenses`}
                    element={
                      <SectorRoute
                        user={user}
                        module="expenses"
                        element={
                          <ExpensesPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/doctors`}
                    element={
                      <SectorRoute
                        user={user}
                        module="doctors"
                        element={
                          <DoctorsPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/patients`}
                    element={
                      <SectorRoute
                        user={user}
                        module="patients"
                        element={
                          <PatientsPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/vehicles`}
                    element={
                      <SectorRoute
                        user={user}
                        module="vehicles"
                        element={
                          <VehiclesPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/properties`}
                    element={
                      <SectorRoute
                        user={user}
                        module="properties"
                        element={
                          <PropertiesPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/offers`}
                    element={
                      <SectorRoute
                        user={user}
                        module="offers"
                        element={
                          <OffersPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/variants`}
                    element={
                      <SectorRoute
                        user={user}
                        module="variants"
                        element={
                          <ProductVariantsPage
                            user={user}
                            onLogout={handleLogout}
                          />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/branches`}
                    element={
                      <SectorRoute
                        user={user}
                        module="branches"
                        element={
                          <BranchesPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/product-assignment`}
                    element={
                      <SectorRoute
                        user={user}
                        module="product-assignment"
                        element={
                          <ProductBranchAssignmentPage
                            user={user}
                            onLogout={handleLogout}
                          />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/stock-transfer`}
                    element={
                      <SectorRoute
                        user={user}
                        module="stock-transfer"
                        element={
                          <StockTransferPage
                            user={user}
                            onLogout={handleLogout}
                          />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/components`}
                    element={
                      <SectorRoute
                        user={user}
                        module="components"
                        element={
                          <ComponentsPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/job-cards`}
                    element={
                      <SectorRoute
                        user={user}
                        module="job-cards"
                        element={
                          <JobCardsPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/device-history`}
                    element={
                      <SectorRoute
                        user={user}
                        module="device-history"
                        element={
                          <DeviceHistoryPage
                            user={user}
                            onLogout={handleLogout}
                          />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/warranties`}
                    element={
                      <SectorRoute
                        user={user}
                        module="warranties"
                        element={
                          <WarrantiesPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path="/warranty/:warranty_id/details"
                    element={
                      <SectorLayout user={user} onLogout={handleLogout}>
                        <WarrantyDetails />
                      </SectorLayout>
                    }
                  />
                  <Route
                    path={`/${user.business_type}/returns`}
                    element={
                      <SectorRoute
                        user={user}
                        module="returns"
                        element={
                          <ReturnsPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/books`}
                    element={
                      <SectorRoute
                        user={user}
                        module="books"
                        element={
                          <BooksPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/custom-orders`}
                    element={
                      <SectorRoute
                        user={user}
                        module="custom-orders"
                        element={
                          <CustomOrdersPage
                            user={user}
                            onLogout={handleLogout}
                          />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/purchase-orders`}
                    element={
                      <SectorRoute
                        user={user}
                        module="purchase-orders"
                        element={
                          <PurchaseOrdersPage
                            user={user}
                            onLogout={handleLogout}
                          />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/goods-receipts`}
                    element={
                      <SectorRoute
                        user={user}
                        module="goods-receipts"
                        element={
                          <GoodsReceiptsPage
                            user={user}
                            onLogout={handleLogout}
                          />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/online-orders`}
                    element={
                      <SectorRoute
                        user={user}
                        module="online-orders"
                        element={
                          <OnlineOrdersPage
                            user={user}
                            onLogout={handleLogout}
                          />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/sales`}
                    element={
                      <SectorRoute
                        user={user}
                        module="sales"
                        element={
                          <SalesPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/invoice/:saleId`}
                    element={
                      <SectorRoute
                        user={user}
                        module="sales"
                        element={
                          <InvoicePage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/reports`}
                    element={
                      <SectorRoute
                        user={user}
                        module="reports"
                        element={
                          <ReportsPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/notifications`}
                    element={
                      <NotificationsPage user={user} onLogout={handleLogout} />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/settings`}
                    element={
                      <SettingsPage user={user} onLogout={handleLogout} />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/user-management`}
                    element={
                      <UserManagementPage user={user} onLogout={handleLogout} />
                    }
                  />

                  {/* CNF Routes */}
                  <Route
                    path={`/${user.business_type}/shipments`}
                    element={
                      <SectorRoute
                        user={user}
                        module="shipments"
                        element={
                          <ShipmentsPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/jobs`}
                    element={
                      <SectorRoute
                        user={user}
                        module="jobs"
                        element={
                          <JobFilesPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/billing`}
                    element={
                      <SectorRoute
                        user={user}
                        module="billing"
                        element={
                          <BillingPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/documents`}
                    element={
                      <SectorRoute
                        user={user}
                        module="documents"
                        element={
                          <DocumentsPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/transport`}
                    element={
                      <SectorRoute
                        user={user}
                        module="transport"
                        element={
                          <TransportPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />
                  <Route
                    path={`/${user.business_type}/cnf-reports`}
                    element={
                      <SectorRoute
                        user={user}
                        module="cnf-reports"
                        element={
                          <CNFReportsPage user={user} onLogout={handleLogout} />
                        }
                      />
                    }
                  />

                  {/* Redirect root to sector dashboard */}
                  <Route
                    path="/"
                    element={<Navigate to={`/${user.business_type}`} />}
                  />
                </>
              )}
            </>
          ) : (
            <Route path="*" element={<Navigate to="/auth" />} />
          )}
        </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </div>
    </SidebarProvider>
  );
};

export default App;
