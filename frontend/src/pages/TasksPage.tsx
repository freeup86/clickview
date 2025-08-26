import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import {
  RefreshIcon,
  DownloadIcon,
  ChartBarIcon,
} from '../components/icons';
import apiService from '../services/api';
import useStore from '../store/useStore';
import LoadingSpinner from '../components/LoadingSpinner';

interface Task {
  id: string;
  task_id: string;
  task_name: string;
  status: string;
  assignee: string;
  priority: string;
  due_date: string;
  space: string;
  list: string;
  development_status: string;
  value_stream: string;
  itc_phase: string;
  l2_substream: string;
  overall_due_date: string;
  overdue_status: string;
  release_status: string;
  at_risk_checkbox: boolean;
  design_priority: string;
  developer: any;
  value_stream_lead: any;
  sme_approver: any;
  qa_users: any;
  qa_lm_users: any;
  alpha_draft_date: string;
  beta_review_date: string;
  final_review_sign_off_date: string;
  qa_date: string;
  script_received_date: string;
  sign_off_received_date: string;
  number_of_screens: number;
  time_estimate: string;
  time_logged: string;
  comment_count: number;
  latest_comment: string;
  tags: any;
  linked_tasks: any;
  last_synced_at: string;
}

interface TaskStats {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  open_tasks: number;
  overdue_tasks: number;
  avg_completion_days: number;
}

const TasksPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useStore();
  
  const [selectedSpace, setSelectedSpace] = useState<string>('');
  const [selectedList, setSelectedList] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const pageSize = 50;

  // Fetch tasks
  const { data: tasksData, isLoading, refetch } = useQuery(
    ['tasks', currentWorkspace?.id, selectedList, selectedSpace, selectedStatus, currentPage],
    () => apiService.getTasks({
      workspaceId: currentWorkspace?.id!,
      listId: selectedList || undefined,
      spaceId: selectedSpace || undefined,
      status: selectedStatus || undefined,
      limit: pageSize,
      offset: (currentPage - 1) * pageSize
    }),
    {
      enabled: !!currentWorkspace?.id,
      keepPreviousData: true,
      onSuccess: (data) => {
        // If no tasks exist and this is the initial load, trigger a sync
        if (isInitialLoad && data.tasks && data.tasks.length === 0) {
          setIsInitialLoad(false);
          handleSyncAll();
        } else {
          setIsInitialLoad(false);
        }
      }
    }
  );

  // Fetch task statistics
  const { data: statsData } = useQuery(
    ['task-stats', currentWorkspace?.id, selectedList, selectedSpace],
    () => apiService.getTaskStats({
      workspaceId: currentWorkspace?.id!,
      listId: selectedList || undefined,
      spaceId: selectedSpace || undefined
    }),
    {
      enabled: !!currentWorkspace?.id
    }
  );

  // Fetch spaces when workspace is available
  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchSpaces();
    }
  }, [currentWorkspace]);

  // Fetch lists when space is selected
  useEffect(() => {
    if (selectedSpace) {
      fetchLists(selectedSpace);
    }
  }, [selectedSpace]);

  const fetchSpaces = async () => {
    if (!currentWorkspace?.id) return;
    
    try {
      const response = await apiService.getClickUpSpaces(currentWorkspace.id);
      if (response.success) {
        setSpaces(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch spaces:', error);
    }
  };

  const fetchLists = async (spaceId: string) => {
    if (!currentWorkspace?.id) return;
    
    try {
      const response = await apiService.getClickUpLists(currentWorkspace.id, spaceId);
      if (response.success) {
        setLists(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch lists:', error);
    }
  };

  // Sync tasks mutation with 5-minute timeout
  const syncMutation = useMutation(
    (syncAll: boolean) => apiService.syncTasks({
      workspaceId: currentWorkspace?.id!,
      listId: !syncAll ? selectedList || undefined : undefined,
      spaceId: !syncAll ? selectedSpace || undefined : undefined,
      syncAll
    }),
    {
      onSuccess: (data) => {
        toast.success(`Successfully synced ${data.summary.total} tasks from ClickUp`);
        // Invalidate all task-related queries to force refresh
        queryClient.invalidateQueries(['tasks']);
        queryClient.invalidateQueries(['task-stats']);
        // Force immediate refetch
        refetch();
      },
      onError: (error: any) => {
        const message = error.response?.data?.error || error.message || 'Failed to sync tasks';
        toast.error(message);
      }
    }
  );

  const handleSyncAll = () => {
    syncMutation.mutate(true);
  };

  const handleSyncFiltered = () => {
    if (!selectedList && !selectedSpace) {
      toast.error('Please select a space or list to sync');
      return;
    }
    syncMutation.mutate(false);
  };

  const handleExport = () => {
    // Create CSV content with all columns
    const tasks = tasksData?.tasks || [];
    const headers = [
      'Task ID', 'Task Name', 'Status', 'Development Status', 'Assignee', 
      'Priority', 'Design Priority', 'Due Date', 'Overall Due Date', 
      'Space', 'List', 'Value Stream', 'L2 Substream', 'ITC Phase',
      'Release Status', 'Overdue Status', 'At Risk', 'Developer',
      'Value Stream Lead', 'SME Approver', 'QA Users', 'QA LM Users',
      'Alpha Draft Date', 'Beta Review Date', 'Final Review Sign Off Date',
      'QA Date', 'Script Received Date', 'Sign Off Received Date',
      'Number of Screens', 'Time Estimate', 'Time Logged', 'Comment Count',
      'Latest Comment', 'Tags', 'Linked Tasks'
    ];
    const csvContent = [
      headers.join(','),
      ...tasks.map((task: Task) => [
        task.task_id,
        `"${task.task_name.replace(/"/g, '""')}"`,
        task.status,
        task.development_status || '',
        task.assignee || '',
        task.priority || '',
        task.design_priority || '',
        task.due_date ? new Date(task.due_date).toLocaleDateString() : '',
        task.overall_due_date ? new Date(task.overall_due_date).toLocaleDateString() : '',
        task.space,
        task.list,
        task.value_stream || '',
        task.l2_substream || '',
        task.itc_phase || '',
        task.release_status || '',
        task.overdue_status || '',
        task.at_risk_checkbox ? 'Yes' : 'No',
        Array.isArray(task.developer) ? task.developer.map((d: any) => d.username || d).join(';') : (task.developer || ''),
        Array.isArray(task.value_stream_lead) ? task.value_stream_lead.map((d: any) => d.username || d).join(';') : (task.value_stream_lead || ''),
        Array.isArray(task.sme_approver) ? task.sme_approver.map((d: any) => d.username || d).join(';') : (task.sme_approver || ''),
        Array.isArray(task.qa_users) ? task.qa_users.map((d: any) => d.username || d).join(';') : (task.qa_users || ''),
        Array.isArray(task.qa_lm_users) ? task.qa_lm_users.map((d: any) => d.username || d).join(';') : (task.qa_lm_users || ''),
        task.alpha_draft_date ? new Date(task.alpha_draft_date).toLocaleDateString() : '',
        task.beta_review_date ? new Date(task.beta_review_date).toLocaleDateString() : '',
        task.final_review_sign_off_date ? new Date(task.final_review_sign_off_date).toLocaleDateString() : '',
        task.qa_date ? new Date(task.qa_date).toLocaleDateString() : '',
        task.script_received_date ? new Date(task.script_received_date).toLocaleDateString() : '',
        task.sign_off_received_date ? new Date(task.sign_off_received_date).toLocaleDateString() : '',
        task.number_of_screens || '',
        task.time_estimate || '',
        task.time_logged || '',
        task.comment_count || 0,
        task.latest_comment ? `"${task.latest_comment.replace(/"/g, '""')}"` : '',
        Array.isArray(task.tags) ? task.tags.join(';') : (task.tags || ''),
        Array.isArray(task.linked_tasks) ? task.linked_tasks.join(';') : (task.linked_tasks || '')
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredTasks = tasksData?.tasks?.filter((task: Task) => {
    if (!searchTerm) return true;
    return task.task_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           task.task_id.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  const totalPages = Math.ceil((tasksData?.total || 0) / pageSize);
  const stats = statsData?.stats as TaskStats;

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">No Workspace Selected</h2>
          <p className="text-gray-600">Please select a workspace to view tasks</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Tasks Management</h1>
            <p className="text-gray-600">
              Sync and manage tasks from ClickUp. Data is stored locally for fast dashboard performance.
            </p>
          </div>
          <button
            onClick={handleSyncAll}
            disabled={syncMutation.isLoading}
            className="btn btn-primary"
          >
            <RefreshIcon className={`w-4 h-4 mr-2 ${syncMutation.isLoading ? 'animate-spin' : ''}`} />
            {syncMutation.isLoading ? 'Syncing...' : 'Sync All Tasks'}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-soft p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold">{stats.total_tasks}</p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-soft p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed_tasks}</p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-soft p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.in_progress_tasks}</p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-soft p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open</p>
                <p className="text-2xl font-bold text-gray-600">{stats.open_tasks}</p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-gray-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-soft p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue_tasks}</p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters and Actions Bar */}
      <div className="bg-white rounded-lg shadow-soft p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Filters */}
          <select
            className="input"
            value={selectedSpace}
            onChange={(e) => {
              setSelectedSpace(e.target.value);
              setSelectedList('');
            }}
          >
            <option value="">All Spaces</option>
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={selectedList}
            onChange={(e) => setSelectedList(e.target.value)}
            disabled={!selectedSpace}
          >
            <option value="">All Lists</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
          </select>

          <input
            type="text"
            className="input flex-1"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSyncFiltered}
              disabled={syncMutation.isLoading || (!selectedList && !selectedSpace)}
              className="btn btn-outline"
            >
              <RefreshIcon className={`w-4 h-4 mr-2 ${syncMutation.isLoading ? 'animate-spin' : ''}`} />
              Sync Selected
            </button>

            <button
              onClick={handleExport}
              disabled={!filteredTasks.length}
              className="btn btn-outline"
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-lg shadow-soft overflow-hidden">
        {isLoading || syncMutation.isLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <LoadingSpinner size="large" />
            {syncMutation.isLoading ? (
              <p className="mt-4 text-gray-600">Syncing tasks from ClickUp... This may take a few minutes for large datasets.</p>
            ) : (
              <p className="mt-4 text-gray-600">Loading tasks...</p>
            )}
          </div>
        ) : filteredTasks.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Task ID
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                      Task Name
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Dev Status
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Assignee
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Priority
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Design Priority
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Value Stream
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      L2 Substream
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      ITC Phase
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Release Status
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      At Risk
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Due Date
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Overall Due
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Developer
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      VS Lead
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Time Est
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Comments
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Space/List
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTasks.map((task: Task) => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs font-mono whitespace-nowrap">
                        {task.task_id}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div className="font-medium text-gray-900 max-w-[200px] truncate" title={task.task_name}>
                          {task.task_name}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                          task.status === 'completed' || task.status === 'done' ? 'bg-green-100 text-green-800' :
                          task.status === 'in progress' || task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          task.status === 'open' || task.status === 'to do' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {task.development_status || '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {task.assignee || '-'}
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                          task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          task.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                          task.priority === 'low' ? 'bg-gray-100 text-gray-800' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {task.priority || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {task.design_priority || '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {task.value_stream || '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {task.l2_substream || '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {task.itc_phase || '-'}
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                          task.release_status === 'released' ? 'bg-green-100 text-green-800' :
                          task.release_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {task.release_status || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-center whitespace-nowrap">
                        {task.at_risk_checkbox ? (
                          <span className="text-red-600 font-bold">⚠️</span>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {task.overall_due_date ? new Date(task.overall_due_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {Array.isArray(task.developer) ? task.developer.map((d: any) => d.username || d).join(', ') : (task.developer || '-')}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {Array.isArray(task.value_stream_lead) ? task.value_stream_lead.map((d: any) => d.username || d).join(', ') : (task.value_stream_lead || '-')}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {task.time_estimate || '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 text-center whitespace-nowrap">
                        {task.comment_count || 0}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {task.space} / {task.list}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, tasksData?.total || 0)} of {tasksData?.total || 0} tasks
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-sm btn-outline"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-sm btn-outline"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No tasks found. Click "Sync All Tasks" to fetch tasks from ClickUp.</p>
            <button
              onClick={handleSyncAll}
              disabled={syncMutation.isLoading}
              className="btn btn-primary"
            >
              <RefreshIcon className={`w-4 h-4 mr-2 ${syncMutation.isLoading ? 'animate-spin' : ''}`} />
              Sync All Tasks from ClickUp
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksPage;