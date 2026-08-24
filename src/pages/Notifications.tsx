import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Loader2,
  Inbox,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '@/lib/services';

import type { Notification } from '@/types';
import { formatDate } from '@/lib/utils';

export default function Notifications() {
  const { user, loading: authLoading } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotifications = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const data = await fetchNotifications(user.id);
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('Gagal memuat notifikasi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      void loadNotifications();
    }
  }, [user]);

  const handleRead = async (notification: Notification) => {
    if (notification.is_read) return;

    try {
      await markNotificationAsRead(notification.id);

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id
            ? { ...item, is_read: true }
            : item
        )
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;

    try {
      await markAllNotificationsAsRead(user.id);

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          is_read: true,
        }))
      );
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);

      setNotifications((prev) =>
        prev.filter((item) => item.id !== notificationId)
      );
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        <div className="card p-8 flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary-400" />
          <span className="text-sm text-muted">
            Memuat notifikasi...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        <div className="card p-8 text-center">
          <Bell className="h-10 w-10 text-muted mx-auto mb-3" />

          <h2 className="text-lg font-semibold text-white">
            Masuk untuk melihat notifikasi
          </h2>

          <p className="text-sm text-muted mt-2 mb-5">
            Notifikasi akan tersimpan di akun kamu.
          </p>

          <Link to="/login" className="btn-primary">
            Masuk
          </Link>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 md:py-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary-400" />

            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Notifikasi
            </h1>
          </div>

          <p className="text-sm text-muted mt-1">
            {unreadCount > 0
              ? `${unreadCount} notifikasi belum dibaca`
              : 'Semua notifikasi sudah dibaca'}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            className="btn-secondary text-xs sm:text-sm flex items-center gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            <span className="hidden sm:inline">
              Tandai semua
            </span>
            <span className="sm:hidden">
              Semua
            </span>
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 mb-4 border border-red-500/20">
          <p className="text-sm text-red-400">
            {error}
          </p>
        </div>
      )}

      {/* Empty */}
      {!error && notifications.length === 0 && (
        <div className="card p-10 text-center">
          <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Inbox className="h-7 w-7 text-muted" />
          </div>

          <h2 className="text-base font-semibold text-white">
            Belum ada notifikasi
          </h2>

          <p className="text-sm text-muted mt-1">
            Notifikasi baru akan muncul di sini.
          </p>
        </div>
      )}

      {/* Notification List */}
      {!error && notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`card p-4 transition-colors ${
                notification.is_read
                  ? 'bg-white/[0.02]'
                  : 'border-primary/20 bg-primary/[0.04]'
              }`}
            >
              <div className="flex items-start gap-3">

                {/* Icon */}
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    notification.is_read
                      ? 'bg-white/5'
                      : 'bg-primary/10'
                  }`}
                >
                  <Bell
                    className={`h-5 w-5 ${
                      notification.is_read
                        ? 'text-muted'
                        : 'text-primary-400'
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3
                        className={`text-sm font-semibold ${
                          notification.is_read
                            ? 'text-white/80'
                            : 'text-white'
                        }`}
                      >
                        {notification.title}
                      </h3>

                      <p className="text-sm text-muted mt-1 leading-relaxed">
                        {notification.message}
                      </p>

                      <p className="text-xs text-muted mt-2">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>

                    {!notification.is_read && (
                      <span className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 mt-1" />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 mt-3">

                    {!notification.is_read && (
                      <button
                        type="button"
                        onClick={() => void handleRead(notification)}
                        className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Tandai sudah dibaca
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleDelete(notification.id)}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}