import { Link } from 'react-router-dom';
import { Star, Eye, Bookmark, BookOpen } from 'lucide-react';
import type { Novel } from '@/types';
import { getCoverGradient, formatViews, formatDate } from '@/lib/utils';

interface NovelCardProps {
  novel: Novel;
  rank?: number;
  showLatestChapter?: boolean;
}

export default function NovelCard({
  novel,
  rank,
  showLatestChapter = false,
}: NovelCardProps) {
  const chapterCount = Number(novel.chapter_count || 0);
  const views = Number(novel.views || 0);
  const bookmarkCount = Number(novel.bookmark_count || 0);
  const rating = Number(novel.rating || 0);

  return (
    <Link
      to={`/novel/${novel.slug}`}
      className="group block"
    >
      <div className="card card-hover overflow-hidden">
        <div className="relative aspect-[3/4] overflow-hidden rounded-t-2xl bg-bg">
          {novel.cover_url ? (
            <img
              src={novel.cover_url}
              alt={`Cover ${novel.title}`}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div
              className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
              style={{
                background: getCoverGradient(novel.cover_url),
              }}
            />
          )}

          {rank !== undefined && (
            <div className="absolute left-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-bg/80 text-sm font-bold text-primary-300 backdrop-blur-sm">
              {rank}
            </div>
          )}

          <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-lg bg-bg/80 px-2 py-1 text-xs font-medium text-rating backdrop-blur-sm">
            <Star className="h-3 w-3 fill-rating text-rating" />
            {rating.toFixed(1)}
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          <div className="absolute bottom-2 left-2 right-2 z-10">
            <span
              className={`badge ${
                novel.status === 'ongoing'
                  ? 'bg-green-500/20 text-green-400'
                  : novel.status === 'completed'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-yellow-500/20 text-yellow-400'
              }`}
            >
              {novel.status === 'ongoing'
                ? 'Ongoing'
                : novel.status === 'completed'
                  ? 'Completed'
                  : 'Hiatus'}
            </span>
          </div>
        </div>

        <div className="p-3">
          <h3 className="line-clamp-2 text-sm font-semibold text-white transition-colors group-hover:text-primary-300">
            {novel.title}
          </h3>

          <p className="mt-1 truncate text-xs text-muted">
            {novel.author}
          </p>

          {novel.genres && novel.genres.length > 0 && (
            <p className="mt-1 truncate text-xs text-primary-400/80">
              {novel.genres
                .map((genre) => genre.name)
                .join(', ')}
            </p>
          )}

          <div className="mt-3 grid grid-cols-3 gap-1 border-t border-white/5 pt-2">
            <div className="flex min-w-0 items-center gap-1">
              <Eye className="h-3.5 w-3.5 shrink-0 text-muted" />
              <span className="truncate text-xs font-medium text-white">
                {formatViews(views)}
              </span>
            </div>

            <div className="flex min-w-0 items-center gap-1">
              <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted" />
              <span className="truncate text-xs font-medium text-white">
                {chapterCount}
              </span>
            </div>

            <div className="flex min-w-0 items-center gap-1">
              <Bookmark className="h-3.5 w-3.5 shrink-0 text-muted" />
              <span className="truncate text-xs font-medium text-white">
                {formatViews(bookmarkCount)}
              </span>
            </div>
          </div>

          {showLatestChapter && novel.latest_chapter && (
            <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2">
              <span className="truncate text-xs text-muted">
                Bab {novel.latest_chapter.chapter_number}
              </span>

              <span className="ml-2 shrink-0 text-xs text-muted/70">
                {formatDate(novel.latest_chapter.created_at)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function NovelCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton aspect-[3/4] rounded-t-2xl" />

      <div className="space-y-2 p-3">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-3 w-2/3" />

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="skeleton h-8 w-full" />
          <div className="skeleton h-8 w-full" />
          <div className="skeleton h-8 w-full" />
        </div>
      </div>
    </div>
  );
}