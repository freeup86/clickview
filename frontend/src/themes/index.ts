/**
 * Theme System - Central Export
 *
 * Complete collection of 25+ professional themes for data visualization.
 */

import { ChartTheme } from '../types/charts';

// Import from default themes
import {
  LIGHT_THEME,
  DARK_THEME,
  BUSINESS_THEME,
  VIBRANT_THEME,
  COLOR_PALETTES,
} from './defaultTheme';

// Import from professional themes
import {
  CORPORATE_THEME,
  FINANCIAL_THEME,
  TECHNOLOGY_THEME,
  EXECUTIVE_THEME,
  HEALTHCARE_THEME,
  RETAIL_THEME,
  EDUCATION_THEME,
  OLED_DARK_THEME,
  HIGH_CONTRAST_THEME,
  COLORBLIND_SAFE_THEME,
  COLOR_PALETTES_EXTENDED,
} from './professionalThemes';

import {
  MATERIAL_THEME,
  FLAT_THEME,
  OCEAN_THEME,
  FOREST_THEME,
  SUNSET_THEME,
  EARTH_THEME,
  NEON_THEME,
  GRADIENT_THEME,
  MINIMALIST_THEME,
  PRINT_THEME,
  PRESENTATION_THEME,
} from './professionalThemes2';

/**
 * Theme categories for organization
 */
export enum ThemeCategory {
  GENERAL = 'general',
  INDUSTRY = 'industry',
  ACCESSIBILITY = 'accessibility',
  NATURE = 'nature',
  MODERN = 'modern',
  SPECIALTY = 'specialty',
}

/**
 * Theme metadata
 */
export interface ThemeMetadata {
  id: string;
  theme: ChartTheme;
  category: ThemeCategory;
  description: string;
  tags: string[];
  accessibility: {
    wcagLevel?: 'A' | 'AA' | 'AAA';
    colorblindSafe: boolean;
    highContrast: boolean;
  };
  useCases: string[];
}

/**
 * Complete theme registry
 */
export const THEME_REGISTRY: ThemeMetadata[] = [
  // General Purpose
  {
    id: 'light',
    theme: LIGHT_THEME,
    category: ThemeCategory.GENERAL,
    description: 'Clean and bright theme for general use',
    tags: ['default', 'light', 'general'],
    accessibility: { wcagLevel: 'AA', colorblindSafe: false, highContrast: false },
    useCases: ['General dashboards', 'Reports', 'Presentations'],
  },
  {
    id: 'dark',
    theme: DARK_THEME,
    category: ThemeCategory.GENERAL,
    description: 'Modern dark theme with reduced eye strain',
    tags: ['dark', 'modern', 'general'],
    accessibility: { wcagLevel: 'AA', colorblindSafe: false, highContrast: false },
    useCases: ['Night mode', 'Extended viewing', 'Modern apps'],
  },
  {
    id: 'business',
    theme: BUSINESS_THEME,
    category: ThemeCategory.GENERAL,
    description: 'Professional theme for business presentations',
    tags: ['business', 'professional', 'corporate'],
    accessibility: { colorblindSafe: false, highContrast: false },
    useCases: ['Business reports', 'Executive dashboards', 'Corporate presentations'],
  },
  {
    id: 'vibrant',
    theme: VIBRANT_THEME,
    category: ThemeCategory.GENERAL,
    description: 'Bold and energetic theme with bright colors',
    tags: ['vibrant', 'colorful', 'modern'],
    accessibility: { colorblindSafe: false, highContrast: false },
    useCases: ['Marketing', 'Creative projects', 'Social media'],
  },

  // Industry Specific
  {
    id: 'corporate',
    theme: CORPORATE_THEME,
    category: ThemeCategory.INDUSTRY,
    description: 'Corporate professional theme with conservative colors',
    tags: ['corporate', 'professional', 'business'],
    accessibility: { colorblindSafe: false, highContrast: false },
    useCases: ['Corporate reports', 'Board presentations', 'Annual reports'],
  },
  {
    id: 'financial',
    theme: FINANCIAL_THEME,
    category: ThemeCategory.INDUSTRY,
    description: 'Financial analysis theme optimized for numeric data',
    tags: ['financial', 'banking', 'investment'],
    accessibility: { wcagLevel: 'AA', colorblindSafe: false, highContrast: false },
    useCases: ['Financial reports', 'Trading dashboards', 'Investment analysis'],
  },
  {
    id: 'technology',
    theme: TECHNOLOGY_THEME,
    category: ThemeCategory.INDUSTRY,
    description: 'Modern tech-focused theme with clean aesthetics',
    tags: ['technology', 'modern', 'software'],
    accessibility: { colorblindSafe: false, highContrast: false },
    useCases: ['Tech dashboards', 'Analytics platforms', 'SaaS products'],
  },
  {
    id: 'executive',
    theme: EXECUTIVE_THEME,
    category: ThemeCategory.INDUSTRY,
    description: 'Premium dark theme for executive dashboards',
    tags: ['executive', 'premium', 'dark'],
    accessibility: { colorblindSafe: false, highContrast: false },
    useCases: ['Executive dashboards', 'C-suite reports', 'Strategic planning'],
  },
  {
    id: 'healthcare',
    theme: HEALTHCARE_THEME,
    category: ThemeCategory.INDUSTRY,
    description: 'Clean theme designed for healthcare and medical data',
    tags: ['healthcare', 'medical', 'clean'],
    accessibility: { wcagLevel: 'AA', colorblindSafe: false, highContrast: false },
    useCases: ['Medical dashboards', 'Patient data', 'Health analytics'],
  },
  {
    id: 'retail',
    theme: RETAIL_THEME,
    category: ThemeCategory.INDUSTRY,
    description: 'Vibrant theme for retail and e-commerce',
    tags: ['retail', 'ecommerce', 'vibrant'],
    accessibility: { colorblindSafe: false, highContrast: false },
    useCases: ['Sales dashboards', 'E-commerce analytics', 'Retail reports'],
  },
  {
    id: 'education',
    theme: EDUCATION_THEME,
    category: ThemeCategory.INDUSTRY,
    description: 'Friendly theme for educational platforms',
    tags: ['education', 'learning', 'friendly'],
    accessibility: { wcagLevel: 'AA', colorblindSafe: false, highContrast: false },
    useCases: ['Learning platforms', 'Student analytics', 'Educational reports'],
  },

  // Accessibility
  {
    id: 'oled-dark',
    theme: OLED_DARK_THEME,
    category: ThemeCategory.ACCESSIBILITY,
    description: 'OLED-optimized dark theme with pure black background',
    tags: ['dark', 'oled', 'battery-saving'],
    accessibility: { wcagLevel: 'AAA', colorblindSafe: false, highContrast: true },
    useCases: ['OLED displays', 'Night mode', 'Battery saving'],
  },
  {
    id: 'high-contrast',
    theme: HIGH_CONTRAST_THEME,
    category: ThemeCategory.ACCESSIBILITY,
    description: 'Maximum contrast for visibility and accessibility',
    tags: ['accessibility', 'high-contrast', 'wcag'],
    accessibility: { wcagLevel: 'AAA', colorblindSafe: false, highContrast: true },
    useCases: ['Accessibility', 'Low vision', 'Public displays'],
  },
  {
    id: 'colorblind-safe',
    theme: COLORBLIND_SAFE_THEME,
    category: ThemeCategory.ACCESSIBILITY,
    description: 'Color palette optimized for colorblind users',
    tags: ['accessibility', 'colorblind', 'inclusive'],
    accessibility: { wcagLevel: 'AA', colorblindSafe: true, highContrast: false },
    useCases: ['Inclusive design', 'Public dashboards', 'Universal access'],
  },

  // Nature Inspired
  {
    id: 'ocean',
    theme: OCEAN_THEME,
    category: ThemeCategory.NATURE,
    description: 'Calming ocean-inspired blue theme',
    tags: ['nature', 'blue', 'ocean'],
    accessibility: { colorblindSafe: false, highContrast: false },
    useCases: ['Environmental data', 'Marine analytics', 'Relaxing interfaces'],
  },
  {
    id: 'forest',
    theme: FOREST_THEME,
    category: ThemeCategory.NATURE,
    description: 'Natural green theme inspired by forests',
    tags: ['nature', 'green', 'forest'],
    accessibility: { colorblindSafe: false, highContrast: false },
    useCases: ['Environmental reports', 'Sustainability', 'Nature data'],
  },
  {
    id: 'sunset',
    theme: SUNSET_THEME,
    category: ThemeCategory.NATURE,
    description: 'Warm sunset-inspired color palette',
    tags: ['nature', 'warm', 'sunset'],
    accessibility: { colorblindSafe: false, highContrast: false },
    useCases: ['Creative projects', 'Warm interfaces', 'Evening viewing'],
  },
  {
    id: 'earth',
    theme: EARTH_THEME,
    category: ThemeCategory.NATURE,
    description: 'Earthy tones for natural and organic feel',
    tags: ['nature', 'earth', 'organic'],
    accessibility: { colorblindSafe: false, highContrast: false },
    useCases: ['Organic products', 'Environmental data', 'Natural themes'],
  },

  // Modern Designs
  {
    id: 'material',
    theme: MATERIAL_THEME,
    category: ThemeCategory.MODERN,
    description: 'Google Material Design inspired theme',
    tags: ['modern', 'material', 'google'],
    accessibility: { colorblindSafe: false, highContrast: false },
    useCases: ['Material UI apps', 'Modern web apps', 'Android style'],
  },
  {
    id: 'flat',
    theme: FLAT_THEME,
    category: ThemeCategory.MODERN,
    description: 'Flat design with bold colors',
    tags: ['modern', 'flat', 'minimalist'],
    accessibility: { colorblindSafe: false, highContrast: false },
    useCases: ['Modern apps', 'Web dashboards', 'Clean interfaces'],
  },
  {
    id: 'neon',
    theme: NEON_THEME,
    category: ThemeCategory.MODERN,
    description: 'Futuristic neon theme with bright accents',
    tags: ['modern', 'neon', 'futuristic'],
    accessibility: { colorblindSafe: false, highContrast: true },
    useCases: ['Gaming', 'Tech demos', 'Futuristic interfaces'],
  },
  {
    id: 'gradient',
    theme: GRADIENT_THEME,
    category: ThemeCategory.MODERN,
    description: 'Modern theme with gradient color schemes',
    tags: ['modern', 'gradient', 'colorful'],
    accessibility: { colorblindSafe: false, highContrast: false },
    useCases: ['Creative dashboards', 'Modern apps', 'Marketing'],
  },
  {
    id: 'minimalist',
    theme: MINIMALIST_THEME,
    category: ThemeCategory.MODERN,
    description: 'Ultra-minimalist theme with maximum simplicity',
    tags: ['minimalist', 'simple', 'clean'],
    accessibility: { wcagLevel: 'AA', colorblindSafe: false, highContrast: false },
    useCases: ['Minimalist design', 'Clean interfaces', 'Focus on data'],
  },

  // Specialty
  {
    id: 'print',
    theme: PRINT_THEME,
    category: ThemeCategory.SPECIALTY,
    description: 'Optimized for printing and PDF export',
    tags: ['print', 'pdf', 'grayscale'],
    accessibility: { wcagLevel: 'AAA', colorblindSafe: true, highContrast: true },
    useCases: ['Printed reports', 'PDF export', 'Black & white printing'],
  },
  {
    id: 'presentation',
    theme: PRESENTATION_THEME,
    category: ThemeCategory.SPECIALTY,
    description: 'Large text and clear visuals for presentations',
    tags: ['presentation', 'slides', 'projector'],
    accessibility: { wcagLevel: 'AA', colorblindSafe: false, highContrast: false },
    useCases: ['Presentations', 'Projectors', 'Large screens'],
  },
];

/**
 * Get theme by ID
 */
export const getThemeById = (id: string): ChartTheme | undefined => {
  const metadata = THEME_REGISTRY.find((t) => t.id === id);
  return metadata?.theme;
};

/**
 * Get themes by category
 */
export const getThemesByCategory = (category: ThemeCategory): ThemeMetadata[] => {
  return THEME_REGISTRY.filter((t) => t.category === category);
};

/**
 * Get accessible themes
 */
export const getAccessibleThemes = (level?: 'A' | 'AA' | 'AAA'): ThemeMetadata[] => {
  if (level) {
    return THEME_REGISTRY.filter((t) => t.accessibility.wcagLevel === level);
  }
  return THEME_REGISTRY.filter((t) => t.accessibility.wcagLevel !== undefined);
};

/**
 * Get colorblind-safe themes
 */
export const getColorblindSafeThemes = (): ThemeMetadata[] => {
  return THEME_REGISTRY.filter((t) => t.accessibility.colorblindSafe);
};

/**
 * Search themes
 */
export const searchThemes = (query: string): ThemeMetadata[] => {
  const lowerQuery = query.toLowerCase();
  return THEME_REGISTRY.filter(
    (t) =>
      t.theme.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      t.useCases.some((uc) => uc.toLowerCase().includes(lowerQuery))
  );
};

/**
 * Export all themes as array
 */
export const ALL_THEMES = THEME_REGISTRY.map((t) => t.theme);

/**
 * Export color palettes
 */
export { COLOR_PALETTES, COLOR_PALETTES_EXTENDED };

/**
 * Default exports
 */
export {
  LIGHT_THEME,
  DARK_THEME,
  BUSINESS_THEME,
  VIBRANT_THEME,
  CORPORATE_THEME,
  FINANCIAL_THEME,
  TECHNOLOGY_THEME,
  EXECUTIVE_THEME,
  HEALTHCARE_THEME,
  RETAIL_THEME,
  EDUCATION_THEME,
  OLED_DARK_THEME,
  HIGH_CONTRAST_THEME,
  COLORBLIND_SAFE_THEME,
  MATERIAL_THEME,
  FLAT_THEME,
  OCEAN_THEME,
  FOREST_THEME,
  SUNSET_THEME,
  EARTH_THEME,
  NEON_THEME,
  GRADIENT_THEME,
  MINIMALIST_THEME,
  PRINT_THEME,
  PRESENTATION_THEME,
};

export default THEME_REGISTRY;
