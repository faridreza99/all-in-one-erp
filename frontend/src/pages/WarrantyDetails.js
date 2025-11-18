import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { 
  ArrowLeft, Shield, Package, User, Phone, Calendar, 
  AlertCircle, FileText, Image as ImageIcon, CheckCircle,
  Clock, MessageSquare, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import WarrantySidebar from '../components/WarrantySidebar';

const WarrantyDetails = () => {
  const { warranty_id } = useParams();
  const navigate = useNavigate();
  const [warranty, setWarranty] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [inspectionData, setInspectionData] = useState({
    inspection_result: '',
    notes: '',
    estimated_cost: ''
  });
  const [showSupplierActionForm, setShowSupplierActionForm] = useState(false);
  const [supplierActionData, setSupplierActionData] = useState({
    action_type: 'replacement_sent',
    notes: '',
    replacement_serial: '',
    refund_amount: ''
  });

  useEffect(() => {
    fetchWarrantyDetails();
  }, [warranty_id]);

  const fetchWarrantyDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/warranty/${warranty_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWarranty(response.data.warranty);
      setEvents(response.data.events || []);
    } catch (error) {
      console.error('Failed to fetch warranty details:', error);
      toast.error('Failed to load warranty details');
    } finally {
      setLoading(false);
    }
  };

  const handleStartInspection = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/warranty/${warranty_id}/inspection/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Inspection started successfully');
      fetchWarrantyDetails();
      setShowInspectionForm(true);
    } catch (error) {
      console.error('Failed to start inspection:', error);
      toast.error(error.response?.data?.detail || 'Failed to start inspection');
    }
  };

  const handleCompleteInspection = async (e) => {
    e.preventDefault();
    
    if (!inspectionData.inspection_result || inspectionData.inspection_result.length < 10) {
      toast.error('Please provide a detailed inspection result (minimum 10 characters)');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/warranty/${warranty_id}/inspect`,
        {
          inspection_result: inspectionData.inspection_result,
          notes: inspectionData.notes || null,
          estimated_cost: inspectionData.estimated_cost ? parseFloat(inspectionData.estimated_cost) : null,
          attachments: []
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Inspection completed successfully');
      setShowInspectionForm(false);
      setInspectionData({ inspection_result: '', notes: '', estimated_cost: '' });
      fetchWarrantyDetails();
    } catch (error) {
      console.error('Failed to complete inspection:', error);
      toast.error(error.response?.data?.detail || 'Failed to complete inspection');
    }
  };

  const handleSupplierAction = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const actionDetails = {};
      
      if (supplierActionData.action_type === 'replacement_sent' && supplierActionData.replacement_serial) {
        actionDetails.replacement_serial = supplierActionData.replacement_serial;
      }
      if (supplierActionData.action_type === 'refund_issued' && supplierActionData.refund_amount) {
        actionDetails.refund_amount = parseFloat(supplierActionData.refund_amount);
      }
      
      await axios.post(
        `${API}/warranty/${warranty_id}/supplier-action`,
        {
          action_type: supplierActionData.action_type,
          action_details: actionDetails,
          notes: supplierActionData.notes || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Supplier action recorded successfully');
      setShowSupplierActionForm(false);
      setSupplierActionData({
        action_type: 'replacement_sent',
        notes: '',
        replacement_serial: '',
        refund_amount: ''
      });
      fetchWarrantyDetails();
    } catch (error) {
      console.error('Failed to record supplier action:', error);
      toast.error(error.response?.data?.detail || 'Failed to record supplier action');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
      claimed: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: AlertCircle },
      under_inspection: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock },
      replacement_pending: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Package },
      replaced: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
      refunded: { color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: CheckCircle },
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

  const getEventIcon = (eventType) => {
    const iconMap = {
      status_changed: Clock,
      claim_registered: AlertCircle,
      inspection_started: Clock,
      inspection_completed: CheckCircle,
      supplier_action_recorded: Package,
      financial_transaction: FileText
    };
    return iconMap[eventType] || MessageSquare;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading warranty details...</p>
        </div>
      </div>
    );
  }

  if (!warranty) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Warranty Not Found</h2>
          <p className="text-gray-400 mb-4">The warranty you're looking for doesn't exist</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-white/10 border border-white/20 text-white px-6 py-2 rounded-lg hover:bg-white/20"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <WarrantySidebar />
      <div className="lg:ml-64 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Warranties
          </button>
        </div>

      {/* Warranty Details Card */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{warranty.warranty_code}</h1>
              <p className="text-gray-400">{warranty.product_name}</p>
            </div>
          </div>
          {getStatusBadge(warranty.current_status)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" />
              Product Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Product:</span>
                <span className="text-white font-medium">{warranty.product_name}</span>
              </div>
              {warranty.serial_number && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Serial Number:</span>
                  <span className="text-white font-mono">{warranty.serial_number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Purchase Date:</span>
                <span className="text-white">{formatDate(warranty.purchase_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Warranty Period:</span>
                <span className="text-white">{warranty.warranty_period_months} months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Expiry Date:</span>
                <span className="text-white">{formatDate(warranty.warranty_expiry_date)}</span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-green-400" />
              Customer Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Name:</span>
                <span className="text-white font-medium">{warranty.customer_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Phone:</span>
                <span className="text-white">{warranty.customer_phone || 'N/A'}</span>
              </div>
              {warranty.customer_email && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="text-white">{warranty.customer_email}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Invoice No:</span>
                <span className="text-white font-mono">{warranty.invoice_no || 'N/A'}</span>
              </div>
              {warranty.supplier_name && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Supplier:</span>
                  <span className="text-white">{warranty.supplier_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {warranty.current_status === 'claimed' && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <button
              onClick={handleStartInspection}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all"
            >
              Start Inspection
            </button>
          </div>
        )}
      </div>

      {/* Inspection Form */}
      {showInspectionForm && warranty.current_status === 'under_inspection' && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Complete Inspection</h3>
          <form onSubmit={handleCompleteInspection} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Inspection Result *
              </label>
              <textarea
                value={inspectionData.inspection_result}
                onChange={(e) => setInspectionData({ ...inspectionData, inspection_result: e.target.value })}
                placeholder="Describe the inspection findings..."
                rows="4"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Additional Notes
              </label>
              <textarea
                value={inspectionData.notes}
                onChange={(e) => setInspectionData({ ...inspectionData, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows="3"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Estimated Cost (৳)
              </label>
              <input
                type="number"
                value={inspectionData.estimated_cost}
                onChange={(e) => setInspectionData({ ...inspectionData, estimated_cost: e.target.value })}
                placeholder="0.00"
                step="0.01"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all"
              >
                Complete Inspection
              </button>
              <button
                type="button"
                onClick={() => setShowInspectionForm(false)}
                className="bg-white/10 border border-white/20 text-white px-6 py-2 rounded-lg hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Supplier Action Section */}
      {warranty.current_status === 'declined' && !showSupplierActionForm && (
        <div className="bg-orange-500/10 backdrop-blur-sm rounded-xl border border-orange-500/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-400" />
                Supplier Action Required
              </h3>
              <p className="text-gray-400 text-sm">
                Inspection found it's the supplier's fault. Record the action taken with the supplier.
              </p>
            </div>
            <button
              onClick={() => setShowSupplierActionForm(true)}
              className="bg-gradient-to-r from-orange-600 to-amber-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-700 hover:to-amber-700 transition-all"
            >
              Record Supplier Action
            </button>
          </div>
        </div>
      )}

      {/* Supplier Action Form */}
      {showSupplierActionForm && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-400" />
            Record Supplier Action
          </h3>
          <form onSubmit={handleSupplierAction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Action Type *
              </label>
              <select
                value={supplierActionData.action_type}
                onChange={(e) => setSupplierActionData({ ...supplierActionData, action_type: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                required
              >
                <option value="replacement_sent">Replacement Sent by Supplier</option>
                <option value="repair_sent">Repair Sent to Supplier</option>
                <option value="cash_refund_offered">Cash Refund Offered</option>
                <option value="partial_refund">Partial Refund Issued</option>
                <option value="declined">Supplier Declined Claim</option>
              </select>
            </div>

            {supplierActionData.action_type === 'replacement_sent' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Replacement Serial Number
                </label>
                <input
                  type="text"
                  value={supplierActionData.replacement_serial}
                  onChange={(e) => setSupplierActionData({ ...supplierActionData, replacement_serial: e.target.value })}
                  placeholder="Enter replacement product serial number..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
              </div>
            )}

            {(supplierActionData.action_type === 'cash_refund_offered' || supplierActionData.action_type === 'partial_refund') && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Refund Amount (৳)
                </label>
                <input
                  type="number"
                  value={supplierActionData.refund_amount}
                  onChange={(e) => setSupplierActionData({ ...supplierActionData, refund_amount: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={supplierActionData.notes}
                onChange={(e) => setSupplierActionData({ ...supplierActionData, notes: e.target.value })}
                placeholder="Add any relevant notes about the supplier interaction..."
                rows="3"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-gradient-to-r from-orange-600 to-amber-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-orange-700 hover:to-amber-700 transition-all"
              >
                Submit Supplier Action
              </button>
              <button
                type="button"
                onClick={() => setShowSupplierActionForm(false)}
                className="bg-white/10 border border-white/20 text-white px-6 py-2 rounded-lg hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events Timeline */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-400" />
          Event Timeline ({events.length})
        </h3>
        
        {events.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No events recorded yet</p>
        ) : (
          <div className="space-y-4">
            {events.map((event, index) => {
              const EventIcon = getEventIcon(event.event_type);
              return (
                <div key={event.id || index} className="flex gap-4 pb-4 border-b border-white/5 last:border-0">
                  <div className="p-2 rounded-lg bg-white/5 h-fit">
                    <EventIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium capitalize">
                        {event.event_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {formatDate(event.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{event.note || 'No description'}</p>
                    {event.actor_name && (
                      <p className="text-gray-500 text-xs">
                        by {event.actor_name} ({event.actor_type})
                      </p>
                    )}
                    {event.attachments && event.attachments.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {event.attachments.slice(0, 3).map((url, i) => (
                          <img 
                            key={i} 
                            src={url} 
                            alt={`Evidence ${i + 1}`}
                            className="w-16 h-16 object-cover rounded border border-white/10 cursor-pointer hover:scale-110 transition-transform"
                            onClick={() => window.open(url, '_blank')}
                          />
                        ))}
                        {event.attachments.length > 3 && (
                          <div className="w-16 h-16 bg-white/5 rounded border border-white/10 flex items-center justify-center text-gray-400 text-xs">
                            +{event.attachments.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                    {event.meta && Object.keys(event.meta).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                          View details
                        </summary>
                        <pre className="mt-2 text-xs text-gray-400 bg-black/20 p-2 rounded overflow-x-auto">
                          {JSON.stringify(event.meta, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </>
  );
};

export default WarrantyDetails;
