import { createContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { fetchProfile, createProfile } from './services';
import type { Profile, UserRole } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;

  signInWithGoogle: () => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    username: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

const AUTH_REQUEST_TIMEOUT_MS = 10000;

function withTimeout<T>(
  promise: Promise<T>,
  label: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(`${label} timed out`));
      }, AUTH_REQUEST_TIMEOUT_MS);
    }),
  ]);
}

function getAuthRole(user: User): UserRole {
  const role = user.app_metadata?.role;

  if (
    role === 'admin' ||
    role === 'author' ||
    role === 'reader'
  ) {
    return role;
  }

  return 'reader';
}

/**
 * Ambil profile dari database.
 * Jika belum ada, buat profile baru sebagai reader.
 */
async function loadOrCreateProfile(
  user: User
): Promise<Profile | null> {
  try {
    // Selalu ambil profile terbaru dari database terlebih dahulu.
    const existingProfile = await fetchProfile(user.id);

    if (existingProfile) {
      console.log('PROFILE DARI DATABASE:', existingProfile);
      return existingProfile;
    }

    // Ambil nama dari akun Google.
    const googleName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.user_metadata?.user_name ||
      user.email?.split('@')[0] ||
      'Pembaca';

    const avatarUrl =
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      null;

    // Jika profile belum ada, buat profile baru.
    const newProfile: Profile = {
      id: user.id,
      username: googleName,
      email: user.email || '',
      avatar_url: avatarUrl,
      role: 'reader',
      created_at: user.created_at,
    };

    await createProfile(
      newProfile.id,
      newProfile.email,
      newProfile.username,
      newProfile.role
    );

    // Ambil kembali profile yang benar-benar tersimpan di database.
    const createdProfile = await fetchProfile(user.id);

    return createdProfile ?? newProfile;
  } catch (error) {
    console.error('Gagal mengambil profile:', error);
    return null;
  }
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          'Supabase session request'
        );

        if (!mounted) return;

        const currentSession = data.session;

        setSession(currentSession);

        if (currentSession?.user) {
          try {
            const currentProfile = await withTimeout(
              loadOrCreateProfile(currentSession.user),
              'Profile request'
            );

            if (mounted) {
              setProfile(currentProfile);
            }
          } catch (error) {
            console.error(
              'Failed to load profile:',
              error
            );

            if (mounted) {
              setProfile(null);
            }
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error(
          'Failed to initialize authentication:',
          error
        );

        if (mounted) {
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void initializeAuth();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        void (async () => {
          if (!mounted) return;

          setSession(newSession);

          try {
            if (newSession?.user) {
              const currentProfile =
                await withTimeout(
                  loadOrCreateProfile(newSession.user),
                  'Profile request'
                );

              if (mounted) {
                setProfile(currentProfile);
              }
            } else {
              setProfile(null);
            }
          } catch (error) {
            console.error(
              'Failed to update authentication state:',
              error
            );

            if (mounted) {
              setProfile(null);
            }
          } finally {
            if (mounted) {
              setLoading(false);
            }
          }
        })();
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  /**
   * Login
   */
  const signIn = async (
    email: string,
    password: string
  ) => {
    if (!isSupabaseConfigured) {
      return {
        error: 'Supabase belum dikonfigurasi',
      };
    }

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      return {
        error: error.message,
      };
    }

    return {
      error: null,
    };
  };

  /**
   * Login dengan Google
   */
  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      return {
        error: 'Supabase belum dikonfigurasi',
      };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      return {
        error: error.message,
      };
    }

    return {
      error: null,
    };
  };

  /**
   * Registrasi
   * Profile dibuat otomatis oleh database trigger.
   */
  const signUp = async (
    email: string,
    password: string,
    _username: string
  ) => {
    if (!isSupabaseConfigured) {
      return {
        error: 'Supabase belum dikonfigurasi',
      };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return {
        error: error.message,
      };
    }

    return {
      error: null,
    };
  };

  /**
   * Logout
   */
  const signOut = async () => {
    if (!isSupabaseConfigured) return;

    await supabase.auth.signOut();

    setProfile(null);
    setSession(null);
  };

  /**
   * Ambil ulang profile TERBARU dari Supabase.
   */
  const refreshProfile = async () => {
    if (!session?.user) {
      setProfile(null);
      return;
    }

    try {
      const latestProfile = await withTimeout(
        fetchProfile(session.user.id),
        'Profile refresh request'
      );

      setProfile(latestProfile);
    } catch (error) {
      console.error(
        'Failed to refresh profile:',
        error
      );
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || null,
        profile,
        loading,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}