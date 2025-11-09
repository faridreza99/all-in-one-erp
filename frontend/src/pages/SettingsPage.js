import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  Settings,
  Lock,
  Image as ImageIcon,
  Type,
  Save,
  Eye,
  EyeOff,
  Upload,
} from "lucide-react";
import SectorLayout from "../components/SectorLayout";
import BackButton from "../components/BackButton";
import { API } from "../App";
import { toast } from "sonner";
import { formatErrorMessage } from "../utils/errorHandler";

// Removed direct Cloudinary upload - now handled by backend

const SettingsPage = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    website_name: "",
    logo_url: "",
    background_image_url: "",
  });

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [savingSettings, setSavingSettings] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setFormData({
        website_name: response.data.website_name || "",
        logo_url: response.data.logo_url || "",
        background_image_url: response.data.background_image_url || "",
      });
    } catch (error) {
      toast.error(formatErrorMessage(error, "Failed to fetch settings"));
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await axios.put(`${API}/settings`, formData);
      toast.success("Settings updated successfully");
    } catch (error) {
      toast.error(formatErrorMessage(error, "Failed to update settings"));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordData.current_password)
      return toast.error("Please enter your current password");
    if (!passwordData.new_password)
      return toast.error("Please enter a new password");
    if (passwordData.new_password.length < 6)
      return toast.error("New password must be at least 6 characters long");
    if (passwordData.new_password !== passwordData.confirm_password)
      return toast.error("New passwords do not match");

    setChangingPassword(true);
    try {
      await axios.post(`${API}/auth/change-password`, {
        old_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      toast.success("Password changed successfully");
      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (error) {
      toast.error(formatErrorMessage(error, "Failed to change password"));
    } finally {
      setChangingPassword(false);
    }
  };

  const validateImage = (file) => {
    if (!file) return "No file selected";
    const allowed = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowed.includes(file.type))
      return "Invalid file type. Upload JPG, PNG, GIF, or WebP.";
    // Keep a sane client cap (Cloudinary free plan is generous; adjust if you like)
    if (file.size > 5 * 1024 * 1024) return "File size must be less than 5MB";
    return null;
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = null; // allow same-file reselect later
    const errMsg = validateImage(file);
    if (errMsg) return toast.error(errMsg);

    setUploadingLogo(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      
      const response = await axios.post(`${API}/upload/logo`, formDataUpload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      setFormData((prev) => ({ ...prev, logo_url: response.data.url }));
      toast.success("Logo uploaded successfully");
      fetchSettings();
    } catch (err) {
      toast.error(formatErrorMessage(err, "Failed to upload logo"));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBackgroundUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = null;
    const errMsg = validateImage(file);
    if (errMsg) return toast.error(errMsg);

    setUploadingBackground(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      
      const response = await axios.post(`${API}/upload/background`, formDataUpload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      setFormData((prev) => ({
        ...prev,
        background_image_url: response.data.url,
      }));
      toast.success("Background image uploaded successfully");
      fetchSettings();
    } catch (err) {
      toast.error(formatErrorMessage(err, "Failed to upload background image"));
    } finally {
      setUploadingBackground(false);
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
          <p className="text-slate-400">
            Manage your application settings and security
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Branding Settings */}
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

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Logo Image
                </label>
                <div className="space-y-3">
                  <label className="w-full cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={uploadingLogo}
                    />
                    <div className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                      {uploadingLogo ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          <span>Upload Logo</span>
                        </>
                      )}
                    </div>
                  </label>
                  {formData.logo_url && (
                    <div className="p-3 bg-slate-800/50 rounded-lg">
                      <p className="text-xs text-slate-400 mb-2">
                        Current Logo:
                      </p>
                      <img
                        src={formData.logo_url}
                        alt="Logo preview"
                        className="h-16 object-contain rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Background Image Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Background Image
                </label>
                <div className="space-y-3">
                  <label className="w-full cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleBackgroundUpload}
                      className="hidden"
                      disabled={uploadingBackground}
                    />
                    <div className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                      {uploadingBackground ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          <span>Upload Background Image</span>
                        </>
                      )}
                    </div>
                  </label>
                  {formData.background_image_url && (
                    <div className="p-3 bg-slate-800/50 rounded-lg">
                      <p className="text-xs text-slate-400 mb-2">
                        Current Background:
                      </p>
                      <img
                        src={formData.background_image_url}
                        alt="Background preview"
                        className="w-full h-24 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
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

          {/* Security Settings */}
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
                    onClick={() => togglePasswordVisibility("current")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPasswords.current ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
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
                    onClick={() => togglePasswordVisibility("new")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPasswords.new ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
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
                    onClick={() => togglePasswordVisibility("confirm")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password strength indicator */}
              {passwordData.new_password && (
                <div className="text-xs text-slate-400">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`h-1 flex-1 rounded ${passwordData.new_password.length >= 6 ? "bg-green-500" : "bg-red-500"}`}
                    ></div>
                  </div>
                  <p>
                    Password strength:{" "}
                    {passwordData.new_password.length < 6
                      ? "Too short"
                      : passwordData.new_password.length < 10
                        ? "Medium"
                        : "Strong"}
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
