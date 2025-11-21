/**
 * Theme Selector Component
 *
 * Visual theme selection UI with preview, categorization, and search.
 */

import React, { useState, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { THEME_REGISTRY, ThemeCategory, ThemeMetadata } from '../themes';

interface ThemeSelectorProps {
  className?: string;
  showPreview?: boolean;
  compact?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  className = '',
  showPreview = true,
  compact = false,
}) => {
  const { currentThemeId, setTheme, isDarkMode, isAccessibleTheme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter themes
  const filteredThemes = useMemo(() => {
    let themes = THEME_REGISTRY;

    // Filter by category
    if (selectedCategory !== 'all') {
      themes = themes.filter(t => t.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      themes = themes.filter(
        t =>
          t.theme.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return themes;
  }, [selectedCategory, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: THEME_REGISTRY.length };

    Object.values(ThemeCategory).forEach(category => {
      counts[category] = THEME_REGISTRY.filter(t => t.category === category).length;
    });

    return counts;
  }, []);

  const categories = [
    { id: 'all', name: 'All Themes', icon: '🎨' },
    { id: ThemeCategory.GENERAL, name: 'General', icon: '📊' },
    { id: ThemeCategory.INDUSTRY, name: 'Industry', icon: '🏢' },
    { id: ThemeCategory.ACCESSIBILITY, name: 'Accessibility', icon: '♿' },
    { id: ThemeCategory.NATURE, name: 'Nature', icon: '🌿' },
    { id: ThemeCategory.MODERN, name: 'Modern', icon: '✨' },
    { id: ThemeCategory.SPECIALTY, name: 'Specialty', icon: '⭐' },
  ];

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Theme Gallery</h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose from {THEME_REGISTRY.length} professionally designed themes
            </p>
          </div>

          {/* Current Theme Badge */}
          <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium text-blue-700">Current:</span>
            <span className="text-sm font-semibold text-blue-900">
              {THEME_REGISTRY.find(t => t.id === currentThemeId)?.theme.name || 'Custom'}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search themes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="absolute left-3 top-3 h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      <div className="flex">
        {/* Category Sidebar */}
        {!compact && (
          <div className="w-64 border-r bg-gray-50">
            <div className="p-4 space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id as ThemeCategory | 'all')}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center space-x-3">
                    <span className="text-xl">{category.icon}</span>
                    <span>{category.name}</span>
                  </span>
                  <span className="text-sm text-gray-500">
                    {categoryCounts[category.id]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Theme Grid */}
        <div className="flex-1 p-6 overflow-y-auto max-h-[600px]">
          {filteredThemes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-5xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No themes found
              </h3>
              <p className="text-gray-600">
                Try adjusting your search or category filter
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredThemes.map((themeMetadata) => (
                <ThemeCard
                  key={themeMetadata.id}
                  metadata={themeMetadata}
                  isSelected={themeMetadata.id === currentThemeId}
                  onSelect={() => setTheme(themeMetadata.id)}
                  showPreview={showPreview}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Individual Theme Card
 */
interface ThemeCardProps {
  metadata: ThemeMetadata;
  isSelected: boolean;
  onSelect: () => void;
  showPreview?: boolean;
}

const ThemeCard: React.FC<ThemeCardProps> = ({
  metadata,
  isSelected,
  onSelect,
  showPreview = true,
}) => {
  const { theme, description, tags, accessibility } = metadata;

  return (
    <div
      className={`bg-white rounded-lg border-2 overflow-hidden transition-all cursor-pointer hover:shadow-lg ${
        isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200'
      }`}
      onClick={onSelect}
    >
      {/* Preview */}
      {showPreview && (
        <div
          className="h-24 flex items-center justify-center"
          style={{ backgroundColor: theme.colors.background }}
        >
          <div className="flex space-x-1">
            {theme.colors.primary.slice(0, 6).map((color, index) => (
              <div
                key={index}
                className="w-8 h-16 rounded"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900">{theme.name}</h3>
          {isSelected && (
            <span className="flex items-center text-xs font-medium text-blue-600">
              <svg
                className="w-4 h-4 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Active
            </span>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-3">{description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Accessibility Badges */}
        {(accessibility.wcagLevel || accessibility.colorblindSafe || accessibility.highContrast) && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200">
            {accessibility.wcagLevel && (
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                WCAG {accessibility.wcagLevel}
              </span>
            )}
            {accessibility.colorblindSafe && (
              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium">
                ♿ Colorblind Safe
              </span>
            )}
            {accessibility.highContrast && (
              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-medium">
                High Contrast
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Compact Theme Selector (Dropdown)
 */
export const CompactThemeSelector: React.FC = () => {
  const { currentThemeId, currentTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <div className="flex space-x-1">
          {currentTheme.colors.primary.slice(0, 3).map((color, index) => (
            <div
              key={index}
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <span className="font-medium text-gray-700">{currentTheme.name}</span>
        <svg
          className="w-4 h-4 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-2">
              {THEME_REGISTRY.map((metadata) => (
                <button
                  key={metadata.id}
                  onClick={() => {
                    setTheme(metadata.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left ${
                    metadata.id === currentThemeId
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex space-x-1">
                    {metadata.theme.colors.primary.slice(0, 3).map((color, index) => (
                      <div
                        key={index}
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span className="flex-1 font-medium">{metadata.theme.name}</span>
                  {metadata.id === currentThemeId && (
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ThemeSelector;
