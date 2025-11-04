import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import SectorLayout from '../components/SectorLayout';
import BackButton from '../components/BackButton';
import { API } from '../App';
import { toast } from 'sonner';
import { formatErrorMessage } from '../utils/errorHandler';

// Helper function to format API error messages
const formatErrorMessageLocal = (error) => {
  if (!error.response?.data) return 'Operation failed';
  
  const data = error.response.data;
  
  // Handle FastAPI validation errors (array of objects)
  if (Array.isArray(data.detail)) {
    return data.detail.map(err => err.msg || JSON.stringify(err)).join(', ');
  }
  
  // Handle simple string detail
  if (typeof data.detail === 'string') {
    return data.detail;
  }
  
  // Handle object detail
  if (typeof data.detail === 'object' && data.detail.msg) {
    return data.detail.msg;
  }
  
  return 'Operation failed';
};

const ProductsPage = ({ user, onLogout }) => {
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    price: '',
    stock: '',
    description: '',
    generic_name: '',
    brand: '',
    batch_number: '',
    expiry_date: '',
    imei: '',
    warranty_months: '',
    branch_id: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchBranches();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to fetch products');
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${API}/branches`);
      // Filter only active branches
      const activeBranches = response.data.filter(branch => branch.is_active);
      setBranches(activeBranches);
    } catch (error) {
      toast.error('Failed to fetch branches');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Build submitData with properly converted numeric fields
      const submitData = {
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        description: formData.description,
        generic_name: formData.generic_name,
        brand: formData.brand,
        batch_number: formData.batch_number,
        expiry_date: formData.expiry_date,
        imei: formData.imei,
        branch_id: formData.branch_id,
        // Convert numeric fields from strings to numbers
        price: formData.price !== '' && formData.price !== null ? parseFloat(formData.price) : 0,
        stock: formData.stock !== '' && formData.stock !== null ? parseInt(formData.stock, 10) : 0,
      };
      
      // Only add warranty_months if it has a value (including 0)
      if (formData.warranty_months !== '' && formData.warranty_months !== null && formData.warranty_months !== undefined) {
        submitData.warranty_months = parseInt(formData.warranty_months, 10);
      }
      
      if (editingProduct) {
        await axios.put(`${API}/products/${editingProduct.id}`, submitData);
        toast.success('Product updated successfully');
      } else {
        await axios.post(`${API}/products`, submitData);
        toast.success('Product created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      toast.error(formatErrorMessageLocal(error));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`${API}/products/${id}`);
        toast.success('Product deleted successfully');
        fetchProducts();
      } catch (error) {
        toast.error('Failed to delete product');
      }
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData(product);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '', sku: '', category: '', price: '', stock: '', description: '',
      generic_name: '', brand: '', batch_number: '', expiry_date: '', imei: '', warranty_months: '', branch_id: ''
    });
    setEditingProduct(null);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = !branchFilter || p.branch_id === branchFilter;
    return matchesSearch && matchesBranch;
  });

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <BackButton className="mb-4" />
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Products</h1>
            <p className="text-slate-400">Manage your inventory</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="btn-primary flex items-center gap-2"
            data-testid="add-product-button"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>

        {/* Search and Filter */}
        <div className="glass-card p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                data-testid="product-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-11 pr-4 py-3 rounded-xl"
              />
            </div>
            <div>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="glass-card p-6">
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} data-testid={`product-row-${product.id}`}>
                    <td className="font-semibold text-white">{product.name}</td>
                    <td className="text-slate-300">{product.sku || '-'}</td>
                    <td>
                      <span className="badge badge-info">{product.category}</span>
                    </td>
                    <td className="text-green-400 font-semibold">${product.price}</td>
                    <td>
                      <span className={`badge ${product.stock < 10 ? 'badge-warning' : 'badge-success'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                          data-testid="edit-product-button"
                        >
                          <Edit2 className="w-4 h-4 text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          data-testid="delete-product-button"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              
              {/* Branch Selection - Below Title */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Branch <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.branch_id}
                  onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  <option value="">Select a branch...</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} {branch.branch_code ? `(${branch.branch_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Product Name</label>
                    <input
                      data-testid="product-name-input"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">SKU</label>
                    <input
                      data-testid="product-sku-input"
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                    <input
                      data-testid="product-category-input"
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Price</label>
                    <input
                      data-testid="product-price-input"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Stock</label>
                    <input
                      data-testid="product-stock-input"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Brand</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full"
                    rows="3"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1" data-testid="submit-product-button">
                    {editingProduct ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="btn-secondary flex-1"
                    data-testid="cancel-product-button"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </motion.div>
    </SectorLayout>
  );
};

export default ProductsPage;