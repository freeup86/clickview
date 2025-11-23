/**
 * Theme Provider Context
 *
 * VIZ-002 Implementation
 * React context for theme management and persistence
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme } from './types';
import { defaultTheme, getThemeById, getAllThemes } from './presets';

interface ThemeContextValue {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
  themes: Theme[];
  customizeTheme: (customizations: Partial<Theme>) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'clickview_theme';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(defaultTheme);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedThemeId = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedThemeId) {
      setCurrentTheme(getThemeById(savedThemeId));
    }
  }, []);

  // Apply theme CSS variables whenever theme changes
  useEffect(() => {
    applyThemeToDOM(currentTheme);
  }, [currentTheme]);

  const setTheme = (themeId: string) => {
    const newTheme = getThemeById(themeId);
    setCurrentTheme(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  };

  const customizeTheme = (customizations: Partial<Theme>) => {
    const customizedTheme: Theme = {
      ...currentTheme,
      ...customizations,
      colors: {
        ...currentTheme.colors,
        ...(customizations.colors || {}),
      },
      chart: {
        ...currentTheme.chart,
        ...(customizations.chart || {}),
      },
      typography: {
        ...currentTheme.typography,
        ...(customizations.typography || {}),
      },
    };
    setCurrentTheme(customizedTheme);
  };

  const resetTheme = () => {
    setCurrentTheme(defaultTheme);
    localStorage.removeItem(THEME_STORAGE_KEY);
  };

  const value: ThemeContextValue = {
    currentTheme,
    setTheme,
    themes: getAllThemes(),
    customizeTheme,
    resetTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

/**
 * Apply theme to DOM via CSS variables
 */
function applyThemeToDOM(theme: Theme): void {
  const root = document.documentElement;

  // Primary colors
  theme.colors.primary.forEach((color, index) => {
    root.style.setProperty(`--color-primary-${index}`, color);
  });

  // Secondary colors
  theme.colors.secondary.forEach((color, index) => {
    root.style.setProperty(`--color-secondary-${index}`, color);
  });

  // Accent colors
  theme.colors.accent.forEach((color, index) => {
    root.style.setProperty(`--color-accent-${index}`, color);
  });

  // Semantic colors
  root.style.setProperty('--color-success', theme.colors.success);
  root.style.setProperty('--color-warning', theme.colors.warning);
  root.style.setProperty('--color-error', theme.colors.error);
  root.style.setProperty('--color-info', theme.colors.info);

  // Background and surface
  root.style.setProperty('--color-background', theme.colors.background);
  root.style.setProperty('--color-surface', theme.colors.surface);
  root.style.setProperty('--color-surface-elevated', theme.colors.surfaceElevated);

  // Text colors
  root.style.setProperty('--color-text-primary', theme.colors.textPrimary);
  root.style.setProperty('--color-text-secondary', theme.colors.textSecondary);
  root.style.setProperty('--color-text-disabled', theme.colors.textDisabled);

  // Border colors
  root.style.setProperty('--color-border', theme.colors.border);
  root.style.setProperty('--color-border-light', theme.colors.borderLight);

  // Data colors
  theme.colors.dataColors.forEach((color, index) => {
    root.style.setProperty(`--color-data-${index}`, color);
  });

  // Chart theme
  root.style.setProperty('--chart-grid-color', theme.chart.gridColor);
  root.style.setProperty('--chart-axis-color', theme.chart.axisColor);
  root.style.setProperty('--chart-tick-color', theme.chart.tickColor);
  root.style.setProperty('--chart-tooltip-bg', theme.chart.tooltipBackground);
  root.style.setProperty('--chart-tooltip-border', theme.chart.tooltipBorder);
  root.style.setProperty('--chart-tooltip-text', theme.chart.tooltipText);
  root.style.setProperty('--chart-legend-text', theme.chart.legendTextColor);

  // Typography
  root.style.setProperty('--font-family', theme.typography.fontFamily);
  root.style.setProperty('--font-size-base', `${theme.typography.fontSizeBase}px`);
  root.style.setProperty('--font-size-small', `${theme.typography.fontSizeSmall}px`);
  root.style.setProperty('--font-size-large', `${theme.typography.fontSizeLarge}px`);
  root.style.setProperty('--font-weight-normal', String(theme.typography.fontWeightNormal));
  root.style.setProperty('--font-weight-bold', String(theme.typography.fontWeightBold));
  root.style.setProperty('--line-height', String(theme.typography.lineHeight));

  // Shadows
  if (theme.shadows) {
    root.style.setProperty('--shadow-sm', theme.shadows.sm);
    root.style.setProperty('--shadow-md', theme.shadows.md);
    root.style.setProperty('--shadow-lg', theme.shadows.lg);
    root.style.setProperty('--shadow-xl', theme.shadows.xl);
  }

  // Animations
  if (theme.animations) {
    root.style.setProperty('--animation-duration', `${theme.animations.duration}ms`);
    root.style.setProperty('--animation-easing', theme.animations.easing);
  }

  // Update body background
  document.body.style.backgroundColor = theme.colors.background;
  document.body.style.color = theme.colors.textPrimary;
}
