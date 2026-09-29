import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, ensureAuthSession } from './config';
import { AdminUser } from '../types';

interface AuthContextType {
  user: User | null;
  adminProfile: AdminUser | null;
  role: 'owner' | 'editor' | 'viewer' | 'customer' | null;
  isAdmin: boolean;
  isOwner: boolean;
  isEditor: boolean;
  loading: boolean;
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
  switchRole: () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminUser | null>(null);
  const [mockRole, setMockRole] = useState<'owner' | 'editor' | 'viewer' | 'customer' | null>(() => {
    return (localStorage.getItem('zejesh_demo_role') as any) || 'owner';
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
      } else {
        setAdminProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const switchRole = (newRole: 'owner' | 'editor' | 'viewer' | 'customer') => {
    setMockRole(newRole);
    localStorage.setItem('zejesh_demo_role', newRole);
    if (newRole === 'owner') {
      setAdminProfile({
        id: 'admin-owner',
        uid: 'demo-owner',
        email: 'owner@zejesh.fi',
        name: 'Zejesh Studio Principal (Owner)',
        role: 'owner',
      });
    } else if (newRole === 'editor') {
      setAdminProfile({
        id: 'admin-editor',
        uid: 'demo-editor',
        email: 'merchandiser@zejesh.fi',
        name: 'Studio Merchandiser (Editor)',
        role: 'editor',
      });
    } else if (newRole === 'viewer') {
      setAdminProfile({
        id: 'admin-viewer',
        uid: 'demo-viewer',
        email: 'intern@zejesh.fi',
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
      localStorage.removeItem('zejesh_demo_role');
      setAdminProfile(null);
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
        switchRole,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
