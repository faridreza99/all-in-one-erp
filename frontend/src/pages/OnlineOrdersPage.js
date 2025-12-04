import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BackButton from '../components/BackButton';

import { API } from '../App';

function OnlineOrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/online-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching online orders:', error);
    }
  };

  const updateStatus = async (orderId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/online-orders/${orderId}/status`, 
        { order_status: status },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  return (
    <div className="p-6">
      <BackButton className="mb-4" />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🛒 Online Orders</h1>
        <div className="text-sm text-gray-600">
          Total Orders: {orders.length}
        </div>
      </div>

      <div className="grid gap-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg">Order #{order.order_number}</h3>
                <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleString()}</p>
              </div>
              <select
                value={order.order_status}
                onChange={(e) => updateStatus(order.id, e.target.value)}
                className="p-2 border rounded"
              >
                <option value="processing">Processing</option>
                <option value="confirmed">Confirmed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-semibold">{order.customer_name}</p>
                <p className="text-sm">{order.customer_email}</p>
                <p className="text-sm">{order.customer_phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Shipping Address</p>
                <p className="text-sm">{order.shipping_address}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">Items:</p>
              <ul className="space-y-1">
                {order.items && order.items.map((item, idx) => (
                  <li key={idx} className="text-sm flex justify-between">
                    <span>{item.name} x {item.quantity}</span>
                    <span className="font-semibold">৳{(item.price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <span className="font-bold">Total Amount:</span>
                <span className="text-xl font-bold text-green-600">৳{order.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex gap-2 mt-2">
                <span className={`px-2 py-1 rounded text-sm ${
                  order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  Payment: {order.payment_status}
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  {order.payment_method}
                </span>
              </div>
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="bg-white p-12 rounded-lg shadow-lg text-center text-gray-500">
            No orders yet
          </div>
        )}
      </div>
    </div>
  );
}

export default OnlineOrdersPage;
