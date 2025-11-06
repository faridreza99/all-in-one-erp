import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Ship, Plus, Edit2, Trash2, Eye } from 'lucide-react';
import SectorLayout from '../../components/SectorLayout';
import { API } from '../../App';
import { toast } from 'sonner';
import { formatDate } from '../../utils/formatters';
import Footer from '../../components/Footer';

const ShipmentsPage = ({ user, onLogout }) => {
  const [shipments, setShipments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingShipment, setEditingShipment] = useState(null);
  const [formData, setFormData] = useState({
    shipment_number: '',
    customer_name: '',
    consignee: '',
    origin_country: '',
    destination: '',
    shipping_line: '',
    vessel_name: '',
    bl_number: '',
    container_number: '',
    cargo_description: '',
    weight: '',
    arrival_date: '',
    clearance_date: '',
    delivery_date: ''
  });

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      const response = await axios.get(`${API}/cnf/shipments`);
      setShipments(response.data);
    } catch (error) {
      toast.error('Failed to fetch shipments');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingShipment) {
        await axios.put(`${API}/cnf/shipments/${editingShipment.id}`, formData);
        toast.success('Shipment updated successfully');
      } else {
        await axios.post(`${API}/cnf/shipments`, formData);
        toast.success('Shipment created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchShipments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save shipment');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this shipment?')) {
      try {
        await axios.delete(`${API}/cnf/shipments/${id}`);
        toast.success('Shipment deleted successfully');
        fetchShipments();
      } catch (error) {
        toast.error('Failed to delete shipment');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      shipment_number: '',
      customer_name: '',
      consignee: '',
      origin_country: '',
      destination: '',
      shipping_line: '',
      vessel_name: '',
      bl_number: '',
      container_number: '',
      cargo_description: '',
      weight: '',
      arrival_date: '',
      clearance_date: '',
      delivery_date: ''
    });
    setEditingShipment(null);
  };

  const openEditModal = (shipment) => {
    setEditingShipment(shipment);
    setFormData({
      shipment_number: shipment.shipment_number,
      customer_name: shipment.customer_name,
      consignee: shipment.consignee,
      origin_country: shipment.origin_country,
      destination: shipment.destination,
      shipping_line: shipment.shipping_line,
      vessel_name: shipment.vessel_name || '',
      bl_number: shipment.bl_number,
      container_number: shipment.container_number || '',
      cargo_description: shipment.cargo_description,
      weight: shipment.weight,
      arrival_date: shipment.arrival_date,
      clearance_date: shipment.clearance_date || '',
      delivery_date: shipment.delivery_date || ''
    });
    setShowModal(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      in_transit: 'bg-blue-500/20 text-blue-400',
      at_port: 'bg-purple-500/20 text-purple-400',
      customs_clearance: 'bg-orange-500/20 text-orange-400',
      cleared: 'bg-green-500/20 text-green-400',
      delivered: 'bg-gray-500/20 text-gray-400'
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
                Shipments
              </h1>
              <p className="text-gray-400">Manage import/export shipments</p>
            </div>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Shipment
            </button>
          </div>

          <div className="grid gap-4">
            {shipments.map((shipment) => (
              <motion.div
                key={shipment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-blue-500 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600">
                      <Ship className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{shipment.shipment_number}</h3>
                      <p className="text-gray-400">{shipment.customer_name}</p>
                      <div className={`inline-block px-3 py-1 rounded-full text-sm mt-2 ${getStatusColor(shipment.status)}`}>
                        {shipment.status?.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(shipment)}
                      className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(shipment.id)}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">B/L Number</p>
                    <p className="text-white font-semibold">{shipment.bl_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Origin</p>
                    <p className="text-white font-semibold">{shipment.origin_country}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Weight</p>
                    <p className="text-white font-semibold">{shipment.weight} kg</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Shipping Line</p>
                    <p className="text-white font-semibold">{shipment.shipping_line}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Arrival Date</p>
                    <p className="text-white font-semibold">{formatDate(shipment.arrival_date)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Container</p>
                    <p className="text-white font-semibold">{shipment.container_number || 'N/A'}</p>
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
                className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-2xl font-bold text-white mb-6">
                  {editingShipment ? 'Edit Shipment' : 'Add New Shipment'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Shipment Number *</label>
                      <input
                        type="text"
                        required
                        value={formData.shipment_number}
                        onChange={(e) => setFormData({ ...formData, shipment_number: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Customer Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.customer_name}
                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Consignee *</label>
                      <input
                        type="text"
                        required
                        value={formData.consignee}
                        onChange={(e) => setFormData({ ...formData, consignee: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Origin Country *</label>
                      <input
                        type="text"
                        required
                        value={formData.origin_country}
                        onChange={(e) => setFormData({ ...formData, origin_country: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Destination *</label>
                      <input
                        type="text"
                        required
                        value={formData.destination}
                        onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Shipping Line *</label>
                      <input
                        type="text"
                        required
                        value={formData.shipping_line}
                        onChange={(e) => setFormData({ ...formData, shipping_line: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Vessel Name</label>
                      <input
                        type="text"
                        value={formData.vessel_name}
                        onChange={(e) => setFormData({ ...formData, vessel_name: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">B/L Number *</label>
                      <input
                        type="text"
                        required
                        value={formData.bl_number}
                        onChange={(e) => setFormData({ ...formData, bl_number: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Container Number</label>
                      <input
                        type="text"
                        value={formData.container_number}
                        onChange={(e) => setFormData({ ...formData, container_number: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Weight (kg) *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Arrival Date *</label>
                      <input
                        type="date"
                        required
                        value={formData.arrival_date}
                        onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Clearance Date</label>
                      <input
                        type="date"
                        value={formData.clearance_date}
                        onChange={(e) => setFormData({ ...formData, clearance_date: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Cargo Description *</label>
                    <textarea
                      required
                      value={formData.cargo_description}
                      onChange={(e) => setFormData({ ...formData, cargo_description: e.target.value })}
                      rows="3"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
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
                      className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
                    >
                      {editingShipment ? 'Update' : 'Create'} Shipment
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

export default ShipmentsPage;
