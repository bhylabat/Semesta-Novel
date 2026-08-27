import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Loader2,
  FileText,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface Novel {
  id: string;
  title: string;
  cover_url: string | null;
  status: string | null;
}

export default function AuthorChapterSelect() {
  const { user, profile, loading } = useAuth();

  const [novels, setNovels] = useState<Novel[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading) return;

    if (!user || (profile?.role !== 'author' && profile?.role !== 'admin')) {
      return;
    }

    const loadNovels = async () => {
      setLoadingData(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('novels')
        .select('id, title, cover_url, status')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Gagal memuat novel:', fetchError);
        setError('Gagal memuat daftar novel.');
        setLoadingData(false);
        return;
      }

      setNovels(data ?? []);
      setLoadingData(false);
    };

    loadNovels();
  }, [loading, user, profile]);

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          Memuat...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-white px-4 py-6 md:px-6">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/author"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Dashboard Penulis
        </Link>

        <div className="mb-6">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-6 w-6 text-primary-400" />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Kelola Bab
              </h1>
              <p className="text-sm text-muted">
                Pilih novel untuk menulis dan mengelola bab.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {novels.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-card p-8 text-center">
            <BookOpen className="mx-auto mb-4 h-10 w-10 text-muted" />

            <h2 className="mb-2 text-lg font-semibold">
              Belum ada novel
            </h2>

            <p className="mb-5 text-sm text-muted">
              Buat novel terlebih dahulu sebelum menambahkan bab.
            </p>

            <Link
              to="/author/create"
              className="inline-flex items-center rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-600 transition-colors"
            >
              Buat Novel
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {novels.map((novel) => (
              <Link
                key={novel.id}
                to={`/author/novels/${novel.id}/chapters`}
                className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-card p-4 transition-colors hover:bg-white/[0.05]"
              >
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-primary/10">
                  {novel.cover_url ? (
                    <img
                      src={novel.cover_url}
                      alt={novel.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <BookOpen className="h-6 w-6 text-primary-400" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-white">
                    {novel.title}
                  </h2>

                  <p className="mt-1 text-sm text-muted">
                    {novel.status || 'Belum ada status'}
                  </p>
                </div>

                <ChevronRight className="h-5 w-5 shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary-400" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}