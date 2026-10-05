import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './config';
import { AdminUser } from '../types';

export const PRIMARY_ADMIN_EMAIL = 'huxaifa0fficial@gmail.com';

export type AdminRole = 'owner' | 'editor' | 'viewer';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  adminProfile: AdminUser | null;
  role: AdminRole | null;
  isAdmin: boolean;
  isOwner: boolean;
  isEditor: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  adminProfile: null,
  role: null,
  isAdmin: false,
  isOwner: false,
  isEditor: false,
  loading: true,
  signIn: async () => ({ success: false }),
  signOut: async () => {},
  changePassword: async () => ({ success: false }),
});

/**
 * Loads the caller's administrative role from `public.admins`.
 *
 * The row is only visible when Row Level Security's `admin_read` policy passes,
 * i.e. only when the JWT already belongs to an administrator. Returning null
 * for everyone else is therefore authoritative — the client cannot fake it.
 */
async function loadAdminProfile(user: User): Promise<AdminUser | null> {
  try {
    const email = user.email?.toLowerCase();
    if (!email) return null;

    // The table is tiny (and RLS already hides it from non-administrators),
    // so match case-insensitively in JS instead of relying on `eq`.
    const { data, error } = await supabase.from('admins').select('*');
    if (error || !Array.isArray(data)) return null;

    const row = data.find(
      (r: { email?: string | null }) => (r.email || '').toLowerCase() === email
    ) as { id?: string; uid?: string; email: string; name: string; role: string } | undefined;

    if (!row) return null;

    const role = row.role as AdminRole;
    if (role !== 'owner' && role !== 'editor' && role !== 'viewer') return null;

    return {
      id: row.id || row.uid || user.id,
      uid: row.uid || user.id,
      email: row.email,
      name: row.name,
      role,
    };
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback(async (next: Session | null) => {
    setSession(next);
    setUser(next?.user ?? null);
    setAdminProfile(next?.user ? await loadAdminProfile(next.user) : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data: { session: initial } }) => {
        if (!cancelled) void applySession(initial);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!cancelled) void applySession(next);
    });

    // Clear legacy Firebase-era session flags so stale storage cannot be
    // mistaken for an authenticated session.
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('zejesh_admin_session_auth');
      sessionStorage.removeItem('zejesh_admin_session_email');
    }

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed || !password) {
        return { success: false, error: 'Please enter both email and password.' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });

      if (error) {
        return { success: false, error: 'Invalid email or password.' };
      }

      const profile = await loadAdminProfile(data.user);
      if (!profile) {
        // Credentials were valid but this account has no administrative role.
        await supabase.auth.signOut();
        return { success: false, error: 'This account has no administrative access.' };
      }

      setSession(data.session);
      setUser(data.user);
      setAdminProfile(profile);
      return { success: true };
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setSession(null);
      setUser(null);
      setAdminProfile(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('zejesh_admin_session_auth');
        sessionStorage.removeItem('zejesh_admin_session_email');
        sessionStorage.removeItem('zejesh_sec_unlocked_ts');
      }
    }
  }, []);

  const changePassword = useCallback(
    async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
      if (!newPassword || newPassword.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters.' };
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { success: false, error: error.message };
      return { success: true };
    },
    []
  );

  const role: AdminRole | null = adminProfile?.role ?? null;
  const isOwner = role === 'owner';
  const isEditor = role === 'owner' || role === 'editor';
  const isAdmin = role !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        adminProfile,
        role,
        isAdmin,
        isOwner,
        isEditor,
        loading,
        signIn,
        signOut,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
