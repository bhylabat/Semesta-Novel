import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Settings, ChevronLeft, ChevronRight,
  List, X, Type, AlignLeft, Moon, Sun, BookOpen, Minus, Plus,
  Coffee, Loader2
} from 'lucide-react';
import type { Novel, Chapter } from '@/types';
import { fetchNovelBySlug, fetchChapterByNumber, fetchChapters, updateReadingHistory } from '@/lib/services';
import { getReaderSettings, saveReaderSettings, type StoredReaderSettings, updateGuestHistory } from '@/lib/guest';
import { useAuth } from '@/lib/auth';
import ErrorState from '@/components/ErrorState';
import CommentSection from '@/components/CommentSection';

const themes = [
  { value: 'dark', label: 'Gelap', icon: Moon, className: 'reader-dark' },
  { value: 'black', label: 'Hitam', icon: Moon, className: 'reader-black' },
  { value: 'sepia', label: 'Sepia', icon: Coffee, className: 'reader-sepia' },
  { value: 'light', label: 'Terang', icon: Sun, className: 'reader-light' },
] as const;

export default function Reader() {
  const { novelSlug, chapterNumber } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [totalChapters, setTotalChapters] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<StoredReaderSettings>(getReaderSettings());
  const [progress, setProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const progressSaved = useRef(false);

  const loadData = useCallback(async () => {
    if (!novelSlug || !chapterNumber) return;
    setLoading(true);
    setError(false);
    progressSaved.current = false;
    try {
      const n = await fetchNovelBySlug(novelSlug);
      if (!n) {
        setError(true);
        return;
      }
      setNovel(n);

      const { total } = await fetchChapters(n.id, { limit: 1, offset: 0 });
      setTotalChapters(total);

      const ch = await fetchChapterByNumber(n.id, parseInt(chapterNumber));
      if (!ch) {
        setError(true);
        return;
      }
      setChapter(ch);
      window.scrollTo(0, 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [novelSlug, chapterNumber]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Track scroll progress and save
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const pct = Math.min(100, (scrollTop / docHeight) * 100);
        setProgress(pct);

        if (!progressSaved.current && pct > 5 && novel && chapter) {
          progressSaved.current = true;
          if (user) {
            updateReadingHistory(user.id, novel.id, chapter.id, pct);
          } else {
            updateGuestHistory(novel.id, chapter.id, chapter.chapter_number, pct);
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [novel, chapter, user]);

  const updateSettings = (partial: Partial<StoredReaderSettings>) => {
    const newSettings = { ...settings, ...partial };
    setSettings(newSettings);
    saveReaderSettings(newSettings);
  };

  const themeClass = themes.find((t) => t.value === settings.theme)?.className || 'reader-dark';
  const currentChapterNum = parseInt(chapterNumber || '1');
  const hasPrev = currentChapterNum > 1;
  const hasNext = novel ? currentChapterNum < totalChapters : false;

  if (loading) {
    return (
      <div className={`min-h-screen ${themeClass} flex items-center justify-center`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
      </div>
    );
  }

  if (error || !novel || !chapter) {
    return (
      <div className={`min-h-screen ${themeClass} p-4`}>
        <ErrorState onRetry={loadData} />
      </div>
    );
  }

  const paragraphs = chapter.content.split('\n').filter((p) => p.trim());

  return (
    <div className={`min-h-screen ${themeClass} transition-colors duration-300`}>
      {/* Reader Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-inherit border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(`/novel/${novel.slug}`)}
            className="flex items-center gap-2 text-sm hover:opacity-70 transition-opacity min-w-0"
          >
            <ArrowLeft className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">{novel.title}</span>
          </button>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs opacity-60 hidden sm:inline">Bab {chapter.chapter_number}</span>
            <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-white/10">
          <div className="h-full bg-primary transition-all duration-150" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
          <div className="bg-bg-surface rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Pengaturan Reader</h2>
              <button onClick={() => setShowSettings(false)} className="btn-ghost p-2">
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
                <button onClick={() => updateSettings({ fontSize: Math.max(14, settings.fontSize - 2) })} className="btn-secondary p-2">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="flex-1 text-center text-sm text-white">{settings.fontSize}px</span>
                <button onClick={() => updateSettings({ fontSize: Math.min(28, settings.fontSize + 2) })} className="btn-secondary p-2">
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
                {[1.5, 1.7, 1.8, 2.0, 2.2].map((lh) => (
                  <button
                    key={lh}
                    onClick={() => updateSettings({ lineHeight: lh })}
                    className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                      settings.lineHeight === lh ? 'bg-primary text-white' : 'bg-white/5 text-muted hover:bg-white/10'
                    }`}
                  >
                    {lh}
                  </button>
                ))}
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
                  onClick={() => updateSettings({ fontFamily: 'sans' })}
                  className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                    settings.fontFamily === 'sans' ? 'bg-primary text-white' : 'bg-white/5 text-muted hover:bg-white/10'
                  }`}
                >
                  Sans
                </button>
                <button
                  onClick={() => updateSettings({ fontFamily: 'serif' })}
                  className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                    settings.fontFamily === 'serif' ? 'bg-primary text-white' : 'bg-white/5 text-muted hover:bg-white/10'
                  }`}
                >
                  Serif
                </button>
              </div>
            </div>

            {/* Theme */}
            <div>
              <label className="text-sm font-medium text-white mb-3">Tema</label>
              <div className="grid grid-cols-4 gap-2">
                {themes.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      onClick={() => updateSettings({ theme: t.value })}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                        settings.theme === t.value ? 'border-primary' : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className={`w-full h-12 rounded-lg ${t.className} flex items-center justify-center`}>
                        <Icon className="h-5 w-5 opacity-70" />
                      </div>
                      <span className="text-xs text-white">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reader Content */}
      <div ref={contentRef} className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-wider opacity-50 mb-2">{novel.title}</p>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Bab {chapter.chapter_number}</h1>
          <h2 className="text-lg md:text-xl opacity-80">{chapter.title}</h2>
        </div>

        <div
          className="reader-content"
          style={{
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight,
            fontFamily: settings.fontFamily === 'serif' ? 'Lora, Georgia, serif' : 'Inter, sans-serif',
          }}
        >
          {paragraphs.map((para, i) => (
            <p key={i} className="mb-4 text-justify">{para}</p>
          ))}
        </div>

        {/* Komentar Bab */}
        <div className="reader-content">
          <CommentSection
            novelId={novel.id}
            chapterId={chapter.id}
            title={`Komentar Bab ${chapter.chapter_number}`}
            placeholder="Tulis komentar tentang Bab ini..."
            emptyTitle="Belum ada komentar di Bab ini."
            emptyMessage="Jadilah yang pertama berkomentar."
          />
        </div>

        {/* Bottom Navigation */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => hasPrev && navigate(`/read/${novel.slug}/${currentChapterNum - 1}`)}
              disabled={!hasPrev}
              className="btn-secondary flex-1 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Bab Sebelumnya</span>
              <span className="sm:hidden">Sebelumnya</span>
            </button>
            <Link to={`/novel/${novel.slug}/chapters`} className="btn-secondary px-4">
              <List className="h-4 w-4" />
            </Link>
            <button
              onClick={() => hasNext && navigate(`/read/${novel.slug}/${currentChapterNum + 1}`)}
              disabled={!hasNext}
              className="btn-primary flex-1 disabled:opacity-30"
            >
              <span className="hidden sm:inline">Bab Berikutnya</span>
              <span className="sm:hidden">Berikutnya</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {!hasNext && (
            <p className="text-center text-sm opacity-50 mt-6">
              Kamu telah mencapai akhir dari novel ini.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
