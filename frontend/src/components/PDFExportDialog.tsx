/**
 * PDF Export Dialog Component
 *
 * User interface for configuring and generating PDF reports with:
 * - Format selection (A4, Letter, Legal)
 * - Orientation (Portrait, Landscape)
 * - Header/Footer configuration
 * - Multi-chart selection
 * - Preview functionality
 */

import React, { useState, useRef } from 'react';
import {
  PDFExporter,
  PDFExportOptions,
  exportChartToPDF,
  exportMultiChartReport,
  PDFReportSection,
} from '../utils/pdfExport';

interface PDFExportDialogProps {
  chartElement?: HTMLElement;
  charts?: {
    element: HTMLElement;
    title?: string;
    description?: string;
  }[];
  onClose: () => void;
  onExport?: (blob: Blob) => void;
}

export const PDFExportDialog: React.FC<PDFExportDialogProps> = ({
  chartElement,
  charts = [],
  onClose,
  onExport,
}) => {
  const [options, setOptions] = useState<PDFExportOptions>({
    orientation: 'portrait',
    format: 'a4',
    title: 'Chart Report',
    author: 'ClickView',
    header: { enabled: true, text: 'ClickView Enterprise', fontSize: 10, align: 'center' },
    footer: { enabled: true, text: 'Page {page} of {pages}', fontSize: 10, align: 'center' },
    watermark: '',
  });

  const [isExporting, setIsExporting] = useState(false);
  const [selectedCharts, setSelectedCharts] = useState<number[]>([]);
  const [layout, setLayout] = useState<'single' | 'grid-2x1' | 'grid-2x2' | 'grid-3x2'>('grid-2x2');

  const handleExport = async () => {
    setIsExporting(true);

    try {
      let blob: Blob;

      if (chartElement) {
        // Single chart export
        blob = await exportChartToPDF(chartElement, options);
      } else if (charts.length > 0) {
        // Multi-chart export
        const selectedChartElements = selectedCharts.length > 0
          ? selectedCharts.map(i => charts[i])
          : charts;

        const sections: PDFReportSection[] = [{
          title: 'Charts',
          charts: selectedChartElements,
          layout: layout,
        }];

        blob = await exportMultiChartReport(sections, options);
      } else {
        throw new Error('No charts to export');
      }

      // Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${options.title?.replace(/\s+/g, '-').toLowerCase() || 'report'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      if (onExport) {
        onExport(blob);
      }

      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const toggleChartSelection = (index: number) => {
    setSelectedCharts(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Export to PDF</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure your PDF export settings
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Format & Orientation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Page Size
              </label>
              <select
                value={options.format as string}
                onChange={(e) => setOptions({ ...options, format: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
                <option value="legal">Legal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Orientation
              </label>
              <select
                value={options.orientation}
                onChange={(e) => setOptions({ ...options, orientation: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
          </div>

          {/* Title & Author */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Report Title
              </label>
              <input
                type="text"
                value={options.title}
                onChange={(e) => setOptions({ ...options, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter report title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Author
              </label>
              <input
                type="text"
                value={options.author}
                onChange={(e) => setOptions({ ...options, author: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter author name"
              />
            </div>
          </div>

          {/* Header/Footer */}
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="header-enabled"
                checked={options.header?.enabled}
                onChange={(e) => setOptions({
                  ...options,
                  header: { ...options.header!, enabled: e.target.checked },
                })}
                className="mr-2"
              />
              <label htmlFor="header-enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Include Header
              </label>
            </div>

            {options.header?.enabled && (
              <input
                type="text"
                value={options.header.text}
                onChange={(e) => setOptions({
                  ...options,
                  header: { ...options.header!, text: e.target.value },
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Header text"
              />
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="footer-enabled"
                checked={options.footer?.enabled}
                onChange={(e) => setOptions({
                  ...options,
                  footer: { ...options.footer!, enabled: e.target.checked },
                })}
                className="mr-2"
              />
              <label htmlFor="footer-enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Include Footer
              </label>
            </div>

            {options.footer?.enabled && (
              <input
                type="text"
                value={options.footer.text}
                onChange={(e) => setOptions({
                  ...options,
                  footer: { ...options.footer!, text: e.target.value },
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Footer text (use {page} and {pages})"
              />
            )}
          </div>

          {/* Watermark */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Watermark (optional)
            </label>
            <input
              type="text"
              value={options.watermark}
              onChange={(e) => setOptions({ ...options, watermark: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="e.g., CONFIDENTIAL"
            />
          </div>

          {/* Multi-chart options */}
          {charts.length > 0 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Chart Layout
                </label>
                <select
                  value={layout}
                  onChange={(e) => setLayout(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="single">Single (one per page)</option>
                  <option value="grid-2x1">2 × 1 Grid</option>
                  <option value="grid-2x2">2 × 2 Grid</option>
                  <option value="grid-3x2">3 × 2 Grid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Charts ({selectedCharts.length > 0 ? selectedCharts.length : 'All'})
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3">
                  {charts.map((chart, index) => (
                    <div key={index} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`chart-${index}`}
                        checked={selectedCharts.includes(index) || selectedCharts.length === 0}
                        onChange={() => toggleChartSelection(index)}
                        className="mr-2"
                      />
                      <label
                        htmlFor={`chart-${index}`}
                        className="text-sm text-gray-700 dark:text-gray-300"
                      >
                        {chart.title || `Chart ${index + 1}`}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Exporting...
              </>
            ) : (
              'Export PDF'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
