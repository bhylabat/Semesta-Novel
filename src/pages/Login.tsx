import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);

    const { error } = await signInWithGoogle();

    if (error) {
      setError(error);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary mb-4">
            <BookOpen className="h-7 w-7 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            Selamat Datang Kembali
          </h1>

          <p className="text-sm text-muted">
            Masuk untuk melanjutkan petualangan membacamu
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Google Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            className="w-full h-11 flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 text-white font-medium hover:bg-white/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M21.35 12.27c0-.71-.06-1.39-.18-2.05H12v3.88h5.23a4.47 4.47 0 0 1-1.94 2.93v2.43h3.14c1.84-1.69 2.92-4.18 2.92-7.19Z"
                />
                <path
                  fill="#34A853"
                  d="M12 21.82c2.63 0 4.84-.87 6.45-2.36l-3.14-2.43c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.29v2.51A9.74 9.74 0 0 0 12 21.82Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.54 13.92A5.85 5.85 0 0 1 6.23 12c0-.67.11-1.32.31-1.92V7.57H3.29A9.8 9.8 0 0 0 2.25 12c0 1.59.38 3.09 1.04 4.43l3.25-2.51Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 6.05c1.43 0 2.72.49 3.74 1.45l2.8-2.8C16.83 3.13 14.63 2.18 12 2.18a9.74 9.74 0 0 0-8.71 5.39l3.25 2.51C7.31 7.77 9.46 6.05 12 6.05Z"
                />
              </svg>
            )}

            {googleLoading
              ? 'Menghubungkan...'
              : 'Lanjutkan dengan Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />

            <span className="text-xs text-muted">
              ATAU
            </span>

            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium text-white mb-2 block">
              Email
            </label>

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

          {/* Password */}
          <div>
            <label className="text-sm font-medium text-white mb-2 block">
              Password
            </label>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />

              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input pl-10 pr-10 w-full"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                aria-label={
                  showPassword
                    ? 'Sembunyikan password'
                    : 'Tampilkan password'
                }
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Login */}
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="btn-primary w-full"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Masuk'
            )}
          </button>

          <p className="text-center text-sm text-muted">
            Belum punya akun?{' '}
            <Link
              to="/register"
              className="text-primary-400 hover:text-primary-300 font-medium"
            >
              Daftar sekarang
            </Link>
          </p>

        </form>
      </div>
    </div>
  );
}