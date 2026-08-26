import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { Novel } from '@/types';

export default function AuthorNovels() {
  const { user, loading } = useAuth();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loadingNovels, setLoadingNovels] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || loading) return;

    const load = async () => {
      setLoadingNovels(true);
      setError('');

      const { data, error } = await supabase
        .from('novels')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        setError('Gagal memuat novel.');
      } else {
        setNovels((data || []) as Novel[]);
      }

      setLoadingNovels(false);
    };

    void load();
  }, [user, loading]);

  const handleDelete = async (novel: Novel) => {
    const confirmed = window.confirm(
      `Hapus novel "${novel.title}"? Tindakan ini tidak dapat dibatalkan.`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from('novels')
      .delete()
      .eq('id', novel.id)
      .eq('author_id', user?.id);

    if (error) {
      console.error(error);
      alert('Gagal menghapus novel.');
      return;
    }

    setNovels((current) =>
      current.filter((item) => item.id !== novel.id)
    );
  };

  if (loading || loadingNovels) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="skeleton h-10 w-48 rounded-xl mb-6" />
        <div className="skeleton h-32 rounded-2xl" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">

      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <Link
            to="/author"
            className="text-sm text-muted hover:text-white flex items-center gap-1 mb-3"
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

        <Link to="/profile" className="btn-primary">
          <Plus className="h-4 w-4" />
          Buat Novel
        </Link>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 mb-5">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {novels.length === 0 ? (
        <div className="card p-8 text-center">
          <BookOpen className="h-10 w-10 text-primary-400 mx-auto mb-3" />

          <h2 className="text-lg font-semibold text-white">
            Belum ada novel
          </h2>

          <p className="text-sm text-muted mt-1">
            Mulai tulis novel pertamamu.
          </p>

          <Link to="/profile" className="btn-primary mt-5">
            <Plus className="h-4 w-4" />
            Buat Novel
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-white/5">
          {novels.map((novel) => (
            <div
              key={novel.id}
              className="p-4 flex items-center gap-4"
            >
              <div className="w-16 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-black/20">
                {novel.cover_url ? (
                  <img
                    src={novel.cover_url}
                    alt={novel.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-primary-400" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-white truncate">
                  {novel.title}
                </h2>

                <p className="text-xs text-muted mt-1">
                  {novel.status} · {novel.views ?? 0} dibaca
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/author/novels/${novel.id}/edit`}
                  className="btn-ghost p-2"
                  title="Edit novel"
                >
                  <Pencil className="h-4 w-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => handleDelete(novel)}
                  className="btn-ghost p-2 text-red-400 hover:text-red-300"
                  title="Hapus novel"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}