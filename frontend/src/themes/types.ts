/**
 * Theme System Type Definitions
 *
 * VIZ-002 Implementation
 * Comprehensive theme system for visualization customization
 */

export interface Theme {
  id: string;
  name: string;
  description?: string;
  category: 'light' | 'dark' | 'colorful' | 'monochrome' | 'custom';
  colors: ThemeColors;
  chart: ChartTheme;
  typography: TypographyTheme;
  shadows?: ShadowTheme;
  animations?: AnimationTheme;
}

export interface ThemeColors {
  // Primary palette
  primary: string[];
  secondary: string[];
  accent: string[];

  // Semantic colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Background and surface
  background: string;
  surface: string;
  surfaceElevated: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;

  // Border colors
  border: string;
  borderLight: string;

  // Data visualization specific
  dataColors: string[]; // For charts and visualizations
  diverging: string[]; // For heatmaps, etc.
  sequential: string[]; // For gradients
}

export interface ChartTheme {
  // Grid and axes
  gridColor: string;
  gridStyle: 'solid' | 'dashed' | 'dotted';
  axisColor: string;
  tickColor: string;

  // Chart elements
  barWidth?: number;
  lineWidth?: number;
  pointRadius?: number;

  // Tooltips
  tooltipBackground: string;
  tooltipBorder: string;
  tooltipText: string;

  // Legend
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  legendTextColor: string;
}

export interface TypographyTheme {
  fontFamily: string;
  fontSizeBase: number;
  fontSizeSmall: number;
  fontSizeLarge: number;
  fontWeightNormal: number;
  fontWeightBold: number;
  lineHeight: number;
}

export interface ShadowTheme {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface AnimationTheme {
  duration: number;
  easing: string;
}

export type ThemePreset =
  | 'default'
  | 'dark'
  | 'ocean'
  | 'forest'
  | 'sunset'
  | 'corporate'
  | 'minimal'
  | 'vibrant'
  | 'pastel'
  | 'neon'
  | 'earth'
  | 'ice'
  | 'fire'
  | 'royal'
  | 'monochrome'
  | 'retro'
  | 'modern'
  | 'professional'
  | 'creative'
  | 'high-contrast';
