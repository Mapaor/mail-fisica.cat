'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Apply theme from localStorage/system preference on mount
  useEffect(() => {
    console.log('ThemeProvider mounted');
    const stored = localStorage.getItem('theme') as Theme | null;
    const theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    console.log('Initial theme:', theme);
    console.log('documentElement classes:', document.documentElement.className);
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    console.log('After init, documentElement classes:', document.documentElement.className);
  }, []);

  const toggleTheme = () => {
    console.log('toggleTheme called');
    const isDark = document.documentElement.classList.contains('dark');
    console.log('Current isDark:', isDark);
    console.log('classList before toggle:', document.documentElement.className);
    
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      console.log('Switched to light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      console.log('Switched to dark');
    }
    
    console.log('classList after toggle:', document.documentElement.className);
    console.log('localStorage theme:', localStorage.getItem('theme'));
  };

  return (
    <ThemeContext.Provider value={{ toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
