/**
 * Default Chart Themes
 *
 * Pre-configured themes for chart visualization including
 * color palettes, typography, and styling.
 */

import { ChartTheme } from '../types/charts';

// Color palettes
export const COLOR_PALETTES = {
  default: [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316', // Orange
    '#ec4899', // Pink
    '#6366f1', // Indigo
  ],

  business: [
    '#1e40af', // Dark Blue
    '#0891b2', // Cyan
    '#059669', // Green
    '#d97706', // Amber
    '#dc2626', // Red
    '#7c3aed', // Purple
  ],

  vibrant: [
    '#f43f5e', // Rose
    '#fb923c', // Orange
    '#fbbf24', // Yellow
    '#a3e635', // Lime
    '#34d399', // Emerald
    '#2dd4bf', // Teal
    '#38bdf8', // Sky
    '#818cf8', // Indigo
    '#c084fc', // Purple
    '#f472b6', // Pink
  ],

  pastel: [
    '#93c5fd', // Blue
    '#86efac', // Green
    '#fcd34d', // Yellow
    '#fca5a5', // Red
    '#c4b5fd', // Purple
    '#67e8f9', // Cyan
    '#bef264', // Lime
    '#fdba74', // Orange
    '#f9a8d4', // Pink
    '#a5b4fc', // Indigo
  ],

  monochrome: [
    '#111827', // Gray 900
    '#374151', // Gray 700
    '#6b7280', // Gray 500
    '#9ca3af', // Gray 400
    '#d1d5db', // Gray 300
    '#e5e7eb', // Gray 200
  ],
};

// Default light theme
export const LIGHT_THEME: ChartTheme = {
  name: 'Light',

  colors: {
    primary: COLOR_PALETTES.default,
    background: '#ffffff',
    text: '#111827',
    gridLines: '#e5e7eb',
    borders: '#d1d5db',
  },

  fonts: {
    title: {
      family: 'Inter, system-ui, sans-serif',
      size: 18,
      weight: 600,
      color: '#111827',
    },
    axis: {
      family: 'Inter, system-ui, sans-serif',
      size: 12,
      weight: 400,
      color: '#6b7280',
    },
    legend: {
      family: 'Inter, system-ui, sans-serif',
      size: 12,
      weight: 400,
      color: '#374151',
    },
    tooltip: {
      family: 'Inter, system-ui, sans-serif',
      size: 12,
      weight: 400,
      color: '#111827',
    },
  },

  borderRadius: 8,
  strokeWidth: 2,
  opacity: 1,

  animationDuration: 1000,
  animationEasing: 'ease-in-out',
};

// Dark theme
export const DARK_THEME: ChartTheme = {
  name: 'Dark',

  colors: {
    primary: COLOR_PALETTES.default,
    background: '#1f2937',
    text: '#f9fafb',
    gridLines: '#374151',
    borders: '#4b5563',
  },

  fonts: {
    title: {
      family: 'Inter, system-ui, sans-serif',
      size: 18,
      weight: 600,
      color: '#f9fafb',
    },
    axis: {
      family: 'Inter, system-ui, sans-serif',
      size: 12,
      weight: 400,
      color: '#9ca3af',
    },
    legend: {
      family: 'Inter, system-ui, sans-serif',
      size: 12,
      weight: 400,
      color: '#d1d5db',
    },
    tooltip: {
      family: 'Inter, system-ui, sans-serif',
      size: 12,
      weight: 400,
      color: '#f9fafb',
    },
  },

  borderRadius: 8,
  strokeWidth: 2,
  opacity: 1,

  animationDuration: 1000,
  animationEasing: 'ease-in-out',
};

// Business theme
export const BUSINESS_THEME: ChartTheme = {
  name: 'Business',

  colors: {
    primary: COLOR_PALETTES.business,
    background: '#ffffff',
    text: '#0f172a',
    gridLines: '#cbd5e1',
    borders: '#94a3b8',
  },

  fonts: {
    title: {
      family: 'Inter, system-ui, sans-serif',
      size: 16,
      weight: 700,
      color: '#0f172a',
    },
    axis: {
      family: 'Inter, system-ui, sans-serif',
      size: 11,
      weight: 500,
      color: '#64748b',
    },
    legend: {
      family: 'Inter, system-ui, sans-serif',
      size: 11,
      weight: 500,
      color: '#475569',
    },
    tooltip: {
      family: 'Inter, system-ui, sans-serif',
      size: 12,
      weight: 400,
      color: '#0f172a',
    },
  },

  borderRadius: 4,
  strokeWidth: 2,
  opacity: 1,

  animationDuration: 800,
  animationEasing: 'ease',
};

// Vibrant theme
export const VIBRANT_THEME: ChartTheme = {
  name: 'Vibrant',

  colors: {
    primary: COLOR_PALETTES.vibrant,
    background: '#ffffff',
    text: '#18181b',
    gridLines: '#e4e4e7',
    borders: '#d4d4d8',
  },

  fonts: {
    title: {
      family: 'Inter, system-ui, sans-serif',
      size: 20,
      weight: 700,
      color: '#18181b',
    },
    axis: {
      family: 'Inter, system-ui, sans-serif',
      size: 12,
      weight: 500,
      color: '#71717a',
    },
    legend: {
      family: 'Inter, system-ui, sans-serif',
      size: 13,
      weight: 500,
      color: '#3f3f46',
    },
    tooltip: {
      family: 'Inter, system-ui, sans-serif',
      size: 13,
      weight: 500,
      color: '#18181b',
    },
  },

  borderRadius: 12,
  strokeWidth: 3,
  opacity: 1,

  animationDuration: 1200,
  animationEasing: 'ease-out',
};

// Theme registry
export const THEMES: Record<string, ChartTheme> = {
  light: LIGHT_THEME,
  dark: DARK_THEME,
  business: BUSINESS_THEME,
  vibrant: VIBRANT_THEME,
};

/**
 * Get theme by name
 */
export const getTheme = (themeName: string = 'light'): ChartTheme => {
  return THEMES[themeName] || LIGHT_THEME;
};

/**
 * Create custom theme from partial configuration
 */
export const createCustomTheme = (
  baseTheme: ChartTheme,
  overrides: Partial<ChartTheme>
): ChartTheme => {
  return {
    ...baseTheme,
    ...overrides,
    colors: {
      ...baseTheme.colors,
      ...overrides.colors,
    },
    fonts: {
      title: { ...baseTheme.fonts.title, ...overrides.fonts?.title },
      axis: { ...baseTheme.fonts.axis, ...overrides.fonts?.axis },
      legend: { ...baseTheme.fonts.legend, ...overrides.fonts?.legend },
      tooltip: { ...baseTheme.fonts.tooltip, ...overrides.fonts?.tooltip },
    },
  };
};
