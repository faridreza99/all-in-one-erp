import React, { useState, useEffect } from 'react';
import { Building2, Phone, Mail, MapPin, User, Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import BackButton from '../components/BackButton';

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/suppliers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to load suppliers');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.contact_person || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingSupplier
        ? `${process.env.REACT_APP_BACKEND_URL}/api/suppliers/${editingSupplier.supplier_id}`
        : `${process.env.REACT_APP_BACKEND_URL}/api/suppliers`;
      
      const method = editingSupplier ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingSupplier ? 'Supplier updated successfully!' : 'Supplier created successfully!');
        setShowForm(false);
        setEditingSupplier(null);
        setFormData({
          name: '',
          contact_person: '',
          phone: '',
          email: '',
          address: ''
        });
        fetchSuppliers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to save supplier');
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Failed to save supplier');
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person,
      phone: supplier.phone,
      email: supplier.email || '',
      address: supplier.address || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (supplierId) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/suppliers/${supplierId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Supplier deleted successfully!');
        fetchSuppliers();
      } else {
        toast.error('Failed to delete supplier');
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Failed to delete supplier');
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <BackButton />
      
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Building2 className="w-10 h-10 text-purple-400" />
              Suppliers Management
            </h1>
            <p className="text-gray-400">Manage your supplier information</p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingSupplier(null);
              setFormData({
                name: '',
                contact_person: '',
                phone: '',
                email: '',
                address: ''
              });
            }}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            {showForm ? 'Cancel' : 'Add Supplier'}
          </button>
        </div>

        {showForm && (
          <div className="bg-gradient-to-br from-gray-800/50 to-purple-900/30 backdrop-blur-lg border border-gray-700/50 rounded-xl p-8 mb-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-purple-400" />
              {editingSupplier ? 'Edit Supplier' : 'New Supplier'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-300 mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-400" />
                  Supplier Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter supplier name"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-400" />
                  Contact Person <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter contact person name"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-purple-400" />
                  Phone <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-400" />
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter email address"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter full address"
                  rows="3"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
                >
                  {editingSupplier ? 'Update Supplier' : 'Create Supplier'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-gradient-to-br from-gray-800/50 to-purple-900/30 backdrop-blur-lg border border-gray-700/50 rounded-xl p-6 shadow-2xl">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search suppliers by name, contact, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="w-20 h-20 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-2">No suppliers found</p>
              <p className="text-gray-500">Add your first supplier to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map((supplier) => (
                <div
                  key={supplier.supplier_id}
                  className="bg-gradient-to-br from-gray-700/50 to-purple-800/30 border border-gray-600/50 rounded-lg p-6 hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-purple-400" />
                        {supplier.name}
                      </h3>
                      <div className="space-y-2 mt-3">
                        <p className="text-gray-300 flex items-center gap-2">
                          <User className="w-4 h-4 text-purple-400" />
                          <span className="text-sm">{supplier.contact_person}</span>
                        </p>
                        <p className="text-gray-300 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-purple-400" />
                          <span className="text-sm">{supplier.phone}</span>
                        </p>
                        {supplier.email && (
                          <p className="text-gray-300 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-purple-400" />
                            <span className="text-sm">{supplier.email}</span>
                          </p>
                        )}
                        {supplier.address && (
                          <p className="text-gray-300 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-purple-400" />
                            <span className="text-sm">{supplier.address}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-600/50">
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(supplier.supplier_id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuppliersPage;
