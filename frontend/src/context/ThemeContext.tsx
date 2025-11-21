/**
 * Theme Context Provider
 *
 * Global theme management with persistence, dynamic switching,
 * and system preference detection.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ChartTheme } from '../types/charts';
import { LIGHT_THEME, DARK_THEME, THEME_REGISTRY, getThemeById } from '../themes';

interface ThemeContextValue {
  // Current theme
  currentTheme: ChartTheme;
  currentThemeId: string;

  // Actions
  setTheme: (themeId: string) => void;
  setCustomTheme: (theme: ChartTheme) => void;
  resetToDefault: () => void;
  toggleDarkMode: () => void;

  // System preferences
  systemPrefersDark: boolean;
  autoFollowSystem: boolean;
  setAutoFollowSystem: (follow: boolean) => void;

  // Theme queries
  isDarkMode: boolean;
  isAccessibleTheme: boolean;
  isColorblindSafe: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultThemeId?: string;
  persistToLocalStorage?: boolean;
  autoFollowSystem?: boolean;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultThemeId = 'light',
  persistToLocalStorage = true,
  autoFollowSystem: autoFollowSystemProp = false,
}) => {
  const [currentThemeId, setCurrentThemeId] = useState<string>(defaultThemeId);
  const [currentTheme, setCurrentTheme] = useState<ChartTheme>(LIGHT_THEME);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [autoFollowSystem, setAutoFollowSystem] = useState(autoFollowSystemProp);

  // Detect system color scheme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setSystemPrefersDark(e.matches);
    };

    // Initial check
    handleChange(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Load theme from localStorage on mount
  useEffect(() => {
    if (persistToLocalStorage) {
      const stored = localStorage.getItem('theme-preference');

      if (stored) {
        try {
          const parsed = JSON.parse(stored);

          if (parsed.themeId) {
            setCurrentThemeId(parsed.themeId);
          }

          if (parsed.autoFollowSystem !== undefined) {
            setAutoFollowSystem(parsed.autoFollowSystem);
          }

          if (parsed.customTheme) {
            setCurrentTheme(parsed.customTheme);
          }
        } catch (error) {
          console.error('Failed to parse theme preference:', error);
        }
      }
    }
  }, [persistToLocalStorage]);

  // Auto-follow system preference
  useEffect(() => {
    if (autoFollowSystem) {
      const newThemeId = systemPrefersDark ? 'dark' : 'light';
      setCurrentThemeId(newThemeId);

      const theme = getThemeById(newThemeId);
      if (theme) {
        setCurrentTheme(theme);
      }
    }
  }, [autoFollowSystem, systemPrefersDark]);

  // Update theme when themeId changes (and not auto-following system)
  useEffect(() => {
    if (!autoFollowSystem) {
      const theme = getThemeById(currentThemeId);
      if (theme) {
        setCurrentTheme(theme);
      }
    }
  }, [currentThemeId, autoFollowSystem]);

  // Persist theme preference
  useEffect(() => {
    if (persistToLocalStorage) {
      const preference = {
        themeId: currentThemeId,
        autoFollowSystem,
        // Only store custom theme if it's not from registry
        customTheme: THEME_REGISTRY.find(t => t.id === currentThemeId) ? undefined : currentTheme,
      };

      localStorage.setItem('theme-preference', JSON.stringify(preference));
    }
  }, [currentThemeId, currentTheme, autoFollowSystem, persistToLocalStorage]);

  // Apply theme to document root
  useEffect(() => {
    if (typeof document !== 'undefined') {
      // Set CSS variables for global theme access
      const root = document.documentElement;

      root.style.setProperty('--theme-bg', currentTheme.colors.background);
      root.style.setProperty('--theme-text', currentTheme.colors.text);
      root.style.setProperty('--theme-grid', currentTheme.colors.gridLines);
      root.style.setProperty('--theme-border', currentTheme.colors.borders || currentTheme.colors.gridLines);

      // Set primary colors
      currentTheme.colors.primary.forEach((color, index) => {
        root.style.setProperty(`--theme-primary-${index}`, color);
      });

      // Add dark mode class to body
      if (currentTheme === DARK_THEME || currentTheme.colors.background === '#000000' ||
          currentTheme.colors.background.toLowerCase().startsWith('#1')) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    }
  }, [currentTheme]);

  /**
   * Set theme by ID
   */
  const setTheme = useCallback((themeId: string) => {
    setCurrentThemeId(themeId);
    setAutoFollowSystem(false); // Disable auto-follow when manually setting theme

    const theme = getThemeById(themeId);
    if (theme) {
      setCurrentTheme(theme);
    }
  }, []);

  /**
   * Set custom theme object
   */
  const setCustomTheme = useCallback((theme: ChartTheme) => {
    setCurrentTheme(theme);
    setCurrentThemeId('custom');
    setAutoFollowSystem(false);
  }, []);

  /**
   * Reset to default theme
   */
  const resetToDefault = useCallback(() => {
    setCurrentThemeId(defaultThemeId);
    setAutoFollowSystem(false);

    const theme = getThemeById(defaultThemeId);
    if (theme) {
      setCurrentTheme(theme);
    }
  }, [defaultThemeId]);

  /**
   * Toggle between light and dark mode
   */
  const toggleDarkMode = useCallback(() => {
    const newThemeId = currentThemeId === 'dark' || isDarkMode ? 'light' : 'dark';
    setTheme(newThemeId);
  }, [currentThemeId, setTheme]);

  // Determine if current theme is dark
  const isDarkMode = useMemo(() => {
    const bgColor = currentTheme.colors.background.toLowerCase();

    // Simple heuristic: if background is dark (black or dark gray)
    if (bgColor === '#000000' || bgColor === '#000') return true;

    // Check if starts with #0, #1, #2 (dark colors)
    if (bgColor.match(/^#[0-2]/)) return true;

    // Check known dark theme names
    if (currentTheme.name.toLowerCase().includes('dark')) return true;

    return false;
  }, [currentTheme]);

  // Check if theme is accessible
  const isAccessibleTheme = useMemo(() => {
    const metadata = THEME_REGISTRY.find(t => t.theme === currentTheme);
    return metadata?.accessibility.wcagLevel !== undefined || false;
  }, [currentTheme]);

  // Check if theme is colorblind safe
  const isColorblindSafe = useMemo(() => {
    const metadata = THEME_REGISTRY.find(t => t.theme === currentTheme);
    return metadata?.accessibility.colorblindSafe || false;
  }, [currentTheme]);

  const value: ThemeContextValue = {
    currentTheme,
    currentThemeId,
    setTheme,
    setCustomTheme,
    resetToDefault,
    toggleDarkMode,
    systemPrefersDark,
    autoFollowSystem,
    setAutoFollowSystem,
    isDarkMode,
    isAccessibleTheme,
    isColorblindSafe,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Hook to access theme context
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export default ThemeContext;
