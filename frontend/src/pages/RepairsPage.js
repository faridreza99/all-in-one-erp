import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Plus, Wrench } from 'lucide-react';
import Layout from '../components/Layout';
import { API } from '../App';
import { toast } from 'sonner';

const RepairsPage = ({ user, onLogout }) => {
  const [repairs, setRepairs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    device_model: '',
    imei: '',
    issue_description: '',
    estimated_cost: ''
  });

  useEffect(() => {
    fetchRepairs();
  }, []);

  const fetchRepairs = async () => {
    try {
      const response = await axios.get(`${API}/repairs`);
      setRepairs(response.data);
    } catch (error) {
      toast.error('Failed to fetch repair tickets');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/repairs`, formData);
      toast.success('Repair ticket created successfully');
      setShowModal(false);
      setFormData({
        customer_name: '', customer_phone: '', device_model: '',
        imei: '', issue_description: '', estimated_cost: ''
      });
      fetchRepairs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create ticket');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.patch(`${API}/repairs/${id}/status?status=${status}`);
      toast.success('Status updated');
      fetchRepairs();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Repair Tickets</h1>
            <p className="text-slate-400">Manage device repairs</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
            data-testid="add-repair-button"
          >
            <Plus className="w-5 h-5" />
            New Repair
          </button>
        </div>

        <div className="glass-card p-6">
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Customer</th>
                  <th>Device</th>
                  <th>Issue</th>
                  <th>Cost</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {repairs.map((repair) => (
                  <tr key={repair.id} data-testid={`repair-row-${repair.id}`}>
                    <td className="font-semibold text-blue-400">{repair.ticket_number}</td>
                    <td>
                      <div>
                        <p className="text-white font-medium">{repair.customer_name}</p>
                        <p className="text-slate-400 text-sm">{repair.customer_phone}</p>
                      </div>
                    </td>
                    <td className="text-slate-300">{repair.device_model}</td>
                    <td className="text-slate-300 max-w-xs truncate">{repair.issue_description}</td>
                    <td className="text-green-400 font-semibold">${repair.estimated_cost}</td>
                    <td>
                      <span className={`badge ${
                        repair.status === 'received' ? 'badge-info' :
                        repair.status === 'in_repair' ? 'badge-warning' :
                        repair.status === 'ready' ? 'badge-success' :
                        'badge-success'
                      }`}>
                        {repair.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      {repair.status === 'received' && (
                        <button
                          onClick={() => updateStatus(repair.id, 'in_repair')}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                          data-testid="start-repair"
                        >
                          Start Repair
                        </button>
                      )}
                      {repair.status === 'in_repair' && (
                        <button
                          onClick={() => updateStatus(repair.id, 'ready')}
                          className="text-green-400 hover:text-green-300 text-sm"
                          data-testid="mark-ready"
                        >
                          Mark Ready
                        </button>
                      )}
                      {repair.status === 'ready' && (
                        <button
                          onClick={() => updateStatus(repair.id, 'delivered')}
                          className="text-purple-400 hover:text-purple-300 text-sm"
                          data-testid="mark-delivered"
                        >
                          Delivered
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 w-full max-w-md"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Create Repair Ticket</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Customer Name</label>
                  <input
                    data-testid="repair-customer-name"
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                  <input
                    data-testid="repair-customer-phone"
                    type="tel"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Device Model</label>
                  <input
                    data-testid="repair-device-model"
                    type="text"
                    value={formData.device_model}
                    onChange={(e) => setFormData({ ...formData, device_model: e.target.value })}
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">IMEI (Optional)</label>
                  <input
                    type="text"
                    value={formData.imei}
                    onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Issue Description</label>
                  <textarea
                    data-testid="repair-issue-description"
                    value={formData.issue_description}
                    onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })}
                    className="w-full"
                    rows="3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Estimated Cost</label>
                  <input
                    data-testid="repair-estimated-cost"
                    type="number"
                    step="0.01"
                    value={formData.estimated_cost}
                    onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                    className="w-full"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1" data-testid="submit-repair">Create</button>
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
      </motion.div>
    </Layout>
  );
};

export default RepairsPage;