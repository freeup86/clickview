import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Calendar, User, Tag, CheckCircle, Clock } from 'lucide-react';
import apiService from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

interface TaskDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: any;
  workspaceId: string;
  title?: string;
  listId?: string;
  spaceId?: string;
}

interface Task {
  id: string;
  name: string;
  status: {
    status: string;
    color: string;
  };
  assignees: Array<{
    username: string;
    email: string;
    profilePicture?: string;
  }>;
  priority?: {
    priority: string;
    color: string;
  };
  due_date?: string;
  date_created: string;
  date_updated: string;
  custom_fields?: any[];
  url?: string;
  list?: {
    name: string;
  };
  folder?: {
    name: string;
  };
  space?: {
    name: string;
  };
}

const TaskDrillDownModal: React.FC<TaskDrillDownModalProps> = ({
  isOpen,
  onClose,
  filters,
  workspaceId,
  title = 'Task Details',
  listId,
  spaceId
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (isOpen && workspaceId) {
      fetchTasks();
    }
  }, [isOpen, filters, workspaceId, page]);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      // When aggregationType is 'none', backend returns raw task data
      const response = await apiService.getAggregatedData({
        workspaceId,
        sourceType: 'tasks',
        aggregationType: 'none', // Get raw task list without aggregation
        filters,
        // Use listId from props or filters
        listId: listId || filters?.listId,
        spaceId: spaceId || filters?.spaceId
      });

      if (response.success && response.data) {
        // The backend returns raw tasks array when aggregationType is 'none'
        const taskData = Array.isArray(response.data) ? response.data : [];
        console.log('Drill-down tasks received:', taskData.length, 'tasks');
        console.log('First task sample:', taskData[0]);
        setTasks(taskData);
        setTotalPages(1); // Raw data doesn't have pagination
      } else {
        setError('No tasks found');
      }
    } catch (err) {
      setError('Error loading tasks');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    const colors: Record<string, string> = {
      'completed': 'bg-green-100 text-green-800',
      'in progress': 'bg-blue-100 text-blue-800',
      'to do': 'bg-gray-100 text-gray-800',
      'blocked': 'bg-red-100 text-red-800',
      'review': 'bg-purple-100 text-purple-800',
      'paused': 'bg-yellow-100 text-yellow-800'
    };
    return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string | undefined) => {
    if (!priority) return 'text-gray-600';
    
    const colors: Record<string, string> = {
      'urgent': 'text-red-600',
      'high': 'text-orange-600',
      'normal': 'text-blue-600',
      'low': 'text-gray-600'
    };
    return colors[priority.toLowerCase()] || 'text-gray-600';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-xl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-white/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="large" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">
                {error}
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No tasks found matching the criteria
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task, taskIndex) => (
                  <div 
                    key={task.id || `task-${taskIndex}`}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-2">
                              {task.name || task.task_name || 'Untitled Task'}
                            </h4>
                            
                            {/* Meta information */}
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                              {/* Status */}
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status?.status || task.status)}`}>
                                {task.status?.status || task.status || 'Unknown'}
                              </span>

                              {/* Priority */}
                              {task.priority && (
                                <span className={`flex items-center gap-1 ${getPriorityColor(task.priority?.priority || task.priority)}`}>
                                  <Tag className="w-3 h-3" />
                                  {task.priority?.priority || task.priority || 'Normal'}
                                </span>
                              )}

                              {/* Due date */}
                              {task.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Due: {formatDate(task.due_date)}
                                </span>
                              )}

                              {/* Created date */}
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Created: {formatDate(task.date_created)}
                              </span>
                            </div>

                            {/* Location */}
                            <div className="text-xs text-gray-500 mb-2">
                              {task.space || task.space?.name || ''} / {task.folder || task.folder?.name || ''} / {task.list || task.list?.name || ''}
                            </div>

                            {/* Assignees */}
                            {task.assignees && task.assignees.length > 0 && (
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3 text-gray-400" />
                                <div className="flex -space-x-2">
                                  {task.assignees.map((assignee, index) => (
                                    <div
                                      key={assignee.email || assignee.username || `assignee-${index}`}
                                      className="w-7 h-7 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center"
                                      title={assignee.username || assignee.email}
                                    >
                                      {assignee.profilePicture ? (
                                        <img 
                                          src={assignee.profilePicture} 
                                          alt={assignee.username}
                                          className="w-full h-full rounded-full"
                                        />
                                      ) : (
                                        <span className="text-xs font-medium text-indigo-600">
                                          {(assignee.username || assignee.email || '?')[0].toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* View in ClickUp button */}
                      {task.url && (
                        <a
                          href={task.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                          title="View in ClickUp"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && !loading && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDrillDownModal;