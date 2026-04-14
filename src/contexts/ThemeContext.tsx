import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

export interface ThemeSettings {
  appBg: string;
  appText: string;
  appPrimary: string;
  appPrimaryFg: string;
  appCard: string;
  appBorder: string;
  appMuted: string;
  appSurface: string;
  bgImage: string;
}

export const defaultTheme: ThemeSettings = {
  appBg: '#fafafa',
  appText: '#09090b',
  appPrimary: '#0d9488',
  appPrimaryFg: '#ffffff',
  appCard: '#ffffff',
  appBorder: '#e4e4e7',
  appMuted: '#71717a',
  appSurface: '#f4f4f5',
  bgImage: '',
};

interface ThemeContextType {
  theme: ThemeSettings;
  updateTheme: (updates: Partial<ThemeSettings>) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);
  const { syncId } = useAuth();

  useEffect(() => {
    if (!syncId) return;
    const unsubscribe = onSnapshot(doc(db, 'settings', syncId), (docSnap) => {
      if (docSnap.exists() && docSnap.data().theme) {
        setTheme({ ...defaultTheme, ...docSnap.data().theme });
      }
    }, (error) => {
      console.error("Theme sync error:", error);
      // We don't throw handleFirestoreError here to avoid crashing the whole app just for theme sync failure
    });
    return unsubscribe;
  }, [syncId]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--app-bg', theme.appBg);
    root.style.setProperty('--app-text', theme.appText);
    root.style.setProperty('--app-primary', theme.appPrimary);
    root.style.setProperty('--app-primary-fg', theme.appPrimaryFg);
    root.style.setProperty('--app-card', theme.appCard);
    root.style.setProperty('--app-border', theme.appBorder);
    root.style.setProperty('--app-muted', theme.appMuted);
    root.style.setProperty('--app-surface', theme.appSurface);
    if (theme.bgImage) {
      root.style.setProperty('--app-bg-image', `url(${theme.bgImage})`);
    } else {
      root.style.setProperty('--app-bg-image', 'none');
    }
  }, [theme]);

  const updateTheme = async (updates: Partial<ThemeSettings>) => {
    const newTheme = { ...theme, ...updates };
    setTheme(newTheme);
    if (syncId) {
      try {
        await setDoc(doc(db, 'settings', syncId), { theme: newTheme }, { merge: true });
      } catch (error) {
        console.error("Failed to save theme:", error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
