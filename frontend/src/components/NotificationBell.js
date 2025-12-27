import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertCircle, Package, DollarSign, XCircle, Clock, CheckCircle, X, Wifi, WifiOff } from 'lucide-react';
import axios from 'axios';
import { API } from '../App';
import { formatCurrency } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const WS_RECONNECT_INTERVAL = 3000;
const WS_MAX_RECONNECT_ATTEMPTS = 5;
const FALLBACK_POLL_INTERVAL = 60000;

const NotificationBell = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const [showDueRequestModal, setShowDueRequestModal] = useState(false);
  const [selectedDueRequest, setSelectedDueRequest] = useState(null);
  const [processingRequest, setProcessingRequest] = useState(false);
  const [pendingDueCount, setPendingDueCount] = useState(0);
  
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef(null);
  const pingInterval = useRef(null);
  const pollInterval = useRef(null);

  const isAdmin = user?.role === 'tenant_admin' || user?.role === 'super_admin';

  const handleWebSocketMessage = useCallback((data) => {
    if (data.type === 'notification' || data.type === 'due_request') {
      fetchNotifications();
      if (isAdmin) fetchPendingDueCount();
      
      if (data.data?.title) {
        toast.info(data.data.title, {
          description: data.data.message || 'New notification received'
        });
      }
    }
  }, [isAdmin]);

  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      // Production-ready: dynamically determine protocol and use current host
      // Works behind Nginx reverse proxy at /ws path
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/${token}`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('NotificationBell WebSocket connected');
        setWsConnected(true);
        reconnectAttempts.current = 0;
        
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
          pollInterval.current = null;
        }
        
        pingInterval.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send('ping');
          }
        }, 30000);
      };

      wsRef.current.onmessage = (event) => {
        if (event.data === 'pong') return;
        
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      wsRef.current.onerror = () => {
        console.error('WebSocket error');
      };

      wsRef.current.onclose = (event) => {
        setWsConnected(false);
        
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
          pingInterval.current = null;
        }

        if (event.code >= 4000 && event.code <= 4003) {
          startFallbackPolling();
          return;
        }

        if (reconnectAttempts.current < WS_MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          reconnectTimeout.current = setTimeout(connectWebSocket, WS_RECONNECT_INTERVAL);
        } else {
          startFallbackPolling();
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      startFallbackPolling();
    }
  }, [user, handleWebSocketMessage]);

  const startFallbackPolling = useCallback(() => {
    if (!pollInterval.current) {
      pollInterval.current = setInterval(() => {
        fetchNotifications();
        if (isAdmin) fetchPendingDueCount();
      }, FALLBACK_POLL_INTERVAL);
    }
  }, [isAdmin]);

  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsConnected(false);
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      if (isAdmin) {
        fetchPendingDueCount();
      }
      connectWebSocket();
      
      return () => disconnectWebSocket();
    }
  }, [user, isAdmin, connectWebSocket, disconnectWebSocket]);

  const fetchPendingDueCount = async () => {
    try {
      const response = await axios.get(`${API}/due-requests/pending-count`);
      setPendingDueCount(response.data?.count || 0);
    } catch (error) {
      console.error('Failed to fetch pending due count:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`, {
        params: { limit: 20 }
      });
      const data = response.data || {};
      const notificationsList = data.notifications || [];
      setNotifications(Array.isArray(notificationsList) ? notificationsList : []);
      // Use unread_count from API response instead of calculating client-side
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.patch(`${API}/notifications/${notificationId}/read`);
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!user?.business_type) return;

    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Handle due request notifications for admins
    if (notification.type === 'due_request' && isAdmin) {
      handleDueRequestClick(notification);
      return;
    }

    // Handle approved due request notifications - redirect to invoice
    if (notification.type === 'due_request_approved' && notification.metadata?.sale_id) {
      navigate(`/${user.business_type}/invoice/${notification.metadata.sale_id}`);
      setIsOpen(false);
      return;
    }

    // Handle rejected due request notifications - show toast with info
    if (notification.type === 'due_request_rejected') {
      toast.info(`Due request ${notification.metadata?.request_number || ''} was rejected`);
      setIsOpen(false);
      return;
    }

    if (notification.type === 'unpaid_invoice' && notification.related_id) {
      navigate(`/${user.business_type}/invoice/${notification.related_id}`);
      setIsOpen(false);
    } else if (notification.type === 'low_stock') {
      navigate(`/${user.business_type}/low-stock`);
      setIsOpen(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'unpaid_invoice':
        return <AlertCircle className="text-red-400" size={20} />;
      case 'low_stock':
        return <Package className="text-yellow-400" size={20} />;
      case 'payment_received':
        return <DollarSign className="text-green-400" size={20} />;
      case 'sale_cancelled':
        return <XCircle className="text-orange-400" size={20} />;
      case 'due_request':
        return <Clock className="text-purple-400" size={20} />;
      case 'due_request_approved':
        return <CheckCircle className="text-green-400" size={20} />;
      case 'due_request_rejected':
        return <XCircle className="text-red-400" size={20} />;
      default:
        return <Bell className="text-blue-400" size={20} />;
    }
  };

  // Handle due request notification click
  const handleDueRequestClick = (notification) => {
    if (notification.metadata) {
      setSelectedDueRequest({
        id: notification.metadata.request_id,
        request_number: notification.metadata.request_number,
        customer_name: notification.metadata.customer_name,
        due_amount: notification.metadata.due_amount,
        requested_by: notification.metadata.requested_by,
        notification_id: notification.id
      });
      setShowDueRequestModal(true);
      setIsOpen(false);
    }
  };

  // Approve due request
  const handleApproveDueRequest = async () => {
    if (!selectedDueRequest) return;
    setProcessingRequest(true);
    try {
      await axios.patch(`${API}/due-requests/${selectedDueRequest.id}/approve`);
      toast.success('Due request approved successfully!');
      setShowDueRequestModal(false);
      setSelectedDueRequest(null);
      fetchNotifications();
      fetchPendingDueCount();
    } catch (error) {
      toast.error('Failed to approve due request');
      console.error(error);
    } finally {
      setProcessingRequest(false);
    }
  };

  // Reject due request
  const handleRejectDueRequest = async (reason = '') => {
    if (!selectedDueRequest) return;
    setProcessingRequest(true);
    try {
      await axios.patch(`${API}/due-requests/${selectedDueRequest.id}/reject`, null, {
        params: { reason }
      });
      toast.success('Due request rejected');
      setShowDueRequestModal(false);
      setSelectedDueRequest(null);
      fetchNotifications();
      fetchPendingDueCount();
    } catch (error) {
      toast.error('Failed to reject due request');
      console.error(error);
    } finally {
      setProcessingRequest(false);
    }
  };


  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6 text-white" />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-slate-800/95 backdrop-blur-lg border border-slate-700/50 rounded-xl shadow-2xl z-50"
          >
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-xs text-slate-400">{unreadCount} unread</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    activeTab === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700/50 text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab('due_requests')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'due_requests'
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-700/50 text-slate-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  Due Requests
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-700/30">
              {(() => {
                const filteredNotifications = activeTab === 'due_requests'
                  ? notifications.filter(n => ['due_request', 'due_request_approved', 'due_request_rejected'].includes(n.type))
                  : notifications;
                
                if (filteredNotifications.length === 0) {
                  return (
                    <div className="p-6 text-center text-slate-400">
                      {activeTab === 'due_requests' ? (
                        <>
                          <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>No due request notifications</p>
                        </>
                      ) : (
                        <>
                          <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>No notifications</p>
                        </>
                      )}
                    </div>
                  );
                }
                
                return filteredNotifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-500/5' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.read ? 'text-white font-medium' : 'text-slate-300'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(notification.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ));
              })()}
            </div>

            {notifications.length > 0 && user?.business_type && (
              <div className="p-3 border-t border-slate-700/50">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate(`/${user.business_type}/notifications`);
                  }}
                  className="w-full text-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View All Notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Due Request Approval Modal - Rendered via Portal */}
      {createPortal(
        <AnimatePresence>
          {showDueRequestModal && selectedDueRequest && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
              onClick={() => setShowDueRequestModal(false)}
            >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 border border-purple-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Due Payment Request</h3>
                    <p className="text-slate-400 text-sm">{selectedDueRequest.request_number}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDueRequestModal(false)}
                  className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Details */}
              <div className="space-y-4 mb-6">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-400 text-xs mb-1">Customer</p>
                      <p className="text-white font-medium">{selectedDueRequest.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs mb-1">Requested By</p>
                      <p className="text-white font-medium">{selectedDueRequest.requested_by}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-4">
                  <p className="text-slate-400 text-xs mb-1">Due Amount</p>
                  <p className="text-3xl font-bold text-purple-400">{formatCurrency(selectedDueRequest.due_amount)}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleRejectDueRequest()}
                  disabled={processingRequest}
                  className="flex-1 py-3 px-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Reject
                </button>
                <button
                  onClick={handleApproveDueRequest}
                  disabled={processingRequest}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processingRequest ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  Approve
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default NotificationBell;
