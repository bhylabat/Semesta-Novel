import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Loader2,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Eye,
} from 'lucide-react';

import type { Novel, Genre, NovelStatus, Chapter } from '@/types';

import {
  fetchNovels,
  fetchGenres,
  fetchChapters,
  fetchLatestChapters,
  adminCreateNovel,
  adminUpdateNovel,
  adminDeleteNovel,
  adminCreateChapter,
  adminUpdateChapter,
  adminDeleteChapter,
} from '@/lib/services';

import {
  slugify,
  formatViews,
  formatDate,
} from '@/lib/utils';

import { supabase } from '@/lib/supabase';

export default function Novels() {
  /* =========================================================
     NOVEL
  ========================================================= */

  const [novels, setNovels] = useState<Novel[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');

  const [showNovelForm, setShowNovelForm] = useState(false);
  const [editingNovel, setEditingNovel] =
    useState<Novel | null>(null);

  const [confirmDeleteNovel, setConfirmDeleteNovel] =
    useState<string | null>(null);

  /* =========================================================
     CHAPTER
  ========================================================= */

  const [selectedNovel, setSelectedNovel] =
    useState<string | null>(null);

  const [chapters, setChapters] = useState<Chapter[]>([]);

  const [chapterLoading, setChapterLoading] =
    useState(false);

  const [chapterSearch, setChapterSearch] =
    useState('');

  const [showChapterForm, setShowChapterForm] =
    useState(false);

  const [editingChapter, setEditingChapter] =
    useState<Chapter | null>(null);

  const [confirmDeleteChapter, setConfirmDeleteChapter] =
    useState<string | null>(null);

  const [chapterSaving, setChapterSaving] =
    useState(false);

  /* =========================================================
     FORM NOVEL
  ========================================================= */

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

  /* =========================================================
     FORM CHAPTER
  ========================================================= */

  const [chapterForm, setChapterForm] = useState({
    novel_id: '',
    chapter_number: 1,
    title: '',
    content: '',
  });

  /* =========================================================
     LOAD NOVEL + GENRE
  ========================================================= */

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [novelData, genreData] =
        await Promise.all([
          fetchNovels({
            limit: 100,
            sort: 'az',
          }),
          fetchGenres(),
        ]);

      setNovels(novelData.data);
      setGenres(genreData);
    } catch (error) {
      console.error(
        'Failed to load novels:',
        error
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /* =========================================================
     LOAD CHAPTER
     HANYA 50 BAB
  ========================================================= */

  const loadChapters = useCallback(
    async (novelId: string) => {
      setChapterLoading(true);

      try {
        const result = await fetchChapters(
          novelId,
          {
            limit: 50,
            order: 'desc',
          }
        );

        setChapters(result.data);
      } catch (error) {
        console.error(
          'Failed to load chapters:',
          error
        );

        setChapters([]);
      } finally {
        setChapterLoading(false);
      }
    },
    []
  );

  /* =========================================================
     PILIH NOVEL
  ========================================================= */

  const handleSelectNovel = (
    novelId: string
  ) => {
    if (selectedNovel === novelId) {
      setSelectedNovel(null);
      setChapters([]);
      setChapterSearch('');
      return;
    }

    setSelectedNovel(novelId);
    setChapterSearch('');

    void loadChapters(novelId);
  };

  /* =========================================================
     CREATE NOVEL
  ========================================================= */

  const openCreateNovel = () => {
    setEditingNovel(null);

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

    setShowNovelForm(true);
  };

  /* =========================================================
     EDIT NOVEL
  ========================================================= */

  const openEditNovel = (
    novel: Novel
  ) => {
    setEditingNovel(novel);

    setForm({
      title: novel.title,
      slug: novel.slug,
      author: novel.author,
      release_year:
        novel.release_year?.toString() || '',
      language: novel.language || '',
      translator: novel.translator || '',
      description: novel.description,
      cover_url: novel.cover_url || '',
      banner_url: novel.banner_url || '',
      status: novel.status,
      rating: novel.rating,
      genreIds:
        novel.genres?.map(
          (genre) => genre.id
        ) || [],
    });

    setShowNovelForm(true);
  };

  /* =========================================================
     SAVE NOVEL
  ========================================================= */

  const handleNovelSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setSaving(true);

    try {
      const slug =
        form.slug ||
        slugify(form.title);

      const novelData = {
        title: form.title,
        slug,
        author: form.author,
        release_year: form.release_year
          ? parseInt(
              form.release_year,
              10
            )
          : null,
        language: form.language,
        translator: form.translator,
        description: form.description,
        cover_url:
          form.cover_url || null,
        banner_url:
          form.banner_url || null,
        status: form.status,
        rating: form.rating,
      };

      if (editingNovel) {
        await adminUpdateNovel(
          editingNovel.id,
          novelData
        );

        await supabase
          .from('novel_genres')
          .delete()
          .eq(
            'novel_id',
            editingNovel.id
          );

        if (
          form.genreIds.length > 0
        ) {
          await supabase
            .from('novel_genres')
            .insert(
              form.genreIds.map(
                (genreId) => ({
                  novel_id:
                    editingNovel.id,
                  genre_id: genreId,
                })
              )
            );
        }
      } else {
        const created =
          await adminCreateNovel(
            novelData
          );

        if (
          created &&
          form.genreIds.length > 0
        ) {
          await supabase
            .from('novel_genres')
            .insert(
              form.genreIds.map(
                (genreId) => ({
                  novel_id:
                    created.id,
                  genre_id: genreId,
                })
              )
            );
        }
      }

      setShowNovelForm(false);

      await loadData();
    } catch (error) {
      console.error(
        'Failed to save novel:',
        error
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     DELETE NOVEL
  ========================================================= */

  const handleDeleteNovel = async (
    id: string
  ) => {
    try {
      await adminDeleteNovel(id);

      if (selectedNovel === id) {
        setSelectedNovel(null);
        setChapters([]);
      }

      setConfirmDeleteNovel(null);

      await loadData();
    } catch (error) {
      console.error(
        'Failed to delete novel:',
        error
      );
    }
  };

  /* =========================================================
     CREATE CHAPTER
  ========================================================= */

  const openCreateChapter = async () => {
    if (!selectedNovel) return;

    const latest =
      await fetchLatestChapters(
        selectedNovel,
        1
      );

    const nextNumber =
      latest.length > 0
        ? latest[0].chapter_number + 1
        : 1;

    setEditingChapter(null);

    setChapterForm({
      novel_id: selectedNovel,
      chapter_number: nextNumber,
      title: '',
      content: '',
    });

    setShowChapterForm(true);
  };

  /* =========================================================
     EDIT CHAPTER
  ========================================================= */

  const openEditChapter = (
    chapter: Chapter
  ) => {
    setEditingChapter(chapter);

    setChapterForm({
      novel_id: chapter.novel_id,
      chapter_number:
        chapter.chapter_number,
      title: chapter.title,
      content: chapter.content,
    });

    setShowChapterForm(true);
  };

  /* =========================================================
     SAVE CHAPTER
  ========================================================= */

  const handleChapterSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setChapterSaving(true);

    try {
      if (editingChapter) {
        await adminUpdateChapter(
          editingChapter.id,
          {
            chapter_number:
              chapterForm.chapter_number,
            title:
              chapterForm.title,
            content:
              chapterForm.content,
          }
        );
      } else {
        await adminCreateChapter({
          novel_id:
            chapterForm.novel_id,
          chapter_number:
            chapterForm.chapter_number,
          title:
            chapterForm.title,
          content:
            chapterForm.content,
        });
      }

      setShowChapterForm(false);

      if (selectedNovel) {
        await loadChapters(
          selectedNovel
        );
      }
    } catch (error) {
      console.error(
        'Failed to save chapter:',
        error
      );
    } finally {
      setChapterSaving(false);
    }
  };

  /* =========================================================
     DELETE CHAPTER
  ========================================================= */

  const handleDeleteChapter = async (
    id: string
  ) => {
    try {
      await adminDeleteChapter(id);

      setConfirmDeleteChapter(null);

      if (selectedNovel) {
        await loadChapters(
          selectedNovel
        );
      }
    } catch (error) {
      console.error(
        'Failed to delete chapter:',
        error
      );
    }
  };

  /* =========================================================
     FILTER NOVEL
  ========================================================= */

  const filteredNovels =
    novels.filter((novel) =>
      novel.title
        .toLowerCase()
        .includes(
          search.toLowerCase()
        )
    );

  /* =========================================================
     FILTER CHAPTER
  ========================================================= */

  const filteredChapters =
    chapters.filter((chapter) => {
      const value =
        chapterSearch
          .toLowerCase()
          .trim();

      if (!value) return true;

      return (
        chapter.title
          .toLowerCase()
          .includes(value) ||
        String(
          chapter.chapter_number
        ).includes(value)
      );
    });

  /* =========================================================
     SELECTED NOVEL INFO
  ========================================================= */

  const selectedNovelData =
    novels.find(
      (novel) =>
        novel.id === selectedNovel
    );

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div>
      {/* HEADER */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Manajemen Novel
          </h1>

          <p className="text-sm text-muted mt-1">
            Kelola novel dan bab dari satu halaman.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateNovel}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" />
          Tambah Novel
        </button>
      </div>

      {/* SEARCH NOVEL */}

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />

        <input
          type="text"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Cari novel..."
          className="input pl-9 w-full"
        />
      </div>

      {/* NOVEL LIST */}

      {loading ? (
        <div className="space-y-2">
          {Array.from({
            length: 5,
          }).map((_, index) => (
            <div
              key={index}
              className="skeleton h-16 w-full rounded-xl"
            />
          ))}
        </div>
      ) : filteredNovels.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen className="h-10 w-10 text-muted/50 mx-auto mb-3" />

          <p className="text-sm text-muted">
            {search
              ? 'Novel tidak ditemukan.'
              : 'Belum ada novel.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNovels.map(
            (novel) => {
              const isSelected =
                selectedNovel ===
                novel.id;

              return (
                <div
                  key={novel.id}
                  className="card overflow-hidden"
                >
                  {/* NOVEL ROW */}

                  <div
                    className={`flex items-center gap-3 p-4 transition-colors ${
                      isSelected
                        ? 'bg-white/[0.04]'
                        : ''
                    }`}
                  >
                    {/* TOGGLE */}

                    <button
                      type="button"
                      onClick={() =>
                        handleSelectNovel(
                          novel.id
                        )
                      }
                      className="h-9 w-9 flex-shrink-0 rounded-lg flex items-center justify-center text-muted hover:text-white hover:bg-white/5 transition-colors"
                      title={
                        isSelected
                          ? 'Tutup bab'
                          : 'Lihat bab'
                      }
                    >
                      {isSelected ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>

                    {/* ICON */}

                    <div className="h-11 w-11 flex-shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary-400" />
                    </div>

                    {/* INFO */}

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white truncate">
                        {novel.title}
                      </h3>

                      <p className="text-xs text-muted truncate">
                        {novel.author} ·{' '}
                        {formatViews(
                          novel.views
                        )}{' '}
                        views ·{' '}
                        {formatDate(
                          novel.created_at
                        )}
                      </p>
                    </div>

                    {/* STATUS */}

                    <span
                      className={`badge hidden sm:inline-flex ${
                        novel.status ===
                        'ongoing'
                          ? 'bg-green-500/20 text-green-400'
                          : novel.status ===
                              'completed'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {novel.status}
                    </span>

                    {/* EDIT */}

                    <button
                      type="button"
                      onClick={() =>
                        openEditNovel(
                          novel
                        )
                      }
                      className="btn-ghost p-2 flex-shrink-0"
                      title="Edit Novel"
                    >
                      <Edit className="h-4 w-4" />
                    </button>

                    {/* DELETE */}

                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDeleteNovel(
                          novel.id
                        )
                      }
                      className="btn-ghost p-2 text-red-400 flex-shrink-0"
                      title="Hapus Novel"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* CHAPTER PANEL */}

                  {isSelected && (
                    <div className="border-t border-white/5 bg-black/10">
                      <div className="p-4">
                        {/* CHAPTER HEADER */}

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary-400" />

                              <h3 className="text-sm font-semibold text-white">
                                Manajemen Bab
                              </h3>
                            </div>

                            <p className="text-xs text-muted mt-1">
                              Menampilkan maksimal 50 bab terbaru.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={
                              openCreateChapter
                            }
                            className="btn-primary text-sm"
                          >
                            <Plus className="h-4 w-4" />
                            Tambah Bab
                          </button>
                        </div>

                        {/* CHAPTER SEARCH */}

                        <div className="relative mb-4">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />

                          <input
                            type="text"
                            value={
                              chapterSearch
                            }
                            onChange={(
                              e
                            ) =>
                              setChapterSearch(
                                e.target
                                  .value
                              )
                            }
                            placeholder="Cari bab..."
                            className="input pl-9 w-full"
                          />
                        </div>

                        {/* CHAPTER LOADING */}

                        {chapterLoading ? (
                          <div className="space-y-2">
                            {Array.from(
                              {
                                length: 5,
                              }
                            ).map(
                              (
                                _,
                                index
                              ) => (
                                <div
                                  key={
                                    index
                                  }
                                  className="skeleton h-14 w-full rounded-xl"
                                />
                              )
                            )}
                          </div>
                        ) : filteredChapters.length ===
                          0 ? (
                          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
                            <FileText className="h-8 w-8 text-muted/50 mx-auto mb-2" />

                            <p className="text-sm text-muted">
                              {chapterSearch
                                ? 'Bab tidak ditemukan.'
                                : 'Belum ada bab.'}
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5">
                            {filteredChapters.map(
                              (
                                chapter
                              ) => (
                                <div
                                  key={
                                    chapter.id
                                  }
                                  className="flex items-center gap-3 p-3 hover:bg-white/[0.03] transition-colors"
                                >
                                  {/* NUMBER */}

                                  <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <span className="text-xs font-bold text-primary-300">
                                      {
                                        chapter.chapter_number
                                      }
                                    </span>
                                  </div>

                                  {/* INFO */}

                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-white truncate">
                                      Bab{' '}
                                      {
                                        chapter.chapter_number
                                      }
                                      :{' '}
                                      {
                                        chapter.title
                                      }
                                    </h4>

                                    <div className="flex items-center gap-3 mt-1">
                                      <span className="text-[11px] text-muted flex items-center gap-1">
                                        <Eye className="h-3 w-3" />
                                        {formatViews(
                                          chapter.views ||
                                            0
                                        )}
                                      </span>

                                      <span className="text-[11px] text-muted">
                                        {formatDate(
                                          chapter.created_at
                                        )}
                                      </span>
                                    </div>
                                  </div>

                                  {/* EDIT */}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditChapter(
                                        chapter
                                      )
                                    }
                                    className="btn-ghost p-2 flex-shrink-0"
                                    title="Edit Bab"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>

                                  {/* DELETE */}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setConfirmDeleteChapter(
                                        chapter.id
                                      )
                                    }
                                    className="btn-ghost p-2 text-red-400 flex-shrink-0"
                                    title="Hapus Bab"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}

      {/* =====================================================
          FORM NOVEL
      ===================================================== */}

      {showNovelForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() =>
            setShowNovelForm(false)
          }
        >
          <div
            className="card p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                {editingNovel
                  ? 'Edit Novel'
                  : 'Tambah Novel'}
              </h2>

              <button
                type="button"
                onClick={() =>
                  setShowNovelForm(false)
                }
                className="btn-ghost p-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={
                handleNovelSubmit
              }
              className="space-y-4"
            >
              {/* JUDUL */}

              <div>
                <label className="text-sm text-white mb-1 block">
                  Judul
                </label>

                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      title: e.target
                        .value,
                      slug: slugify(
                        e.target.value
                      ),
                    })
                  }
                  className="input w-full"
                  required
                />
              </div>

              {/* SLUG */}

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
                      slug: e.target
                        .value,
                    })
                  }
                  className="input w-full"
                  required
                />
              </div>

              {/* PENULIS */}

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
                      author:
                        e.target.value,
                    })
                  }
                  className="input w-full"
                  required
                />
              </div>

              {/* TAHUN + BAHASA */}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-white mb-1 block">
                    Tahun Rilis
                  </label>

                  <input
                    type="number"
                    value={
                      form.release_year
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        release_year:
                          e.target
                            .value,
                      })
                    }
                    className="input w-full"
                    placeholder="2014"
                  />
                </div>

                <div>
                  <label className="text-sm text-white mb-1 block">
                    Bahasa
                  </label>

                  <input
                    type="text"
                    value={
                      form.language
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        language:
                          e.target.value,
                      })
                    }
                    className="input w-full"
                    placeholder="Mandarin"
                  />
                </div>
              </div>

              {/* TERJEMAHAN */}

              <div>
                <label className="text-sm text-white mb-1 block">
                  Terjemahan
                </label>

                <input
                  type="text"
                  value={
                    form.translator
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      translator:
                        e.target.value,
                    })
                  }
                  className="input w-full"
                  placeholder="Bhylabatt"
                />
              </div>

              {/* COVER + BANNER */}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-white mb-1 block">
                    Cover URL
                  </label>

                  <input
                    type="url"
                    value={
                      form.cover_url
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        cover_url:
                          e.target.value,
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
                    value={
                      form.banner_url
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        banner_url:
                          e.target.value,
                      })
                    }
                    className="input w-full"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* DESKRIPSI */}

              <div>
                <label className="text-sm text-white mb-1 block">
                  Deskripsi
                </label>

                <textarea
                  value={
                    form.description
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description:
                        e.target.value,
                    })
                  }
                  className="input w-full min-h-[100px]"
                  required
                />
              </div>

              {/* STATUS + RATING */}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-white mb-1 block">
                    Status
                  </label>

                  <select
                    value={
                      form.status
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status:
                          e.target
                            .value as NovelStatus,
                      })
                    }
                    className="input w-full"
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

                <div>
                  <label className="text-sm text-white mb-1 block">
                    Rating
                  </label>

                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={
                      form.rating
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        rating:
                          parseFloat(
                            e.target
                              .value
                          ),
                      })
                    }
                    className="input w-full"
                  />
                </div>
              </div>

              {/* GENRE */}

              <div>
                <label className="text-sm text-white mb-1 block">
                  Genre
                </label>

                <div className="flex flex-wrap gap-2">
                  {genres.map(
                    (genre) => (
                      <button
                        key={
                          genre.id
                        }
                        type="button"
                        onClick={() => {
                          const ids =
                            form.genreIds.includes(
                              genre.id
                            )
                              ? form.genreIds.filter(
                                  (
                                    id
                                  ) =>
                                    id !==
                                    genre.id
                                )
                              : [
                                  ...form.genreIds,
                                  genre.id,
                                ];

                          setForm({
                            ...form,
                            genreIds:
                              ids,
                          });
                        }}
                        className={`badge ${
                          form.genreIds.includes(
                            genre.id
                          )
                            ? 'bg-primary text-white'
                            : 'bg-white/5 text-muted'
                        }`}
                      >
                        {
                          genre.name
                        }
                      </button>
                    )
                  )}
                </div>
              </div>

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

      {/* =====================================================
          FORM CHAPTER
      ===================================================== */}

      {showChapterForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() =>
            setShowChapterForm(
              false
            )
          }
        >
          <div
            className="card p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editingChapter
                    ? 'Edit Bab'
                    : 'Tambah Bab'}
                </h2>

                <p className="text-xs text-muted mt-1">
                  {selectedNovelData?.title ||
                    'Novel'}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowChapterForm(
                    false
                  )
                }
                className="btn-ghost p-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={
                handleChapterSubmit
              }
              className="space-y-4"
            >
              {/* NOMOR BAB */}

              <div>
                <label className="text-sm text-white mb-1 block">
                  Nomor Bab
                </label>

                <input
                  type="number"
                  min="1"
                  value={
                    chapterForm.chapter_number
                  }
                  onChange={(e) =>
                    setChapterForm({
                      ...chapterForm,
                      chapter_number:
                        parseInt(
                          e.target
                            .value,
                          10
                        ),
                    })
                  }
                  className="input w-full"
                  required
                />
              </div>

              {/* JUDUL BAB */}

              <div>
                <label className="text-sm text-white mb-1 block">
                  Judul Bab
                </label>

                <input
                  type="text"
                  value={
                    chapterForm.title
                  }
                  onChange={(e) =>
                    setChapterForm({
                      ...chapterForm,
                      title:
                        e.target.value,
                    })
                  }
                  className="input w-full"
                  required
                />
              </div>

              {/* ISI BAB */}

              <div>
                <label className="text-sm text-white mb-1 block">
                  Isi Bab
                </label>

                <textarea
                  value={
                    chapterForm.content
                  }
                  onChange={(e) =>
                    setChapterForm({
                      ...chapterForm,
                      content:
                        e.target.value,
                    })
                  }
                  className="input w-full min-h-[400px] font-serif"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={
                  chapterSaving
                }
                className="btn-primary w-full"
              >
                {chapterSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Simpan Bab'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          DELETE NOVEL
      ===================================================== */}

      {confirmDeleteNovel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() =>
            setConfirmDeleteNovel(
              null
            )
          }
        >
          <div
            className="card p-6 max-w-sm w-full"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <h3 className="text-lg font-semibold text-white mb-2">
              Hapus novel ini?
            </h3>

            <p className="text-sm text-muted mb-6">
              Semua bab terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setConfirmDeleteNovel(
                    null
                  )
                }
                className="btn-secondary flex-1"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleDeleteNovel(
                    confirmDeleteNovel
                  )
                }
                className="btn flex-1 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 text-sm"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          DELETE CHAPTER
      ===================================================== */}

      {confirmDeleteChapter && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() =>
            setConfirmDeleteChapter(
              null
            )
          }
        >
          <div
            className="card p-6 max-w-sm w-full"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <h3 className="text-lg font-semibold text-white mb-2">
              Hapus bab ini?
            </h3>

            <p className="text-sm text-muted mb-6">
              Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setConfirmDeleteChapter(
                    null
                  )
                }
                className="btn-secondary flex-1"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleDeleteChapter(
                    confirmDeleteChapter
                  )
                }
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