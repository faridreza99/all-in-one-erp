import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Plus, Calendar, Clock, User } from 'lucide-react';
import SectorLayout from '../components/SectorLayout';
import { API } from '../App';
import { toast } from 'sonner';

const AppointmentsPage = ({ user, onLogout }) => {
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    service_id: '',
    appointment_date: '',
    appointment_time: '',
    notes: ''
  });

  useEffect(() => {
    fetchAppointments();
    fetchServices();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await axios.get(`${API}/appointments`);
      setAppointments(response.data);
    } catch (error) {
      toast.error('Failed to fetch appointments');
    }
  };

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API}/services`);
      setServices(response.data);
    } catch (error) {
      console.error('Failed to fetch services');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/appointments`, formData);
      toast.success('Appointment created successfully');
      setShowModal(false);
      setFormData({
        customer_name: '', customer_phone: '', service_id: '',
        appointment_date: '', appointment_time: '', notes: ''
      });
      fetchAppointments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create appointment');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.patch(`${API}/appointments/${id}/status?status=${status}`);
      toast.success('Status updated');
      fetchAppointments();
    } catch (error) {
      toast.error('Failed to update status');
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
            <h1 className="text-4xl font-bold text-white mb-2">Appointments</h1>
            <p className="text-slate-400">Manage customer appointments</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
            data-testid="add-appointment-button"
          >
            <Plus className="w-5 h-5" />
            Book Appointment
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {appointments.map((appointment) => (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-6"
              data-testid={`appointment-card-${appointment.id}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{appointment.customer_name}</h3>
                  <p className="text-slate-400 text-sm">{appointment.customer_phone}</p>
                </div>
                <span className={`badge ${
                  appointment.status === 'confirmed' ? 'badge-success' :
                  appointment.status === 'completed' ? 'badge-info' :
                  appointment.status === 'cancelled' ? 'badge-danger' :
                  'badge-warning'
                }`}>
                  {appointment.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{appointment.appointment_date}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{appointment.appointment_time}</span>
                </div>
              </div>

              {appointment.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(appointment.id, 'confirmed')}
                    className="btn-primary flex-1 py-2 text-sm"
                    data-testid="confirm-appointment"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => updateStatus(appointment.id, 'cancelled')}
                    className="btn-secondary flex-1 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {appointment.status === 'confirmed' && (
                <button
                  onClick={() => updateStatus(appointment.id, 'completed')}
                  className="btn-primary w-full py-2 text-sm"
                  data-testid="complete-appointment"
                >
                  Mark Complete
                </button>
              )}
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
              <h2 className="text-2xl font-bold text-white mb-6">Book Appointment</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Customer Name</label>
                  <input
                    data-testid="appointment-customer-name"
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
                    data-testid="appointment-customer-phone"
                    type="tel"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Service</label>
                  <select
                    data-testid="appointment-service-select"
                    value={formData.service_id}
                    onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                    className="w-full"
                    required
                  >
                    <option value="">Select a service</option>
                    {services.map(service => (
                      <option key={service.id} value={service.id}>{service.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Date</label>
                  <input
                    data-testid="appointment-date"
                    type="date"
                    value={formData.appointment_date}
                    onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Time</label>
                  <input
                    data-testid="appointment-time"
                    type="time"
                    value={formData.appointment_time}
                    onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                    className="w-full"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1" data-testid="submit-appointment">Book</button>
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

export default AppointmentsPage;