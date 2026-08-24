import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Bookmark,
  History,
  MessageSquare,
  Settings as SettingsIcon,
  LogOut,
  Calendar,
  Star,
  Library,
  ChevronRight,
  Shield,
  PenLine,
  X,
  Loader2,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import type { Profile as ProfileType } from '@/types';
import {
  fetchBookmarks,
  fetchReadingHistory,
  updateProfile,
} from '@/lib/services';
import { getGuestBookmarks, getGuestHistory } from '@/lib/guest';
import { formatDate, slugify } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function Profile() {
  const { user, profile, signOut, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [editUsername, setEditUsername] = useState('');

  // Tulis Novel
  const [showNovelForm, setShowNovelForm] = useState(false);
  const [savingNovel, setSavingNovel] = useState(false);
  const [novelError, setNovelError] = useState('');

  const [novelForm, setNovelForm] = useState({
    title: '',
    description: '',
    author: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const loadStats = useCallback(async () => {
    if (user) {
      const [bms, hist] = await Promise.all([
        fetchBookmarks(user.id),
        fetchReadingHistory(user.id),
      ]);

      setBookmarkCount(bms.length);
      setHistoryCount(hist.length);
    } else {
      setBookmarkCount(getGuestBookmarks().length);
      setHistoryCount(getGuestHistory().length);
    }
  }, [user]);

  useEffect(() => {
    void loadStats().catch((error) => {
      console.error('Failed to load profile statistics:', error);
      setBookmarkCount(0);
      setHistoryCount(0);
    });
  }, [loadStats]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <div className="skeleton h-32 w-full rounded-2xl" />
        <div className="skeleton h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
        <div className="card p-6 text-center">
          <h1 className="text-lg font-semibold text-white">
            Silakan masuk terlebih dahulu
          </h1>

          <p className="text-sm text-muted mt-2 mb-5">
            Masuk untuk melihat profil dan statistik bacamu.
          </p>

          <Link to="/login" className="btn-primary">
            Masuk
          </Link>
        </div>
      </div>
    );
  }

  const displayProfile: ProfileType = profile ?? {
    id: user.id,
    username: user.email?.split('@')[0] || 'Pembaca',
    email: user.email || '',
    avatar_url: null,
    role: 'reader',
    created_at: user.created_at,
  };

  const isReader = displayProfile.role === 'reader';
  const isAuthor = displayProfile.role === 'author';

  const menuItems = [
    {
      icon: Library,
      label: 'Rak Buku',
      to: '/library',
    },
    {
      icon: History,
      label: 'Riwayat Baca',
      to: '/history',
    },
    {
      icon: Bookmark,
      label: 'Bookmark',
      to: '/library?tab=bookmark',
    },
    {
      icon: MessageSquare,
      label: 'Komentar Saya',
      to: '/comments',
    },
    {
      icon: SettingsIcon,
      label: 'Pengaturan',
      to: '/settings',
    },
  ];

  const handleUpdateProfile = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!user) return;

    const username = editUsername.trim();

    if (!username) {
      setProfileError('Username wajib diisi.');
      return;
    }

    setSavingProfile(true);
    setProfileError('');

    try {
      await updateProfile(user.id, {
        username,
        avatar_url: displayProfile.avatar_url,
      });

      await refreshProfile();

      setShowEditProfile(false);
    } catch (error) {
      console.error('Failed to update profile:', error);

      setProfileError(
        error instanceof Error
          ? error.message
          : 'Gagal memperbarui profile.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const openNovelForm = () => {
    setNovelError('');

    setNovelForm({
      title: '',
      description: '',
      author: displayProfile.username,
    });

    setShowNovelForm(true);
  };

  const closeNovelForm = () => {
    if (savingNovel) return;

    setShowNovelForm(false);
    setNovelError('');
  };

  const handleCreateNovel = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    const title = novelForm.title.trim();
    const description = novelForm.description.trim();
    const author = novelForm.author.trim() || displayProfile.username;

    if (!title) {
      setNovelError('Judul novel wajib diisi.');
      return;
    }

    if (!description) {
      setNovelError('Deskripsi novel wajib diisi.');
      return;
    }

    setSavingNovel(true);
    setNovelError('');

    try {
      const slug = slugify(title);

      // Cek slug agar tidak bentrok
      const { data: existingNovel, error: slugCheckError } = await supabase
        .from('novels')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (slugCheckError) {
        throw slugCheckError;
      }

      if (existingNovel) {
        setNovelError(
          'Judul tersebut sudah digunakan. Silakan gunakan judul lain.'
        );
        return;
      }

      // Buat novel
      const { data: createdNovel, error: createError } = await supabase
        .from('novels')
        .insert({
          title,
          slug,
          author,
          author_id: user.id,
          description,
          status: 'ongoing',
          rating: 0,
          views: 0,
          bookmark_count: 0,
        })
        .select('*')
        .single();

      if (createError) {
        throw createError;
      }

      if (!createdNovel) {
        throw new Error('Novel gagal dibuat.');
      }

      // Jika sebelumnya reader, ubah otomatis menjadi author
      if (displayProfile.role === 'reader') {
        const { error: roleError } = await supabase
          .from('profiles')
          .update({
            role: 'author',
          })
          .eq('id', user.id);

        if (roleError) {
          console.error('Novel berhasil dibuat tetapi role gagal diubah:', roleError);
        }
      }

      // Refresh profile supaya role langsung berubah di UI
      await refreshProfile();

      setShowNovelForm(false);

      // Masuk ke halaman novel yang baru dibuat
      navigate(`/novel/${createdNovel.slug}`);
    } catch (error) {
      console.error('Failed to create novel:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'Gagal membuat novel. Silakan coba lagi.';

      setNovelError(message);
    } finally {
      setSavingNovel(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-8">

      {/* Profile Header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">

          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 overflow-hidden">
            {displayProfile.avatar_url ? (
              <img
                src={displayProfile.avatar_url}
                alt={displayProfile.username}
                className="h-full w-full object-cover"
              />
            ) : (
              displayProfile.username[0]?.toUpperCase()
            )}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-xl font-bold text-white">
              {displayProfile.username}
            </h1>

            <p className="text-sm text-muted mt-1">
              {displayProfile.email}
            </p>
            <button
              type="button"
              onClick={() => {
                setEditUsername(displayProfile.username);
                setProfileError('');
                setShowEditProfile(true);
              }}
              className="btn-primary mt-3 px-4 py-2 text-sm"
            >
              Edit Profile
            </button>

            <div className="flex items-center justify-center sm:justify-start gap-3 mt-2">

              <span className="badge bg-primary/20 text-primary-300 capitalize">
                {displayProfile.role}
              </span>

              <span className="flex items-center gap-1 text-xs text-muted">
                <Calendar className="h-3 w-3" />
                Member sejak {formatDate(displayProfile.created_at)}
              </span>

            </div>
          </div>
        </div>
      </div>

      {/* Tulis Novel */}
      {(isReader || isAuthor) && (
        <button
          onClick={openNovelForm}
          className="card w-full p-4 mb-6 flex items-center gap-3 hover:bg-white/5 transition-colors group text-left"
        >
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <PenLine className="h-5 w-5 text-primary-400" />
          </div>

          <div className="flex-1">
            <p className="text-sm font-semibold text-white">
              Tulis Novel
            </p>

            <p className="text-xs text-muted mt-1">
              {isReader
                ? 'Buat novel pertamamu dan menjadi author.'
                : 'Buat novel baru dan mulai menulis.'}
            </p>
          </div>

          <ChevronRight className="h-5 w-5 text-muted group-hover:text-primary-300" />
        </button>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-3 mb-6">

        <div className="card p-4 text-center">
          <BookOpen className="h-5 w-5 text-primary-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">
            {historyCount}
          </p>
          <p className="text-xs text-muted">
            Novel Dibaca
          </p>
        </div>

        <div className="card p-4 text-center">
          <Bookmark className="h-5 w-5 text-primary-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">
            {bookmarkCount}
          </p>
          <p className="text-xs text-muted">
            Novel di Rak
          </p>
        </div>

        <div className="card p-4 text-center">
          <Star className="h-5 w-5 text-primary-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">
            0
          </p>
          <p className="text-xs text-muted">
            Hari Aktif
          </p>
        </div>

      </div>

      {/* Menu */}
      <div className="card divide-y divide-white/5 mb-6">

        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              to={item.to}
              className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors group"
            >
              <Icon className="h-5 w-5 text-muted group-hover:text-primary-300" />

              <span className="flex-1 text-sm text-white">
                {item.label}
              </span>

              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
          );
        })}

      </div>

      {/* Admin Link */}
      {displayProfile.role === 'admin' && (
        <Link
          to="/admin"
          className="card p-4 mb-6 flex items-center gap-3 hover:bg-white/5 transition-colors group"
        >
          <Shield className="h-5 w-5 text-primary-400" />

          <span className="flex-1 text-sm text-white">
            Admin Dashboard
          </span>

          <ChevronRight className="h-4 w-4 text-muted" />
        </Link>
      )}

      {/* Logout */}
      <button
        onClick={() => signOut()}
        className="btn w-full bg-red-500/10 text-red-400 hover:bg-red-500/20 px-5 py-3 text-sm"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>

      {/* Modal Edit Profile */}
      {showEditProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => {
            if (!savingProfile) {
              setShowEditProfile(false);
              setProfileError('');
            }
          }}
        >
          <div
            className="card p-6 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Edit Profile
                </h2>

                <p className="text-xs text-muted mt-1">
                  Perbarui informasi profile kamu.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!savingProfile) {
                    setShowEditProfile(false);
                    setProfileError('');
                  }
                }}
                disabled={savingProfile}
                className="btn-ghost p-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {profileError && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3">
                <p className="text-sm text-red-400">
                  {profileError}
                </p>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="text-sm text-white mb-1 block">
                  Username
                </label>

                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="input w-full"
                  disabled={savingProfile}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="btn-primary w-full"
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Perubahan'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    
      {/* Modal Tulis Novel */}
      {showNovelForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={closeNovelForm}
        >
          <div
            className="card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Tulis Novel
                </h2>

                <p className="text-xs text-muted mt-1">
                  Mulai membuat novel baru di Semesta Novel.
                </p>
              </div>

              <button
                onClick={closeNovelForm}
                disabled={savingNovel}
                className="btn-ghost p-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Info Reader */}
            {isReader && (
              <div className="mb-5 rounded-xl bg-primary/10 border border-primary/20 p-4">
                <p className="text-sm font-medium text-primary-300">
                  🚀 Mulai menjadi Author
                </p>

                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Setelah novel berhasil dibuat, role akunmu otomatis berubah
                  dari <strong>reader</strong> menjadi <strong>author</strong>.
                </p>
              </div>
            )}

            {/* Error */}
            {novelError && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3">
                <p className="text-sm text-red-400">
                  {novelError}
                </p>
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={handleCreateNovel}
              className="space-y-4"
            >

              {/* Judul */}
              <div>
                <label className="text-sm text-white mb-1 block">
                  Judul Novel
                </label>

                <input
                  type="text"
                  value={novelForm.title}
                  onChange={(e) =>
                    setNovelForm({
                      ...novelForm,
                      title: e.target.value,
                    })
                  }
                  placeholder="Masukkan judul novel"
                  className="input w-full"
                  required
                  disabled={savingNovel}
                />
              </div>

              {/* Penulis */}
              <div>
                <label className="text-sm text-white mb-1 block">
                  Nama Penulis
                </label>

                <input
                  type="text"
                  value={novelForm.author}
                  onChange={(e) =>
                    setNovelForm({
                      ...novelForm,
                      author: e.target.value,
                    })
                  }
                  placeholder="Nama penulis"
                  className="input w-full"
                  required
                  disabled={savingNovel}
                />

                <p className="text-xs text-muted mt-1">
                  Nama ini akan ditampilkan sebagai penulis novel.
                </p>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="text-sm text-white mb-1 block">
                  Deskripsi
                </label>

                <textarea
                  value={novelForm.description}
                  onChange={(e) =>
                    setNovelForm({
                      ...novelForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Ceritakan sedikit tentang novel ini..."
                  className="input w-full min-h-[130px]"
                  required
                  disabled={savingNovel}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={savingNovel}
                className="btn-primary w-full"
              >
                {savingNovel ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Membuat Novel...
                  </>
                ) : (
                  <>
                    <PenLine className="h-4 w-4" />
                    Buat Novel
                  </>
                )}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}