import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { DollarSign, Plus } from 'lucide-react';
import SectorLayout from '../../components/SectorLayout';
import { API } from '../../App';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Footer from '../../components/Footer';

const BillingPage = ({ user, onLogout }) => {
  const [billings, setBillings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    job_file_id: '',
    client_name: '',
    cnf_charges: '',
    transport_charges: '',
    documentation_charges: '',
    port_charges: '',
    other_charges: '0',
    discount: '0',
    payment_status: 'pending'
  });

  useEffect(() => {
    fetchBillings();
  }, []);

  const fetchBillings = async () => {
    try {
      const response = await axios.get(`${API}/cnf/billing`);
      setBillings(response.data);
    } catch (error) {
      toast.error('Failed to fetch billings');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/cnf/billing`, formData);
      toast.success('Invoice created successfully');
      setShowModal(false);
      resetForm();
      fetchBillings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create invoice');
    }
  };

  const resetForm = () => {
    setFormData({
      job_file_id: '',
      client_name: '',
      cnf_charges: '',
      transport_charges: '',
      documentation_charges: '',
      port_charges: '',
      other_charges: '0',
      discount: '0',
      payment_status: 'pending'
    });
  };

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <div className="min-h-screen gradient-bg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                CNF Billing
              </h1>
              <p className="text-gray-400">Manage invoices and payments</p>
            </div>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all"
            >
              <Plus className="w-5 h-5" />
              Create Invoice
            </button>
          </div>

          <div className="grid gap-4">
            {billings.map((billing) => (
              <motion.div
                key={billing.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-green-500 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{billing.invoice_number}</h3>
                      <p className="text-gray-400">{billing.client_name}</p>
                      <div className={`inline-block px-3 py-1 rounded-full text-sm mt-2 ${
                        billing.payment_status === 'paid' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {billing.payment_status?.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(billing.total_amount)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">CNF Charges</p>
                    <p className="text-white font-semibold">{formatCurrency(billing.cnf_charges)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Transport</p>
                    <p className="text-white font-semibold">{formatCurrency(billing.transport_charges)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Documentation</p>
                    <p className="text-white font-semibold">{formatCurrency(billing.documentation_charges)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Port Charges</p>
                    <p className="text-white font-semibold">{formatCurrency(billing.port_charges)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {showModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full"
              >
                <h2 className="text-2xl font-bold text-white mb-6">Create Invoice</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Job File ID *</label>
                      <input
                        type="text"
                        required
                        value={formData.job_file_id}
                        onChange={(e) => setFormData({ ...formData, job_file_id: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-green-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Client Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.client_name}
                        onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-green-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">CNF Charges *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={formData.cnf_charges}
                        onChange={(e) => setFormData({ ...formData, cnf_charges: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-green-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Transport Charges *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={formData.transport_charges}
                        onChange={(e) => setFormData({ ...formData, transport_charges: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-green-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Documentation Charges *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={formData.documentation_charges}
                        onChange={(e) => setFormData({ ...formData, documentation_charges: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-green-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Port Charges *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={formData.port_charges}
                        onChange={(e) => setFormData({ ...formData, port_charges: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-green-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 justify-end mt-6">
                    <button
                      type="button"
                      onClick={() => { setShowModal(false); resetForm(); }}
                      className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all"
                    >
                      Create Invoice
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </div>
        <Footer />
      </div>
    </SectorLayout>
  );
};

export default BillingPage;
