import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Star, Eye, Play, Info, ChevronRight, ChevronLeft,
  Flame, Clock, BookOpen, Calendar,
  Sword, Sparkles, Heart, RefreshCw, Hand, Rocket,
  Ghost, Laugh, Coffee, Search, Drama, Compass,
  Users, Shield, Award, Zap
} from 'lucide-react';
import type { Novel, Genre, ReadingHistory } from '@/types';
import { fetchNovels, fetchGenres, fetchNovelBySlug, fetchReadingHistory } from '@/lib/services';
import { getCoverGradient, getBannerGradient, formatViews, formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { getGuestHistory } from '@/lib/guest';
import NovelCard, { NovelCardSkeleton } from '@/components/NovelCard';
import NovelHorizontalCard from '@/components/NovelHorizontalCard';
import Section from '@/components/Section';
import ErrorState from '@/components/ErrorState';

const genreIcons: Record<string, typeof Sword> = {
  action: Sword, fantasy: Sparkles, romance: Heart, reinkarnasi: RefreshCw,
  'martial-arts': Hand, 'sci-fi': Rocket, horror: Ghost, komedi: Laugh,
  'slice-of-life': Coffee, mystery: Search, drama: Drama, adventure: Compass,
};

const features = [
  { icon: Calendar, title: 'Update Setiap Hari', desc: 'Bab baru setiap hari tanpa henti' },
  { icon: BookOpen, title: 'Baca Gratis', desc: 'Ribuan novel gratis untuk dibaca' },
  { icon: Award, title: 'Kualitas Terbaik', desc: 'Novel pilihan dengan kualitas premium' },
  { icon: Users, title: 'Komunitas Aktif', desc: 'Diskusi dan berbagi dengan pembaca lain' },
];

export default function Home() {
  const { user } = useAuth();
  const [heroNovels, setHeroNovels] = useState<Novel[]>([]);
  const [topNovels, setTopNovels] = useState<Novel[]>([]);
  const [latestNovels, setLatestNovels] = useState<Novel[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [history, setHistory] = useState<ReadingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [top, latest, genreData] = await Promise.all([
        fetchNovels({ sort: 'terpopuler', limit: 10 }),
        fetchNovels({ sort: 'terbaru', limit: 12 }),
        fetchGenres(),
      ]);
      setTopNovels(top.data);
      setLatestNovels(latest.data);
      setGenres(genreData);

      const heroSlugs = ['reinkarnasi-sang-pangeran-iblis', 'sang-jenderal-yang-mengkhianati-langit', 'naga-yang-menunggu-senja'];
      const heroData = await Promise.all(heroSlugs.map((s) => fetchNovelBySlug(s)));
      setHeroNovels(heroData.filter((n): n is Novel => n !== null));

      if (user) {
        const h = await fetchReadingHistory(user.id);
        setHistory(h);
      } else {
        const guestH = getGuestHistory();
        if (guestH.length > 0) {
          const novelsData = await Promise.all(guestH.slice(0, 5).map(async (h) => {
            const novel = await fetchNovelBySlug(h.novel_id);
            return novel ? {
              id: h.novel_id,
              user_id: '',
              novel_id: h.novel_id,
              chapter_id: h.chapter_id,
              progress: h.progress,
              last_read_at: h.last_read_at,
              novel,
              chapter: { id: h.chapter_id, novel_id: h.novel_id, chapter_number: h.chapter_number, title: '', content: '', views: 0, created_at: '', updated_at: '' },
            } as ReadingHistory : null;
          }));
          setHistory(novelsData.filter((h): h is ReadingHistory => h !== null));
        }
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (heroNovels.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroNovels.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroNovels.length]);

  const currentHero = heroNovels[currentSlide];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8 space-y-10 md:space-y-16">
      {error ? (
        <ErrorState onRetry={loadData} />
      ) : (
        <>
          {/* Hero Carousel */}
          {loading ? (
            <div className="skeleton h-64 md:h-96 rounded-3xl" />
          ) : currentHero ? (
            <div className="relative h-64 md:h-[28rem] rounded-3xl overflow-hidden group">
              <div
                className="absolute inset-0 transition-all duration-700"
                style={{ background: getBannerGradient(currentHero.banner_url) }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-bg/80 via-transparent to-transparent" />

              <div className="relative h-full flex items-end p-6 md:p-12">
                <div className="max-w-2xl animate-fade-in" key={currentSlide}>
                  <span className="badge bg-primary/30 text-primary-200 mb-3">
                    <Flame className="h-3 w-3" />
                    NOVEL TERPOPULER
                  </span>
                  <h1 className="text-2xl md:text-4xl font-bold text-white mb-3 leading-tight">
                    {currentHero.title}
                  </h1>
                  <p className="text-sm md:text-base text-muted mb-4 line-clamp-2 md:line-clamp-3 max-w-xl">
                    {currentHero.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mb-5">
                    {currentHero.genres?.map((g) => (
                      <span key={g.id} className="badge bg-white/10 text-white/80">
                        {g.name}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mb-5 text-sm">
                    <span className="flex items-center gap-1 text-rating">
                      <Star className="h-4 w-4 fill-rating" />
                      {Number(currentHero.rating).toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1 text-muted">
                      <Eye className="h-4 w-4" />
                      {formatViews(currentHero.views)} pembaca
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link to={`/read/${currentHero.slug}/1`} className="btn-primary">
                      <Play className="h-4 w-4 fill-white" />
                      Baca Sekarang
                    </Link>
                    <Link to={`/novel/${currentHero.slug}`} className="btn-secondary">
                      <Info className="h-4 w-4" />
                      Lihat Detail
                    </Link>
                  </div>
                </div>
              </div>

              {/* Carousel controls */}
              {heroNovels.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev - 1 + heroNovels.length) % heroNovels.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
                  >
                    <ChevronRight className="h-5 w-5 text-white" />
                  </button>
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev + 1) % heroNovels.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5 text-white" />
                  </button>
                  <div className="absolute bottom-4 right-6 flex gap-2">
                    {heroNovels.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={`h-1.5 rounded-full transition-all ${i === currentSlide ? 'w-8 bg-primary' : 'w-1.5 bg-white/30'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : null}

          {/* Continue Reading */}
          {history.length > 0 && (
            <Section title="Lanjutkan Membaca" action={
              <Link to="/history" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
                Semua <ChevronRight className="h-4 w-4" />
              </Link>
            }>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {history.slice(0, 5).map((h) => (
                  <Link key={h.novel_id} to={`/read/${h.novel?.slug}/${h.chapter?.chapter_number || 1}`} className="group flex-shrink-0 w-80">
                    <div className="card card-hover p-3 flex gap-3">
                      <div className="flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden" style={{ background: getCoverGradient(h.novel?.cover_url || null) }} />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white group-hover:text-primary-300 transition-colors line-clamp-2">
                          {h.novel?.title}
                        </h3>
                        <p className="text-xs text-muted mt-1">Bab {h.chapter?.chapter_number}</p>
                        <div className="mt-2">
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${h.progress}%` }} />
                          </div>
                          <p className="text-xs text-muted mt-1">{Math.round(h.progress)}% selesai</p>
                        </div>
                        <button className="mt-2 text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                          <Play className="h-3 w-3 fill-primary-400" />
                          Lanjutkan
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* Top Ranking */}
          <Section title="Top Ranking" action={
            <Link to="/ranking" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
              Lihat Semua <ChevronRight className="h-4 w-4" />
            </Link>
          }>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3">
              {loading
                ? Array.from({ length: 10 }).map((_, i) => <NovelCardSkeleton key={i} />)
                : topNovels.map((novel, i) => (
                    <NovelCard key={novel.id} novel={novel} rank={i + 1} />
                  ))}
            </div>
          </Section>

          {/* Novel Terbaru */}
          <Section title="Novel Terbaru" action={
            <Link to="/novel?sort=terbaru" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
              Lihat Semua <ChevronRight className="h-4 w-4" />
            </Link>
          }>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {loading
                ? Array.from({ length: 12 }).map((_, i) => <NovelCardSkeleton key={i} />)
                : latestNovels.map((novel) => (
                    <NovelCard key={novel.id} novel={novel} showLatestChapter />
                  ))}
            </div>
          </Section>

          {/* Genre Populer */}
          <Section title="Genre Populer">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {genres.map((genre) => {
                const Icon = genreIcons[genre.slug] || BookOpen;
                return (
                  <Link
                    key={genre.id}
                    to={`/novel?genre=${genre.id}`}
                    className="card card-hover p-4 flex flex-col items-center gap-2 group"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6 text-primary-400" />
                    </div>
                    <span className="text-sm font-medium text-white">{genre.name}</span>
                  </Link>
                );
              })}
            </div>
          </Section>

          {/* Features */}
          <Section title="Kenapa Membaca di Semesta Novel?">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="card p-6 text-center">
                    <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 mb-4">
                      <Icon className="h-7 w-7 text-primary-300" />
                    </div>
                    <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted">{feature.desc}</p>
                  </div>
                );
              })}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
