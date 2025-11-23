/**
 * Download Manager Component
 *
 * Manages download history for dashboard exports with search,
 * filtering, and re-download capabilities.
 */

import React, { useState, useMemo } from 'react';
import { XIcon, DownloadIcon, TrashIcon } from './icons';

export interface ExportHistoryItem {
  id: string;
  dashboardId: string;
  dashboardName: string;
  format: 'pdf' | 'excel' | 'csv' | 'powerpoint';
  fileName: string;
  fileSize: number; // bytes
  createdAt: string;
  expiresAt?: string;
  downloadUrl: string;
  status: 'available' | 'expired' | 'deleted';
  downloadCount: number;
}

interface DownloadManagerProps {
  isOpen: boolean;
  onClose: () => void;
  exports: ExportHistoryItem[];
  onDownload: (exportId: string, url: string) => void;
  onDelete: (exportId: string) => void;
  onClearHistory?: () => void;
}

export const DownloadManager: React.FC<DownloadManagerProps> = ({
  isOpen,
  onClose,
  exports,
  onDownload,
  onDelete,
  onClearHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFormat, setFilterFormat] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  if (!isOpen) return null;

  const filteredAndSortedExports = useMemo(() => {
    let result = [...exports];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (exp) =>
          exp.dashboardName.toLowerCase().includes(query) ||
          exp.fileName.toLowerCase().includes(query)
      );
    }

    // Filter by format
    if (filterFormat !== 'all') {
      result = result.filter((exp) => exp.format === filterFormat);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'name':
          comparison = a.fileName.localeCompare(b.fileName);
          break;
        case 'size':
          comparison = a.fileSize - b.fileSize;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [exports, searchQuery, filterFormat, sortBy, sortDirection]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      }
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return '📄';
      case 'excel':
        return '📊';
      case 'csv':
        return '📋';
      case 'powerpoint':
        return '📽️';
      default:
        return '📁';
    }
  };

  const getStatusBadge = (exp: ExportHistoryItem) => {
    if (exp.status === 'expired') {
      return <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">Expired</span>;
    }
    if (exp.status === 'deleted') {
      return <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">Deleted</span>;
    }
    if (exp.expiresAt) {
      const daysUntilExpiry = Math.ceil(
        (new Date(exp.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiry <= 3) {
        return (
          <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">
            Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
          </span>
        );
      }
    }
    return null;
  };

  const toggleSort = (field: 'date' | 'name' | 'size') => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  const availableExports = exports.filter((exp) => exp.status === 'available');
  const totalSize = availableExports.reduce((sum, exp) => sum + exp.fileSize, 0);

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
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Download Manager</h2>
              <p className="text-sm text-gray-600 mt-1">
                {availableExports.length} export{availableExports.length !== 1 ? 's' : ''} available
                {' • '}
                {formatFileSize(totalSize)} total
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Filters & Search */}
          <div className="p-6 border-b bg-gray-50 space-y-4">
            <div className="flex gap-4">
              {/* Search */}
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by dashboard name or file name..."
                  className="input w-full"
                />
              </div>

              {/* Format Filter */}
              <select
                value={filterFormat}
                onChange={(e) => setFilterFormat(e.target.value)}
                className="input"
              >
                <option value="all">All Formats</option>
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
                <option value="powerpoint">PowerPoint</option>
              </select>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Sort by:</span>
              <button
                onClick={() => toggleSort('date')}
                className={`px-3 py-1 rounded ${
                  sortBy === 'date'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Date {sortBy === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => toggleSort('name')}
                className={`px-3 py-1 rounded ${
                  sortBy === 'name'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Name {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => toggleSort('size')}
                className={`px-3 py-1 rounded ${
                  sortBy === 'size'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Size {sortBy === 'size' && (sortDirection === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          </div>

          {/* Export List */}
          <div className="flex-1 overflow-auto p-6">
            {filteredAndSortedExports.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
                <svg
                  className="w-16 h-16 mb-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-sm">
                  {searchQuery || filterFormat !== 'all'
                    ? 'No exports match your filters'
                    : 'No exports yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAndSortedExports.map((exp) => (
                  <div
                    key={exp.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                      exp.status === 'available'
                        ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        : 'border-gray-100 bg-gray-50 opacity-60'
                    }`}
                  >
                    {/* Format Icon */}
                    <div className="text-3xl">{getFormatIcon(exp.format)}</div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium text-gray-900 truncate">{exp.fileName}</div>
                        {getStatusBadge(exp)}
                      </div>
                      <div className="text-sm text-gray-600 truncate">{exp.dashboardName}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{formatFileSize(exp.fileSize)}</span>
                        <span>•</span>
                        <span>{formatDate(exp.createdAt)}</span>
                        {exp.downloadCount > 0 && (
                          <>
                            <span>•</span>
                            <span>Downloaded {exp.downloadCount}×</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {exp.status === 'available' && (
                        <button
                          onClick={() => onDownload(exp.id, exp.downloadUrl)}
                          className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                          title="Download"
                        >
                          <DownloadIcon className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(exp.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <div className="text-sm text-gray-600">
              Showing {filteredAndSortedExports.length} of {exports.length} export
              {exports.length !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-3">
              {onClearHistory && exports.length > 0 && (
                <button
                  onClick={onClearHistory}
                  className="btn-secondary text-red-600 hover:bg-red-50"
                >
                  Clear History
                </button>
              )}
              <button onClick={onClose} className="btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
