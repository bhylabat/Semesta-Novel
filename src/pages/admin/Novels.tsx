import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, X, Loader2 } from 'lucide-react';
import type { Novel, Genre, NovelStatus } from '@/types';
import {
  fetchNovels,
  fetchGenres,
  adminCreateNovel,
  adminUpdateNovel,
  adminDeleteNovel,
} from '@/lib/services';
import { slugify, formatViews, formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function Novels() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Novel | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    author: '',
    release_year: '',
    language: '',
    translator: '',
    description: '',
    cover_url: '',
    banner_url: '',
    status: 'ongoing' as NovelStatus,
    rating: 0,
    genreIds: [] as string[],
  });

  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [novelData, genreData] = await Promise.all([
        fetchNovels({ limit: 100 }),
        fetchGenres(),
      ]);

      setNovels(novelData.data);
      setGenres(genreData);
    } catch (error) {
      console.error('Failed to load novels:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditing(null);

    setForm({
      title: '',
      slug: '',
      author: '',
      release_year: '',
      language: '',
      translator: '',
      description: '',
      cover_url: '',
      banner_url: '',
      status: 'ongoing',
      rating: 0,
      genreIds: [],
    });

    setShowForm(true);
  };

  const openEdit = (novel: Novel) => {
    setEditing(novel);

    setForm({
      title: novel.title,
      slug: novel.slug,
      author: novel.author,
      release_year: novel.release_year?.toString() || '',
      language: novel.language || '',
      translator: novel.translator || '',
      description: novel.description,
      cover_url: novel.cover_url || '',
      banner_url: novel.banner_url || '',
      status: novel.status,
      rating: novel.rating,
      genreIds: novel.genres?.map((g) => g.id) || [],
    });

    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const slug = form.slug || slugify(form.title);

      const novelData = {
        title: form.title,
        slug,
        author: form.author,
        release_year: form.release_year
          ? parseInt(form.release_year, 10)
          : null,
        language: form.language,
        translator: form.translator,
        description: form.description,
        cover_url: form.cover_url || null,
        banner_url: form.banner_url || null,
        status: form.status,
        rating: form.rating,
      };

      if (editing) {
        await adminUpdateNovel(editing.id, novelData);

        if (form.genreIds.length > 0) {
          await supabase
            .from('novel_genres')
            .delete()
            .eq('novel_id', editing.id);

          await supabase
            .from('novel_genres')
            .insert(
              form.genreIds.map((gid) => ({
                novel_id: editing.id,
                genre_id: gid,
              }))
            );
        }
      } else {
        const created = await adminCreateNovel(novelData);

        if (created && form.genreIds.length > 0) {
          await supabase
            .from('novel_genres')
            .insert(
              form.genreIds.map((gid) => ({
                novel_id: created.id,
                genre_id: gid,
              }))
            );
        }
      }

      setShowForm(false);
      loadData();
    } catch (error) {
      console.error('Failed to save novel:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await adminDeleteNovel(id);
    setConfirmDelete(null);
    loadData();
  };

  const filtered = novels.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">
          Manajemen Novel
        </h1>

        <button onClick={openCreate} className="btn-primary">
          <Plus className="h-4 w-4" />
          Tambah Novel
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari novel..."
          className="input pl-9 w-full"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="skeleton h-16 w-full rounded-xl"
            />
          ))}
        </div>
      ) : (
        <div className="card divide-y divide-white/5">
          {filtered.map((novel) => (
            <div
              key={novel.id}
              className="flex items-center gap-3 p-4"
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white truncate">
                  {novel.title}
                </h3>

                <p className="text-xs text-muted">
                  {novel.author} · {formatViews(novel.views)} views ·{' '}
                  {formatDate(novel.created_at)}
                </p>
              </div>

              <span
                className={`badge ${
                  novel.status === 'ongoing'
                    ? 'bg-green-500/20 text-green-400'
                    : novel.status === 'completed'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                }`}
              >
                {novel.status}
              </span>

              <button
                onClick={() => openEdit(novel)}
                className="btn-ghost p-2"
              >
                <Edit className="h-4 w-4" />
              </button>

              <button
                onClick={() => setConfirmDelete(novel.id)}
                className="btn-ghost p-2 text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="card p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                {editing ? 'Edit Novel' : 'Tambah Novel'}
              </h2>

              <button
                onClick={() => setShowForm(false)}
                className="btn-ghost p-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Judul */}
              <div>
                <label className="text-sm text-white mb-1 block">
                  Judul
                </label>

                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      title: e.target.value,
                      slug: slugify(e.target.value),
                    });
                  }}
                  className="input w-full"
                  required
                />
              </div>

              {/* Slug */}
              <div>
                <label className="text-sm text-white mb-1 block">
                  Slug
                </label>

                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      slug: e.target.value,
                    })
                  }
                  className="input w-full"
                  required
                />
              </div>

              {/* Penulis */}
              <div>
                <label className="text-sm text-white mb-1 block">
                  Penulis
                </label>

                <input
                  type="text"
                  value={form.author}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      author: e.target.value,
                    })
                  }
                  className="input w-full"
                  required
                />
              </div>

              {/* Tahun + Bahasa */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-white mb-1 block">
                    Tahun Rilis
                  </label>

                  <input
                    type="number"
                    value={form.release_year}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        release_year: e.target.value,
                      })
                    }
                    className="input w-full"
                    placeholder="Contoh: 2014"
                  />
                </div>

                <div>
                  <label className="text-sm text-white mb-1 block">
                    Bahasa
                  </label>

                  <input
                    type="text"
                    value={form.language}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        language: e.target.value,
                      })
                    }
                    className="input w-full"
                    placeholder="Contoh: Mandarin"
                  />
                </div>
              </div>

              {/* Terjemahan */}
              <div>
                <label className="text-sm text-white mb-1 block">
                  Terjemahan
                </label>

                <input
                  type="text"
                  value={form.translator}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      translator: e.target.value,
                    })
                  }
                  className="input w-full"
                  placeholder="Contoh: Bhylabatt"
                />
              </div>

              {/* Cover + Banner URL */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-white mb-1 block">
                    Cover URL
                  </label>

                  <input
                    type="url"
                    value={form.cover_url}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        cover_url: e.target.value,
                      })
                    }
                    className="input w-full"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="text-sm text-white mb-1 block">
                    Banner URL
                  </label>

                  <input
                    type="url"
                    value={form.banner_url}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        banner_url: e.target.value,
                      })
                    }
                    className="input w-full"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="text-sm text-white mb-1 block">
                  Deskripsi
                </label>

                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value,
                    })
                  }
                  className="input w-full min-h-[100px]"
                  required
                />
              </div>

              {/* Status + Rating */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-white mb-1 block">
                    Status
                  </label>

                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as NovelStatus,
                      })
                    }
                    className="input w-full"
                  >
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="hiatus">Hiatus</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-white mb-1 block">
                    Rating
                  </label>

                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={form.rating}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        rating: parseFloat(e.target.value),
                      })
                    }
                    className="input w-full"
                  />
                </div>
              </div>

              {/* Genre */}
              <div>
                <label className="text-sm text-white mb-1 block">
                  Genre
                </label>

                <div className="flex flex-wrap gap-2">
                  {genres.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        const ids = form.genreIds.includes(g.id)
                          ? form.genreIds.filter(
                              (id) => id !== g.id
                            )
                          : [...form.genreIds, g.id];

                        setForm({
                          ...form,
                          genreIds: ids,
                        });
                      }}
                      className={`badge ${
                        form.genreIds.includes(g.id)
                          ? 'bg-primary text-white'
                          : 'bg-white/5 text-muted'
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simpan */}
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Simpan'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="card p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-2">
              Hapus novel ini?
            </h3>

            <p className="text-sm text-muted mb-6">
              Semua bab terkait juga akan dihapus. Tindakan ini tidak
              dapat dibatalkan.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-secondary flex-1"
              >
                Batal
              </button>

              <button
                onClick={() => handleDelete(confirmDelete)}
                className="btn flex-1 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 text-sm"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}