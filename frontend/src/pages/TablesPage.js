import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Plus, Users } from 'lucide-react';
import Layout from '../components/Layout';
import { API } from '../App';
import { toast } from 'sonner';

const TablesPage = ({ user, onLogout }) => {
  const [tables, setTables] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    table_number: '',
    capacity: ''
  });

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await axios.get(`${API}/tables`);
      setTables(response.data);
    } catch (error) {
      toast.error('Failed to fetch tables');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/tables`, formData);
      toast.success('Table created successfully');
      setShowModal(false);
      setFormData({ table_number: '', capacity: '' });
      fetchTables();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create table');
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Restaurant Tables</h1>
            <p className="text-slate-400">Manage table availability</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
            data-testid="add-table-button"
          >
            <Plus className="w-5 h-5" />
            Add Table
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {tables.map((table) => (
            <motion.div
              key={table.id}
              whileHover={{ scale: 1.05 }}
              className={`glass-card p-6 cursor-pointer ${
                table.status === 'available' ? 'border-green-500/30' :
                table.status === 'occupied' ? 'border-red-500/30' :
                'border-yellow-500/30'
              }`}
              data-testid={`table-card-${table.id}`}
            >
              <div className="text-center">
                <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${
                  table.status === 'available' ? 'bg-green-500/20' :
                  table.status === 'occupied' ? 'bg-red-500/20' :
                  'bg-yellow-500/20'
                }`}>
                  <span className="text-2xl font-bold text-white">{table.table_number}</span>
                </div>
                <p className={`text-sm font-semibold mb-1 ${
                  table.status === 'available' ? 'text-green-400' :
                  table.status === 'occupied' ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {table.status}
                </p>
                <div className="flex items-center justify-center gap-1 text-slate-400 text-xs">
                  <Users className="w-3 h-3" />
                  <span>{table.capacity}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 w-full max-w-md"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Add New Table</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Table Number</label>
                  <input
                    data-testid="table-number-input"
                    type="text"
                    value={formData.table_number}
                    onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Capacity</label>
                  <input
                    data-testid="table-capacity-input"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1" data-testid="submit-table">Create</button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </motion.div>
    </Layout>
  );
};

export default TablesPage;