import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, ensureAuthSession } from './config';
import { AdminUser } from '../types';

export const PRIMARY_ADMIN_EMAIL = 'huxaifa0fficial@gmail.com';

interface AuthContextType {
  user: User | null;
  adminProfile: AdminUser | null;
  role: 'owner' | 'editor' | 'viewer' | 'customer' | null;
  isAdmin: boolean;
  isOwner: boolean;
  isEditor: boolean;
  loading: boolean;
  loginAsPrimaryAdmin: () => void;
  switchRole: (role: 'owner' | 'editor' | 'viewer' | 'customer') => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  adminProfile: null,
  role: null,
  isAdmin: false,
  isOwner: false,
  isEditor: false,
  loading: true,
  loginAsPrimaryAdmin: () => {},
  switchRole: () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminUser | null>(() => {
    // Check if session token exists
    const sessionEmail = typeof window !== 'undefined' ? sessionStorage.getItem('zejesh_admin_session_email') : null;
    if (sessionEmail && sessionEmail.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      return {
        id: 'admin-owner',
        uid: 'huxaifa0fficial-owner',
        email: PRIMARY_ADMIN_EMAIL,
        name: 'Huxaifa (Principal & Owner)',
        role: 'owner',
      };
    }
    return null;
  });

  const [mockRole, setMockRole] = useState<'owner' | 'editor' | 'viewer' | 'customer' | null>(() => {
    const sessionEmail = typeof window !== 'undefined' ? sessionStorage.getItem('zejesh_admin_session_email') : null;
    if (sessionEmail && sessionEmail.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      return 'owner';
    }
    return 'customer';
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureAuthSession().catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
          if (adminDoc.exists()) {
            setAdminProfile(adminDoc.data() as AdminUser);
          }
        } catch {
          // Ignore offline errors
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginAsPrimaryAdmin = () => {
    const profile: AdminUser = {
      id: 'admin-owner',
      uid: 'huxaifa0fficial-owner',
      email: PRIMARY_ADMIN_EMAIL,
      name: 'Huxaifa (Principal & Owner)',
      role: 'owner',
    };
    setAdminProfile(profile);
    setMockRole('owner');
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('zejesh_admin_session_auth', 'authenticated');
      sessionStorage.setItem('zejesh_admin_session_email', PRIMARY_ADMIN_EMAIL);
      sessionStorage.setItem('zejesh_sec_unlocked_ts', Date.now().toString());
    }
  };

  const switchRole = (newRole: 'owner' | 'editor' | 'viewer' | 'customer') => {
    setMockRole(newRole);
    if (newRole === 'owner') {
      setAdminProfile({
        id: 'admin-owner',
        uid: 'huxaifa0fficial-owner',
        email: PRIMARY_ADMIN_EMAIL,
        name: 'Huxaifa (Principal & Owner)',
        role: 'owner',
      });
    } else if (newRole === 'editor') {
      setAdminProfile({
        id: 'admin-editor',
        uid: 'demo-editor',
        email: 'editor@zejesh.com',
        name: 'Studio Merchandiser (Editor)',
        role: 'editor',
      });
    } else if (newRole === 'viewer') {
      setAdminProfile({
        id: 'admin-viewer',
        uid: 'demo-viewer',
        email: 'viewer@zejesh.com',
        name: 'Archival Trainee (Viewer)',
        role: 'viewer',
      });
    } else {
      setAdminProfile(null);
    }
  };

  const effectiveRole = adminProfile?.role || mockRole || 'customer';
  const isOwner = effectiveRole === 'owner';
  const isEditor = effectiveRole === 'editor' || isOwner;
  const isAdmin = effectiveRole === 'owner' || effectiveRole === 'editor' || effectiveRole === 'viewer';

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setMockRole('customer');
      setAdminProfile(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('zejesh_admin_session_auth');
        sessionStorage.removeItem('zejesh_admin_session_email');
        sessionStorage.removeItem('zejesh_sec_unlocked_ts');
      }
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        adminProfile,
        role: effectiveRole,
        isAdmin,
        isOwner,
        isEditor,
        loading,
        loginAsPrimaryAdmin,
        switchRole,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
