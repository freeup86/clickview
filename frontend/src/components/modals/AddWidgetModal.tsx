import React, { useState } from 'react';
import { XIcon } from '../icons';

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (widget: any) => void;
  workspaceId?: string;
}

// Widget categories with ClickUp-style colors
const widgetCategories = [
  {
    id: 'status',
    name: 'Status',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
  },
  {
    id: 'priority',
    name: 'Priority',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
  },
  {
    id: 'assignee',
    name: 'Assignee',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
  },
  {
    id: 'time_tracking',
    name: 'Time Tracking',
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.15)',
  },
  {
    id: 'custom',
    name: 'Custom Charts',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
  },
  {
    id: 'tables',
    name: 'Tables',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.15)',
  },
  {
    id: 'text',
    name: 'Text & Embed',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.15)',
  },
  {
    id: 'sprints',
    name: 'Sprints',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
  },
];

// Widget types organized by category
const widgetsByCategory: Record<string, Array<{
  id: string;
  name: string;
  description: string;
  preview: 'kpi' | 'bar' | 'line' | 'donut' | 'pie' | 'table' | 'progress' | 'gantt' | 'text' | 'heatmap' | 'burndown';
}>> = {
  status: [
    { id: 'kpi_card', name: 'Total Tasks', description: 'Count tasks by status', preview: 'kpi' },
    { id: 'donut_chart', name: 'Status Breakdown', description: 'Tasks distribution by status', preview: 'donut' },
    { id: 'bar_chart', name: 'Status Bar Chart', description: 'Tasks per status comparison', preview: 'bar' },
  ],
  priority: [
    { id: 'donut_chart', name: 'Priority Distribution', description: 'Tasks by priority level', preview: 'donut' },
    { id: 'bar_chart', name: 'Priority Breakdown', description: 'Bar chart by priority', preview: 'bar' },
    { id: 'kpi_card', name: 'High Priority Count', description: 'Urgent tasks metric', preview: 'kpi' },
  ],
  assignee: [
    { id: 'bar_chart', name: 'Workload', description: 'Tasks per team member', preview: 'bar' },
    { id: 'donut_chart', name: 'Team Distribution', description: 'Work distribution pie', preview: 'donut' },
    { id: 'data_table', name: 'Assignee Table', description: 'Detailed assignee list', preview: 'table' },
  ],
  time_tracking: [
    { id: 'kpi_card', name: 'Time Tracked', description: 'Total hours logged', preview: 'kpi' },
    { id: 'bar_chart', name: 'Time by Task', description: 'Hours per task/project', preview: 'bar' },
    { id: 'line_chart', name: 'Time Trend', description: 'Tracking over time', preview: 'line' },
  ],
  custom: [
    { id: 'line_chart', name: 'Line Chart', description: 'Show trends over time', preview: 'line' },
    { id: 'bar_chart', name: 'Bar Chart', description: 'Compare values by category', preview: 'bar' },
    { id: 'donut_chart', name: 'Donut Chart', description: 'Show proportions', preview: 'donut' },
    { id: 'pie_chart', name: 'Pie Chart', description: 'Show distribution', preview: 'pie' },
    { id: 'area_chart', name: 'Area Chart', description: 'Cumulative trends', preview: 'line' },
    { id: 'kpi_card', name: 'KPI Card', description: 'Single metric display', preview: 'kpi' },
  ],
  tables: [
    { id: 'data_table', name: 'Task Table', description: 'Detailed task listing', preview: 'table' },
    { id: 'data_table', name: 'Custom Fields Table', description: 'Field values overview', preview: 'table' },
  ],
  text: [
    { id: 'text_block', name: 'Text Block', description: 'Add notes or documentation', preview: 'text' },
    { id: 'progress_bar', name: 'Progress Bar', description: 'Show goal progress', preview: 'progress' },
  ],
  sprints: [
    { id: 'burndown_chart', name: 'Burndown Chart', description: 'Sprint progress tracking', preview: 'burndown' },
    { id: 'kpi_card', name: 'Sprint Velocity', description: 'Points completed', preview: 'kpi' },
    { id: 'gantt_chart', name: 'Gantt Chart', description: 'Task timeline view', preview: 'gantt' },
    { id: 'heatmap', name: 'Activity Heatmap', description: 'Work patterns', preview: 'heatmap' },
  ],
};

// Widget preview component
const WidgetPreview: React.FC<{ type: string; color: string }> = ({ type, color }) => {
  const previewStyles = {
    kpi: (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-3xl font-bold" style={{ color }}>247</div>
        <div className="text-xs text-gray-400 mt-1">Total</div>
      </div>
    ),
    bar: (
      <div className="flex items-end justify-center gap-1.5 h-full px-3 pb-2">
        {[40, 65, 45, 80, 55, 70].map((h, i) => (
          <div
            key={i}
            className="w-3 rounded-t"
            style={{
              height: `${h}%`,
              backgroundColor: i === 3 ? color : `${color}60`,
            }}
          />
        ))}
      </div>
    ),
    line: (
      <svg className="w-full h-full p-3" viewBox="0 0 100 40">
        <defs>
          <linearGradient id={`lineGrad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 35 L20 25 L40 30 L60 15 L80 20 L100 5"
          fill="none"
          stroke={color}
          strokeWidth="2"
        />
        <path
          d="M0 35 L20 25 L40 30 L60 15 L80 20 L100 5 L100 40 L0 40 Z"
          fill={`url(#lineGrad-${color})`}
        />
      </svg>
    ),
    donut: (
      <svg className="w-full h-full p-2" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="15" fill="none" stroke="#3d4058" strokeWidth="5" />
        <circle
          cx="20"
          cy="20"
          r="15"
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray="60 40"
          strokeLinecap="round"
          transform="rotate(-90 20 20)"
        />
        <text x="20" y="22" textAnchor="middle" fill={color} fontSize="8" fontWeight="bold">
          60%
        </text>
      </svg>
    ),
    pie: (
      <svg className="w-full h-full p-2" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="16" fill={`${color}40`} />
        <path d="M20 20 L20 4 A16 16 0 0 1 36 20 Z" fill={color} />
        <path d="M20 20 L36 20 A16 16 0 0 1 20 36 Z" fill={`${color}80`} />
      </svg>
    ),
    table: (
      <div className="flex flex-col gap-1.5 p-3 h-full">
        <div className="flex gap-1">
          <div className="flex-1 h-2 rounded" style={{ backgroundColor: color }} />
          <div className="flex-1 h-2 rounded" style={{ backgroundColor: `${color}60` }} />
          <div className="flex-1 h-2 rounded" style={{ backgroundColor: `${color}40` }} />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-1">
            <div className="flex-1 h-2 rounded bg-gray-600/30" />
            <div className="flex-1 h-2 rounded bg-gray-600/20" />
            <div className="flex-1 h-2 rounded bg-gray-600/10" />
          </div>
        ))}
      </div>
    ),
    progress: (
      <div className="flex flex-col items-center justify-center h-full p-3">
        <div className="w-full h-3 rounded-full bg-gray-600/30 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: '65%', backgroundColor: color }} />
        </div>
        <div className="text-xs text-gray-400 mt-2">65% Complete</div>
      </div>
    ),
    text: (
      <div className="flex flex-col gap-1 p-3 h-full">
        <div className="w-3/4 h-2 rounded bg-gray-500/40" />
        <div className="w-full h-2 rounded bg-gray-600/30" />
        <div className="w-5/6 h-2 rounded bg-gray-600/20" />
        <div className="w-2/3 h-2 rounded bg-gray-600/20" />
      </div>
    ),
    gantt: (
      <div className="flex flex-col gap-1.5 p-3 h-full">
        {[3, 5, 4, 6].map((w, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-6 h-1.5 rounded bg-gray-600/30" />
            <div
              className="h-2 rounded"
              style={{
                width: `${w * 10}%`,
                marginLeft: `${i * 8}%`,
                backgroundColor: i === 1 ? color : `${color}60`,
              }}
            />
          </div>
        ))}
      </div>
    ),
    heatmap: (
      <div className="grid grid-cols-7 gap-0.5 p-3 h-full">
        {Array.from({ length: 28 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-sm"
            style={{
              backgroundColor:
                Math.random() > 0.5
                  ? `${color}${Math.floor(Math.random() * 60 + 40).toString(16)}`
                  : '#3d4058',
            }}
          />
        ))}
      </div>
    ),
    burndown: (
      <svg className="w-full h-full p-3" viewBox="0 0 100 40">
        <line x1="0" y1="5" x2="100" y2="35" stroke="#6b7280" strokeWidth="1" strokeDasharray="3 3" />
        <path
          d="M0 5 L25 12 L50 18 L70 28 L100 32"
          fill="none"
          stroke={color}
          strokeWidth="2"
        />
      </svg>
    ),
  };

  return (
    <div className="h-24 bg-[var(--bg-tertiary)] rounded-lg overflow-hidden">
      {previewStyles[type as keyof typeof previewStyles] || previewStyles.bar}
    </div>
  );
};

const AddWidgetModal: React.FC<AddWidgetModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  workspaceId,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('status');
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [widgetTitle, setWidgetTitle] = useState('');
  const [step, setStep] = useState<'select' | 'configure'>('select');

  if (!isOpen) return null;

  const currentCategory = widgetCategories.find((c) => c.id === selectedCategory);
  const categoryWidgets = widgetsByCategory[selectedCategory] || [];

  const handleSelectWidget = (widgetId: string, widgetName: string) => {
    setSelectedWidget(widgetId);
    setWidgetTitle(widgetName);
    setStep('configure');
  };

  const handleAdd = () => {
    if (!selectedWidget || !widgetTitle) {
      return;
    }

    onAdd({
      type: selectedWidget,
      title: widgetTitle,
      config: {
        showLegend: true,
        showGrid: true,
      },
      dataConfig: {
        sourceType: 'tasks',
        aggregationType: 'count',
        groupBy: selectedCategory === 'status' ? 'status' : selectedCategory === 'priority' ? 'priority' : 'status',
      },
      filters: {},
    });

    // Reset form
    setSelectedWidget(null);
    setWidgetTitle('');
    setStep('select');
    setSelectedCategory('status');
    onClose();
  };

  const handleBack = () => {
    setStep('select');
    setSelectedWidget(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content add-widget-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            {step === 'configure' && (
              <button
                onClick={handleBack}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2>{step === 'select' ? 'Add Card' : 'Configure Widget'}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {step === 'select' ? (
          /* Widget Selection - Two Panel Layout */
          <div className="add-widget-layout">
            {/* Left Sidebar - Categories */}
            <div className="add-widget-sidebar">
              <div className="px-3 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Categories
              </div>
              {widgetCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`add-widget-category ${selectedCategory === category.id ? 'active' : ''}`}
                  style={{
                    backgroundColor: selectedCategory === category.id ? category.color : undefined,
                  }}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.name}
                </button>
              ))}
            </div>

            {/* Right Content - Widget Grid */}
            <div className="add-widget-content">
              <div className="mb-4">
                <h3 className="text-lg font-semibold" style={{ color: currentCategory?.color }}>
                  {currentCategory?.name}
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Select a widget to add to your dashboard
                </p>
              </div>

              <div className="add-widget-grid">
                {categoryWidgets.map((widget, index) => (
                  <button
                    key={`${widget.id}-${index}`}
                    onClick={() => handleSelectWidget(widget.id, widget.name)}
                    className="widget-preview-card text-left"
                  >
                    <WidgetPreview type={widget.preview} color={currentCategory?.color || '#7B68EE'} />
                    <div className="widget-preview-info">
                      <div className="widget-preview-title">{widget.name}</div>
                      <div className="widget-preview-description">{widget.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Configuration Step */
          <div className="modal-body" style={{ minHeight: '400px' }}>
            <div className="space-y-6">
              {/* Widget Title */}
              <div>
                <label className="label">Widget Title</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter widget title..."
                  value={widgetTitle}
                  onChange={(e) => setWidgetTitle(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Preview */}
              <div>
                <label className="label">Preview</label>
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <div className="h-40 flex items-center justify-center">
                    <WidgetPreview
                      type={
                        widgetsByCategory[selectedCategory]?.find((w) => w.id === selectedWidget)
                          ?.preview || 'bar'
                      }
                      color={currentCategory?.color || '#7B68EE'}
                    />
                  </div>
                </div>
              </div>

              {/* Data Source Info */}
              <div className="p-4 rounded-xl border border-[var(--border-subtle)]" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: currentCategory?.color }}
                  />
                  <span className="text-[var(--text-secondary)]">
                    Data will be grouped by{' '}
                    <span className="font-semibold text-[var(--text-primary)]">
                      {selectedCategory === 'status'
                        ? 'Task Status'
                        : selectedCategory === 'priority'
                        ? 'Priority Level'
                        : selectedCategory === 'assignee'
                        ? 'Team Member'
                        : selectedCategory === 'time_tracking'
                        ? 'Time Entries'
                        : 'Custom Fields'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          {step === 'configure' && (
            <button
              onClick={handleAdd}
              disabled={!selectedWidget || !widgetTitle.trim()}
              className="btn btn-primary"
              style={{
                backgroundColor: currentCategory?.color,
                opacity: !selectedWidget || !widgetTitle.trim() ? 0.5 : 1,
              }}
            >
              Add Widget
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddWidgetModal;
