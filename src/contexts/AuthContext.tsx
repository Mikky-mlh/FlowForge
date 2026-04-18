import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { handleFirestoreError } from '../lib/firestore-errors';

interface AuthContextType {
  user: User | null;
  syncId: string | null;
  loading: boolean;
  error: string | null;
  googleAccessToken: string | null;
  getValidGoogleToken: () => Promise<string | null>;
  signIn: (requestCalendarScope?: boolean) => Promise<string | null>;
  logOut: () => Promise<void>;
  linkDevice: (code: string) => Promise<boolean>;
  deviceLinkError: string | null;
  deviceLinkLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [syncId, setSyncId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [deviceLinkLoading, setDeviceLinkLoading] = useState(false);
  const [deviceLinkError, setDeviceLinkError] = useState<string | null>(null);

  const getValidGoogleToken = async (): Promise<string | null> => {
    const token = localStorage.getItem('flowforge_google_token');
    const expiry = localStorage.getItem('flowforge_google_token_expiry');
    
    if (!token || !expiry) return null;
    
    const expiryTime = parseInt(expiry);
    const now = Date.now();
    
    // If expiring in less than 1 minute, consider it expired
    if (expiryTime < now + 60000) {
      localStorage.removeItem('flowforge_google_token');
      localStorage.removeItem('flowforge_google_token_expiry');
      setGoogleAccessToken(null);
      return null;
    }
    
    return token;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const validToken = await getValidGoogleToken();
        if (validToken) setGoogleAccessToken(validToken);
        
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
          console.error('Failed to fetch/create syncId', error);
        }
      } else {
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

  const signIn = async (requestCalendarScope: boolean = false): Promise<string | null> => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        localStorage.setItem('flowforge_google_token', credential.accessToken);
        localStorage.setItem('flowforge_google_token_expiry', String(Date.now() + 3500 * 1000));
        return credential.accessToken;
      }
      return null;
    } catch (error: any) {
      console.error('Error signing in', error);
      setError(error.message || 'Failed to sign in with Google');
      return null;
    }
  };

  const logOut = async () => {
    await signOut(auth);
    localStorage.removeItem('flowforge_sync_id');
    localStorage.removeItem('flowforge_google_token');
    localStorage.removeItem('flowforge_google_token_expiry');
    setSyncId(null);
    setGoogleAccessToken(null);
  };

  const linkDevice = async (code: string): Promise<boolean> => {
    const normalizedCode = code.toUpperCase().trim();
    
    if (normalizedCode.length !== 12) {
      throw new Error('Sync code must be 12 characters');
    }
    
    setDeviceLinkLoading(true);
    setDeviceLinkError(null);
    
    try {
      // Query Firestore to verify this syncId exists
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('syncId', '==', normalizedCode));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Invalid sync code. Please check and try again.');
      }
      
      // Sync code is valid - save to localStorage
      localStorage.setItem('flowforge_sync_id', normalizedCode);
      setSyncId(normalizedCode);
      return true;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to link device';
      setDeviceLinkError(errorMessage);
      throw error;
    } finally {
      setDeviceLinkLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, syncId, loading, error, googleAccessToken, getValidGoogleToken, signIn, logOut, linkDevice, deviceLinkError, deviceLinkLoading }}>
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
