/**
 * Export Button Component
 *
 * Provides a button to trigger dashboard export with dropdown menu
 * for quick format selection or opening the full export options modal.
 */

import React, { useState, useRef, useEffect } from 'react';
import { DownloadIcon } from '../icons';

interface ExportButtonProps {
  onExport: (format: 'pdf' | 'excel' | 'csv' | 'powerpoint' | 'custom') => void;
  disabled?: boolean;
  className?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  onExport,
  disabled = false,
  className = '',
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleQuickExport = (format: 'pdf' | 'excel' | 'csv' | 'powerpoint') => {
    setShowDropdown(false);
    onExport(format);
  };

  const handleCustomExport = () => {
    setShowDropdown(false);
    onExport('custom');
  };

  const exportFormats = [
    { id: 'pdf', label: 'Export as PDF', icon: '📄', description: 'Best for sharing and printing' },
    { id: 'excel', label: 'Export as Excel', icon: '📊', description: 'Best for data analysis' },
    { id: 'csv', label: 'Export as CSV', icon: '📋', description: 'Best for raw data' },
    { id: 'powerpoint', label: 'Export as PowerPoint', icon: '📽️', description: 'Best for presentations' },
  ] as const;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={disabled}
        className="btn-primary flex items-center gap-2 px-4 py-2"
        title="Export dashboard"
      >
        <DownloadIcon className="w-5 h-5" />
        <span>Export</span>
        <svg
          className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-2">
            {/* Quick Export Options */}
            <div className="space-y-1">
              {exportFormats.map((format) => (
                <button
                  key={format.id}
                  onClick={() => handleQuickExport(format.id)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{format.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">{format.label}</div>
                      <div className="text-xs text-gray-500">{format.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="my-2 border-t border-gray-200" />

            {/* Custom Options */}
            <button
              onClick={handleCustomExport}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚙️</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 text-sm">More Options...</div>
                  <div className="text-xs text-gray-500">Configure export settings</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
