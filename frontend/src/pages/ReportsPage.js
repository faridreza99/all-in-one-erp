import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Layout from '../components/Layout';
import { API } from '../App';
import { toast } from 'sonner';

const ReportsPage = ({ user, onLogout }) => {
  const [profitLoss, setProfitLoss] = useState(null);
  const [topProducts, setTopProducts] = useState([]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const [plResponse, topResponse] = await Promise.all([
        axios.get(`${API}/reports/profit-loss`),
        axios.get(`${API}/reports/top-products?limit=5`)
      ]);
      setProfitLoss(plResponse.data);
      setTopProducts(topResponse.data);
    } catch (error) {
      toast.error('Failed to fetch reports');
    }
  };

  const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <Layout user={user} onLogout={onLogout}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Reports & Analytics</h1>
          <p className="text-slate-400">Business insights and performance metrics</p>
        </div>

        {profitLoss && (
          <>
            {/* Profit/Loss Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="stat-card">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-7 h-7 text-green-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Revenue</p>
                    <p className="text-3xl font-bold text-white" data-testid="total-revenue">
                      ${profitLoss.revenue.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-red-500/20 rounded-xl flex items-center justify-center">
                    <TrendingDown className="w-7 h-7 text-red-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Expenses</p>
                    <p className="text-3xl font-bold text-white">
                      ${profitLoss.expenses.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-7 h-7 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Purchases</p>
                    <p className="text-3xl font-bold text-white">
                      ${profitLoss.purchases.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 ${profitLoss.profit >= 0 ? 'bg-blue-500/20' : 'bg-red-500/20'} rounded-xl flex items-center justify-center`}>
                    <DollarSign className={`w-7 h-7 ${profitLoss.profit >= 0 ? 'text-blue-400' : 'text-red-400'}`} />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Net Profit</p>
                    <p className={`text-3xl font-bold ${profitLoss.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${profitLoss.profit.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {profitLoss.profit_margin.toFixed(1)}% margin
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products Bar Chart */}
              <div className="glass-card p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Top Selling Products</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topProducts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="product_id" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Revenue Breakdown Pie Chart */}
              <div className="glass-card p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Revenue Breakdown</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Revenue', value: profitLoss.revenue },
                        { name: 'Expenses', value: profitLoss.expenses },
                        { name: 'Purchases', value: profitLoss.purchases }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </Layout>
  );
};

export default ReportsPage;