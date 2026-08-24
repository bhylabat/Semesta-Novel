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
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const AUTH_REQUEST_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} timed out`)), AUTH_REQUEST_TIMEOUT_MS);
    }),
  ]);
}

function getAuthRole(user: User): UserRole {
  const role = user.app_metadata?.role;
  return role === 'admin' || role === 'author' || role === 'reader' ? role : 'reader';
}

async function loadOrCreateProfile(user: User): Promise<Profile | null> {
  const existingProfile = await fetchProfile(user.id);
  if (existingProfile) return existingProfile;

  const profile: Profile = {
    id: user.id,
    username: user.email?.split('@')[0] || 'Pembaca',
    email: user.email || '',
    avatar_url: null,
    role: getAuthRole(user),
    created_at: user.created_at,
  };

  try {
    await createProfile(profile.id, profile.email, profile.username, profile.role);
    return profile;
  } catch (error) {
    console.error('Failed to create missing profile:', error);
    return profile;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
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
        const { data } = await withTimeout(supabase.auth.getSession(), 'Supabase session request');
        if (!mounted) return;

        setSession(data.session);
        if (data.session?.user) {
          try {
            const p = await withTimeout(loadOrCreateProfile(data.session.user), 'Profile request');
            if (mounted) setProfile(p);
          } catch (error) {
            console.error('Failed to load profile:', error);
            if (mounted) setProfile(null);
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
        if (mounted) {
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      void (async () => {
        if (!mounted) return;
        setSession(newSession);
        try {
          if (newSession?.user) {
            const p = await withTimeout(loadOrCreateProfile(newSession.user), 'Profile request');
            if (mounted) setProfile(p);
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error('Failed to update authentication state:', error);
          if (mounted) setProfile(null);
        } finally {
          if (mounted) setLoading(false);
        }
      })();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) return { error: 'Supabase belum dikonfigurasi' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signUp = async (email: string, password: string, username: string) => {
    if (!isSupabaseConfigured) return { error: 'Supabase belum dikonfigurasi' };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      await createProfile(data.user.id, email, username);
    }
    return { error: null };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (session?.user) {
      const p = await fetchProfile(session.user.id);
      setProfile(p);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user || null, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

