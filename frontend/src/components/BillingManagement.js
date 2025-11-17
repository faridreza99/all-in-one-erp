import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { CreditCard, DollarSign, Calendar, Receipt, Check, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../App';

const BillingManagement = () => {
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [payments, setPayments] = useState([]);

  const [assignForm, setAssignForm] = useState({
    tenant_id: '',
    plan_id: 'free',
    billing_cycle: '',
    notes: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    subscription_id: '',
    amount: '',
    payment_method: 'bank_transfer',
    payment_date: new Date().toISOString().split('T')[0],
    receipt_number: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, subsRes, tenantsRes] = await Promise.all([
        axios.get(`${API}/super/plans`),
        axios.get(`${API}/super/subscriptions`),
        axios.get(`${API}/tenants`)
      ]);
      setPlans(plansRes.data.plans || []);
      setSubscriptions(subsRes.data.subscriptions || []);
      setTenants(tenantsRes.data || []);
    } catch (error) {
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPlan = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/super/subscriptions`, assignForm);
      toast.success('Subscription created successfully');
      setShowAssignModal(false);
      setAssignForm({ tenant_id: '', plan_id: 'free', billing_cycle: '', notes: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create subscription');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/super/payments`, paymentForm);
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setPaymentForm({
        subscription_id: '',
        amount: '',
        payment_method: 'bank_transfer',
        payment_date: new Date().toISOString().split('T')[0],
        receipt_number: '',
        notes: ''
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    }
  };

  const loadPaymentHistory = async (subscriptionId) => {
    try {
      const res = await axios.get(`${API}/super/payments/${subscriptionId}`);
      setPayments(res.data.payments || []);
    } catch (error) {
      toast.error('Failed to load payment history');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      trial: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      grace: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      suspended: 'bg-red-500/20 text-red-400 border-red-500/30',
      cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[status] || colors.cancelled}`}>
        {status?.toUpperCase()}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Billing Management
        </h2>
        <button
          onClick={() => setShowAssignModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all flex items-center gap-2"
        >
          <CreditCard className="w-4 h-4" />
          Assign Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <motion.div
            key={plan.plan_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10"
          >
            <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
            <div className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {formatCurrency(plan.price)}
              {plan.billing_cycle !== 'lifetime' && <span className="text-sm text-gray-400">/{plan.billing_cycle}</span>}
            </div>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex justify-between">
                <span>Products:</span>
                <span className="text-white">{plan.quotas.max_products === -1 ? '∞' : plan.quotas.max_products}</span>
              </div>
              <div className="flex justify-between">
                <span>Users:</span>
                <span className="text-white">{plan.quotas.max_users === -1 ? '∞' : plan.quotas.max_users}</span>
              </div>
              <div className="flex justify-between">
                <span>Branches:</span>
                <span className="text-white">{plan.quotas.max_branches === -1 ? '∞' : plan.quotas.max_branches}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-xl font-bold">Active Subscriptions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Billing</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {subscriptions.map((sub) => {
                const tenant = tenants.find(t => t.tenant_id === sub.tenant_id);
                return (
                  <tr key={sub.subscription_id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">{tenant?.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-400">{sub.tenant_id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{sub.plan_snapshot?.name || sub.plan_id}</div>
                      <div className="text-xs text-gray-400">{formatCurrency(sub.plan_snapshot?.price || 0)}</div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(sub.status)}</td>
                    <td className="px-6 py-4 capitalize">{sub.billing_cycle}</td>
                    <td className="px-6 py-4">
                      <div className={sub.expires_on && new Date(sub.expires_on) < new Date() ? 'text-red-400' : 'text-white'}>
                        {formatDate(sub.expires_on)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedSubscription(sub);
                            setPaymentForm({ ...paymentForm, subscription_id: sub.subscription_id });
                            setShowPaymentModal(true);
                            loadPaymentHistory(sub.subscription_id);
                          }}
                          className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all text-sm flex items-center gap-1"
                        >
                          <Receipt className="w-3 h-3" />
                          Payment
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {subscriptions.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No subscriptions found</p>
            </div>
          )}
        </div>
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-white/10"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Assign Subscription</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignPlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tenant</label>
                <select
                  value={assignForm.tenant_id}
                  onChange={(e) => setAssignForm({ ...assignForm, tenant_id: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  required
                >
                  <option value="">Select Tenant</option>
                  {tenants.filter(t => !subscriptions.find(s => s.tenant_id === t.tenant_id)).map(tenant => (
                    <option key={tenant.tenant_id} value={tenant.tenant_id}>{tenant.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Plan</label>
                <select
                  value={assignForm.plan_id}
                  onChange={(e) => setAssignForm({ ...assignForm, plan_id: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  required
                >
                  {plans.map(plan => (
                    <option key={plan.plan_id} value={plan.plan_id}>
                      {plan.name} - {formatCurrency(plan.price)}/{plan.billing_cycle}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Billing Cycle (Optional)</label>
                <select
                  value={assignForm.billing_cycle}
                  onChange={(e) => setAssignForm({ ...assignForm, billing_cycle: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                >
                  <option value="">Use Plan Default</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                  <option value="lifetime">Lifetime</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                Assign Subscription
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-xl p-6 max-w-2xl w-full border border-white/10 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Record Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Payment Method</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="wire">Wire Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Receipt Number</label>
                <input
                  type="text"
                  value={paymentForm.receipt_number}
                  onChange={(e) => setPaymentForm({ ...paymentForm, receipt_number: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  rows={2}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all"
              >
                Record Payment
              </button>
            </form>

            {payments.length > 0 && (
              <div className="border-t border-white/10 pt-6">
                <h4 className="font-bold mb-4">Payment History</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {payments.map((payment) => (
                    <div key={payment.payment_id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-green-400">{formatCurrency(payment.amount)}</div>
                          <div className="text-xs text-gray-400">{formatDate(payment.payment_date)}</div>
                          <div className="text-xs text-gray-400 capitalize">{payment.payment_method}</div>
                        </div>
                        <div className="text-right">
                          {payment.receipt_number && (
                            <div className="text-xs text-gray-400">#{payment.receipt_number}</div>
                          )}
                          <div className="text-xs text-gray-400">by {payment.recorded_by}</div>
                        </div>
                      </div>
                      {payment.notes && (
                        <div className="text-xs text-gray-400 mt-2">{payment.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BillingManagement;
