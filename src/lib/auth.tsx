import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type {
  Session,
  User,
} from '@supabase/supabase-js';

import {
  supabase,
  isSupabaseConfigured,
} from './supabase';

import {
  fetchProfile,
  createProfile,
} from './services';

import type { Profile } from '@/types';

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

export const AuthContext =
  createContext<AuthContextValue | undefined>(
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
      const timer = window.setTimeout(() => {
        reject(
          new Error(`${label} timed out`)
        );
      }, AUTH_REQUEST_TIMEOUT_MS);

      void timer;
    }),
  ]);
}

/**
 * Ambil profile user.
 *
 * Jika profile belum ada, buat sebagai reader.
 */
async function loadOrCreateProfile(
  user: User
): Promise<Profile | null> {
  try {
    const existingProfile =
      await fetchProfile(user.id);

    if (existingProfile) {
      return existingProfile;
    }

    const username =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.user_metadata?.user_name ||
      user.email?.split('@')[0] ||
      'Pembaca';

    const avatarUrl =
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      null;

    await createProfile(
      user.id,
      user.email || '',
      username,
      'reader'
    );

    const createdProfile =
      await fetchProfile(user.id);

    return (
      createdProfile || {
        id: user.id,
        username,
        email: user.email || '',
        avatar_url: avatarUrl,
        role: 'reader',
        created_at: user.created_at,
      }
    );
  } catch (error) {
    console.error(
      'Gagal mengambil profile:',
      error
    );

    return null;
  }
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] =
    useState<Session | null>(null);

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;

    /**
     * Memuat profile setelah session tersedia.
     */
    const loadProfile = async (
      user: User
    ) => {
      try {
        const currentProfile =
          await withTimeout(
            loadOrCreateProfile(user),
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
    };

    /**
     * Inisialisasi session dari Supabase.
     *
     * getSession() membaca session yang sudah
     * disimpan oleh Supabase di browser.
     */
    const initializeAuth = async () => {
      try {
        const {
          data,
          error,
        } = await withTimeout(
          supabase.auth.getSession(),
          'Supabase session request'
        );

        if (!mounted) return;

        if (error) {
          console.error(
            'Supabase getSession error:',
            error
          );

          setSession(null);
          setProfile(null);
          return;
        }

        const currentSession =
          data.session;

        setSession(currentSession);

        if (currentSession?.user) {
          await loadProfile(
            currentSession.user
          );
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

    /**
     * Dengarkan perubahan session:
     *
     * SIGNED_IN
     * SIGNED_OUT
     * TOKEN_REFRESHED
     * USER_UPDATED
     */
    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        (event, newSession) => {
          if (!mounted) return;

          setSession(newSession);

          if (!newSession?.user) {
            setProfile(null);
            setLoading(false);
            return;
          }

          /**
           * Jangan melakukan query Supabase
           * langsung di callback auth.
           *
           * Jalankan setelah callback selesai
           * untuk menghindari deadlock/race condition.
           */
          window.setTimeout(() => {
            if (!mounted) return;

            void loadProfile(
              newSession.user
            ).finally(() => {
              if (mounted) {
                setLoading(false);
              }
            });
          }, 0);
        }
      );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  /**
   * LOGIN EMAIL + PASSWORD
   */
  const signIn = async (
    email: string,
    password: string
  ) => {
    if (!isSupabaseConfigured) {
      return {
        error:
          'Supabase belum dikonfigurasi',
      };
    }

    const {
      error,
    } =
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
   * LOGIN GOOGLE
   */
  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      return {
        error:
          'Supabase belum dikonfigurasi',
      };
    }

    const {
      error,
    } =
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo:
            window.location.origin,
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
   * REGISTER
   */
  const signUp = async (
    email: string,
    password: string,
    username: string
  ) => {
    if (!isSupabaseConfigured) {
      return {
        error:
          'Supabase belum dikonfigurasi',
      };
    }

    void username;

    const {
      error,
    } =
      await supabase.auth.signUp({
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
   * LOGOUT
   */
  const signOut = async () => {
    if (!isSupabaseConfigured) {
      return;
    }

    const {
      error,
    } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        'Failed to sign out:',
        error
      );
    }

    setProfile(null);
    setSession(null);
  };

  /**
   * REFRESH PROFILE
   */
  const refreshProfile = async () => {
    if (!session?.user) {
      setProfile(null);
      return;
    }

    try {
      const latestProfile =
        await withTimeout(
          fetchProfile(
            session.user.id
          ),
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
        user:
          session?.user || null,
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