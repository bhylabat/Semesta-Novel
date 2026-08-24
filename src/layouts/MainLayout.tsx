import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Home, BookOpen, Library, History, User,
  Search, Bell, Flame, TrendingUp, Clock, LogIn, UserPlus
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getUnreadNotificationCount } from '@/lib/services';

const navItems = [
  { label: 'Beranda', path: '/', icon: Home },
  { label: 'Novel', path: '/novel', icon: BookOpen },
  { label: 'Populer', path: '/ranking', icon: TrendingUp },
  { label: 'Terbaru', path: '/novel?sort=terbaru', icon: Clock },
  { label: 'Ranking', path: '/ranking', icon: Flame },
];

const bottomNavItems = [
  { label: 'Beranda', path: '/', icon: Home },
  { label: 'Novel', path: '/novel', icon: BookOpen },
  { label: 'Rak Buku', path: '/library', icon: Library },
  { label: 'Riwayat', path: '/history', icon: History },
  { label: 'Profil', path: '/profile', icon: User },
];

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [mobileSearch, setMobileSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileSearch(false);
      setSearchQuery('');
    }
  };

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }

    let mounted = true;

    const loadUnreadNotifications = async () => {
      try {
        const count = await getUnreadNotificationCount(user.id);

        if (mounted) {
          setUnreadNotifications(count);
        }
      } catch (error) {
        console.error('Failed to load unread notifications:', error);

        if (mounted) {
          setUnreadNotifications(0);
        }
      }
    };

    void loadUnreadNotifications();

    const interval = window.setInterval(() => {
      void loadUnreadNotifications();
    }, 30000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [user]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path.split('?')[0]);
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Desktop Header */}
      <header className={`hidden md:block fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'glass shadow-lg shadow-black/20' : 'bg-bg/50 backdrop-blur-sm'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">Semesta Novel</span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path) ? 'text-primary-300 bg-primary/10' : 'text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari novel..."
                className="input pl-9 w-48"
              />
            </form>
            <Link
              to="/notifications"
              className="btn-ghost p-2 relative"
              title="Notifikasi"
              aria-label={
                unreadNotifications > 0
                  ? `Notifikasi, ${unreadNotifications} belum dibaca`
                  : 'Notifikasi'
              }
            >
              <Bell className="h-5 w-5" />

              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-bg">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </Link>
            {user ? (
              <Link to="/profile" className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold text-white">
                  {profile?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm text-white">{profile?.username}</span>
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
                <Link to="/register" className="btn-primary">
                  <UserPlus className="h-4 w-4" />
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 glass">
        <div className="px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold gradient-text">Semesta Novel</span>
          </Link>
          <div className="flex items-center gap-1">
            <button onClick={() => setMobileSearch(!mobileSearch)} className="btn-ghost p-2">
              <Search className="h-5 w-5" />
            </button>
            <Link
              to="/notifications"
              className="btn-ghost p-2 relative"
              title="Notifikasi"
              aria-label={
                unreadNotifications > 0
                  ? `Notifikasi, ${unreadNotifications} belum dibaca`
                  : 'Notifikasi'
              }
            >
              <Bell className="h-5 w-5" />

              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-bg">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </Link>
          </div>
        </div>
        {mobileSearch && (
          <div className="px-4 pb-3 animate-slide-down">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari novel, author, atau genre..."
                className="input pl-9 w-full"
                autoFocus
              />
            </form>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="pt-14 md:pt-16 pb-20 md:pb-8 overflow-x-clip">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10">
        <div className="flex items-center justify-around px-2 py-1.5">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex min-h-11 flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2 py-1.5 rounded-lg transition-colors ${
                  active ? 'text-primary-400' : 'text-muted'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'fill-primary-400/20' : ''}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
