import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Star, Eye, BookOpen, Bookmark, Share2, Play,
  ChevronRight, Search, ArrowUpDown
} from 'lucide-react';
import type { Novel, Chapter } from '@/types';
import { fetchNovelBySlug, fetchLatestChapters, fetchSimilarNovels, isBookmarked, toggleBookmark } from '@/lib/services';
import { getCoverGradient, getBannerGradient, formatViews, formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { isGuestBookmarked, toggleGuestBookmark } from '@/lib/guest';
import NovelCard from '@/components/NovelCard';
import CommentSection from '@/components/CommentSection';
import ErrorState from '@/components/ErrorState';

export default function NovelDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [latestChapters, setLatestChapters] = useState<Chapter[]>([]);
  const [similarNovels, setSimilarNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [chapterSearch, setChapterSearch] = useState('');
  const [chapterSort, setChapterSort] = useState<'desc' | 'asc'>('desc');

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
      const [latest, similar] = await Promise.all([
        fetchLatestChapters(n.id, 10),
        fetchSimilarNovels(n),
      ]);
      setLatestChapters(latest);
      setSimilarNovels(similar);

      if (user) {
        setBookmarked(await isBookmarked(user.id, n.id));
      } else {
        setBookmarked(isGuestBookmarked(n.id));
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [slug, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBookmark = async () => {
    if (!novel) return;
    if (user) {
      const result = await toggleBookmark(user.id, novel.id);
      setBookmarked(result);
    } else {
      const result = toggleGuestBookmark(novel.id);
      setBookmarked(result);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: novel?.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-8">
        <div className="skeleton h-48 md:h-64 rounded-3xl mb-6" />
        <div className="flex gap-6">
          <div className="skeleton h-48 w-36 rounded-2xl" />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-8 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !novel) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        <ErrorState onRetry={loadData} />
      </div>
    );
  }

  const filteredChapters = latestChapters.filter((c) =>
    c.title.toLowerCase().includes(chapterSearch.toLowerCase()) ||
    String(c.chapter_number).includes(chapterSearch)
  );
  const sortedChapters = [...filteredChapters].sort((a, b) =>
    chapterSort === 'desc' ? b.chapter_number - a.chapter_number : a.chapter_number - b.chapter_number
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-8">
      {/* Banner */}
      <div className="relative h-32 md:h-56 rounded-3xl overflow-hidden mb-6">
        <div className="absolute inset-0" style={{ background: getBannerGradient(novel.banner_url) }} />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
      </div>

      {/* Main Info */}
      <div className="flex flex-col md:flex-row gap-6 -mt-20 md:-mt-24 relative z-10">
          {/* Cover */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <div className="w-36 h-52 md:w-44 md:h-64 rounded-2xl overflow-hidden shadow-2xl bg-black/20">
              {novel.cover_url ? (
                <img
                  src={novel.cover_url}
                  alt={`Cover ${novel.title}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{
                    background: getCoverGradient(novel.cover_url),
                  }}
                />
              )}
            </div>
          </div>

        {/* Info */}
        <div className="flex-1 pt-2 md:pt-20">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`badge ${novel.status === 'ongoing' ? 'bg-green-500/20 text-green-400' : novel.status === 'completed' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
              {novel.status === 'ongoing' ? 'Ongoing' : novel.status === 'completed' ? 'Completed' : 'Hiatus'}
            </span>
            {novel.genres?.map((g) => (
              <Link key={g.id} to={`/novel?genre=${g.id}`} className="badge bg-white/10 text-white/80 hover:bg-white/15">
                {g.name}
              </Link>
            ))}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{novel.title}</h1>
          <p className="text-sm text-muted mb-4">oleh <span className="text-primary-300">{novel.author}</span></p>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="card p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-rating mb-1">
                <Star className="h-4 w-4 fill-rating" />
                <span className="text-lg font-bold">{Number(novel.rating).toFixed(1)}</span>
              </div>
              <p className="text-xs text-muted">Rating</p>
            </div>
            <div className="card p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-white mb-1">
                <Eye className="h-4 w-4" />
                <span className="text-lg font-bold">{formatViews(novel.views)}</span>
              </div>
              <p className="text-xs text-muted">Pembaca</p>
            </div>
            <div className="card p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-white mb-1">
                <BookOpen className="h-4 w-4" />
                <span className="text-lg font-bold">{novel.chapter_count || 0}</span>
              </div>
              <p className="text-xs text-muted">Bab</p>
            </div>
            <div className="card p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-white mb-1">
                <Bookmark className="h-4 w-4" />
                <span className="text-lg font-bold">{formatViews(novel.bookmark_count)}</span>
              </div>
              <p className="text-xs text-muted">Bookmark</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to={`/read/${novel.slug}/1`} className="btn-primary w-full sm:w-auto">
              <Play className="h-4 w-4 fill-white" />
              Baca Sekarang
            </Link>
            <button onClick={handleBookmark} className={`btn-secondary w-full sm:w-auto ${bookmarked ? 'text-primary-300' : ''}`}>
              <Bookmark className={`h-4 w-4 ${bookmarked ? 'fill-primary-300' : ''}`} />
              {bookmarked ? 'Tersimpan' : 'Tambah ke Rak Buku'}
            </button>
            <button onClick={handleShare} className="btn-secondary w-full sm:w-auto">
              <Share2 className="h-4 w-4" />
              Bagikan
            </button>
          </div>
        </div>
      </div>

      {/* Sinopsis */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-3">Sinopsis</h2>
        <p className="text-sm md:text-base text-muted leading-relaxed whitespace-pre-line">
          {novel.description}
        </p>
      </div>

      {/* Bab Terbaru */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Bab Terbaru</h2>
          <Link to={`/novel/${novel.slug}/chapters`} className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
            Semua Bab <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              value={chapterSearch}
              onChange={(e) => setChapterSearch(e.target.value)}
              placeholder="Cari bab..."
              className="input pl-9 w-full"
            />
          </div>
          <button onClick={() => setChapterSort(chapterSort === 'desc' ? 'asc' : 'desc')} className="btn-secondary self-end sm:self-auto px-3">
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>

        <div className="card divide-y divide-white/5">
          {sortedChapters.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">Tidak ada bab ditemukan</p>
          ) : (
            sortedChapters.map((chapter) => (
              <Link
                key={chapter.id}
                to={`/read/${novel.slug}/${chapter.chapter_number}`}
                className="flex items-center justify-between gap-3 p-3 sm:p-4 hover:bg-white/5 transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white group-hover:text-primary-300 transition-colors">
                    Bab {chapter.chapter_number}
                  </p>
                  <p className="text-xs text-muted truncate">{chapter.title}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-muted hidden sm:flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {formatViews(chapter.views)}
                  </span>
                   <span className="hidden sm:inline text-xs text-muted">{formatDate(chapter.created_at)}</span>
                  <ChevronRight className="h-4 w-4 text-muted group-hover:text-primary-300" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Komentar Novel */}
      <CommentSection
        novelId={novel.id}
        chapterId={null}
        title="Komentar Novel"
        placeholder="Tulis komentar tentang novel ini..."
        emptyTitle="Belum ada komentar tentang novel ini."
        emptyMessage="Jadilah yang pertama memberikan komentar."
      />

      {/* Novel Serupa */}
      {similarNovels.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">Novel Serupa</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {similarNovels.map((n) => (
              <NovelCard key={n.id} novel={n} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
