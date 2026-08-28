import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bookmark, BookOpen, CheckCircle2, Play, Trash2, X } from 'lucide-react';
import type { Novel, Bookmark as BookmarkType, ReadingHistory } from '@/types';
import { fetchBookmarks, fetchReadingHistory, toggleBookmark, deleteReadingHistory, fetchNovelBySlug } from '@/lib/services';
import { getGuestBookmarks, toggleGuestBookmark, getGuestHistory, deleteGuestHistory } from '@/lib/guest';
import { getCoverGradient } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import NovelCard from '@/components/NovelCard';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';

type Tab = 'reading' | 'bookmark' | 'completed';

export default function Library() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const initialTab = searchParams.get('tab');

  const [tab, setTab] = useState<Tab>(
    initialTab === 'bookmark' || initialTab === 'completed'
      ? initialTab
      : 'reading'
  );
  const [reading, setReading] = useState<ReadingHistory[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [completed, setCompleted] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'bookmark' | 'history'; novelId: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      if (user) {
        const [bms, hist] = await Promise.all([
          fetchBookmarks(user.id),
          fetchReadingHistory(user.id),
        ]);
        setBookmarks(bms);
        setReading(hist);
        setCompleted(hist.filter((h) => h.progress >= 95).map((h) => h.novel).filter((n): n is Novel => Boolean(n)));
      } else {
        const guestBmIds = getGuestBookmarks();
        const guestBms = await Promise.all(guestBmIds.map(async (id) => {
          const novel = await fetchNovelBySlug(id);
          return novel ? { id, user_id: '', novel_id: id, created_at: '', novel } as BookmarkType : null;
        }));
        setBookmarks(guestBms.filter((b): b is BookmarkType => b !== null));

        const guestHist = getGuestHistory();
        const histData = await Promise.all(guestHist.map(async (h) => {
          const novel = await fetchNovelBySlug(h.novel_id);
          return novel ? {
            id: h.novel_id,
            user_id: '',
            novel_id: h.novel_id,
            chapter_id: h.chapter_id,
            progress: h.progress,
            last_read_at: h.last_read_at,
            novel,
            chapter: { id: h.chapter_id, novel_id: h.novel_id, chapter_number: h.chapter_number, title: '', content: '', views: 0, created_at: '', updated_at: '' },
          } as ReadingHistory : null;
        }));
        setReading(histData.filter((h): h is ReadingHistory => h !== null));
        setCompleted(histData.filter((h) => h && h.progress >= 95).map((h) => h!.novel).filter((n): n is Novel => Boolean(n)));
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRemoveBookmark = async (novelId: string) => {
    if (user) {
      await toggleBookmark(user.id, novelId);
    } else {
      toggleGuestBookmark(novelId);
    }
    setBookmarks((prev) => prev.filter((b) => b.novel_id !== novelId));
    setConfirmDelete(null);
  };

  const handleDeleteHistory = async (novelId: string) => {
    if (user) {
      await deleteReadingHistory(user.id, novelId);
    } else {
      deleteGuestHistory(novelId);
    }
    setReading((prev) => prev.filter((h) => h.novel_id !== novelId));
    setConfirmDelete(null);
  };

  const tabs = [
    { value: 'reading' as Tab, label: 'Sedang Dibaca', icon: BookOpen, count: reading.length },
    { value: 'bookmark' as Tab, label: 'Bookmark', icon: Bookmark, count: bookmarks.length },
    { value: 'completed' as Tab, label: 'Selesai Dibaca', icon: CheckCircle2, count: completed.length },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">Rak Buku</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex-shrink-0 ${
                tab === t.value ? 'bg-primary text-white' : 'bg-white/5 text-muted hover:bg-white/10'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              <span className="badge bg-white/10 text-white/80 ml-1">{t.count}</span>
            </button>
          );
        })}
      </div>

      {error ? (
        <ErrorState onRetry={loadData} />
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      ) : tab === 'reading' ? (
        reading.length === 0 ? (
          <EmptyState icon={BookOpen} title="Belum ada novel yang sedang dibaca" message="Mulai baca novel dan progress kamu akan tersimpan di sini." actionLabel="Jelajahi Novel" actionTo="/novel" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reading.map((h) => (
              <div key={h.novel_id} className="card p-3 flex gap-3">
                <Link
                  to={`/novel/${h.novel?.slug}`}
                  className="flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden bg-black/20"
                >
                  {h.novel?.cover_url ? (
                    <img
                      src={h.novel.cover_url}
                      alt={`Cover ${h.novel.title}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{
                        background: getCoverGradient(h.novel?.cover_url || null),
                      }}
                    />
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/novel/${h.novel?.slug}`}>
                    <h3 className="text-sm font-semibold text-white hover:text-primary-300 line-clamp-2">{h.novel?.title}</h3>
                  </Link>
                  <p className="text-xs text-muted mt-1">Bab {h.chapter?.chapter_number}</p>
                  <div className="mt-2">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${h.progress}%` }} />
                    </div>
                    <p className="text-xs text-muted mt-1">{Math.round(h.progress)}% selesai</p>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Link to={`/read/${h.novel?.slug}/${h.chapter?.chapter_number || 1}`} className="btn-primary text-xs px-3 py-1.5">
                      <Play className="h-3 w-3 fill-white" />
                      Lanjutkan
                    </Link>
                    <button onClick={() => setConfirmDelete({ type: 'history', novelId: h.novel_id })} className="btn-ghost text-xs px-2 py-1.5 text-red-400">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : tab === 'bookmark' ? (
        bookmarks.length === 0 ? (
          <EmptyState icon={Bookmark} title="Belum ada bookmark" message="Simpan novel favoritmu untuk dibaca nanti." actionLabel="Jelajahi Novel" actionTo="/novel" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {bookmarks.map((b) => (
              <div key={b.id} className="relative group">
                {b.novel && <NovelCard novel={b.novel} />}
                <button
                  onClick={() => setConfirmDelete({ type: 'bookmark', novelId: b.novel_id })}
                  className="absolute top-2 right-2 z-20 p-1.5 rounded-lg bg-bg/80 backdrop-blur-sm text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        completed.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Belum ada novel yang selesai" message="Novel yang kamu selesaikan baca akan muncul di sini." actionLabel="Jelajahi Novel" actionTo="/novel" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {completed.map((n) => (
              <NovelCard key={n.id} novel={n} />
            ))}
          </div>
        )
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setConfirmDelete(null)}>
          <div className="card p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Hapus dari {confirmDelete.type === 'bookmark' ? 'Bookmark' : 'Riwayat'}?</h3>
            <p className="text-sm text-muted mb-6">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Batal</button>
              <button
                onClick={() => confirmDelete.type === 'bookmark' ? handleRemoveBookmark(confirmDelete.novelId) : handleDeleteHistory(confirmDelete.novelId)}
                className="btn flex-1 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 text-sm"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
