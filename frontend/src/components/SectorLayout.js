import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  Shield,
  Ship,
  FileText,
  File,
  Truck,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getSectorModules, MODULE_ROUTES } from "../config/sectorModules";
import NotificationBell from "./NotificationBell";
import { API } from "../App";
import { useSidebar } from "../contexts/SidebarContext";

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
  "customer-dues": DollarSign,
  suppliers: Building2,
  expenses: DollarSign,
  reports: LayoutDashboard,
  doctors: Stethoscope,
  patients: Users,
  vehicles: Car,
  properties: Home,
  offers: Tag,
  variants: Palette,
  warranties: Shield,
  returns: Package,
  shipments: Ship,
  jobs: FileText,
  billing: DollarSign,
  documents: File,
  transport: Truck,
  "cnf-reports": LayoutDashboard,
};

// Get cached branding to prevent flash of default content
const getCachedSidebarBranding = () => {
  try {
    const cached = localStorage.getItem('cached_sidebar_branding');
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

const SectorLayout = ({ children, user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isCollapsed, setIsCollapsed } = useSidebar();

  const initialIsMobile =
    typeof window !== "undefined" ? window.innerWidth < 1024 : false;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(initialIsMobile);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load cached branding immediately to avoid flash of default content
  const cachedBranding = getCachedSidebarBranding();
  const [branding, setBranding] = useState(cachedBranding || {
    name: "Smart Business ERP",
    logo: null,
    backgroundImage: null,
  });

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile && isMobileMenuOpen) setIsMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await axios.get(`${API}/settings`, {
          withCredentials: true,
        });
        const raw = data?.data ?? data ?? {};
        const name =
          raw.website_name ||
          raw.app_name ||
          raw.site_name ||
          "Smart Business ERP";

        const rawLogo = raw.logo_url || raw.app_logo || raw.logo || null;
        const logo =
          rawLogo && typeof rawLogo === "string"
            ? /^https?:\/\//i.test(rawLogo)
              ? rawLogo
              : `${API}${rawLogo.startsWith("/") ? "" : "/"}${rawLogo}`
            : null;

        const rawBg = raw.background_image_url || raw.background_image || null;
        const backgroundImage =
          rawBg && typeof rawBg === "string"
            ? /^https?:\/\//i.test(rawBg)
              ? rawBg
              : `${API}${rawBg.startsWith("/") ? "" : "/"}${rawBg}`
            : null;

        if (mounted) {
          const newBranding = { name, logo, backgroundImage };
          setBranding(newBranding);
          setSettingsLoaded(true);
          // Cache branding for instant load next time
          localStorage.setItem('cached_sidebar_branding', JSON.stringify(newBranding));
        }
      } catch {
        if (mounted) setSettingsLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const businessType = user?.business_type || "pharmacy";
  const sectorConfig = getSectorModules(businessType);

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

  const menuItems = (() => {
    if (user?.role === 'super_admin' || user?.role === 'tenant_admin') {
      return allMenuItems;
    }

    const allowedRoutes = user?.allowed_routes || [];
    return allMenuItems.filter((item) => {
      if (item.module === 'dashboard') return true;
      return allowedRoutes.includes(item.module);
    });
  })();

  const isActive = (path, module) => {
    if (module === "dashboard") {
      return location.pathname === path || location.pathname === `/${businessType}`;
    }
    return location.pathname === path;
  };

  const contentMarginLeft = isMobile ? 0 : isCollapsed ? 80 : 288;

  const getBackgroundClass = () => {
    if (!settingsLoaded) return 'loading-bg';
    if (branding.backgroundImage) return 'custom-bg';
    return 'gradient-bg';
  };

  const getBackgroundStyle = () => {
    if (!settingsLoaded) {
      return { background: '#0f172a' };
    }
    if (branding.backgroundImage) {
      return {
        background: `linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.85)), url(${branding.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      };
    }
    return {};
  };

  return (
    <div 
      className={`min-h-screen ${getBackgroundClass()} transition-all duration-300`}
      style={getBackgroundStyle()}
    >
      {/* Mobile Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 bottom-0 z-50 transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'w-72'}`}
        style={{
          background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Close Button - Mobile Only */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all lg:hidden z-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop Toggle Button */}
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-8 w-7 h-7 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 flex items-center justify-center text-white shadow-lg border-2 border-slate-900 transition-all hover:scale-110 z-50"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}

        <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">
          {/* Header/Logo */}
          <div className={`border-b border-slate-700/50 ${isCollapsed ? 'p-4' : 'p-6'}`}>
            {!isCollapsed ? (
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
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Building2 className="w-7 h-7 text-white" />
                  </div>
                )}
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight">
                    {branding.name}
                  </h2>
                  <p className="text-slate-400 text-xs">{businessType}</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                {branding.logo ? (
                  <img
                    src={branding.logo}
                    alt="logo"
                    crossOrigin="anonymous"
                    className="w-12 h-12 rounded-xl object-cover shadow-lg border border-white/10 bg-white"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Building2 className="w-7 h-7 text-white" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Main Navigation */}
          <div className="flex-1 py-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.module);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => isMobile && setIsMobileMenuOpen(false)}
                >
                  <button
                    className={`w-full flex items-center gap-3 transition-all duration-200 ${
                      isCollapsed ? 'px-4 py-3 justify-center' : 'px-6 py-3'
                    } ${
                      active
                        ? 'bg-blue-600 text-white font-semibold mx-3 rounded-lg'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50 mx-3 rounded-lg'
                    }`}
                    title={isCollapsed ? item.label : ''}
                  >
                    <Icon className={`flex-shrink-0 ${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />
                    {!isCollapsed && <span className="text-sm truncate">{item.label}</span>}
                  </button>
                </Link>
              );
            })}
          </div>

          {/* Bottom Section */}
          <div className="border-t border-slate-700/50 py-4">
            <Link
              to={`/${businessType}/settings`}
              onClick={() => isMobile && setIsMobileMenuOpen(false)}
            >
              <button
                className={`w-full flex items-center gap-3 text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200 ${
                  isCollapsed ? 'px-4 py-3 justify-center' : 'px-6 py-3'
                } mx-3 rounded-lg ${
                  location.pathname === `/${businessType}/settings` ? 'bg-blue-600 text-white' : ''
                }`}
                title={isCollapsed ? 'Settings' : ''}
              >
                <Settings className={`flex-shrink-0 ${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />
                {!isCollapsed && <span className="text-sm">Settings</span>}
              </button>
            </Link>

            {(user?.role === 'tenant_admin' || user?.role === 'super_admin') && (
              <Link
                to={`/${businessType}/user-management`}
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
              >
                <button
                  className={`w-full flex items-center gap-3 text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200 ${
                    isCollapsed ? 'px-4 py-3 justify-center' : 'px-6 py-3'
                  } mx-3 rounded-lg ${
                    location.pathname === `/${businessType}/user-management` ? 'bg-blue-600 text-white' : ''
                  }`}
                  title={isCollapsed ? 'User Management' : ''}
                >
                  <Users className={`flex-shrink-0 ${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />
                  {!isCollapsed && <span className="text-sm">User Management</span>}
                </button>
              </Link>
            )}

            <button
              onClick={onLogout}
              className={`w-full flex items-center gap-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 ${
                isCollapsed ? 'px-4 py-3 justify-center' : 'px-6 py-3'
              } mx-3 rounded-lg`}
              title={isCollapsed ? 'Logout' : ''}
            >
              <LogOut className={`flex-shrink-0 ${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />
              {!isCollapsed && <span className="text-sm">Logout</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className="min-h-screen transition-all duration-300"
        style={{ marginLeft: `${contentMarginLeft}px` }}
      >
        {/* Mobile Header */}
        {isMobile && !isMobileMenuOpen && (
          <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-lg border-b border-slate-700/50 p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6 text-white" />
              </button>
              <NotificationBell user={user} />
            </div>
          </div>
        )}

        {/* Desktop Header */}
        {!isMobile && (
          <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-lg border-b border-slate-700/50 px-6 py-3">
            <div className="flex items-center justify-end">
              <NotificationBell user={user} />
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
};

export default SectorLayout;
