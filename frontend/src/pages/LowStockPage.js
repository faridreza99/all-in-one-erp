import React, { useState, useEffect } from 'react';
import { AlertTriangle, Package, Building2, TrendingDown, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import BackButton from '../components/BackButton';

const LowStockPage = () => {
  const [productBranches, setProductBranches] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const [productsRes, branchesRes, productBranchesRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/products`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/branches`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/product-branches`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (productsRes.ok && branchesRes.ok && productBranchesRes.ok) {
        const productsData = await productsRes.json();
        const branchesData = await branchesRes.json();
        const productBranchesData = await productBranchesRes.json();

        setProducts(productsData);
        setBranches(branchesData);
        setProductBranches(productBranchesData);
      } else {
        toast.error('Failed to load data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getLowStockItems = () => {
    return productBranches.filter(pb => {
      if (!pb.is_active) return false;

      const stock = pb.stock || 0;
      const reorderLevel = pb.reorder_level || 0;

      if (stock > reorderLevel) return false;

      if (selectedBranch && pb.branch_id !== parseInt(selectedBranch)) {
        return false;
      }

      const product = products.find(p => p.product_id === pb.product_id);
      if (product && searchTerm) {
        return (
          product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      return true;
    });
  };

  const getProduct = (productId) => {
    return products.find(p => p.product_id === productId);
  };

  const getBranch = (branchId) => {
    return branches.find(b => b.branch_id === branchId);
  };

  const getStockLevel = (stock, reorderLevel) => {
    if (stock === 0) return 'critical';
    if (stock <= reorderLevel * 0.5) return 'danger';
    return 'warning';
  };

  const lowStockItems = getLowStockItems();

  const criticalCount = lowStockItems.filter(item => item.stock === 0).length;
  const dangerCount = lowStockItems.filter(item => {
    const reorderLevel = item.reorder_level || 0;
    return item.stock > 0 && item.stock <= reorderLevel * 0.5;
  }).length;
  const warningCount = lowStockItems.length - criticalCount - dangerCount;

  return (
    <div className="min-h-screen gradient-bg p-6">
      <BackButton />
      
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <AlertTriangle className="w-10 h-10 text-red-400" />
            Low Stock Alerts
          </h1>
          <p className="text-gray-400">Monitor and manage low inventory levels</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-red-600/30 to-red-800/30 border border-red-500/50 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-300 text-sm font-semibold mb-1">CRITICAL</p>
                <p className="text-4xl font-bold text-white">{criticalCount}</p>
                <p className="text-red-400 text-xs mt-1">Out of Stock</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-red-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-600/30 to-orange-800/30 border border-orange-500/50 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-300 text-sm font-semibold mb-1">DANGER</p>
                <p className="text-4xl font-bold text-white">{dangerCount}</p>
                <p className="text-orange-400 text-xs mt-1">Very Low Stock</p>
              </div>
              <TrendingDown className="w-12 h-12 text-orange-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-600/30 to-yellow-800/30 border border-yellow-500/50 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-300 text-sm font-semibold mb-1">WARNING</p>
                <p className="text-4xl font-bold text-white">{warningCount}</p>
                <p className="text-yellow-400 text-xs mt-1">Below Reorder Level</p>
              </div>
              <Package className="w-12 h-12 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/50 to-red-900/30 backdrop-blur-lg border border-gray-700/50 rounded-xl p-6 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by product name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all appearance-none"
              >
                <option value="">All Branches</option>
                {branches.filter(b => b.is_active).map(branch => (
                  <option key={branch.branch_id} value={branch.branch_id}>
                    {branch.name} ({branch.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading alerts...</p>
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-20 h-20 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-2">No low stock alerts</p>
              <p className="text-gray-500">All products are adequately stocked!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-600/50">
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Alert</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-red-400" />
                        Product
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-red-400" />
                        Branch
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 text-gray-300 font-semibold">Current Stock</th>
                    <th className="text-center py-3 px-4 text-gray-300 font-semibold">Reorder Level</th>
                    <th className="text-center py-3 px-4 text-gray-300 font-semibold">Shortage</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item, index) => {
                    const product = getProduct(item.product_id);
                    const branch = getBranch(item.branch_id);
                    const stockLevel = getStockLevel(item.stock, item.reorder_level);
                    const shortage = Math.max(0, (item.reorder_level || 0) - (item.stock || 0));

                    return (
                      <tr key={index} className={`border-b border-gray-700/50 hover:bg-gray-700/20 transition-all ${
                        stockLevel === 'critical' ? 'bg-red-900/20' :
                        stockLevel === 'danger' ? 'bg-orange-900/20' :
                        'bg-yellow-900/20'
                      }`}>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className={`w-5 h-5 ${
                              stockLevel === 'critical' ? 'text-red-400 animate-pulse' :
                              stockLevel === 'danger' ? 'text-orange-400' :
                              'text-yellow-400'
                            }`} />
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              stockLevel === 'critical' ? 'bg-red-600/50 text-red-200' :
                              stockLevel === 'danger' ? 'bg-orange-600/50 text-orange-200' :
                              'bg-yellow-600/50 text-yellow-200'
                            }`}>
                              {stockLevel === 'critical' ? 'CRITICAL' :
                               stockLevel === 'danger' ? 'DANGER' :
                               'WARNING'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="text-white font-semibold">{product?.name || 'Unknown'}</p>
                            <p className="text-gray-400 text-sm">{product?.sku || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="inline-flex items-center gap-2 bg-blue-600/30 border border-blue-500/50 px-3 py-1 rounded-full">
                            <Building2 className="w-3 h-3 text-blue-400" />
                            <span className="text-blue-200 text-sm font-semibold">{branch?.name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`text-xl font-bold ${
                            item.stock === 0 ? 'text-red-400' :
                            item.stock <= (item.reorder_level * 0.5) ? 'text-orange-400' :
                            'text-yellow-400'
                          }`}>
                            {item.stock}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-gray-300 font-semibold">{item.reorder_level}</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-red-400 font-bold">-{shortage}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {lowStockItems.length > 0 && (
          <div className="mt-6 bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <p className="text-white font-semibold mb-1">Action Required</p>
                <p className="text-gray-300 text-sm">
                  {lowStockItems.length} product{lowStockItems.length !== 1 ? 's are' : ' is'} below reorder level. 
                  Consider creating purchase orders to replenish stock and avoid stockouts.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LowStockPage;
