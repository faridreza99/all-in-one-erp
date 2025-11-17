import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Shield, Calendar, CheckCircle, XCircle, Clock, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const WarrantyResolve = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [warranty, setWarranty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      resolveWarranty();
    }
  }, [token]);

  const resolveWarranty = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/warranty/resolve?q=${token}`);
      setWarranty(response.data);
    } catch (err) {
      console.error('Warranty resolution error:', err);
      setError(err.response?.data?.detail || 'Invalid or expired warranty token');
      toast.error('Failed to load warranty details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-8 h-8 text-green-400" />;
      case 'expired':
        return <Clock className="w-8 h-8 text-red-400" />;
      case 'claimed':
        return <FileText className="w-8 h-8 text-yellow-400" />;
      case 'under_inspection':
        return <AlertTriangle className="w-8 h-8 text-orange-400" />;
      default:
        return <Shield className="w-8 h-8 text-blue-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'from-green-600 to-emerald-600';
      case 'expired':
        return 'from-red-600 to-rose-600';
      case 'claimed':
        return 'from-yellow-600 to-amber-600';
      case 'under_inspection':
        return 'from-orange-600 to-amber-600';
      case 'replaced':
        return 'from-purple-600 to-indigo-600';
      case 'refunded':
        return 'from-blue-600 to-cyan-600';
      default:
        return 'from-gray-600 to-slate-600';
    }
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Verifying warranty...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center border border-white/20">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Invalid Warranty</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <p className="text-sm text-gray-400">
            If you believe this is an error, please contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 md:p-8 mb-6 border border-white/20">
          <div className="flex items-center gap-4 mb-6">
            <div className={`p-4 rounded-xl bg-gradient-to-r ${getStatusColor(warranty.status)}`}>
              {getStatusIcon(warranty.status)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Warranty Details</h1>
              <p className="text-gray-300">Code: {warranty.warranty_code}</p>
            </div>
          </div>

          {/* Status Banner */}
          <div className={`p-4 rounded-xl bg-gradient-to-r ${getStatusColor(warranty.status)} mb-6`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-white/80 text-sm mb-1">Current Status</p>
                <p className="text-white text-xl font-bold capitalize">
                  {warranty.status.replace('_', ' ')}
                </p>
              </div>
              {warranty.days_remaining !== null && warranty.days_remaining >= 0 && (
                <div className="text-right">
                  <p className="text-white/80 text-sm mb-1">Time Remaining</p>
                  <p className="text-white text-xl font-bold">{warranty.days_remaining} days</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Information */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 md:p-8 mb-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" />
            Product Information
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-400 text-sm mb-1">Product Name</p>
              <p className="text-white text-lg font-semibold">{warranty.product.name}</p>
            </div>
            
            {warranty.product.serial_number && (
              <div>
                <p className="text-gray-400 text-sm mb-1">Serial Number</p>
                <p className="text-white text-lg font-mono">{warranty.product.serial_number}</p>
              </div>
            )}
            
            <div>
              <p className="text-gray-400 text-sm mb-1">Purchase Date</p>
              <p className="text-white text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                {formatDate(warranty.purchase_date)}
              </p>
            </div>
            
            <div>
              <p className="text-gray-400 text-sm mb-1">Warranty Expiry</p>
              <p className="text-white text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                {formatDate(warranty.expiry_date)}
              </p>
            </div>

            {warranty.customer_name && (
              <div>
                <p className="text-gray-400 text-sm mb-1">Customer Name</p>
                <p className="text-white text-lg">{warranty.customer_name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Available Actions */}
        {warranty.allowed_actions && warranty.allowed_actions.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Available Actions</h2>
            
            <div className="space-y-4">
              {warranty.can_claim && (
                <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-2">Register a Warranty Claim</h3>
                  <p className="text-gray-300 mb-4">
                    If you're experiencing issues with this product, you can register a warranty claim.
                    Our team will review and respond within 24 hours.
                  </p>
                  <button
                    onClick={() => navigate(`/warranty/${warranty.warranty_id}/claim`, {
                      state: { warrantyData: warranty, token }
                    })}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-200"
                  >
                    Register Claim
                  </button>
                </div>
              )}
              
              {warranty.allowed_actions.includes('request_manual_review') && (
                <div className="bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/30 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-2">Request Manual Review</h3>
                  <p className="text-gray-300 mb-4">
                    Your warranty has expired, but you can request a manual review. Additional
                    charges may apply based on the review outcome.
                  </p>
                  <button
                    onClick={() => navigate(`/warranty/${warranty.warranty_id}/manual-review`)}
                    className="bg-gradient-to-r from-orange-600 to-amber-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-700 hover:to-amber-700 transition-all duration-200"
                  >
                    Request Review
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Need help? Contact our support team at{' '}
            <a href="mailto:support@myerp.com" className="text-blue-400 hover:text-blue-300">
              support@myerp.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default WarrantyResolve;
