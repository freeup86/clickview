/**
 * Export Options Modal Component
 *
 * Comprehensive modal for configuring dashboard export settings including
 * format selection, layout options, widget selection, and scheduling.
 */

import React, { useState } from 'react';
import { XIcon } from '../icons';

interface ExportFormat {
  id: 'pdf' | 'excel' | 'csv' | 'powerpoint';
  name: string;
  icon: string;
  description: string;
  supportedOptions: string[];
}

interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'powerpoint';
  orientation?: 'portrait' | 'landscape';
  paperSize?: 'letter' | 'a4' | 'legal' | 'tabloid';
  includeCharts?: boolean;
  includeData?: boolean;
  selectedWidgets?: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  schedule?: boolean;
  scheduleFrequency?: 'once' | 'daily' | 'weekly' | 'monthly';
  scheduleTime?: string;
  recipients?: string[];
}

interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  dashboardId: string;
  widgetList?: { id: string; title: string; type: string }[];
  initialFormat?: 'pdf' | 'excel' | 'csv' | 'powerpoint';
}

export const ExportOptionsModal: React.FC<ExportOptionsModalProps> = ({
  isOpen,
  onClose,
  onExport,
  dashboardId,
  widgetList = [],
  initialFormat = 'pdf',
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    format: initialFormat,
    orientation: 'landscape',
    paperSize: 'letter',
    includeCharts: true,
    includeData: true,
    selectedWidgets: widgetList.map((w) => w.id),
    schedule: false,
    scheduleFrequency: 'once',
    recipients: [],
  });

  const [recipientInput, setRecipientInput] = useState('');

  const formats: ExportFormat[] = [
    {
      id: 'pdf',
      name: 'PDF',
      icon: '📄',
      description: 'Best for sharing and printing',
      supportedOptions: ['orientation', 'paperSize', 'includeCharts', 'widgets'],
    },
    {
      id: 'excel',
      name: 'Excel',
      icon: '📊',
      description: 'Best for data analysis',
      supportedOptions: ['includeCharts', 'includeData', 'widgets'],
    },
    {
      id: 'csv',
      name: 'CSV',
      icon: '📋',
      description: 'Best for raw data export',
      supportedOptions: ['widgets', 'dateRange'],
    },
    {
      id: 'powerpoint',
      name: 'PowerPoint',
      icon: '📽️',
      description: 'Best for presentations',
      supportedOptions: ['orientation', 'widgets'],
    },
  ];

  if (!isOpen) return null;

  const selectedFormat = formats.find((f) => f.id === options.format)!;

  const supportsOption = (option: string) => {
    return selectedFormat.supportedOptions.includes(option);
  };

  const handleFormatChange = (format: 'pdf' | 'excel' | 'csv' | 'powerpoint') => {
    setOptions({ ...options, format });
  };

  const handleWidgetToggle = (widgetId: string) => {
    const current = options.selectedWidgets || [];
    const updated = current.includes(widgetId)
      ? current.filter((id) => id !== widgetId)
      : [...current, widgetId];
    setOptions({ ...options, selectedWidgets: updated });
  };

  const handleSelectAllWidgets = () => {
    setOptions({ ...options, selectedWidgets: widgetList.map((w) => w.id) });
  };

  const handleDeselectAllWidgets = () => {
    setOptions({ ...options, selectedWidgets: [] });
  };

  const handleAddRecipient = () => {
    if (recipientInput.trim() && options.recipients) {
      setOptions({
        ...options,
        recipients: [...options.recipients, recipientInput.trim()],
      });
      setRecipientInput('');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setOptions({
      ...options,
      recipients: options.recipients?.filter((r) => r !== email) || [],
    });
  };

  const handleExport = () => {
    onExport(options);
    onClose();
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
        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">Export Dashboard</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* Format Selection */}
            <div>
              <label className="label">Export Format *</label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {formats.map((format) => (
                  <button
                    key={format.id}
                    onClick={() => handleFormatChange(format.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      options.format === format.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{format.icon}</span>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{format.name}</div>
                        <div className="text-xs text-gray-600 mt-1">{format.description}</div>
                      </div>
                      {options.format === format.id && (
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Layout Options (PDF & PowerPoint) */}
            {supportsOption('orientation') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Orientation</label>
                  <select
                    value={options.orientation}
                    onChange={(e) =>
                      setOptions({ ...options, orientation: e.target.value as 'portrait' | 'landscape' })
                    }
                    className="input"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>

                {supportsOption('paperSize') && (
                  <div>
                    <label className="label">Paper Size</label>
                    <select
                      value={options.paperSize}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          paperSize: e.target.value as 'letter' | 'a4' | 'legal' | 'tabloid',
                        })
                      }
                      className="input"
                    >
                      <option value="letter">Letter (8.5" × 11")</option>
                      <option value="a4">A4 (210mm × 297mm)</option>
                      <option value="legal">Legal (8.5" × 14")</option>
                      <option value="tabloid">Tabloid (11" × 17")</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Content Options */}
            {(supportsOption('includeCharts') || supportsOption('includeData')) && (
              <div>
                <label className="label">Include</label>
                <div className="space-y-2 mt-2">
                  {supportsOption('includeCharts') && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.includeCharts}
                        onChange={(e) =>
                          setOptions({ ...options, includeCharts: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Charts and visualizations</span>
                    </label>
                  )}
                  {supportsOption('includeData') && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.includeData}
                        onChange={(e) =>
                          setOptions({ ...options, includeData: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Raw data tables</span>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Widget Selection */}
            {supportsOption('widgets') && widgetList.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label">Select Widgets</label>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAllWidgets}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={handleDeselectAllWidgets}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  {widgetList.map((widget) => (
                    <label
                      key={widget.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={options.selectedWidgets?.includes(widget.id)}
                        onChange={() => handleWidgetToggle(widget.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{widget.title}</div>
                        <div className="text-xs text-gray-500">{widget.type}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {options.selectedWidgets?.length || 0} of {widgetList.length} widgets selected
                </div>
              </div>
            )}

            {/* Date Range (CSV) */}
            {supportsOption('dateRange') && (
              <div>
                <label className="label">Date Range (Optional)</label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="text-xs text-gray-600">Start Date</label>
                    <input
                      type="date"
                      value={options.dateRange?.start || ''}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          dateRange: { ...options.dateRange, start: e.target.value },
                        })
                      }
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">End Date</label>
                    <input
                      type="date"
                      value={options.dateRange?.end || ''}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          dateRange: { ...options.dateRange, end: e.target.value },
                        })
                      }
                      className="input text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Schedule Export */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.schedule}
                  onChange={(e) => setOptions({ ...options, schedule: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="label mb-0">Schedule recurring export</span>
              </label>

              {options.schedule && (
                <div className="mt-4 pl-6 space-y-4 border-l-2 border-blue-200">
                  <div>
                    <label className="label text-sm">Frequency</label>
                    <select
                      value={options.scheduleFrequency}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          scheduleFrequency: e.target.value as 'once' | 'daily' | 'weekly' | 'monthly',
                        })
                      }
                      className="input"
                    >
                      <option value="once">One-time</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  {options.scheduleFrequency !== 'once' && (
                    <div>
                      <label className="label text-sm">Time</label>
                      <input
                        type="time"
                        value={options.scheduleTime || '09:00'}
                        onChange={(e) =>
                          setOptions({ ...options, scheduleTime: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                  )}

                  <div>
                    <label className="label text-sm">Email Recipients</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="email"
                        value={recipientInput}
                        onChange={(e) => setRecipientInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddRecipient()}
                        placeholder="email@example.com"
                        className="input flex-1"
                      />
                      <button onClick={handleAddRecipient} className="btn-secondary px-4">
                        Add
                      </button>
                    </div>
                    {options.recipients && options.recipients.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {options.recipients.map((email) => (
                          <span
                            key={email}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded"
                          >
                            {email}
                            <button
                              onClick={() => handleRemoveRecipient(email)}
                              className="hover:text-blue-900"
                            >
                              <XIcon className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <div className="text-sm text-gray-600">
              {options.schedule ? 'Export will be scheduled' : 'Export will start immediately'}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={!options.selectedWidgets || options.selectedWidgets.length === 0}
                className="btn-primary"
              >
                {options.schedule ? 'Schedule Export' : 'Export Now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
