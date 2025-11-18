import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertCircle, Package, DollarSign, XCircle } from 'lucide-react';
import axios from 'axios';
import { API } from '../App';
import { formatCurrency } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';

const NotificationBell = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [user]);

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
      default:
        return <Bell className="text-blue-400" size={20} />;
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
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-xs text-slate-400">{unreadCount} unread</span>
                )}
              </div>
            </div>

            <div className="divide-y divide-slate-700/30">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
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
                ))
              )}
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
    </div>
  );
};

export default NotificationBell;
