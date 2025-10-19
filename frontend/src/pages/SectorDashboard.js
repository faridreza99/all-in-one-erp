import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { DollarSign, ShoppingCart, Package, AlertTriangle, Calendar, Wrench, Users, Home } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import SectorLayout from '../components/SectorLayout';
import { API } from '../App';
import { toast } from 'sonner';
import { getSectorModules } from '../config/sectorModules';

const SectorDashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const businessType = user?.business_type || 'pharmacy';
  const sectorConfig = getSectorModules(businessType);

  useEffect(() => {
    fetchStats();
    fetchChartData();
  }, []);

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

  // Sector-specific welcome messages
  const getWelcomeMessage = () => {
    const messages = {
      pharmacy: 'Manage your pharmacy operations efficiently',
      salon: 'Manage appointments and services',
      restaurant: 'Track orders and table management',
      mobile_shop: 'Handle repairs and device inventory',
      grocery: 'Manage inventory and special offers',
      clinic: 'Manage patients and appointments',
      garage: 'Track vehicles and services',
      real_estate: 'Manage properties and tenants',
      fashion: 'Manage products and variants',
      electronics: 'Handle electronics inventory',
      stationery: 'Manage stationery products',
      hardware: 'Track hardware inventory',
      furniture: 'Manage furniture inventory',
      wholesale: 'Manage wholesale operations',
      ecommerce: 'Manage online orders'
    };
    return messages[businessType] || 'Manage your business operations';
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
        <div className=\"mb-8\">
          <div className=\"flex items-center gap-3 mb-2\">
            <span className=\"text-5xl\">{sectorConfig.icon}</span>
            <div>
              <h1 className=\"text-4xl font-bold text-white\">{sectorConfig.name} Dashboard</h1>
              <p className=\"text-slate-400\">{getWelcomeMessage()}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8\">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className=\"stat-card\"
            >
              <div className=\"flex items-center gap-4\">
                <div className=\"w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center\">
                  <DollarSign className=\"w-7 h-7 text-blue-400\" />
                </div>
                <div>
                  <p className=\"text-slate-400 text-sm\">Total Sales</p>
                  <p className=\"text-3xl font-bold text-white\" data-testid=\"total-sales\">
                    ${stats.total_sales.toFixed(2)}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className=\"stat-card\"
            >
              <div className=\"flex items-center gap-4\">
                <div className=\"w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center\">
                  <ShoppingCart className=\"w-7 h-7 text-green-400\" />
                </div>
                <div>
                  <p className=\"text-slate-400 text-sm\">Total Orders</p>
                  <p className=\"text-3xl font-bold text-white\" data-testid=\"total-orders\">
                    {stats.total_orders}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className=\"stat-card\"
            >
              <div className=\"flex items-center gap-4\">
                <div className=\"w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center\">
                  <Package className=\"w-7 h-7 text-purple-400\" />
                </div>
                <div>
                  <p className=\"text-slate-400 text-sm\">
                    {businessType === 'salon' || businessType === 'clinic' ? 'Services' : 'Products'}
                  </p>
                  <p className=\"text-3xl font-bold text-white\" data-testid=\"total-products\">
                    {stats.total_products}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className=\"stat-card\"
            >
              <div className=\"flex items-center gap-4\">
                <div className=\"w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center\">
                  <AlertTriangle className=\"w-7 h-7 text-orange-400\" />
                </div>
                <div>
                  <p className=\"text-slate-400 text-sm\">Alerts</p>
                  <p className=\"text-3xl font-bold text-white\" data-testid=\"low-stock-items\">
                    {stats.low_stock_items}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Sales Chart */}
        <div className=\"glass-card p-6 mb-8\">
          <h2 className=\"text-2xl font-bold text-white mb-6\">Sales Overview (Last 7 Days)</h2>
          <ResponsiveContainer width=\"100%\" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray=\"3 3\" stroke=\"rgba(255,255,255,0.1)\" />
              <XAxis dataKey=\"date\" stroke=\"#94a3b8\" />
              <YAxis stroke=\"#94a3b8\" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
              <Line
                type=\"monotone\"
                dataKey=\"sales\"
                stroke=\"#3b82f6\"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sector-specific alerts and quick actions */}
        <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
          <div className=\"glass-card p-6\">
            <h3 className=\"text-xl font-semibold text-white mb-4\">Today's Performance</h3>
            <div className=\"space-y-3\">
              <div className=\"flex justify-between items-center\">
                <span className=\"text-slate-400\">Today's Sales</span>
                <span className=\"text-xl font-bold text-green-400\">
                  ${stats?.today_sales.toFixed(2)}
                </span>
              </div>
              <div className=\"flex justify-between items-center\">
                <span className=\"text-slate-400\">Monthly Sales</span>
                <span className=\"text-xl font-bold text-blue-400\">
                  ${stats?.monthly_sales.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className=\"glass-card p-6\">
            <h3 className=\"text-xl font-semibold text-white mb-4\">Quick Actions</h3>
            <div className=\"space-y-3\">
              {getSectorAlerts().map((alert, index) => {
                const Icon = alert.icon;
                return (
                  <div key={index} className=\"flex items-center gap-3\">
                    <div className={`w-2 h-2 rounded-full ${\n                      alert.type === 'warning' ? 'bg-orange-400' : 'bg-blue-400'\n                    }`}></div>
                    <Icon className=\"w-4 h-4 text-slate-400\" />
                    <span className=\"text-slate-300\">{alert.message}</span>
                  </div>
                );
              })}
              {getSectorAlerts().length === 0 && (
                <div className=\"flex items-center gap-3\">
                  <div className=\"w-2 h-2 bg-green-400 rounded-full\"></div>
                  <span className=\"text-slate-300\">System running smoothly</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </SectorLayout>
  );
};

export default SectorDashboard;
