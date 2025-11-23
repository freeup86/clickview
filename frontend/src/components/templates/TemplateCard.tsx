/**
 * Template Card Component
 *
 * Displays a dashboard template card with preview thumbnail,
 * metadata, and action buttons.
 */

import React from 'react';
import { DashboardTemplate } from '../../pages/TemplateGalleryPage';

interface TemplateCardProps {
  template: DashboardTemplate;
  onUse: () => void;
  onPreview: () => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onUse,
  onPreview,
}) => {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      productivity: 'bg-green-100 text-green-700',
      'project-management': 'bg-blue-100 text-blue-700',
      sales: 'bg-purple-100 text-purple-700',
      marketing: 'bg-pink-100 text-pink-700',
      engineering: 'bg-orange-100 text-orange-700',
      executive: 'bg-indigo-100 text-indigo-700',
      custom: 'bg-gray-100 text-gray-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden border border-gray-200 flex flex-col">
      {/* Thumbnail */}
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                />
              </svg>
              <div className="text-sm font-medium text-gray-500">
                {template.widgetCount} Widgets
              </div>
            </div>
          </div>
        )}

        {/* Preview Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
          <button
            onClick={onPreview}
            className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium shadow-lg transform scale-95 hover:scale-100 transition-transform"
          >
            👁️ Preview
          </button>
        </div>

        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`px-2 py-1 rounded text-xs font-semibold ${getCategoryColor(
              template.category
            )}`}
          >
            {template.category.replace('-', ' ')}
          </span>
        </div>

        {/* Rating Badge */}
        {template.rating && (
          <div className="absolute top-3 right-3 bg-white rounded px-2 py-1 shadow-md">
            <span className="text-yellow-500 text-sm">⭐</span>
            <span className="text-sm font-semibold ml-1">{template.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2 flex-1">{template.description}</p>

        {/* Tags */}
        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {template.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
              >
                {tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="px-2 py-0.5 text-gray-500 text-xs">
                +{template.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-3">
            <span>📊 {template.widgetCount} widgets</span>
            <span>👥 {template.usageCount.toLocaleString()} uses</span>
          </div>
        </div>

        {/* Author */}
        {template.author && (
          <div className="text-xs text-gray-500 mb-3">
            by <span className="font-medium">{template.author}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onUse}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Use This Template
        </button>
      </div>
    </div>
  );
};
