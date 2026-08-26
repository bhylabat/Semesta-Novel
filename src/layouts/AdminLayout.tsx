import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Users,
  MessageSquare,
  Tag,
  Flag,
  BarChart3,
  Menu,
  X,
  LogOut,
  Home,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const adminNavItems = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Novel', path: '/admin/novels', icon: BookOpen },
  { label: 'Bab', path: '/admin/chapters', icon: FileText },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Comments', path: '/admin/comments', icon: MessageSquare },
  { label: 'Genres', path: '/admin/genres', icon: Tag },
  { label: 'Reports', path: '/admin/reports', icon: Flag },
  { label: 'Statistics', path: '/admin/statistics', icon: BarChart3 },
  ];
  
export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!profile || profile.role !== 'admin')) {
      navigate('/');
    }
  }, [profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="skeleton h-8 w-8 rounded-full" />
      </div>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return null;
  }

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen z-50 w-64 glass border-r border-white/10 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="text-sm font-bold gradient-text">Semesta Admin</span>
              </div>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden btn-ghost p-1">
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive(item.path) ? 'bg-primary/15 text-primary-300' : 'text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-white/10 space-y-1">
            <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-white hover:bg-white/5 transition-colors">
              <Home className="h-4 w-4" />
              Kembali ke App
            </Link>
            <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <header className="md:hidden glass border-b border-white/10 px-4 h-14 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="btn-ghost p-2">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-white">Admin Panel</span>
          <div className="w-9" />
        </header>
        <main className="p-4 md:p-8 max-w-6xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
