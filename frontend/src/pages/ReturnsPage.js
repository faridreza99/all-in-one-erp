import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function ReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    sale_id: '',
    product_id: '',
    reason: '',
    refund_amount: 0
  });

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/returns`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReturns(response.data);
    } catch (error) {
      console.error('Error fetching returns:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/returns`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowForm(false);
      setFormData({ sale_id: '', product_id: '', reason: '', refund_amount: 0 });
      fetchReturns();
    } catch (error) {
      console.error('Error creating return:', error);
    }
  };

  const handleApprove = async (returnId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/api/returns/${returnId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchReturns();
    } catch (error) {
      console.error('Error approving return:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Return Requests</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ New Return'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-bold mb-4">Create Return Request</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Sale ID"
              value={formData.sale_id}
              onChange={(e) => setFormData({ ...formData, sale_id: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Product ID"
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="number"
              placeholder="Refund Amount"
              value={formData.refund_amount}
              onChange={(e) => setFormData({ ...formData, refund_amount: parseFloat(e.target.value) })}
              className="p-2 border rounded"
              required
            />
            <textarea
              placeholder="Reason for return"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="p-2 border rounded col-span-2"
              rows="3"
              required
            ></textarea>
            <button type="submit" className="col-span-2 bg-green-600 text-white py-2 rounded hover:bg-green-700">
              Submit Return Request
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Return ID</th>
              <th className="p-3 text-left">Sale ID</th>
              <th className="p-3 text-left">Reason</th>
              <th className="p-3 text-left">Refund Amount</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((returnReq) => (
              <tr key={returnReq.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-mono text-sm">{returnReq.id.substring(0, 8)}</td>
                <td className="p-3">{returnReq.sale_id}</td>
                <td className="p-3">{returnReq.reason}</td>
                <td className="p-3 font-semibold">${returnReq.refund_amount.toFixed(2)}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-sm ${
                    returnReq.status === 'approved' ? 'bg-green-100 text-green-800' :
                    returnReq.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {returnReq.status}
                  </span>
                </td>
                <td className="p-3">
                  {returnReq.status === 'pending' && (
                    <button
                      onClick={() => handleApprove(returnReq.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      Approve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ReturnsPage;
