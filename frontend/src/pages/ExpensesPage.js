import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Plus, DollarSign, Calendar, TrendingDown } from 'lucide-react';
import Layout from '../components/Layout';
import { API } from '../App';
import { toast } from 'sonner';

const ExpensesPage = ({ user, onLogout }) => {
  const [expenses, setExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await axios.get(`${API}/expenses`);
      setExpenses(response.data);
    } catch (error) {
      toast.error('Failed to fetch expenses');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/expenses`, formData);
      toast.success('Expense added successfully');
      setShowModal(false);
      setFormData({ category: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
      fetchExpenses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add expense');
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const categories = [...new Set(expenses.map(e => e.category))];

  return (
    <Layout user={user} onLogout={onLogout}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Expenses</h1>
            <p className="text-slate-400">Track and manage business expenses</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
            data-testid="add-expense-button"
          >
            <Plus className="w-5 h-5" />
            Add Expense
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-red-500/20 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Expenses</p>
                <p className="text-3xl font-bold text-white" data-testid="total-expenses">
                  ${totalExpenses.toFixed(2)}
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
                <p className="text-slate-400 text-sm">This Month</p>
                <p className="text-3xl font-bold text-white">
                  ${expenses.filter(e => 
                    new Date(e.date).getMonth() === new Date().getMonth()
                  ).reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Categories</p>
                <p className="text-3xl font-bold text-white">{categories.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-6">All Expenses</h2>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} data-testid={`expense-row-${expense.id}`}>
                    <td className="text-slate-300">{expense.date}</td>
                    <td>
                      <span className="badge badge-info">{expense.category}</span>
                    </td>
                    <td className="text-slate-300">{expense.description}</td>
                    <td className="text-red-400 font-bold">-${expense.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 w-full max-w-md"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Add New Expense</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                  <input
                    data-testid="expense-category-input"
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full"
                    placeholder="e.g. Rent, Utilities, Salary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Amount</label>
                  <input
                    data-testid="expense-amount-input"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Date</label>
                  <input
                    data-testid="expense-date-input"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    data-testid="expense-description-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full"
                    rows="3"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1" data-testid="submit-expense">Add</button>
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

export default ExpensesPage;