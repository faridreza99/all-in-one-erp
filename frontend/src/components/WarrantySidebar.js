import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  Shield,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Package,
  Wrench,
  X,
  Users,
} from "lucide-react";

const WarrantySidebar = ({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: "/warranty/dashboard", label: "Dashboard", icon: LayoutDashboard },
    // { path: '/warranty/warranties', label: 'Warranties', icon: Shield },
    // { path: '/warranty/repairs', label: 'Repairs', icon: Wrench },
    // { path: '/warranty/products', label: 'Products', icon: Package },
  ];

  const bottomItems = [
    { path: "/settings", label: "Settings", icon: Settings },
    { path: "/user-management", label: "User Management", icon: Users },
  ];

  const isActive = (path) => {
    if (path === "/warranty/dashboard") {
      return location.pathname.includes("/warranty");
    }
    return location.pathname === path;
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

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
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "lg:w-20" : "w-72"}`}
        style={{
          background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
          boxShadow: "4px 0 24px rgba(0, 0, 0, 0.3)",
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
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">
          {/* Header/Logo */}
          <div
            className={`border-b border-slate-700/50 ${isCollapsed ? "p-4" : "p-6"}`}
          >
            {!isCollapsed ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight">
                    Smart Business
                  </h2>
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
          <div className="flex-1 py-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 transition-all duration-200 ${
                    isCollapsed ? "px-4 py-3 justify-center" : "px-6 py-3"
                  } ${
                    active
                      ? "bg-blue-600 text-white font-semibold mx-3 rounded-lg"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50 mx-3 rounded-lg"
                  }`}
                  title={isCollapsed ? item.label : ""}
                >
                  <Icon
                    className={`flex-shrink-0 ${isCollapsed ? "w-6 h-6" : "w-5 h-5"}`}
                  />
                  {!isCollapsed && (
                    <span className="text-sm">{item.label}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Section */}
          <div className="border-t border-slate-700/50 py-4">
            {bottomItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200 ${
                    isCollapsed ? "px-4 py-3 justify-center" : "px-6 py-3"
                  } mx-3 rounded-lg`}
                  title={isCollapsed ? item.label : ""}
                >
                  <Icon
                    className={`flex-shrink-0 ${isCollapsed ? "w-6 h-6" : "w-5 h-5"}`}
                  />
                  {!isCollapsed && (
                    <span className="text-sm">{item.label}</span>
                  )}
                </button>
              );
            })}

            <button
              onClick={() => navigate("/")}
              className={`w-full flex items-center gap-3 text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200 ${
                isCollapsed ? "px-4 py-3 justify-center" : "px-6 py-3"
              } mx-3 rounded-lg`}
              title={isCollapsed ? "Back to Home" : ""}
            >
              <Home
                className={`flex-shrink-0 ${isCollapsed ? "w-6 h-6" : "w-5 h-5"}`}
              />
              {!isCollapsed && <span className="text-sm">Back to Home</span>}
            </button>

            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 ${
                isCollapsed ? "px-4 py-3 justify-center" : "px-6 py-3"
              } mx-3 rounded-lg`}
              title={isCollapsed ? "Logout" : ""}
            >
              <LogOut
                className={`flex-shrink-0 ${isCollapsed ? "w-6 h-6" : "w-5 h-5"}`}
              />
              {!isCollapsed && <span className="text-sm">Logout</span>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default WarrantySidebar;
