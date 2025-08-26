import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { XIcon } from './icons';

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; apiKey: string }) => void;
  workspace?: any;
}

const WorkspaceModal: React.FC<WorkspaceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  workspace,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: workspace?.name || '',
      apiKey: '',
    },
  });

  useEffect(() => {
    if (workspace) {
      reset({
        name: workspace.name,
        apiKey: '',
      });
    }
  }, [workspace, reset]);

  const handleFormSubmit = (data: any) => {
    onSubmit(data);
    reset();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {workspace ? 'Edit Workspace' : 'Add Workspace'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
          <div>
            <label htmlFor="name" className="label">
              Workspace Name
            </label>
            <input
              id="name"
              type="text"
              className="input"
              placeholder="My Workspace"
              {...register('name', { required: 'Workspace name is required' })}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-error">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="apiKey" className="label">
              ClickUp API Key
            </label>
            <input
              id="apiKey"
              type="password"
              className="input"
              placeholder={workspace ? 'Enter new API key to update' : 'pk_..........'}
              {...register('apiKey', {
                required: !workspace && 'API key is required',
              })}
            />
            {errors.apiKey && (
              <p className="mt-1 text-sm text-error">{errors.apiKey.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Get your API key from ClickUp Settings → Apps → API Token
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {workspace ? 'Update' : 'Create'} Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkspaceModal;