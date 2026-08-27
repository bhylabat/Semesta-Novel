import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  ChevronRight,
  Loader2,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { Novel } from '@/types';

export default function AuthorNovels() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [novels, setNovels] = useState<Novel[]>([]);
  const [loadingNovels, setLoadingNovels] = useState(true);
  const [deletingNovelId, setDeletingNovelId] =
    useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || loading) return;

    const loadNovels = async () => {
      setLoadingNovels(true);
      setError('');

      try {
        const { data, error: fetchError } = await supabase
          .from('novels')
          .select('*')
          .eq('author_id', user.id)
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        setNovels((data ?? []) as Novel[]);
      } catch (err) {
        console.error('Failed to load novels:', err);

        setError(
          err instanceof Error
            ? err.message
            : 'Gagal memuat novel.'
        );
      } finally {
        setLoadingNovels(false);
      }
    };

    void loadNovels();
  }, [user, loading]);

  const handleDeleteNovel = async (novel: Novel) => {
    if (!user) return;

    const confirmed = window.confirm(
      `Hapus novel "${novel.title}"?\n\nTindakan ini tidak dapat dibatalkan.`
    );

    if (!confirmed) return;

    try {
      setDeletingNovelId(novel.id);
      setError('');

      const { error: deleteError } = await supabase
        .from('novels')
        .delete()
        .eq('id', novel.id)
        .eq('author_id', user.id);

      if (deleteError) {
        throw deleteError;
      }

      setNovels((current) =>
        current.filter((item) => item.id !== novel.id)
      );
    } catch (err) {
      console.error('Failed to delete novel:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menghapus novel.'
      );
    } finally {
      setDeletingNovelId(null);
    }
  };

  const handleOpenChapters = (novel: Novel) => {
    navigate(`/author/novels/${novel.id}/chapters`);
  };

  const handleAddChapter = (novel: Novel) => {
    navigate(`/author/novels/${novel.id}/chapters/new`);
  };

  if (loading || loadingNovels) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="skeleton h-10 w-48 rounded-xl mb-6" />

        <div className="card overflow-hidden">
          <div className="p-4">
            <div className="skeleton h-20 rounded-xl" />
          </div>

          <div className="p-4">
            <div className="skeleton h-20 rounded-xl" />
          </div>

          <div className="p-4">
            <div className="skeleton h-20 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <Link
            to="/author"
            className="text-sm text-muted hover:text-white flex items-center gap-1 mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard Penulis
          </Link>

          <h1 className="text-2xl font-bold text-white">
            Kelola Novel
          </h1>

          <p className="text-sm text-muted mt-1">
            Kelola semua novel yang kamu tulis.
          </p>
        </div>

        {/* Buat Novel */}
        <Link
          to="/author/create"
          className="btn-primary flex-shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Novel</span>
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 mb-5">
          <p className="text-sm text-red-400">
            {error}
          </p>
        </div>
      )}

      {/* Empty State */}
      {novels.length === 0 ? (
        <div className="card p-8 md:p-10 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-7 w-7 text-primary-400" />
          </div>

          <h2 className="text-lg font-semibold text-white">
            Belum ada novel
          </h2>

          <p className="text-sm text-muted mt-1">
            Mulai tulis novel pertamamu.
          </p>

          <Link
            to="/author/create"
            className="btn-primary mt-5"
          >
            <Plus className="h-4 w-4" />
            Buat Novel
          </Link>
        </div>
      ) : (
        /* Novel List */
        <div className="card overflow-hidden divide-y divide-white/5">
          {novels.map((novel) => (
            <div
              key={novel.id}
              className="p-4 md:p-5 flex items-center gap-3 hover:bg-white/[0.03] transition-colors"
            >
              {/* Novel Info */}
              <button
                type="button"
                onClick={() => handleOpenChapters(novel)}
                className="flex items-center gap-4 flex-1 min-w-0 text-left"
                aria-label={`Kelola Bab ${novel.title}`}
              >
                {/* Cover */}
                <div className="w-16 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-black/20">
                  {novel.cover_url ? (
                    <img
                      src={novel.cover_url}
                      alt={`Cover ${novel.title}`}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-primary-400" />
                    </div>
                  )}
                </div>

                {/* Information */}
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-white truncate">
                    {novel.title}
                  </h2>

                  <p className="text-xs text-muted mt-1">
                    {novel.status ?? 'Draft'} ·{' '}
                    {novel.views ?? 0} dibaca
                  </p>

                  <p className="text-xs text-primary-300 mt-2">
                    Kelola Bab
                  </p>
                </div>

                <ChevronRight className="h-5 w-5 text-muted flex-shrink-0" />
              </button>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Tambah Bab */}
                <button
                  type="button"
                  onClick={() => handleAddChapter(novel)}
                  className="btn-ghost p-2 text-primary-400 hover:text-primary-300 hover:bg-primary/10"
                  title="Tambah Bab"
                  aria-label={`Tambah Bab ${novel.title}`}
                >
                  <Plus className="h-5 w-5" />
                </button>

                {/* Edit Novel */}
                <Link
                  to={`/author/novels/${novel.id}/edit`}
                  className="btn-ghost p-2"
                  title="Edit Novel"
                  aria-label={`Edit Novel ${novel.title}`}
                >
                  <Pencil className="h-4 w-4" />
                </Link>

                {/* Hapus Novel */}
                <button
                  type="button"
                  onClick={() =>
                    void handleDeleteNovel(novel)
                  }
                  disabled={
                    deletingNovelId === novel.id
                  }
                  className="btn-ghost p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                  title="Hapus Novel"
                  aria-label={`Hapus Novel ${novel.title}`}
                >
                  {deletingNovelId === novel.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}