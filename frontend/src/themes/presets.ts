/**
 * Pre-built Theme Presets
 *
 * VIZ-002 Implementation
 * 20+ professional themes for data visualization
 */

import { Theme } from './types';

// ===================================================================
// LIGHT THEMES
// ===================================================================

export const defaultTheme: Theme = {
  id: 'default',
  name: 'Default Light',
  description: 'Clean and professional default theme',
  category: 'light',
  colors: {
    primary: ['#0078D7', '#106EBE', '#005A9E', '#004578', '#003152'],
    secondary: ['#50E3C2', '#3ACCAC', '#25B596', '#119E80', '#008069'],
    accent: ['#FF6B6B', '#EE5A52', '#D64242', '#BF2D2D', '#A71C1C'],
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
    info: '#17a2b8',
    background: '#ffffff',
    surface: '#f8f9fa',
    surfaceElevated: '#ffffff',
    textPrimary: '#212529',
    textSecondary: '#6c757d',
    textDisabled: '#adb5bd',
    border: '#dee2e6',
    borderLight: '#e9ecef',
    dataColors: ['#0078D7', '#50E3C2', '#FF6B6B', '#FFA500', '#8B5CF6', '#EC4899'],
    diverging: ['#d7191c', '#fdae61', '#ffffbf', '#a6d96a', '#1a9641'],
    sequential: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c'],
  },
  chart: {
    gridColor: '#e9ecef',
    gridStyle: 'solid',
    axisColor: '#495057',
    tickColor: '#6c757d',
    lineWidth: 2,
    pointRadius: 4,
    tooltipBackground: '#343a40',
    tooltipBorder: '#343a40',
    tooltipText: '#ffffff',
    legendTextColor: '#495057',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSizeBase: 14,
    fontSizeSmall: 12,
    fontSizeLarge: 16,
    fontWeightNormal: 400,
    fontWeightBold: 600,
    lineHeight: 1.5,
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  animations: {
    duration: 300,
    easing: 'ease-in-out',
  },
};

export const corporateTheme: Theme = {
  ...defaultTheme,
  id: 'corporate',
  name: 'Corporate Blue',
  description: 'Professional corporate theme with blue tones',
  category: 'light',
  colors: {
    ...defaultTheme.colors,
    primary: ['#003366', '#004080', '#005599', '#0066B3', '#0077CC'],
    secondary: ['#666666', '#808080', '#999999', '#B3B3B3', '#CCCCCC'],
    accent: ['#C41E3A', '#D12E45', '#DE3E50', '#EB4E5B', '#F85E66'],
    dataColors: ['#003366', '#0077CC', '#C41E3A', '#666666', '#999999', '#CCCCCC'],
  },
};

export const minimalTheme: Theme = {
  ...defaultTheme,
  id: 'minimal',
  name: 'Minimal',
  description: 'Clean minimal design with subtle colors',
  category: 'light',
  colors: {
    ...defaultTheme.colors,
    primary: ['#2E3440', '#3B4252', '#434C5E', '#4C566A', '#5E6A7E'],
    secondary: ['#D8DEE9', '#E5E9F0', '#ECEFF4', '#F5F7FA', '#FAFBFC'],
    accent: ['#88C0D0', '#81A1C1', '#5E81AC', '#6A8CAF', '#7A9CB3'],
    dataColors: ['#2E3440', '#88C0D0', '#81A1C1', '#5E81AC', '#A3BE8C', '#EBCB8B'],
  },
};

export const professionalTheme: Theme = {
  ...defaultTheme,
  id: 'professional',
  name: 'Professional',
  description: 'Sophisticated professional theme',
  category: 'light',
  colors: {
    ...defaultTheme.colors,
    primary: ['#1E3A8A', '#1E40AF', '#2563EB', '#3B82F6', '#60A5FA'],
    secondary: ['#475569', '#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0'],
    accent: ['#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FECACA'],
    dataColors: ['#1E3A8A', '#DC2626', '#059669', '#D97706', '#7C3AED', '#DB2777'],
  },
};

// ===================================================================
// DARK THEMES
// ===================================================================

export const darkTheme: Theme = {
  ...defaultTheme,
  id: 'dark',
  name: 'Dark',
  description: 'Modern dark theme',
  category: 'dark',
  colors: {
    primary: ['#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF'],
    secondary: ['#34D399', '#10B981', '#059669', '#047857', '#065F46'],
    accent: ['#F87171', '#EF4444', '#DC2626', '#B91C1C', '#991B1B'],
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    background: '#111827',
    surface: '#1F2937',
    surfaceElevated: '#374151',
    textPrimary: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textDisabled: '#6B7280',
    border: '#374151',
    borderLight: '#4B5563',
    dataColors: ['#60A5FA', '#34D399', '#F87171', '#FBBF24', '#A78BFA', '#F472B6'],
    diverging: ['#ef4444', '#fbbf24', '#fef3c7', '#86efac', '#10b981'],
    sequential: ['#1e3a8a', '#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'],
  },
  chart: {
    ...defaultTheme.chart,
    gridColor: '#374151',
    axisColor: '#9CA3AF',
    tickColor: '#6B7280',
    tooltipBackground: '#1F2937',
    legendTextColor: '#D1D5DB',
  },
};

export const neonTheme: Theme = {
  ...darkTheme,
  id: 'neon',
  name: 'Neon',
  description: 'Vibrant neon colors on dark background',
  category: 'dark',
  colors: {
    ...darkTheme.colors,
    primary: ['#00F5FF', '#00E5FF', '#00D4FF', '#00C4FF', '#00B3FF'],
    secondary: ['#FF00FF', '#EE00EE', '#DD00DD', '#CC00CC', '#BB00BB'],
    accent: ['#00FF00', '#00EE00', '#00DD00', '#00CC00', '#00BB00'],
    dataColors: ['#00F5FF', '#FF00FF', '#00FF00', '#FFFF00', '#FF6600', '#FF0066'],
  },
};

// ===================================================================
// COLORFUL THEMES
// ===================================================================

export const oceanTheme: Theme = {
  ...defaultTheme,
  id: 'ocean',
  name: 'Ocean',
  description: 'Cool ocean blues and teals',
  category: 'colorful',
  colors: {
    ...defaultTheme.colors,
    primary: ['#006B8F', '#007CA8', '#008DC2', '#009EDB', '#00AFF5'],
    secondary: ['#00B4A0', '#00C5B0', '#00D6C0', '#00E7D0', '#00F8E0'],
    accent: ['#FF7F50', '#FF8C5A', '#FF9964', '#FFA66E', '#FFB378'],
    dataColors: ['#006B8F', '#00B4A0', '#FF7F50', '#7B68EE', '#20B2AA', '#FF69B4'],
  },
};

export const forestTheme: Theme = {
  ...defaultTheme,
  id: 'forest',
  name: 'Forest',
  description: 'Natural forest greens',
  category: 'colorful',
  colors: {
    ...defaultTheme.colors,
    primary: ['#1B5E20', '#2E7D32', '#388E3C', '#43A047', '#4CAF50'],
    secondary: ['#33691E', '#558B2F', '#689F38', '#7CB342', '#8BC34A'],
    accent: ['#6D4C41', '#795548', '#8D6E63', '#A1887F', '#BCAAA4'],
    dataColors: ['#1B5E20', '#33691E', '#6D4C41', '#4CAF50', '#8BC34A', '#A1887F'],
  },
};

export const sunsetTheme: Theme = {
  ...defaultTheme,
  id: 'sunset',
  name: 'Sunset',
  description: 'Warm sunset oranges and purples',
  category: 'colorful',
  colors: {
    ...defaultTheme.colors,
    primary: ['#E65100', '#EF6C00', '#F57C00', '#FB8C00', '#FF9800'],
    secondary: ['#4A148C', '#6A1B9A', '#7B1FA2', '#8E24AA', '#9C27B0'],
    accent: ['#C62828', '#D32F2F', '#E53935', '#F44336', '#EF5350'],
    dataColors: ['#E65100', '#4A148C', '#C62828', '#FF9800', '#9C27B0', '#F44336'],
  },
};

export const vibrantTheme: Theme = {
  ...defaultTheme,
  id: 'vibrant',
  name: 'Vibrant',
  description: 'Bold vibrant colors',
  category: 'colorful',
  colors: {
    ...defaultTheme.colors,
    primary: ['#E91E63', '#EC407A', '#F06292', '#F48FB1', '#F8BBD0'],
    secondary: ['#00BCD4', '#26C6DA', '#4DD0E1', '#80DEEA', '#B2EBF2'],
    accent: ['#FFEB3B', '#FFEE58', '#FFF176', '#FFF59D', '#FFF9C4'],
    dataColors: ['#E91E63', '#00BCD4', '#FFEB3B', '#4CAF50', '#FF5722', '#9C27B0'],
  },
};

export const pastelTheme: Theme = {
  ...defaultTheme,
  id: 'pastel',
  name: 'Pastel',
  description: 'Soft pastel colors',
  category: 'colorful',
  colors: {
    ...defaultTheme.colors,
    primary: ['#B39DDB', '#9575CD', '#7E57C2', '#673AB7', '#5E35B1'],
    secondary: ['#A5D6A7', '#81C784', '#66BB6A', '#4CAF50', '#43A047'],
    accent: ['#F48FB1', '#F06292', '#EC407A', '#E91E63', '#D81B60'],
    dataColors: ['#B39DDB', '#A5D6A7', '#F48FB1', '#FFCC80', '#80CBC4', '#CE93D8'],
  },
};

export const earthTheme: Theme = {
  ...defaultTheme,
  id: 'earth',
  name: 'Earth Tones',
  description: 'Natural earth tones',
  category: 'colorful',
  colors: {
    ...defaultTheme.colors,
    primary: ['#5D4037', '#6D4C41', '#795548', '#8D6E63', '#A1887F'],
    secondary: ['#827717', '#9E9D24', '#AFB42B', '#C0CA33', '#CDDC39'],
    accent: ['#BF360C', '#D84315', '#E64A19', '#FF5722', '#FF6F4B'],
    dataColors: ['#5D4037', '#827717', '#BF360C', '#A1887F', '#CDDC39', '#FF5722'],
  },
};

export const iceTheme: Theme = {
  ...defaultTheme,
  id: 'ice',
  name: 'Ice',
  description: 'Cool ice blues and whites',
  category: 'colorful',
  colors: {
    ...defaultTheme.colors,
    primary: ['#B3E5FC', '#81D4FA', '#4FC3F7', '#29B6F6', '#03A9F4'],
    secondary: ['#E1F5FE', '#B3E5FC', '#81D4FA', '#4FC3F7', '#29B6F6'],
    accent: ['#80DEEA', '#4DD0E1', '#26C6DA', '#00BCD4', '#00ACC1'],
    dataColors: ['#03A9F4', '#00BCD4', '#80DEEA', '#4FC3F7', '#26C6DA', '#B3E5FC'],
  },
};

export const fireTheme: Theme = {
  ...defaultTheme,
  id: 'fire',
  name: 'Fire',
  description: 'Hot reds, oranges, and yellows',
  category: 'colorful',
  colors: {
    ...defaultTheme.colors,
    primary: ['#B71C1C', '#C62828', '#D32F2F', '#E53935', '#F44336'],
    secondary: ['#E65100', '#EF6C00', '#F57C00', '#FB8C00', '#FF9800'],
    accent: ['#F57F17', '#F9A825', '#FBC02D', '#FDD835', '#FFEB3B'],
    dataColors: ['#B71C1C', '#E65100', '#F57F17', '#F44336', '#FF9800', '#FFEB3B'],
  },
};

export const royalTheme: Theme = {
  ...defaultTheme,
  id: 'royal',
  name: 'Royal',
  description: 'Regal purples and golds',
  category: 'colorful',
  colors: {
    ...defaultTheme.colors,
    primary: ['#311B92', '#4527A0', '#512DA8', '#5E35B1', '#673AB7'],
    secondary: ['#F57F17', '#F9A825', '#FBC02D', '#FDD835', '#FFEB3B'],
    accent: ['#1A237E', '#283593', '#303F9F', '#3949AB', '#3F51B5'],
    dataColors: ['#311B92', '#F57F17', '#1A237E', '#673AB7', '#FDD835', '#3F51B5'],
  },
};

// ===================================================================
// MONOCHROME THEMES
// ===================================================================

export const monochromeTheme: Theme = {
  ...defaultTheme,
  id: 'monochrome',
  name: 'Monochrome',
  description: 'Classic black and white with gray scale',
  category: 'monochrome',
  colors: {
    ...defaultTheme.colors,
    primary: ['#000000', '#212121', '#424242', '#616161', '#757575'],
    secondary: ['#9E9E9E', '#BDBDBD', '#E0E0E0', '#EEEEEE', '#F5F5F5'],
    accent: ['#424242', '#616161', '#757575', '#9E9E9E', '#BDBDBD'],
    dataColors: ['#000000', '#424242', '#757575', '#9E9E9E', '#BDBDBD', '#E0E0E0'],
  },
};

export const highContrastTheme: Theme = {
  ...defaultTheme,
  id: 'high-contrast',
  name: 'High Contrast',
  description: 'Maximum contrast for accessibility',
  category: 'monochrome',
  colors: {
    primary: ['#000000', '#1A1A1A', '#333333', '#4D4D4D', '#666666'],
    secondary: ['#FFFFFF', '#F0F0F0', '#E0E0E0', '#D0D0D0', '#C0C0C0'],
    accent: ['#FF0000', '#FF3333', '#FF6666', '#FF9999', '#FFCCCC'],
    success: '#00FF00',
    warning: '#FFFF00',
    error: '#FF0000',
    info: '#00FFFF',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceElevated: '#F8F8F8',
    textPrimary: '#000000',
    textSecondary: '#333333',
    textDisabled: '#666666',
    border: '#000000',
    borderLight: '#666666',
    dataColors: ['#000000', '#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FF00FF'],
    diverging: ['#FF0000', '#FF9900', '#FFFF00', '#99FF00', '#00FF00'],
    sequential: ['#FFFFFF', '#CCCCCC', '#999999', '#666666', '#333333', '#000000'],
  },
  chart: {
    gridColor: '#CCCCCC',
    gridStyle: 'solid',
    axisColor: '#000000',
    tickColor: '#000000',
    lineWidth: 3,
    pointRadius: 6,
    tooltipBackground: '#000000',
    tooltipBorder: '#000000',
    tooltipText: '#FFFFFF',
    legendTextColor: '#000000',
  },
};

// ===================================================================
// ADDITIONAL THEMES
// ===================================================================

export const retroTheme: Theme = {
  ...defaultTheme,
  id: 'retro',
  name: 'Retro',
  description: 'Vintage 80s inspired colors',
  category: 'colorful',
  colors: {
    ...defaultTheme.colors,
    primary: ['#FF6B9D', '#FF7FAF', '#FF93C1', '#FFA7D3', '#FFBBE5'],
    secondary: ['#C2FFF9', '#A7F3F0', '#8CE7E7', '#71DBDE', '#56CFD5'],
    accent: ['#FFE66D', '#FFEA7F', '#FFEE91', '#FFF2A3', '#FFF6B5'],
    dataColors: ['#FF6B9D', '#C2FFF9', '#FFE66D', '#B4A7D6', '#95E1D3', '#FFA07A'],
  },
};

export const modernTheme: Theme = {
  ...defaultTheme,
  id: 'modern',
  name: 'Modern',
  description: 'Sleek modern design',
  category: 'light',
  colors: {
    ...defaultTheme.colors,
    primary: ['#667EEA', '#7C8AED', '#9296F0', '#A8A2F3', '#BEAEF6'],
    secondary: ['#764ABC', '#8B5AC9', '#A06AD6', '#B57AE3', '#CA8AF0'],
    accent: ['#F093FB', '#F5A0FC', '#F9ADFD', '#FDBAFF', '#FFC7FF'],
    dataColors: ['#667EEA', '#764ABC', '#F093FB', '#48BB78', '#F6AD55', '#FC8181'],
  },
};

export const creativeTheme: Theme = {
  ...defaultTheme,
  id: 'creative',
  name: 'Creative',
  description: 'Bold creative color combinations',
  category: 'colorful',
  colors: {
    ...defaultTheme.colors,
    primary: ['#FF0080', '#FF1A8C', '#FF3399', '#FF4DA6', '#FF66B3'],
    secondary: ['#7928CA', '#8B3FD1', '#9D56D8', '#AF6DDF', '#C184E6'],
    accent: ['#00DFD8', '#1AE3E0', '#33E7E8', '#4DEBF0', '#66EFF8'],
    dataColors: ['#FF0080', '#7928CA', '#00DFD8', '#FFD600', '#00C9FF', '#92FFC0'],
  },
};

// ===================================================================
// THEME REGISTRY
// ===================================================================

export const themePresets: Record<string, Theme> = {
  default: defaultTheme,
  dark: darkTheme,
  ocean: oceanTheme,
  forest: forestTheme,
  sunset: sunsetTheme,
  corporate: corporateTheme,
  minimal: minimalTheme,
  vibrant: vibrantTheme,
  pastel: pastelTheme,
  neon: neonTheme,
  earth: earthTheme,
  ice: iceTheme,
  fire: fireTheme,
  royal: royalTheme,
  monochrome: monochromeTheme,
  retro: retroTheme,
  modern: modernTheme,
  professional: professionalTheme,
  creative: creativeTheme,
  'high-contrast': highContrastTheme,
};

export const getAllThemes = (): Theme[] => {
  return Object.values(themePresets);
};

export const getThemeById = (id: string): Theme => {
  return themePresets[id] || defaultTheme;
};

export const getThemesByCategory = (category: Theme['category']): Theme[] => {
  return Object.values(themePresets).filter((theme) => theme.category === category);
};
