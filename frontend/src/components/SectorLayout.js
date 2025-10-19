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
  Palette
} from 'lucide-react';
import { getSectorModules, MODULE_ROUTES } from '../config/sectorModules';

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
  variants: Palette
};

const SectorLayout = ({ children, user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    <div className=\"min-h-screen gradient-bg\">
      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ width: sidebarOpen ? 256 : 80 }}
        className=\"fixed left-0 top-0 h-full sidebar z-50\"
      >
        <div className=\"p-4\">
          <div className=\"flex items-center justify-between mb-8\">
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className=\"flex items-center gap-3\"
              >
                <div className=\"w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center\">
                  <span className=\"text-2xl\">{sectorConfig.icon}</span>
                </div>
                <div>
                  <h2 className=\"font-bold text-white\">{sectorConfig.name}</h2>
                  <p className=\"text-xs text-slate-400\">{user?.role}</p>
                </div>
              </motion.div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className=\"p-2 hover:bg-white/10 rounded-lg transition-colors\"
              data-testid=\"sidebar-toggle\"
            >
              {sidebarOpen ? <X className=\"w-5 h-5\" /> : <Menu className=\"w-5 h-5\" />}
            </button>
          </div>

          <nav className=\"space-y-2\">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                              (item.module === 'dashboard' && location.pathname === `/${businessType}`);
              
              return (
                <Link key={item.path} to={item.path}>
                  <div
                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                    data-testid={`menu-${item.label.toLowerCase()}`}
                  >
                    <Icon className=\"w-5 h-5 flex-shrink-0\" />
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

            <button
              onClick={onLogout}
              className=\"sidebar-item w-full text-left\"
              data-testid=\"logout-button\"
            >
              <LogOut className=\"w-5 h-5 flex-shrink-0\" />
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  Logout
                </motion.span>
              )}
            </button>
          </nav>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={false}
        animate={{ marginLeft: sidebarOpen ? 256 : 80 }}
        className=\"min-h-screen transition-all duration-300\"
      >
        <div className=\"p-8\">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export default SectorLayout;
