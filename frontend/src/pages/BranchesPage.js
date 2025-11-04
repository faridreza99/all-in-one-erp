import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BackButton from '../components/BackButton';
import { Building2, Phone, MapPin, User, CheckCircle, XCircle, Hash, Save } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Generate branch code
const generateBranchCode = () => {
  return 'BR-' + Math.random().toString(36).substr(2, 6).toUpperCase();
};

function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchCode, setBranchCode] = useState(generateBranchCode());
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_phone: '',
    manager_name: '',
    branch_code: '',
    is_active: true
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/branches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranches(response.data);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      // Include branch code for new branches
      const submitData = editingBranch 
        ? formData 
        : { ...formData, branch_code: branchCode };
      
      if (editingBranch) {
        await axios.put(`${API_URL}/api/branches/${editingBranch.id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/api/branches`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      setShowForm(false);
      setEditingBranch(null);
      setFormData({ name: '', address: '', contact_phone: '', manager_name: '', branch_code: '', is_active: true });
      setBranchCode(generateBranchCode());
      fetchBranches();
    } catch (error) {
      console.error('Error saving branch:', error);
      alert(error.response?.data?.detail || 'Error saving branch');
    }
  };

  const handleEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address,
      contact_phone: branch.contact_phone,
      manager_name: branch.manager_name || '',
      branch_code: branch.branch_code || '',
      is_active: branch.is_active
    });
    setBranchCode(branch.branch_code || generateBranchCode());
    setShowForm(true);
  };

  const handleDelete = async (branchId) => {
    if (!window.confirm('Are you sure you want to delete this branch? All product assignments will be removed.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/branches/${branchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchBranches();
    } catch (error) {
      console.error('Error deleting branch:', error);
      alert(error.response?.data?.detail || 'Error deleting branch');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <BackButton className="mb-4" />
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white flex items-center gap-3">
            <Building2 className="w-10 h-10 text-blue-400" />
            Branch Management
          </h1>
          <p className="text-slate-400 mt-2">Manage your business locations and branches</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingBranch(null);
            setBranchCode(generateBranchCode());
            setFormData({ name: '', address: '', contact_phone: '', manager_name: '', branch_code: '', is_active: true });
          }}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
        >
          {showForm ? '✕ Cancel' : '+ Add Branch'}
        </button>
      </div>

      {showForm && (
        <div className="bg-gradient-to-br from-white to-slate-50 p-8 rounded-2xl shadow-2xl mb-8 border border-slate-200">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              {editingBranch ? '✏️ Edit Branch' : '🏗️ Create New Branch'}
            </h2>
            <p className="text-slate-600 mt-1">Fill in the details to {editingBranch ? 'update' : 'add'} a branch location</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Auto-generated Branch Code */}
            {!editingBranch && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                <Hash className="w-5 h-5 text-blue-600" />
                <div>
                  <label className="text-sm font-semibold text-blue-900">Branch Code (Auto-generated)</label>
                  <p className="text-blue-700 font-mono font-bold text-lg">{branchCode}</p>
                </div>
              </div>
            )}

            {/* 2-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Branch Name */}
              <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Branch Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Downtown Store, Main Branch"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none bg-white text-slate-800"
                  required
                />
              </div>

              {/* Contact Phone */}
              <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-green-600" />
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  placeholder="e.g., +1 234 567 8900"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none bg-white text-slate-800"
                  required
                />
              </div>

              {/* Address - Full Width */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-600" />
                  Address *
                </label>
                <textarea
                  placeholder="Enter full branch address with city, state, and postal code"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all outline-none bg-white text-slate-800 resize-none"
                  rows="3"
                  required
                ></textarea>
              </div>

              {/* Manager Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-600" />
                  Manager Name
                </label>
                <input
                  type="text"
                  placeholder="Branch manager's name (optional)"
                  value={formData.manager_name}
                  onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none bg-white text-slate-800"
                />
              </div>

              {/* Active/Inactive Toggle */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Status</label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                    className={`relative inline-flex items-center h-12 rounded-full w-24 transition-colors focus:outline-none ${
                      formData.is_active ? 'bg-green-500' : 'bg-slate-400'
                    }`}
                  >
                    <span
                      className={`inline-block w-10 h-10 transform transition-transform bg-white rounded-full shadow-lg ${
                        formData.is_active ? 'translate-x-12' : 'translate-x-1'
                      }`}
                    >
                      {formData.is_active ? (
                        <CheckCircle className="w-6 h-6 text-green-500 m-2" />
                      ) : (
                        <XCircle className="w-6 h-6 text-slate-400 m-2" />
                      )}
                    </span>
                  </button>
                  <span className={`font-semibold ${formData.is_active ? 'text-green-600' : 'text-slate-500'}`}>
                    {formData.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 hover:from-green-700 hover:via-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-3 text-lg"
              >
                <Save className="w-6 h-6" />
                {editingBranch ? 'Update Branch' : 'Create Branch'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((branch) => (
          <div key={branch.id} className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-xl p-6 hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-200 border border-slate-200">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  {branch.name}
                </h3>
                {branch.branch_code && (
                  <p className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {branch.branch_code}
                  </p>
                )}
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold mt-2 ${
                  branch.is_active 
                    ? 'bg-green-100 text-green-700 border border-green-300' 
                    : 'bg-red-100 text-red-700 border border-red-300'
                }`}>
                  {branch.is_active ? (
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
              </div>
            </div>
            
            <div className="space-y-3 text-sm mb-6">
              <div className="flex items-start gap-2 text-slate-700">
                <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="flex-1">{branch.address}</p>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-4 h-4 text-green-500 flex-shrink-0" />
                <p className="flex-1 font-medium">{branch.contact_phone}</p>
              </div>
              {branch.manager_name && (
                <div className="flex items-center gap-2 text-slate-700">
                  <User className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <p className="flex-1">{branch.manager_name}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(branch)}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => handleDelete(branch.id)}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {branches.length === 0 && !showForm && (
        <div className="bg-gradient-to-br from-white to-slate-50 p-16 rounded-2xl shadow-xl text-center border border-slate-200">
          <Building2 className="w-20 h-20 text-slate-300 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-slate-700 mb-2">No Branches Yet</h3>
          <p className="text-slate-500 mb-6">Get started by creating your first branch location</p>
          <button
            onClick={() => {
              setShowForm(true);
              setBranchCode(generateBranchCode());
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
          >
            + Create First Branch
          </button>
        </div>
      )}
    </div>
  );
}

export default BranchesPage;
