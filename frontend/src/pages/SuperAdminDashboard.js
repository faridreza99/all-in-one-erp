import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Building, TrendingUp, X, DollarSign, ShoppingCart, Activity, UserCheck } from 'lucide-react';
import Swal from 'sweetalert2';
import Layout from '../components/Layout';
import { API } from '../App';
import { toast } from 'sonner';
import { formatErrorMessage } from '../utils/errorHandler';

const SuperAdminDashboard = ({ user, onLogout }) => {
  const [tenants, setTenants] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [tenantStats, setTenantStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
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

  const fetchTenantStats = async (tenantId) => {
    setLoadingStats(true);
    try {
      const response = await axios.get(`${API}/super/tenants/${tenantId}/stats`);
      setTenantStats(response.data);
    } catch (error) {
      toast.error('Failed to load tenant statistics');
    } finally {
      setLoadingStats(false);
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
      toast.error(formatErrorMessage(error, 'Failed to create tenant'));
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

  const handleStatusChange = async (tenantId, newStatus) => {
    const statusLabels = {
      'active': 'Activate',
      'suspended': 'Suspend',
      'deleted': 'Delete'
    };

    const result = await Swal.fire({
      title: `${statusLabels[newStatus]} Tenant?`,
      text: `Are you sure you want to ${statusLabels[newStatus].toLowerCase()} this tenant?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: newStatus === 'deleted' ? '#d33' : '#3085d6',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Yes, ${statusLabels[newStatus].toLowerCase()} it!`
    });

    if (result.isConfirmed) {
      try {
        await axios.patch(`${API}/super/tenants/${tenantId}/status`, { status: newStatus });
        toast.success(`Tenant ${statusLabels[newStatus].toLowerCase()}d successfully`);
        fetchTenants();
      } catch (error) {
        toast.error(`Failed to update tenant status`);
      }
    }
  };

  const handleImpersonate = async (tenantId, tenantName) => {
    const result = await Swal.fire({
      title: 'Impersonate Tenant Admin?',
      text: `You will login as the admin of "${tenantName}"`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, impersonate'
    });

    if (result.isConfirmed) {
      try {
        const response = await axios.post(`${API}/super/tenants/${tenantId}/impersonate`);
        
        // Store the new token
        localStorage.setItem('token', response.data.access_token);
        
        // Show success message
        toast.success(`Now impersonating ${tenantName}`);
        
        // Redirect to tenant dashboard
        setTimeout(() => {
          window.location.href = `/${tenantId}`;
        }, 1000);
      } catch (error) {
        toast.error('Failed to impersonate tenant');
      }
    }
  };

  const handleViewStats = (tenant) => {
    setSelectedTenant(tenant);
    setShowStatsModal(true);
    fetchTenantStats(tenant.tenant_id);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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
                  <th>Modules</th>
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
                        {tenant.modules_enabled?.slice(0, 3).map(module => (
                          <span key={module} className="badge badge-success text-xs">
                            {module}
                          </span>
                        ))}
                        {tenant.modules_enabled?.length > 3 && (
                          <span className="badge badge-secondary text-xs">
                            +{tenant.modules_enabled.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <select
                        value={tenant.status || (tenant.is_active ? 'active' : 'suspended')}
                        onChange={(e) => handleStatusChange(tenant.tenant_id, e.target.value)}
                        className="text-sm bg-slate-700/50 border border-slate-600 rounded px-2 py-1 text-white"
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="deleted">Deleted</option>
                      </select>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewStats(tenant)}
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                        >
                          View Stats
                        </button>
                        <span className="text-slate-600">|</span>
                        <button
                          onClick={() => handleImpersonate(tenant.tenant_id, tenant.name)}
                          className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                        >
                          Impersonate
                        </button>
                      </div>
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

        {/* Tenant Stats Modal */}
        <AnimatePresence>
          {showStatsModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedTenant?.name} - Analytics</h2>
                    <p className="text-slate-400 text-sm">{selectedTenant?.email}</p>
                  </div>
                  <button
                    onClick={() => setShowStatsModal(false)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {loadingStats ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : tenantStats ? (
                  <div>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-6 border border-blue-500/30">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-blue-500/30 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-blue-400" />
                          </div>
                          <p className="text-slate-300 text-sm">Total Sales</p>
                        </div>
                        <p className="text-2xl font-bold text-white">{formatCurrency(tenantStats.total_sales)}</p>
                      </div>

                      <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl p-6 border border-green-500/30">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-green-500/30 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                          </div>
                          <p className="text-slate-300 text-sm">Today's Sales</p>
                        </div>
                        <p className="text-2xl font-bold text-white">{formatCurrency(tenantStats.today_sales)}</p>
                      </div>

                      <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-6 border border-purple-500/30">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-purple-500/30 rounded-lg flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5 text-purple-400" />
                          </div>
                          <p className="text-slate-300 text-sm">Sales Count</p>
                        </div>
                        <p className="text-2xl font-bold text-white">{tenantStats.sales_count}</p>
                      </div>
                    </div>

                    {/* Recent Sales */}
                    {tenantStats.recent_sales && tenantStats.recent_sales.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Recent Sales (Last 7 Days)</h3>
                        <div className="space-y-2">
                          {tenantStats.recent_sales.map((sale, index) => (
                            <div
                              key={sale.id || index}
                              className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-white font-medium">{sale.customer_name || 'Walk-in Customer'}</p>
                                  <p className="text-slate-400 text-sm">
                                    {new Date(sale.created_at).toLocaleDateString()} - {sale.payment_method}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-green-400 font-bold">{formatCurrency(sale.total)}</p>
                                  <p className="text-slate-400 text-sm">{sale.items_count} items</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No statistics available</p>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </Layout>
  );
};

export default SuperAdminDashboard;
