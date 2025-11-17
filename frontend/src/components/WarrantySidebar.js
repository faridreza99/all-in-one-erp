import React from 'react';
import { Home, Shield, Mail, Phone } from 'lucide-react';

const WarrantySidebar = () => {
  return (
    <div className="fixed left-0 top-0 bottom-0 w-64 bg-white/10 backdrop-blur-md border-r border-white/20 p-6 hidden lg:flex flex-col">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Warranty Portal</h2>
            <p className="text-gray-400 text-xs">Customer Service</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        <a
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200 group"
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </a>
      </nav>

      <div className="border-t border-white/20 pt-6 space-y-4">
        <div>
          <p className="text-gray-400 text-xs mb-2 font-semibold">Support</p>
          <a
            href="mailto:support@myerp.com"
            className="flex items-center gap-2 text-gray-300 hover:text-white text-sm"
          >
            <Mail className="w-4 h-4" />
            <span>support@myerp.com</span>
          </a>
        </div>
        
        <div>
          <p className="text-gray-400 text-xs mb-2 font-semibold">Need Help?</p>
          <p className="text-gray-300 text-xs">
            Our team is available 24/7 to assist you with your warranty claims.
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30">
        <p className="text-white text-xs font-semibold mb-1">Secure & Verified</p>
        <p className="text-gray-300 text-xs">
          All warranty claims are protected with industry-standard encryption.
        </p>
      </div>
    </div>
  );
};

export default WarrantySidebar;
