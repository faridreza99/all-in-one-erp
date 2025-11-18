import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { 
  Shield, Search, Filter, AlertCircle, Clock, 
  CheckCircle, XCircle, Package, TrendingUp, ChevronRight 
} from 'lucide-react';
import { toast } from 'sonner';
import WarrantySidebar from '../components/WarrantySidebar';

const WarrantyDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: '',
    search: '',
    limit: 20,
    skip: 0
  });
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchStats();
    fetchWarranties();
  }, [filter]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/warranty/stats/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch warranty stats:', error);
      toast.error('Failed to load warranty statistics');
    }
  };

  const fetchWarranties = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.search) params.append('customer_phone', filter.search);
      params.append('limit', filter.limit);
      params.append('skip', filter.skip);

      const response = await axios.get(`${API}/warranty/list?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setWarranties(response.data.warranties || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch warranties:', error);
      toast.error('Failed to load warranties');
      setWarranties([]);
      // Reset pagination on error
      setFilter({ ...filter, skip: 0 });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
      claimed: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: AlertCircle },
      under_inspection: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock },
      replacement_pending: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Package },
      replaced: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
      refunded: { color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: TrendingUp },
      declined: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
      closed: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: CheckCircle }
    };

    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status.replace(/_/g, ' ').toUpperCase()}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const StatCard = ({ label, value, icon: Icon, color }) => (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm font-medium">{label}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );

  return (
    <>
      <WarrantySidebar />
      <div className="lg:ml-64 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Warranty Management</h1>
              <p className="text-gray-400">Monitor and manage product warranties</p>
            </div>
          </div>
        </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label="Total Warranties" 
            value={stats.total_warranties || 0}
            icon={Shield}
            color="bg-gradient-to-r from-blue-600 to-cyan-600"
          />
          <StatCard 
            label="Active Claims" 
            value={stats.claimed || 0}
            icon={AlertCircle}
            color="bg-gradient-to-r from-yellow-600 to-orange-600"
          />
          <StatCard 
            label="Under Inspection" 
            value={stats.under_inspection || 0}
            icon={Clock}
            color="bg-gradient-to-r from-purple-600 to-pink-600"
          />
          <StatCard 
            label="Resolved" 
            value={(stats.replaced || 0) + (stats.refunded || 0)}
            icon={CheckCircle}
            color="bg-gradient-to-r from-green-600 to-emerald-600"
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Filter className="w-4 h-4 inline mr-2" />
              Filter by Status
            </label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value, skip: 0 })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="claimed">Claimed</option>
              <option value="under_inspection">Under Inspection</option>
              <option value="replacement_pending">Replacement Pending</option>
              <option value="replaced">Replaced</option>
              <option value="refunded">Refunded</option>
              <option value="declined">Declined</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Search by Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Search className="w-4 h-4 inline mr-2" />
              Search by Phone
            </label>
            <input
              type="text"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value, skip: 0 })}
              placeholder="Enter customer phone"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Results per page */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Results per Page
            </label>
            <select
              value={filter.limit}
              onChange={(e) => setFilter({ ...filter, limit: parseInt(e.target.value), skip: 0 })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Warranties List */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">
            Warranties ({total})
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading warranties...</p>
          </div>
        ) : warranties.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No warranties found</p>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Warranty Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Purchase Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {warranties.map((warranty) => (
                  <tr 
                    key={warranty.id} 
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => navigate(`/warranty/${warranty.id}/details`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-blue-400 font-mono text-sm">
                        {warranty.warranty_code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{warranty.product_name}</div>
                      {warranty.serial_number && (
                        <div className="text-gray-500 text-xs font-mono">{warranty.serial_number}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white">{warranty.customer_name}</div>
                      <div className="text-gray-500 text-xs">{warranty.customer_phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-sm">
                      {formatDate(warranty.purchase_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-sm">
                      {formatDate(warranty.warranty_expiry_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(warranty.current_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/warranty/${warranty.id}/details`);
                        }}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > filter.limit && (
          <div className="p-6 border-t border-white/10 flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              Showing {filter.skip + 1} to {Math.min(filter.skip + filter.limit, total)} of {total} warranties
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter({ ...filter, skip: Math.max(0, filter.skip - filter.limit) })}
                disabled={filter.skip === 0}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setFilter({ ...filter, skip: filter.skip + filter.limit })}
                disabled={filter.skip + filter.limit >= total}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );
};

export default WarrantyDashboard;
