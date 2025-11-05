import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { DollarSign, ShoppingCart, Package, AlertTriangle, Calendar, Wrench, Users, Home, TrendingUp, ShoppingBag } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import SectorLayout from '../components/SectorLayout';
import { API } from '../App';
import { toast } from 'sonner';
import { getSectorModules } from '../config/sectorModules';
import { formatCurrency, formatDate } from '../utils/formatters';
import Footer from '../components/Footer';

const SectorDashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const businessType = user?.business_type || 'pharmacy';
  const sectorConfig = getSectorModules(businessType);
  
  // Mobile shop specific stats
  const [mobileShopStats, setMobileShopStats] = useState({
    pendingRepairs: 0,
    lowStockBreakdown: { critical: 0, danger: 0, warning: 0 },
    recentPurchases: 0,
    topProducts: []
  });

  useEffect(() => {
    fetchStats();
    fetchChartData();
    if (businessType === 'mobile_shop') {
      fetchMobileShopStats();
    }
  }, [businessType]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch dashboard stats');
    }
  };

  const fetchChartData = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/sales-chart`);
      setChartData(response.data);
    } catch (error) {
      console.error('Failed to fetch chart data');
    }
  };

  const fetchMobileShopStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch all required data in parallel
      const [repairsRes, productBranchesRes, productsRes, purchasesRes, topProductsRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/repairs`, { headers }),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/product-branches`, { headers }),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/products`, { headers }),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/purchases`, { headers }),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reports/top-products?limit=5`, { headers })
      ]);

      if (repairsRes.ok && productBranchesRes.ok && productsRes.ok && purchasesRes.ok && topProductsRes.ok) {
        const repairs = await repairsRes.json();
        const productBranches = await productBranchesRes.json();
        const products = await productsRes.json();
        const purchases = await purchasesRes.json();
        const topProducts = await topProductsRes.json();

        // Calculate pending repairs
        const pendingRepairs = repairs.filter(r => 
          r.status === 'pending' || r.status === 'in_progress'
        ).length;

        // Calculate low stock breakdown
        const lowStockItems = productBranches.filter(pb => {
          if (!pb.is_active) return false;
          const stock = pb.stock || 0;
          const reorderLevel = pb.reorder_level || 0;
          return stock <= reorderLevel;
        });

        const critical = lowStockItems.filter(item => item.stock === 0).length;
        const danger = lowStockItems.filter(item => {
          const reorderLevel = item.reorder_level || 0;
          return item.stock > 0 && item.stock <= reorderLevel * 0.5;
        }).length;
        const warning = lowStockItems.length - critical - danger;

        // Get recent purchases (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentPurchases = purchases.filter(p => 
          new Date(p.date) >= sevenDaysAgo
        ).length;

        // Format top products with names
        const formattedTopProducts = topProducts.map(tp => {
          const product = products.find(p => p.product_id === tp.product_id);
          return {
            name: product?.name || 'Unknown',
            quantity: tp.total_quantity,
            revenue: tp.total_revenue
          };
        });

        setMobileShopStats({
          pendingRepairs,
          lowStockBreakdown: { critical, danger, warning },
          recentPurchases,
          topProducts: formattedTopProducts
        });
      }
    } catch (error) {
      console.error('Failed to fetch mobile shop stats:', error);
    }
  };

  // Universal tagline for all business types
  const getWelcomeMessage = () => {
    return 'Manage sales, stock, purchases & repairs in one place';
  };

  // Sector-specific alerts
  const getSectorAlerts = () => {
    if (businessType === 'pharmacy' && stats) {
      return [
        { type: 'warning', message: `${stats.low_stock_items} items need restock`, icon: AlertTriangle },
        { type: 'info', message: 'Check expiring medicines', icon: Package }
      ];
    }
    if (businessType === 'salon' && stats) {
      return [
        { type: 'info', message: 'Today\'s appointments ready', icon: Calendar }
      ];
    }
    if (businessType === 'mobile_shop' && stats) {
      return [
        { type: 'info', message: 'Pending repairs to check', icon: Wrench }
      ];
    }
    return [];
  };

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-5xl">{sectorConfig.icon}</span>
            <div>
              <h1 className="text-4xl font-bold text-white">Smart Business ERP Dashboard</h1>
              <p className="text-slate-400">{getWelcomeMessage()}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="stat-card"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Total Sales</p>
                  <p className="text-3xl font-bold text-white" data-testid="total-sales">
                    {formatCurrency(stats.total_sales)}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="stat-card"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-7 h-7 text-green-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Total Orders</p>
                  <p className="text-3xl font-bold text-white" data-testid="total-orders">
                    {stats.total_orders}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="stat-card"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <Package className="w-7 h-7 text-purple-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">
                    {businessType === 'salon' || businessType === 'clinic' ? 'Services' : 'Products'}
                  </p>
                  <p className="text-3xl font-bold text-white" data-testid="total-products">
                    {stats.total_products}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="stat-card"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-orange-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Alerts</p>
                  <p className="text-3xl font-bold text-white" data-testid="low-stock-items">
                    {stats.low_stock_items}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Sales Chart */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Sales Overview (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sector-specific alerts and quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Today's Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Today's Sales</span>
                <span className="text-xl font-bold text-green-400">
                  {formatCurrency(stats?.today_sales || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Monthly Sales</span>
                <span className="text-xl font-bold text-blue-400">
                  {formatCurrency(stats?.monthly_sales || 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {getSectorAlerts().map((alert, index) => {
                const Icon = alert.icon;
                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${alert.type === 'warning' ? 'bg-orange-400' : 'bg-blue-400'}`}></div>
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">{alert.message}</span>
                  </div>
                );
              })}
              {getSectorAlerts().length === 0 && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-slate-300">System running smoothly</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Shop Enhanced Dashboard */}
        {businessType === 'mobile_shop' && (
          <div className="mt-8 space-y-6">
            {/* Enhanced Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Pending Repairs Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-md border border-purple-500/20 rounded-2xl p-6 hover:scale-105 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Wrench className="w-6 h-6 text-purple-400" />
                  </div>
                  <span className="text-sm text-purple-300 font-medium">Active</span>
                </div>
                <p className="text-slate-400 text-sm mb-1">Pending Repairs</p>
                <p className="text-4xl font-bold text-white">{mobileShopStats.pendingRepairs}</p>
              </motion.div>

              {/* Low Stock Critical Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-red-500/10 to-orange-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-6 hover:scale-105 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <span className="text-sm text-red-300 font-medium">Critical</span>
                </div>
                <p className="text-slate-400 text-sm mb-1">Out of Stock</p>
                <p className="text-4xl font-bold text-white">{mobileShopStats.lowStockBreakdown.critical}</p>
              </motion.div>

              {/* Low Stock Warning Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-md border border-yellow-500/20 rounded-2xl p-6 hover:scale-105 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-yellow-400" />
                  </div>
                  <span className="text-sm text-yellow-300 font-medium">Warning</span>
                </div>
                <p className="text-slate-400 text-sm mb-1">Low Stock Items</p>
                <p className="text-4xl font-bold text-white">
                  {mobileShopStats.lowStockBreakdown.danger + mobileShopStats.lowStockBreakdown.warning}
                </p>
              </motion.div>

              {/* Recent Purchases Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-md border border-green-500/20 rounded-2xl p-6 hover:scale-105 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-green-400" />
                  </div>
                  <span className="text-sm text-green-300 font-medium">7 Days</span>
                </div>
                <p className="text-slate-400 text-sm mb-1">Recent Purchases</p>
                <p className="text-4xl font-bold text-white">{mobileShopStats.recentPurchases}</p>
              </motion.div>
            </div>

            {/* Top Products Section */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-6 h-6 text-blue-400" />
                <h3 className="text-2xl font-semibold text-white">Top Selling Products</h3>
              </div>
              
              {mobileShopStats.topProducts.length > 0 ? (
                <div className="space-y-4">
                  {mobileShopStats.topProducts.map((product, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20 hover:border-blue-400/40 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-blue-400 font-bold text-lg">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="text-white font-semibold">{product.name}</p>
                          <p className="text-slate-400 text-sm">Sold: {product.quantity} units</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold text-lg">
                          {formatCurrency(product.revenue || 0)}
                        </p>
                        <p className="text-slate-400 text-xs">Revenue</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No sales data available yet</p>
                </div>
              )}
            </div>

            {/* Stock Status Breakdown Chart */}
            <div className="glass-card p-6">
              <h3 className="text-2xl font-semibold text-white mb-6">Inventory Health</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-red-400 text-sm font-medium mb-1">Critical (Out of Stock)</p>
                  <p className="text-4xl font-bold text-white">{mobileShopStats.lowStockBreakdown.critical}</p>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6 text-center">
                  <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="w-8 h-8 text-orange-400" />
                  </div>
                  <p className="text-orange-400 text-sm font-medium mb-1">Danger (≤50% Reorder)</p>
                  <p className="text-4xl font-bold text-white">{mobileShopStats.lowStockBreakdown.danger}</p>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-center">
                  <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Package className="w-8 h-8 text-yellow-400" />
                  </div>
                  <p className="text-yellow-400 text-sm font-medium mb-1">Warning (Low Stock)</p>
                  <p className="text-4xl font-bold text-white">{mobileShopStats.lowStockBreakdown.warning}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <Footer />
      </motion.div>
    </SectorLayout>
  );
};

export default SectorDashboard;
