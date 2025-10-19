import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function OffersPage() {
  const [offers, setOffers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    discount_percentage: 0,
    start_date: '',
    end_date: '',
    applicable_categories: []
  });

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/offers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOffers(response.data);
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/offers`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowForm(false);
      setFormData({ title: '', discount_percentage: 0, start_date: '', end_date: '', applicable_categories: [] });
      fetchOffers();
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const toggleOffer = async (offerId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/api/offers/${offerId}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOffers();
    } catch (error) {
      console.error('Error toggling offer:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🎁 Offers & Discounts</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Create Offer'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-bold mb-4">Create New Offer</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Offer Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="p-2 border rounded col-span-2"
              required
            />
            <input
              type="number"
              placeholder="Discount Percentage"
              value={formData.discount_percentage}
              onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) })}
              className="p-2 border rounded"
              required
            />
            <input
              type="date"
              placeholder="Start Date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="date"
              placeholder="End Date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="p-2 border rounded col-span-2"
              required
            />
            <button type="submit" className="col-span-2 bg-green-600 text-white py-2 rounded hover:bg-green-700">
              Create Offer
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offers.map((offer) => (
          <div key={offer.id} className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">{offer.title}</h3>
              <button
                onClick={() => toggleOffer(offer.id)}
                className={`px-3 py-1 rounded text-sm ${
                  offer.is_active ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {offer.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
            <div className="text-center my-6">
              <div className="text-5xl font-bold">{offer.discount_percentage}%</div>
              <div className="text-sm mt-2">OFF</div>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-semibold">Start:</span> {new Date(offer.start_date).toLocaleDateString()}
              </p>
              <p>
                <span className="font-semibold">End:</span> {new Date(offer.end_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {offers.length === 0 && (
        <div className="bg-white p-12 rounded-lg shadow-lg text-center text-gray-500">
          No offers created yet
        </div>
      )}
    </div>
  );
}

export default OffersPage;
