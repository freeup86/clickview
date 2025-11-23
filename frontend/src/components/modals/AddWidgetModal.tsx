import React, { useState } from 'react';
import { XIcon } from '../icons';

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (widget: any) => void;
  workspaceId?: string;
}

const widgetTypes = [
  { id: 'kpi_card', name: 'KPI Card', description: 'Single metric display', icon: '📊' },
  { id: 'bar_chart', name: 'Bar Chart', description: 'Compare categories', icon: '📊' },
  { id: 'line_chart', name: 'Line Chart', description: 'Show trends over time', icon: '📈' },
  { id: 'pie_chart', name: 'Pie Chart', description: 'Show proportions', icon: '🥧' },
  { id: 'donut_chart', name: 'Donut Chart', description: 'Show proportions with center space', icon: '🍩' },
  { id: 'area_chart', name: 'Area Chart', description: 'Show cumulative trends', icon: '📉' },
  { id: 'data_table', name: 'Data Table', description: 'Display tabular data', icon: '📋' },
  { id: 'progress_bar', name: 'Progress Bar', description: 'Show progress toward goal', icon: '📊' },
  { id: 'heatmap', name: 'Heat Map', description: 'Show activity patterns', icon: '🗓️' },
  { id: 'gantt_chart', name: 'Gantt Chart', description: 'Task timelines', icon: '📅' },
  { id: 'burndown_chart', name: 'Burndown Chart', description: 'Sprint progress', icon: '📉' },
  { id: 'custom_field_summary', name: 'Custom Field Summary', description: 'Aggregate custom fields', icon: '📝' },
  { id: 'text_block', name: 'Text Block', description: 'Rich text and documentation', icon: '📝' },
];

const AddWidgetModal: React.FC<AddWidgetModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  workspaceId,
}) => {
  const [selectedType, setSelectedType] = useState('');
  const [widgetTitle, setWidgetTitle] = useState('');
  const [dataSource, setDataSource] = useState('tasks');

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!selectedType || !widgetTitle) {
      alert('Please select a widget type and enter a title');
      return;
    }

    onAdd({
      type: selectedType,
      title: widgetTitle,
      config: {
        showLegend: true,
        showGrid: true,
      },
      dataConfig: {
        sourceType: dataSource,
        aggregationType: 'count',
        groupBy: 'status',
      },
      filters: {},
    });

    // Reset form
    setSelectedType('');
    setWidgetTitle('');
    setDataSource('tasks');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Add Widget</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Widget Title */}
          <div className="mb-6">
            <label className="label">Widget Title</label>
            <input
              type="text"
              className="input"
              placeholder="Enter widget title..."
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.target.value)}
            />
          </div>

          {/* Data Source */}
          <div className="mb-6">
            <label className="label">Data Source</label>
            <select
              className="input"
              value={dataSource}
              onChange={(e) => setDataSource(e.target.value)}
            >
              <option value="tasks">Tasks</option>
              <option value="custom_fields">Custom Fields</option>
              <option value="time_tracking">Time Tracking</option>
              <option value="comments">Comments</option>
              <option value="attachments">Attachments</option>
            </select>
          </div>

          {/* Widget Type Selection */}
          <div>
            <label className="label mb-3">Select Widget Type</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {widgetTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    selectedType === type.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div className="font-medium text-sm">{type.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedType || !widgetTitle}
            className="btn btn-primary"
          >
            Add Widget
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddWidgetModal;