import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Save, X, CheckCircle, Building2, DollarSign, Package } from 'lucide-react';
import BackButton from '../components/BackButton';
import SectorLayout from '../components/SectorLayout';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function ProductBranchAssignmentPage({ user, onLogout }) {
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [branchAssignments, setBranchAssignments] = useState([]);
  const [applySameToAll, setApplySameToAll] = useState(false);

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
    setBranchAssignments(prev => {
      const updated = prev.map(ba => 
        ba.branch_id === branchId ? { ...ba, [field]: parseFloat(value) || 0 } : ba
      );
      
      // If "apply same to all" is enabled, copy ALL values from the edited branch to all other branches
      if (applySameToAll) {
        const masterBranch = updated.find(ba => ba.branch_id === branchId);
        if (masterBranch) {
          return updated.map(ba => ({
            ...ba,
            stock: masterBranch.stock,
            purchase_price: masterBranch.purchase_price,
            sale_price: masterBranch.sale_price,
            reorder_level: masterBranch.reorder_level
          }));
        }
      }
      
      return updated;
    });
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
      
      toast.success('Product assignments updated successfully!');
      setShowForm(false);
      setApplySameToAll(false);
      fetchAssignments();
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast.error(error.response?.data?.detail || 'Error saving assignments');
    }
  };

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <BackButton className="mb-4" />
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Package className="w-10 h-10 text-blue-400" />
              Product-Branch Assignment
            </h1>
            <p className="text-slate-400">Assign products to branches and manage stock levels</p>
          </div>
          {showForm && (
            <button
              onClick={() => {
                setShowForm(false);
                setApplySameToAll(false);
              }}
              className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              <X className="w-5 h-5" />
              Back to Products
            </button>
          )}
        </div>

        {!showForm ? (
          <div className="glass-card p-6">
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>SKU</th>
                    <th>Branches Assigned</th>
                    <th>Total Stock</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const productAssignments = assignments.filter(a => a.product_id === product.id);
                    const totalStock = productAssignments.reduce((sum, a) => sum + (a.stock || 0), 0);
                    
                    return (
                      <tr key={product.id}>
                        <td className="font-semibold text-white">{product.name}</td>
                        <td className="text-slate-300 font-mono text-sm">{product.sku || 'N/A'}</td>
                        <td>
                          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm font-semibold border border-blue-500/30">
                            {productAssignments.length} / {branches.length} branches
                          </span>
                        </td>
                        <td className="font-semibold text-green-400">{totalStock} units</td>
                        <td>
                          <button
                            onClick={() => handleProductSelect(product)}
                            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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
          </div>
        ) : (
          <div className="glass-card p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-3 flex items-center gap-3">
                <Building2 className="w-8 h-8 text-blue-400" />
                {selectedProduct?.name}
              </h2>
              <p className="text-slate-300 text-lg mb-6">Select branches and set stock/pricing for each branch</p>
              
              {/* Apply Same Details Checkbox */}
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applySameToAll}
                    onChange={(e) => setApplySameToAll(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-purple-500 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer"
                  />
                  <span className="text-white font-semibold text-lg">
                    📋 Apply same details to all branches
                  </span>
                </label>
                <p className="text-slate-400 text-sm mt-2 ml-8">
                  When enabled, entering values in any branch will automatically apply to all branches
                </p>
              </div>
            </div>

            {/* Table Layout */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">Active</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">Branch</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">Stock Quantity</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">Purchase Price</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">Sale Price</th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">Reorder Level</th>
                  </tr>
                </thead>
                <tbody>
                  {branchAssignments.map((ba, index) => (
                    <tr 
                      key={ba.branch_id} 
                      className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                        ba.assigned ? 'bg-slate-800/40' : ''
                      }`}
                    >
                      {/* Active Checkbox */}
                      <td className="py-4 px-4">
                        <input
                          type="checkbox"
                          checked={ba.assigned}
                          onChange={() => handleBranchToggle(ba.branch_id)}
                          className="w-5 h-5 rounded border-2 border-blue-500 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      
                      {/* Branch Name */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-400" />
                          <span className="font-semibold text-white text-lg">{ba.branch_name}</span>
                        </div>
                      </td>

                      {/* Stock */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-green-400" />
                          <input
                            type="number"
                            value={ba.stock}
                            onChange={(e) => handleBranchDataChange(ba.branch_id, 'stock', e.target.value)}
                            disabled={!ba.assigned}
                            className={`w-32 px-3 py-2 rounded-lg bg-slate-700 border ${
                              ba.assigned 
                                ? 'border-slate-600 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20' 
                                : 'border-slate-800 text-slate-600 cursor-not-allowed'
                            } focus:outline-none transition-all`}
                            min="0"
                          />
                        </div>
                      </td>

                      {/* Purchase Price */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-yellow-400" />
                          <input
                            type="number"
                            value={ba.purchase_price}
                            onChange={(e) => handleBranchDataChange(ba.branch_id, 'purchase_price', e.target.value)}
                            disabled={!ba.assigned}
                            className={`w-32 px-3 py-2 rounded-lg bg-slate-700 border ${
                              ba.assigned 
                                ? 'border-slate-600 text-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20' 
                                : 'border-slate-800 text-slate-600 cursor-not-allowed'
                            } focus:outline-none transition-all`}
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </td>

                      {/* Sale Price */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-blue-400" />
                          <input
                            type="number"
                            value={ba.sale_price}
                            onChange={(e) => handleBranchDataChange(ba.branch_id, 'sale_price', e.target.value)}
                            disabled={!ba.assigned}
                            className={`w-32 px-3 py-2 rounded-lg bg-slate-700 border ${
                              ba.assigned 
                                ? 'border-slate-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                                : 'border-slate-800 text-slate-600 cursor-not-allowed'
                            } focus:outline-none transition-all`}
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </td>

                      {/* Reorder Level */}
                      <td className="py-4 px-4">
                        <input
                          type="number"
                          value={ba.reorder_level}
                          onChange={(e) => handleBranchDataChange(ba.branch_id, 'reorder_level', e.target.value)}
                          disabled={!ba.assigned}
                          className={`w-32 px-3 py-2 rounded-lg bg-slate-700 border ${
                            ba.assigned 
                              ? 'border-slate-600 text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20' 
                              : 'border-slate-800 text-slate-600 cursor-not-allowed'
                          } focus:outline-none transition-all`}
                          min="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex gap-4">
              <button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Save Assignments
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setApplySameToAll(false);
                }}
                className="flex-1 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </SectorLayout>
  );
}

export default ProductBranchAssignmentPage;
