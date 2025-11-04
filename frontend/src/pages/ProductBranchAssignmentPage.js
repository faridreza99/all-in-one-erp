import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BackButton from '../components/BackButton';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function ProductBranchAssignmentPage() {
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [branchAssignments, setBranchAssignments] = useState([]);

  useEffect(() => {
    fetchBranches();
    fetchProducts();
    fetchAssignments();
  }, []);

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/branches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranches(response.data);
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

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/product-branches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssignments(response.data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    // Get existing assignments for this product
    const productAssignments = assignments.filter(a => a.product_id === product.id);
    
    // Initialize branch assignments
    const initialAssignments = branches.map(branch => {
      const existing = productAssignments.find(a => a.branch_id === branch.id);
      return {
        branch_id: branch.id,
        branch_name: branch.name,
        assigned: !!existing,
        assignment_id: existing?.id || null,
        stock: existing?.stock || 0,
        purchase_price: existing?.purchase_price || product.purchase_price || 0,
        sale_price: existing?.sale_price || product.price || 0,
        reorder_level: existing?.reorder_level || 5
      };
    });
    
    setBranchAssignments(initialAssignments);
    setShowForm(true);
  };

  const handleBranchToggle = (branchId) => {
    setBranchAssignments(prev => prev.map(ba => 
      ba.branch_id === branchId ? { ...ba, assigned: !ba.assigned } : ba
    ));
  };

  const handleBranchDataChange = (branchId, field, value) => {
    setBranchAssignments(prev => prev.map(ba => 
      ba.branch_id === branchId ? { ...ba, [field]: parseFloat(value) || 0 } : ba
    ));
  };

  const applyToAllBranches = () => {
    if (branchAssignments.length === 0) return;
    const firstAssigned = branchAssignments.find(ba => ba.assigned);
    if (!firstAssigned) return;

    const { stock, purchase_price, sale_price, reorder_level } = firstAssigned;
    setBranchAssignments(prev => prev.map(ba => ba.assigned ? {
      ...ba, stock, purchase_price, sale_price, reorder_level
    } : ba));
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      
      for (const ba of branchAssignments) {
        if (ba.assigned && !ba.assignment_id) {
          // Create new assignment
          await axios.post(`${API_URL}/api/product-branches`, {
            product_id: selectedProduct.id,
            branch_id: ba.branch_id,
            stock: ba.stock,
            purchase_price: ba.purchase_price,
            sale_price: ba.sale_price,
            reorder_level: ba.reorder_level
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } else if (ba.assigned && ba.assignment_id) {
          // Update existing assignment
          await axios.put(`${API_URL}/api/product-branches/${ba.assignment_id}`, {
            stock: ba.stock,
            purchase_price: ba.purchase_price,
            sale_price: ba.sale_price,
            reorder_level: ba.reorder_level
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } else if (!ba.assigned && ba.assignment_id) {
          // Delete assignment
          await axios.delete(`${API_URL}/api/product-branches/${ba.assignment_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      }
      
      alert('Product assignments updated successfully!');
      setShowForm(false);
      fetchAssignments();
    } catch (error) {
      console.error('Error saving assignments:', error);
      alert(error.response?.data?.detail || 'Error saving assignments');
    }
  };

  return (
    <div className="p-6">
      <BackButton className="mb-4" />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">📦 Product-Branch Assignment</h1>
        <button
          onClick={() => setShowForm(false)}
          className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
        >
          {showForm ? 'Back to Products' : 'Select Product'}
        </button>
      </div>

      {!showForm ? (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Product Name</th>
                <th className="p-3 text-left">SKU</th>
                <th className="p-3 text-left">Branches Assigned</th>
                <th className="p-3 text-left">Total Stock</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const productAssignments = assignments.filter(a => a.product_id === product.id);
                const totalStock = productAssignments.reduce((sum, a) => sum + (a.stock || 0), 0);
                
                return (
                  <tr key={product.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-semibold">{product.name}</td>
                    <td className="p-3 font-mono text-sm">{product.sku || 'N/A'}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {productAssignments.length} / {branches.length} branches
                      </span>
                    </td>
                    <td className="p-3 font-semibold">{totalStock}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleProductSelect(product)}
                        className="bg-green-600 text-white px-4 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Manage Branches
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Assign: {selectedProduct?.name}</h2>
            <p className="text-gray-600">Select branches and set stock/pricing for each</p>
            <button
              onClick={applyToAllBranches}
              className="mt-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm"
            >
              📋 Apply First Branch Details to All
            </button>
          </div>

          <div className="space-y-4">
            {branchAssignments.map((ba) => (
              <div key={ba.branch_id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={ba.assigned}
                      onChange={() => handleBranchToggle(ba.branch_id)}
                      className="mr-3 w-5 h-5"
                    />
                    <span className="font-semibold text-lg">{ba.branch_name}</span>
                  </div>
                </div>

                {ba.assigned && (
                  <div className="grid grid-cols-4 gap-3 ml-8">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Stock</label>
                      <input
                        type="number"
                        value={ba.stock}
                        onChange={(e) => handleBranchDataChange(ba.branch_id, 'stock', e.target.value)}
                        className="w-full p-2 border rounded"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Purchase Price</label>
                      <input
                        type="number"
                        value={ba.purchase_price}
                        onChange={(e) => handleBranchDataChange(ba.branch_id, 'purchase_price', e.target.value)}
                        className="w-full p-2 border rounded"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Sale Price</label>
                      <input
                        type="number"
                        value={ba.sale_price}
                        onChange={(e) => handleBranchDataChange(ba.branch_id, 'sale_price', e.target.value)}
                        className="w-full p-2 border rounded"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Reorder Level</label>
                      <input
                        type="number"
                        value={ba.reorder_level}
                        onChange={(e) => handleBranchDataChange(ba.branch_id, 'reorder_level', e.target.value)}
                        className="w-full p-2 border rounded"
                        min="0"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold"
            >
              Save Assignments
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductBranchAssignmentPage;
