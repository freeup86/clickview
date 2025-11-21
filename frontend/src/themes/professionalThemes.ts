/**
 * Professional Themes Collection
 *
 * 20+ professionally designed themes for data visualization.
 * Includes industry-specific themes, accessibility-optimized themes,
 * and seasonal/specialty themes.
 */

import { ChartTheme } from '../types/charts';

/**
 * Color Palettes - Extended Collection
 */

// Professional Color Palettes
export const COLOR_PALETTES_EXTENDED = {
  // Corporate & Business
  corporate: ['#003f5c', '#2f4b7c', '#665191', '#a05195', '#d45087', '#f95d6a', '#ff7c43', '#ffa600'],
  financial: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f'],
  professional: ['#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47', '#264478', '#9E480E'],
  executive: ['#1A1A2E', '#16213E', '#0F3460', '#533483', '#E94560', '#FF6B6B', '#F97068', '#FFB400'],

  // Industry Specific
  healthcare: ['#0077C8', '#00A9E0', '#7AC143', '#F58220', '#EC008C', '#8246AF', '#00B5E2', '#6DC8BF'],
  finance: ['#004B87', '#007AC3', '#00A3E0', '#4DBCE8', '#80CFED', '#B3E2F2', '#D1EDF6', '#E5F5FA'],
  technology: ['#0066CC', '#3399FF', '#00CCFF', '#00FF99', '#99FF00', '#FFCC00', '#FF9900', '#FF3300'],
  retail: ['#E31837', '#F37021', '#FDB913', '#8DC63F', '#00A651', '#00AEEF', '#0072CE', '#2E3192'],
  education: ['#003DA5', '#0066B3', '#00A3E0', '#6ECEB2', '#BCD631', '#FFC72C', '#F68D2E', '#E14D2A'],

  // Data Visualization Optimized
  diverging: ['#ca0020', '#f4a582', '#f7f7f7', '#92c5de', '#0571b0'],
  sequential: ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#b10026'],
  categorical: ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf'],
  qualitative: ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5'],

  // Accessibility Optimized
  colorblindSafe: ['#0173B2', '#DE8F05', '#029E73', '#CC78BC', '#CA9161', '#FBAFE4', '#949494', '#ECE133'],
  highContrast: ['#000000', '#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7'],
  wcagAA: ['#005A9C', '#E17000', '#008A00', '#C50048', '#7F3F98', '#00A499', '#A05000', '#5A6F00'],

  // Seasonal & Specialty
  spring: ['#FFB7C5', '#FFC0CB', '#98D8C8', '#6BCF7F', '#F7CAC9', '#92A8D1', '#B19CD9', '#F4E1D2'],
  summer: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF8E53', '#FFC93C', '#07BEB8', '#3F72AF'],
  autumn: ['#8B4513', '#CD853F', '#DAA520', '#B8860B', '#D2691E', '#A0522D', '#8B7355', '#CD9B9B'],
  winter: ['#4A90E2', '#B8E6F0', '#FFFFFF', '#E8F4F8', '#5DADE2', '#85C1E2', '#AED6F1', '#D6EAF8'],

  // Modern & Trendy
  neon: ['#FF006E', '#FB5607', '#FFBE0B', '#8338EC', '#3A86FF', '#06FFA5', '#FF10F0', '#00F5FF'],
  gradient: ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#38f9d7', '#fa709a', '#fee140'],
  material: ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4'],
  flat: ['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#34495e', '#f1c40f', '#e67e22', '#e74c3c'],

  // Nature Inspired
  ocean: ['#006994', '#00A8E8', '#00C9FF', '#84DCC6', '#A8E6CE', '#DCEDC2', '#FFD3B5', '#FFAAA6'],
  forest: ['#2D5016', '#3D6817', '#4E7F1B', '#60951F', '#73AC23', '#86C232', '#98D83A', '#ABEF41'],
  sunset: ['#FF6B35', '#F7931E', '#FDC830', '#F37335', '#E94B3C', '#C0392B', '#96281B', '#6C1A0C'],
  earth: ['#8B4513', '#A0522D', '#CD853F', '#DEB887', '#F4A460', '#D2B48C', '#BC8F8F', '#F5DEB3'],
};

/**
 * Theme Definitions
 */

// 1. Corporate Professional
export const CORPORATE_THEME: ChartTheme = {
  name: 'Corporate Professional',
  colors: {
    primary: COLOR_PALETTES_EXTENDED.corporate,
    background: '#FFFFFF',
    text: '#2C3E50',
    gridLines: '#E8EAED',
    borders: '#D1D5DB',
  },
  fonts: {
    title: { family: 'Arial, sans-serif', size: 18, weight: 600, color: '#1A1A1A' },
    axis: { family: 'Arial, sans-serif', size: 11, weight: 400, color: '#5F6368' },
    legend: { family: 'Arial, sans-serif', size: 12, weight: 500, color: '#444444' },
    tooltip: { family: 'Arial, sans-serif', size: 12, weight: 400, color: '#1A1A1A' },
  },
  borderRadius: 4,
  strokeWidth: 2,
  opacity: 0.85,
  animationDuration: 800,
  animationEasing: 'ease-in-out',
};

// 2. Financial Analysis
export const FINANCIAL_THEME: ChartTheme = {
  name: 'Financial Analysis',
  colors: {
    primary: COLOR_PALETTES_EXTENDED.financial,
    background: '#F8F9FA',
    text: '#212529',
    gridLines: '#DEE2E6',
    borders: '#CED4DA',
  },
  fonts: {
    title: { family: 'Georgia, serif', size: 20, weight: 700, color: '#004B87' },
    axis: { family: 'Roboto, sans-serif', size: 11, weight: 400, color: '#495057' },
    legend: { family: 'Roboto, sans-serif', size: 12, weight: 500, color: '#343A40' },
    tooltip: { family: 'Roboto, sans-serif', size: 12, weight: 400, color: '#212529' },
  },
  borderRadius: 2,
  strokeWidth: 2,
  opacity: 0.9,
  animationDuration: 600,
  animationEasing: 'linear',
};

// 3. Technology Modern
export const TECHNOLOGY_THEME: ChartTheme = {
  name: 'Technology Modern',
  colors: {
    primary: COLOR_PALETTES_EXTENDED.technology,
    background: '#FAFAFA',
    text: '#1E293B',
    gridLines: '#E2E8F0',
    borders: '#CBD5E1',
  },
  fonts: {
    title: { family: 'Inter, sans-serif', size: 19, weight: 700, color: '#0F172A' },
    axis: { family: 'Inter, sans-serif', size: 11, weight: 400, color: '#64748B' },
    legend: { family: 'Inter, sans-serif', size: 12, weight: 500, color: '#334155' },
    tooltip: { family: 'Inter, sans-serif', size: 12, weight: 500, color: '#0F172A' },
  },
  borderRadius: 8,
  strokeWidth: 2.5,
  opacity: 0.88,
  animationDuration: 1000,
  animationEasing: 'ease-out',
};

// 4. Executive Dashboard
export const EXECUTIVE_THEME: ChartTheme = {
  name: 'Executive Dashboard',
  colors: {
    primary: COLOR_PALETTES_EXTENDED.executive,
    background: '#1A1A2E',
    text: '#EAEAEA',
    gridLines: '#2A2A3E',
    borders: '#3A3A4E',
  },
  fonts: {
    title: { family: 'Playfair Display, serif', size: 22, weight: 700, color: '#FFB400' },
    axis: { family: 'Roboto, sans-serif', size: 11, weight: 400, color: '#B0B0B0' },
    legend: { family: 'Roboto, sans-serif', size: 12, weight: 500, color: '#CCCCCC' },
    tooltip: { family: 'Roboto, sans-serif', size: 12, weight: 400, color: '#FFFFFF' },
  },
  borderRadius: 12,
  strokeWidth: 2,
  opacity: 0.92,
  animationDuration: 1200,
  animationEasing: 'ease-in-out',
};

// 5. Healthcare Clean
export const HEALTHCARE_THEME: ChartTheme = {
  name: 'Healthcare Clean',
  colors: {
    primary: COLOR_PALETTES_EXTENDED.healthcare,
    background: '#FFFFFF',
    text: '#003D5B',
    gridLines: '#E0F2F7',
    borders: '#B3E5FC',
  },
  fonts: {
    title: { family: 'Lato, sans-serif', size: 18, weight: 600, color: '#0077C8' },
    axis: { family: 'Lato, sans-serif', size: 11, weight: 400, color: '#546E7A' },
    legend: { family: 'Lato, sans-serif', size: 12, weight: 500, color: '#37474F' },
    tooltip: { family: 'Lato, sans-serif', size: 12, weight: 400, color: '#003D5B' },
  },
  borderRadius: 6,
  strokeWidth: 2,
  opacity: 0.85,
  animationDuration: 900,
  animationEasing: 'ease-out',
};

// 6. Retail Vibrant
export const RETAIL_THEME: ChartTheme = {
  name: 'Retail Vibrant',
  colors: {
    primary: COLOR_PALETTES_EXTENDED.retail,
    background: '#FFF9F5',
    text: '#2C1810',
    gridLines: '#F5E6DC',
    borders: '#E8D4C4',
  },
  fonts: {
    title: { family: 'Montserrat, sans-serif', size: 20, weight: 700, color: '#E31837' },
    axis: { family: 'Open Sans, sans-serif', size: 11, weight: 400, color: '#5D4E46' },
    legend: { family: 'Open Sans, sans-serif', size: 12, weight: 600, color: '#3E2F28' },
    tooltip: { family: 'Open Sans, sans-serif', size: 12, weight: 500, color: '#2C1810' },
  },
  borderRadius: 10,
  strokeWidth: 2.5,
  opacity: 0.9,
  animationDuration: 1100,
  animationEasing: 'ease-in-out',
};

// 7. Education Friendly
export const EDUCATION_THEME: ChartTheme = {
  name: 'Education Friendly',
  colors: {
    primary: COLOR_PALETTES_EXTENDED.education,
    background: '#F5F7FA',
    text: '#1A202C',
    gridLines: '#E2E8F0',
    borders: '#CBD5E1',
  },
  fonts: {
    title: { family: 'Nunito, sans-serif', size: 19, weight: 700, color: '#003DA5' },
    axis: { family: 'Nunito, sans-serif', size: 11, weight: 400, color: '#4A5568' },
    legend: { family: 'Nunito, sans-serif', size: 12, weight: 600, color: '#2D3748' },
    tooltip: { family: 'Nunito, sans-serif', size: 12, weight: 500, color: '#1A202C' },
  },
  borderRadius: 8,
  strokeWidth: 2,
  opacity: 0.88,
  animationDuration: 1000,
  animationEasing: 'ease-out',
};

// 8. OLED Dark Mode
export const OLED_DARK_THEME: ChartTheme = {
  name: 'OLED Dark',
  colors: {
    primary: COLOR_PALETTES_EXTENDED.neon,
    background: '#000000',
    text: '#E0E0E0',
    gridLines: '#1A1A1A',
    borders: '#2A2A2A',
  },
  fonts: {
    title: { family: 'Inter, sans-serif', size: 20, weight: 700, color: '#FFFFFF' },
    axis: { family: 'Inter, sans-serif', size: 11, weight: 400, color: '#A0A0A0' },
    legend: { family: 'Inter, sans-serif', size: 12, weight: 500, color: '#C0C0C0' },
    tooltip: { family: 'Inter, sans-serif', size: 12, weight: 500, color: '#FFFFFF' },
  },
  borderRadius: 10,
  strokeWidth: 2,
  opacity: 0.95,
  animationDuration: 800,
  animationEasing: 'ease-in-out',
};

// 9. High Contrast (Accessibility)
export const HIGH_CONTRAST_THEME: ChartTheme = {
  name: 'High Contrast',
  colors: {
    primary: COLOR_PALETTES_EXTENDED.highContrast,
    background: '#FFFFFF',
    text: '#000000',
    gridLines: '#666666',
    borders: '#333333',
  },
  fonts: {
    title: { family: 'Arial, sans-serif', size: 20, weight: 700, color: '#000000' },
    axis: { family: 'Arial, sans-serif', size: 12, weight: 700, color: '#000000' },
    legend: { family: 'Arial, sans-serif', size: 13, weight: 700, color: '#000000' },
    tooltip: { family: 'Arial, sans-serif', size: 13, weight: 700, color: '#000000' },
  },
  borderRadius: 0,
  strokeWidth: 3,
  opacity: 1.0,
  animationDuration: 0,
  animationEasing: 'linear',
};

// 10. Colorblind Safe
export const COLORBLIND_SAFE_THEME: ChartTheme = {
  name: 'Colorblind Safe',
  colors: {
    primary: COLOR_PALETTES_EXTENDED.colorblindSafe,
    background: '#FFFFFF',
    text: '#1A1A1A',
    gridLines: '#CCCCCC',
    borders: '#999999',
  },
  fonts: {
    title: { family: 'Verdana, sans-serif', size: 18, weight: 600, color: '#000000' },
    axis: { family: 'Verdana, sans-serif', size: 11, weight: 400, color: '#333333' },
    legend: { family: 'Verdana, sans-serif', size: 12, weight: 500, color: '#1A1A1A' },
    tooltip: { family: 'Verdana, sans-serif', size: 12, weight: 500, color: '#000000' },
  },
  borderRadius: 4,
  strokeWidth: 2.5,
  opacity: 0.9,
  animationDuration: 800,
  animationEasing: 'ease-out',
};

// Continue in next file...
