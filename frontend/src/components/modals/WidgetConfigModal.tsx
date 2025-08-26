import React, { useState, useEffect } from 'react';
import { XIcon } from '../icons';

interface WidgetConfigModalProps {
  isOpen: boolean;
  widget: any;
  onClose: () => void;
  onUpdate: (updates: any) => void;
  workspaceId?: string;
}

interface Space {
  id: string;
  name: string;
}

interface List {
  id: string;
  name: string;
}

const WidgetConfigModal: React.FC<WidgetConfigModalProps> = ({
  isOpen,
  widget,
  onClose,
  onUpdate,
  workspaceId,
}) => {
  const [title, setTitle] = useState('');
  const [config, setConfig] = useState<any>({});
  const [dataConfig, setDataConfig] = useState<any>({});
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);

  useEffect(() => {
    if (widget) {
      setTitle(widget.title);
      setConfig(widget.config || {});
      setDataConfig(widget.data_config || {});
      setSelectedSpaceId(widget.data_config?.spaceId || '');
      setSelectedListId(widget.data_config?.listId || '');
    }
  }, [widget]);

  // Fetch spaces when modal opens
  useEffect(() => {
    if (isOpen && workspaceId) {
      fetchSpaces();
    }
  }, [isOpen, workspaceId]);

  // Fetch lists when space is selected
  useEffect(() => {
    if (selectedSpaceId) {
      fetchLists(selectedSpaceId);
    } else {
      setLists([]);
      setSelectedListId('');
    }
  }, [selectedSpaceId]);

  const fetchSpaces = async () => {
    if (!workspaceId) return;
    
    setLoadingSpaces(true);
    try {
      const response = await fetch(`/api/clickup/spaces?workspaceId=${workspaceId}`);
      if (response.ok) {
        const data = await response.json();
        setSpaces(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch spaces:', error);
    } finally {
      setLoadingSpaces(false);
    }
  };

  const fetchLists = async (spaceId: string) => {
    if (!workspaceId) return;
    
    setLoadingLists(true);
    try {
      const response = await fetch(`/api/clickup/lists?workspaceId=${workspaceId}&spaceId=${spaceId}`);
      if (response.ok) {
        const data = await response.json();
        setLists(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch lists:', error);
    } finally {
      setLoadingLists(false);
    }
  };

  if (!isOpen || !widget) return null;

  const handleUpdate = () => {
    onUpdate({
      title,
      config,
      dataConfig: {
        ...dataConfig,
        spaceId: selectedSpaceId || undefined,
        listId: selectedListId || undefined,
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Configure Widget</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="label">Widget Title</label>
            <input
              type="text"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Data Configuration */}
          <div>
            <h3 className="font-medium mb-3">Data Configuration</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Space Selection */}
              <div>
                <label className="label">Space</label>
                <select
                  className="input"
                  value={selectedSpaceId}
                  onChange={(e) => setSelectedSpaceId(e.target.value)}
                  disabled={loadingSpaces}
                >
                  <option value="">Select a space...</option>
                  {spaces.map((space) => (
                    <option key={space.id} value={space.id}>
                      {space.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* List Selection */}
              <div>
                <label className="label">List (Optional)</label>
                <select
                  className="input"
                  value={selectedListId}
                  onChange={(e) => setSelectedListId(e.target.value)}
                  disabled={!selectedSpaceId || loadingLists}
                >
                  <option value="">All lists in space</option>
                  {lists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Aggregation Type</label>
                <select
                  className="input"
                  value={dataConfig.aggregationType || 'count'}
                  onChange={(e) =>
                    setDataConfig({ ...dataConfig, aggregationType: e.target.value })
                  }
                >
                  <option value="count">Count</option>
                  <option value="sum">Sum</option>
                  <option value="avg">Average</option>
                  <option value="min">Minimum</option>
                  <option value="max">Maximum</option>
                  <option value="distinct">Distinct</option>
                </select>
              </div>

              <div>
                <label className="label">Group By</label>
                <select
                  className="input"
                  value={dataConfig.groupBy || ''}
                  onChange={(e) =>
                    setDataConfig({ ...dataConfig, groupBy: e.target.value })
                  }
                >
                  <option value="">None</option>
                  <option value="status">Status</option>
                  <option value="priority">Priority</option>
                  <option value="assignee">Assignee</option>
                  <option value="tags">Tags</option>
                  <option value="list">List</option>
                  <option value="space">Space</option>
                </select>
              </div>
            </div>
          </div>

          {/* Display Configuration */}
          <div>
            <h3 className="font-medium mb-3">Display Options</h3>
            
            <div className="space-y-3">
              {widget.type.includes('chart') && (
                <>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={config.showLegend || false}
                      onChange={(e) =>
                        setConfig({ ...config, showLegend: e.target.checked })
                      }
                    />
                    Show Legend
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={config.showGrid !== false}
                      onChange={(e) =>
                        setConfig({ ...config, showGrid: e.target.checked })
                      }
                    />
                    Show Grid
                  </label>
                </>
              )}

              {widget.type === 'kpi_card' && (
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={config.showTrend || false}
                    onChange={(e) =>
                      setConfig({ ...config, showTrend: e.target.checked })
                    }
                  />
                  Show Trend Indicator
                </label>
              )}

              {widget.type === 'data_table' && (
                <>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={config.sortable !== false}
                      onChange={(e) =>
                        setConfig({ ...config, sortable: e.target.checked })
                      }
                    />
                    Enable Sorting
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={config.searchable || false}
                      onChange={(e) =>
                        setConfig({ ...config, searchable: e.target.checked })
                      }
                    />
                    Enable Search
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Refresh Interval */}
          <div>
            <label className="label">Auto Refresh (seconds)</label>
            <input
              type="number"
              className="input"
              placeholder="Leave empty for manual refresh only"
              value={config.refreshInterval || ''}
              onChange={(e) =>
                setConfig({
                  ...config,
                  refreshInterval: e.target.value ? parseInt(e.target.value) : null,
                })
              }
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleUpdate} className="btn btn-primary">
            Update Widget
          </button>
        </div>
      </div>
    </div>
  );
};

export default WidgetConfigModal;