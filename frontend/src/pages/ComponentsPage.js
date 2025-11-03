import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const COMPONENT_CATEGORIES = ['CPU', 'RAM', 'HDD', 'SSD', 'GPU', 'Motherboard', 'PSU', 'Case', 'Monitor', 'Keyboard', 'Mouse'];

function ComponentsPage() {
  const [components, setComponents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    brand: '',
    model: '',
    specifications: {},
    price: 0,
    stock: 0
  });

  useEffect(() => {
    fetchComponents();
  }, []);

  const fetchComponents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/components`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComponents(response.data);
    } catch (error) {
      console.error('Error fetching components:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/components`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowForm(false);
      setFormData({ name: '', category: '', brand: '', model: '', specifications: {}, price: 0, stock: 0 });
      fetchComponents();
    } catch (error) {
      console.error('Error creating component:', error);
      alert(error.response?.data?.detail || 'Error creating component');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🖥️ Computer Components</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Add Component'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-bold mb-4">Add New Component</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Component Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="p-2 border rounded"
              required
            >
              <option value="">Select Category *</option>
              {COMPONENT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Brand *"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Model *"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="number"
              placeholder="Price *"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              className="p-2 border rounded"
              step="0.01"
              required
            />
            <input
              type="number"
              placeholder="Stock *"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
              className="p-2 border rounded"
              required
            />
            <button type="submit" className="col-span-2 bg-green-600 text-white py-2 rounded hover:bg-green-700">
              Add Component
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {components.map((component) => (
          <div key={component.id} className="bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <span className="px-2 py-1 bg-cyan-100 text-cyan-800 rounded text-xs font-semibold">
                {component.category}
              </span>
              <span className={`px-2 py-1 rounded text-xs ${
                component.stock > 10 ? 'bg-green-100 text-green-800' :
                component.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                Stock: {component.stock}
              </span>
            </div>
            <h3 className="font-bold text-lg mb-2">{component.name}</h3>
            <div className="space-y-1 text-sm text-gray-600 mb-3">
              <p><span className="font-semibold">Brand:</span> {component.brand}</p>
              <p><span className="font-semibold">Model:</span> {component.model}</p>
            </div>
            <div className="pt-3 border-t">
              <p className="text-2xl font-bold text-green-600">৳{component.price.toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>

      {components.length === 0 && (
        <div className="bg-white p-12 rounded-lg shadow-lg text-center text-gray-500">
          No components added yet. Click "+ Add Component" to start.
        </div>
      )}
    </div>
  );
}

export default ComponentsPage;
