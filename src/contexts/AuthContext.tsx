import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface AuthContextType {
  user: User | null;
  syncId: string | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  linkDevice: (code: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [syncId, setSyncId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch or create syncId
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setSyncId(userDoc.data().syncId);
          } else {
            const newSyncId = uuidv4().substring(0, 12).toUpperCase();
            await setDoc(doc(db, 'users', currentUser.uid), { syncId: newSyncId });
            setSyncId(newSyncId);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
      } else {
        // Check local storage for linked device syncId
        const localSyncId = localStorage.getItem('flowforge_sync_id');
        if (localSyncId) {
          setSyncId(localSyncId);
        } else {
          setSyncId(null);
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Error signing in', error);
      setError(error.message || 'Failed to sign in with Google');
    }
  };

  const logOut = async () => {
    await signOut(auth);
    localStorage.removeItem('flowforge_sync_id');
    setSyncId(null);
  };

  const linkDevice = async (code: string) => {
    // In a real app, you'd verify this code against Firestore to ensure it exists
    localStorage.setItem('flowforge_sync_id', code);
    setSyncId(code);
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, syncId, loading, error, signIn, logOut, linkDevice }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
