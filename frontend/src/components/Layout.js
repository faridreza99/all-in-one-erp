import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  Building2
} from 'lucide-react';

const Layout = ({ children, user, onLogout }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/pos', label: 'POS', icon: ShoppingCart },
    { path: '/products', label: 'Products', icon: Package },
    { path: '/services', label: 'Services', icon: Calendar },
    { path: '/appointments', label: 'Appointments', icon: Calendar },
    { path: '/repairs', label: 'Repairs', icon: Wrench },
    { path: '/tables', label: 'Tables', icon: Utensils },
    { path: '/customers', label: 'Customers', icon: Building2 },
    { path: '/expenses', label: 'Expenses', icon: DollarSign },
    { path: '/sales', label: 'Sales', icon: DollarSign },
    { path: '/reports', label: 'Reports', icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen gradient-bg">
      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ width: sidebarOpen ? 256 : 80 }}
        className="fixed left-0 top-0 h-full sidebar z-50"
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-white">ERP System</h2>
                  <p className="text-xs text-slate-400">{user?.role}</p>
                </div>
              </motion.div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              data-testid="sidebar-toggle"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link key={item.path} to={item.path}>
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
          </nav>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={false}
        animate={{ marginLeft: sidebarOpen ? 256 : 80 }}
        className="min-h-screen transition-all duration-300"
      >
        <div className="p-8">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export default Layout;