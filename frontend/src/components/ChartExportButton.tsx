/**
 * Chart Export Button Component
 *
 * Provides a dropdown menu for exporting charts in various formats.
 * Can be embedded in any chart component for easy export functionality.
 */

import React, { useState, useRef } from 'react';
import { ChartExportOptions } from '../types/charts';
import {
  exportToPNG,
  exportToSVG,
  exportToPDF,
  downloadChart,
  copyToClipboard,
  printChart,
} from '../utils/chartExport';

interface ChartExportButtonProps {
  chartRef: React.RefObject<HTMLElement>;
  chartTitle?: string;
  className?: string;
}

export const ChartExportButton: React.FC<ChartExportButtonProps> = ({
  chartRef,
  chartTitle = 'chart',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleExport = async (format: 'png' | 'svg' | 'pdf', options: ChartExportOptions = {}) => {
    if (!chartRef.current) {
      setExportError('Chart element not found');
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      let blob: Blob;

      switch (format) {
        case 'png':
          blob = await exportToPNG(chartRef.current, { format, ...options });
          break;
        case 'svg':
          blob = exportToSVG(chartRef.current, { format, ...options });
          break;
        case 'pdf':
          blob = await exportToPDF(chartRef.current, { format, ...options });
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${chartTitle.replace(/\s+/g, '_')}_${timestamp}`;

      downloadChart(blob, filename, format);
      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!chartRef.current) {
      setExportError('Chart element not found');
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      await copyToClipboard(chartRef.current);
      setIsOpen(false);
      // Show success notification (you could use a toast library)
      alert('Chart copied to clipboard!');
    } catch (error) {
      console.error('Copy error:', error);
      setExportError('Failed to copy to clipboard');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (!chartRef.current) {
      setExportError('Chart element not found');
      return;
    }

    try {
      printChart(chartRef.current);
      setIsOpen(false);
    } catch (error) {
      console.error('Print error:', error);
      setExportError('Failed to print chart');
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Export Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Export chart"
      >
        <svg
          className={`w-4 h-4 ${isExporting ? 'animate-spin' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isExporting ? (
            <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          )}
        </svg>
        <span>{isExporting ? 'Exporting...' : 'Export'}</span>
        {!isExporting && (
          <svg
            className="w-4 h-4"
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
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && !isExporting && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Error Message */}
          {exportError && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-100">
              <p className="text-xs text-red-600">{exportError}</p>
            </div>
          )}

          {/* Export Options */}
          <div className="py-1">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Download As
            </div>

            {/* PNG */}
            <button
              onClick={() => handleExport('png', { quality: 1.0 })}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <span className="text-lg">🖼️</span>
              <div className="flex-1 text-left">
                <div className="font-medium">PNG Image</div>
                <div className="text-xs text-gray-500">High quality raster image</div>
              </div>
            </button>

            {/* SVG */}
            <button
              onClick={() => handleExport('svg')}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <span className="text-lg">📐</span>
              <div className="flex-1 text-left">
                <div className="font-medium">SVG Vector</div>
                <div className="text-xs text-gray-500">Scalable vector graphic</div>
              </div>
            </button>

            {/* PDF */}
            <button
              onClick={() => handleExport('pdf')}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <span className="text-lg">📄</span>
              <div className="flex-1 text-left">
                <div className="font-medium">PDF Document</div>
                <div className="text-xs text-gray-500">Portable document format</div>
              </div>
            </button>

            <div className="border-t border-gray-200 my-1"></div>

            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Quick Actions
            </div>

            {/* Copy to Clipboard */}
            <button
              onClick={handleCopyToClipboard}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <span className="text-lg">📋</span>
              <div className="flex-1 text-left">
                <div className="font-medium">Copy to Clipboard</div>
                <div className="text-xs text-gray-500">Copy as PNG image</div>
              </div>
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <span className="text-lg">🖨️</span>
              <div className="flex-1 text-left">
                <div className="font-medium">Print Chart</div>
                <div className="text-xs text-gray-500">Send to printer</div>
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <p className="text-xs text-gray-500">
              Exports preserve current theme and styling
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Chart Toolbar Component
 *
 * Complete toolbar with export, refresh, and other actions.
 */
interface ChartToolbarProps {
  chartRef: React.RefObject<HTMLElement>;
  chartTitle?: string;
  onRefresh?: () => void;
  onFullscreen?: () => void;
  showRefresh?: boolean;
  showFullscreen?: boolean;
  showExport?: boolean;
  className?: string;
}

export const ChartToolbar: React.FC<ChartToolbarProps> = ({
  chartRef,
  chartTitle,
  onRefresh,
  onFullscreen,
  showRefresh = true,
  showFullscreen = true,
  showExport = true,
  className = '',
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Refresh Button */}
      {showRefresh && onRefresh && (
        <button
          onClick={onRefresh}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh data"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      )}

      {/* Fullscreen Button */}
      {showFullscreen && onFullscreen && (
        <button
          onClick={onFullscreen}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Fullscreen"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>
      )}

      {/* Export Button */}
      {showExport && (
        <ChartExportButton chartRef={chartRef} chartTitle={chartTitle} />
      )}
    </div>
  );
};

export default ChartExportButton;
