import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FileText, Ship, DollarSign, Truck } from 'lucide-react';
import SectorLayout from '../../components/SectorLayout';
import { API } from '../../App';
import { toast } from 'sonner';
import { formatCurrency } from '../../utils/formatters';
import Footer from '../../components/Footer';

const CNFReportsPage = ({ user, onLogout }) => {
  const [summary, setSummary] = useState({
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
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${API}/cnf/reports/summary`);
      setSummary(response.data);
    } catch (error) {
      toast.error('Failed to fetch reports');
    }
  };

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <div className="min-h-screen gradient-bg">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-8">
            CNF Reports
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600">
                  <Ship className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-gray-400">Total Shipments</p>
                  <p className="text-3xl font-bold text-white">{summary.total_shipments}</p>
                </div>
              </div>
              <p className="text-sm text-gray-400">Active: {summary.active_shipments}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-gray-400">Job Files</p>
                  <p className="text-3xl font-bold text-white">{summary.total_jobs}</p>
                </div>
              </div>
              <p className="text-sm text-gray-400">Active: {summary.active_jobs}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-gray-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(summary.total_revenue)}</p>
                </div>
              </div>
              <p className="text-sm text-yellow-400">Pending: {formatCurrency(summary.pending_payments)}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-gray-400">Transports</p>
                  <p className="text-3xl font-bold text-white">{summary.total_transports}</p>
                </div>
              </div>
              <p className="text-sm text-gray-400">Active: {summary.active_transports}</p>
            </motion.div>
          </div>
        </div>
        <Footer />
      </div>
    </SectorLayout>
  );
};

export default CNFReportsPage;
