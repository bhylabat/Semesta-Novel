import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, Bookmark, History, MessageSquare, Settings as SettingsIcon,
  LogOut, Calendar, Star, Library, ChevronRight, Shield
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import type { Profile as ProfileType } from '@/types';
import { fetchBookmarks, fetchReadingHistory } from '@/lib/services';
import { getGuestBookmarks, getGuestHistory } from '@/lib/guest';
import { formatDate } from '@/lib/utils';

export default function Profile() {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const loadStats = useCallback(async () => {
    if (user) {
      const [bms, hist] = await Promise.all([fetchBookmarks(user.id), fetchReadingHistory(user.id)]);
      setBookmarkCount(bms.length);
      setHistoryCount(hist.length);
    } else {
      setBookmarkCount(getGuestBookmarks().length);
      setHistoryCount(getGuestHistory().length);
    }
  }, [user]);

  useEffect(() => {
    void loadStats().catch((error) => {
      console.error('Failed to load profile statistics:', error);
      setBookmarkCount(0);
      setHistoryCount(0);
    });
  }, [loadStats]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <div className="skeleton h-32 w-full rounded-2xl" />
        <div className="skeleton h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
        <div className="card p-6 text-center">
          <h1 className="text-lg font-semibold text-white">Silakan masuk terlebih dahulu</h1>
          <p className="text-sm text-muted mt-2 mb-5">Masuk untuk melihat profil dan statistik bacamu.</p>
          <Link to="/login" className="btn-primary">Masuk</Link>
        </div>
      </div>
    );
  }

  const displayProfile: ProfileType = profile ?? {
    id: user.id,
    username: user.email?.split('@')[0] || 'Pembaca',
    email: user.email || '',
    avatar_url: null,
    role: 'reader',
    created_at: user.created_at,
  };

  const menuItems = [
    { icon: Library, label: 'Rak Buku', to: '/library' },
    { icon: History, label: 'Riwayat Baca', to: '/history' },
    { icon: Bookmark, label: 'Bookmark', to: '/library' },
    { icon: MessageSquare, label: 'Komentar Saya', to: '/profile' },
    { icon: SettingsIcon, label: 'Pengaturan', to: '/settings' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-8">
      {/* Profile Header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
            {displayProfile.username[0]?.toUpperCase()}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-xl font-bold text-white">{displayProfile.username}</h1>
            <p className="text-sm text-muted mt-1">{displayProfile.email}</p>
            <div className="flex items-center justify-center sm:justify-start gap-3 mt-2">
              <span className="badge bg-primary/20 text-primary-300 capitalize">{displayProfile.role}</span>
              <span className="flex items-center gap-1 text-xs text-muted">
                <Calendar className="h-3 w-3" />
                Member sejak {formatDate(displayProfile.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4 text-center">
          <BookOpen className="h-5 w-5 text-primary-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{historyCount}</p>
          <p className="text-xs text-muted">Novel Dibaca</p>
        </div>
        <div className="card p-4 text-center">
          <Bookmark className="h-5 w-5 text-primary-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{bookmarkCount}</p>
          <p className="text-xs text-muted">Novel di Rak</p>
        </div>
        <div className="card p-4 text-center">
          <Star className="h-5 w-5 text-primary-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">0</p>
          <p className="text-xs text-muted">Hari Aktif</p>
        </div>
      </div>

      {/* Menu */}
      <div className="card divide-y divide-white/5 mb-6">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} to={item.to} className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors group">
              <Icon className="h-5 w-5 text-muted group-hover:text-primary-300" />
              <span className="flex-1 text-sm text-white">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
          );
        })}
      </div>

      {/* Admin Link */}
      {displayProfile.role === 'admin' && (
        <Link to="/admin" className="card p-4 mb-6 flex items-center gap-3 hover:bg-white/5 transition-colors group">
          <Shield className="h-5 w-5 text-primary-400" />
          <span className="flex-1 text-sm text-white">Admin Dashboard</span>
          <ChevronRight className="h-4 w-4 text-muted" />
        </Link>
      )}

      {/* Logout */}
      <button onClick={() => signOut()} className="btn w-full bg-red-500/10 text-red-400 hover:bg-red-500/20 px-5 py-3 text-sm">
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </div>
  );
}
