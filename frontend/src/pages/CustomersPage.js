import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Plus, Users, Phone, Mail, History, Calendar, DollarSign, ShoppingCart, Package, X } from 'lucide-react';
import SectorLayout from '../components/SectorLayout';
import BackButton from '../components/BackButton';
import { API } from '../App';
import { toast } from 'sonner';
import { formatErrorMessage } from '../utils/errorHandler';

const CustomersPage = ({ user, onLogout }) => {
  const [customers, setCustomers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    credit_limit: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setCustomers(response.data);
    } catch (error) {
      toast.error('Failed to fetch customers');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/customers`, formData);
      toast.success('Customer added successfully');
      setShowModal(false);
      setFormData({ name: '', phone: '', email: '', address: '', credit_limit: '' });
      fetchCustomers();
    } catch (error) {
      toast.error(formatErrorMessage(error, 'Failed to add customer'));
    }
  };

  const viewCustomerHistory = async (customer) => {
    setSelectedCustomer(customer);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch sales and products in parallel
      const [salesRes, productsRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/sales`, { headers }),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/products`, { headers })
      ]);

      if (salesRes.ok && productsRes.ok) {
        const allSales = await salesRes.json();
        const productsData = await productsRes.json();
        
        // Filter sales for this customer by customer_id (primary) or fallback to name
        const customerSales = allSales.filter(sale => {
          // First priority: match by customer_id
          if (sale.customer_id && customer.id) {
            return sale.customer_id === customer.id;
          }
          // Fallback: match by customer name (for older sales without customer_id)
          if (sale.customer_name && customer.name) {
            return sale.customer_name.toLowerCase() === customer.name.toLowerCase();
          }
          return false;
        });
        
        setSalesHistory(customerSales);
        setProducts(productsData);
      } else {
        toast.error('Failed to load customer history');
      }
    } catch (error) {
      console.error('Error fetching customer history:', error);
      toast.error('Failed to load customer history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.product_id === productId);
    return product?.name || 'Unknown Product';
  };

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <BackButton className="mb-4" />
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Customers</h1>
            <p className="text-slate-400">Manage your customer database</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
            data-testid="add-customer-button"
          >
            <Plus className="w-5 h-5" />
            Add Customer
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-6"
              data-testid={`customer-card-${customer.id}`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">{customer.name}</h3>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <Phone className="w-3 h-3" />
                      <span>{customer.phone}</span>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-2 text-slate-300 text-sm">
                        <Mail className="w-3 h-3" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="border-t border-slate-700 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Credit Limit</span>
                  <span className="text-green-400 font-semibold">${customer.credit_limit}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-slate-400 text-sm">Total Purchases</span>
                  <span className="text-blue-400 font-semibold">${customer.total_purchases || 0}</span>
                </div>
              </div>
              
              <button
                onClick={() => viewCustomerHistory(customer)}
                className="mt-4 w-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-500/30 text-blue-300 py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                <History className="w-4 h-4" />
                View Purchase History
              </button>
            </motion.div>
          ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 w-full max-w-md"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Add New Customer</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                  <input
                    data-testid="customer-name-input"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                  <input
                    data-testid="customer-phone-input"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full"
                    rows="2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Credit Limit</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1" data-testid="submit-customer">Add</button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Sales History Modal */}
        {showHistoryModal && selectedCustomer && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 border border-purple-500/30 rounded-3xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <Users className="w-7 h-7 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">{selectedCustomer.name}</h2>
                    <p className="text-slate-400">Purchase History</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setSelectedCustomer(null);
                    setSalesHistory([]);
                  }}
                  className="w-10 h-10 bg-red-500/20 hover:bg-red-500/30 rounded-lg flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5 text-red-400" />
                </button>
              </div>

              {/* Customer Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <ShoppingCart className="w-5 h-5 text-blue-400" />
                    <span className="text-slate-400 text-sm">Total Orders</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{salesHistory.length}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    <span className="text-slate-400 text-sm">Total Spent</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    ${salesHistory.reduce((sum, sale) => sum + (sale.total || 0), 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Package className="w-5 h-5 text-purple-400" />
                    <span className="text-slate-400 text-sm">Items Purchased</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {salesHistory.reduce((sum, sale) => {
                      const itemCount = sale.items?.reduce((count, item) => count + (item.quantity || 0), 0) || 0;
                      return sum + itemCount;
                    }, 0)}
                  </p>
                </div>
              </div>

              {/* Sales History List */}
              {loadingHistory ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full mx-auto"></div>
                  <p className="text-slate-400 mt-4">Loading history...</p>
                </div>
              ) : salesHistory.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-400" />
                    Purchase Details
                  </h3>
                  {salesHistory.map((sale, index) => (
                    <motion.div
                      key={sale.sale_number || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-gradient-to-r from-slate-800/50 to-slate-800/30 border border-slate-700/50 rounded-xl p-5"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-white font-semibold">Sale #{sale.sale_number}</p>
                            <p className="text-slate-400 text-sm">
                              {new Date(sale.created_at || sale.updated_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-400">Total Amount</p>
                          <p className="text-2xl font-bold text-green-400">
                            ${(sale.total || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Items in this sale */}
                      {sale.items && sale.items.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          <p className="text-slate-400 text-sm mb-2">Items Purchased:</p>
                          <div className="space-y-2">
                            {sale.items.map((item, itemIndex) => (
                              <div
                                key={itemIndex}
                                className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3"
                              >
                                <div className="flex items-center gap-3">
                                  <Package className="w-4 h-4 text-slate-500" />
                                  <span className="text-white">{getProductName(item.product_id)}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-slate-400 text-sm">
                                    Qty: <span className="text-white font-semibold">{item.quantity}</span>
                                  </span>
                                  <span className="text-slate-400 text-sm">
                                    @ <span className="text-blue-400 font-semibold">${item.price.toFixed(2)}</span>
                                  </span>
                                  <span className="text-green-400 font-semibold min-w-[80px] text-right">
                                    ${(item.quantity * item.price).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Payment Method */}
                      {sale.payment_method && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-slate-400 text-sm">Payment:</span>
                          <span className="text-blue-400 text-sm font-medium capitalize">
                            {sale.payment_method}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-lg">No purchase history found</p>
                  <p className="text-slate-500 text-sm mt-2">
                    This customer hasn't made any purchases yet
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </motion.div>
    </SectorLayout>
  );
};

export default CustomersPage;