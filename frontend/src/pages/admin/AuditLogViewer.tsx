/**
 * Audit Log Viewer
 *
 * Comprehensive audit trail and security event monitoring:
 * - Real-time audit log viewing
 * - Advanced search and filtering
 * - Export capabilities
 * - Security event tracking
 * - User activity monitoring
 * - Compliance reporting
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

// ===================================================================
// MAIN AUDIT LOG VIEWER COMPONENT
// ===================================================================

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<AuditLogFilters>({
    action: 'all',
    severity: 'all',
    startDate: '',
    endDate: '',
    userId: '',
    resource: '',
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const pageSize = 50;

  useEffect(() => {
    loadLogs();
  }, [currentPage, filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(filters.action !== 'all' && { action: filters.action }),
        ...(filters.severity !== 'all' && { severity: filters.severity }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.resource && { resource: filters.resource }),
      });

      const response = await api.get(`/admin/audit-logs?${params}`);
      setLogs(response.data.logs);
      setTotalPages(Math.ceil(response.data.total / pageSize));
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(filters.action !== 'all' && { action: filters.action }),
        ...(filters.severity !== 'all' && { severity: filters.severity }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.resource && { resource: filters.resource }),
      });

      const response = await fetch(`/api/admin/audit-logs/export?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export logs:', error);
      alert('Failed to export audit logs');
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Audit Log Viewer</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor system activity and security events</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Action Filter */}
          <select
            value={filters.action}
            onChange={(e) => {
              setFilters({ ...filters, action: e.target.value });
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="read">Read</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filters.severity}
            onChange={(e) => {
              setFilters({ ...filters, severity: e.target.value });
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="all">All Severities</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>

          {/* Start Date */}
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => {
              setFilters({ ...filters, startDate: e.target.value });
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            placeholder="Start Date"
          />

          {/* End Date */}
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => {
              setFilters({ ...filters, endDate: e.target.value });
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            placeholder="End Date"
          />

          {/* Resource Filter */}
          <input
            type="text"
            value={filters.resource}
            onChange={(e) => {
              setFilters({ ...filters, resource: e.target.value });
              setCurrentPage(1);
            }}
            placeholder="Resource"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
          />

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading audit logs...</div>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="text-gray-500">No audit logs found</div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log) => (
                  <AuditLogRow key={log.id} log={log} onClick={() => setSelectedLog(log)} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      {selectedLog && <LogDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
};

// ===================================================================
// AUDIT LOG ROW COMPONENT
// ===================================================================

interface AuditLogRowProps {
  log: AuditLog;
  onClick: () => void;
}

const AuditLogRow: React.FC<AuditLogRowProps> = ({ log, onClick }) => {
  const getSeverityColor = (severity: string): string => {
    const colors: Record<string, string> = {
      debug: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
      info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      critical: 'bg-red-600 text-white',
    };
    return colors[severity] || colors.info;
  };

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={onClick}>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
        {new Date(log.timestamp).toLocaleString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.userName || 'System'}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{log.userEmail || '-'}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="px-2 py-1 text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
          {log.action}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
        {log.resourceType}
        {log.resourceId && <div className="text-xs text-gray-500">ID: {log.resourceId.substring(0, 8)}...</div>}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityColor(log.severity)}`}>
          {log.severity.toUpperCase()}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        {log.ipAddress || '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
        <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
          View →
        </button>
      </td>
    </tr>
  );
};

// ===================================================================
// LOG DETAILS MODAL
// ===================================================================

interface LogDetailsModalProps {
  log: AuditLog;
  onClose: () => void;
}

const LogDetailsModal: React.FC<LogDetailsModalProps> = ({ log, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Audit Log Details</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Timestamp</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Severity</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.severity}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Action</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.action}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {log.success ? 'Success' : 'Failed'}
                </div>
              </div>
            </div>

            {/* User Info */}
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">User</div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {log.userName || 'System'} ({log.userEmail || 'N/A'})
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">User ID: {log.userId || 'N/A'}</div>
            </div>

            {/* Resource Info */}
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Resource</div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.resourceType}</div>
              {log.resourceId && <div className="text-xs text-gray-500 dark:text-gray-400">ID: {log.resourceId}</div>}
            </div>

            {/* Network Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">IP Address</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.ipAddress || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">User Agent</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {log.userAgent || 'N/A'}
                </div>
              </div>
            </div>

            {/* Details */}
            {log.details && (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Details</div>
                <pre className="text-sm bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-x-auto">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </div>
            )}

            {/* Changes */}
            {log.changes && (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Changes</div>
                <pre className="text-sm bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-x-auto">
                  {JSON.stringify(log.changes, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ===================================================================
// TYPES
// ===================================================================

interface AuditLog {
  id: string;
  timestamp: Date;
  userId?: string;
  userName?: string;
  userEmail?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  severity: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  details?: any;
  changes?: any;
}

interface AuditLogFilters {
  action: string;
  severity: string;
  startDate: string;
  endDate: string;
  userId: string;
  resource: string;
}
