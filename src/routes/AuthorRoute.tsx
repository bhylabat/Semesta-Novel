import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';

export default function AuthorRoute() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-sm text-muted">
          Memuat...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (
    profile?.role !== 'author' &&
    profile?.role !== 'admin'
  ) {
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
}