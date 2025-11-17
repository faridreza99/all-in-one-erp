import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Megaphone, Plus, Trash2, X, AlertCircle, Info, AlertTriangle, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../App';

const AnnouncementManagement = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tenants, setTenants] = useState([]);

  const [form, setForm] = useState({
    title: '',
    message: '',
    announcement_type: 'info',
    audience_type: 'all_tenants',
    target_sectors: [],
    target_tenant_ids: [],
    channels: ['in_app'],
    priority: 0,
    expires_at: ''
  });

  const businessTypes = [
    'pharmacy', 'mobile_shop', 'grocery', 'fashion', 'restaurant', 
    'electronics', 'stationery', 'hardware', 'jewelry', 'book_shop',
    'pet_shop', 'salon', 'gym', 'clinic', 'education'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [announcementsRes, tenantsRes] = await Promise.all([
        axios.get(`${API}/super/announcements`),
        axios.get(`${API}/tenants`)
      ]);
      setAnnouncements(announcementsRes.data.announcements || []);
      setTenants(tenantsRes.data || []);
    } catch (error) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      // Clean up the form data
      const payload = {
        title: form.title,
        message: form.message,
        announcement_type: form.announcement_type,
        audience_type: form.audience_type,
        channels: form.channels,
        priority: parseInt(form.priority)
      };

      if (form.audience_type === 'specific_sectors' && form.target_sectors.length > 0) {
        payload.target_sectors = form.target_sectors;
      }

      if (form.audience_type === 'specific_tenants' && form.target_tenant_ids.length > 0) {
        payload.target_tenant_ids = form.target_tenant_ids;
      }

      if (form.expires_at) {
        payload.expires_at = new Date(form.expires_at).toISOString();
      }

      const res = await axios.post(`${API}/super/announcements`, payload);
      toast.success(res.data.message || 'Announcement created successfully');
      setShowCreateModal(false);
      setForm({
        title: '',
        message: '',
        announcement_type: 'info',
        audience_type: 'all_tenants',
        target_sectors: [],
        target_tenant_ids: [],
        channels: ['in_app'],
        priority: 0,
        expires_at: ''
      });
      loadData();
    } catch (error) {
      console.error('Create announcement error:', error.response?.data);
      toast.error(error.response?.data?.detail || 'Failed to create announcement');
    }
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
      await axios.delete(`${API}/super/announcements/${announcementId}`);
      toast.success('Announcement deleted successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to delete announcement');
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'info': return <Info className="w-5 h-5 text-blue-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-400" />;
      default: return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTypeBadge = (type) => {
    const colors = {
      info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
      maintenance: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      feature: 'bg-green-500/20 text-green-400 border-green-500/30',
      promotion: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[type] || colors.info}`}>
        {type?.toUpperCase()}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const handleSectorToggle = (sector) => {
    setForm(prev => ({
      ...prev,
      target_sectors: prev.target_sectors.includes(sector)
        ? prev.target_sectors.filter(s => s !== sector)
        : [...prev.target_sectors, sector]
    }));
  };

  const handleTenantToggle = (tenantId) => {
    setForm(prev => ({
      ...prev,
      target_tenant_ids: prev.target_tenant_ids.includes(tenantId)
        ? prev.target_tenant_ids.filter(id => id !== tenantId)
        : [...prev.target_tenant_ids, tenantId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Announcement Management
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Announcement
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {announcements.map((announcement) => (
          <motion.div
            key={announcement.announcement_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3 flex-1">
                {getTypeIcon(announcement.announcement_type)}
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1">{announcement.title}</h3>
                  <p className="text-gray-400 text-sm">{announcement.message}</p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteAnnouncement(announcement.announcement_id)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {getTypeBadge(announcement.announcement_type)}
              <span className="px-3 py-1 rounded-full text-xs font-medium border bg-gray-500/20 text-gray-400 border-gray-500/30">
                Priority: {announcement.priority}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium border bg-green-500/20 text-green-400 border-green-500/30">
                {announcement.audience_type.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-4 text-sm text-gray-400">
              <div>
                <span className="font-medium">Recipients:</span> {announcement.total_recipients}
              </div>
              <div>
                <span className="font-medium">Read:</span> {announcement.total_read}
              </div>
              <div>
                <span className="font-medium">Created:</span> {formatDate(announcement.created_at)}
              </div>
              <div>
                <span className="font-medium">Expires:</span> {formatDate(announcement.expires_at)}
              </div>
            </div>
          </motion.div>
        ))}

        {announcements.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No announcements found</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-xl p-6 max-w-2xl w-full border border-white/10 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Create Announcement</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  required
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    value={form.announcement_type}
                    onChange={(e) => setForm({ ...form, announcement_type: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="feature">Feature</option>
                    <option value="promotion">Promotion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Priority (0-10)</label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    min="0"
                    max="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Audience</label>
                <select
                  value={form.audience_type}
                  onChange={(e) => setForm({ ...form, audience_type: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                >
                  <option value="all_tenants">All Tenants</option>
                  <option value="specific_sectors">Specific Sectors</option>
                  <option value="specific_tenants">Specific Tenants</option>
                </select>
              </div>

              {form.audience_type === 'specific_sectors' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Select Sectors</label>
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto bg-white/5 p-3 rounded-lg border border-white/10">
                    {businessTypes.map(sector => (
                      <label key={sector} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={form.target_sectors.includes(sector)}
                          onChange={() => handleSectorToggle(sector)}
                          className="rounded"
                        />
                        <span className="text-sm capitalize">{sector.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {form.audience_type === 'specific_tenants' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Select Tenants</label>
                  <div className="max-h-48 overflow-y-auto bg-white/5 p-3 rounded-lg border border-white/10">
                    {tenants.map(tenant => (
                      <label key={tenant.tenant_id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={form.target_tenant_ids.includes(tenant.tenant_id)}
                          onChange={() => handleTenantToggle(tenant.tenant_id)}
                          className="rounded"
                        />
                        <span className="text-sm">{tenant.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Expires At (Optional)</label>
                <input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                Create Announcement
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementManagement;
