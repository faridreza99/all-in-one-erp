import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Settings, Lock, Image, Type, Save, Eye, EyeOff } from 'lucide-react';
import SectorLayout from '../components/SectorLayout';
import BackButton from '../components/BackButton';
import { API } from '../App';
import { toast } from 'sonner';
import { formatErrorMessage } from '../utils/errorHandler';

const SettingsPage = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    website_name: '',
    logo_url: '',
    background_image_url: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [savingSettings, setSavingSettings] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setFormData({
        website_name: response.data.website_name || '',
        logo_url: response.data.logo_url || '',
        background_image_url: response.data.background_image_url || ''
      });
    } catch (error) {
      toast.error(formatErrorMessage(error, 'Failed to fetch settings'));
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    
    try {
      await axios.put(`${API}/settings`, formData);
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error(formatErrorMessage(error, 'Failed to update settings'));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (!passwordData.current_password) {
      toast.error('Please enter your current password');
      return;
    }
    
    if (!passwordData.new_password) {
      toast.error('Please enter a new password');
      return;
    }
    
    if (passwordData.new_password.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    setChangingPassword(true);
    
    try {
      await axios.post(`${API}/auth/change-password`, {
        old_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      
      toast.success('Password changed successfully');
      
      // Clear form
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      toast.error(formatErrorMessage(error, 'Failed to change password'));
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <SectorLayout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400"></div>
        </div>
      </SectorLayout>
    );
  }

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <BackButton className="mb-4" />
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Settings className="w-10 h-10" />
            Settings
          </h1>
          <p className="text-slate-400">Manage your application settings and security</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Branding Settings Section */}
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Type className="w-6 h-6 text-blue-400" />
              Branding Settings
            </h2>
            
            <form onSubmit={handleSaveSettings} className="space-y-5">
              {/* Website Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Website Name
                </label>
                <input
                  type="text"
                  name="website_name"
                  value={formData.website_name}
                  onChange={handleSettingsChange}
                  placeholder="My Business ERP"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Logo URL
                </label>
                <input
                  type="text"
                  name="logo_url"
                  value={formData.logo_url}
                  onChange={handleSettingsChange}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                {/* Logo Preview */}
                {formData.logo_url && (
                  <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-xs text-slate-400 mb-2">Preview:</p>
                    <img
                      src={formData.logo_url}
                      alt="Logo preview"
                      className="h-16 object-contain rounded"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        toast.error('Invalid logo URL');
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Background Image URL */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Background Image URL
                </label>
                <input
                  type="text"
                  name="background_image_url"
                  value={formData.background_image_url}
                  onChange={handleSettingsChange}
                  placeholder="https://example.com/background.jpg"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                {/* Background Preview */}
                {formData.background_image_url && (
                  <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-xs text-slate-400 mb-2">Preview:</p>
                    <img
                      src={formData.background_image_url}
                      alt="Background preview"
                      className="w-full h-24 object-cover rounded"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        toast.error('Invalid background URL');
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={savingSettings}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingSettings ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Settings
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Security Settings Section */}
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Lock className="w-6 h-6 text-red-400" />
              Security Settings
            </h2>
            
            <form onSubmit={handleChangePassword} className="space-y-5">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    name="current_password"
                    value={passwordData.current_password}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                    className="w-full px-4 py-3 pr-12 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    name="new_password"
                    value={passwordData.new_password}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password (min 6 characters)"
                    className="w-full px-4 py-3 pr-12 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    name="confirm_password"
                    value={passwordData.confirm_password}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-3 pr-12 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Password strength indicator */}
              {passwordData.new_password && (
                <div className="text-xs text-slate-400">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`h-1 flex-1 rounded ${passwordData.new_password.length >= 6 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  </div>
                  <p>
                    Password strength: {passwordData.new_password.length < 6 ? 'Too short' : passwordData.new_password.length < 10 ? 'Medium' : 'Strong'}
                  </p>
                </div>
              )}

              {/* Change Password Button */}
              <button
                type="submit"
                disabled={changingPassword}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {changingPassword ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Changing Password...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Change Password
                  </>
                )}
              </button>

              <p className="text-xs text-slate-400 text-center">
                Make sure to use a strong password with at least 6 characters
              </p>
            </form>
          </div>
        </div>
      </motion.div>
    </SectorLayout>
  );
};

export default SettingsPage;
