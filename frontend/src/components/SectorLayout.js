import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, ShoppingCart, Package, Calendar, Wrench, Utensils,
  DollarSign, LogOut, Menu, X, Building2, Users, Stethoscope,
  Car, Home, Tag, Palette, Ship, FileText, File, Truck,
} from "lucide-react";
import { getSectorModules, MODULE_ROUTES } from "../config/sectorModules";
import NotificationBell from "./NotificationBell";

const ICON_MAP = {
  dashboard: LayoutDashboard, products: Package, services: Calendar,
  appointments: Calendar, repairs: Wrench, tables: Utensils, pos: ShoppingCart,
  sales: DollarSign, customers: Users, suppliers: Building2, expenses: DollarSign,
  reports: LayoutDashboard, doctors: Stethoscope, patients: Users, vehicles: Car,
  properties: Home, offers: Tag, variants: Palette, shipments: Ship, jobs: FileText,
  billing: DollarSign, documents: File, transport: Truck, "cnf-reports": LayoutDashboard,
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

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // auto-collapse on mobile; desktop may start mini
      if (mobile && sidebarOpen) setSidebarOpen(false);
      if (!mobile && !sidebarOpen) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [sidebarOpen]);

  const businessType = user?.business_type || "pharmacy";
  const sectorConfig = getSectorModules(businessType);

  const menuItems = sectorConfig.modules.map((module) => {
    const route = MODULE_ROUTES[module];
    const Icon = ICON_MAP[module] || Package;
    return { path: `/${businessType}${route.path}`, label: route.label, icon: Icon, module };
  });

  // Layout math
  const sidebarWidth = isMobile ? (sidebarOpen ? 256 : 0) : (sidebarOpen ? 256 : 80);
  const sidebarX = isMobile && !sidebarOpen ? -256 : 0;
  const contentMarginLeft = isMobile ? 0 : (sidebarOpen ? 256 : 80);

  return (
    <div className="min-h-screen gradient-bg">
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ x: sidebarX, width: sidebarWidth }}
        className={`fixed left-0 top-0 h-full sidebar z-50
          ${sidebarOpen
            ? "overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
            : "overflow-y-hidden collapsed"}
        `}
        style={{ scrollBehavior: "smooth" }}
      >
        {/* Wrapper */}
        <div className={`h-full flex flex-col ${sidebarOpen ? "px-4 py-4" : "px-0 py-3 overflow-hidden"}`}>
          {/* Header / Toggle */}
          <div className={`${sidebarOpen ? "flex items-center justify-between" : "flex items-center justify-center"} mb-6 flex-shrink-0`}>
            {sidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-base leading-tight">Smart Business ERP</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Powered by MaxTech BD</p>
                </div>
              </motion.div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`${sidebarOpen ? "p-2" : "w-10 h-10 flex items-center justify-center"} rounded-lg hover:bg-white/10 text-white transition-colors`}
              data-testid="sidebar-toggle"
              title={sidebarOpen ? "Collapse" : "Expand"}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Nav */}
          <nav className={`${sidebarOpen ? "overflow-y-auto" : "overflow-hidden"} flex-1 space-y-2`}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.module === "dashboard" && location.pathname === `/${businessType}`);

              return (
                <Link key={item.path} to={item.path} onClick={() => isMobile && setSidebarOpen(false)}>
                  <div
                    className={`
                      sidebar-item ${isActive ? "active" : ""}
                      ${sidebarOpen ? "px-3 py-2 gap-3 justify-start" : "px-0 py-2 gap-0 justify-center"}
                      flex items-center w-full
                    `}
                    data-testid={`menu-${item.label.toLowerCase()}`}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <Icon className="w-5 h-5" />
                    {sidebarOpen && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {item.label}
                      </motion.span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-slate-700/50 flex-shrink-0 overflow-hidden">
            <button
              onClick={onLogout}
              className={`sidebar-item w-full text-left flex items-center ${sidebarOpen ? "px-3 py-2 gap-3 justify-start" : "px-0 py-2 gap-0 justify-center"}`}
              data-testid="logout-button"
              title={!sidebarOpen ? "Logout" : undefined}
            >
              <LogOut className="w-5 h-5" />
              {sidebarOpen && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Logout</motion.span>}
            </button>
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
              <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
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
