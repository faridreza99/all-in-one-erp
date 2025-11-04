import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BackButton from '../components/BackButton';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_phone: '',
    manager_name: '',
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
      
      if (editingBranch) {
        await axios.put(`${API_URL}/api/branches/${editingBranch.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/api/branches`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      setShowForm(false);
      setEditingBranch(null);
      setFormData({ name: '', address: '', contact_phone: '', manager_name: '', is_active: true });
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
      is_active: branch.is_active
    });
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
    <div className="p-6">
      <BackButton className="mb-4" />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🏢 Branch Management</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingBranch(null);
            setFormData({ name: '', address: '', contact_phone: '', manager_name: '', is_active: true });
          }}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Add Branch'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-bold mb-4">{editingBranch ? 'Edit Branch' : 'Add New Branch'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Branch Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="tel"
              placeholder="Contact Phone *"
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <textarea
              placeholder="Address *"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="p-2 border rounded col-span-2"
              rows="2"
              required
            ></textarea>
            <input
              type="text"
              placeholder="Manager Name (Optional)"
              value={formData.manager_name}
              onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
              className="p-2 border rounded"
            />
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2"
              />
              <label>Branch Active</label>
            </div>
            <button type="submit" className="col-span-2 bg-green-600 text-white py-2 rounded hover:bg-green-700">
              {editingBranch ? 'Update Branch' : 'Create Branch'}
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((branch) => (
          <div key={branch.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold">{branch.name}</h3>
                <span className={`inline-block px-2 py-1 rounded text-xs mt-1 ${
                  branch.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {branch.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            
            <div className="space-y-2 text-sm mb-4">
              <p className="text-gray-600">
                <span className="font-semibold">📍 Address:</span> {branch.address}
              </p>
              <p className="text-gray-600">
                <span className="font-semibold">📞 Phone:</span> {branch.contact_phone}
              </p>
              {branch.manager_name && (
                <p className="text-gray-600">
                  <span className="font-semibold">👤 Manager:</span> {branch.manager_name}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(branch)}
                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(branch.id)}
                className="flex-1 bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {branches.length === 0 && (
        <div className="bg-white p-12 rounded-lg shadow-lg text-center text-gray-500">
          No branches created yet. Click "+ Add Branch" to create your first branch.
        </div>
      )}
    </div>
  );
}

export default BranchesPage;
