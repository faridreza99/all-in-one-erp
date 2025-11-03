import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Plus, Stethoscope, Users, Calendar } from 'lucide-react';
import SectorLayout from '../components/SectorLayout';
import { API } from '../App';
import { toast } from 'sonner';
import { formatErrorMessage } from '../utils/errorHandler';

const ClinicPage = ({ user, onLogout }) => {
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [activeTab, setActiveTab] = useState('doctors');
  const [showModal, setShowModal] = useState(false);
  const [doctorForm, setDoctorForm] = useState({
    name: '',
    specialization: '',
    phone: '',
    email: '',
    consultation_fee: '',
    available_days: []
  });
  const [patientForm, setPatientForm] = useState({
    name: '',
    age: '',
    gender: 'male',
    phone: '',
    email: '',
    address: '',
    blood_group: ''
  });

  useEffect(() => {
    fetchDoctors();
    fetchPatients();
  }, []);

  const fetchDoctors = async () => {
    try {
      const response = await axios.get(`${API}/doctors`);
      setDoctors(response.data);
    } catch (error) {
      toast.error('Failed to fetch doctors');
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await axios.get(`${API}/patients`);
      setPatients(response.data);
    } catch (error) {
      toast.error('Failed to fetch patients');
    }
  };

  const handleDoctorSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/doctors`, doctorForm);
      toast.success('Doctor added successfully');
      setShowModal(false);
      setDoctorForm({ name: '', specialization: '', phone: '', email: '', consultation_fee: '', available_days: [] });
      fetchDoctors();
    } catch (error) {
      toast.error(formatErrorMessage(error, 'Failed to add doctor'));
    }
  };

  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/patients`, patientForm);
      toast.success('Patient registered successfully');
      setShowModal(false);
      setPatientForm({ name: '', age: '', gender: 'male', phone: '', email: '', address: '', blood_group: '' });
      fetchPatients();
    } catch (error) {
      toast.error(formatErrorMessage(error, 'Failed to register patient'));
    }
  };

  const toggleDay = (day) => {
    const days = doctorForm.available_days.includes(day)
      ? doctorForm.available_days.filter(d => d !== day)
      : [...doctorForm.available_days, day];
    setDoctorForm({ ...doctorForm, available_days: days });
  };

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Clinic Management</h1>
            <p className="text-slate-400">Manage doctors, patients, and appointments</p>
          </div>
          <button
            onClick={() => { setShowModal(true); setActiveTab('add'); }}
            className="btn-primary flex items-center gap-2"
            data-testid="add-clinic-data"
          >
            <Plus className="w-5 h-5" />
            {activeTab === 'doctors' ? 'Add Doctor' : 'Register Patient'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('doctors')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'doctors'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
            data-testid="doctors-tab"
          >
            <Stethoscope className="w-5 h-5 inline mr-2" />
            Doctors
          </button>
          <button
            onClick={() => setActiveTab('patients')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'patients'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
            data-testid="patients-tab"
          >
            <Users className="w-5 h-5 inline mr-2" />
            Patients
          </button>
        </div>

        {/* Doctors Tab */}
        {activeTab === 'doctors' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doctor) => (
              <motion.div
                key={doctor.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-6"
                data-testid={`doctor-card-${doctor.id}`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">Dr. {doctor.name}</h3>
                    <span className="badge badge-info text-xs">{doctor.specialization}</span>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <p className="text-slate-300 text-sm">{doctor.phone}</p>
                  {doctor.email && <p className="text-slate-400 text-xs">{doctor.email}</p>}
                </div>

                <div className="border-t border-slate-700 pt-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400 text-sm">Consultation Fee</span>
                    <span className="text-green-400 font-semibold">${doctor.consultation_fee}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Available: {doctor.available_days?.join(', ') || 'Not set'}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Patients Tab */}
        {activeTab === 'patients' && (
          <div className="glass-card p-6">
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Phone</th>
                    <th>Blood Group</th>
                    <th>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id} data-testid={`patient-row-${patient.id}`}>
                      <td className="font-semibold text-white">{patient.name}</td>
                      <td className="text-slate-300">{patient.age}</td>
                      <td>
                        <span className="badge badge-info">{patient.gender}</span>
                      </td>
                      <td className="text-slate-300">{patient.phone}</td>
                      <td className="text-slate-300">{patient.blood_group || '-'}</td>
                      <td className="text-slate-400 text-sm">
                        {new Date(patient.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              {activeTab === 'doctors' ? (
                <>
                  <h2 className="text-2xl font-bold text-white mb-6">Add New Doctor</h2>
                  <form onSubmit={handleDoctorSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                      <input
                        type="text"
                        value={doctorForm.name}
                        onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                        className="w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Specialization</label>
                      <input
                        type="text"
                        value={doctorForm.specialization}
                        onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                        className="w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={doctorForm.phone}
                        onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                        className="w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                      <input
                        type="email"
                        value={doctorForm.email}
                        onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Consultation Fee</label>
                      <input
                        type="number"
                        step="0.01"
                        value={doctorForm.consultation_fee}
                        onChange={(e) => setDoctorForm({ ...doctorForm, consultation_fee: e.target.value })}
                        className="w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Available Days</label>
                      <div className="grid grid-cols-2 gap-2">
                        {weekDays.map(day => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={`px-3 py-2 rounded-lg text-sm ${
                              doctorForm.available_days.includes(day)
                                ? 'bg-blue-500 text-white'
                                : 'bg-white/5 text-slate-400'
                            }`}
                          >
                            {day.substring(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button type="submit" className="btn-primary flex-1">Add Doctor</button>
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="btn-secondary flex-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-6">Register New Patient</h2>
                  <form onSubmit={handlePatientSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                      <input
                        type="text"
                        value={patientForm.name}
                        onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                        className="w-full"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Age</label>
                        <input
                          type="number"
                          value={patientForm.age}
                          onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })}
                          className="w-full"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Gender</label>
                        <select
                          value={patientForm.gender}
                          onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                          className="w-full"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={patientForm.phone}
                        onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                        className="w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Blood Group</label>
                      <input
                        type="text"
                        value={patientForm.blood_group}
                        onChange={(e) => setPatientForm({ ...patientForm, blood_group: e.target.value })}
                        className="w-full"
                        placeholder="e.g., A+, O-, AB+"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button type="submit" className="btn-primary flex-1">Register</button>
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="btn-secondary flex-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </motion.div>
    </SectorLayout>
  );
};

export default ClinicPage;