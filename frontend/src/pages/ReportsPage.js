import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, Download, Filter, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import BackButton from '../components/BackButton';
import SectorLayout from '../components/SectorLayout';
import { formatCurrency, formatDate } from '../utils/formatters';
import Footer from '../components/Footer';
import { API } from '../App';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const ReportsPage = ({ user, onLogout }) => {
  const [reportType, setReportType] = useState('profit-loss');
  const [profitLossData, setProfitLossData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [branchSalesData, setBranchSalesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    loadReportData();
  }, [reportType, dateRange, customStartDate, customEndDate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      if (reportType === 'profit-loss') {
        const response = await fetch(`${API}/reports/profit-loss`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setProfitLossData(data);
        }
      } else if (reportType === 'top-products') {
        const response = await fetch(`${API}/reports/top-products?limit=10`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setTopProducts(data);
        }
      } else if (reportType === 'sales') {
        const response = await fetch(`${API}/sales`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setSales(filterByDateRange(data));
        }
      } else if (reportType === 'purchases') {
        const response = await fetch(`${API}/purchases`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setPurchases(filterByDateRange(data));
        }
      } else if (reportType === 'branch-sales') {
        let url = `${API}/reports/branch-sales`;
        const params = new URLSearchParams();
        
        const now = new Date();
        let start = null;
        let end = now.toISOString().split('T')[0];
        
        if (dateRange === 'today') {
          start = end;
        } else if (dateRange === 'week') {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          start = weekAgo.toISOString().split('T')[0];
        } else if (dateRange === 'month') {
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          start = monthAgo.toISOString().split('T')[0];
        } else if (dateRange === 'year') {
          const yearAgo = new Date(now);
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          start = yearAgo.toISOString().split('T')[0];
        } else if (dateRange === 'custom') {
          if (customStartDate) start = customStartDate;
          if (customEndDate) end = customEndDate;
        }
        
        if (start) params.append('start_date', start);
        if (dateRange !== 'all') params.append('end_date', end);
        if (params.toString()) url += `?${params.toString()}`;
        
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setBranchSalesData(data);
        }
      }
    } catch (error) {
      console.error('Error loading report:', error);
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const filterByDateRange = (data) => {
    if (dateRange === 'all') return data;

    const now = new Date();
    let startDate;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          return data.filter(item => {
            const itemDate = new Date(item.created_at);
            return itemDate >= new Date(customStartDate) && itemDate <= new Date(customEndDate);
          });
        }
        return data;
      default:
        return data;
    }

    return data.filter(item => new Date(item.created_at) >= startDate);
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Report exported successfully!');
  };

  const calculateSalesStats = () => {
    const total = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const count = sales.length;
    const avg = count > 0 ? total / count : 0;

    return { total, count, avg };
  };

  const calculatePurchasesStats = () => {
    const total = purchases.reduce((sum, purchase) => sum + (purchase.total_amount || 0), 0);
    const count = purchases.length;
    const avg = count > 0 ? total / count : 0;

    return { total, count, avg };
  };

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <BackButton />
      
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <BarChart3 className="w-10 h-10 text-indigo-400" />
            Business Reports & Analytics
          </h1>
          <p className="text-gray-400">Comprehensive insights into your business performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => setReportType('profit-loss')}
            className={`p-6 rounded-xl border-2 transition-all duration-200 ${
              reportType === 'profit-loss'
                ? 'bg-gradient-to-br from-green-600/30 to-green-800/30 border-green-500 shadow-xl scale-105'
                : 'bg-gray-800/50 border-gray-700 hover:border-green-500'
            }`}
          >
            <DollarSign className="w-8 h-8 text-green-400 mb-2" />
            <h3 className="text-white font-semibold">Profit & Loss</h3>
            <p className="text-gray-400 text-sm">Financial summary</p>
          </button>

          <button
            onClick={() => setReportType('sales')}
            className={`p-6 rounded-xl border-2 transition-all duration-200 ${
              reportType === 'sales'
                ? 'bg-gradient-to-br from-blue-600/30 to-blue-800/30 border-blue-500 shadow-xl scale-105'
                : 'bg-gray-800/50 border-gray-700 hover:border-blue-500'
            }`}
          >
            <ShoppingCart className="w-8 h-8 text-blue-400 mb-2" />
            <h3 className="text-white font-semibold">Sales Report</h3>
            <p className="text-gray-400 text-sm">All sales transactions</p>
          </button>

          <button
            onClick={() => setReportType('purchases')}
            className={`p-6 rounded-xl border-2 transition-all duration-200 ${
              reportType === 'purchases'
                ? 'bg-gradient-to-br from-purple-600/30 to-purple-800/30 border-purple-500 shadow-xl scale-105'
                : 'bg-gray-800/50 border-gray-700 hover:border-purple-500'
            }`}
          >
            <Package className="w-8 h-8 text-purple-400 mb-2" />
            <h3 className="text-white font-semibold">Purchase Report</h3>
            <p className="text-gray-400 text-sm">All purchases</p>
          </button>

          <button
            onClick={() => setReportType('top-products')}
            className={`p-6 rounded-xl border-2 transition-all duration-200 ${
              reportType === 'top-products'
                ? 'bg-gradient-to-br from-yellow-600/30 to-yellow-800/30 border-yellow-500 shadow-xl scale-105'
                : 'bg-gray-800/50 border-gray-700 hover:border-yellow-500'
            }`}
          >
            <TrendingUp className="w-8 h-8 text-yellow-400 mb-2" />
            <h3 className="text-white font-semibold">Top Products</h3>
            <p className="text-gray-400 text-sm">Best sellers</p>
          </button>

          <button
            onClick={() => setReportType('branch-sales')}
            className={`p-6 rounded-xl border-2 transition-all duration-200 ${
              reportType === 'branch-sales'
                ? 'bg-gradient-to-br from-cyan-600/30 to-cyan-800/30 border-cyan-500 shadow-xl scale-105'
                : 'bg-gray-800/50 border-gray-700 hover:border-cyan-500'
            }`}
          >
            <Building2 className="w-8 h-8 text-cyan-400 mb-2" />
            <h3 className="text-white font-semibold">Branch Sales</h3>
            <p className="text-gray-400 text-sm">Sales by branch</p>
          </button>
        </div>

        {(reportType === 'sales' || reportType === 'purchases' || reportType === 'branch-sales') && (
          <div className="bg-gradient-to-br from-gray-800/50 to-indigo-900/30 backdrop-blur-lg border border-gray-700/50 rounded-xl p-6 mb-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-indigo-400" />
              <h3 className="text-white font-semibold">Date Range Filter</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              {['all', 'today', 'week', 'month', 'year', 'custom'].map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    dateRange === range
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
            {dateRange === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-gray-300 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading report...</p>
          </div>
        ) : (
          <>
            {reportType === 'profit-loss' && profitLossData && (
              <div className="bg-gradient-to-br from-gray-800/50 to-indigo-900/30 backdrop-blur-lg border border-gray-700/50 rounded-xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-green-400" />
                    Profit & Loss Statement
                  </h2>
                  <button
                    onClick={() => exportToCSV([profitLossData], 'profit_loss_report')}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-green-600/20 border border-green-500/50 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-300 text-sm font-semibold mb-1">TOTAL REVENUE</p>
                        <p className="text-4xl font-bold text-white">{formatCurrency(profitLossData.revenue)}</p>
                      </div>
                      <TrendingUp className="w-12 h-12 text-green-400" />
                    </div>
                  </div>

                  <div className="bg-red-600/20 border border-red-500/50 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-red-300 text-sm font-semibold mb-1">TOTAL EXPENSES</p>
                        <p className="text-4xl font-bold text-white">{formatCurrency(profitLossData.expenses + profitLossData.purchases)}</p>
                      </div>
                      <TrendingDown className="w-12 h-12 text-red-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-600">
                    <span className="text-gray-300 font-semibold">Operating Expenses</span>
                    <span className="text-red-400 font-bold">{formatCurrency(profitLossData.expenses)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-600">
                    <span className="text-gray-300 font-semibold">Purchase Costs</span>
                    <span className="text-red-400 font-bold">{formatCurrency(profitLossData.purchases)}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border border-indigo-500/50 rounded-lg px-6 mt-6">
                    <span className="text-white font-bold text-xl">NET PROFIT</span>
                    <span className={`font-bold text-3xl ${profitLossData.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(profitLossData.profit)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-gray-300">Profit Margin</span>
                    <span className={`font-bold ${profitLossData.profit_margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {profitLossData.profit_margin.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {reportType === 'top-products' && (
              <div className="bg-gradient-to-br from-gray-800/50 to-indigo-900/30 backdrop-blur-lg border border-gray-700/50 rounded-xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-yellow-400" />
                    Top 10 Best-Selling Products
                  </h2>
                  <button
                    onClick={() => exportToCSV(topProducts, 'top_products_report')}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>

                {topProducts.length === 0 ? (
                  <div className="text-center py-16">
                    <Package className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No sales data available</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-600/50">
                          <th className="text-left py-3 px-4 text-gray-300 font-semibold">Rank</th>
                          <th className="text-left py-3 px-4 text-gray-300 font-semibold">Product ID</th>
                          <th className="text-center py-3 px-4 text-gray-300 font-semibold">Quantity Sold</th>
                          <th className="text-right py-3 px-4 text-gray-300 font-semibold">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((product, index) => (
                          <tr key={product.product_id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-all">
                            <td className="py-4 px-4">
                              <span className={`px-3 py-1 rounded-full font-bold ${
                                index === 0 ? 'bg-yellow-600/50 text-yellow-200' :
                                index === 1 ? 'bg-gray-500/50 text-gray-200' :
                                index === 2 ? 'bg-orange-600/50 text-orange-200' :
                                'bg-gray-700/50 text-gray-300'
                              }`}>
                                #{index + 1}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-white font-mono">{product.product_id}</td>
                            <td className="py-4 px-4 text-center text-white font-semibold">{product.quantity}</td>
                            <td className="py-4 px-4 text-right text-green-400 font-bold">৳{product.revenue.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {reportType === 'sales' && (
              <div className="bg-gradient-to-br from-gray-800/50 to-indigo-900/30 backdrop-blur-lg border border-gray-700/50 rounded-xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
                      <ShoppingCart className="w-6 h-6 text-blue-400" />
                      Sales Summary
                    </h2>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-gray-400">Total Sales: </span>
                        <span className="text-white font-bold">{calculateSalesStats().count}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Total Revenue: </span>
                        <span className="text-green-400 font-bold">৳{calculateSalesStats().total.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Avg Sale: </span>
                        <span className="text-blue-400 font-bold">৳{calculateSalesStats().avg.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => exportToCSV(sales, 'sales_report')}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>

                {sales.length === 0 ? (
                  <div className="text-center py-16">
                    <ShoppingCart className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No sales data available for selected period</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-600/50">
                          <th className="text-left py-3 px-4 text-gray-300 font-semibold">Sale ID</th>
                          <th className="text-center py-3 px-4 text-gray-300 font-semibold">Items</th>
                          <th className="text-right py-3 px-4 text-gray-300 font-semibold">Total</th>
                          <th className="text-center py-3 px-4 text-gray-300 font-semibold">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map((sale) => (
                          <tr key={sale.sale_id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-all">
                            <td className="py-4 px-4 text-white font-mono">{sale.sale_id}</td>
                            <td className="py-4 px-4 text-center text-gray-300">{sale.items?.length || 0}</td>
                            <td className="py-4 px-4 text-right text-green-400 font-bold">৳{sale.total?.toFixed(2) || '0.00'}</td>
                            <td className="py-4 px-4 text-center text-gray-400">{new Date(sale.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {reportType === 'purchases' && (
              <div className="bg-gradient-to-br from-gray-800/50 to-indigo-900/30 backdrop-blur-lg border border-gray-700/50 rounded-xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
                      <Package className="w-6 h-6 text-purple-400" />
                      Purchase Summary
                    </h2>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-gray-400">Total Purchases: </span>
                        <span className="text-white font-bold">{calculatePurchasesStats().count}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Total Amount: </span>
                        <span className="text-red-400 font-bold">৳{calculatePurchasesStats().total.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Avg Purchase: </span>
                        <span className="text-purple-400 font-bold">৳{calculatePurchasesStats().avg.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => exportToCSV(purchases, 'purchases_report')}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>

                {purchases.length === 0 ? (
                  <div className="text-center py-16">
                    <Package className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No purchase data available for selected period</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-600/50">
                          <th className="text-left py-3 px-4 text-gray-300 font-semibold">PO Number</th>
                          <th className="text-center py-3 px-4 text-gray-300 font-semibold">Items</th>
                          <th className="text-right py-3 px-4 text-gray-300 font-semibold">Total</th>
                          <th className="text-center py-3 px-4 text-gray-300 font-semibold">Status</th>
                          <th className="text-center py-3 px-4 text-gray-300 font-semibold">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchases.map((purchase) => (
                          <tr key={purchase.purchase_number} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-all">
                            <td className="py-4 px-4 text-white font-mono">{purchase.purchase_number}</td>
                            <td className="py-4 px-4 text-center text-gray-300">{purchase.items?.length || 0}</td>
                            <td className="py-4 px-4 text-right text-red-400 font-bold">{formatCurrency(purchase.total_amount || 0)}</td>
                            <td className="py-4 px-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                purchase.payment_status === 'paid' ? 'bg-green-600/30 text-green-400' :
                                purchase.payment_status === 'partial' ? 'bg-yellow-600/30 text-yellow-400' :
                                'bg-red-600/30 text-red-400'
                              }`}>
                                {purchase.payment_status?.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center text-gray-400">{formatDate(purchase.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {reportType === 'branch-sales' && branchSalesData && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-gray-800/50 to-indigo-900/30 backdrop-blur-lg border border-gray-700/50 rounded-xl p-8 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
                        <Building2 className="w-6 h-6 text-cyan-400" />
                        Branch-wise Sales Report
                      </h2>
                      <div className="flex gap-6 text-sm flex-wrap">
                        <div>
                          <span className="text-gray-400">Total Branches: </span>
                          <span className="text-white font-bold">{branchSalesData.overall?.branch_count || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Total Sales: </span>
                          <span className="text-white font-bold">{branchSalesData.overall?.sales_count || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Total Revenue: </span>
                          <span className="text-green-400 font-bold">{formatCurrency(branchSalesData.overall?.total_sales || 0)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Items Sold: </span>
                          <span className="text-cyan-400 font-bold">{branchSalesData.overall?.items_sold || 0}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => exportToCSV(branchSalesData.branches || [], 'branch_sales_report')}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                  </div>

                  {branchSalesData.branches?.length > 0 && (
                    <div className="h-80 mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={branchSalesData.branches} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis 
                            dataKey="branch_name" 
                            stroke="#9CA3AF" 
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis 
                            stroke="#9CA3AF" 
                            tick={{ fill: '#9CA3AF' }}
                            tickFormatter={(value) => `৳${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1F2937', 
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#F9FAFB'
                            }}
                            formatter={(value) => [formatCurrency(value), 'Revenue']}
                          />
                          <Bar dataKey="total_sales" fill="#06B6D4" radius={[4, 4, 0, 0]}>
                            {branchSalesData.branches.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={index === 0 ? '#10B981' : index === 1 ? '#3B82F6' : '#06B6D4'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {branchSalesData.branches?.length === 0 ? (
                    <div className="text-center py-16">
                      <Building2 className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No branch sales data available for selected period</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-600/50">
                            <th className="text-left py-3 px-4 text-gray-300 font-semibold">Branch</th>
                            <th className="text-center py-3 px-4 text-gray-300 font-semibold">Code</th>
                            <th className="text-center py-3 px-4 text-gray-300 font-semibold">Sales Count</th>
                            <th className="text-center py-3 px-4 text-gray-300 font-semibold">Items Sold</th>
                            <th className="text-right py-3 px-4 text-gray-300 font-semibold">Subtotal</th>
                            <th className="text-right py-3 px-4 text-gray-300 font-semibold">Discount</th>
                            <th className="text-right py-3 px-4 text-gray-300 font-semibold">Tax</th>
                            <th className="text-right py-3 px-4 text-gray-300 font-semibold">Total Sales</th>
                            <th className="text-right py-3 px-4 text-gray-300 font-semibold">Payments</th>
                          </tr>
                        </thead>
                        <tbody>
                          {branchSalesData.branches.map((branch, index) => (
                            <tr key={branch.branch_id} className={`border-b border-gray-700/50 hover:bg-gray-700/20 transition-all ${index === 0 ? 'bg-green-900/10' : ''}`}>
                              <td className="py-4 px-4 text-white font-semibold flex items-center gap-2">
                                {index === 0 && <span className="text-yellow-400">🏆</span>}
                                {branch.branch_name}
                              </td>
                              <td className="py-4 px-4 text-center text-gray-400 font-mono text-sm">{branch.branch_code || '-'}</td>
                              <td className="py-4 px-4 text-center text-white font-bold">{branch.sales_count}</td>
                              <td className="py-4 px-4 text-center text-cyan-400 font-semibold">{branch.items_sold}</td>
                              <td className="py-4 px-4 text-right text-gray-300">{formatCurrency(branch.subtotal)}</td>
                              <td className="py-4 px-4 text-right text-orange-400">{formatCurrency(branch.discount)}</td>
                              <td className="py-4 px-4 text-right text-purple-400">{formatCurrency(branch.tax)}</td>
                              <td className="py-4 px-4 text-right text-green-400 font-bold">{formatCurrency(branch.total_sales)}</td>
                              <td className="py-4 px-4 text-right text-blue-400 font-semibold">{formatCurrency(branch.payments_received)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-t-2 border-indigo-500/50">
                            <td colSpan="2" className="py-4 px-4 text-white font-bold">TOTAL</td>
                            <td className="py-4 px-4 text-center text-white font-bold">{branchSalesData.overall?.sales_count}</td>
                            <td className="py-4 px-4 text-center text-cyan-300 font-bold">{branchSalesData.overall?.items_sold}</td>
                            <td className="py-4 px-4 text-right text-gray-200 font-bold">{formatCurrency(branchSalesData.overall?.subtotal || 0)}</td>
                            <td className="py-4 px-4 text-right text-orange-300 font-bold">{formatCurrency(branchSalesData.overall?.discount || 0)}</td>
                            <td className="py-4 px-4 text-right text-purple-300 font-bold">{formatCurrency(branchSalesData.overall?.tax || 0)}</td>
                            <td className="py-4 px-4 text-right text-green-300 font-bold text-lg">{formatCurrency(branchSalesData.overall?.total_sales || 0)}</td>
                            <td className="py-4 px-4 text-right text-blue-300 font-bold">{formatCurrency(branchSalesData.overall?.payments_received || 0)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        
        <Footer />
      </div>
    </SectorLayout>
  );
};

export default ReportsPage;