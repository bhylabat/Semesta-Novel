import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from 'react';
import {
  ArrowLeft,
  BookOpen,
  ImagePlus,
  Loader2,
  Save,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/lib/auth-context';
import { adminCreateNovel, fetchGenres } from '@/lib/services';
import { supabase } from '@/lib/supabase';
import type { Genre, NovelStatus } from '@/types';

function createSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function CreateNovel() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] =
    useState<NovelStatus>('ongoing');

  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] =
    useState<string[]>([]);

  const [coverFile, setCoverFile] =
    useState<File | null>(null);
  const [coverPreview, setCoverPreview] =
    useState<string | null>(null);

  const [loadingGenres, setLoadingGenres] =
    useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || loading) return;

    const loadGenres = async () => {
      try {
        setLoadingGenres(true);
        setError('');

        const data = await fetchGenres();
        setGenres(data);
      } catch (err) {
        console.error('Failed to load genres:', err);

        setError(
          err instanceof Error
            ? err.message
            : 'Gagal memuat genre.'
        );
      } finally {
        setLoadingGenres(false);
      }
    };

    void loadGenres();
  }, [user, loading]);

  useEffect(() => {
    return () => {
      if (coverPreview) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  const handleCoverChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setError('');

    if (!file.type.startsWith('image/')) {
      setError('File cover harus berupa gambar.');
      event.target.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setError('Ukuran cover maksimal 5 MB.');
      event.target.value = '';
      return;
    }

    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const removeCover = () => {
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }

    setCoverFile(null);
    setCoverPreview(null);
  };

  const handleGenreToggle = (genreId: string) => {
    setError('');

    setSelectedGenres((current) => {
      if (current.includes(genreId)) {
        return current.filter((id) => id !== genreId);
      }

      if (current.length >= 6) {
        setError(
          'Maksimal 6 genre yang dapat dipilih.'
        );
        return current;
      }

      return [...current, genreId];
    });
  };

  const uploadCover = async (
    file: File,
    userId: string,
    slug: string
  ): Promise<string> => {
    const extension =
      file.name
        .split('.')
        .pop()
        ?.toLowerCase() || 'jpg';

    const filePath =
      `${userId}/${slug}-${Date.now()}.${extension}`;

    const { error: uploadError } =
      await supabase.storage
        .from('novel-covers')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

    if (uploadError) {
      throw uploadError;
    }

    const { data } =
      supabase.storage
        .from('novel-covers')
        .getPublicUrl(filePath);

    if (!data.publicUrl) {
      throw new Error(
        'URL cover gagal dibuat.'
      );
    }

    return data.publicUrl;
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!user) return;

    const trimmedTitle = title.trim();
    const trimmedDescription =
      description.trim();

    if (!trimmedTitle) {
      setError('Judul novel wajib diisi.');
      return;
    }

    if (!trimmedDescription) {
      setError('Sinopsis novel wajib diisi.');
      return;
    }

    if (selectedGenres.length < 3) {
      setError(
        'Pilih minimal 3 genre untuk novel.'
      );
      return;
    }

    if (selectedGenres.length > 6) {
      setError(
        'Maksimal 6 genre yang dapat dipilih.'
      );
      return;
    }

    const slug = createSlug(trimmedTitle);

    if (!slug) {
      setError(
        'Judul novel tidak dapat digunakan untuk membuat slug.'
      );
      return;
    }

    try {
      setSaving(true);
      setError('');

      let coverUrl: string | null = null;

      if (coverFile) {
        coverUrl = await uploadCover(
          coverFile,
          user.id,
          slug
        );
      }

      const novel = await adminCreateNovel({
        title: trimmedTitle,
        slug,
        author:
          profile?.display_name ||
          profile?.username ||
          'Penulis',
        description: trimmedDescription,
        cover_url: coverUrl,
        banner_url: null,
        status,
        rating: 0,
        views: 0,
        bookmark_count: 0,
      });

      if (!novel) {
        throw new Error(
          'Novel gagal dibuat.'
        );
      }

      const genreRows = selectedGenres.map(
        (genreId) => ({
          novel_id: novel.id,
          genre_id: genreId,
        })
      );

      const { error: genreError } =
        await supabase
          .from('novel_genres')
          .insert(genreRows);

      if (genreError) {
        throw genreError;
      }

      navigate('/author', {
        replace: true,
      });
    } catch (err) {
      console.error(
        'Failed to create novel:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal membuat novel.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        <div className="skeleton h-10 w-48 rounded-xl mb-6" />
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <button
        type="button"
        onClick={() => navigate('/author')}
        className="btn-ghost mb-5"
        disabled={saving}
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </button>

      <div className="card overflow-hidden">
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/20 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary-400" />
            </div>

            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">
                Buat Novel
              </h1>

              <p className="text-sm text-muted mt-1">
                Mulai karya baru di Semesta Novel.
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

          {/* Cover */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Cover Novel
            </label>

            {coverPreview ? (
              <div className="relative w-40">
                <img
                  src={coverPreview}
                  alt="Preview cover novel"
                  className="w-40 aspect-[2/3] object-cover rounded-2xl border border-white/10"
                />

                <button
                  type="button"
                  onClick={removeCover}
                  className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg"
                  aria-label="Hapus cover"
                  disabled={saving}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="novel-cover"
                className="flex flex-col items-center justify-center w-40 aspect-[2/3] rounded-2xl border border-dashed border-white/15 bg-white/[0.03] hover:bg-white/[0.06] hover:border-primary/40 transition-colors cursor-pointer"
              >
                <ImagePlus className="h-8 w-8 text-primary-400 mb-2" />

                <span className="text-xs text-white font-medium text-center px-3">
                  Pilih Cover
                </span>

                <span className="text-[10px] text-muted mt-1">
                  JPG, PNG, WEBP
                </span>
              </label>
            )}

            <input
              id="novel-cover"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverChange}
              className="hidden"
              disabled={saving}
            />

            <p className="text-xs text-muted mt-2">
              Maksimal 5 MB. Rasio cover disarankan 2:3.
            </p>
          </div>

          {/* Judul */}
          <div>
            <label
              htmlFor="novel-title"
              className="block text-sm font-medium text-white mb-2"
            >
              Judul Novel
            </label>

            <input
              id="novel-title"
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="Masukkan judul novel"
              className="input w-full"
              maxLength={150}
              disabled={saving}
              required
            />
          </div>

          {/* Sinopsis */}
          <div>
            <label
              htmlFor="novel-description"
              className="block text-sm font-medium text-white mb-2"
            >
              Sinopsis
            </label>

            <textarea
              id="novel-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Ceritakan secara singkat tentang novelmu..."
              className="input w-full min-h-40 resize-y"
              maxLength={5000}
              disabled={saving}
              required
            />

            <p className="text-xs text-muted mt-1">
              {description.length}/5000 karakter
            </p>
          </div>

          {/* Genre */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-white">
                Genre
              </label>

              <span
                className={`text-xs ${
                  selectedGenres.length < 3
                    ? 'text-yellow-400'
                    : 'text-primary-300'
                }`}
              >
                {selectedGenres.length}/6 dipilih
              </span>
            </div>

            <p className="text-xs text-muted mb-3">
              Pilih minimal 3 dan maksimal 6 genre.
            </p>

            {loadingGenres ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat genre...
              </div>
            ) : genres.length === 0 ? (
              <p className="text-sm text-muted">
                Belum ada genre tersedia.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => {
                  const selected =
                    selectedGenres.includes(genre.id);

                  const disabled =
                    !selected &&
                    selectedGenres.length >= 6;

                  return (
                    <button
                      key={genre.id}
                      type="button"
                      onClick={() =>
                        handleGenreToggle(genre.id)
                      }
                      disabled={saving || disabled}
                      className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                        selected
                          ? 'border-primary-400 bg-primary-500/20 text-primary-300'
                          : 'border-white/10 bg-white/[0.03] text-muted hover:border-primary-400/40 hover:text-white'
                      } ${
                        disabled
                          ? 'opacity-40 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      {genre.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="novel-status"
              className="block text-sm font-medium text-white mb-2"
            >
              Status
            </label>

            <select
              id="novel-status"
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as NovelStatus
                )
              }
              className="input w-full"
              disabled={saving}
            >
              <option value="ongoing">
                Ongoing
              </option>

              <option value="completed">
                Completed
              </option>

              <option value="hiatus">
                Hiatus
              </option>
            </select>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/author')}
              className="btn-ghost"
              disabled={saving}
            >
              Batal
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={
                saving ||
                loadingGenres ||
                selectedGenres.length < 3
              }
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Buat Novel
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}