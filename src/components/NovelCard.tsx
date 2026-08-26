import { Link } from 'react-router-dom';
import { Star, Eye, Bookmark } from 'lucide-react';
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
  showLatestChapter,
}: NovelCardProps) {
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
                background: getCoverGradient(
                  novel.cover_url
                ),
              }}
            />
          )}

          {rank !== undefined && (
            <div className="absolute top-2 left-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-bg/80 backdrop-blur-sm text-sm font-bold text-primary-300">
              {rank}
            </div>
          )}

          <div className="absolute top-2 right-2 z-10 badge bg-bg/80 backdrop-blur-sm text-rating">
            <Star className="h-3 w-3 fill-rating text-rating" />
            {Number(novel.rating).toFixed(1)}
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

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
          <h3 className="line-clamp-2 text-sm font-semibold text-white group-hover:text-primary-300 transition-colors">
            {novel.title}
          </h3>

          <p className="mt-1 text-xs text-muted truncate">
            {novel.author}
          </p>

          {novel.genres &&
            novel.genres.length > 0 && (
              <p className="mt-1 text-xs text-primary-400/80 truncate">
                {novel.genres
                  .map((g) => g.name)
                  .join(', ')}
              </p>
            )}

          <div className="mt-2 flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatViews(novel.views)}
            </span>

            <span className="flex items-center gap-1">
              <Bookmark className="h-3 w-3" />
              {formatViews(novel.bookmark_count)}
            </span>
          </div>

          {showLatestChapter &&
            novel.latest_chapter && (
              <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2">
                <span className="text-xs text-muted truncate">
                  Bab {novel.latest_chapter.chapter_number}
                </span>

                <span className="text-xs text-muted/70">
                  {formatDate(
                    novel.latest_chapter.created_at
                  )}
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

      <div className="p-3 space-y-2">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-3 w-2/3" />
      </div>
    </div>
  );
}