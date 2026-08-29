import { useEffect, useState, useCallback } from 'react';
import {
  BookOpen,
  FileText,
  Users,
  Eye,
  MessageSquare,
  TrendingUp,
  Loader2,
} from 'lucide-react';

import {
  fetchNovels,
  adminFetchAllProfiles,
  adminFetchAllComments,
} from '@/lib/services';

import { supabase } from '@/lib/supabase';

interface ActivityData {
  view_date: string;
  total_views: number;
}

interface RecentNovel {
  id: string;
  title: string;
  created_at: string;
}

interface RecentUser {
  id: string;
  username: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    novels: 0,
    chapters: 0,
    users: 0,
    views: 0,
    comments: 0,
  });

  const [activity, setActivity] = useState<ActivityData[]>([]);
  const [recentNovels, setRecentNovels] = useState<RecentNovel[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);

  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      // ======================================================
      // 1. AMBIL DATA UTAMA
      // ======================================================

      const [
        novelsResult,
        profiles,
        comments,
      ] = await Promise.all([
        // Jangan pakai limit 1 karena kita membutuhkan
        // total views seluruh novel.
        fetchNovels({
          limit: 10000,
          offset: 0,
        }),

        adminFetchAllProfiles(),

        adminFetchAllComments(),
      ]);

      // ======================================================
      // 2. TOTAL CHAPTER
      // ======================================================

      const {
        count: chapterCount,
        error: chapterError,
      } = await supabase
        .from('chapters')
        .select('id', {
          count: 'exact',
          head: true,
        });

      if (chapterError) {
        throw chapterError;
      }

      // ======================================================
      // 3. TOTAL VIEWS SEMUA NOVEL
      // ======================================================

      const totalViews = novelsResult.data.reduce(
        (sum, novel) => {
          return sum + Number(novel.views || 0);
        },
        0
      );

      // ======================================================
      // 4. STATISTIK UTAMA
      // ======================================================

      setStats({
        novels: novelsResult.total,
        chapters: chapterCount || 0,
        users: profiles.length,
        views: totalViews,
        comments: comments.length,
      });

      // ======================================================
      // 5. AKTIVITAS MEMBACA 7 HARI TERAKHIR
      // ======================================================

      const {
        data: activityData,
        error: activityError,
      } = await supabase
        .from('chapter_view_logs')
        .select('viewed_at');

      if (activityError) {
        throw activityError;
      }

      // Buat 7 tanggal terakhir.
      const last7Days: ActivityData[] = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date();

        date.setDate(
          date.getDate() - i
        );

        const year = date.getFullYear();

        const month = String(
          date.getMonth() + 1
        ).padStart(2, '0');

        const day = String(
          date.getDate()
        ).padStart(2, '0');

        const dateString =
          `${year}-${month}-${day}`;

        last7Days.push({
          view_date: dateString,
          total_views: 0,
        });
      }

      // Hitung jumlah view berdasarkan tanggal.
      (activityData || []).forEach(
        (row) => {
          if (!row.viewed_at) {
            return;
          }

          const date = new Date(
            row.viewed_at
          );

          const year =
            date.getFullYear();

          const month = String(
            date.getMonth() + 1
          ).padStart(2, '0');

          const day = String(
            date.getDate()
          ).padStart(2, '0');

          const dateString =
            `${year}-${month}-${day}`;

          const target =
            last7Days.find(
              (item) =>
                item.view_date ===
                dateString
            );

          if (target) {
            target.total_views += 1;
          }
        }
      );

      setActivity(last7Days);

      // ======================================================
      // 6. NOVEL TERBARU
      // ======================================================

      const {
        data: latestNovels,
        error: latestNovelsError,
      } = await supabase
        .from('novels')
        .select(
          'id, title, created_at'
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        )
        .limit(5);

      if (latestNovelsError) {
        throw latestNovelsError;
      }

      setRecentNovels(
        (latestNovels ||
          []) as RecentNovel[]
      );

      // ======================================================
      // 7. USER TERBARU
      // ======================================================

      const latestUsers =
        [...profiles]
          .sort(
            (a, b) =>
              new Date(
                b.created_at
              ).getTime() -
              new Date(
                a.created_at
              ).getTime()
          )
          .slice(0, 5)
          .map((profile) => ({
            id: profile.id,
            username:
              profile.username ||
              'User',
            created_at:
              profile.created_at,
          }));

      setRecentUsers(
        latestUsers
      );
    } catch (error) {
      console.error(
        'Failed to load dashboard data:',
        error
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==========================================================
  // STAT CARD
  // ==========================================================

  const cards = [
    {
      label: 'Total Novel',
      value: stats.novels,
      icon: BookOpen,
      color:
        'from-primary to-secondary',
    },
    {
      label: 'Total Bab',
      value: stats.chapters,
      icon: FileText,
      color:
        'from-blue-500 to-cyan-500',
    },
    {
      label: 'Total User',
      value: stats.users,
      icon: Users,
      color:
        'from-green-500 to-emerald-500',
    },
    {
      label: 'Total Views',
      value: stats.views,
      icon: Eye,
      color:
        'from-orange-500 to-red-500',
    },
    {
      label: 'Total Komentar',
      value: stats.comments,
      icon: MessageSquare,
      color:
        'from-pink-500 to-purple-500',
    },
  ];

  // ==========================================================
  // LABEL HARI
  // ==========================================================

  const getDayLabel = (
    dateString: string
  ) => {
    const date = new Date(
      `${dateString}T00:00:00`
    );

    return date.toLocaleDateString(
      'id-ID',
      {
        weekday: 'short',
      }
    );
  };

  // Nilai maksimum grafik.
  const maxViews = Math.max(
    ...activity.map(
      (item) => item.total_views
    ),
    1
  );

  // ==========================================================
  // FORMAT TANGGAL
  // ==========================================================

  const formatDate = (
    dateString: string
  ) => {
    if (!dateString) {
      return '-';
    }

    return new Date(
      dateString
    ).toLocaleDateString(
      'id-ID',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    );
  };

  return (
    <div>
      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Dashboard
          </h1>

          <p className="text-sm text-muted mt-1">
            Ringkasan aktivitas website
          </p>
        </div>

        {loading && (
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        )}
      </div>

      {/* ====================================================
          STAT CARDS
      ==================================================== */}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
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
                  : card.value.toLocaleString(
                      'id-ID'
                    )}
              </p>

              <p className="text-xs text-muted mt-1">
                {card.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* ====================================================
          ACTIVITY CHART
      ==================================================== */}

      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary-400" />

          Aktivitas Membaca (7 Hari Terakhir)
        </h2>

        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : (
          <div className="flex items-end justify-between gap-2 h-48">
            {activity.map(
              (item) => {
                const height =
                  item.total_views ===
                  0
                    ? 4
                    : Math.max(
                        8,
                        (item.total_views /
                          maxViews) *
                          100
                      );

                return (
                  <div
                    key={
                      item.view_date
                    }
                    className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                  >
                    {/* Jumlah view */}

                    <span className="text-xs text-muted">
                      {item.total_views.toLocaleString(
                        'id-ID'
                      )}
                    </span>

                    {/* Bar */}

                    <div
                      className="w-full max-w-[60px] bg-gradient-to-t from-primary/40 to-primary rounded-t-lg transition-all hover:from-primary/60 hover:to-secondary"
                      style={{
                        height: `${height}%`,
                      }}
                      title={`${item.total_views} view`}
                    />

                    {/* Hari */}

                    <span className="text-xs text-muted">
                      {getDayLabel(
                        item.view_date
                      )}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* ====================================================
          RECENT DATA
      ==================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ==================================================
            NOVEL TERBARU
        ================================================== */}

        <div className="card p-6">
          <h2 className="text-base font-semibold text-white mb-4">
            Novel Terbaru
          </h2>

          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted">
                Memuat...
              </p>
            ) : recentNovels.length ===
              0 ? (
              <p className="text-sm text-muted">
                Belum ada novel.
              </p>
            ) : (
              recentNovels.map(
                (novel) => (
                  <div
                    key={novel.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {novel.title}
                      </p>

                      <p className="text-xs text-muted mt-1">
                        {formatDate(
                          novel.created_at
                        )}
                      </p>
                    </div>

                    <BookOpen className="h-4 w-4 text-primary shrink-0" />
                  </div>
                )
              )
            )}
          </div>
        </div>

        {/* ==================================================
            USER TERBARU
        ================================================== */}

        <div className="card p-6">
          <h2 className="text-base font-semibold text-white mb-4">
            User Baru
          </h2>

          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted">
                Memuat...
              </p>
            ) : recentUsers.length ===
              0 ? (
              <p className="text-sm text-muted">
                Belum ada user.
              </p>
            ) : (
              recentUsers.map(
                (user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {user.username}
                      </p>

                      <p className="text-xs text-muted mt-1">
                        {formatDate(
                          user.created_at
                        )}
                      </p>
                    </div>

                    <Users className="h-4 w-4 text-green-400 shrink-0" />
                  </div>
                )
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}