import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Link,
  useNavigate,
} from 'react-router-dom';
import {
  BookOpen,
  Bookmark,
  Calendar,
  ChevronRight,
  History,
  Library,
  Loader2,
  LogOut,
  MessageSquare,
  PenLine,
  Settings as SettingsIcon,
  Shield,
  Star,
  X,
  Camera,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import type { Profile as ProfileType } from '@/types';

import {
  fetchBookmarks,
  fetchReadingHistory,
} from '@/lib/services';

import {
  getGuestBookmarks,
  getGuestHistory,
} from '@/lib/guest';

import {
  formatDate,
  slugify,
} from '@/lib/utils';

import { supabase } from '@/lib/supabase';

type ExtendedProfile = ProfileType & {
  display_name?: string | null;
  bio?: string | null;
};

export default function Profile() {
  const {
    user,
    profile,
    signOut,
    loading,
    refreshProfile,
  } = useAuth();

  const navigate = useNavigate();

  // ============================================================
  // STATISTICS
  // ============================================================

  const [bookmarkCount, setBookmarkCount] =
    useState(0);

  const [historyCount, setHistoryCount] =
    useState(0);

  // ============================================================
  // EDIT PROFILE
  // ============================================================

  const [showEditProfile, setShowEditProfile] =
    useState(false);

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [profileError, setProfileError] =
    useState('');

  const [editUsername, setEditUsername] =
    useState('');

  const [editDisplayName, setEditDisplayName] =
    useState('');

  const [editBio, setEditBio] =
    useState('');

  const [selectedAvatar, setSelectedAvatar] =
    useState<File | null>(null);

  const [avatarPreview, setAvatarPreview] =
    useState('');

  const avatarInputRef =
    useRef<HTMLInputElement | null>(null);

  // ============================================================
  // TULIS NOVEL
  // ============================================================

  const [showNovelForm, setShowNovelForm] =
    useState(false);

  const [savingNovel, setSavingNovel] =
    useState(false);

  const [novelError, setNovelError] =
    useState('');

  const [novelForm, setNovelForm] = useState({
    title: '',
    description: '',
    author: '',
  });

  // ============================================================
  // LOGIN CHECK
  // ============================================================

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [
    loading,
    user,
    navigate,
  ]);

  // ============================================================
  // LOAD STATISTICS
  // ============================================================

  const loadStats = useCallback(
    async () => {
      if (user) {
        const [
          bookmarks,
          history,
        ] = await Promise.all([
          fetchBookmarks(user.id),
          fetchReadingHistory(user.id),
        ]);

        setBookmarkCount(
          bookmarks.length
        );

        setHistoryCount(
          history.length
        );

        return;
      }

      setBookmarkCount(
        getGuestBookmarks().length
      );

      setHistoryCount(
        getGuestHistory().length
      );
    },
    [user]
  );

  useEffect(() => {
    void loadStats().catch((error) => {
      console.error(
        'Failed to load profile statistics:',
        error
      );

      setBookmarkCount(0);
      setHistoryCount(0);
    });
  }, [loadStats]);

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <div className="skeleton h-32 w-full rounded-2xl" />
        <div className="skeleton h-48 w-full rounded-2xl" />
      </div>
    );
  }

  // ============================================================
  // NOT LOGIN
  // ============================================================

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
        <div className="card p-6 text-center">
          <h1 className="text-lg font-semibold text-white">
            Silakan masuk terlebih dahulu
          </h1>

          <p className="text-sm text-muted mt-2 mb-5">
            Masuk untuk melihat profil dan
            statistik bacamu.
          </p>

          <Link
            to="/login"
            className="btn-primary"
          >
            Masuk
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================
  // PROFILE DATA
  // ============================================================

  const displayProfile: ExtendedProfile =
    profile ?? {
      id: user.id,
      username:
        user.email?.split('@')[0] ||
        'Pembaca',
      email: user.email || '',
      avatar_url: null,
      role: 'reader',
      created_at: user.created_at,
      display_name: null,
      bio: null,
    };

  const isReader =
    displayProfile.role === 'reader';

  const isAuthor =
    displayProfile.role === 'author';

  const isAdmin =
    displayProfile.role === 'admin';

  // ============================================================
  // MENU
  // ============================================================

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

  // ============================================================
  // OPEN EDIT PROFILE
  // ============================================================

  const openEditProfile = () => {
    setEditUsername(
      displayProfile.username || ''
    );

    setEditDisplayName(
      displayProfile.display_name || ''
    );

    setEditBio(
      displayProfile.bio || ''
    );

    setSelectedAvatar(null);

    setAvatarPreview(
      displayProfile.avatar_url || ''
    );

    setProfileError('');
    setShowEditProfile(true);
  };

  // ============================================================
  // CLOSE EDIT PROFILE
  // ============================================================

  const closeEditProfile = () => {
    if (savingProfile) {
      return;
    }

    if (
      avatarPreview &&
      selectedAvatar
    ) {
      URL.revokeObjectURL(
        avatarPreview
      );
    }

    setShowEditProfile(false);
    setProfileError('');
    setSelectedAvatar(null);
    setAvatarPreview('');
  };

  // ============================================================
  // SELECT AVATAR
  // ============================================================

  const handleAvatarChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setProfileError('');

    if (
      !file.type.startsWith('image/')
    ) {
      setProfileError(
        'File yang dipilih harus berupa gambar.'
      );

      event.target.value = '';
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setProfileError(
        'Ukuran foto maksimal 10 MB.'
      );

      event.target.value = '';
      return;
    }

    if (
      avatarPreview &&
      selectedAvatar
    ) {
      URL.revokeObjectURL(
        avatarPreview
      );
    }

    const previewUrl =
      URL.createObjectURL(file);

    setSelectedAvatar(file);
    setAvatarPreview(previewUrl);
  };

  // ============================================================
  // UPLOAD AVATAR
  // ============================================================

  const uploadAvatar = async (
    file: File
  ): Promise<string> => {
    const extension =
      file.name
        .split('.')
        .pop()
        ?.toLowerCase() || 'jpg';

    const filePath =
      `${user.id}/avatar-${Date.now()}.${extension}`;

    const {
      error: uploadError,
    } = await supabase.storage
      .from('avatars')
      .upload(
        filePath,
        file,
        {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        }
      );

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: publicUrlData,
    } = supabase.storage
      .from('avatars')
      .getPublicUrl(
        filePath
      );

    if (
      !publicUrlData.publicUrl
    ) {
      throw new Error(
        'Foto berhasil diupload tetapi URL foto gagal dibuat.'
      );
    }

    return publicUrlData.publicUrl;
  };

  // ============================================================
  // UPDATE PROFILE
  // ============================================================

  const handleUpdateProfile = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    const username =
      editUsername.trim();

    const displayName =
      editDisplayName.trim();

    const bio =
      editBio.trim();

    if (!username) {
      setProfileError(
        'Username wajib diisi.'
      );
      return;
    }

    if (username.length < 3) {
      setProfileError(
        'Username minimal 3 karakter.'
      );
      return;
    }

    if (username.length > 30) {
      setProfileError(
        'Username maksimal 30 karakter.'
      );
      return;
    }

    if (displayName.length > 50) {
      setProfileError(
        'Nama tampilan maksimal 50 karakter.'
      );
      return;
    }

    if (bio.length > 300) {
      setProfileError(
        'Bio maksimal 300 karakter.'
      );
      return;
    }

    setSavingProfile(true);
    setProfileError('');

    try {
      let avatarUrl =
        displayProfile.avatar_url;

      // Upload foto baru
      if (selectedAvatar) {
        avatarUrl =
          await uploadAvatar(
            selectedAvatar
          );
      }

      // Update seluruh data profile
      const {
        error,
      } = await supabase
        .from('profiles')
        .update({
          username,
          display_name:
            displayName || null,
          bio: bio || null,
          avatar_url:
            avatarUrl || null,
        })
        .eq(
          'id',
          user.id
        );

      if (error) {
        throw error;
      }

      await refreshProfile();

      if (
        avatarPreview &&
        selectedAvatar
      ) {
        URL.revokeObjectURL(
          avatarPreview
        );
      }

      setSelectedAvatar(null);
      setAvatarPreview('');
      setShowEditProfile(false);
    } catch (error) {
      console.error(
        'Failed to update profile:',
        error
      );

      setProfileError(
        error instanceof Error
          ? error.message
          : 'Gagal memperbarui profile.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  // ============================================================
  // OPEN NOVEL FORM
  // ============================================================

  const openNovelForm = () => {
    setNovelError('');

    setNovelForm({
      title: '',
      description: '',
      author:
        displayProfile.display_name ||
        displayProfile.username,
    });

    setShowNovelForm(true);
  };

  // ============================================================
  // CLOSE NOVEL FORM
  // ============================================================

  const closeNovelForm = () => {
    if (savingNovel) {
      return;
    }

    setShowNovelForm(false);
    setNovelError('');
  };

  // ============================================================
  // CREATE NOVEL
  // ============================================================

  const handleCreateNovel = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    const title =
      novelForm.title.trim();

    const description =
      novelForm.description.trim();

    const author =
      novelForm.author.trim() ||
      displayProfile.username;

    if (!title) {
      setNovelError(
        'Judul novel wajib diisi.'
      );
      return;
    }

    if (!description) {
      setNovelError(
        'Deskripsi novel wajib diisi.'
      );
      return;
    }

    setSavingNovel(true);
    setNovelError('');

    try {
      const slug =
        slugify(title);

      // Cek slug
      const {
        data: existingNovel,
        error: slugCheckError,
      } = await supabase
        .from('novels')
        .select('id')
        .eq(
          'slug',
          slug
        )
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
      const {
        data: createdNovel,
        error: createError,
      } = await supabase
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
        throw new Error(
          'Novel gagal dibuat.'
        );
      }

      // Reader menjadi author
      if (
        displayProfile.role ===
        'reader'
      ) {
        const {
          error: roleError,
        } = await supabase
          .from('profiles')
          .update({
            role: 'author',
          })
          .eq(
            'id',
            user.id
          );

        if (roleError) {
          console.error(
            'Novel berhasil dibuat tetapi role gagal diubah:',
            roleError
          );
        }
      }

      await refreshProfile();

      setShowNovelForm(false);

      navigate(
        `/novel/${createdNovel.slug}`
      );
    } catch (error) {
      console.error(
        'Failed to create novel:',
        error
      );

      setNovelError(
        error instanceof Error
          ? error.message
          : 'Gagal membuat novel. Silakan coba lagi.'
      );
    } finally {
      setSavingNovel(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-8 pb-24">

      {/* ======================================================
          PROFILE HEADER
      ======================================================= */}

      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">

          {/* Avatar */}
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 overflow-hidden">

            {displayProfile.avatar_url ? (
              <img
                src={
                  displayProfile.avatar_url
                }
                alt={
                  displayProfile.username
                }
                className="h-full w-full object-cover"
              />
            ) : (
              displayProfile
                .username[0]
                ?.toUpperCase()
            )}

          </div>

          {/* Profile Info */}
          <div className="flex-1 text-center sm:text-left">

            <h1 className="text-xl font-bold text-white">
              {displayProfile.display_name ||
                displayProfile.username}
            </h1>

            <p className="text-sm text-muted mt-1">
              @{displayProfile.username}
            </p>

            <p className="text-sm text-muted mt-1">
              {displayProfile.email}
            </p>

            {displayProfile.bio && (
              <p className="text-sm text-muted mt-3 leading-relaxed">
                {displayProfile.bio}
              </p>
            )}

            <button
              type="button"
              onClick={
                openEditProfile
              }
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

                Member sejak{' '}

                {formatDate(
                  displayProfile.created_at
                )}
              </span>

            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          DASHBOARD ADMIN
      ======================================================= */}

      {isAdmin && (
        <Link
          to="/admin"
          className="card p-4 mb-6 flex items-center gap-3 hover:bg-white/5 transition-colors group"
        >
          <Shield className="h-5 w-5 text-primary-400" />

          <span className="flex-1 text-sm text-white">
            Dashboard Admin
          </span>

          <ChevronRight className="h-4 w-4 text-muted group-hover:text-primary-300" />
        </Link>
      )}

      {/* ======================================================
          DASHBOARD PENULIS
      ======================================================= */}

      {(isAuthor || isAdmin) && (
        <Link
          to="/author"
          className="card p-4 mb-6 flex items-center gap-3 hover:bg-white/5 transition-colors group"
        >
          <PenLine className="h-5 w-5 text-primary-400" />

          <span className="flex-1 text-sm text-white">
            Dashboard Penulis
          </span>

          <ChevronRight className="h-4 w-4 text-muted group-hover:text-primary-300" />
        </Link>
      )}

      {/* ======================================================
          TULIS NOVEL
      ======================================================= */}

      {isReader && (
        <button
          type="button"
          onClick={
            openNovelForm
          }
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
              Buat novel pertamamu dan
              menjadi author.
            </p>

          </div>

          <ChevronRight className="h-5 w-5 text-muted group-hover:text-primary-300" />
        </button>
      )}

      {/* ======================================================
          STATISTICS
      ======================================================= */}

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

      {/* ======================================================
          MENU
      ======================================================= */}

      <div className="card divide-y divide-white/5 mb-6">

        {menuItems.map(
          (item) => {
            const Icon =
              item.icon;

            return (
              <Link
                key={
                  item.label
                }
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
          }
        )}

      </div>

      {/* ======================================================
          LOGOUT
      ======================================================= */}

      <button
        type="button"
        onClick={() =>
          void signOut()
        }
        className="btn w-full bg-red-500/10 text-red-400 hover:bg-red-500/20 px-5 py-3 text-sm"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>

      {/* ======================================================
          MODAL EDIT PROFILE
      ======================================================= */}

      {showEditProfile && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={
            closeEditProfile
          }
        >

          <div
            className="
              card
              w-full
              sm:max-w-lg
              max-h-[calc(100dvh-1rem)]
              sm:max-h-[90vh]
              overflow-hidden
              rounded-t-3xl
              sm:rounded-2xl
              flex
              flex-col
            "
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-white/10">

              <div>
                <h2 className="text-lg font-semibold text-white">
                  Edit Profile
                </h2>

                <p className="text-xs text-muted mt-1">
                  Perbarui informasi
                  profile kamu.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeEditProfile
                }
                disabled={
                  savingProfile
                }
                aria-label="Tutup"
                className="
                  h-9
                  w-9
                  rounded-full
                  bg-white/5
                  flex
                  items-center
                  justify-center
                  text-muted
                  hover:text-white
                  hover:bg-white/10
                  transition-colors
                  disabled:opacity-50
                "
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 pb-8">

              {profileError && (
                <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-sm text-red-400">
                    {profileError}
                  </p>
                </div>
              )}

              <form
                onSubmit={
                  handleUpdateProfile
                }
                className="space-y-5"
              >

                {/* Avatar */}
                <div className="flex flex-col items-center">

                  <div className="relative">

                    <div className="h-24 w-24 rounded-full overflow-hidden bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl font-bold text-white">

                      {avatarPreview ? (
                        <img
                          src={
                            avatarPreview
                          }
                          alt="Preview profile"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        displayProfile
                          .username[0]
                          ?.toUpperCase()
                      )}

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        avatarInputRef.current?.click()
                      }
                      disabled={
                        savingProfile
                      }
                      className="
                        absolute
                        bottom-0
                        right-0
                        h-9
                        w-9
                        rounded-full
                        bg-primary
                        text-white
                        flex
                        items-center
                        justify-center
                        shadow-lg
                        hover:bg-primary-600
                        transition-colors
                        disabled:opacity-50
                      "
                      aria-label="Ubah foto profile"
                    >
                      <Camera className="h-4 w-4" />
                    </button>

                  </div>

                  <input
                    ref={
                      avatarInputRef
                    }
                    type="file"
                    accept="image/*"
                    onChange={
                      handleAvatarChange
                    }
                    className="hidden"
                    disabled={
                      savingProfile
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      avatarInputRef.current?.click()
                    }
                    disabled={
                      savingProfile
                    }
                    className="text-sm text-primary-300 hover:text-primary-200 mt-3"
                  >
                    Ganti Foto
                  </button>

                  <p className="text-xs text-muted mt-1 text-center">
                    JPG, PNG, WEBP • Maksimal 10 MB
                  </p>

                </div>

                {/* Username */}
                <div>

                  <label className="text-sm text-white mb-1.5 block">
                    Username
                  </label>

                  <input
                    type="text"
                    value={
                      editUsername
                    }
                    onChange={(event) =>
                      setEditUsername(
                        event.target.value
                      )
                    }
                    placeholder="Masukkan username"
                    className="input w-full"
                    disabled={
                      savingProfile
                    }
                    required
                  />

                </div>

                {/* Display Name */}
                <div>

                  <label className="text-sm text-white mb-1.5 block">
                    Nama Tampilan
                  </label>

                  <input
                    type="text"
                    value={
                      editDisplayName
                    }
                    onChange={(event) =>
                      setEditDisplayName(
                        event.target.value
                      )
                    }
                    placeholder="Nama yang ditampilkan"
                    className="input w-full"
                    disabled={
                      savingProfile
                    }
                    maxLength={50}
                  />

                </div>

                {/* Email */}
                <div>

                  <label className="text-sm text-white mb-1.5 block">
                    Email
                  </label>

                  <input
                    type="email"
                    value={
                      displayProfile.email
                    }
                    className="input w-full opacity-60 cursor-not-allowed"
                    disabled
                  />

                  <p className="text-xs text-muted mt-1">
                    Email tidak dapat
                    diubah.
                  </p>

                </div>

                {/* Bio */}
                <div>

                  <div className="flex items-center justify-between mb-1.5">

                    <label className="text-sm text-white">
                      Bio
                    </label>

                    <span className="text-xs text-muted">
                      {editBio.length}/300
                    </span>

                  </div>

                  <textarea
                    value={
                      editBio
                    }
                    onChange={(event) =>
                      setEditBio(
                        event.target.value
                      )
                    }
                    placeholder="Ceritakan sedikit tentang dirimu..."
                    className="input w-full min-h-[110px] resize-none"
                    disabled={
                      savingProfile
                    }
                    maxLength={300}
                  />

                </div>

                {/* Save */}
                <div className="pt-1 pb-2">

                  <button
                    type="submit"
                    disabled={
                      savingProfile
                    }
                    className="btn-primary w-full py-3"
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

                </div>

              </form>

            </div>

          </div>

        </div>
      )}

      {/* ======================================================
          MODAL TULIS NOVEL
      ======================================================= */}

      {showNovelForm && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={
            closeNovelForm
          }
        >

          <div
            className="
              card
              w-full
              sm:max-w-lg
              max-h-[calc(100dvh-1rem)]
              sm:max-h-[90vh]
              overflow-hidden
              rounded-t-3xl
              sm:rounded-2xl
              flex
              flex-col
            "
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-white/10">

              <div>
                <h2 className="text-lg font-semibold text-white">
                  Tulis Novel
                </h2>

                <p className="text-xs text-muted mt-1">
                  Mulai membuat novel baru
                  di Semesta Novel.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeNovelForm
                }
                disabled={
                  savingNovel
                }
                aria-label="Tutup"
                className="
                  h-9
                  w-9
                  rounded-full
                  bg-white/5
                  flex
                  items-center
                  justify-center
                  text-muted
                  hover:text-white
                  hover:bg-white/10
                  transition-colors
                  disabled:opacity-50
                "
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            {/* Scroll Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 pb-8">

              {/* Info Reader */}
              {isReader && (
                <div className="mb-5 rounded-xl bg-primary/10 border border-primary/20 p-4">

                  <p className="text-sm font-medium text-primary-300">
                    🚀 Mulai menjadi Author
                  </p>

                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Setelah novel berhasil
                    dibuat, role akunmu
                    otomatis berubah dari{' '}
                    <strong>
                      reader
                    </strong>{' '}
                    menjadi{' '}
                    <strong>
                      author
                    </strong>.
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
                onSubmit={
                  handleCreateNovel
                }
                className="space-y-5"
              >

                {/* Title */}
                <div>

                  <label className="text-sm text-white mb-1.5 block">
                    Judul Novel
                  </label>

                  <input
                    type="text"
                    value={
                      novelForm.title
                    }
                    onChange={(event) =>
                      setNovelForm({
                        ...novelForm,
                        title:
                          event.target.value,
                      })
                    }
                    placeholder="Masukkan judul novel"
                    className="input w-full"
                    required
                    disabled={
                      savingNovel
                    }
                  />

                </div>

                {/* Author */}
                <div>

                  <label className="text-sm text-white mb-1.5 block">
                    Nama Penulis
                  </label>

                  <input
                    type="text"
                    value={
                      novelForm.author
                    }
                    onChange={(event) =>
                      setNovelForm({
                        ...novelForm,
                        author:
                          event.target.value,
                      })
                    }
                    placeholder="Nama penulis"
                    className="input w-full"
                    required
                    disabled={
                      savingNovel
                    }
                  />

                  <p className="text-xs text-muted mt-1">
                    Nama ini akan
                    ditampilkan sebagai
                    penulis novel.
                  </p>

                </div>

                {/* Description */}
                <div>

                  <label className="text-sm text-white mb-1.5 block">
                    Deskripsi
                  </label>

                  <textarea
                    value={
                      novelForm.description
                    }
                    onChange={(event) =>
                      setNovelForm({
                        ...novelForm,
                        description:
                          event.target.value,
                      })
                    }
                    placeholder="Ceritakan sedikit tentang novel ini..."
                    className="input w-full min-h-[130px] resize-none"
                    required
                    disabled={
                      savingNovel
                    }
                  />

                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={
                    savingNovel
                  }
                  className="btn-primary w-full py-3"
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

        </div>
      )}

    </div>
  );
}