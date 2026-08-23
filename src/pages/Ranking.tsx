import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Star, Eye, Bookmark, TrendingUp } from 'lucide-react';
import type { Novel } from '@/types';
import { fetchNovels } from '@/lib/services';
import NovelRowCard from '@/components/NovelRowCard';
import ErrorState from '@/components/ErrorState';

type RankingType = 'terpopuler' | 'rating' | 'views' | 'trending' | 'bookmark';

const rankingTypes = [
  { value: 'terpopuler' as RankingType, label: 'Novel Terpopuler', icon: Flame },
  { value: 'rating' as RankingType, label: 'Rating Tertinggi', icon: Star },
  { value: 'views' as RankingType, label: 'Paling Banyak Dibaca', icon: Eye },
  { value: 'trending' as RankingType, label: 'Trending', icon: TrendingUp },
  { value: 'bookmark' as RankingType, label: 'Paling Banyak Disimpan', icon: Bookmark },
];

export default function Ranking() {
  const [type, setType] = useState<RankingType>('terpopuler');
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const sortMap: Record<RankingType, 'terpopuler' | 'rating' | 'az'> = {
        terpopuler: 'terpopuler',
        rating: 'rating',
        views: 'terpopuler',
        trending: 'terpopuler',
        bookmark: 'terpopuler',
      };
      const { data } = await fetchNovels({ sort: sortMap[type], limit: 50 });

      let sorted = [...data];
      if (type === 'rating') sorted.sort((a, b) => b.rating - a.rating);
      else if (type === 'views') sorted.sort((a, b) => b.views - a.views);
      else if (type === 'bookmark') sorted.sort((a, b) => b.bookmark_count - a.bookmark_count);
      else sorted.sort((a, b) => b.views - a.views);

      setNovels(sorted);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentType = rankingTypes.find((t) => t.value === type)!;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Ranking</h1>
        <p className="text-sm text-muted">Novel terbaik di Semesta Novel</p>
      </div>

      {/* Ranking Type Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar">
        {rankingTypes.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex-shrink-0 ${
                type === t.value ? 'bg-primary text-white' : 'bg-white/5 text-muted hover:bg-white/10'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Ranking List */}
      {error ? (
        <ErrorState onRetry={loadData} />
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Top 3 podium */}
          {novels.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {novels.slice(0, 3).map((novel, i) => (
                <Link key={novel.id} to={`/novel/${novel.slug}`} className={`card card-hover p-4 text-center ${i === 0 ? 'order-2 md:scale-105' : i === 1 ? 'order-1' : 'order-3'}`}>
                  <div className="text-3xl font-bold mb-2" style={{ color: i === 0 ? '#FBBF24' : i === 1 ? '#C0C0C0' : '#CD7F32' }}>
                    #{i + 1}
                  </div>
                  <div className="w-20 h-28 mx-auto rounded-lg overflow-hidden mb-3" style={{ background: `linear-gradient(135deg, ${i === 0 ? '#7C3AED' : i === 1 ? '#A855F7' : '#C084FC'} 0%, #0D1422 100%)` }} />
                  <h3 className="text-sm font-semibold text-white line-clamp-2">{novel.title}</h3>
                  <div className="flex items-center justify-center gap-1 mt-2 text-xs text-rating">
                    <Star className="h-3 w-3 fill-rating" />
                    {Number(novel.rating).toFixed(1)}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Rest of ranking */}
          <div className="card divide-y divide-white/5">
            {novels.slice(3).map((novel, i) => (
              <NovelRowCard key={novel.id} novel={novel} rank={i + 4} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
