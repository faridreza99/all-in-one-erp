import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BackButton from '../components/BackButton';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function DeviceHistoryPage() {
  const [devices, setDevices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    device_type: '',
    device_brand: '',
    device_model: '',
    serial_number: '',
    purchase_date: '',
    warranty_expiry: ''
  });

  useEffect(() => {
    fetchDevices();
    fetchCustomers();
  }, []);

  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/device-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDevices(response.data);
    } catch (error) {
      console.error('Error fetching devices:', error);
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
      await axios.post(`${API_URL}/api/device-history`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowForm(false);
      setFormData({ customer_id: '', device_type: '', device_brand: '', device_model: '', serial_number: '', purchase_date: '', warranty_expiry: '' });
      fetchDevices();
    } catch (error) {
      console.error('Error creating device record:', error);
      alert(error.response?.data?.detail || 'Error creating device record');
    }
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Unknown';
  };

  const isWarrantyValid = (warrantyExpiry) => {
    return new Date(warrantyExpiry) > new Date();
  };

  return (
    <div className="p-6">
      <BackButton className="mb-4" />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">💻 Customer Device History</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Register Device'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-bold mb-4">Register Customer Device</h2>
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
              placeholder="Device Type *"
              value={formData.device_type}
              onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Brand *"
              value={formData.device_brand}
              onChange={(e) => setFormData({ ...formData, device_brand: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Model *"
              value={formData.device_model}
              onChange={(e) => setFormData({ ...formData, device_model: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Serial Number *"
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="date"
              placeholder="Purchase Date"
              value={formData.purchase_date}
              onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="date"
              placeholder="Warranty Expiry"
              value={formData.warranty_expiry}
              onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <button type="submit" className="col-span-2 bg-green-600 text-white py-2 rounded hover:bg-green-700">
              Register Device
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Device</th>
              <th className="p-3 text-left">Serial Number</th>
              <th className="p-3 text-left">Purchase Date</th>
              <th className="p-3 text-left">Warranty Status</th>
              <th className="p-3 text-left">Repairs</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => {
              const warrantyValid = isWarrantyValid(device.warranty_expiry);
              return (
                <tr key={device.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{getCustomerName(device.customer_id)}</td>
                  <td className="p-3">
                    <div className="font-semibold">{device.device_brand} {device.device_model}</div>
                    <div className="text-sm text-gray-500">{device.device_type}</div>
                  </td>
                  <td className="p-3 font-mono text-sm">{device.serial_number}</td>
                  <td className="p-3">{new Date(device.purchase_date).toLocaleDateString()}</td>
                  <td className="p-3">
                    <div>
                      <span className={`px-2 py-1 rounded text-sm ${
                        warrantyValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {warrantyValid ? 'Valid' : 'Expired'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Expires: {new Date(device.warranty_expiry).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      {device.repair_history?.length || 0} repairs
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {devices.length === 0 && (
        <div className="bg-white p-12 rounded-lg shadow-lg text-center text-gray-500 mt-6">
          No devices registered yet.
        </div>
      )}
    </div>
  );
}

export default DeviceHistoryPage;
