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
  mode: 'light' | 'dark' | 'system';
}

const lightTheme: ThemeSettings = {
  appBg: '#fafafa',
  appText: '#18181b',
  appPrimary: '#10b981',
  appPrimaryFg: '#ffffff',
  appCard: '#ffffff',
  appBorder: '#e4e5e7',
  appMuted: '#71717a',
  appSurface: '#f4f4f5',
  bgImage: '',
  mode: 'light',
};

const darkTheme: ThemeSettings = {
  appBg: '#000000',
  appText: '#fafafa',
  appPrimary: '#34d399',
  appPrimaryFg: '#000000',
  appCard: '#0a0a0a',
  appBorder: '#27272a',
  appMuted: '#a1a1aa',
  appSurface: '#18181b',
  bgImage: '',
  mode: 'dark',
};

export const defaultTheme: ThemeSettings = lightTheme;

export const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const getThemeColors = (mode: 'light' | 'dark'): ThemeSettings => {
  return mode === 'dark' ? darkTheme : lightTheme;
};

interface ThemeContextType {
  theme: ThemeSettings;
  effectiveTheme: ThemeSettings;
  updateTheme: (updates: Partial<ThemeSettings>) => Promise<void>;
  setMode: (mode: 'light' | 'dark' | 'system') => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeSettings>(lightTheme);
  const { syncId } = useAuth();

  const effectiveTheme = theme.mode === 'system' 
    ? { ...getThemeColors(getSystemTheme()), bgImage: theme.bgImage, mode: theme.mode }
    : theme;

  useEffect(() => {
    if (!syncId) return;
    const unsubscribe = onSnapshot(doc(db, 'settings', syncId), (docSnap) => {
      if (docSnap.exists() && docSnap.data().theme) {
        setTheme({ ...lightTheme, ...docSnap.data().theme });
      }
    }, (error) => {
      console.error("Theme sync error:", error);
    });
    return unsubscribe;
  }, [syncId]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--app-bg', effectiveTheme.appBg);
    root.style.setProperty('--app-text', effectiveTheme.appText);
    root.style.setProperty('--app-primary', effectiveTheme.appPrimary);
    root.style.setProperty('--app-primary-fg', effectiveTheme.appPrimaryFg);
    root.style.setProperty('--app-card', effectiveTheme.appCard);
    root.style.setProperty('--app-border', effectiveTheme.appBorder);
    root.style.setProperty('--app-muted', effectiveTheme.appMuted);
    root.style.setProperty('--app-surface', effectiveTheme.appSurface);
    if (effectiveTheme.bgImage) {
      console.log('Setting background image:', effectiveTheme.bgImage.substring(0, 50) + '...');
      root.style.setProperty('--app-bg-image', `url(${effectiveTheme.bgImage})`);
      document.body.style.backgroundImage = `url(${effectiveTheme.bgImage})`;
      document.body.setAttribute('data-has-bg', 'true');
    } else {
      root.style.setProperty('--app-bg-image', 'none');
      document.body.style.backgroundImage = 'none';
      document.body.removeAttribute('data-has-bg');
    }
    
    // Apply dark class for system styles
    if (effectiveTheme.mode === 'dark' || (effectiveTheme.mode === 'system' && getSystemTheme() === 'dark')) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [effectiveTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme.mode === 'system') {
        // Force re-render when system theme changes
        setTheme(prev => ({ ...prev }));
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme.mode]);

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

  const setMode = async (mode: 'light' | 'dark' | 'system') => {
    const baseTheme = mode === 'dark' ? darkTheme : mode === 'light' ? lightTheme : lightTheme;
    await updateTheme({ ...baseTheme, mode, bgImage: theme.bgImage });
  };

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, updateTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
