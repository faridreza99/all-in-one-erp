import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Users, Plus, Edit, Trash2, Save, X, Shield, Mail, User, Lock, Building2, CheckCircle, XCircle } from 'lucide-react';
import SectorLayout from '../components/SectorLayout';
import BackButton from '../components/BackButton';
import { API } from '../App';
import { toast } from 'sonner';
import { formatErrorMessage } from '../utils/errorHandler';

const USER_ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'tenant_admin', label: 'Tenant Admin' },
  { value: 'head_office', label: 'Head Office' },
  { value: 'branch_manager', label: 'Branch Manager' },
  { value: 'staff', label: 'Staff' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'technician', label: 'Technician' }
];

const ROUTE_PERMISSIONS = [
  'dashboard',
  'products',
  'sales',
  'customers',
  'suppliers',
  'expenses',
  'reports',
  'pos',
  'repairs',
  'stock_transfer',
  'purchases',
  'low_stock',
  'customer_dues',
  'settings',
  'user_management'
];

const UserManagementPage = ({ user, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: 'staff',
    branch_id: '',
    allowed_routes: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, branchesRes] = await Promise.all([
        axios.get(`${API}/users`),
        axios.get(`${API}/branches`)
      ]);
      setUsers(usersRes.data);
      setBranches(branchesRes.data);
    } catch (error) {
      toast.error(formatErrorMessage(error, 'Failed to fetch data'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePermissionToggle = (permission) => {
    setFormData(prev => {
      const permissions = prev.allowed_routes || [];
      const newPermissions = permissions.includes(permission)
        ? permissions.filter(p => p !== permission)
        : [...permissions, permission];
      return {
        ...prev,
        allowed_routes: newPermissions
      };
    });
  };

  const validateForm = () => {
    if (!formData.email) {
      toast.error('Email is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    if (!formData.full_name) {
      toast.error('Full name is required');
      return false;
    }

    if (!editingUser && !formData.password) {
      toast.error('Password is required for new users');
      return false;
    }

    if (!editingUser && formData.password && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const submitData = {
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
        branch_id: formData.branch_id || null,
        allowed_routes: formData.allowed_routes || []
      };

      if (formData.username) {
        submitData.username = formData.username;
      }

      if (editingUser) {
        if (formData.password) {
          submitData.password = formData.password;
        }
        await axios.put(`${API}/users/${editingUser.id}`, submitData);
        toast.success('User updated successfully');
      } else {
        submitData.password = formData.password;
        await axios.post(`${API}/users`, submitData);
        toast.success('User created successfully');
      }

      setShowModal(false);
      setEditingUser(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(formatErrorMessage(error, `Failed to ${editingUser ? 'update' : 'create'} user`));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (userToEdit) => {
    setEditingUser(userToEdit);
    setFormData({
      username: userToEdit.username || '',
      email: userToEdit.email || '',
      full_name: userToEdit.full_name || '',
      password: '',
      role: userToEdit.role || 'staff',
      branch_id: userToEdit.branch_id || '',
      allowed_routes: userToEdit.allowed_routes || []
    });
    setShowModal(true);
  };

  const handleDeleteClick = (userToDelete) => {
    setUserToDelete(userToDelete);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      await axios.delete(`${API}/users/${userToDelete.id}`);
      toast.success('User deleted successfully');
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      fetchData();
    } catch (error) {
      toast.error(formatErrorMessage(error, 'Failed to delete user'));
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      full_name: '',
      password: '',
      role: 'staff',
      branch_id: '',
      allowed_routes: []
    });
  };

  const handleAddUser = () => {
    setEditingUser(null);
    resetForm();
    setShowModal(true);
  };

  const getBranchName = (branchId) => {
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || 'N/A';
  };

  const formatRoleName = (role) => {
    return USER_ROLES.find(r => r.value === role)?.label || role;
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <Users className="w-10 h-10" />
                User Management
              </h1>
              <p className="text-slate-400">Manage user accounts and permissions</p>
            </div>
            <button
              onClick={handleAddUser}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add User
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-6 py-4 text-slate-300 font-semibold">User</th>
                  <th className="text-left px-6 py-4 text-slate-300 font-semibold">Full Name</th>
                  <th className="text-left px-6 py-4 text-slate-300 font-semibold">Role</th>
                  <th className="text-left px-6 py-4 text-slate-300 font-semibold">Branch</th>
                  <th className="text-left px-6 py-4 text-slate-300 font-semibold">Status</th>
                  <th className="text-right px-6 py-4 text-slate-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, index) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-slate-700/50 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{u.username || 'N/A'}</p>
                          <p className="text-slate-400 text-sm flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white">{u.full_name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-400" />
                        <span className="text-slate-300">{formatRoleName(u.role)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-green-400" />
                        <span className="text-slate-300">{getBranchName(u.branch_id)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        u.is_active !== false
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {u.is_active !== false ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(u)}
                          className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                          title="Edit user"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(u)}
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-lg">No users found</p>
              <p className="text-slate-500 text-sm mt-2">Create your first user to get started</p>
            </div>
          )}
        </div>

        {/* Create/Edit User Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-400" />
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Username (Optional)
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="Enter username"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="user@example.com"
                      required
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>

                  {/* Full Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      placeholder="Enter full name"
                      required
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Password {!editingUser && '*'}
                      {editingUser && <span className="text-slate-500 text-xs ml-1">(leave blank to keep current)</span>}
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder={editingUser ? "Enter new password" : "Enter password"}
                      required={!editingUser}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Role *
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      {USER_ROLES.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Branch */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Branch
                    </label>
                    <select
                      name="branch_id"
                      value={formData.branch_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="">No Branch Assigned</option>
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Route Permissions */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Route Permissions
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    {ROUTE_PERMISSIONS.map(permission => (
                      <label
                        key={permission}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={(formData.allowed_routes || []).includes(permission)}
                          onChange={() => handlePermissionToggle(permission)}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors capitalize">
                          {permission.replace(/_/g, ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        <span>{editingUser ? 'Updating...' : 'Creating...'}</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>{editingUser ? 'Update User' : 'Create User'}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingUser(null);
                      resetForm();
                    }}
                    className="flex-1 btn-secondary"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && userToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 w-full max-w-md"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Delete User</h2>
              </div>

              <p className="text-slate-300 mb-6">
                Are you sure you want to delete user <span className="font-bold text-white">{userToDelete.full_name}</span>?
                This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  Delete
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setUserToDelete(null);
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </SectorLayout>
  );
};

export default UserManagementPage;
