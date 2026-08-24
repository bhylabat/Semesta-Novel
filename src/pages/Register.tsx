import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Mail, Lock, User, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await signUp(email, password, username);
    if (error) {
      setError(error);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary mb-4">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Bergabung dengan Semesta Novel</h1>
          <p className="text-sm text-muted">Daftar dan mulai petualangan membacamu</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-white mb-2 block">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username kamu"
                className="input pl-10 w-full"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-white mb-2 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="input pl-10 w-full"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-white mb-2 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="input pl-10 w-full"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Daftar'}
          </button>

          <p className="text-center text-sm text-muted">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
              Masuk di sini
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
