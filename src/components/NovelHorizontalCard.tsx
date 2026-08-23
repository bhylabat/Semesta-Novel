import { Star, Eye, Bookmark } from 'lucide-react';
import type { Novel } from '@/types';
import { getCoverGradient, formatViews } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface NovelHorizontalCardProps {
  novel: Novel;
}

export default function NovelHorizontalCard({ novel }: NovelHorizontalCardProps) {
  return (
    <Link to={`/novel/${novel.slug}`} className="group flex-shrink-0 w-72 block">
      <div className="card card-hover overflow-hidden">
        <div className="relative aspect-[3/4] overflow-hidden rounded-t-2xl">
          <div
            className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
            style={{ background: getCoverGradient(novel.cover_url) }}
          />
          <div className="absolute top-2 right-2 z-10 badge bg-bg/80 backdrop-blur-sm text-rating">
            <Star className="h-3 w-3 fill-rating text-rating" />
            {Number(novel.rating).toFixed(1)}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
        <div className="p-3">
          <h3 className="text-sm font-semibold text-white group-hover:text-primary-300 transition-colors line-clamp-2">
            {novel.title}
          </h3>
          <p className="text-xs text-muted mt-1 truncate">{novel.author}</p>
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
        </div>
      </div>
    </Link>
  );
}
