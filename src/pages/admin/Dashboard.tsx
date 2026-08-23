import { useEffect, useState, useCallback } from 'react';
import { BookOpen, FileText, Users, Eye, MessageSquare, TrendingUp } from 'lucide-react';
import { fetchNovels, fetchGenres, adminFetchAllProfiles, adminFetchAllComments } from '@/lib/services';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ novels: 0, chapters: 0, users: 0, views: 0, comments: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [novelsData, profiles, comments] = await Promise.all([
        fetchNovels({ limit: 1 }),
        adminFetchAllProfiles(),
        adminFetchAllComments(),
      ]);

      const { count: chapterCount } = await supabase
        .from('chapters')
        .select('*', { count: 'exact', head: true });

      const totalViews = novelsData.data.reduce((sum, n) => sum + n.views, 0);

      setStats({
        novels: novelsData.total,
        chapters: chapterCount || 0,
        users: profiles.length,
        views: totalViews,
        comments: comments.length,
      });
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const cards = [
    { label: 'Total Novel', value: stats.novels, icon: BookOpen, color: 'from-primary to-secondary' },
    { label: 'Total Bab', value: stats.chapters, icon: FileText, color: 'from-blue-500 to-cyan-500' },
    { label: 'Total User', value: stats.users, icon: Users, color: 'from-green-500 to-emerald-500' },
    { label: 'Total Views', value: stats.views, icon: Eye, color: 'from-orange-500 to-red-500' },
    { label: 'Total Komentar', value: stats.comments, icon: MessageSquare, color: 'from-pink-500 to-purple-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} mb-3`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">
                {loading ? '...' : card.value.toLocaleString()}
              </p>
              <p className="text-xs text-muted mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Activity Chart Placeholder */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary-400" />
          Aktivitas Membaca (7 Hari Terakhir)
        </h2>
        <div className="flex items-end justify-between gap-2 h-40">
          {[40, 65, 55, 80, 70, 90, 75].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-gradient-to-t from-primary/40 to-primary rounded-t-lg transition-all hover:from-primary/60 hover:to-secondary" style={{ height: `${h}%` }} />
              <span className="text-xs text-muted">{['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'][i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-6">
          <h2 className="text-base font-semibold text-white mb-4">Novel Terbaru</h2>
          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted">Memuat...</p>
            ) : (
              <p className="text-sm text-muted">Belum ada data aktivitas.</p>
            )}
          </div>
        </div>
        <div className="card p-6">
          <h2 className="text-base font-semibold text-white mb-4">User Baru</h2>
          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted">Memuat...</p>
            ) : (
              <p className="text-sm text-muted">Belum ada user baru.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
