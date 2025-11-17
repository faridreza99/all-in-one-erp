import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BackButton from '../components/BackButton';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const JOB_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'in_progress', label: 'In Progress', color: 'blue' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'delivered', label: 'Delivered', color: 'purple' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' }
];

function JobCardsPage() {
  const [jobCards, setJobCards] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    device_type: '',
    device_brand: '',
    device_model: '',
    serial_number: '',
    issue_description: '',
    estimated_cost: 0
  });

  useEffect(() => {
    fetchJobCards();
    fetchCustomers();
  }, []);

  const fetchJobCards = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/job-cards`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJobCards(response.data);
    } catch (error) {
      console.error('Error fetching job cards:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/job-cards`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowForm(false);
      setFormData({ customer_id: '', device_type: '', device_brand: '', device_model: '', serial_number: '', issue_description: '', estimated_cost: 0 });
      fetchJobCards();
    } catch (error) {
      console.error('Error creating job card:', error);
      toast.error(error.response?.data?.detail || 'Error creating job card');
    }
  };

  const updateStatus = async (jobId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/api/job-cards/${jobId}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      fetchJobCards();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusColor = (status) => {
    const statusObj = JOB_STATUSES.find(s => s.value === status);
    return statusObj ? statusObj.color : 'gray';
  };

  return (
    <div className="p-6">
      <BackButton className="mb-4" />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">📝 Job Cards / Repair Tickets</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ New Job Card'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-bold mb-4">Create Job Card</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              className="p-2 border rounded col-span-2"
              required
            >
              <option value="">Select Customer *</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>{customer.name} - {customer.phone}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Device Type (e.g., Laptop, Desktop) *"
              value={formData.device_type}
              onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Device Brand *"
              value={formData.device_brand}
              onChange={(e) => setFormData({ ...formData, device_brand: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Device Model *"
              value={formData.device_model}
              onChange={(e) => setFormData({ ...formData, device_model: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Serial Number "
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              className="p-2 border rounded"
            />
            <textarea
              placeholder="Issue Description *"
              value={formData.issue_description}
              onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })}
              className="p-2 border rounded col-span-2"
              rows="3"
              required
            ></textarea>
            <input
              type="number"
              placeholder="Estimated Cost *"
              value={formData.estimated_cost}
              onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })}
              className="p-2 border rounded col-span-2"
              step="0.01"
              required
            />
            <button type="submit" className="col-span-2 bg-green-600 text-white py-2 rounded hover:bg-green-700">
              Create Job Card
            </button>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {jobCards.map((job) => {
          const statusColor = getStatusColor(job.status);
          return (
            <div key={job.id} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold">{job.job_number}</h3>
                  <p className="text-sm text-gray-600">{new Date(job.received_date).toLocaleDateString()}</p>
                </div>
                <select
                  value={job.status}
                  onChange={(e) => updateStatus(job.id, e.target.value)}
                  className={`p-2 border rounded bg-${statusColor}-100 text-${statusColor}-800 font-semibold`}
                >
                  {JOB_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Device</p>
                  <p className="font-semibold">{job.device_brand} {job.device_model}</p>
                  <p className="text-sm text-gray-500">{job.device_type}</p>
                  {job.serial_number && (
                    <p className="text-xs font-mono text-gray-500">SN: {job.serial_number}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Issue</p>
                  <p className="text-sm">{job.issue_description}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-600">Estimated Cost</p>
                  <p className="text-xl font-bold text-blue-600">৳{job.estimated_cost.toFixed(2)}</p>
                </div>
                {job.actual_cost > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">Actual Cost</p>
                    <p className="text-xl font-bold text-green-600">৳{job.actual_cost.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {jobCards.length === 0 && (
        <div className="bg-white p-12 rounded-lg shadow-lg text-center text-gray-500">
          No job cards yet. Click "+ New Job Card" to create one.
        </div>
      )}
    </div>
  );
}

export default JobCardsPage;
