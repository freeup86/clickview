/**
 * Export Progress Bar Component
 *
 * Displays real-time progress of dashboard export generation with
 * status messages, progress bar, and estimated time remaining.
 */

import React, { useState, useEffect } from 'react';
import { XIcon } from './icons';

export interface ExportProgress {
  exportId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string;
  fileName?: string;
  downloadUrl?: string;
  error?: string;
  estimatedTimeRemaining?: number; // seconds
  startedAt?: string;
}

interface ExportProgressBarProps {
  exports: ExportProgress[];
  onDismiss: (exportId: string) => void;
  onDownload: (exportId: string, url: string) => void;
  onRetry?: (exportId: string) => void;
}

export const ExportProgressBar: React.FC<ExportProgressBarProps> = ({
  exports,
  onDismiss,
  onDownload,
  onRetry,
}) => {
  const [expandedExports, setExpandedExports] = useState<Set<string>>(new Set());

  // Auto-expand new exports
  useEffect(() => {
    exports.forEach((exp) => {
      if (exp.status === 'processing' || exp.status === 'queued') {
        setExpandedExports((prev) => new Set(prev).add(exp.exportId));
      }
    });
  }, [exports]);

  if (exports.length === 0) return null;

  const toggleExpand = (exportId: string) => {
    setExpandedExports((prev) => {
      const next = new Set(prev);
      if (next.has(exportId)) {
        next.delete(exportId);
      } else {
        next.add(exportId);
      }
      return next;
    });
  };

  const getStatusIcon = (status: ExportProgress['status']) => {
    switch (status) {
      case 'queued':
        return '⏳';
      case 'processing':
        return '⚙️';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
    }
  };

  const getStatusColor = (status: ExportProgress['status']) => {
    switch (status) {
      case 'queued':
        return 'bg-gray-100 border-gray-300 text-gray-700';
      case 'processing':
        return 'bg-blue-50 border-blue-300 text-blue-700';
      case 'completed':
        return 'bg-green-50 border-green-300 text-green-700';
      case 'failed':
        return 'bg-red-50 border-red-300 text-red-700';
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getElapsedTime = (startedAt?: string): string => {
    if (!startedAt) return '';
    const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
    return formatTime(elapsed);
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 w-96 max-h-[60vh] overflow-y-auto space-y-2">
      {exports.map((exp) => {
        const isExpanded = expandedExports.has(exp.exportId);
        const statusColor = getStatusColor(exp.status);

        return (
          <div
            key={exp.exportId}
            className={`rounded-lg shadow-lg border-2 transition-all ${statusColor}`}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-3 cursor-pointer"
              onClick={() => toggleExpand(exp.exportId)}
            >
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xl">{getStatusIcon(exp.status)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {exp.fileName || 'Dashboard Export'}
                  </div>
                  <div className="text-xs opacity-75">
                    {exp.status === 'processing' && exp.progress !== undefined && (
                      <span>{exp.progress}% complete</span>
                    )}
                    {exp.status === 'queued' && <span>Waiting in queue...</span>}
                    {exp.status === 'completed' && <span>Ready to download</span>}
                    {exp.status === 'failed' && <span>Export failed</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {exp.status === 'completed' && exp.downloadUrl && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(exp.exportId, exp.downloadUrl!);
                    }}
                    className="p-1.5 hover:bg-white/50 rounded transition-colors"
                    title="Download"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(exp.exportId);
                  }}
                  className="p-1.5 hover:bg-white/50 rounded transition-colors"
                  title="Dismiss"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="px-3 pb-3 space-y-2 border-t border-current/20">
                {/* Progress Bar */}
                {(exp.status === 'processing' || exp.status === 'queued') && (
                  <div className="mt-2">
                    <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          exp.status === 'processing' ? 'bg-blue-600' : 'bg-gray-400'
                        }`}
                        style={{
                          width: `${exp.progress || 0}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Status Message */}
                {exp.message && (
                  <div className="text-xs opacity-90 mt-2">{exp.message}</div>
                )}

                {/* Error Message */}
                {exp.error && (
                  <div className="text-xs bg-white/50 p-2 rounded mt-2">
                    <div className="font-semibold mb-1">Error:</div>
                    <div>{exp.error}</div>
                  </div>
                )}

                {/* Time Information */}
                <div className="flex items-center justify-between text-xs opacity-75 mt-2">
                  {exp.status === 'processing' && (
                    <>
                      {exp.startedAt && (
                        <span>Elapsed: {getElapsedTime(exp.startedAt)}</span>
                      )}
                      {exp.estimatedTimeRemaining !== undefined && exp.estimatedTimeRemaining > 0 && (
                        <span>~{formatTime(exp.estimatedTimeRemaining)} remaining</span>
                      )}
                    </>
                  )}
                  {exp.status === 'queued' && <span>Position in queue</span>}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-2 border-t border-current/20">
                  {exp.status === 'completed' && exp.downloadUrl && (
                    <button
                      onClick={() => onDownload(exp.exportId, exp.downloadUrl!)}
                      className="flex-1 px-3 py-1.5 bg-white/80 hover:bg-white rounded text-sm font-medium transition-colors"
                    >
                      Download
                    </button>
                  )}
                  {exp.status === 'failed' && onRetry && (
                    <button
                      onClick={() => onRetry(exp.exportId)}
                      className="flex-1 px-3 py-1.5 bg-white/80 hover:bg-white rounded text-sm font-medium transition-colors"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    onClick={() => onDismiss(exp.exportId)}
                    className="px-3 py-1.5 bg-white/50 hover:bg-white/80 rounded text-sm transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
