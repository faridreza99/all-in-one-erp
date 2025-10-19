import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function WarrantiesPage() {
  const [warranties, setWarranties] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    serial_number: '',
    customer_name: '',
    customer_phone: '',
    purchase_date: '',
    warranty_period_months: 12
  });

  useEffect(() => {
    fetchWarranties();
  }, []);

  const fetchWarranties = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/warranties`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWarranties(response.data);
    } catch (error) {
      console.error('Error fetching warranties:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/warranties`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowForm(false);
      setFormData({ product_id: '', serial_number: '', customer_name: '', customer_phone: '', purchase_date: '', warranty_period_months: 12 });
      fetchWarranties();
    } catch (error) {
      console.error('Error creating warranty:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Warranty Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Add Warranty'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-bold mb-4">Register New Warranty</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Product ID"
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Serial Number"
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Customer Name"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="tel"
              placeholder="Customer Phone"
              value={formData.customer_phone}
              onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="date"
              value={formData.purchase_date}
              onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="number"
              placeholder="Warranty Period (months)"
              value={formData.warranty_period_months}
              onChange={(e) => setFormData({ ...formData, warranty_period_months: parseInt(e.target.value) })}
              className="p-2 border rounded"
              required
            />
            <button type="submit" className="col-span-2 bg-green-600 text-white py-2 rounded hover:bg-green-700">
              Register Warranty
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Serial Number</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Purchase Date</th>
              <th className="p-3 text-left">Expiry Date</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {warranties.map((warranty) => (
              <tr key={warranty.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-mono">{warranty.serial_number}</td>
                <td className="p-3">{warranty.customer_name}</td>
                <td className="p-3">{warranty.customer_phone}</td>
                <td className="p-3">{new Date(warranty.purchase_date).toLocaleDateString()}</td>
                <td className="p-3">{new Date(warranty.expiry_date).toLocaleDateString()}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-sm ${warranty.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {warranty.is_active ? 'Active' : 'Expired'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default WarrantiesPage;
