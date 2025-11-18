import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertTriangle, Package, DollarSign, XCircle, Check, Filter } from 'lucide-react';
import { toast } from 'sonner';
import SectorLayout from '../components/SectorLayout';
import BackButton from '../components/BackButton';
import { formatDistanceToNow } from 'date-fns';
import { API } from '../App';

const NotificationsPage = ({ user, onLogout }) => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = filter === 'unread' 
        ? `${API}/notifications?unread_only=true`
        : `${API}/notifications`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Extract notifications array from response
        setNotifications(data.notifications || []);
      } else {
        toast.error('Failed to load notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API}/notifications/${notificationId}/read`,
        {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, is_read: true, read: true } : n)
        );
        toast.success('Marked as read');
      } else {
        toast.error('Failed to mark as read');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read && !n.read).map(n => n.id);
    
    if (unreadIds.length === 0) {
      toast.info('No unread notifications');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await Promise.all(
        unreadIds.map(id =>
          fetch(`${API}/notifications/${id}/read`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
          })
        )
      );

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read: true })));
      toast.success(`Marked ${unreadIds.length} notifications as read`);
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'LOW_STOCK':
        return <Package className="w-6 h-6 text-orange-500" />;
      case 'PAYMENT_RECEIVED':
        return <DollarSign className="w-6 h-6 text-green-500" />;
      case 'UNPAID_INVOICE':
        return <AlertTriangle className="w-6 h-6 text-red-500" />;
      case 'SALE_CANCELLED':
        return <XCircle className="w-6 h-6 text-gray-500" />;
      default:
        return <Bell className="w-6 h-6 text-blue-500" />;
    }
  };

  const getNotificationStyle = (type, isRead) => {
    const baseStyle = 'p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg';
    const readStyle = isRead ? 'bg-white/50 border-gray-200' : 'bg-white border-blue-300 shadow-md';
    
    return `${baseStyle} ${readStyle}`;
  };

  const getNotificationTypeLabel = (type) => {
    const labels = {
      LOW_STOCK: 'Low Stock Alert',
      PAYMENT_RECEIVED: 'Payment Received',
      UNPAID_INVOICE: 'Unpaid Invoice',
      SALE_CANCELLED: 'Sale Cancelled'
    };
    return labels[type] || type;
  };

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <BackButton />

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Bell className="w-10 h-10 text-blue-400" />
              Notifications
            </h1>
            <p className="text-gray-300">Stay updated with your business alerts</p>
          </div>

          <button
            onClick={markAllAsRead}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Mark All Read
          </button>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
              filter === 'all'
                ? 'bg-white text-blue-600 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Filter className="w-5 h-5" />
            All Notifications
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
              filter === 'unread'
                ? 'bg-white text-blue-600 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Bell className="w-5 h-5" />
            Unread Only
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-xl">
            <Bell className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-700 mb-2">
              {filter === 'unread' ? 'No Unread Notifications' : 'No Notifications'}
            </h3>
            <p className="text-gray-500">
              {filter === 'unread' 
                ? 'You\'re all caught up! No unread notifications at the moment.'
                : 'You don\'t have any notifications yet. They\'ll appear here when you do.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={getNotificationStyle(notification.type, notification.is_read)}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                            {getNotificationTypeLabel(notification.type)}
                          </span>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                          )}
                        </div>
                        <p className="text-gray-800 text-lg font-medium mb-1">
                          {notification.message}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>

                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Mark Read
                        </button>
                      )}
                    </div>

                    {notification.reference_id && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          Reference: <span className="font-mono text-gray-700">{notification.reference_id}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectorLayout>
  );
};

export default NotificationsPage;
