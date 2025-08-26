import React, { useState, useEffect } from 'react';
import { XIcon } from '../icons';

interface DashboardSettingsModalProps {
  isOpen: boolean;
  dashboard: any;
  onClose: () => void;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
}

const DashboardSettingsModal: React.FC<DashboardSettingsModalProps> = ({
  isOpen,
  dashboard,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  useEffect(() => {
    if (dashboard) {
      setName(dashboard.name || '');
      setDescription(dashboard.description || '');
      setRefreshInterval(dashboard.refresh_interval || null);
    }
  }, [dashboard]);

  if (!isOpen || !dashboard) return null;

  const handleUpdate = () => {
    onUpdate({
      name,
      description,
      refreshInterval,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Dashboard Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="label">Dashboard Name</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[100px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for this dashboard..."
            />
          </div>

          <div>
            <label className="label">Auto Refresh Interval</label>
            <select
              className="input"
              value={refreshInterval || ''}
              onChange={(e) =>
                setRefreshInterval(e.target.value ? parseInt(e.target.value) : null)
              }
            >
              <option value="">Manual refresh only</option>
              <option value="300">Every 5 minutes</option>
              <option value="900">Every 15 minutes</option>
              <option value="1800">Every 30 minutes</option>
              <option value="3600">Every hour</option>
            </select>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-medium text-red-600 mb-2">Danger Zone</h3>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this dashboard? This action cannot be undone.')) {
                  onDelete();
                  onClose();
                }
              }}
              className="btn btn-danger w-full"
            >
              Delete Dashboard
            </button>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleUpdate} className="btn btn-primary">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardSettingsModal;