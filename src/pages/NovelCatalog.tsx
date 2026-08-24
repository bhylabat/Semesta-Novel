import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { Novel, Genre } from '@/types';
import { fetchNovels, fetchGenres } from '@/lib/services';
import NovelCard, { NovelCardSkeleton } from '@/components/NovelCard';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import { BookOpen } from 'lucide-react';

const sortOptions = [
  { value: 'terbaru', label: 'Terbaru' },
  { value: 'terpopuler', label: 'Terpopuler' },
  { value: 'rating', label: 'Rating Tertinggi' },
  { value: 'az', label: 'A-Z' },
  { value: 'chapter', label: 'Bab Terbanyak' },
];

const statusOptions = [
  { value: 'all', label: 'Semua' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'hiatus', label: 'Hiatus' },
];

type NovelSort = 'terbaru' | 'terpopuler' | 'rating' | 'az' | 'chapter';

export default function NovelCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const search = searchParams.get('q') || '';
  const genre = searchParams.get('genre') || 'all';
  const status = searchParams.get('status') || 'all';
  const sort = (searchParams.get('sort') as NovelSort) || 'terbaru';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [novelData, genreData] = await Promise.all([
        fetchNovels({ search, genre: genre !== 'all' ? genre : undefined, status, sort, limit: 100 }),
        fetchGenres(),
      ]);
      setNovels(novelData.data);
      setGenres(genreData);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [search, genre, status, sort]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Katalog Novel</h1>
        <p className="text-sm text-muted">Jelajahi {novels.length} novel tersedia di Semesta Novel</p>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => updateParam('q', e.target.value)}
            placeholder="Cari novel..."
            className="input pl-9 w-full"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary px-4"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filter</span>
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="card p-4 mb-6 space-y-4 animate-slide-down">
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Genre</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateParam('genre', 'all')}
                className={`badge ${genre === 'all' ? 'bg-primary text-white' : 'bg-white/5 text-muted hover:bg-white/10'}`}
              >
                Semua
              </button>
              {genres.map((g) => (
                <button
                  key={g.id}
                  onClick={() => updateParam('genre', g.id)}
                  className={`badge ${genre === g.id ? 'bg-primary text-white' : 'bg-white/5 text-muted hover:bg-white/10'}`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Status</h3>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((s) => (
                <button
                  key={s.value}
                  onClick={() => updateParam('status', s.value)}
                  className={`badge ${status === s.value ? 'bg-primary text-white' : 'bg-white/5 text-muted hover:bg-white/10'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Urutkan</h3>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((s) => (
                <button
                  key={s.value}
                  onClick={() => updateParam('sort', s.value)}
                  className={`badge ${sort === s.value ? 'bg-primary text-white' : 'bg-white/5 text-muted hover:bg-white/10'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active filters display */}
      {(genre !== 'all' || status !== 'all' || search) && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {search && (
            <span className="badge bg-primary/20 text-primary-300">
              "{search}"
              <button onClick={() => updateParam('q', '')}><X className="h-3 w-3" /></button>
            </span>
          )}
          {genre !== 'all' && (
            <span className="badge bg-primary/20 text-primary-300">
              {genres.find((g) => g.id === genre)?.name || 'Genre'}
              <button onClick={() => updateParam('genre', 'all')}><X className="h-3 w-3" /></button>
            </span>
          )}
          {status !== 'all' && (
            <span className="badge bg-primary/20 text-primary-300">
              {statusOptions.find((s) => s.value === status)?.label}
              <button onClick={() => updateParam('status', 'all')}><X className="h-3 w-3" /></button>
            </span>
          )}
        </div>
      )}

      {/* Results */}
      {error ? (
        <ErrorState onRetry={loadData} />
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => <NovelCardSkeleton key={i} />)}
        </div>
      ) : novels.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Tidak ada novel"
          message="Ternyata belum ada novel yang cocok dengan filter yang dipilih. Coba ubah filter atau cari dengan kata kunci lain."
          actionLabel="Jelajahi Novel"
          actionTo="/novel"
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {novels.map((novel) => (
            <NovelCard key={novel.id} novel={novel} showLatestChapter />
          ))}
        </div>
      )}
    </div>
  );
}
