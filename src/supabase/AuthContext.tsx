import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './config';
import { AdminUser } from '../types';

export type AdminRole = 'owner' | 'editor' | 'viewer';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  adminProfile: AdminUser | null;
  role: AdminRole | null;
  isAdmin: boolean;
  isOwner: boolean;
  isEditor: boolean;
  isAal2: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresMfa?: boolean }>;
  verifyMfaCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  enrollMfa: () => Promise<{ success: boolean; id?: string; qrCode?: string; secret?: string; error?: string }>;
  unenrollMfa: (factorId: string) => Promise<{ success: boolean; error?: string }>;
  listMfaFactors: () => Promise<any[]>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  adminProfile: null,
  role: null,
  isAdmin: false,
  isOwner: false,
  isEditor: false,
  isAal2: false,
  loading: true,
  signIn: async () => ({ success: false }),
  verifyMfaCode: async () => ({ success: false }),
  signOut: async () => {},
  changePassword: async () => ({ success: false }),
  enrollMfa: async () => ({ success: false }),
  unenrollMfa: async () => ({ success: false }),
  listMfaFactors: async () => [],
});

/**
 * Loads the caller's administrative role from `public.admins`.
 *
 * RLS hides public.admins from all non-owner calls. Returning null for everyone
 * else is authoritative — the client cannot fake it.
 */
async function loadAdminProfile(user: User): Promise<AdminUser | null> {
  try {
    const email = user.email?.toLowerCase();
    if (!email) return null;

    const { data, error } = await supabase.from('admins').select('*');
    if (error || !Array.isArray(data)) return null;

    const row = data.find(
      (r: { email?: string | null }) => (r.email || '').toLowerCase() === email
    ) as { id?: string; uid?: string; email: string; name: string; role: string } | undefined;

    if (!row) return null;

    const role = row.role as AdminRole;
    // Strict requirement: Only 'owner' is permitted administrative access
    if (role !== 'owner') return null;

    return {
      id: row.id || row.uid || user.id,
      uid: row.uid || user.id,
      email: row.email,
      name: row.name,
      role: 'owner',
    };
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminUser | null>(null);
  const [isAal2, setIsAal2] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAalStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!error && data) {
        setIsAal2(data.currentLevel === 'aal2');
        return data;
      }
    } catch {
      // Ignore
    }
    setIsAal2(false);
    return null;
  }, []);

  const applySession = useCallback(async (next: Session | null) => {
    setSession(next);
    setUser(next?.user ?? null);
    if (next?.user) {
      const profile = await loadAdminProfile(next.user);
      setAdminProfile(profile);
      await checkAalStatus();
    } else {
      setAdminProfile(null);
      setIsAal2(false);
    }
    setLoading(false);
  }, [checkAalStatus]);

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
    async (
      email: string,
      password: string
    ): Promise<{ success: boolean; error?: string; requiresMfa?: boolean }> => {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed || !password) {
        return { success: false, error: 'Invalid email or password.' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });

      if (error) {
        return { success: false, error: 'Invalid email or password.' };
      }

      const profile = await loadAdminProfile(data.user);
      if (!profile || profile.role !== 'owner') {
        // Unconditionally sign out and return generic error
        await supabase.auth.signOut();
        return { success: false, error: 'Invalid email or password.' };
      }

      // Check if MFA is required
      const aal = await checkAalStatus();
      const requiresMfa = Boolean(aal && aal.currentLevel === 'aal1' && aal.nextLevel === 'aal2');

      setSession(data.session);
      setUser(data.user);
      setAdminProfile(profile);

      return { success: true, requiresMfa };
    },
    [checkAalStatus]
  );

  const verifyMfaCode = useCallback(
    async (code: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError || !factors.totp || factors.totp.length === 0) {
          return { success: false, error: 'No MFA factor configured.' };
        }

        const factor = factors.totp[0];
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: factor.id,
        });

        if (challengeError || !challengeData) {
          return { success: false, error: 'Invalid authenticator code.' };
        }

        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId: factor.id,
          challengeId: challengeData.id,
          code: code.trim(),
        });

        if (verifyError) {
          return { success: false, error: 'Invalid authenticator code.' };
        }

        await checkAalStatus();
        return { success: true };
      } catch {
        return { success: false, error: 'Verification failed. Please try again.' };
      }
    },
    [checkAalStatus]
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
      setIsAal2(false);
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

  const enrollMfa = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });
      if (error || !data) {
        return { success: false, error: error?.message || 'Failed to enroll MFA' };
      }
      return {
        success: true,
        id: data.id,
        qrCode: data.totp?.qr_code,
        secret: data.totp?.secret,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'MFA enrollment failed' };
    }
  }, []);

  const unenrollMfa = useCallback(async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) return { success: false, error: error.message };
      await checkAalStatus();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to remove MFA' };
    }
  }, [checkAalStatus]);

  const listMfaFactors = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error || !data) return [];
      return data.totp || [];
    } catch {
      return [];
    }
  }, []);

  // Absolute Owner-only model: only role === 'owner' is recognized as admin
  const isOwner = adminProfile?.role === 'owner';
  const isEditor = isOwner;
  const isAdmin = isOwner;
  const role: AdminRole | null = isOwner ? 'owner' : null;

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
        isAal2,
        loading,
        signIn,
        verifyMfaCode,
        signOut,
        changePassword,
        enrollMfa,
        unenrollMfa,
        listMfaFactors,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
