import { useEffect, useState, useCallback } from 'react';
import { BookOpen, FileText, Users, Eye, MessageSquare, TrendingUp, BarChart3 } from 'lucide-react';
import { fetchNovels, adminFetchAllProfiles, adminFetchAllComments } from '@/lib/services';
import { supabase } from '@/lib/supabase';

export default function AdminStatistics() {
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
      const { count: chapterCount } = await supabase.from('chapters').select('*', { count: 'exact', head: true });
      const totalViews = novelsData.data.reduce((sum, n) => sum + n.views, 0);
      setStats({ novels: novelsData.total, chapters: chapterCount || 0, users: profiles.length, views: totalViews, comments: comments.length });
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const cards = [
    { label: 'Total Novel', value: stats.novels, icon: BookOpen },
    { label: 'Total Bab', value: stats.chapters, icon: FileText },
    { label: 'Total User', value: stats.users, icon: Users },
    { label: 'Total Views', value: stats.views, icon: Eye },
    { label: 'Total Komentar', value: stats.comments, icon: MessageSquare },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Statistik</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <Icon className="h-5 w-5 text-primary-400 mb-3" />
              <p className="text-2xl font-bold text-white">{loading ? '...' : card.value.toLocaleString()}</p>
              <p className="text-xs text-muted mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary-400" />
          Novel Views (7 Hari)
        </h2>
        <div className="flex items-end justify-between gap-2 h-40">
          {[40, 65, 55, 80, 70, 90, 75].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-gradient-to-t from-primary/40 to-primary rounded-t-lg" style={{ height: `${h}%` }} />
              <span className="text-xs text-muted">{['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'][i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary-400" />
          User Baru (7 Hari)
        </h2>
        <div className="flex items-end justify-between gap-2 h-40">
          {[20, 35, 30, 50, 45, 60, 40].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-gradient-to-t from-secondary/40 to-secondary rounded-t-lg" style={{ height: `${h}%` }} />
              <span className="text-xs text-muted">{['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'][i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
