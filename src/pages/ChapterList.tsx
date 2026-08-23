import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Search, ArrowUpDown, ChevronRight, Eye, ChevronLeft } from 'lucide-react';
import type { Novel, Chapter } from '@/types';
import { fetchNovelBySlug, fetchChapters } from '@/lib/services';
import { formatDate, formatViews } from '@/lib/utils';
import ErrorState from '@/components/ErrorState';

const PAGE_SIZE = 20;

export default function ChapterList() {
  const { slug } = useParams();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');

  const loadData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(false);
    try {
      const n = await fetchNovelBySlug(slug);
      if (!n) {
        setError(true);
        return;
      }
      setNovel(n);
      const { data, total: count } = await fetchChapters(n.id, {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        order: sort,
      });
      setChapters(data);
      setTotal(count);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [slug, page, sort]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredChapters = chapters.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    String(c.chapter_number).includes(search)
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (loading && !novel) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-4">
        <div className="skeleton h-8 w-1/2" />
        <div className="skeleton h-12 w-full" />
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-16 w-full" />)}
      </div>
    );
  }

  if (error || !novel) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        <ErrorState onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 md:py-8">
      <Link to={`/novel/${novel.slug}`} className="flex items-center gap-1 text-sm text-muted hover:text-white mb-4">
        <ChevronLeft className="h-4 w-4" />
        Kembali ke {novel.title}
      </Link>

      <h1 className="text-2xl font-bold text-white mb-2">Daftar Bab</h1>
      <p className="text-sm text-muted mb-6">{total} bab tersedia</p>

      {/* Search & Sort */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari bab..."
            className="input pl-9 w-full"
          />
        </div>
        <button onClick={() => setSort(sort === 'desc' ? 'asc' : 'desc')} className="btn-secondary px-3">
          <ArrowUpDown className="h-4 w-4" />
          <span className="hidden sm:inline">{sort === 'desc' ? 'Terbaru' : 'Terlama'}</span>
        </button>
      </div>

      {/* Bab List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-16 w-full" />)}
        </div>
      ) : (
        <>
          <div className="card divide-y divide-white/5">
            {filteredChapters.map((chapter) => {
              const isNew = new Date().getTime() - new Date(chapter.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
              return (
                <Link
                  key={chapter.id}
                  to={`/read/${novel.slug}/${chapter.chapter_number}`}
                  className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white group-hover:text-primary-300 transition-colors">
                        Bab {chapter.chapter_number}
                      </p>
                      {isNew && <span className="badge bg-green-500/20 text-green-400 text-[10px]">Baru</span>}
                    </div>
                    <p className="text-xs text-muted truncate mt-0.5">{chapter.title}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className="text-xs text-muted hidden sm:flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {formatViews(chapter.views)}
                    </span>
                    <span className="text-xs text-muted">{formatDate(chapter.created_at)}</span>
                    <ChevronRight className="h-4 w-4 text-muted group-hover:text-primary-300" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="btn-secondary px-3 disabled:opacity-30"
              >
                Sebelumnya
              </button>
              <span className="text-sm text-muted px-3">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="btn-secondary px-3 disabled:opacity-30"
              >
                Selanjutnya
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
