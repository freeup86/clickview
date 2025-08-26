import React, { useEffect, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface SyncProgressProps {
  workspaceId: string;
  listId?: string;
  spaceId?: string;
  syncAll?: boolean;
  onComplete: (summary: any) => void;
  onError: (error: string) => void;
}

interface ProgressData {
  status: string;
  message: string;
  progress: number;
  current?: number;
  total?: number;
  created?: number;
  updated?: number;
  processed?: number;
  summary?: any;
  error?: string;
}

const SyncProgress: React.FC<SyncProgressProps> = ({
  workspaceId,
  listId,
  spaceId,
  syncAll,
  onComplete,
  onError
}) => {
  const [progressData, setProgressData] = useState<ProgressData>({
    status: 'starting',
    message: 'Initializing sync...',
    progress: 0
  });

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const eventSource = new EventSource(
      `${apiUrl}/api/tasks/sync-with-progress?` +
      new URLSearchParams({
        workspaceId,
        ...(listId && { listId }),
        ...(spaceId && { spaceId }),
        ...(syncAll && { syncAll: 'true' })
      })
    );

    eventSource.onmessage = (event) => {
      try {
        const data: ProgressData = JSON.parse(event.data);
        setProgressData(data);

        if (data.status === 'completed' && data.summary) {
          eventSource.close();
          onComplete(data.summary);
        } else if (data.status === 'error' || data.error) {
          eventSource.close();
          onError(data.error || 'Sync failed');
        }
      } catch (error) {
        console.error('Failed to parse progress data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      eventSource.close();
      onError('Connection lost during sync');
    };

    return () => {
      eventSource.close();
    };
  }, [workspaceId, listId, spaceId, syncAll, onComplete, onError]);

  const getStatusColor = () => {
    switch (progressData.status) {
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'processing':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getProgressBarColor = () => {
    switch (progressData.status) {
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'processing':
        return 'bg-blue-500';
      default:
        return 'bg-indigo-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Syncing Tasks from ClickUp</h3>
          <p className={`text-sm ${getStatusColor()}`}>
            {progressData.message}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{Math.round(progressData.progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`${getProgressBarColor()} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${progressData.progress}%` }}
            />
          </div>
        </div>

        {/* Statistics */}
        {(progressData.processed !== undefined || progressData.current !== undefined) && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            {progressData.total !== undefined && (
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">
                  {progressData.processed || progressData.current || 0}
                </p>
                <p className="text-xs text-gray-600">
                  of {progressData.total} tasks
                </p>
              </div>
            )}
            {progressData.created !== undefined && (
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {progressData.created}
                </p>
                <p className="text-xs text-gray-600">New Tasks</p>
              </div>
            )}
            {progressData.updated !== undefined && (
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {progressData.updated}
                </p>
                <p className="text-xs text-gray-600">Updated</p>
              </div>
            )}
          </div>
        )}

        {/* Loading spinner for active sync */}
        {progressData.status !== 'completed' && progressData.status !== 'error' && (
          <div className="flex justify-center">
            <LoadingSpinner size="medium" />
          </div>
        )}

        {/* Error message */}
        {progressData.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{progressData.error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SyncProgress;