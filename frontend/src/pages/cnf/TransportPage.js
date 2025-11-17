import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Truck, Plus, Edit2, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import SectorLayout from '../../components/SectorLayout';
import { API } from '../../App';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Footer from '../../components/Footer';

const TransportPage = ({ user, onLogout }) => {
  const [transports, setTransports] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    job_file_id: '',
    shipment_id: '',
    vehicle_number: '',
    driver_name: '',
    driver_phone: '',
    pickup_location: '',
    delivery_location: '',
    scheduled_date: '',
    transport_cost: ''
  });

  useEffect(() => {
    fetchTransports();
  }, []);

  const fetchTransports = async () => {
    try {
      const response = await axios.get(`${API}/cnf/transport`);
      setTransports(response.data);
    } catch (error) {
      toast.error('Failed to fetch transports');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/cnf/transport`, formData);
      toast.success('Transport scheduled successfully');
      setShowModal(false);
      resetForm();
      fetchTransports();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to schedule transport');
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`${API}/cnf/transport/${id}`);
        toast.success('Transport deleted successfully');
        fetchTransports();
      } catch (error) {
        toast.error('Failed to delete transport');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      job_file_id: '',
      shipment_id: '',
      vehicle_number: '',
      driver_name: '',
      driver_phone: '',
      pickup_location: '',
      delivery_location: '',
      scheduled_date: '',
      transport_cost: ''
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-blue-500/20 text-blue-400',
      in_transit: 'bg-orange-500/20 text-orange-400',
      delivered: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-red-500/20 text-red-400'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <div className="min-h-screen gradient-bg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                Transport Management
              </h1>
              <p className="text-gray-400">Schedule and track deliveries</p>
            </div>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all"
            >
              <Plus className="w-5 h-5" />
              Schedule Transport
            </button>
          </div>

          <div className="grid gap-4">
            {transports.map((transport) => (
              <motion.div
                key={transport.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-orange-500 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600">
                      <Truck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{transport.transport_number}</h3>
                      <p className="text-gray-400">{transport.driver_name}</p>
                      <div className={`inline-block px-3 py-1 rounded-full text-sm mt-2 ${getStatusColor(transport.status)}`}>
                        {transport.status?.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(transport.id)}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Vehicle</p>
                    <p className="text-white font-semibold">{transport.vehicle_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Driver Phone</p>
                    <p className="text-white font-semibold">{transport.driver_phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Scheduled Date</p>
                    <p className="text-white font-semibold">{formatDate(transport.scheduled_date)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Cost</p>
                    <p className="text-white font-semibold">{formatCurrency(transport.transport_cost)}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-gray-400">From</p>
                    <p className="text-white font-semibold">{transport.pickup_location}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-gray-400">To</p>
                    <p className="text-white font-semibold">{transport.delivery_location}</p>
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
                <h2 className="text-2xl font-bold text-white mb-6">Schedule Transport</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Job File ID *</label>
                      <input
                        type="text"
                        required
                        value={formData.job_file_id}
                        onChange={(e) => setFormData({ ...formData, job_file_id: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Shipment ID *</label>
                      <input
                        type="text"
                        required
                        value={formData.shipment_id}
                        onChange={(e) => setFormData({ ...formData, shipment_id: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Vehicle Number *</label>
                      <input
                        type="text"
                        required
                        value={formData.vehicle_number}
                        onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Driver Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.driver_name}
                        onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Driver Phone *</label>
                      <input
                        type="tel"
                        required
                        value={formData.driver_phone}
                        onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Scheduled Date *</label>
                      <input
                        type="date"
                        required
                        value={formData.scheduled_date}
                        onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Pickup Location *</label>
                      <input
                        type="text"
                        required
                        value={formData.pickup_location}
                        onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Delivery Location *</label>
                      <input
                        type="text"
                        required
                        value={formData.delivery_location}
                        onChange={(e) => setFormData({ ...formData, delivery_location: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Transport Cost *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={formData.transport_cost}
                        onChange={(e) => setFormData({ ...formData, transport_cost: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
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
                      className="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all"
                    >
                      Schedule Transport
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

export default TransportPage;
