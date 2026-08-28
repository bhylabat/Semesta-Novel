import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { History as HistoryIcon, Play, Trash2 } from 'lucide-react';
import type { ReadingHistory } from '@/types';
import { fetchReadingHistory, deleteReadingHistory, fetchNovelBySlug } from '@/lib/services';
import { getGuestHistory, deleteGuestHistory } from '@/lib/guest';
import { getCoverGradient, formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';

export default function History() {
  const { user } = useAuth();
  const [history, setHistory] = useState<ReadingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      if (user) {
        const h = await fetchReadingHistory(user.id);
        setHistory(h);
      } else {
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
        setHistory(histData.filter((h): h is ReadingHistory => h !== null));
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

  const handleDelete = async (novelId: string) => {
    if (user) {
      await deleteReadingHistory(user.id, novelId);
    } else {
      deleteGuestHistory(novelId);
    }
    setHistory((prev) => prev.filter((h) => h.novel_id !== novelId));
    setConfirmDelete(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 md:py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">Riwayat Baca</h1>

      {error ? (
        <ErrorState onRetry={loadData} />
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <EmptyState icon={HistoryIcon} title="Belum ada riwayat baca" message="Mulai baca novel dan riwayatmu akan muncul di sini." actionLabel="Jelajahi Novel" actionTo="/novel" />
      ) : (
        <div className="space-y-3">
          {history.map((h) => (
            <div key={h.novel_id} className="card p-3 flex gap-3">
              <Link
                to={`/novel/${h.novel?.slug}`}
                className="flex-shrink-0 w-14 h-20 rounded-lg overflow-hidden bg-black/20"
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
                      background: getCoverGradient(null),
                    }}
                  />
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/novel/${h.novel?.slug}`}>
                  <h3 className="text-sm font-semibold text-white hover:text-primary-300 line-clamp-1">{h.novel?.title}</h3>
                </Link>
                <p className="text-xs text-muted mt-0.5">Bab {h.chapter?.chapter_number}</p>
                <div className="mt-2">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${h.progress}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted">{Math.round(h.progress)}% selesai</span>
                    <span className="text-xs text-muted">{formatDate(h.last_read_at)}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <Link to={`/read/${h.novel?.slug}/${h.chapter?.chapter_number || 1}`} className="btn-primary text-xs px-3 py-1.5">
                    <Play className="h-3 w-3 fill-white" />
                    Lanjutkan
                  </Link>
                  <button onClick={() => setConfirmDelete(h.novel_id)} className="btn-ghost text-xs px-2 py-1.5 text-red-400">
                    <Trash2 className="h-3 w-3" />
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setConfirmDelete(null)}>
          <div className="card p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Hapus riwayat ini?</h3>
            <p className="text-sm text-muted mb-6">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Batal</button>
              <button onClick={() => handleDelete(confirmDelete)} className="btn flex-1 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 text-sm">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
