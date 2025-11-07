import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { DollarSign, Users, AlertCircle, Calendar, Search } from 'lucide-react';
import axios from 'axios';
import SectorLayout from '../components/SectorLayout';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const CustomerDuesPage = ({ user, onLogout }) => {
  const [dues, setDues] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDues();
  }, []);

  const fetchDues = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/customer-dues`);
      setDues(response.data);
    } catch (error) {
      toast.error('Failed to fetch customer dues');
    } finally {
      setLoading(false);
    }
  };

  const filteredDues = dues.filter(due =>
    due.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    due.sale_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDueAmount = dues.reduce((sum, due) => sum + due.due_amount, 0);
  const totalCustomers = new Set(dues.map(due => due.customer_name)).size;

  return (
    <SectorLayout 
      user={user} 
      onLogout={onLogout} 
      title="Customer Dues"
      subtitle="Track and manage customer outstanding payments"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-red-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Outstanding</p>
                <p className="text-3xl font-bold text-white">৳{totalDueAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-7 h-7 text-orange-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Customers with Dues</p>
                <p className="text-3xl font-bold text-white">{totalCustomers}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-yellow-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Due Records</p>
                <p className="text-3xl font-bold text-white">{dues.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="glass-card p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name or sale number..."
              className="input pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Dues Table */}
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-400" />
            Outstanding Dues
          </h2>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
              <p className="text-slate-400 mt-4">Loading dues...</p>
            </div>
          ) : filteredDues.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">
                {searchTerm ? 'No matching dues found' : 'No outstanding dues'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Sale #</th>
                    <th>Customer Name</th>
                    <th>Total Amount</th>
                    <th>Paid Amount</th>
                    <th>Due Amount</th>
                    <th>Transaction Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDues.map((due) => (
                    <tr key={due.id}>
                      <td className="font-semibold text-cyan-400">{due.sale_number}</td>
                      <td className="font-semibold text-white">{due.customer_name}</td>
                      <td className="text-slate-300">৳{due.total_amount.toFixed(2)}</td>
                      <td className="text-green-400">৳{due.paid_amount.toFixed(2)}</td>
                      <td className="text-red-400 font-bold">৳{due.due_amount.toFixed(2)}</td>
                      <td className="text-slate-400 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(due.transaction_date).toLocaleDateString('en-GB')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </SectorLayout>
  );
};

export default CustomerDuesPage;
