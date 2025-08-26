import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon, PencilIcon, ViewGridIcon } from '../components/icons';
import apiService from '../services/api';
import useStore from '../store/useStore';
import LoadingSpinner from '../components/LoadingSpinner';
import WorkspaceModal from '../components/WorkspaceModal';

const WorkspacesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { workspaces, setWorkspaces, currentWorkspace, setCurrentWorkspace } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<any>(null);

  const { isLoading, refetch } = useQuery(
    'workspaces',
    () => apiService.getWorkspaces(),
    {
      onSuccess: (data) => {
        if (data.success) {
          setWorkspaces(data.workspaces);
          
          // Auto-select first workspace if current is invalid or not set
          if (data.workspaces.length > 0) {
            const isCurrentValid = currentWorkspace && 
              data.workspaces.some((w: any) => w.id === currentWorkspace.id);
            
            if (!isCurrentValid) {
              setCurrentWorkspace(data.workspaces[0]);
              console.log('Auto-selected workspace:', data.workspaces[0].name);
            }
          }
        }
      },
    }
  );

  const createMutation = useMutation(
    (data: { name: string; apiKey: string }) => apiService.createWorkspace(data),
    {
      onSuccess: () => {
        toast.success('Workspace created successfully');
        queryClient.invalidateQueries('workspaces');
        setIsModalOpen(false);
      },
      onError: () => {
        toast.error('Failed to create workspace');
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: any }) => apiService.updateWorkspace(id, data),
    {
      onSuccess: () => {
        toast.success('Workspace updated successfully');
        queryClient.invalidateQueries('workspaces');
        setEditingWorkspace(null);
      },
      onError: () => {
        toast.error('Failed to update workspace');
      },
    }
  );

  const deleteMutation = useMutation(
    (id: string) => apiService.deleteWorkspace(id),
    {
      onSuccess: () => {
        toast.success('Workspace deleted successfully');
        queryClient.invalidateQueries('workspaces');
      },
      onError: () => {
        toast.error('Failed to delete workspace');
      },
    }
  );

  const validateMutation = useMutation(
    (id: string) => apiService.validateWorkspace(id),
    {
      onSuccess: (data) => {
        if (data.valid) {
          toast.success('API key is valid');
        } else {
          toast.error('API key is invalid');
        }
      },
    }
  );

  const handleCreateWorkspace = (data: { name: string; apiKey: string }) => {
    createMutation.mutate(data);
  };

  const handleUpdateWorkspace = (id: string, data: any) => {
    updateMutation.mutate({ id, data });
  };

  const handleDeleteWorkspace = (id: string) => {
    if (window.confirm('Are you sure you want to delete this workspace?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSelectWorkspace = (workspace: any) => {
    setCurrentWorkspace(workspace);
    toast.success(`Selected workspace: ${workspace.name}`);
  };

  if (isLoading) {
    return <LoadingSpinner size="large" className="mt-12" />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Workspaces</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add Workspace</span>
        </button>
      </div>

      {workspaces.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <ViewGridIcon className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No workspaces yet</h3>
          <p className="text-gray-500 mb-4">Get started by creating your first workspace</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
          >
            Create Workspace
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <div
              key={workspace.id}
              className="card hover:shadow-medium transition-shadow cursor-pointer"
              onClick={() => handleSelectWorkspace(workspace)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{workspace.name}</h3>
                  <p className="text-sm text-gray-500">
                    Team ID: {workspace.clickup_team_id || 'Not set'}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingWorkspace(workspace);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <PencilIcon className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWorkspace(workspace.id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <TrashIcon className="w-4 h-4 text-error" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      workspace.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {workspace.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Last Sync</span>
                  <span className="text-gray-900">
                    {workspace.last_sync_at
                      ? new Date(workspace.last_sync_at).toLocaleDateString()
                      : 'Never'}
                  </span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  validateMutation.mutate(workspace.id);
                }}
                className="mt-4 w-full btn btn-outline text-sm"
                disabled={validateMutation.isLoading}
              >
                {validateMutation.isLoading ? 'Validating...' : 'Validate API Key'}
              </button>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <WorkspaceModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateWorkspace}
        />
      )}

      {editingWorkspace && (
        <WorkspaceModal
          isOpen={!!editingWorkspace}
          onClose={() => setEditingWorkspace(null)}
          onSubmit={(data) => handleUpdateWorkspace(editingWorkspace.id, data)}
          workspace={editingWorkspace}
        />
      )}
    </div>
  );
};

export default WorkspacesPage;