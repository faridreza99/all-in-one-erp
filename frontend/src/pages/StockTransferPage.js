import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRightLeft, Package, Building2, Hash, Calendar, 
  FileText, AlertCircle, CheckCircle, X, Download, Plus, Trash2, Send
} from 'lucide-react';
import BackButton from '../components/BackButton';
import SectorLayout from '../components/SectorLayout';
import { toast } from 'sonner';
import { API } from '../App';

function StockTransferPage({ user, onLogout }) {
  const [transfers, setTransfers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [productBranches, setProductBranches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const [transferCart, setTransferCart] = useState([]);
  const [fromBranchId, setFromBranchId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [referenceNote, setReferenceNote] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(0);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTransfers();
    fetchBranches();
    fetchProducts();
    fetchProductBranches();
  }, []);

  const fetchTransfers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/stock-transfers`, {
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
      const response = await axios.get(`${API}/branches`, {
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
      const response = await axios.get(`${API}/products`, {
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
      const response = await axios.get(`${API}/product-branches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProductBranches(response.data);
    } catch (error) {
      console.error('Error fetching product branches:', error);
    }
  };

  const getAvailableStock = (productId, branchId) => {
    if (!productId || !branchId) return 0;
    const pb = productBranches.find(
      pb => pb.product_id === productId && pb.branch_id === branchId
    );
    return pb?.stock || 0;
  };

  const addToCart = () => {
    if (!selectedProductId || !fromBranchId || !toBranchId) {
      toast.error('Please select product and branches');
      return;
    }

    if (fromBranchId === toBranchId) {
      toast.error('Source and destination branches must be different');
      return;
    }

    if (quantity <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }

    const availableStock = getAvailableStock(selectedProductId, fromBranchId);
    if (quantity > availableStock) {
      toast.error(`Insufficient stock! Available: ${availableStock} units`);
      return;
    }

    const existingItem = transferCart.find(item => item.product_id === selectedProductId);
    if (existingItem) {
      const totalQuantity = existingItem.quantity + quantity;
      if (totalQuantity > availableStock) {
        toast.error(`Cannot add more! Total would exceed available stock (${availableStock} units)`);
        return;
      }
      setTransferCart(transferCart.map(item =>
        item.product_id === selectedProductId
          ? { ...item, quantity: totalQuantity }
          : item
      ));
    } else {
      const product = products.find(p => p.id === selectedProductId);
      setTransferCart([...transferCart, {
        product_id: selectedProductId,
        product_name: product?.name || 'Unknown',
        product_sku: product?.sku || '',
        quantity: quantity,
        available_stock: availableStock
      }]);
    }

    setSelectedProductId('');
    setQuantity(0);
    toast.success('Product added to transfer list');
  };

  const removeFromCart = (productId) => {
    setTransferCart(transferCart.filter(item => item.product_id !== productId));
    toast.info('Product removed from transfer list');
  };

  const updateCartQuantity = (productId, newQuantity) => {
    const availableStock = getAvailableStock(productId, fromBranchId);
    if (newQuantity > availableStock) {
      toast.error(`Cannot exceed available stock (${availableStock} units)`);
      return;
    }
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setTransferCart(transferCart.map(item =>
      item.product_id === productId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const handleSubmitTransfer = () => {
    if (transferCart.length === 0) {
      toast.error('Please add at least one product to transfer');
      return;
    }

    if (!fromBranchId || !toBranchId) {
      toast.error('Please select source and destination branches');
      return;
    }

    if (fromBranchId === toBranchId) {
      toast.error('Source and destination branches must be different');
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmTransfer = async () => {
    setIsSubmitting(true);
    setShowConfirmModal(false);
    
    try {
      const token = localStorage.getItem('token');
      let successCount = 0;
      let failCount = 0;

      for (const item of transferCart) {
        try {
          await axios.post(`${API}/stock-transfers`, {
            product_id: parseInt(item.product_id),
            from_branch_id: parseInt(fromBranchId),
            to_branch_id: parseInt(toBranchId),
            quantity: parseInt(item.quantity),
            reference_note: referenceNote || null
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to transfer ${item.product_name}:`, error);
          failCount++;
          toast.error(`Failed to transfer ${item.product_name}: ${error.response?.data?.detail || 'Unknown error'}`);
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully transferred ${successCount} product(s)!`);
        setTransferCart([]);
        setFromBranchId('');
        setToBranchId('');
        setReferenceNote('');
        setShowForm(false);
        await fetchTransfers();
        await fetchProductBranches();
      }

      if (failCount > 0 && successCount === 0) {
        toast.error('All transfers failed. Please try again.');
      }
    } catch (error) {
      toast.error('An error occurred during transfer');
    } finally {
      setIsSubmitting(false);
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

  const escapeCSVField = (field) => {
    if (field === null || field === undefined) return '';
    const stringField = String(field);
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  };

  const exportToCSV = () => {
    const headers = ['Transfer #', 'Product', 'SKU', 'From Branch', 'To Branch', 'Quantity', 'Date', 'Note'];
    const csvData = transfers.map(t => [
      escapeCSVField(t.transfer_number),
      escapeCSVField(getProductName(t.product_id)),
      escapeCSVField(getProductSKU(t.product_id)),
      escapeCSVField(getBranchName(t.from_branch_id)),
      escapeCSVField(getBranchName(t.to_branch_id)),
      escapeCSVField(t.quantity),
      escapeCSVField(new Date(t.created_at).toLocaleString()),
      escapeCSVField(t.reference_note || '')
    ]);
    
    const csv = [headers.map(escapeCSVField), ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-transfers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Transfer history exported successfully!');
  };

  const filteredTransfers = transfers
    .filter(transfer => {
      const productName = getProductName(transfer.product_id).toLowerCase();
      const transferNumber = transfer.transfer_number.toLowerCase();
      const matchesSearch = productName.includes(searchTerm.toLowerCase()) || 
                           transferNumber.includes(searchTerm.toLowerCase());
      const matchesBranch = !filterBranch || 
                           transfer.from_branch_id === parseInt(filterBranch) ||
                           transfer.to_branch_id === parseInt(filterBranch);
      return matchesSearch && matchesBranch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'date-asc':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'quantity-desc':
          return b.quantity - a.quantity;
        case 'quantity-asc':
          return a.quantity - b.quantity;
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

  const fromBranch = branches.find(b => b.id === parseInt(fromBranchId));
  const toBranch = branches.find(b => b.id === parseInt(toBranchId));

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
            <p className="text-slate-400">Transfer multiple products between branches</p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (showForm) {
                setTransferCart([]);
                setFromBranchId('');
                setToBranchId('');
                setReferenceNote('');
              }
            }}
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
              Create Multi-Product Stock Transfer
            </h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-red-400" />
                    From Branch <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={fromBranchId}
                    onChange={(e) => {
                      setFromBranchId(e.target.value);
                      setTransferCart([]);
                    }}
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
                    value={toBranchId}
                    onChange={(e) => setToBranchId(e.target.value)}
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

              {fromBranchId && toBranchId && fromBranchId !== toBranchId && (
                <>
                  <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-4">
                    <p className="text-blue-300 font-semibold flex items-center gap-2">
                      <ArrowRightLeft className="w-5 h-5" />
                      Transfer Route: <span className="text-white">{fromBranch?.name}</span> 
                      <span className="text-blue-400">→</span> 
                      <span className="text-white">{toBranch?.name}</span>
                    </p>
                  </div>

                  <div className="border-t border-slate-700/50 pt-6">
                    <h3 className="text-xl font-bold text-white mb-4">Add Products to Transfer</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="md:col-span-1">
                        <label className="block text-slate-300 font-semibold mb-2">Product</label>
                        <select
                          value={selectedProductId}
                          onChange={(e) => setSelectedProductId(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                        >
                          <option value="">Select Product</option>
                          {products.map(product => {
                            const stock = getAvailableStock(product.id, fromBranchId);
                            return (
                              <option key={product.id} value={product.id}>
                                {product.name} ({product.sku}) - Stock: {stock}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-2">Quantity</label>
                        <input
                          type="number"
                          value={quantity || ''}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none transition-all"
                          min="1"
                          placeholder="0"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={addToCart}
                          className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                        >
                          <Plus className="w-5 h-5" />
                          Add Product
                        </button>
                      </div>
                    </div>

                    {transferCart.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-lg font-bold text-white mb-3">Products to Transfer ({transferCart.length})</h4>
                        <div className="space-y-2">
                          {transferCart.map((item) => (
                            <motion.div
                              key={item.product_id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              className="glass-card p-4 flex items-center justify-between"
                            >
                              <div className="flex-1">
                                <p className="text-white font-semibold">{item.product_name}</p>
                                <p className="text-slate-400 text-sm">SKU: {item.product_sku} • Available: {item.available_stock} units</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)}
                                    className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateCartQuantity(item.product_id, parseInt(e.target.value) || 1)}
                                    className="w-20 px-2 py-1 text-center rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 focus:outline-none"
                                    min="1"
                                    max={item.available_stock}
                                  />
                                  <button
                                    onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}
                                    className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
                                  >
                                    +
                                  </button>
                                </div>
                                <button
                                  onClick={() => removeFromCart(item.product_id)}
                                  className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      Reference Note 
                    </label>
                    <textarea
                      value={referenceNote}
                      onChange={(e) => setReferenceNote(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all resize-none"
                      rows="3"
                      placeholder="Add a note about this transfer..."
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitTransfer}
                    disabled={transferCart.length === 0 || isSubmitting}
                    className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Complete Transfer ({transferCart.length} {transferCart.length === 1 ? 'Product' : 'Products'})
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}

        <div className="glass-card p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-white">Transfer History</h2>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Search transfers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Branches</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="quantity-desc">Highest Quantity</option>
                <option value="quantity-asc">Lowest Quantity</option>
              </select>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-semibold flex items-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">Transfer #</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">Product</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">From → To</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">Quantity</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">Date</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-400">
                      No transfers found
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((transfer) => (
                    <tr key={transfer.id} className="border-b border-slate-700/30 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-blue-400 font-mono">{transfer.transfer_number}</td>
                      <td className="py-3 px-4 text-white">
                        <div>{getProductName(transfer.product_id)}</div>
                        <div className="text-sm text-slate-400">{getProductSKU(transfer.product_id)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-white">
                          <span className="text-red-400">{getBranchName(transfer.from_branch_id)}</span>
                          <ArrowRightLeft className="w-4 h-4 text-slate-500" />
                          <span className="text-green-400">{getBranchName(transfer.to_branch_id)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-white font-semibold">{transfer.quantity}</td>
                      <td className="py-3 px-4 text-slate-300">
                        {new Date(transfer.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-sm">{transfer.reference_note || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-700"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">Confirm Transfer</h3>
              </div>
              <p className="text-slate-300 mb-6">
                You are about to transfer <span className="text-white font-bold">{transferCart.length} product(s)</span> from{' '}
                <span className="text-red-400 font-bold">{fromBranch?.name}</span> to{' '}
                <span className="text-green-400 font-bold">{toBranch?.name}</span>.
              </p>
              
              <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
                <h4 className="text-white font-semibold mb-2">Transfer Summary:</h4>
                <div className="space-y-1">
                  {transferCart.map((item) => (
                    <div key={item.product_id} className="text-slate-300 text-sm flex justify-between">
                      <span>{item.product_name}</span>
                      <span className="text-blue-400 font-semibold">{item.quantity} units</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmTransfer}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all"
                >
                  Confirm Transfer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </SectorLayout>
  );
}

export default StockTransferPage;
