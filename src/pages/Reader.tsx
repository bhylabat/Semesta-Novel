import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlignLeft,
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Coffee,
  List,
  Loader2,
  Minus,
  Moon,
  Plus,
  Settings,
  Sun,
  Type,
  X,
} from 'lucide-react';

import type { Chapter, Novel } from '@/types';
import {
  fetchChapterByNumber,
  fetchChapters,
  fetchNovelBySlug,
  recordChapterView,
  updateReadingHistory,
} from '@/lib/services';
import {
  getReaderSettings,
  saveReaderSettings,
  updateGuestHistory,
  type StoredReaderSettings,
} from '@/lib/guest';
import { useAuth } from '@/lib/auth-context';
import ErrorState from '@/components/ErrorState';
import CommentSection from '@/components/CommentSection';

const themes = [
  {
    value: 'dark',
    label: 'Gelap',
    icon: Moon,
    className: 'reader-dark',
  },
  {
    value: 'black',
    label: 'Hitam',
    icon: Moon,
    className: 'reader-black',
  },
  {
    value: 'sepia',
    label: 'Sepia',
    icon: Coffee,
    className: 'reader-sepia',
  },
  {
    value: 'light',
    label: 'Terang',
    icon: Sun,
    className: 'reader-light',
  },
] as const;

export default function Reader() {
  const { novelSlug, chapterNumber } = useParams<{
    novelSlug: string;
    chapterNumber: string;
  }>();

  const navigate = useNavigate();
  const { user } = useAuth();

  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [totalChapters, setTotalChapters] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [showSettings, setShowSettings] = useState(false);

  const [settings, setSettings] =
    useState<StoredReaderSettings>(() =>
      getReaderSettings()
    );

  const [progress, setProgress] = useState(0);

  const contentRef = useRef<HTMLDivElement>(null);

  /*
   * Menandai apakah riwayat baca untuk bab ini
   * sudah dicatat pada sesi pembacaan ini.
   */
  const historySaved = useRef(false);

  /*
   * ============================================================
   * LOAD NOVEL & CHAPTER
   * ============================================================
   */
  const loadData = useCallback(async () => {
    if (!novelSlug || !chapterNumber) {
      setError(true);
      setLoading(false);
      return;
    }

    const parsedChapterNumber = Number(chapterNumber);

    if (
      !Number.isInteger(parsedChapterNumber) ||
      parsedChapterNumber < 1
    ) {
      setError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);
    setProgress(0);
    historySaved.current = false;

    try {
      /*
       * Ambil novel berdasarkan slug.
       */
      const novelData = await fetchNovelBySlug(novelSlug);

      if (!novelData) {
        setNovel(null);
        setChapter(null);
        setError(true);
        return;
      }

      setNovel(novelData);

      /*
       * Ambil jumlah seluruh bab.
       */
      const { total } = await fetchChapters(novelData.id, {
        limit: 1,
        offset: 0,
      });

      setTotalChapters(total);

      /*
       * Ambil bab berdasarkan nomor.
       */
      const chapterData = await fetchChapterByNumber(
        novelData.id,
        parsedChapterNumber
      );

      if (!chapterData) {
        setChapter(null);
        setError(true);
        return;
      }

      setChapter(chapterData);

      /*
       * Kembali ke posisi paling atas setiap kali
       * berpindah bab.
       */
      window.scrollTo({
        top: 0,
        behavior: 'auto',
      });
    } catch (err) {
      console.error('Failed to load reader:', err);

      setNovel(null);
      setChapter(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [novelSlug, chapterNumber]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!chapter) {
      return;
    }

    void recordChapterView(chapter.id).catch((err) => {
      console.error('Failed to record chapter view:', err);
    });
  }, [chapter]);

  /*
   * ============================================================
   * TRACK READING PROGRESS
   * ============================================================
   *
   * Progress hanya digunakan untuk menyimpan riwayat baca.
   *
   * Riwayat dicatat setelah pembaca melewati 5% isi halaman.
   */
  useEffect(() => {
    if (!novel || !chapter) {
      return;
    }

    const handleScroll = () => {
      const scrollTop = window.scrollY;

      const documentHeight =
        document.documentElement.scrollHeight -
        window.innerHeight;

      if (documentHeight <= 0) {
        return;
      }

      const percentage = Math.min(
        100,
        Math.max(
          0,
          (scrollTop / documentHeight) * 100
        )
      );

      setProgress(percentage);

      /*
       * Simpan riwayat sekali ketika pembaca mulai membaca.
       */
      if (
        !historySaved.current &&
        percentage >= 5
      ) {
        historySaved.current = true;

        if (user) {
          void updateReadingHistory(
            user.id,
            novel.id,
            chapter.id,
            percentage
          ).catch((err) => {
            console.error(
              'Failed to update reading history:',
              err
            );
          });
        } else {
          updateGuestHistory(
            novel.id,
            chapter.id,
            chapter.chapter_number,
            percentage
          );
        }
      }
    };

    window.addEventListener(
      'scroll',
      handleScroll,
      { passive: true }
    );

    /*
     * Jalankan sekali setelah halaman selesai dimuat.
     */
    handleScroll();

    return () => {
      window.removeEventListener(
        'scroll',
        handleScroll
      );
    };
  }, [novel, chapter, user]);

  /*
   * ============================================================
   * READER SETTINGS
   * ============================================================
   */
  const updateSettings = (
    partial: Partial<StoredReaderSettings>
  ) => {
    const nextSettings = {
      ...settings,
      ...partial,
    };

    setSettings(nextSettings);
    saveReaderSettings(nextSettings);
  };

  /*
   * ============================================================
   * CHAPTER NAVIGATION
   * ============================================================
   */
  const currentChapterNumber = Number(
    chapter?.chapter_number || chapterNumber || 1
  );

  const hasPrevious =
    currentChapterNumber > 1;

  const hasNext =
    totalChapters > 0 &&
    currentChapterNumber < totalChapters;

  const goToPreviousChapter = () => {
    if (!hasPrevious || !novel) {
      return;
    }

    navigate(
      `/read/${novel.slug}/${currentChapterNumber - 1}`
    );
  };

  const goToNextChapter = () => {
    if (!hasNext || !novel) {
      return;
    }

    navigate(
      `/read/${novel.slug}/${currentChapterNumber + 1}`
    );
  };

  /*
   * ============================================================
   * THEME
   * ============================================================
   */
  const currentTheme =
    themes.find(
      (theme) => theme.value === settings.theme
    ) || themes[0];

  const themeClass = currentTheme.className;

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */
  if (loading) {
    return (
      <div
        className={`min-h-screen ${themeClass} flex items-center justify-center`}
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
      </div>
    );
  }

  /*
   * ============================================================
   * ERROR
   * ============================================================
   */
  if (error || !novel || !chapter) {
    return (
      <div
        className={`min-h-screen ${themeClass} p-4`}
      >
        <ErrorState onRetry={loadData} />
      </div>
    );
  }

  /*
   * ============================================================
   * CONTENT
   * ============================================================
   */
  const paragraphs = chapter.content
    .split(/\r?\n/)
    .filter((paragraph) => paragraph.trim().length > 0);

  return (
    <div
      className={`min-h-screen ${themeClass} transition-colors duration-300`}
    >
      {/* ======================================================
          READER HEADER
      ======================================================= */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-inherit border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(`/novel/${novel.slug}`)
            }
            className="flex items-center gap-2 text-sm hover:opacity-70 transition-opacity min-w-0"
            aria-label="Kembali ke novel"
          >
            <ArrowLeft className="h-5 w-5 flex-shrink-0" />

            <span className="truncate">
              {novel.title}
            </span>
          </button>

          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs opacity-60 hidden sm:inline">
              Bab {chapter.chapter_number}
            </span>

            <button
              type="button"
              onClick={() =>
                setShowSettings(
                  (current) => !current
                )
              }
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Pengaturan reader"
              aria-expanded={showSettings}
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-white/10">
          <div
            className="h-full bg-primary transition-all duration-150"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </header>

      {/* ======================================================
          SETTINGS PANEL
      ======================================================= */}
      {showSettings && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center sm:justify-center bg-black/50 backdrop-blur-sm"
          onClick={() =>
            setShowSettings(false)
          }
        >
          <div
            className="bg-bg-surface rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                Pengaturan Reader
              </h2>

              <button
                type="button"
                onClick={() =>
                  setShowSettings(false)
                }
                className="btn-ghost p-2"
                aria-label="Tutup pengaturan"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Font Size */}
            <div className="mb-6">
              <label className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Type className="h-4 w-4" />
                Ukuran Teks
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    updateSettings({
                      fontSize: Math.max(
                        14,
                        settings.fontSize - 2
                      ),
                    })
                  }
                  className="btn-secondary p-2"
                  aria-label="Perkecil teks"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <span className="flex-1 text-center text-sm text-white">
                  {settings.fontSize}px
                </span>

                <button
                  type="button"
                  onClick={() =>
                    updateSettings({
                      fontSize: Math.min(
                        28,
                        settings.fontSize + 2
                      ),
                    })
                  }
                  className="btn-secondary p-2"
                  aria-label="Perbesar teks"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Line Height */}
            <div className="mb-6">
              <label className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <AlignLeft className="h-4 w-4" />
                Jarak Baris
              </label>

              <div className="flex gap-2">
                {[1.5, 1.7, 1.8, 2.0, 2.2].map(
                  (lineHeight) => (
                    <button
                      type="button"
                      key={lineHeight}
                      onClick={() =>
                        updateSettings({
                          lineHeight,
                        })
                      }
                      className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                        settings.lineHeight ===
                        lineHeight
                          ? 'bg-primary text-white'
                          : 'bg-white/5 text-muted hover:bg-white/10'
                      }`}
                    >
                      {lineHeight}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Font Family */}
            <div className="mb-6">
              <label className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Jenis Font
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateSettings({
                      fontFamily: 'sans',
                    })
                  }
                  className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                    settings.fontFamily === 'sans'
                      ? 'bg-primary text-white'
                      : 'bg-white/5 text-muted hover:bg-white/10'
                  }`}
                >
                  Sans
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateSettings({
                      fontFamily: 'serif',
                    })
                  }
                  className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                    settings.fontFamily === 'serif'
                      ? 'bg-primary text-white'
                      : 'bg-white/5 text-muted hover:bg-white/10'
                  }`}
                >
                  Serif
                </button>
              </div>
            </div>

            {/* Theme */}
            <div>
              <label className="text-sm font-medium text-white mb-3 block">
                Tema
              </label>

              <div className="grid grid-cols-4 gap-2">
                {themes.map((theme) => {
                  const Icon = theme.icon;

                  return (
                    <button
                      type="button"
                      key={theme.value}
                      onClick={() =>
                        updateSettings({
                          theme: theme.value,
                        })
                      }
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                        settings.theme ===
                        theme.value
                          ? 'border-primary'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div
                        className={`w-full h-12 rounded-lg ${theme.className} flex items-center justify-center`}
                      >
                        <Icon className="h-5 w-5 opacity-70" />
                      </div>

                      <span className="text-xs text-white">
                        {theme.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          READER CONTENT
      ======================================================= */}
      <main
        ref={contentRef}
        className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12"
      >
        {/* Chapter Header */}
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-wider opacity-50 mb-2">
            {novel.title}
          </p>

          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Bab {chapter.chapter_number}
          </h1>

          <h2 className="text-lg md:text-xl opacity-80">
            {chapter.title || 'Tanpa Judul'}
          </h2>
        </div>

        {/* Chapter Content */}
        <article
          className="reader-content"
          style={{
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight,
            fontFamily:
              settings.fontFamily === 'serif'
                ? 'Lora, Georgia, serif'
                : 'Inter, sans-serif',
          }}
        >
          {paragraphs.map((paragraph, index) => (
            <p
              key={`${chapter.id}-${index}`}
              className="mb-4 text-justify"
            >
              {paragraph}
            </p>
          ))}
        </article>

        {/* ====================================================
            BOTTOM NAVIGATION
        ===================================================== */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex items-center justify-between gap-3">
            {/* Previous */}
            <button
              type="button"
              onClick={goToPreviousChapter}
              disabled={!hasPrevious}
              className="btn-secondary flex-1 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />

              <span className="hidden sm:inline">
                Bab Sebelumnya
              </span>

              <span className="sm:hidden">
                Sebelumnya
              </span>
            </button>

            {/* Chapter List */}
            <Link
              to={`/novel/${novel.slug}/chapters`}
              className="btn-secondary px-4"
              aria-label="Daftar bab"
              title="Daftar Bab"
            >
              <List className="h-4 w-4" />
            </Link>

            {/* Next */}
            <button
              type="button"
              onClick={goToNextChapter}
              disabled={!hasNext}
              className="btn-primary flex-1 disabled:opacity-30"
            >
              <span className="hidden sm:inline">
                Bab Berikutnya
              </span>

              <span className="sm:hidden">
                Berikutnya
              </span>

              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {!hasNext && (
            <p className="text-center text-sm opacity-50 mt-6">
              Kamu telah mencapai akhir dari novel ini.
            </p>
          )}
        </div>

        {/* ====================================================
            KOMENTAR BAB
        ===================================================== */}
        <div className="reader-content mt-8">
          <CommentSection
            novelId={novel.id}
            chapterId={chapter.id}
            title={`Komentar Bab ${chapter.chapter_number}`}
            placeholder="Tulis komentar tentang Bab ini..."
            emptyTitle="Belum ada komentar di Bab ini."
            emptyMessage="Jadilah yang pertama berkomentar."
          />
        </div>
      </main>
    </div>
  );
}