import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from 'react';
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  Save,
  X,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/lib/auth-context';
import { fetchGenres } from '@/lib/services';
import { supabase } from '@/lib/supabase';
import type { Genre, NovelStatus } from '@/types';

export default function EditNovel() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');

  // Author = nama penulis asli novel.
  // Berbeda dengan author_id yang tetap merupakan
  // user yang mengupload/mengelola novel.
  const [author, setAuthor] = useState('');

  const [description, setDescription] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [language, setLanguage] = useState('');
  const [translator, setTranslator] = useState('');
  const [status, setStatus] =
    useState<NovelStatus>('ongoing');

  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] =
    useState<string[]>([]);

  const [coverUrl, setCoverUrl] = useState('');
  const [coverFile, setCoverFile] =
    useState<File | null>(null);
  const [coverPreview, setCoverPreview] =
    useState<string | null>(null);

  const [loadingNovel, setLoadingNovel] = useState(true);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || loading || !id) return;

    const loadData = async () => {
      try {
        setLoadingNovel(true);
        setLoadingGenres(true);
        setError('');

        const [
          novelResult,
          genresResult,
          novelGenresResult,
        ] = await Promise.all([
          supabase
            .from('novels')
            .select(
              'title, author, description, status, cover_url, release_year, language, translator'
            )
            .eq('id', id)
            .eq('author_id', user.id)
            .single(),

          fetchGenres(),

          supabase
            .from('novel_genres')
            .select('genre_id')
            .eq('novel_id', id),
        ]);

        if (novelResult.error) {
          throw new Error('Novel tidak ditemukan.');
        }

        if (novelGenresResult.error) {
          throw novelGenresResult.error;
        }

        setTitle(novelResult.data.title);

        setAuthor(
          novelResult.data.author || ''
        );

        setReleaseYear(
          novelResult.data.release_year?.toString() || ''
        );

        setLanguage(
          novelResult.data.language || ''
        );

        setTranslator(
          novelResult.data.translator || ''
        );

        setDescription(
          novelResult.data.description || ''
        );

        setStatus(
          novelResult.data.status as NovelStatus
        );

        setCoverUrl(
          novelResult.data.cover_url || ''
        );

        setGenres(genresResult);

        setSelectedGenres(
          novelGenresResult.data.map(
            (item) => item.genre_id
          )
        );
      } catch (err) {
        console.error(
          'Failed to load edit novel:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Gagal memuat data novel.'
        );
      } finally {
        setLoadingNovel(false);
        setLoadingGenres(false);
      }
    };

    void loadData();
  }, [user, loading, id]);

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
        return current.filter(
          (id) => id !== genreId
        );
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
    novelId: string
  ): Promise<string> => {
    const extension =
      file.name
        .split('.')
        .pop()
        ?.toLowerCase() || 'jpg';

    const filePath =
      `${userId}/${novelId}-${Date.now()}.${extension}`;

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

    if (!user || !id) return;

    const trimmedTitle = title.trim();
    const trimmedAuthor = author.trim();
    const trimmedDescription =
      description.trim();

    if (!trimmedTitle) {
      setError('Judul novel wajib diisi.');
      return;
    }

    if (!trimmedAuthor) {
      setError('Author wajib diisi.');
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

    try {
      setSaving(true);
      setError('');

      let newCoverUrl = coverUrl;

      if (coverFile) {
        newCoverUrl = await uploadCover(
          coverFile,
          user.id,
          id
        );
      }

      const { error: novelError } =
        await supabase
          .from('novels')
          .update({
            title: trimmedTitle,

            // Author = penulis asli novel.
            // Tidak mengubah author_id.
            author: trimmedAuthor,

            description: trimmedDescription,
            status,
            cover_url: newCoverUrl || null,
            release_year: releaseYear
              ? parseInt(releaseYear, 10)
              : null,
            language: language.trim() || null,
            translator: translator.trim() || null,
          })
          .eq('id', id)
          .eq('author_id', user.id);

      if (novelError) {
        throw novelError;
      }

      /*
       * Hapus semua genre lama.
       */
      const { error: deleteGenreError } =
        await supabase
          .from('novel_genres')
          .delete()
          .eq('novel_id', id);

      if (deleteGenreError) {
        throw deleteGenreError;
      }

      /*
       * Simpan semua genre yang baru dipilih.
       */
      const genreRows = selectedGenres.map(
        (genreId) => ({
          novel_id: id,
          genre_id: genreId,
        })
      );

      const { error: insertGenreError } =
        await supabase
          .from('novel_genres')
          .insert(genreRows);

      if (insertGenreError) {
        throw insertGenreError;
      }

      navigate('/author/novels');
    } catch (err) {
      console.error(
        'Failed to update novel:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan perubahan.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingNovel) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        <div className="skeleton h-10 w-48 rounded-xl mb-6" />
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">

      <Link
        to="/author/novels"
        className="text-sm text-muted hover:text-white flex items-center gap-1 mb-5"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Kelola Novel
      </Link>

      <h1 className="text-2xl font-bold text-white">
        Edit Novel
      </h1>

      <p className="text-sm text-muted mt-1 mb-6">
        Ubah informasi novel kamu.
      </p>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 mb-5">
          <p className="text-sm text-red-400">
            {error}
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="card p-5 space-y-5"
      >

        {/* COVER */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Cover Novel
          </label>

          <div className="mt-3 flex flex-col sm:flex-row gap-4 items-start">

            <div className="relative w-28 h-40 rounded-xl overflow-hidden bg-black/20 flex-shrink-0">

              {coverPreview || coverUrl ? (
                <img
                  src={
                    coverPreview ||
                    coverUrl
                  }
                  alt="Cover novel"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-xs text-muted">
                  <ImagePlus className="h-6 w-6 mb-2" />
                  Belum ada cover
                </div>
              )}

              {coverPreview && (
                <button
                  type="button"
                  onClick={removeCover}
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg"
                  aria-label="Hapus cover baru"
                  disabled={saving}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div>
              <label
                htmlFor="cover"
                className="btn-secondary cursor-pointer inline-flex"
              >
                <ImagePlus className="h-4 w-4" />
                Ganti Cover
              </label>

              <input
                id="cover"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCoverChange}
                className="hidden"
                disabled={saving}
              />

              {coverFile && (
                <p className="text-xs text-primary-300 mt-2">
                  {coverFile.name}
                </p>
              )}

              <p className="text-xs text-muted mt-2">
                JPG, PNG, atau WEBP. Maksimal 5 MB.
              </p>
            </div>

          </div>
        </div>

        {/* JUDUL */}
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
            className="input w-full"
            maxLength={150}
            disabled={saving}
            required
          />
        </div>

        {/* AUTHOR */}
        <div>
          <label
            htmlFor="novel-author"
            className="block text-sm font-medium text-white mb-2"
          >
            Author
          </label>

          <input
            id="novel-author"
            type="text"
            value={author}
            onChange={(event) =>
              setAuthor(event.target.value)
            }
            className="input w-full"
            placeholder="Contoh: Mad Snail"
            maxLength={150}
            disabled={saving}
            required
          />

          <p className="text-xs text-muted mt-1">
            Masukkan nama penulis asli novel.
          </p>
        </div>

        {/* METADATA NOVEL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>
            <label
              htmlFor="novel-release-year"
              className="block text-sm font-medium text-white mb-2"
            >
              Tahun Rilis
            </label>

            <input
              id="novel-release-year"
              type="number"
              value={releaseYear}
              onChange={(event) =>
                setReleaseYear(event.target.value)
              }
              className="input w-full"
              placeholder="Contoh: 2014"
              min="1900"
              max="2100"
              disabled={saving}
            />
          </div>

          <div>
            <label
              htmlFor="novel-language"
              className="block text-sm font-medium text-white mb-2"
            >
              Bahasa
            </label>

            <input
              id="novel-language"
              type="text"
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value)
              }
              className="input w-full"
              placeholder="Contoh: Mandarin"
              maxLength={50}
              disabled={saving}
            />
          </div>

        </div>

        <div>
          <label
            htmlFor="novel-translator"
            className="block text-sm font-medium text-white mb-2"
          >
            Terjemahan
          </label>

          <input
            id="novel-translator"
            type="text"
            value={translator}
            onChange={(event) =>
              setTranslator(event.target.value)
            }
            className="input w-full"
            placeholder="Contoh: Bhylabatt"
            maxLength={100}
            disabled={saving}
          />
        </div>

        {/* SINOPSIS */}
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
              setDescription(
                event.target.value
              )
            }
            className="input w-full min-h-40 resize-y"
            maxLength={5000}
            disabled={saving}
            required
          />

          <p className="text-xs text-muted mt-1">
            {description.length}/5000 karakter
          </p>
        </div>

        {/* GENRE */}
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
                  selectedGenres.includes(
                    genre.id
                  );

                const disabled =
                  !selected &&
                  selectedGenres.length >= 6;

                return (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() =>
                      handleGenreToggle(
                        genre.id
                      )
                    }
                    disabled={
                      saving || disabled
                    }
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

        {/* STATUS */}
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

        {/* ACTION */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">

          <Link
            to="/author/novels"
            className="btn-ghost"
          >
            Batal
          </Link>

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
                Simpan Perubahan
              </>
            )}
          </button>

        </div>

      </form>
    </div>
  );
}