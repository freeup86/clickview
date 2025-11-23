/**
 * Template Preview Component
 *
 * Shows a detailed preview of a dashboard template including
 * widget layout, description, and metadata in a modal dialog.
 */

import React from 'react';
import { XIcon } from '../icons';
import { DashboardTemplate } from '../../pages/TemplateGalleryPage';

interface TemplatePreviewProps {
  template: DashboardTemplate;
  isOpen: boolean;
  onClose: () => void;
  onUse: () => void;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  isOpen,
  onClose,
  onUse,
}) => {
  if (!isOpen) return null;

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      productivity: '⚡',
      'project-management': '📋',
      sales: '💼',
      marketing: '📈',
      engineering: '⚙️',
      executive: '👔',
      custom: '🎨',
    };
    return icons[category] || '📊';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{getCategoryIcon(template.category)}</span>
                <h2 className="text-2xl font-bold text-gray-900">{template.name}</h2>
              </div>
              <p className="text-gray-600">{template.description}</p>
              {template.author && (
                <p className="text-sm text-gray-500 mt-2">
                  Created by <span className="font-medium">{template.author}</span>
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-3 gap-6 mb-6">
              {/* Stats Cards */}
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{template.widgetCount}</div>
                <div className="text-sm text-blue-700 mt-1">Widgets</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {template.usageCount.toLocaleString()}
                </div>
                <div className="text-sm text-green-700 mt-1">Uses</div>
              </div>
              {template.rating && (
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-600">
                    ⭐ {template.rating.toFixed(1)}
                  </div>
                  <div className="text-sm text-yellow-700 mt-1">Rating</div>
                </div>
              )}
            </div>

            {/* Tags */}
            {template.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Widget Layout Preview */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Dashboard Layout</h3>
              <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
                {template.previewData?.widgets && template.previewData.widgets.length > 0 ? (
                  <div className="relative" style={{ minHeight: '400px' }}>
                    {/* Grid Background */}
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage:
                          'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
                        backgroundSize: '60px 60px',
                      }}
                    />

                    {/* Widgets */}
                    {template.previewData.widgets.map((widget, index) => (
                      <div
                        key={index}
                        className="absolute bg-white rounded-lg shadow-sm border border-gray-300 p-3"
                        style={{
                          left: `${(widget.position.x / 12) * 100}%`,
                          top: `${widget.position.y * 60}px`,
                          width: `${(widget.position.w / 12) * 100}%`,
                          height: `${widget.position.h * 60}px`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full" />
                          <div className="text-sm font-medium text-gray-700 truncate">
                            {widget.title}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 capitalize">{widget.type.replace('_', ' ')}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <svg
                        className="w-16 h-16 mx-auto mb-2 text-gray-400"
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
                      <p>Layout preview not available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* What's Included */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">What's Included</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Pre-configured widgets with sample data connections</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Responsive dashboard layout optimized for your screen</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Filters and aggregation settings ready to use</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Fully customizable after creation</span>
                </li>
              </ul>
            </div>

            {/* Category Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{getCategoryIcon(template.category)}</div>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">
                    {template.category.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </h4>
                  <p className="text-sm text-blue-800">
                    This template is designed specifically for {template.category.replace('-', ' ')} use cases.
                    All widgets and metrics are pre-configured to help you get insights faster.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <div className="text-sm text-gray-600">
              {template.isPublic ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Public Template
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full" />
                  Private Template
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="btn-secondary">
                Close
              </button>
              <button onClick={onUse} className="btn-primary px-6">
                Use This Template
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
