import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Calendar,
  Wrench,
  Utensils,
  DollarSign,
  LogOut,
  Menu,
  X,
  Building2,
  Users,
  Stethoscope,
  Car,
  Home,
  Tag,
  Palette,
  Ship,
  FileText,
  File,
  Truck,
  Settings,
} from "lucide-react";
import { getSectorModules, MODULE_ROUTES } from "../config/sectorModules";
import NotificationBell from "./NotificationBell";
import { API } from "../App"; // make sure this points to your API base

const ICON_MAP = {
  dashboard: LayoutDashboard,
  products: Package,
  services: Calendar,
  appointments: Calendar,
  repairs: Wrench,
  tables: Utensils,
  pos: ShoppingCart,
  sales: DollarSign,
  customers: Users,
  suppliers: Building2,
  expenses: DollarSign,
  reports: LayoutDashboard,
  doctors: Stethoscope,
  patients: Users,
  vehicles: Car,
  properties: Home,
  offers: Tag,
  variants: Palette,
  shipments: Ship,
  jobs: FileText,
  billing: DollarSign,
  documents: File,
  transport: Truck,
  "cnf-reports": LayoutDashboard,
};

const SectorLayout = ({ children, user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const initialIsMobile =
    typeof window !== "undefined" ? window.innerWidth < 1024 : false;
  const initialSidebarOpen =
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true;

  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen);
  const [isMobile, setIsMobile] = useState(initialIsMobile);

  // Branding pulled from `${API}/settings`
  const [branding, setBranding] = useState({
    name: "Smart Business ERP",
    logo: null,
  });

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile && sidebarOpen) setSidebarOpen(false); // auto-close on mobile
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [sidebarOpen]);

  // Fetch branding: expects fields like { website_name, logo_url } (sample you sent)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await axios.get(`${API}/settings`, {
          withCredentials: true,
        });
        const raw = data?.data ?? data ?? {};
        console.log("Branding data:", raw);
        const name =
          raw.website_name ||
          raw.app_name ||
          raw.site_name ||
          "Smart Business ERP";

        // handle relative logo path
        const rawLogo = raw.logo_url || raw.app_logo || raw.logo || null;
        const logo =
          rawLogo && typeof rawLogo === "string"
            ? /^https?:\/\//i.test(rawLogo)
              ? rawLogo
              : `${API}${rawLogo.startsWith("/") ? "" : "/"}${rawLogo}`
            : null;

        if (mounted) setBranding({ name, logo });
      } catch {
        // leave defaults
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const businessType = user?.business_type || "pharmacy";
  const sectorConfig = getSectorModules(businessType);

  // Create all menu items
  const allMenuItems = sectorConfig.modules.map((module) => {
    const route = MODULE_ROUTES[module];
    const Icon = ICON_MAP[module] || Package;
    return {
      path: `/${businessType}${route.path}`,
      label: route.label,
      icon: Icon,
      module,
    };
  });

  // Filter menu items based on user's allowed_routes
  const menuItems = (() => {
    // Super admin and tenant admin see everything
    if (user?.role === 'super_admin' || user?.role === 'tenant_admin') {
      return allMenuItems;
    }

    // Other roles: filter by allowed_routes
    const allowedRoutes = user?.allowed_routes || [];
    return allMenuItems.filter((item) => {
      // Always show dashboard
      if (item.module === 'dashboard') return true;
      
      // Check if module is in allowed_routes
      return allowedRoutes.includes(item.module);
    });
  })();

  // Layout/scroll behavior
  const isDesktopMini = !isMobile && !sidebarOpen;
  const sidebarWidth = isMobile
    ? sidebarOpen
      ? 256
      : 0
    : sidebarOpen
      ? 256
      : 80;
  const sidebarX = isMobile && !sidebarOpen ? -256 : 0;
  const contentMarginLeft = isMobile ? 0 : sidebarOpen ? 256 : 80;
  const sidebarScrollClass =
    sidebarOpen || isDesktopMini
      ? "overflow-y-auto scrollbar-hide"
      : "overflow-hidden";

  return (
    <div className="min-h-screen gradient-bg">
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ x: sidebarX, width: sidebarWidth }}
        className={`fixed left-0 top-0 h-full sidebar z-50 ${sidebarScrollClass}`}
        style={{ scrollBehavior: "smooth" }}
      >
        <div
          className={`h-full flex flex-col ${sidebarOpen ? "px-4 py-4" : "px-0 py-3"}`}
        >
          {/* Header / Toggle */}
          <div
            className={`${
              sidebarOpen
                ? "flex items-center justify-between"
                : "flex items-center justify-center"
            } mb-6 flex-shrink-0`}
          >
            {sidebarOpen ? (
              <div className="flex items-center gap-3">
                {branding.logo ? (
                  <img
                    src={branding.logo}
                    alt={branding.name}
                    crossOrigin="anonymous"
                    className="w-12 h-12 rounded-xl object-cover shadow-lg border border-white/10 bg-white"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Building2 className="w-7 h-7 text-white" />
                  </div>
                )}
                <div>
                  <h2 className="font-bold text-white text-base leading-tight">
                    {branding.name}
                  </h2>
                </div>
              </div>
            ) : (
              // Collapsed: also show compact logo so brand is always visible
              <div className="flex items-center justify-between w-full px-2">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center border border-white/10">
                  {branding.logo ? (
                    <img
                      src={branding.logo}
                      alt="logo"
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.replaceWith(
                          document.createElement("div"),
                        );
                      }}
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-white opacity-90" />
                  )}
                </div>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 text-white transition-colors"
                  data-testid="sidebar-toggle"
                  title="Expand"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
            )}

            {sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
                data-testid="sidebar-toggle"
                title="Collapse"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Nav */}
          <nav
            className={`${
              sidebarOpen || isDesktopMini
                ? "overflow-y-auto scrollbar-hide"
                : "overflow-hidden"
            } flex-1 space-y-2`}
          >
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.module === "dashboard" &&
                  location.pathname === `/${businessType}`);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => isMobile && setSidebarOpen(false)}
                >
                  <motion.div
                    whileHover={{ scale: 1.02, x: 2 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                      mass: 0.3,
                    }}
                    className={`
                      flex items-center w-full rounded-xl hover:bg-white/10
                      ${sidebarOpen ? "px-3 py-2 gap-3 justify-start" : "justify-center h-12"}
                      sidebar-item ${isActive ? "active" : ""}
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60
                    `}
                    data-testid={`menu-${item.label.toLowerCase()}`}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <motion.span className="grid place-items-center">
                      <Icon className="w-5 h-5 mx-auto" />
                    </motion.span>
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.15 }}
                        className="truncate"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-slate-700/50 flex-shrink-0 space-y-2">
            <Link
              to={`/${businessType}/settings`}
              onClick={() => isMobile && setSidebarOpen(false)}
            >
              <motion.div
                whileHover={{ scale: 1.02, x: 2 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  mass: 0.3,
                }}
                className={`sidebar-item w-full flex items-center rounded-xl hover:bg-white/10 ${
                  sidebarOpen
                    ? "px-3 py-2 gap-3 justify-start"
                    : "justify-center h-12"
                } ${location.pathname === `/${businessType}/settings` ? "active" : ""}`}
                data-testid="settings-button"
                title={!sidebarOpen ? "Settings" : undefined}
              >
                <Settings className="w-5 h-5 mx-auto" />
                {sidebarOpen && <span>Settings</span>}
              </motion.div>
            </Link>

            {(user?.role === 'tenant_admin' || user?.role === 'super_admin') && (
              <Link
                to={`/${businessType}/user-management`}
                onClick={() => isMobile && setSidebarOpen(false)}
              >
                <motion.div
                  whileHover={{ scale: 1.02, x: 2 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    mass: 0.3,
                  }}
                  className={`sidebar-item w-full flex items-center rounded-xl hover:bg-white/10 ${
                    sidebarOpen
                      ? "px-3 py-2 gap-3 justify-start"
                      : "justify-center h-12"
                  } ${location.pathname === `/${businessType}/user-management` ? "active" : ""}`}
                  data-testid="user-management-button"
                  title={!sidebarOpen ? "User Management" : undefined}
                >
                  <Users className="w-5 h-5 mx-auto" />
                  {sidebarOpen && <span>User Management</span>}
                </motion.div>
              </Link>
            )}

            <motion.button
              whileHover={{ scale: 1.02, x: 2 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                mass: 0.3,
              }}
              onClick={onLogout}
              className={`sidebar-item w-full text-left flex items-center rounded-xl hover:bg-white/10 ${
                sidebarOpen
                  ? "px-3 py-2 gap-3 justify-start"
                  : "justify-center h-12"
              }`}
              data-testid="logout-button"
              title={!sidebarOpen ? "Logout" : undefined}
            >
              <LogOut className="w-5 h-5 mx-auto" />
              {sidebarOpen && <span>Logout</span>}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Main */}
      <motion.div
        initial={false}
        animate={{ marginLeft: contentMarginLeft }}
        className="min-h-screen transition-all duration-300"
      >
        {isMobile && !sidebarOpen && (
          <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-lg border-b border-slate-700/50 p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6 text-white" />
              </button>
              <NotificationBell user={user} />
            </div>
          </div>
        )}

        {!isMobile && (
          <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-lg border-b border-slate-700/50 px-6 py-3">
            <div className="flex items-center justify-end">
              <NotificationBell user={user} />
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </motion.div>
    </div>
  );
};

export default SectorLayout;
