import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  Eye,
  Bookmark,
  PenLine,
  Plus,
  ChevronRight,
  Loader2,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface AuthorNovel {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  status: string | null;
  views: number | null;
  bookmark_count: number | null;
  rating: number | null;
  created_at: string;
}

export default function AuthorDashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [novels, setNovels] = useState<AuthorNovel[]>([]);
  const [totalChapters, setTotalChapters] = useState(0);
  const [loadingNovels, setLoadingNovels] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || loading) return;

    const loadAuthorData = async () => {
      setLoadingNovels(true);
      setError('');

      try {
        /*
         * =========================
         * LOAD NOVELS
         * =========================
         */
        const { data: novelData, error: novelError } =
          await supabase
            .from('novels')
            .select(
              `
                id,
                title,
                slug,
                description,
                cover_url,
                status,
                views,
                bookmark_count,
                rating,
                created_at
              `
            )
            .eq('author_id', user.id)
            .order('created_at', { ascending: false });

        if (novelError) {
          throw novelError;
        }

        const authorNovels = novelData ?? [];

        setNovels(authorNovels);

        /*
         * =========================
         * TOTAL BAB
         * =========================
         *
         * Ambil ID semua novel milik penulis,
         * kemudian hitung semua bab yang
         * memiliki novel_id tersebut.
         */
        if (authorNovels.length === 0) {
          setTotalChapters(0);
        } else {
          const novelIds = authorNovels.map(
            (novel) => novel.id
          );

          const { count: chapterCount, error: chapterError } =
            await supabase
              .from('chapters')
              .select('id', {
                count: 'exact',
                head: true,
              })
              .in('novel_id', novelIds);

          if (chapterError) {
            throw chapterError;
          }

          setTotalChapters(chapterCount ?? 0);
        }
      } catch (err) {
        console.error(
          'Failed to load author dashboard:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Gagal memuat data dashboard.'
        );
      } finally {
        setLoadingNovels(false);
      }
    };

    void loadAuthorData();
  }, [user, loading]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="skeleton h-10 w-64 rounded-xl mb-6" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="skeleton h-28 rounded-2xl"
            />
          ))}
        </div>

        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  /*
   * =========================
   * STATISTIK DASHBOARD
   * =========================
   */

  const totalNovels = novels.length;

  const totalViews = novels.reduce(
    (total, novel) =>
      total + (novel.views ?? 0),
    0
  );

  const totalBookmarks = novels.reduce(
    (total, novel) =>
      total + (novel.bookmark_count ?? 0),
    0
  );

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">

      {/* =========================
          HEADER
      ========================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <PenLine className="h-5 w-5 text-primary-400" />
            </div>

            <span className="text-sm text-primary-300 font-medium">
              Area Penulis
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Dashboard Penulis
          </h1>

          <p className="text-sm text-muted mt-1">
            Kelola novel dan karya tulisanmu di Semesta Novel.
          </p>
        </div>

        <Link
          to="/profile"
          className="btn-ghost self-start sm:self-auto"
        >
          Kembali ke Profil
        </Link>
      </div>

      {/* =========================
          STATISTICS
      ========================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">

        {/* Total Novel */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">
                Total Novel
              </p>

              <p className="text-2xl font-bold text-white mt-1">
                {totalNovels.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary-400" />
            </div>
          </div>
        </div>

        {/* Total Bab */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">
                Total Bab
              </p>

              <p className="text-2xl font-bold text-white mt-1">
                {totalChapters.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary-400" />
            </div>
          </div>
        </div>

        {/* Total Dibaca */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">
                Total Dibaca
              </p>

              <p className="text-2xl font-bold text-white mt-1">
                {totalViews.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Eye className="h-5 w-5 text-primary-400" />
            </div>
          </div>
        </div>

        {/* Total Bookmark */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">
                Total Bookmark
              </p>

              <p className="text-2xl font-bold text-white mt-1">
                {totalBookmarks.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Bookmark className="h-5 w-5 text-primary-400" />
            </div>
          </div>
        </div>

      </div>

      {/* =========================
          MANAGEMENT
      ========================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">

        <Link
          to="/author/novels"
          className="card p-5 hover:bg-white/[0.03] transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary-400" />
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white group-hover:text-primary-300">
                Kelola Novel
              </h3>

              <p className="text-xs text-muted mt-1">
                Edit dan kelola novel yang kamu tulis.
              </p>
            </div>

            <ChevronRight className="h-5 w-5 text-muted group-hover:text-primary-300" />
          </div>
        </Link>

      </div>

      {/* =========================
          NOVEL SECTION
      ========================== */}
      <div className="card overflow-hidden">

        <div className="p-4 md:p-5 border-b border-white/5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Novel Saya
            </h2>

            <p className="text-xs text-muted mt-1">
              Daftar novel yang kamu tulis.
            </p>
          </div>

          <Link
            to="/author/create"
            className="btn-primary text-sm"
          >
            <Plus className="h-4 w-4" />
            Buat Novel
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="p-5">
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
              <p className="text-sm text-red-400">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loadingNovels && !error && (
          <div className="p-6 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-primary-400 animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loadingNovels &&
          !error &&
          novels.length === 0 && (
            <div className="p-8 text-center">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-7 w-7 text-primary-400" />
              </div>

              <h3 className="text-base font-semibold text-white">
                Belum ada novel
              </h3>

              <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
                Kamu belum memiliki novel. Mulai tulis novel pertamamu
                sekarang.
              </p>

              <Link
                to="/author/create"
                className="btn-primary mt-5"
              >
                <PenLine className="h-4 w-4" />
                Tulis Novel
              </Link>
            </div>
          )}

        {/* Novel List */}
        {!loadingNovels &&
          !error &&
          novels.length > 0 && (
            <div className="divide-y divide-white/5">
              {novels.map((novel) => (
                <div
                  key={novel.id}
                  className="p-4 md:p-5 flex items-center gap-4 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="h-14 w-14 md:h-16 md:w-16 rounded-xl overflow-hidden bg-gradient-to-br from-primary/30 to-secondary/20 flex-shrink-0">
                    {novel.cover_url ? (
                      <img
                        src={novel.cover_url}
                        alt={`Cover ${novel.title}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-primary-300" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm md:text-base font-semibold text-white truncate">
                      {novel.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="text-xs text-muted">
                        {(novel.views ?? 0).toLocaleString('id-ID')} dibaca
                      </span>

                      <span className="text-xs text-muted">
                        {(novel.bookmark_count ?? 0).toLocaleString('id-ID')} bookmark
                      </span>

                      {novel.status && (
                        <span className="badge bg-primary/10 text-primary-300 capitalize">
                          {novel.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    to={`/novel/${novel.slug}`}
                    className="btn-ghost p-2 flex-shrink-0"
                    title="Lihat novel"
                    aria-label={`Lihat novel ${novel.title}`}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                </div>
              ))}
            </div>
          )}

      </div>

      {/* =========================
          ROLE INFO
      ========================== */}
      {profile?.role === 'author' && (
        <div className="mt-6 rounded-2xl bg-primary/10 border border-primary/20 p-4">
          <p className="text-sm font-medium text-primary-300">
            Mode Penulis Aktif
          </p>

          <p className="text-xs text-muted mt-1">
            Akunmu sudah terdaftar sebagai penulis. Nantinya seluruh
            pengelolaan karya akan dilakukan melalui Dashboard Penulis.
          </p>
        </div>
      )}

    </div>
  );
}