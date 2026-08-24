import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Loader2,
  Trash2,
  Filter,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import {
  fetchMyComments,
  deleteComment,
} from '@/lib/services';
import type { Comment } from '@/types';
import { formatDate } from '@/lib/utils';

type CommentFilter = 'all' | 'novel' | 'chapter';

export default function MyComments() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [commentFilter, setCommentFilter] =
    useState<CommentFilter>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const loadComments = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await fetchMyComments(user.id);
        setComments(data);
      } catch (err) {
        console.error('Failed to load user comments:', err);
        setError('Gagal memuat komentar.');
      } finally {
        setLoading(false);
      }
    };

    void loadComments();
  }, [user]);

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    setDeletingId(commentId);
    setError('');

    try {
      await deleteComment(commentId);

      setComments((prev) =>
        prev.filter((comment) => comment.id !== commentId)
      );

      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Failed to delete comment:', err);
      setError('Gagal menghapus komentar.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredComments = comments.filter((comment) => {
    if (commentFilter === 'novel') {
      return !comment.chapter_id;
    }

    if (commentFilter === 'chapter') {
      return Boolean(comment.chapter_id);
    }

    return true;
  });

  const allCount = comments.length;

  const novelCount = comments.filter(
    (comment) => !comment.chapter_id
  ).length;

  const chapterCount = comments.filter(
    (comment) => Boolean(comment.chapter_id)
  ).length;

  if (authLoading || loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        <div className="card p-6 flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary-400" />

          <span className="text-sm text-muted">
            Memuat komentar...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 md:py-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Komentar Saya
        </h1>

        <p className="text-sm text-muted mt-1">
          Semua komentar yang pernah kamu tulis.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="card mb-5 p-4 border border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-400">
            {error}
          </p>
        </div>
      )}

      {/* Filter */}
      {comments.length > 0 && (
        <div className="card p-3 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-primary-400" />

            <span className="text-sm font-medium text-white">
              Filter Komentar
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setCommentFilter('all')}
              className={`px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                commentFilter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-white/5 text-muted hover:bg-white/10'
              }`}
            >
              <span className="block">
                Semua
              </span>

              <span className="text-[10px] sm:text-xs opacity-70">
                {allCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCommentFilter('novel')}
              className={`px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                commentFilter === 'novel'
                  ? 'bg-primary text-white'
                  : 'bg-white/5 text-muted hover:bg-white/10'
              }`}
            >
              <span className="block">
                Novel
              </span>

              <span className="text-[10px] sm:text-xs opacity-70">
                {novelCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCommentFilter('chapter')}
              className={`px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                commentFilter === 'chapter'
                  ? 'bg-primary text-white'
                  : 'bg-white/5 text-muted hover:bg-white/10'
              }`}
            >
              <span className="block">
                Bab
              </span>

              <span className="text-[10px] sm:text-xs opacity-70">
                {chapterCount}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Tidak ada komentar */}
      {comments.length === 0 ? (
        <div className="card p-8 text-center">
          <MessageSquare className="h-10 w-10 text-muted mx-auto mb-3" />

          <h2 className="text-base font-semibold text-white">
            Belum ada komentar
          </h2>

          <p className="text-sm text-muted mt-1 mb-5">
            Komentar yang kamu tulis akan muncul di sini.
          </p>

          <Link
            to="/novel"
            className="btn-primary"
          >
            Jelajahi Novel
          </Link>
        </div>
      ) : filteredComments.length === 0 ? (
        /* Filter kosong */
        <div className="card p-8 text-center">
          <MessageSquare className="h-10 w-10 text-muted mx-auto mb-3" />

          <h2 className="text-base font-semibold text-white">
            Tidak ada komentar
          </h2>

          <p className="text-sm text-muted mt-1">
            Belum ada komentar pada kategori ini.
          </p>
        </div>
      ) : (
        /* Daftar komentar */
        <div className="space-y-3">

          {filteredComments.map((comment) => (
            <div
              key={comment.id}
              className="card p-4 hover:bg-white/[0.03] transition-colors"
            >
              {/* Isi komentar */}
              <div className="flex items-start gap-3">

                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-4 w-4 text-primary-400" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">

                  {/* Komentar */}
                  <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                    <p className="text-sm text-white leading-relaxed break-words">
                      {comment.content}
                    </p>
                  </div>

                  {/* Informasi */}
                  <div className="flex flex-wrap items-center gap-2 mt-3">

                    <span className="text-xs text-muted">
                      {formatDate(comment.created_at)}
                    </span>

                    {comment.chapter_id ? (
                      <span className="badge bg-primary/10 text-primary-300">
                        Komentar Bab
                      </span>
                    ) : (
                      <span className="badge bg-white/5 text-muted">
                        Komentar Novel
                      </span>
                    )}

                  </div>

                  {/* Tombol hapus */}
                  <div className="flex justify-end mt-3 pt-3 border-t border-white/5">

                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDeleteId(comment.id)
                      }
                      disabled={deletingId === comment.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400 bg-red-500/5 hover:bg-red-500/10 hover:text-red-300 transition-colors disabled:opacity-50"
                    >
                      {deletingId === comment.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}

                      Hapus
                    </button>

                  </div>
                </div>
              </div>
            </div>
          ))}

        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => {
            if (!deletingId) {
              setConfirmDeleteId(null);
            }
          }}
        >
          <div
            className="card p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="flex items-center gap-3 mb-4">

              <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white">
                  Hapus komentar?
                </h2>

                <p className="text-xs text-muted mt-0.5">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

            </div>

            <div className="flex gap-3 mt-6">

              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                disabled={deletingId !== null}
                className="btn-secondary flex-1"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirmDeleteId) {
                    void handleDeleteComment(confirmDeleteId);
                  }
                }}
                disabled={deletingId !== null}
                className="btn flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                {deletingId ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Hapus
                  </>
                )}
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}