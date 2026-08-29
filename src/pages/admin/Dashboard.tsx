import { useEffect, useState, useCallback } from 'react';
import {
  BookOpen,
  FileText,
  Users,
  Eye,
  MessageSquare,
  TrendingUp,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import {
  fetchNovels,
  adminFetchAllProfiles,
  adminFetchAllComments,
  adminFetchReports,
} from '@/lib/services';

import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    novels: 0,
    chapters: 0,
    users: 0,
    views: 0,
    comments: 0,
    reports: 0,
  });

  const [recentNovels, setRecentNovels] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      /*
       * Ambil SEMUA data utama.
       *
       * limit besar digunakan agar dashboard
       * tidak hanya mendapatkan 1 novel.
       */
      const [
        novelsData,
        profiles,
        comments,
        reports,
        chapterResult,
      ] = await Promise.all([
        fetchNovels({
          limit: 10000,
          offset: 0,
        }),

        adminFetchAllProfiles(),

        adminFetchAllComments(),

        adminFetchReports(),

        supabase
          .from('chapters')
          .select('id', {
            count: 'exact',
            head: true,
          }),
      ]);

      if (chapterResult.error) {
        throw chapterResult.error;
      }

      /*
       * Hitung total views dari SEMUA novel.
       */
      const totalViews = novelsData.data.reduce(
        (sum, novel) => sum + Number(novel.views || 0),
        0
      );

      /*
       * Novel terbaru.
       */
      const latestNovels = [...novelsData.data]
        .sort((a, b) => {
          const dateA = new Date(
            a.created_at || 0
          ).getTime();

          const dateB = new Date(
            b.created_at || 0
          ).getTime();

          return dateB - dateA;
        })
        .slice(0, 5);

      /*
       * User terbaru.
       */
      const latestUsers = [...profiles]
        .sort((a, b) => {
          const dateA = new Date(
            a.created_at || 0
          ).getTime();

          const dateB = new Date(
            b.created_at || 0
          ).getTime();

          return dateB - dateA;
        })
        .slice(0, 5);

      setStats({
        novels: novelsData.total,
        chapters: chapterResult.count || 0,
        users: profiles.length,
        views: totalViews,
        comments: comments.length,
        reports: reports.length,
      });

      setRecentNovels(latestNovels);
      setRecentUsers(latestUsers);
    } catch (err) {
      console.error(
        'Failed to load dashboard data:',
        err
      );

      setError(
        'Gagal mengambil data dashboard.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const cards = [
    {
      label: 'Total Novel',
      value: stats.novels,
      icon: BookOpen,
      color: 'from-primary to-secondary',
    },
    {
      label: 'Total Bab',
      value: stats.chapters,
      icon: FileText,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Total User',
      value: stats.users,
      icon: Users,
      color: 'from-green-500 to-emerald-500',
    },
    {
      label: 'Total Views',
      value: stats.views,
      icon: Eye,
      color: 'from-orange-500 to-red-500',
    },
    {
      label: 'Total Komentar',
      value: stats.comments,
      icon: MessageSquare,
      color: 'from-pink-500 to-purple-500',
    },
    {
      label: 'Total Laporan',
      value: stats.reports,
      icon: AlertCircle,
      color: 'from-red-500 to-rose-600',
    },
  ];

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Dashboard
          </h1>

          <p className="text-sm text-muted mt-1">
            Ringkasan seluruh data website
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm transition disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading ? 'animate-spin' : ''
            }`}
          />

          Refresh
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="card p-5"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} mb-3`}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>

              <p className="text-2xl font-bold text-white">
                {loading
                  ? '...'
                  : card.value.toLocaleString()}
              </p>

              <p className="text-xs text-muted mt-1">
                {card.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* AKTIVITAS */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary-400" />

          Aktivitas Membaca
        </h2>

        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-muted text-center">
            Data aktivitas harian belum tersedia di
            database.
          </p>
        </div>
      </div>

      {/* DATA TERBARU */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NOVEL TERBARU */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">
              Novel Terbaru
            </h2>

            <BookOpen className="h-5 w-5 text-primary-400" />
          </div>

          {loading ? (
            <p className="text-sm text-muted">
              Memuat...
            </p>
          ) : recentNovels.length === 0 ? (
            <p className="text-sm text-muted">
              Belum ada novel.
            </p>
          ) : (
            <div className="space-y-3">
              {recentNovels.map((novel) => (
                <div
                  key={novel.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {novel.title}
                    </p>

                    <p className="text-xs text-muted mt-1">
                      {novel.status || 'Tanpa status'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted shrink-0">
                    <Eye className="h-3.5 w-3.5" />

                    {Number(
                      novel.views || 0
                    ).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* USER TERBARU */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">
              User Terbaru
            </h2>

            <Users className="h-5 w-5 text-green-400" />
          </div>

          {loading ? (
            <p className="text-sm text-muted">
              Memuat...
            </p>
          ) : recentUsers.length === 0 ? (
            <p className="text-sm text-muted">
              Belum ada user.
            </p>
          ) : (
            <div className="space-y-3">
              {recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.display_name ||
                        user.username ||
                        'User'}
                    </p>

                    <p className="text-xs text-muted mt-1 truncate">
                      {user.email || '-'}
                    </p>
                  </div>

                  <span className="text-xs rounded-full bg-white/10 px-2 py-1 text-muted shrink-0">
                    {user.role || 'reader'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}