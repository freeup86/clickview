import React, { useState, useMemo } from 'react';

interface ColumnConfig {
  field: string;
  header: string;
  width?: string;
  sortable?: boolean;
  format?: 'date' | 'number' | 'text';
}

interface DataTableProps {
  data: any;
  config: {
    columns?: (string | ColumnConfig)[];
    sortable?: boolean;
    searchable?: boolean;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    clickThrough?: boolean;
    clickThroughUrl?: string;
  };
}

const DataTable: React.FC<DataTableProps> = ({ data, config }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Format cell value based on type
  const formatCellValue = (value: any, format?: string): string => {
    if (value === null || value === undefined) return '-';
    
    switch (format) {
      case 'date':
        try {
          return new Date(value).toLocaleDateString();
        } catch {
          return String(value);
        }
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : String(value);
      default:
        // Handle arrays and objects
        if (Array.isArray(value)) {
          return value.map(v => typeof v === 'object' ? v.name || v.username || JSON.stringify(v) : v).join(', ');
        }
        if (typeof value === 'object') {
          return value.name || value.status || value.priority || JSON.stringify(value);
        }
        return String(value);
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No data available
      </div>
    );
  }

  const tableData = Array.isArray(data) ? data : [data];
  const pageSize = config.pageSize || 10;

  // Parse columns configuration
  const columnConfigs: ColumnConfig[] = useMemo(() => {
    if (!config.columns) {
      // Auto-generate columns from data
      return Object.keys(tableData[0] || {}).map(key => ({
        field: key,
        header: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        sortable: config.sortable,
      }));
    }
    
    // Convert mixed format to ColumnConfig
    return config.columns.map(col => {
      if (typeof col === 'string') {
        return {
          field: col,
          header: col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          sortable: config.sortable,
        };
      }
      return col;
    });
  }, [config.columns, config.sortable, tableData]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!config.searchable || !searchTerm) return tableData;
    
    return tableData.filter((row: any) =>
      columnConfigs.some((col) =>
        String(row[col.field] || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [tableData, searchTerm, columnConfigs, config.searchable]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key: string) => {
    if (!config.sortable) return;
    
    setSortConfig((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  return (
    <div className="flex flex-col h-full">
      {config.searchable && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search..."
            className="input w-full"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {columnConfigs.map((column, index) => (
                <th
                  key={`${column.field}-${index}`}
                  className={`px-3 py-2 text-left font-medium text-gray-700 ${
                    column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => column.sortable !== false && handleSort(column.field)}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center">
                    {column.header}
                    {column.sortable !== false && sortConfig && sortConfig.key === column.field && (
                      <span className="ml-1">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row: any, index: number) => (
              <tr 
                key={index} 
                className={`border-b hover:bg-gray-50 ${config.clickThrough ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (config.clickThrough && config.clickThroughUrl && row.url) {
                    window.open(row.url, '_blank');
                  }
                }}
              >
                {columnConfigs.map((column, colIndex) => (
                  <td key={`${column.field}-${colIndex}`} className="px-3 py-2">
                    {formatCellValue(row[column.field], column.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * pageSize) + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedData.length)} of{' '}
            {sortedData.length} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              First
            </button>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span className="px-3 text-sm">
              {currentPage} / {totalPages}
            </span>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;