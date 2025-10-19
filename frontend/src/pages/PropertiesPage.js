import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    property_name: '',
    property_type: 'residential',
    address: '',
    size: '',
    rent_amount: 0,
    status: 'available'
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/properties`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProperties(response.data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/properties`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowForm(false);
      setFormData({ property_name: '', property_type: 'residential', address: '', size: '', rent_amount: 0, status: 'available' });
      fetchProperties();
    } catch (error) {
      console.error('Error creating property:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🏘️ Properties</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Add Property'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-bold mb-4">Add New Property</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Property Name"
              value={formData.property_name}
              onChange={(e) => setFormData({ ...formData, property_name: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <select
              value={formData.property_type}
              onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
              className="p-2 border rounded"
            >
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
              <option value="land">Land</option>
            </select>
            <input
              type="text"
              placeholder="Size (e.g., 1200 sq ft)"
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="number"
              placeholder="Rent Amount"
              value={formData.rent_amount}
              onChange={(e) => setFormData({ ...formData, rent_amount: parseFloat(e.target.value) })}
              className="p-2 border rounded"
              required
            />
            <textarea
              placeholder="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="p-2 border rounded col-span-2"
              rows="3"
              required
            ></textarea>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="p-2 border rounded col-span-2"
            >
              <option value="available">Available</option>
              <option value="rented">Rented</option>
              <option value="sold">Sold</option>
              <option value="maintenance">Under Maintenance</option>
            </select>
            <button type="submit" className="col-span-2 bg-green-600 text-white py-2 rounded hover:bg-green-700">
              Add Property
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <div key={property.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">{property.property_name}</h3>
                <span className={`px-2 py-1 rounded text-sm ${
                  property.status === 'available' ? 'bg-green-100 text-green-800' :
                  property.status === 'rented' ? 'bg-blue-100 text-blue-800' :
                  property.status === 'sold' ? 'bg-purple-100 text-purple-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {property.status}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600">
                  <span className="font-semibold">Type:</span> {property.property_type}
                </p>
                <p className="text-gray-600">
                  <span className="font-semibold">Size:</span> {property.size}
                </p>
                <p className="text-gray-600">
                  <span className="font-semibold">Address:</span> {property.address}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-2xl font-bold text-green-600">${property.rent_amount.toFixed(2)}/mo</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {properties.length === 0 && (
        <div className="bg-white p-12 rounded-lg shadow-lg text-center text-gray-500">
          No properties added yet
        </div>
      )}
    </div>
  );
}

export default PropertiesPage;
