import React, { Payment MethoduseState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { DollarSign, Users, AlertCircle, Calendar, Search, CreditCard, X } from 'lucide-react';
import axios from 'axios';
import SectorLayout from '../components/SectorLayout';
import { formatCurrency } from '../utils/formatters';
import { API } from '../App';

const CustomerDuesPage = ({ user, onLogout }) => {
  const [dues, setDues] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDue, setSelectedDue] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchDues();
  }, []);

  const fetchDues = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/customer-dues`, {
        withCredentials: true
      });
      setDues(response.data);
    } catch (error) {
      toast.error('Failed to fetch customer dues');
    } finally {
      setLoading(false);
    }
  };

  const openPaymentModal = (due) => {
    setSelectedDue(due);
    setPaymentAmount(due.due_amount.toString()); // Default to full payment
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedDue(null);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentReference('');
  };

  const handleMakePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    if (parseFloat(paymentAmount) > selectedDue.due_amount) {
      toast.error('Payment amount cannot exceed due amount');
      return;
    }

    try {
      setProcessingPayment(true);
      await axios.post(`${API}/sales/${selectedDue.sale_id}/payments`, {
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
        reference: paymentReference || undefined
      }, {
        withCredentials: true
      });

      toast.success('Payment added successfully!');
      closePaymentModal();
      fetchDues(); // Refresh dues list
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const filteredDues = dues.filter(due =>
    due.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    due.sale_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDueAmount = dues.reduce((sum, due) => sum + due.due_amount, 0);
  const totalCustomers = new Set(dues.map(due => due.customer_name)).size;

  return (
    <SectorLayout 
      user={user} 
      onLogout={onLogout} 
      title="Customer Dues"
      subtitle="Track and manage customer outstanding payments"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-red-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Outstanding</p>
                <p className="text-3xl font-bold text-white">৳{totalDueAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-7 h-7 text-orange-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Customers with Dues</p>
                <p className="text-3xl font-bold text-white">{totalCustomers}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-yellow-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Due Records</p>
                <p className="text-3xl font-bold text-white">{dues.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="glass-card p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name or sale number..."
              className="input pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Dues Table */}
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-400" />
            Outstanding Dues
          </h2>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
              <p className="text-slate-400 mt-4">Loading dues...</p>
            </div>
          ) : filteredDues.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">
                {searchTerm ? 'No matching dues found' : 'No outstanding dues'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Sale #</th>
                    <th>Customer Name</th>
                    <th>Total Amount</th>
                    <th>Paid Amount</th>
                    <th>Due Amount</th>
                    <th>Transaction Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDues.map((due) => (
                    <tr key={due.id}>
                      <td className="font-semibold text-cyan-400">{due.sale_number}</td>
                      <td className="font-semibold text-white">{due.customer_name}</td>
                      <td className="text-slate-300">{formatCurrency(due.total_amount)}</td>
                      <td className="text-green-400">{formatCurrency(due.paid_amount)}</td>
                      <td className="text-red-400 font-bold">{formatCurrency(due.due_amount)}</td>
                      <td className="text-slate-400 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(due.transaction_date).toLocaleDateString('en-GB')}
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => openPaymentModal(due)}
                          className="btn-primary px-3 py-1 text-sm flex items-center gap-2"
                        >
                          <CreditCard className="w-4 h-4" />
                          Make Payment
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment Modal */}
        <AnimatePresence>
          {showPaymentModal && selectedDue && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-card max-w-lg w-full p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-6 h-6 text-green-400" />
                    Make Payment
                  </h3>
                  <button
                    onClick={closePaymentModal}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {/* Due Details */}
                <div className="mb-6 p-4 bg-slate-800/50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Sale Number:</span>
                    <span className="text-cyan-400 font-semibold">{selectedDue.sale_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Customer:</span>
                    <span className="text-white font-semibold">{selectedDue.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Amount:</span>
                    <span className="text-white">{formatCurrency(selectedDue.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Already Paid:</span>
                    <span className="text-green-400">{formatCurrency(selectedDue.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-slate-700 pt-2 mt-2">
                    <span className="text-white">Remaining Due:</span>
                    <span className="text-red-400">{formatCurrency(selectedDue.due_amount)}</span>
                  </div>
                </div>

                {/* Payment Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Payment Amount <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Enter payment amount"
                      className="input w-full"
                      min="0.01"
                      max={selectedDue.due_amount}
                      step="0.01"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => setPaymentAmount((selectedDue.due_amount / 2).toFixed(2))}
                        className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-white"
                      >
                        Half ({formatCurrency(selectedDue.due_amount / 2)})
                      </button>
                      <button
                        onClick={() => setPaymentAmount(selectedDue.due_amount.toString())}
                        className="px-3 py-1 text-xs bg-green-600 hover:bg-green-500 rounded text-white"
                      >
                        Full ({formatCurrency(selectedDue.due_amount)})
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="input w-full"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="mobile">Mobile Payment (bKash/Nagad)</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Transaction ID, Check #, etc."
                      className="input w-full"
                    />
                  </div>

                  {paymentAmount && parseFloat(paymentAmount) > 0 && parseFloat(paymentAmount) <= selectedDue.due_amount && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300">New Balance Due:</span>
                        <span className="text-blue-400 font-semibold">
                          {formatCurrency(selectedDue.due_amount - parseFloat(paymentAmount))}
                        </span>
                      </div>
                      {(selectedDue.due_amount - parseFloat(paymentAmount)) === 0 && (
                        <p className="text-xs text-green-400 mt-2">
                          ✓ This will fully clear the customer's due
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={closePaymentModal}
                      className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleMakePayment}
                      disabled={processingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                      className="flex-1 btn-primary py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingPayment ? 'Processing...' : 'Process Payment'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </SectorLayout>
  );
};

export default CustomerDuesPage;
