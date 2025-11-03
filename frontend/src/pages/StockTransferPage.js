import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function StockTransferPage() {
  const [transfers, setTransfers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [productBranches, setProductBranches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    from_branch_id: '',
    to_branch_id: '',
    quantity: 0,
    reference_note: ''
  });
  const [availableStock, setAvailableStock] = useState(0);

  useEffect(() => {
    fetchTransfers();
    fetchBranches();
    fetchProducts();
    fetchProductBranches();
  }, []);

  const fetchTransfers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/stock-transfers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransfers(response.data);
    } catch (error) {
      console.error('Error fetching transfers:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/branches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranches(response.data.filter(b => b.is_active));
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchProductBranches = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/product-branches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProductBranches(response.data);
    } catch (error) {
      console.error('Error fetching product branches:', error);
    }
  };

  useEffect(() => {
    if (formData.product_id && formData.from_branch_id) {
      const pb = productBranches.find(
        pb => pb.product_id === formData.product_id && pb.branch_id === formData.from_branch_id
      );
      setAvailableStock(pb?.stock || 0);
    } else {
      setAvailableStock(0);
    }
  }, [formData.product_id, formData.from_branch_id, productBranches]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.quantity > availableStock) {
      alert(`Insufficient stock! Available: ${availableStock}`);
      return;
    }
    
    if (formData.from_branch_id === formData.to_branch_id) {
      alert('Source and destination branches cannot be the same!');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/stock-transfers`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Stock transfer completed successfully!');
      setShowForm(false);
      setFormData({ product_id: '', from_branch_id: '', to_branch_id: '', quantity: 0, reference_note: '' });
      fetchTransfers();
      fetchProductBranches();
    } catch (error) {
      console.error('Error creating transfer:', error);
      alert(error.response?.data?.detail || 'Error creating transfer');
    }
  };

  const getBranchName = (branchId) => {
    return branches.find(b => b.id === branchId)?.name || 'Unknown';
  };

  const getProductName = (productId) => {
    return products.find(p => p.id === productId)?.name || 'Unknown';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🔄 Stock Transfer</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ New Transfer'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-bold mb-4">Create Stock Transfer</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              className="p-2 border rounded col-span-2"
              required
            >
              <option value="">Select Product</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>
              ))}
            </select>

            <select
              value={formData.from_branch_id}
              onChange={(e) => setFormData({ ...formData, from_branch_id: e.target.value })}
              className="p-2 border rounded"
              required
            >
              <option value="">From Branch</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>

            <select
              value={formData.to_branch_id}
              onChange={(e) => setFormData({ ...formData, to_branch_id: e.target.value })}
              className="p-2 border rounded"
              required
            >
              <option value="">To Branch</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>

            {availableStock > 0 && (
              <div className="col-span-2 p-3 bg-blue-50 rounded">
                <p className="text-sm text-blue-800">
                  📦 Available Stock in Source Branch: <span className="font-bold">{availableStock}</span>
                </p>
              </div>
            )}

            <input
              type="number"
              placeholder="Quantity to Transfer"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
              className="p-2 border rounded col-span-2"
              min="1"
              max={availableStock}
              required
            />

            <textarea
              placeholder="Reference Note (Optional)"
              value={formData.reference_note}
              onChange={(e) => setFormData({ ...formData, reference_note: e.target.value })}
              className="p-2 border rounded col-span-2"
              rows="2"
            ></textarea>

            <button type="submit" className="col-span-2 bg-green-600 text-white py-2 rounded hover:bg-green-700">
              Transfer Stock
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Transfer #</th>
              <th className="p-3 text-left">Product</th>
              <th className="p-3 text-left">From Branch</th>
              <th className="p-3 text-left">To Branch</th>
              <th className="p-3 text-left">Quantity</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Note</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((transfer) => (
              <tr key={transfer.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-mono text-sm font-bold">{transfer.transfer_number}</td>
                <td className="p-3">{getProductName(transfer.product_id)}</td>
                <td className="p-3">
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                    {getBranchName(transfer.from_branch_id)}
                  </span>
                </td>
                <td className="p-3">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                    {getBranchName(transfer.to_branch_id)}
                  </span>
                </td>
                <td className="p-3 font-semibold">{transfer.quantity}</td>
                <td className="p-3 text-sm">{new Date(transfer.created_at).toLocaleString()}</td>
                <td className="p-3 text-sm text-gray-600">{transfer.reference_note || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {transfers.length === 0 && (
        <div className="bg-white p-12 rounded-lg shadow-lg text-center text-gray-500 mt-6">
          No stock transfers yet
        </div>
      )}
    </div>
  );
}

export default StockTransferPage;
