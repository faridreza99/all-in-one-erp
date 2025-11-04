import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  ArrowRightLeft, Package, Building2, Hash, Calendar, 
  FileText, AlertCircle, CheckCircle, X, Download 
} from 'lucide-react';
import BackButton from '../components/BackButton';
import SectorLayout from '../components/SectorLayout';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function StockTransferPage({ user, onLogout }) {
  const [transfers, setTransfers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [productBranches, setProductBranches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    from_branch_id: '',
    to_branch_id: '',
    quantity: 0,
    reference_note: ''
  });
  const [availableStock, setAvailableStock] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('');

  useEffect(() => {
    fetchTransfers();
    fetchBranches();
    fetchProducts();
    fetchProductBranches();
  }, []);

  const fetchTransfers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/stock-transfers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransfers(response.data);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      toast.error('Failed to load transfer history');
    }
  };

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/branches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranches(response.data.filter(b => b.is_active));
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Failed to load branches');
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    }
  };

  const fetchProductBranches = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/product-branches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProductBranches(response.data);
    } catch (error) {
      console.error('Error fetching product branches:', error);
    }
  };

  useEffect(() => {
    if (formData.product_id && formData.from_branch_id) {
      const pb = productBranches.find(
        pb => pb.product_id === parseInt(formData.product_id) && 
             pb.branch_id === parseInt(formData.from_branch_id)
      );
      setAvailableStock(pb?.stock || 0);
    } else {
      setAvailableStock(0);
    }
  }, [formData.product_id, formData.from_branch_id, productBranches]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    if (formData.quantity > availableStock) {
      toast.error(`Insufficient stock! Available: ${availableStock} units`);
      return;
    }
    
    if (formData.from_branch_id === formData.to_branch_id) {
      toast.error('Source and destination branches cannot be the same!');
      return;
    }

    if (formData.quantity <= 0) {
      toast.error('Quantity must be greater than zero!');
      return;
    }
    
    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const confirmTransfer = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/stock-transfers`, {
        ...formData,
        product_id: parseInt(formData.product_id),
        from_branch_id: parseInt(formData.from_branch_id),
        to_branch_id: parseInt(formData.to_branch_id),
        quantity: parseInt(formData.quantity)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Stock transfer completed successfully!');
      setShowConfirmModal(false);
      setShowForm(false);
      setFormData({ 
        product_id: '', 
        from_branch_id: '', 
        to_branch_id: '', 
        quantity: 0, 
        reference_note: '' 
      });
      fetchTransfers();
      fetchProductBranches();
    } catch (error) {
      console.error('Error creating transfer:', error);
      toast.error(error.response?.data?.detail || 'Error creating transfer');
      setShowConfirmModal(false);
    }
  };

  const getBranchName = (branchId) => {
    return branches.find(b => b.id === branchId)?.name || 'Unknown';
  };

  const getProductName = (productId) => {
    return products.find(p => p.id === productId)?.name || 'Unknown';
  };

  const getProductSKU = (productId) => {
    return products.find(p => p.id === productId)?.sku || '';
  };

  const exportToCSV = () => {
    const headers = ['Transfer #', 'Product', 'SKU', 'From Branch', 'To Branch', 'Quantity', 'Date', 'Note'];
    const csvData = transfers.map(t => [
      t.transfer_number,
      getProductName(t.product_id),
      getProductSKU(t.product_id),
      getBranchName(t.from_branch_id),
      getBranchName(t.to_branch_id),
      t.quantity,
      new Date(t.created_at).toLocaleString(),
      t.reference_note || ''
    ]);
    
    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-transfers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Transfer history exported successfully!');
  };

  // Filter transfers
  const filteredTransfers = transfers.filter(transfer => {
    const productName = getProductName(transfer.product_id).toLowerCase();
    const transferNumber = transfer.transfer_number.toLowerCase();
    const fromBranch = getBranchName(transfer.from_branch_id);
    const toBranch = getBranchName(transfer.to_branch_id);
    const matchesSearch = productName.includes(searchTerm.toLowerCase()) || 
                         transferNumber.includes(searchTerm.toLowerCase());
    const matchesBranch = !filterBranch || 
                         transfer.from_branch_id === parseInt(filterBranch) ||
                         transfer.to_branch_id === parseInt(filterBranch);
    return matchesSearch && matchesBranch;
  });

  const selectedProduct = products.find(p => p.id === parseInt(formData.product_id));
  const fromBranch = branches.find(b => b.id === parseInt(formData.from_branch_id));
  const toBranch = branches.find(b => b.id === parseInt(formData.to_branch_id));

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <BackButton className="mb-4" />
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <ArrowRightLeft className="w-10 h-10 text-blue-400" />
              Stock Transfer
            </h1>
            <p className="text-slate-400">Transfer inventory between branches</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2 font-semibold ${
              showForm 
                ? 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
            }`}
          >
            {showForm ? (
              <>
                <X className="w-5 h-5" />
                Cancel
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-5 h-5" />
                New Transfer
              </>
            )}
          </button>
        </div>

        {showForm && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Package className="w-7 h-7 text-blue-400" />
              Create Stock Transfer
            </h2>
            
            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Product Selection */}
              <div>
                <label className="block text-slate-300 font-semibold mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-400" />
                  Product <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                  required
                >
                  <option value="">Select Product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
              </div>

              {/* Branch Selection Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-red-400" />
                    From Branch <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.from_branch_id}
                    onChange={(e) => setFormData({ ...formData, from_branch_id: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
                    required
                  >
                    <option value="">Select Source Branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-green-400" />
                    To Branch <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.to_branch_id}
                    onChange={(e) => setFormData({ ...formData, to_branch_id: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all"
                    required
                  >
                    <option value="">Select Destination Branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Available Stock Alert */}
              {availableStock > 0 && formData.product_id && formData.from_branch_id && (
                <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-4">
                  <p className="text-blue-300 font-semibold flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Available Stock in Source Branch: <span className="text-blue-400 text-xl">{availableStock}</span> units
                  </p>
                </div>
              )}

              {availableStock === 0 && formData.product_id && formData.from_branch_id && (
                <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-xl p-4">
                  <p className="text-red-300 font-semibold flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    No stock available in the selected source branch!
                  </p>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-slate-300 font-semibold mb-2 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-yellow-400" />
                  Quantity to Transfer <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  placeholder="Enter quantity"
                  value={formData.quantity || ''}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none transition-all"
                  min="1"
                  max={availableStock}
                  required
                />
              </div>

              {/* Reference Note */}
              <div>
                <label className="block text-slate-300 font-semibold mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  Reference Note (Optional)
                </label>
                <textarea
                  placeholder="Add any notes or reference for this transfer..."
                  value={formData.reference_note}
                  onChange={(e) => setFormData({ ...formData, reference_note: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all resize-none"
                  rows="3"
                ></textarea>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
                disabled={availableStock === 0}
              >
                <ArrowRightLeft className="w-5 h-5" />
                Transfer Stock
              </button>
            </form>
          </motion.div>
        )}

        {/* Transfer History Section */}
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-7 h-7 text-blue-400" />
              Transfer History
            </h2>
            <button
              onClick={exportToCSV}
              disabled={transfers.length === 0}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          {/* Search and Filter */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <input
              type="text"
              placeholder="Search by product or transfer number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
            />
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
            >
              <option value="">All Branches</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>

          {/* Transfer Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-4 px-4 text-slate-300 font-semibold">Transfer #</th>
                  <th className="text-left py-4 px-4 text-slate-300 font-semibold">Product</th>
                  <th className="text-left py-4 px-4 text-slate-300 font-semibold">From Branch</th>
                  <th className="text-left py-4 px-4 text-slate-300 font-semibold">To Branch</th>
                  <th className="text-left py-4 px-4 text-slate-300 font-semibold">Quantity</th>
                  <th className="text-left py-4 px-4 text-slate-300 font-semibold">Date</th>
                  <th className="text-left py-4 px-4 text-slate-300 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.length > 0 ? (
                  filteredTransfers.map((transfer) => (
                    <tr 
                      key={transfer.id} 
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <span className="font-mono text-sm font-bold text-blue-400 flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {transfer.transfer_number}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-white">{getProductName(transfer.product_id)}</span>
                        <p className="text-slate-400 text-sm">{getProductSKU(transfer.product_id)}</p>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-lg text-sm font-semibold border border-red-500/30 inline-flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {getBranchName(transfer.from_branch_id)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-lg text-sm font-semibold border border-green-500/30 inline-flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {getBranchName(transfer.to_branch_id)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-yellow-400">{transfer.quantity}</span>
                      </td>
                      <td className="py-4 px-4 text-slate-300 text-sm">
                        {new Date(transfer.created_at).toLocaleDateString()}
                        <p className="text-slate-500 text-xs">
                          {new Date(transfer.created_at).toLocaleTimeString()}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-slate-400 text-sm max-w-xs truncate">
                        {transfer.reference_note || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <ArrowRightLeft className="w-16 h-16 text-slate-600" />
                        <p className="text-slate-400 text-lg">
                          {transfers.length === 0 ? 'No stock transfers yet' : 'No transfers match your search'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          {filteredTransfers.length > 0 && (
            <div className="mt-6 text-slate-400 text-sm">
              Showing {filteredTransfers.length} of {transfers.length} transfers
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">Confirm Transfer</h3>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-slate-300 text-lg">
                  Are you sure you want to transfer the following stock?
                </p>
                
                <div className="bg-slate-700/50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Product:</span>
                    <span className="text-white font-semibold">{selectedProduct?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">From:</span>
                    <span className="text-red-400 font-semibold">{fromBranch?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">To:</span>
                    <span className="text-green-400 font-semibold">{toBranch?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Quantity:</span>
                    <span className="text-yellow-400 font-bold text-xl">{formData.quantity} units</span>
                  </div>
                </div>

                <p className="text-slate-500 text-sm italic">
                  This action will deduct stock from the source branch and add it to the destination branch.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={confirmTransfer}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Confirm Transfer
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </SectorLayout>
  );
}

export default StockTransferPage;
