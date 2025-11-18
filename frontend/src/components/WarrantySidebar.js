import React from 'react';
import { Sidebar, Menu, MenuItem } from 'react-pro-sidebar';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, Shield, Settings, LogOut, ChevronLeft, ChevronRight,
  LayoutDashboard, Package, Wrench, X
} from 'lucide-react';

const WarrantySidebar = ({ isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/warranty/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/warranty/warranties', label: 'Warranties', icon: Shield },
    { path: '/warranty/repairs', label: 'Repairs', icon: Wrench },
    { path: '/warranty/products', label: 'Products', icon: Package },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar Container */}
      <div 
        className={`fixed left-0 top-0 bottom-0 z-50 transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ 
          width: isCollapsed ? '80px' : '280px',
          transition: 'width 0.3s ease-in-out'
        }}
      >
        {/* Close Button - Mobile Only */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all lg:hidden z-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute -right-3 top-8 w-7 h-7 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 items-center justify-center text-white shadow-lg border-2 border-slate-900 transition-all hover:scale-110 z-50"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <Sidebar
          collapsed={isCollapsed}
          backgroundColor="transparent"
          width="100%"
          collapsedWidth="80px"
          className="h-full border-r border-slate-700/50"
          style={{
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            boxShadow: '4px 0 24px rgba(0, 0, 0, 0.3)'
          }}
        >
          <div className="flex flex-col h-full">
            {/* Header/Logo */}
            <div className="p-6 border-b border-slate-700/50">
              {!isCollapsed ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Shield className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg leading-tight">Smart Business</h2>
                    <p className="text-slate-400 text-xs">ERP</p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Shield className="w-7 h-7 text-white" />
                  </div>
                </div>
              )}
            </div>

            {/* Main Navigation */}
            <div className="flex-1 overflow-y-auto scrollbar-hide py-4">
              <Menu
                menuItemStyles={{
                  button: ({ active }) => ({
                    backgroundColor: active ? '#3b82f6' : 'transparent',
                    color: active ? '#ffffff' : '#94a3b8',
                    borderRadius: '8px',
                    margin: '0 12px 8px 12px',
                    padding: '12px 16px',
                    fontWeight: active ? '600' : '400',
                    fontSize: '14px',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: active ? '#3b82f6' : '#1e293b',
                      color: '#ffffff',
                    },
                  }),
                }}
              >
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || 
                    (item.path === '/warranty/dashboard' && location.pathname.includes('/warranty'));
                  
                  return (
                    <MenuItem
                      key={item.path}
                      active={isActive}
                      icon={<Icon className="w-5 h-5" />}
                      onClick={() => navigate(item.path)}
                    >
                      {item.label}
                    </MenuItem>
                  );
                })}
              </Menu>
            </div>

            {/* Bottom Section */}
            <div className="border-t border-slate-700/50 py-4">
              <Menu
                menuItemStyles={{
                  button: {
                    backgroundColor: 'transparent',
                    color: '#94a3b8',
                    borderRadius: '8px',
                    margin: '0 12px 8px 12px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                    },
                  },
                }}
              >
                <MenuItem icon={<Settings className="w-5 h-5" />}>
                  Settings
                </MenuItem>
                <MenuItem 
                  icon={<Home className="w-5 h-5" />}
                  onClick={() => navigate('/')}
                >
                  Back to Home
                </MenuItem>
                <MenuItem 
                  icon={<LogOut className="w-5 h-5" />}
                  onClick={() => {
                    localStorage.clear();
                    navigate('/login');
                  }}
                >
                  Logout
                </MenuItem>
              </Menu>
            </div>
          </div>
        </Sidebar>
      </div>
    </>
  );
};

export default WarrantySidebar;
