import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Ship, FileText, DollarSign, Truck, File, TrendingUp, Package, AlertCircle } from 'lucide-react';
import SectorLayout from '../../components/SectorLayout';
import { API } from '../../App';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Footer from '../../components/Footer';

const CNFDashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState({
    total_shipments: 0,
    active_shipments: 0,
    total_jobs: 0,
    active_jobs: 0,
    total_revenue: 0,
    pending_payments: 0,
    total_transports: 0,
    active_transports: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/cnf/reports/summary`);
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch CNF stats');
    }
  };

  const statCards = [
    {
      title: 'Total Shipments',
      value: stats.total_shipments,
      icon: Ship,
      color: 'from-blue-500 to-blue-600',
      active: stats.active_shipments,
      activeLabel: 'Active'
    },
    {
      title: 'Job Files',
      value: stats.total_jobs,
      icon: FileText,
      color: 'from-purple-500 to-purple-600',
      active: stats.active_jobs,
      activeLabel: 'Active'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.total_revenue),
      icon: DollarSign,
      color: 'from-green-500 to-green-600',
      subtitle: `${formatCurrency(stats.pending_payments)} pending`
    },
    {
      title: 'Transports',
      value: stats.total_transports,
      icon: Truck,
      color: 'from-orange-500 to-orange-600',
      active: stats.active_transports,
      activeLabel: 'Active'
    }
  ];

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <div className="min-h-screen gradient-bg">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
              CNF Dashboard
            </h1>
            <p className="text-gray-400">
              Manage shipments, customs clearance & forwarding operations
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-blue-500 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color}`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  {stat.active !== undefined && (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{stat.activeLabel}</p>
                      <p className="text-lg font-bold text-blue-400">{stat.active}</p>
                    </div>
                  )}
                </div>
                <h3 className="text-gray-400 text-sm mb-1">{stat.title}</h3>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                {stat.subtitle && (
                  <p className="text-xs text-gray-500 mt-2">{stat.subtitle}</p>
                )}
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Quick Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
                  <Ship className="w-5 h-5 text-blue-400" />
                  Shipment Status
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                    <span className="text-gray-300">Active Shipments</span>
                    <span className="font-semibold text-blue-400">{stats.active_shipments}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                    <span className="text-gray-300">Total Shipments</span>
                    <span className="font-semibold text-white">{stats.total_shipments}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  Financial Overview
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                    <span className="text-gray-300">Total Revenue</span>
                    <span className="font-semibold text-green-400">{formatCurrency(stats.total_revenue)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                    <span className="text-gray-300">Pending Payments</span>
                    <span className="font-semibold text-yellow-400">{formatCurrency(stats.pending_payments)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        <Footer />
      </div>
    </SectorLayout>
  );
};

export default CNFDashboard;
