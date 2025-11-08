import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  Truck
} from 'lucide-react';
import { getSectorModules, MODULE_ROUTES } from '../config/sectorModules';
import NotificationBell from './NotificationBell';

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
  'cnf-reports': LayoutDashboard
};

const SectorLayout = ({ children, user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  const businessType = user?.business_type || 'pharmacy';
  const sectorConfig = getSectorModules(businessType);
  
  // Build menu items based on sector modules
  const menuItems = sectorConfig.modules.map(module => {
    const route = MODULE_ROUTES[module];
    const Icon = ICON_MAP[module] || Package;
    
    return {
      path: `/${businessType}${route.path}`,
      label: route.label,
      icon: Icon,
      module: module
    };
  });

  return (
    <div className="min-h-screen gradient-bg">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ 
          x: isMobile && !sidebarOpen ? -256 : 0,
          width: isMobile ? 256 : (sidebarOpen ? 256 : 80)
        }}
        className="fixed left-0 top-0 h-full sidebar z-50 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3"
              >
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
              className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
              data-testid="sidebar-toggle"
            >
              {sidebarOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
            </button>
          </div>

          <nav className="space-y-2 flex-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                              (item.module === 'dashboard' && location.pathname === `/${businessType}`);
              
              return (
                <Link key={item.path} to={item.path} onClick={() => isMobile && setSidebarOpen(false)}>
                  <div
                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                    data-testid={`menu-${item.label.toLowerCase()}`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 pt-4 border-t border-slate-700/50 flex-shrink-0">
            <button
              onClick={onLogout}
              className="sidebar-item w-full text-left"
              data-testid="logout-button"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  Logout
                </motion.span>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={false}
        animate={{ marginLeft: isMobile ? 0 : (sidebarOpen ? 256 : 80) }}
        className="min-h-screen transition-all duration-300"
      >
        {/* Mobile Header with Menu Toggle */}
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

        {/* Desktop Header with Notification Bell */}
        {!isMobile && (
          <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-lg border-b border-slate-700/50 px-6 py-3">
            <div className="flex items-center justify-end">
              <NotificationBell user={user} />
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export default SectorLayout;
