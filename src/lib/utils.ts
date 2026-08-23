// Gradient cover generator — maps novel cover_url placeholder to a CSS gradient
const GRADIENTS: Record<string, string> = {
  'gradient-1': 'linear-gradient(135deg, #7C3AED 0%, #1E1B4B 50%, #0D1422 100%)',
  'gradient-2': 'linear-gradient(135deg, #A855F7 0%, #312E81 50%, #0D1422 100%)',
  'gradient-3': 'linear-gradient(135deg, #C084FC 0%, #4C1D95 50%, #0D1422 100%)',
  'gradient-4': 'linear-gradient(135deg, #8B5CF6 0%, #5B21B6 50%, #111A2A 100%)',
  'gradient-5': 'linear-gradient(135deg, #7C3AED 0%, #312E81 50%, #111A2A 100%)',
  'gradient-6': 'linear-gradient(135deg, #A855F7 0%, #4C1D95 50%, #111A2A 100%)',
  'gradient-7': 'linear-gradient(135deg, #6D28D9 0%, #1E1B4B 50%, #0D1422 100%)',
  'gradient-8': 'linear-gradient(135deg, #C084FC 0%, #5B21B6 50%, #0D1422 100%)',
  'gradient-9': 'linear-gradient(135deg, #8B5CF6 0%, #312E81 50%, #111A2A 100%)',
  'gradient-10': 'linear-gradient(135deg, #7C3AED 0%, #4C1D95 50%, #111A2A 100%)',
  'gradient-11': 'linear-gradient(135deg, #A855F7 0%, #1E1B4B 50%, #111A2A 100%)',
  'gradient-12': 'linear-gradient(135deg, #C084FC 0%, #312E81 50%, #0D1422 100%)',
  'gradient-13': 'linear-gradient(135deg, #8B5CF6 0%, #5B21B6 50%, #0D1422 100%)',
  'gradient-14': 'linear-gradient(135deg, #7C3AED 0%, #312E81 50%, #111A2A 100%)',
  'gradient-15': 'linear-gradient(135deg, #A855F7 0%, #4C1D95 50%, #111A2A 100%)',
};

const BANNERS: Record<string, string> = {
  'banner-1': 'linear-gradient(135deg, #7C3AED 0%, #1E1B4B 40%, #070B14 100%)',
  'banner-2': 'linear-gradient(135deg, #A855F7 0%, #312E81 40%, #070B14 100%)',
  'banner-3': 'linear-gradient(135deg, #C084FC 0%, #4C1D95 40%, #070B14 100%)',
  'banner-4': 'linear-gradient(135deg, #8B5CF6 0%, #5B21B6 40%, #070B14 100%)',
  'banner-5': 'linear-gradient(135deg, #7C3AED 0%, #312E81 40%, #070B14 100%)',
  'banner-6': 'linear-gradient(135deg, #A855F7 0%, #4C1D95 40%, #070B14 100%)',
  'banner-7': 'linear-gradient(135deg, #6D28D9 0%, #1E1B4B 40%, #070B14 100%)',
  'banner-8': 'linear-gradient(135deg, #C084FC 0%, #5B21B6 40%, #070B14 100%)',
  'banner-9': 'linear-gradient(135deg, #8B5CF6 0%, #312E81 40%, #070B14 100%)',
  'banner-10': 'linear-gradient(135deg, #7C3AED 0%, #4C1D95 40%, #070B14 100%)',
  'banner-11': 'linear-gradient(135deg, #A855F7 0%, #1E1B4B 40%, #070B14 100%)',
  'banner-12': 'linear-gradient(135deg, #C084FC 0%, #312E81 40%, #070B14 100%)',
  'banner-13': 'linear-gradient(135deg, #8B5CF6 0%, #5B21B6 40%, #070B14 100%)',
  'banner-14': 'linear-gradient(135deg, #7C3AED 0%, #312E81 40%, #070B14 100%)',
  'banner-15': 'linear-gradient(135deg, #A855F7 0%, #4C1D95 40%, #070B14 100%)',
};

export function getCoverGradient(coverUrl: string | null): string {
  if (!coverUrl) return GRADIENTS['gradient-1'];
  if (GRADIENTS[coverUrl]) return GRADIENTS[coverUrl];
  if (coverUrl.startsWith('http')) return `url(${coverUrl})`;
  return GRADIENTS['gradient-1'];
}

export function getBannerGradient(bannerUrl: string | null): string {
  if (!bannerUrl) return BANNERS['banner-1'];
  if (BANNERS[bannerUrl]) return BANNERS[bannerUrl];
  if (bannerUrl.startsWith('http')) return `url(${bannerUrl})`;
  return BANNERS['banner-1'];
}

export function formatViews(views: number): string {
  if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
  if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
  return views.toString();
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Baru saja';
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} bulan lalu`;
  return `${Math.floor(diffDays / 365)} tahun lalu`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
