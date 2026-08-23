import { Link } from 'react-router-dom';
import { Star, Eye } from 'lucide-react';
import type { Novel } from '@/types';
import { getCoverGradient, formatViews } from '@/lib/utils';

interface NovelRowCardProps {
  novel: Novel;
  rank?: number;
}

export default function NovelRowCard({ novel, rank }: NovelRowCardProps) {
  return (
    <Link to={`/novel/${novel.slug}`} className="group flex gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
      {rank !== undefined && (
        <div className="flex-shrink-0 flex items-center justify-center w-8">
          <span className={`text-lg font-bold ${rank <= 3 ? 'text-primary-400' : 'text-muted'}`}>{rank}</span>
        </div>
      )}
      <div className="flex-shrink-0 w-14 h-20 rounded-lg overflow-hidden" style={{ background: getCoverGradient(novel.cover_url) }} />
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-white group-hover:text-primary-300 transition-colors line-clamp-2">
          {novel.title}
        </h3>
        <p className="text-xs text-muted mt-0.5 truncate">{novel.author}</p>
        {novel.genres && novel.genres.length > 0 && (
          <p className="text-xs text-primary-400/70 mt-0.5 truncate">
            {novel.genres.map((g) => g.name).join(', ')}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1 text-xs text-muted">
          <span className="flex items-center gap-1 text-rating">
            <Star className="h-3 w-3 fill-rating" />
            {Number(novel.rating).toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {formatViews(novel.views)}
          </span>
        </div>
      </div>
    </Link>
  );
}
