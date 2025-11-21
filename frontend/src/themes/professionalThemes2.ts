/**
 * Professional Themes Collection (Part 2)
 *
 * Additional 10+ themes for specialized use cases.
 */

import { ChartTheme } from '../types/charts';
import { COLOR_PALETTES_EXTENDED } from './professionalThemes';

// 11. Material Design
export const MATERIAL_THEME: ChartTheme = {
  name: 'Material Design',
  colors: {
    primary: COLOR_PALETTES_EXTENDED.material,
    background: '#FAFAFA',
    text: '#212121',
    gridLines: '#E0E0E0',
    borders: '#BDBDBD',
  },
  fonts: {
    title: { family: 'Roboto, sans-serif', size: 20, weight: 500, color: '#1976D2' },
    axis: { family: 'Roboto, sans-serif', size: 11, weight: 400, color: '#616161' },
    legend: { family: 'Roboto, sans-serif', size: 12, weight: 500, color: '#424242' },
    tooltip: { family: 'Roboto, sans-serif', size: 12, weight: 400, color: '#212121' },
  },
  borderRadius: 4,
  strokeWidth: 2,
  opacity: 0.87,
  animationDuration: 300,
  animationEasing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
};

// 12. Flat Design
export const FLAT_THEME: ChartTheme = {
  name: 'Flat Design',
  colors: {
    primary: COLOR_PALETTES_EXTENDED.flat,
    background: '#ECF0F1',
    text: '#2C3E50',
    gridLines: '#BDC3C7',
    borders: '#95A5A6',
  },
  fonts: {
    title: { family: 'Lato, sans-serif', size: 20, weight: 700, color: '#34495E' },
    axis: { family: 'Lato, sans-serif', size: 11, weight: 400, color: '#7F8C8D' },
    legend: { family: 'Lato, sans-serif', size: 12, weight: 600, color: '#2C3E50' },
    tooltip: { family: 'Lato, sans-serif', size: 12, weight: 500, color: '#2C3E50' },
  },
  borderRadius: 0,
  strokeWidth: 2,
  opacity: 1.0,
  animationDuration: 600,
  animationEasing: 'ease-in-out',
};

// 13. Ocean Blue
export const OCEAN_THEME: ChartTheme = {
  name: 'Ocean Blue',
  colors: {
    primary: COLOR_PALETTES_EXTENDED.ocean,
    background: '#F0F8FF',
    text: '#003D5B',
    gridLines: '#B8E6F0',
    borders: '#85C1E2',
  },
  fonts: {
    title: { family: 'Merriweather, serif', size: 19, weight: 700, color: '#006994' },
    axis: { family: 'Open Sans, sans-serif', size: 11, weight: 400, color: '#4A707A' },
    legend: { family: 'Open Sans, sans-serif', size: 12, weight: 500, color: '#2C5F6F' },
    tooltip: { family: 'Open Sans, sans-serif', size: 12, weight: 400, color: '#003D5B' },
  },
  borderRadius: 12,
  strokeWidth: 2,
  opacity: 0.85,
  animationDuration: 1200,
  animationEasing: 'ease-in-out',
};

// 14. Forest Green
export const FOREST_THEME: ChartTheme = {
  name: 'Forest Green',
  colors: {
    primary: COLOR_PALETTES_EXTENDED.forest,
    background: '#F5F9F5',
    text: '#2D5016',
    gridLines: '#D4E7C5',
    borders: '#A8D08D',
  },
  fonts: {
    title: { family: 'Quicksand, sans-serif', size: 19, weight: 700, color: '#3D6817' },
    axis: { family: 'Quicksand, sans-serif', size: 11, weight: 400, color: '#5A7D3A' },
    legend: { family: 'Quicksand, sans-serif', size: 12, weight: 600, color: '#4E7F1B' },
    tooltip: { family: 'Quicksand, sans-serif', size: 12, weight: 500, color: '#2D5016' },
  },
  borderRadius: 8,
  strokeWidth: 2,
  opacity: 0.88,
  animationDuration: 1000,
  animationEasing: 'ease-out',
};

// 15. Sunset Warm
export const SUNSET_THEME: ChartTheme = {
  name: 'Sunset Warm',
  colors: {
    primary: COLOR_PALETTES_EXTENDED.sunset,
    background: '#FFF5E6',
    text: '#6C1A0C',
    gridLines: '#FFE0B2',
    borders: '#FFCC80',
  },
  fonts: {
    title: { family: 'Raleway, sans-serif', size: 20, weight: 700, color: '#C0392B' },
    axis: { family: 'Raleway, sans-serif', size: 11, weight: 400, color: '#8B3A2F' },
    legend: { family: 'Raleway, sans-serif', size: 12, weight: 600, color: '#96281B' },
    tooltip: { family: 'Raleway, sans-serif', size: 12, weight: 500, color: '#6C1A0C' },
  },
  borderRadius: 10,
  strokeWidth: 2,
  opacity: 0.9,
  animationDuration: 1100,
  animationEasing: 'ease-in-out',
};

// 16. Earth Tones
export const EARTH_THEME: ChartTheme = {
  name: 'Earth Tones',
  colors: {
    primary: COLOR_PALETTES_EXTENDED.earth,
    background: '#FAF6F1',
    text: '#4A3728',
    gridLines: '#E8DFD4',
    borders: '#D2C4B8',
  },
  fonts: {
    title: { family: 'Crimson Text, serif', size: 20, weight: 700, color: '#6B4423' },
    axis: { family: 'Lato, sans-serif', size: 11, weight: 400, color: '#7A5C4A' },
    legend: { family: 'Lato, sans-serif', size: 12, weight: 500, color: '#5C4434' },
    tooltip: { family: 'Lato, sans-serif', size: 12, weight: 400, color: '#4A3728' },
  },
  borderRadius: 6,
  strokeWidth: 2,
  opacity: 0.87,
  animationDuration: 900,
  animationEasing: 'ease-out',
};

// 17. Neon Bright
export const NEON_THEME: ChartTheme = {
  name: 'Neon Bright',
  colors: {
    primary: COLOR_PALETTES_EXTENDED.neon,
    background: '#0A0A0A',
    text: '#FFFFFF',
    gridLines: '#222222',
    borders: '#333333',
  },
  fonts: {
    title: { family: 'Orbitron, sans-serif', size: 21, weight: 700, color: '#00F5FF' },
    axis: { family: 'Rajdhani, sans-serif', size: 11, weight: 500, color: '#CCCCCC' },
    legend: { family: 'Rajdhani, sans-serif', size: 12, weight: 600, color: '#EEEEEE' },
    tooltip: { family: 'Rajdhani, sans-serif', size: 12, weight: 600, color: '#FFFFFF' },
  },
  borderRadius: 4,
  strokeWidth: 2.5,
  opacity: 0.95,
  animationDuration: 600,
  animationEasing: 'linear',
};

// 18. Gradient Modern
export const GRADIENT_THEME: ChartTheme = {
  name: 'Gradient Modern',
  colors: {
    primary: COLOR_PALETTES_EXTENDED.gradient,
    background: '#FAFBFC',
    text: '#1A1F36',
    gridLines: '#E3E8EE',
    borders: '#C1C9D2',
  },
  fonts: {
    title: { family: 'Poppins, sans-serif', size: 20, weight: 700, color: '#667EEA' },
    axis: { family: 'Poppins, sans-serif', size: 11, weight: 400, color: '#6B7C93' },
    legend: { family: 'Poppins, sans-serif', size: 12, weight: 600, color: '#3C4257' },
    tooltip: { family: 'Poppins, sans-serif', size: 12, weight: 500, color: '#1A1F36' },
  },
  borderRadius: 16,
  strokeWidth: 2,
  opacity: 0.88,
  animationDuration: 1200,
  animationEasing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
};

// 19. Minimalist
export const MINIMALIST_THEME: ChartTheme = {
  name: 'Minimalist',
  colors: {
    primary: ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#E0E0E0', '#F5F5F5', '#FFFFFF'],
    background: '#FFFFFF',
    text: '#000000',
    gridLines: '#F0F0F0',
    borders: '#E0E0E0',
  },
  fonts: {
    title: { family: 'Helvetica Neue, sans-serif', size: 18, weight: 300, color: '#000000' },
    axis: { family: 'Helvetica Neue, sans-serif', size: 10, weight: 300, color: '#666666' },
    legend: { family: 'Helvetica Neue, sans-serif', size: 11, weight: 400, color: '#333333' },
    tooltip: { family: 'Helvetica Neue, sans-serif', size: 11, weight: 300, color: '#000000' },
  },
  borderRadius: 0,
  strokeWidth: 1,
  opacity: 0.9,
  animationDuration: 500,
  animationEasing: 'linear',
};

// 20. Print Optimized
export const PRINT_THEME: ChartTheme = {
  name: 'Print Optimized',
  colors: {
    primary: ['#000000', '#4D4D4D', '#808080', '#B3B3B3', '#CCCCCC', '#E6E6E6'],
    background: '#FFFFFF',
    text: '#000000',
    gridLines: '#D0D0D0',
    borders: '#A0A0A0',
  },
  fonts: {
    title: { family: 'Times New Roman, serif', size: 16, weight: 700, color: '#000000' },
    axis: { family: 'Arial, sans-serif', size: 10, weight: 400, color: '#000000' },
    legend: { family: 'Arial, sans-serif', size: 11, weight: 600, color: '#000000' },
    tooltip: { family: 'Arial, sans-serif', size: 11, weight: 400, color: '#000000' },
  },
  borderRadius: 0,
  strokeWidth: 1.5,
  opacity: 1.0,
  animationDuration: 0,
  animationEasing: 'linear',
};

// 21. Presentation Mode
export const PRESENTATION_THEME: ChartTheme = {
  name: 'Presentation Mode',
  colors: {
    primary: COLOR_PALETTES_EXTENDED.professional,
    background: '#FFFFFF',
    text: '#1A1A1A',
    gridLines: '#E8E8E8',
    borders: '#CCCCCC',
  },
  fonts: {
    title: { family: 'Calibri, sans-serif', size: 24, weight: 700, color: '#264478' },
    axis: { family: 'Calibri, sans-serif', size: 14, weight: 400, color: '#404040' },
    legend: { family: 'Calibri, sans-serif', size: 16, weight: 600, color: '#2B2B2B' },
    tooltip: { family: 'Calibri, sans-serif', size: 14, weight: 500, color: '#1A1A1A' },
  },
  borderRadius: 6,
  strokeWidth: 3,
  opacity: 0.9,
  animationDuration: 800,
  animationEasing: 'ease-out',
};

/**
 * All professional themes collection
 */
export const PROFESSIONAL_THEMES = [
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
];

export default PROFESSIONAL_THEMES;
