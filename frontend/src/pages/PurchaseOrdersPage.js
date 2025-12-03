import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BackButton from '../components/BackButton';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function PurchaseOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    supplier_id: '',
    items: [],
    total_amount: 0,
    expected_delivery: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/purchase-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/suppliers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/purchase-orders`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowForm(false);
      setFormData({ supplier_id: '', items: [], total_amount: 0, expected_delivery: '' });
      fetchOrders();
    } catch (error) {
      console.error('Error creating purchase order:', error);
    }
  };

  return (
    <div className="p-6">
      <BackButton className="mb-4" />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">📝 Purchase Orders (PO)</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Create PO'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-bold mb-4">Create Purchase Order</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <select
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              className="p-2 border rounded"
              required
            >
              <option value="">Select Supplier</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Total Amount"
              value={formData.total_amount}
              onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) })}
              className="p-2 border rounded"
              required
            />
            <input
              type="date"
              placeholder="Expected Delivery"
              value={formData.expected_delivery}
              onChange={(e) => setFormData({ ...formData, expected_delivery: e.target.value })}
              className="p-2 border rounded col-span-2"
              required
            />
            <button type="submit" className="col-span-2 bg-green-600 text-white py-2 rounded hover:bg-green-700">
              Create Purchase Order
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">PO Number</th>
              <th className="p-3 text-left">Supplier ID</th>
              <th className="p-3 text-left">Total Amount</th>
              <th className="p-3 text-left">Expected Delivery</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-mono font-bold">{order.po_number}</td>
                <td className="p-3">{order.supplier_id}</td>
                <td className="p-3 font-semibold">৳{order.total_amount.toFixed(2)}</td>
                <td className="p-3">{new Date(order.expected_delivery).toLocaleDateString()}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-sm ${
                    order.status === 'completed' ? 'bg-green-100 text-green-800' :
                    order.status === 'received' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status}
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

export default PurchaseOrdersPage;
