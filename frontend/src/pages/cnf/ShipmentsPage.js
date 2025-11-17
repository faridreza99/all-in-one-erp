import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Ship, Plus, Edit2, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
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
    bill_of_lading: '',
    client_name: '',
    vessel_name: '',
    port_of_loading: '',
    port_of_discharge: '',
    eta: '',
    commodity: '',
    weight: '',
    volume: '',
    container_numbers: ''
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
      const payload = {
        ...formData,
        weight: parseFloat(formData.weight),
        volume: parseFloat(formData.volume),
        container_numbers: formData.container_numbers.split(',').map(c => c.trim()).filter(c => c)
      };
      
      if (editingShipment) {
        await axios.put(`${API}/cnf/shipments/${editingShipment.id}`, payload);
        toast.success('Shipment updated successfully');
      } else {
        await axios.post(`${API}/cnf/shipments`, payload);
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
      bill_of_lading: '',
      client_name: '',
      vessel_name: '',
      port_of_loading: '',
      port_of_discharge: '',
      eta: '',
      commodity: '',
      weight: '',
      volume: '',
      container_numbers: ''
    });
    setEditingShipment(null);
  };

  const openEditModal = (shipment) => {
    setEditingShipment(shipment);
    setFormData({
      shipment_number: shipment.shipment_number,
      bill_of_lading: shipment.bill_of_lading,
      client_name: shipment.client_name,
      vessel_name: shipment.vessel_name || '',
      port_of_loading: shipment.port_of_loading,
      port_of_discharge: shipment.port_of_discharge,
      eta: shipment.eta,
      commodity: shipment.commodity,
      weight: shipment.weight?.toString() || '',
      volume: shipment.volume?.toString() || '',
      container_numbers: shipment.container_numbers?.join(', ') || ''
    });
    setShowModal(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      in_transit: 'bg-blue-500/20 text-blue-400',
      at_port: 'bg-purple-500/20 text-purple-400',
      customs_clearance: 'bg-orange-500/20 text-orange-400',
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
                      <p className="text-gray-400">{shipment.client_name}</p>
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

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">B/L Number</p>
                    <p className="text-white font-semibold">{shipment.bill_of_lading}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Vessel</p>
                    <p className="text-white font-semibold">{shipment.vessel_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Port of Discharge</p>
                    <p className="text-white font-semibold">{shipment.port_of_discharge}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">ETA</p>
                    <p className="text-white font-semibold">{formatDate(shipment.eta)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Commodity</p>
                    <p className="text-white font-semibold">{shipment.commodity}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Weight</p>
                    <p className="text-white font-semibold">{shipment.weight} kg</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Volume</p>
                    <p className="text-white font-semibold">{shipment.volume} m³</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Containers</p>
                    <p className="text-white font-semibold">{shipment.container_numbers?.length || 0}</p>
                  </div>
                </div>

                {shipment.container_numbers && shipment.container_numbers.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-gray-400 text-sm mb-2">Container Numbers:</p>
                    <div className="flex flex-wrap gap-2">
                      {shipment.container_numbers.map((container, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-sm">
                          {container}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
                      <label className="block text-gray-300 mb-2">Bill of Lading *</label>
                      <input
                        type="text"
                        required
                        value={formData.bill_of_lading}
                        onChange={(e) => setFormData({ ...formData, bill_of_lading: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Client Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.client_name}
                        onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Vessel Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.vessel_name}
                        onChange={(e) => setFormData({ ...formData, vessel_name: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Port of Loading *</label>
                      <input
                        type="text"
                        required
                        value={formData.port_of_loading}
                        onChange={(e) => setFormData({ ...formData, port_of_loading: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Port of Discharge *</label>
                      <input
                        type="text"
                        required
                        value={formData.port_of_discharge}
                        onChange={(e) => setFormData({ ...formData, port_of_discharge: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">ETA (Estimated Time of Arrival) *</label>
                      <input
                        type="date"
                        required
                        value={formData.eta}
                        onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Commodity *</label>
                      <input
                        type="text"
                        required
                        value={formData.commodity}
                        onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
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
                      <label className="block text-gray-300 mb-2">Volume (m³) *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={formData.volume}
                        onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-gray-300 mb-2">Container Numbers (comma-separated) *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., MSCU1234567, MSCU1234568"
                        value={formData.container_numbers}
                        onChange={(e) => setFormData({ ...formData, container_numbers: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
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
