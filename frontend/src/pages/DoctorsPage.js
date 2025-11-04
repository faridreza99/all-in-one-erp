import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BackButton from '../components/BackButton';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    phone: '',
    email: '',
    consultation_fee: 0,
    available_days: []
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/doctors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDoctors(response.data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/doctors`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowForm(false);
      setFormData({ name: '', specialization: '', phone: '', email: '', consultation_fee: 0, available_days: [] });
      fetchDoctors();
    } catch (error) {
      console.error('Error creating doctor:', error);
    }
  };

  return (
    <div className="p-6">
      <BackButton className="mb-4" />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🧑‍⚕️ Doctors</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Add Doctor'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-bold mb-4">Add New Doctor</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Doctor Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Specialization"
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="p-2 border rounded"
            />
            <input
              type="number"
              placeholder="Consultation Fee"
              value={formData.consultation_fee}
              onChange={(e) => setFormData({ ...formData, consultation_fee: parseFloat(e.target.value) })}
              className="p-2 border rounded col-span-2"
              required
            />
            <button type="submit" className="col-span-2 bg-green-600 text-white py-2 rounded hover:bg-green-700">
              Add Doctor
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.map((doctor) => (
          <div key={doctor.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                👨‍⚕️
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-bold">Dr. {doctor.name}</h3>
                <p className="text-sm text-gray-600">{doctor.specialization}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-gray-600">
                <span className="font-semibold">📞</span> {doctor.phone}
              </p>
              {doctor.email && (
                <p className="text-gray-600">
                  <span className="font-semibold">📧</span> {doctor.email}
                </p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-lg font-bold text-green-600">${doctor.consultation_fee} <span className="text-sm text-gray-600">/ consultation</span></p>
            </div>
          </div>
        ))}
      </div>

      {doctors.length === 0 && (
        <div className="bg-white p-12 rounded-lg shadow-lg text-center text-gray-500">
          No doctors added yet
        </div>
      )}
    </div>
  );
}

export default DoctorsPage;
