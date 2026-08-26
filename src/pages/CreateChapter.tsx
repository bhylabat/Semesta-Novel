import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Loader2, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface NovelInfo {
  id: string;
  title: string;
  author_id: string;
}

export default function CreateChapter() {
  const { id } = useParams();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [novel, setNovel] = useState<NovelInfo | null>(null);
  const [chapterNumber, setChapterNumber] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [loadingNovel, setLoadingNovel] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (profile?.role !== 'author' && profile?.role !== 'admin') {
      navigate('/profile', { replace: true });
    }
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    if (!user || loading || !id) return;

    const loadNovel = async () => {
      try {
        setLoadingNovel(true);
        setError('');

        const { data, error: novelError } = await supabase
          .from('novels')
          .select('id, title, author_id')
          .eq('id', id)
          .single();

        if (novelError || !data) {
          setError('Novel tidak ditemukan.');
          return;
        }

        if (
          profile?.role !== 'admin' &&
          data.author_id !== user.id
        ) {
          setError('Kamu tidak memiliki akses ke novel ini.');
          return;
        }

        setNovel(data);

        const { data: lastChapter } = await supabase
          .from('chapters')
          .select('chapter_number')
          .eq('novel_id', id)
          .order('chapter_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        setChapterNumber(
          String((lastChapter?.chapter_number || 0) + 1)
        );
      } catch (err) {
        console.error('Failed to load novel:', err);

        setError(
          err instanceof Error
            ? err.message
            : 'Gagal memuat novel.'
        );
      } finally {
        setLoadingNovel(false);
      }
    };

    void loadNovel();
  }, [user, loading, id, profile?.role]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || !id || !novel) return;

    const number = Number(chapterNumber);

    if (!Number.isInteger(number) || number < 1) {
      setError('Nomor bab harus berupa angka yang valid.');
      return;
    }

    if (!title.trim()) {
      setError('Judul bab wajib diisi.');
      return;
    }

    if (!content.trim()) {
      setError('Isi bab wajib diisi.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const { error: insertError } = await supabase
        .from('chapters')
        .insert({
          novel_id: novel.id,
          chapter_number: number,
          title: title.trim(),
          content: content.trim(),
          views: 0,
        });

      if (insertError) {
        throw insertError;
      }

      navigate(`/author/novels/${novel.id}/chapters`);
    } catch (err) {
      console.error('Failed to create chapter:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal membuat bab.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingNovel) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <div className="skeleton h-8 w-48 rounded-xl mb-6" />
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  if (!user || !novel) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <button
        type="button"
        onClick={() =>
          navigate(`/author/novels/${novel.id}/chapters`)
        }
        className="btn-ghost mb-5"
        disabled={saving}
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </button>

      <div className="card overflow-hidden">
        <div className="p-5 md:p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/20 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary-400" />
            </div>

            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">
                Tambah Bab
              </h1>

              <p className="text-sm text-muted mt-1">
                {novel.title}
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-5 md:p-6 space-y-5"
        >
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="chapter-number"
              className="block text-sm font-medium text-white mb-2"
            >
              Nomor Bab
            </label>

            <input
              id="chapter-number"
              type="number"
              min="1"
              value={chapterNumber}
              onChange={(event) =>
                setChapterNumber(event.target.value)
              }
              className="input w-full"
              disabled={saving}
              required
            />
          </div>

          <div>
            <label
              htmlFor="chapter-title"
              className="block text-sm font-medium text-white mb-2"
            >
              Judul Bab
            </label>

            <input
              id="chapter-title"
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="Contoh: Pertemuan Pertama"
              className="input w-full"
              maxLength={200}
              disabled={saving}
              required
            />
          </div>

          <div>
            <label
              htmlFor="chapter-content"
              className="block text-sm font-medium text-white mb-2"
            >
              Isi Bab
            </label>

            <textarea
              id="chapter-content"
              value={content}
              onChange={(event) =>
                setContent(event.target.value)
              }
              placeholder="Mulai tulis isi bab di sini..."
              className="input w-full min-h-[500px] resize-y leading-relaxed"
              disabled={saving}
              required
            />

            <p className="text-xs text-muted mt-2">
              {content.length.toLocaleString('id-ID')} karakter
            </p>
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(`/author/novels/${novel.id}/chapters`)
              }
              className="btn-ghost"
              disabled={saving}
            >
              Batal
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Simpan Bab
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}