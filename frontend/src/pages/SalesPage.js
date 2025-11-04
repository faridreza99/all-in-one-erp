import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Download, DollarSign, Calendar } from 'lucide-react';
import SectorLayout from '../components/SectorLayout';
import BackButton from '../components/BackButton';
import { API } from '../App';
import { toast } from 'sonner';

const SalesPage = ({ user, onLogout }) => {
  const [sales, setSales] = useState([]);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const response = await axios.get(`${API}/sales`);
      setSales(response.data);
    } catch (error) {
      toast.error('Failed to fetch sales');
    }
  };

  const downloadInvoice = async (saleId) => {
    try {
      const response = await axios.get(`${API}/sales/${saleId}/invoice`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${saleId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Invoice downloaded');
    } catch (error) {
      toast.error('Failed to download invoice');
    }
  };

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <BackButton className="mb-4" />
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Sales History</h1>
          <p className="text-slate-400">View and manage all transactions</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-green-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Revenue</p>
                <p className="text-3xl font-bold text-white" data-testid="total-revenue">
                  ${sales.reduce((sum, s) => sum + s.total, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Transactions</p>
                <p className="text-3xl font-bold text-white" data-testid="total-transactions">
                  {sales.length}
                </p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Average Sale</p>
                <p className="text-3xl font-bold text-white">
                  ${sales.length > 0 ? (sales.reduce((sum, s) => sum + s.total, 0) / sales.length).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Recent Sales</h2>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Subtotal</th>
                  <th>Discount</th>
                  <th>Tax</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} data-testid={`sale-row-${sale.id}`}>
                    <td className="font-semibold text-blue-400">{sale.sale_number}</td>
                    <td className="text-slate-300">{sale.customer_name || 'Walk-in'}</td>
                    <td className="text-slate-300">{sale.items.length}</td>
                    <td className="text-slate-300">${sale.subtotal.toFixed(2)}</td>
                    <td className="text-orange-400">-${sale.discount.toFixed(2)}</td>
                    <td className="text-slate-300">${sale.tax.toFixed(2)}</td>
                    <td className="text-green-400 font-bold">${sale.total.toFixed(2)}</td>
                    <td>
                      <span className="badge badge-info">{sale.payment_method}</span>
                    </td>
                    <td className="text-slate-400 text-sm">
                      {new Date(sale.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        onClick={() => downloadInvoice(sale.id)}
                        className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                        data-testid="download-invoice"
                        title="Download Invoice"
                      >
                        <Download className="w-4 h-4 text-blue-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </SectorLayout>
  );
};

export default SalesPage;