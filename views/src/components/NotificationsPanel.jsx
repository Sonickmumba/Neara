import { Bell, MessageSquare, Package, Star, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import apiClient from '../services/api';

const PAGE_SIZE = 25;

export function NotificationsPanel({ isOpen, onClose, onNotificationClick }) {
  const [notifications, setNotifications] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const listRef = useRef(null);
  const requestSeqRef = useRef(0);

  const fetchNotifications = useCallback(
    async ({ append = false, cursor = null } = {}) => {
      const requestId = ++requestSeqRef.current;

      try {
        if (!append) {
          setStatus('loading');
          setError(null);
        } else {
          setIsLoadingMore(true);
        }

        const params = {
          limit: PAGE_SIZE,
          ...(cursor?.before ? { before: cursor.before } : {}),
          ...(cursor?.beforeId ? { beforeId: cursor.beforeId } : {}),
        };

        const res = await apiClient.get('/api/notifications', { params });
        if (requestId !== requestSeqRef.current) return;

        const items = Array.isArray(res.data?.data)
          ? res.data.data.map((n) => ({
              ...n,
              referenceId: n.referenceId || n.reference_id || null,
            }))
          : [];
        setNotifications((prev) => {
          const merged = append ? [...prev, ...items] : items;
          const seen = new Set();
          return merged.filter((item) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        });

        setUnreadCount(Number(res.data?.unreadCount || 0));
        setHasMore(!!res.data?.hasMore);
        setNextCursor(res.data?.nextCursor || null);
        setStatus('succeeded');
      } catch (err) {
        if (requestId !== requestSeqRef.current) return;
        console.error('Failed to fetch notifications:', err);
        setError(err.response?.data?.message || 'Failed to load notifications');
        setStatus('failed');
      } finally {
        if (requestId === requestSeqRef.current) {
          setIsLoadingMore(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!isOpen) return;

    setNotifications([]);
    setHasMore(true);
    setNextCursor(null);
    fetchNotifications();
  }, [isOpen, fetchNotifications]);

  const getIcon = (type) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-5 h-5 text-blue-600" />;
      case 'trade':
        return <Package className="w-5 h-5 text-green-600" />;
      case 'review':
        return <Star className="w-5 h-5 text-yellow-600" />;
      case 'listing':
        return <Bell className="w-5 h-5 text-purple-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const markAsRead = async (id) => {
    let changed = false;

    setNotifications((prev) =>
      prev.map((notif) => {
        if (notif.id !== id || notif.is_read) return notif;
        changed = true;
        return { ...notif, is_read: true };
      })
    );

    if (changed) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await apiClient.patch(`/api/notifications/${id}/read`);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      if (changed) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === id ? { ...notif, is_read: false } : notif
          )
        );
        setUnreadCount((prev) => prev + 1);
      }
    }
  };

  const handleNotificationClick = async (notification) => {
    await markAsRead(notification.id);
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  const markAllAsRead = async () => {
    const hadUnread = unreadCount > 0;
    if (!hadUnread) return;

    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, is_read: true }))
    );
    setUnreadCount(0);

    try {
      await apiClient.patch('/api/notifications/read-all');
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      fetchNotifications();
    }
  };

  const handleScroll = () => {
    const el = listRef.current;
    if (!el || isLoadingMore || !hasMore || !nextCursor) return;

    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 180;
    if (nearBottom) {
      fetchNotifications({ append: true, cursor: nextCursor });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
        >
          {status === 'loading' ? (
            <div className="py-10 text-center text-gray-600">
              Loading notifications...
            </div>
          ) : status === 'failed' ? (
            <div className="py-10 text-center px-4">
              <p className="text-gray-600 mb-3">
                {error || 'Failed to load notifications'}
              </p>
              <button
                onClick={() => fetchNotifications()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Bell className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => void handleNotificationClick(notification)}
                  className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-medium">
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.description}
                      </p>
                      <span className="text-xs text-gray-500 mt-1 block">
                        {notification.timeAgo}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {isLoadingMore && (
                <div className="py-4 text-center text-sm text-gray-500">
                  Loading more notifications...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
