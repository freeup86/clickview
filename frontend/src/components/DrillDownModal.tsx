/**
 * Drill-Down Modal Component
 *
 * Displays detailed data when user clicks on chart elements.
 * Supports filtering, sorting, and navigation to underlying tasks.
 */

import React, { useState, useMemo } from 'react';
import { ChartEvent } from '../types/charts';

export interface DrillDownData {
  title: string;
  data: any[];
  columns: {
    key: string;
    label: string;
    type?: 'string' | 'number' | 'date' | 'status' | 'priority';
    format?: (value: any) => string;
  }[];
  onNavigate?: (item: any) => void;
  metadata?: {
    totalCount?: number;
    filters?: any;
    chartEvent?: ChartEvent;
  };
}

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DrillDownData | null;
}

export const DrillDownModal: React.FC<DrillDownModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedData = useMemo(() => {
    if (!data?.data) return [];

    let result = [...data.data];

    // Apply search filter
    if (searchQuery) {
      result = result.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];

        if (aValue === bValue) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        const comparison = aValue > bValue ? 1 : -1;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchQuery, sortColumn, sortDirection]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedData, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

  const formatValue = (value: any, column: DrillDownData['columns'][0]) => {
    if (value == null) return '-';

    if (column.format) {
      return column.format(value);
    }

    switch (column.type) {
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      case 'status':
        return typeof value === 'object' ? value.status || value : value;
      case 'priority':
        return typeof value === 'object' ? value.priority || value : value;
      default:
        return String(value);
    }
  };

  const getStatusColor = (status: any) => {
    const statusStr = typeof status === 'object' ? status.status || '' : String(status || '').toLowerCase();

    if (statusStr.includes('complete') || statusStr.includes('done') || statusStr.includes('closed')) {
      return 'bg-green-100 text-green-800';
    }
    if (statusStr.includes('progress') || statusStr.includes('active')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (statusStr.includes('review') || statusStr.includes('pending')) {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: any) => {
    const priorityStr = typeof priority === 'object' ? priority.priority || '' : String(priority || '').toLowerCase();

    if (priorityStr.includes('urgent') || priorityStr === '1') {
      return 'bg-red-100 text-red-800';
    }
    if (priorityStr.includes('high') || priorityStr === '2') {
      return 'bg-orange-100 text-orange-800';
    }
    if (priorityStr.includes('normal') || priorityStr === '3') {
      return 'bg-blue-100 text-blue-800';
    }
    if (priorityStr.includes('low') || priorityStr === '4') {
      return 'bg-gray-100 text-gray-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{data.title}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Showing {paginatedData.length} of {filteredAndSortedData.length} items
                {data.metadata?.totalCount && filteredAndSortedData.length < data.metadata.totalCount && (
                  <span> (filtered from {data.metadata.totalCount} total)</span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b bg-gray-50">
            <div className="relative">
              <input
                type="text"
                placeholder="Search in results..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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

          {/* Table */}
          <div className="flex-1 overflow-auto p-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {data.columns.map((column) => (
                    <th
                      key={column.key}
                      onClick={() => handleSort(column.key)}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center space-x-1">
                        <span>{column.label}</span>
                        {sortColumn === column.key && (
                          <svg
                            className={`w-4 h-4 transition-transform ${
                              sortDirection === 'desc' ? 'transform rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={data.columns.length} className="px-6 py-12 text-center text-gray-500">
                      {searchQuery ? 'No results found for your search' : 'No data available'}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item, index) => (
                    <tr
                      key={index}
                      className={`hover:bg-gray-50 ${data.onNavigate ? 'cursor-pointer' : ''}`}
                      onClick={() => data.onNavigate?.(item)}
                    >
                      {data.columns.map((column) => {
                        const value = item[column.key];
                        const formattedValue = formatValue(value, column);

                        return (
                          <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm">
                            {column.type === 'status' ? (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
                                {formattedValue}
                              </span>
                            ) : column.type === 'priority' ? (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(value)}`}>
                                {formattedValue}
                              </span>
                            ) : (
                              <span className="text-gray-900">{formattedValue}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
