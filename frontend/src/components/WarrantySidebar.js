import React from 'react';
import { Home, Shield, Mail, X, ChevronLeft, ChevronRight } from 'lucide-react';

const WarrantySidebar = ({ isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar - Collapsible on desktop, drawer on mobile */}
      <div 
        className={`fixed left-0 top-0 bottom-0 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-800/95 backdrop-blur-md border-r border-purple-500/20 shadow-2xl shadow-purple-500/10 z-50 flex flex-col transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'w-80'}`}
      >
        {/* Close Button - Only on mobile */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all lg:hidden"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop Toggle Button - Chevron */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute -right-4 top-8 w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 items-center justify-center text-white shadow-lg border-2 border-slate-900 transition-all hover:scale-110 z-50"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className={`transition-all duration-300 ${isCollapsed ? 'p-3' : 'p-6'}`}>
          {/* Header */}
          <div className={`mb-8 ${isCollapsed ? 'hidden' : 'block'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Warranty Portal</h2>
                <p className="text-gray-400 text-xs">Customer Service</p>
              </div>
            </div>
          </div>

          {/* Collapsed Header Icon */}
          {isCollapsed && (
            <div className="mb-8 flex justify-center">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            <a
              href="/"
              className={`flex items-center gap-3 rounded-lg text-gray-300 hover:bg-gradient-to-r hover:from-purple-600/20 hover:to-indigo-600/20 hover:text-white transition-all duration-200 group border border-transparent hover:border-purple-500/30 ${
                isCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'
              }`}
              title={isCollapsed ? 'Home' : ''}
            >
              <Home className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>Home</span>}
            </a>
          </nav>

          {/* Support Section */}
          {!isCollapsed && (
            <div className="mt-auto border-t border-purple-500/20 pt-6 space-y-4">
              <div>
                <p className="text-gray-400 text-xs mb-2 font-semibold uppercase tracking-wide">Support</p>
                <a
                  href="mailto:support@myerp.com"
                  className="flex items-center gap-2 text-gray-300 hover:text-white text-sm transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span>support@myerp.com</span>
                </a>
              </div>
              
              <div>
                <p className="text-gray-400 text-xs mb-2 font-semibold uppercase tracking-wide">Need Help?</p>
                <p className="text-gray-300 text-xs leading-relaxed">
                  Our team is available 24/7 to assist you with your warranty claims.
                </p>
              </div>
            </div>
          )}

          {/* Security Badge */}
          {!isCollapsed && (
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-purple-600/20 via-indigo-600/20 to-blue-600/20 border border-purple-500/30 shadow-lg">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white text-xs font-semibold mb-1">Secure & Verified</p>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    All warranty claims are protected with industry-standard encryption.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default WarrantySidebar;
