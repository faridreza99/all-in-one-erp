import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Plus, Users, Building, ToggleLeft, ToggleRight } from 'lucide-react';
import Layout from '../components/Layout';
import { API } from '../App';
import { toast } from 'sonner';

const SuperAdminDashboard = ({ user, onLogout }) => {
  const [tenants, setTenants] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    business_type: 'pharmacy',
    admin_password: ''
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await axios.get(`${API}/tenants`);
      setTenants(response.data);
    } catch (error) {
      toast.error('Failed to fetch tenants');
    }
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/tenants`, formData);
      toast.success('Tenant created successfully');
      setShowModal(false);
      setFormData({ name: '', email: '', business_type: 'pharmacy', admin_password: '' });
      fetchTenants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create tenant');
    }
  };

  const handleToggleModule = async (tenantId, module) => {
    try {
      await axios.patch(`${API}/tenants/${tenantId}/toggle-module?module=${module}`);
      toast.success('Module toggled');
      fetchTenants();
    } catch (error) {
      toast.error('Failed to toggle module');
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Super Admin Dashboard</h1>
            <p className="text-slate-400">Manage all tenants and their business modules</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
            data-testid="create-tenant-button"
          >
            <Plus className="w-5 h-5" />
            Create Tenant
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Building className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Tenants</p>
                <p className="text-3xl font-bold text-white" data-testid="total-tenants">{tenants.length}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-7 h-7 text-green-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Active Tenants</p>
                <p className="text-3xl font-bold text-white">
                  {tenants.filter(t => t.is_active).length}
                </p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Building className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Business Types</p>
                <p className="text-3xl font-bold text-white">
                  {new Set(tenants.map(t => t.business_type)).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-6">All Tenants</h2>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Business Name</th>
                  <th>Email</th>
                  <th>Business Type</th>
                  <th>Modules Enabled</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} data-testid={`tenant-row-${tenant.tenant_id}`}>
                    <td className="font-semibold text-white">{tenant.name}</td>
                    <td className="text-slate-300">{tenant.email}</td>
                    <td>
                      <span className="badge badge-info">
                        {tenant.business_type}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {tenant.modules_enabled?.map(module => (
                          <span key={module} className="badge badge-success text-xs">
                            {module}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${tenant.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {tenant.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleModule(tenant.tenant_id, 'pos')}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Toggle POS
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Tenant Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 w-full max-w-md"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Create New Tenant</h2>
              <form onSubmit={handleCreateTenant} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Business Name</label>
                  <input
                    data-testid="tenant-name-input"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input
                    data-testid="tenant-email-input"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Business Type</label>
                  <select
                    data-testid="tenant-business-type-select"
                    value={formData.business_type}
                    onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                    className="w-full"
                  >
                    <option value="pharmacy">Pharmacy</option>
                    <option value="salon">Salon</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="mobile_shop">Mobile Shop</option>
                    <option value="grocery">Grocery</option>
                    <option value="clinic">Clinic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Admin Password</label>
                  <input
                    data-testid="tenant-password-input"
                    type="password"
                    value={formData.admin_password}
                    onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                    className="w-full"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1" data-testid="submit-tenant-button">Create</button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary flex-1"
                    data-testid="cancel-tenant-button"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </motion.div>
    </Layout>
  );
};

export default SuperAdminDashboard;