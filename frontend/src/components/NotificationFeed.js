import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Info, AlertCircle, AlertTriangle, Sparkles, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../App';

const NotificationFeed = ({ user, isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/notifications`);
      const items = response.data.notifications || [];
      setNotifications(items);
      setUnreadCount(items.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.patch(`${API}/notifications/${notificationId}/read`);
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const dismissNotification = async (notificationId) => {
    try {
      await axios.patch(`${API}/notifications/${notificationId}/dismiss`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      toast.error('Failed to dismiss notification');
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      await Promise.all(unreadIds.map(id => axios.patch(`${API}/notifications/${id}/read`)));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'info': return <Info className="w-5 h-5 text-blue-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'maintenance': return <AlertCircle className="w-5 h-5 text-purple-400" />;
      case 'feature': return <Sparkles className="w-5 h-5 text-green-400" />;
      case 'promotion': return <Megaphone className="w-5 h-5 text-pink-400" />;
      default: return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTypeBorderColor = (type) => {
    switch(type) {
      case 'info': return 'border-blue-500/30';
      case 'warning': return 'border-yellow-500/30';
      case 'critical': return 'border-red-500/30';
      case 'maintenance': return 'border-purple-500/30';
      case 'feature': return 'border-green-500/30';
      case 'promotion': return 'border-pink-500/30';
      default: return 'border-gray-500/30';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-end z-50">
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        className="bg-gray-900 h-full w-full max-w-md border-l border-white/10 shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-lg border-b border-white/10 p-4 z-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6 text-purple-400" />
              Notifications
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          {unreadCount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
              </span>
              <button
                onClick={markAllAsRead}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>

        {/* Notification List */}
        <div className="overflow-y-auto h-full pb-24">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Bell className="w-12 h-12 mb-4 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 hover:bg-white/5 transition-colors border-l-4 ${getTypeBorderColor(notification.announcement_type)} ${
                    !notification.is_read ? 'bg-white/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getTypeIcon(notification.announcement_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className={`font-semibold ${!notification.is_read ? 'text-white' : 'text-gray-300'}`}>
                          {notification.title}
                        </h3>
                        <button
                          onClick={() => dismissNotification(notification.id)}
                          className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0 ml-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{notification.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {formatDate(notification.created_at)}
                        </span>
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default NotificationFeed;
