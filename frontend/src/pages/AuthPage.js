import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Lock, Mail, User, Building2 } from 'lucide-react';
import { API } from '../App';
import { toast } from 'sonner';
import { formatErrorMessage } from '../utils/errorHandler';

const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    business_type: 'mobile_shop'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/signup';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : { 
            email: formData.email, 
            admin_password: formData.password,
            name: formData.name,
            business_type: formData.business_type
          };
      const response = await axios.post(`${API}${endpoint}`, payload);
      
      onLogin(response.data.user, response.data.access_token);
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
    } catch (error) {
      toast.error(formatErrorMessage(error, 'Authentication failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-bg relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl mb-4"
            >
              <Building2 className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              Smart Business ERP
            </h1>
            <p className="text-slate-400 mt-2">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Business Name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      data-testid="auth-businessname-input"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white placeholder-slate-500"
                      placeholder="Enter your business name"
                      required={!isLogin}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Business Type
                  </label>
                  <div className="relative">
                    <select
                      data-testid="auth-businesstype-select"
                      value={formData.business_type}
                      onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white"
                      required={!isLogin}
                    >
                      <option value="mobile_shop">Mobile Shop 📱</option>
                      <option value="pharmacy">Pharmacy 💊</option>
                      <option value="salon">Salon & Spa ✂️</option>
                      <option value="restaurant">Restaurant 🍽️</option>
                      <option value="clinic">Clinic 🏥</option>
                      <option value="grocery">Grocery Store 🛒</option>
                      <option value="electronics">Electronics Store 💻</option>
                      <option value="fashion">Fashion Boutique 👗</option>
                      <option value="stationery">Stationery Shop 📚</option>
                      <option value="hardware">Hardware Store 🔧</option>
                      <option value="furniture">Furniture Store 🛋️</option>
                      <option value="garage">Auto Garage 🚗</option>
                      <option value="wholesale">Wholesale Business 📦</option>
                      <option value="ecommerce">E-commerce 🛍️</option>
                      <option value="real_estate">Real Estate 🏘️</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  data-testid="auth-email-input"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-xl"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  data-testid="auth-password-input"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-xl"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              data-testid="auth-submit-button"
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-lg font-semibold"
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <button
              data-testid="auth-toggle-mode"
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-xs text-slate-500 text-center">
              Demo: Use any email/password for super admin or create tenant account
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;