import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, X } from 'lucide-react';
import type { Novel } from '@/types';
import { fetchNovels } from '@/lib/services';
import NovelCard, { NovelCardSkeleton } from '@/components/NovelCard';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [input, setInput] = useState(query);
  const [results, setResults] = useState<Novel[]>([]);
  const [popular, setPopular] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setError(false);
    setHasSearched(true);
    try {
      const { data } = await fetchNovels({ search: q, limit: 50 });
      setResults(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNovels({ sort: 'terpopuler', limit: 6 }).then(({ data }) => setPopular(data)).catch(() => {});
    if (query) {
      setInput(query);
      search(query);
    }
  }, []);

  useEffect(() => {
    if (query !== input) setInput(query);
    if (query) search(query);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(input.trim() ? { q: input.trim() } : {});
  };

  const clearSearch = () => {
    setInput('');
    setSearchParams({});
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">Cari Novel</h1>

      <form onSubmit={handleSubmit} className="relative mb-6">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Cari berdasarkan judul, penulis, atau genre..."
          className="input pl-11 pr-10 w-full text-base"
          autoFocus
        />
        {input && (
          <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/10">
            <X className="h-4 w-4 text-muted" />
          </button>
        )}
      </form>

      {error ? (
        <ErrorState onRetry={() => search(query)} />
      ) : !hasSearched ? (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Novel Populer</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {popular.map((n) => (
              <NovelCard key={n.id} novel={n} />
            ))}
          </div>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <NovelCardSkeleton key={i} />)}
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="Ternyata belum ada novel yang cocok"
          message={`Tidak ada hasil untuk "${query}". Coba kata kunci lain atau jelajahi novel populer di bawah ini.`}
        />
      ) : (
        <>
          <p className="text-sm text-muted mb-4">{results.length} hasil ditemukan untuk "{query}"</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {results.map((n) => (
              <NovelCard key={n.id} novel={n} showLatestChapter />
            ))}
          </div>
        </>
      )}

      {hasSearched && results.length === 0 && !loading && !error && popular.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">Rekomendasi Novel Populer</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {popular.map((n) => (
              <NovelCard key={n.id} novel={n} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
