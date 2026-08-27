import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  Loader2,
  Save,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface NovelInfo {
  id: string;
  title: string;
  author_id: string;
}

interface ChapterInfo {
  id: string;
  novel_id: string;
  chapter_number: number;
  title: string;
  content: string;
  status: 'draft' | 'scheduled' | 'published';
  scheduled_at: string | null;
  published_at: string | null;
}

export default function EditChapter() {
  const { id, chapterId } = useParams<{
    id: string;
    chapterId: string;
  }>();

  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [novel, setNovel] = useState<NovelInfo | null>(null);
  const [chapter, setChapter] = useState<ChapterInfo | null>(null);

  const [chapterNumber, setChapterNumber] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [publishType, setPublishType] = useState<
    'now' | 'schedule'
  >('now');

  const [scheduledAt, setScheduledAt] = useState('');

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
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
    if (!user || loading || !id || !chapterId) return;

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
          setError('Novel tidak ditemukan.');
          return;
        }

        if (
          profile?.role !== 'admin' &&
          novelData.author_id !== user.id
        ) {
          setError(
            'Kamu tidak memiliki akses ke novel ini.'
          );
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
              status,
              scheduled_at,
              published_at
            `
          )
          .eq('id', chapterId)
          .eq('novel_id', id)
          .single();

        if (chapterError || !chapterData) {
          console.error(
            'Failed to load chapter:',
            chapterError
          );

          setError('Bab tidak ditemukan.');
          return;
        }

        setChapter(chapterData);
        setChapterNumber(
          String(chapterData.chapter_number)
        );
        setTitle(chapterData.title || '');
        setContent(chapterData.content || '');

        if (chapterData.status === 'scheduled') {
          setPublishType('schedule');

          if (chapterData.scheduled_at) {
            const date = new Date(
              chapterData.scheduled_at
            );

            const localDateTime = new Date(
              date.getTime() -
                date.getTimezoneOffset() * 60000
            )
              .toISOString()
              .slice(0, 16);

            setScheduledAt(localDateTime);
          }
        } else {
          setPublishType('now');
          setScheduledAt('');
        }
      } catch (err) {
        console.error(
          'Failed to load chapter:',
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
  }, [
    user,
    loading,
    id,
    chapterId,
    profile?.role,
  ]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!user || !id || !novel || !chapter) return;

    const number = Number(chapterNumber);

    if (!Number.isInteger(number) || number < 1) {
      setError(
        'Nomor bab harus berupa angka yang valid.'
      );
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

    if (
      publishType === 'schedule' &&
      !scheduledAt
    ) {
      setError(
        'Tanggal dan waktu terbit wajib diisi.'
      );
      return;
    }

    let status:
      | 'draft'
      | 'scheduled'
      | 'published';

    let scheduledAtValue: string | null = null;
    let publishedAtValue: string | null =
      chapter.published_at;

    if (publishType === 'schedule') {
      const selectedDate = new Date(scheduledAt);

      if (
        Number.isNaN(selectedDate.getTime())
      ) {
        setError(
          'Tanggal dan waktu terbit tidak valid.'
        );
        return;
      }

      if (
        selectedDate.getTime() <= Date.now()
      ) {
        setError(
          'Jadwal terbit harus berada di masa depan.'
        );
        return;
      }

      status = 'scheduled';
      scheduledAtValue =
        selectedDate.toISOString();
      publishedAtValue = null;
    } else {
      status = 'published';

      if (!chapter.published_at) {
        publishedAtValue =
          new Date().toISOString();
      }

      scheduledAtValue = null;
    }

    try {
      setSaving(true);
      setError('');

      const { error: updateError } =
        await supabase
          .from('chapters')
          .update({
            chapter_number: number,
            title: title.trim(),
            content: content.trim(),
            status,
            scheduled_at: scheduledAtValue,
            published_at: publishedAtValue,
            updated_at:
              new Date().toISOString(),
          })
          .eq('id', chapter.id)
          .eq('novel_id', novel.id);

      if (updateError) {
        throw updateError;
      }

      navigate(
        `/author/novels/${novel.id}/chapters`
      );
    } catch (err) {
      console.error(
        'Failed to update chapter:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan perubahan bab.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <div className="skeleton h-8 w-48 rounded-xl mb-6" />
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  if (!user || !novel || !chapter) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
            <p className="text-sm text-red-400">
              {error}
            </p>
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
          navigate(
            `/author/novels/${novel.id}/chapters`
          )
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

            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-white">
                Edit Bab
              </h1>

              <p className="text-sm text-muted mt-1 truncate">
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
              <p className="text-sm text-red-400">
                {error}
              </p>
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
                setChapterNumber(
                  event.target.value
                )
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
              {content.length.toLocaleString(
                'id-ID'
              )}{' '}
              karakter
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Waktu Terbit
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setPublishType('now');
                  setScheduledAt('');
                }}
                className={`rounded-xl border p-4 text-left transition ${
                  publishType === 'now'
                    ? 'border-primary bg-primary/10'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
                disabled={saving}
              >
                <div className="font-medium text-white">
                  Terbit Sekarang
                </div>

                <div className="text-xs text-muted mt-1">
                  Bab langsung tersedia untuk pembaca.
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setPublishType('schedule')
                }
                className={`rounded-xl border p-4 text-left transition ${
                  publishType === 'schedule'
                    ? 'border-primary bg-primary/10'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
                disabled={saving}
              >
                <div className="flex items-center gap-2 font-medium text-white">
                  <CalendarClock className="h-4 w-4 text-primary-400" />
                  Jadwalkan
                </div>

                <div className="text-xs text-muted mt-1">
                  Bab otomatis terbit sesuai jadwal.
                </div>
              </button>
            </div>
          </div>

          {publishType === 'schedule' && (
            <div>
              <label
                htmlFor="scheduled-at"
                className="block text-sm font-medium text-white mb-2"
              >
                Tanggal & Jam Terbit
              </label>

              <input
                id="scheduled-at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) =>
                  setScheduledAt(
                    event.target.value
                  )
                }
                className="input w-full"
                disabled={saving}
                required
              />

              <p className="text-xs text-muted mt-2">
                Bab akan otomatis diterbitkan pada waktu yang dipilih.
              </p>
            </div>
          )}

          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/author/novels/${novel.id}/chapters`
                )
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
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}