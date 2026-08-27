import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  ChevronRight,
  Edit,
  Eye,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { Chapter } from '@/types';

interface NovelInfo {
  id: string;
  title: string;
  author_id: string;
}

interface ChapterWithSchedule extends Chapter {
  status: 'draft' | 'scheduled' | 'published';
  scheduled_at: string | null;
  published_at: string | null;
}

export default function AuthorChapters() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [novel, setNovel] = useState<NovelInfo | null>(null);
  const [chapters, setChapters] = useState<
    ChapterWithSchedule[]
  >([]);
  const [loadingData, setLoadingData] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (
      profile?.role !== 'author' &&
      profile?.role !== 'admin'
    ) {
      navigate('/profile', { replace: true });
    }
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    if (loading || !user || !id) return;

    const loadData = async () => {
      try {
        setLoadingData(true);
        setError('');

        const { data: novelData, error: novelError } =
          await supabase
            .from('novels')
            .select('id, title, author_id')
            .eq('id', id)
            .single();

        if (novelError || !novelData) {
          console.error(
            'Failed to load novel:',
            novelError
          );

          setError('Novel tidak ditemukan.');
          setNovel(null);
          setChapters([]);
          return;
        }

        if (
          profile?.role !== 'admin' &&
          novelData.author_id !== user.id
        ) {
          setError(
            'Kamu tidak memiliki akses untuk mengelola novel ini.'
          );

          setNovel(null);
          setChapters([]);
          return;
        }

        setNovel(novelData);

        const {
          data: chapterData,
          error: chapterError,
        } = await supabase
          .from('chapters')
          .select(
            `
              id,
              novel_id,
              chapter_number,
              title,
              content,
              views,
              created_at,
              updated_at,
              status,
              scheduled_at,
              published_at
            `
          )
          .eq('novel_id', id)
          .order('chapter_number', {
            ascending: true,
          });

        if (chapterError) {
          console.error(
            'Failed to load chapters:',
            chapterError
          );

          throw chapterError;
        }

        setChapters(
          (chapterData || []) as ChapterWithSchedule[]
        );
      } catch (err) {
        console.error(
          'Failed to load author chapters:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Gagal memuat bab.'
        );
      } finally {
        setLoadingData(false);
      }
    };

    void loadData();
  }, [user, loading, id, profile?.role]);

  const handleDelete = async (
    chapter: ChapterWithSchedule
  ) => {
    if (!user || !novel) return;

    const confirmed = window.confirm(
      `Hapus Bab ${chapter.chapter_number} "${chapter.title || 'Tanpa judul'}"?\n\nBab yang dihapus tidak dapat dikembalikan.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(chapter.id);
      setError('');

      const {
        error: deleteError,
      } = await supabase
        .from('chapters')
        .delete()
        .eq('id', chapter.id)
        .eq('novel_id', novel.id);

      if (deleteError) {
        console.error(
          'Failed to delete chapter:',
          deleteError
        );

        throw deleteError;
      }

      setChapters((current) =>
        current.filter(
          (item) => item.id !== chapter.id
        )
      );
    } catch (err) {
      console.error(
        'Failed to delete chapter:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menghapus bab.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const formatSchedule = (
    scheduledAt: string
  ) => {
    return new Date(
      scheduledAt
    ).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatus = (
    chapter: ChapterWithSchedule
  ) => {
    if (chapter.status === 'scheduled') {
      return {
        label: 'Terjadwal',
        className:
          'bg-amber-500/10 text-amber-300 border-amber-500/20',
      };
    }

    if (chapter.status === 'published') {
      return {
        label: 'Terbit',
        className:
          'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      };
    }

    return {
      label: 'Draft',
      className:
        'bg-white/5 text-muted border-white/10',
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-white flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 text-primary-400 animate-spin" />

          <p className="text-sm text-muted">
            Memuat...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-bg text-white">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="skeleton h-5 w-40 rounded-lg mb-5" />

          <div className="flex items-center gap-3 mb-6">
            <div className="skeleton h-11 w-11 rounded-xl" />

            <div className="flex-1">
              <div className="skeleton h-6 w-48 rounded-lg mb-2" />
              <div className="skeleton h-4 w-32 rounded-lg" />
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-5">
              <div className="skeleton h-5 w-32 rounded-lg mb-2" />
              <div className="skeleton h-4 w-20 rounded-lg" />
            </div>

            <div className="divide-y divide-white/5">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="skeleton h-10 w-10 rounded-xl" />

                    <div className="flex-1">
                      <div className="skeleton h-4 w-32 rounded-lg mb-2" />
                      <div className="skeleton h-3 w-48 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-white">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="min-w-0">
            <Link
              to="/author/novels"
              className="inline-flex items-center gap-1 text-sm text-muted hover:text-white transition-colors mb-3"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Kelola Novel
            </Link>

            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-5 w-5 text-primary-400" />
              </div>

              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-white">
                  Kelola Bab
                </h1>

                <p className="text-sm text-muted mt-1 truncate">
                  {novel?.title || 'Novel'}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!id) return;

              navigate(
                `/author/novels/${id}/chapters/new`
              );
            }}
            className="btn-primary w-full sm:w-auto flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            Tambah Bab
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 mb-5">
            <p className="text-sm text-red-400">
              {error}
            </p>
          </div>
        )}

        {novel && (
          <div className="card p-4 md:p-5 mb-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-muted mb-1">
                  Novel
                </p>

                <h2 className="text-base md:text-lg font-semibold text-white truncate">
                  {novel.title}
                </h2>
              </div>

              <Link
                to={`/author/novels/${novel.id}/edit`}
                className="flex-shrink-0 inline-flex items-center gap-2 text-sm text-muted hover:text-primary-300 transition-colors"
              >
                <Edit className="h-4 w-4" />

                <span className="hidden sm:inline">
                  Edit Novel
                </span>
              </Link>
            </div>
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="p-4 md:p-5 border-b border-white/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white">
                  Daftar Bab
                </h2>

                <p className="text-xs text-muted mt-1">
                  {chapters.length}{' '}
                  {chapters.length === 1
                    ? 'bab'
                    : 'bab'}
                </p>
              </div>

              {chapters.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!id) return;

                    navigate(
                      `/author/novels/${id}/chapters/new`
                    );
                  }}
                  className="hidden sm:inline-flex btn-ghost text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Bab
                </button>
              )}
            </div>
          </div>

          {chapters.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-muted" />
              </div>

              <h3 className="text-sm font-semibold text-white">
                Belum ada bab
              </h3>

              <p className="text-xs text-muted mt-1 mb-5">
                Mulai tulis bab pertama untuk novel ini.
              </p>

              <button
                type="button"
                onClick={() => {
                  if (!id) return;

                  navigate(
                    `/author/novels/${id}/chapters/new`
                  );
                }}
                className="btn-primary"
              >
                <Plus className="h-4 w-4" />
                Tambah Bab Pertama
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {chapters.map((chapter) => {
                const status = getStatus(chapter);

                return (
                  <div
                    key={chapter.id}
                    className="p-4 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary-300">
                          {chapter.chapter_number}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-white truncate">
                            Bab {chapter.chapter_number}
                          </h3>

                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </div>

                        <p className="text-xs text-muted truncate mt-1">
                          {chapter.title ||
                            'Tanpa judul'}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          {chapter.status ===
                            'scheduled' &&
                            chapter.scheduled_at && (
                              <span className="flex items-center gap-1 text-[11px] text-amber-300">
                                <CalendarClock className="h-3 w-3" />
                                {formatSchedule(
                                  chapter.scheduled_at
                                )}
                              </span>
                            )}

                          <span className="flex items-center gap-1 text-[11px] text-muted">
                            <Eye className="h-3 w-3" />
                            {chapter.views || 0}
                          </span>

                          {chapter.updated_at && (
                            <span className="text-[11px] text-muted">
                              {new Date(
                                chapter.updated_at
                              ).toLocaleDateString(
                                'id-ID'
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (!id) return;

                            navigate(
                              `/author/novels/${id}/chapters/${chapter.id}/edit`
                            );
                          }}
                          className="h-9 w-9 rounded-lg flex items-center justify-center text-muted hover:text-primary-300 hover:bg-primary/10 transition-colors"
                          title="Edit Bab"
                          aria-label="Edit Bab"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDelete(
                              chapter
                            )
                          }
                          disabled={
                            deletingId ===
                            chapter.id
                          }
                          className="h-9 w-9 rounded-lg flex items-center justify-center text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          title="Hapus Bab"
                          aria-label="Hapus Bab"
                        >
                          {deletingId ===
                          chapter.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>

                        {chapter.status ===
                          'published' && (
                          <Link
                            to={`/read/${novel?.id}/${chapter.chapter_number}`}
                            className="hidden sm:flex h-9 w-9 rounded-lg items-center justify-center text-muted hover:text-white hover:bg-white/5 transition-colors"
                            title="Lihat Bab"
                            aria-label="Lihat Bab"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}