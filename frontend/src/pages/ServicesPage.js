import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Plus, Clock } from 'lucide-react';
import SectorLayout from '../components/SectorLayout';
import { API } from '../App';
import { toast } from 'sonner';
import { formatErrorMessage } from '../utils/errorHandler';

const ServicesPage = ({ user, onLogout }) => {
  const [services, setServices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    duration_minutes: '',
    price: '',
    description: ''
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API}/services`);
      setServices(response.data);
    } catch (error) {
      toast.error('Failed to fetch services');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/services`, formData);
      toast.success('Service created successfully');
      setShowModal(false);
      setFormData({ name: '', duration_minutes: '', price: '', description: '' });
      fetchServices();
    } catch (error) {
      toast.error(formatErrorMessage(error, 'Failed to create service'));
    }
  };

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Services</h1>
            <p className="text-slate-400">Manage salon/clinic services</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
            data-testid="add-service-button"
          >
            <Plus className="w-5 h-5" />
            Add Service
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-6"
              data-testid={`service-card-${service.id}`}
            >
              <h3 className="text-xl font-bold text-white mb-3">{service.name}</h3>
              <p className="text-slate-400 text-sm mb-4">{service.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{service.duration_minutes} min</span>
                </div>
                <span className="text-2xl font-bold text-green-400">${service.price}</span>
              </div>
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
              <h2 className="text-2xl font-bold text-white mb-6">Add New Service</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Service Name</label>
                  <input
                    data-testid="service-name-input"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Duration (minutes)</label>
                  <input
                    data-testid="service-duration-input"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Price</label>
                  <input
                    data-testid="service-price-input"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full"
                    rows="3"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1" data-testid="submit-service-button">Create</button>
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
    </SectorLayout>
  );
};

export default ServicesPage;