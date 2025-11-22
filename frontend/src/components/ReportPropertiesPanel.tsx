/**
 * Report Properties Panel
 *
 * Right sidebar for configuring selected report elements:
 * - Position and size (x, y, width, height, rotation)
 * - Style properties (colors, borders, shadows, spacing)
 * - Element-specific properties (chart type, data source, etc.)
 * - Interactions and visibility conditions
 */

import React, { useState } from 'react';
import {
  ReportElement,
  ReportElementType,
  ElementPosition,
  ElementStyle,
  TextStyle,
  ChartElement,
  TableElement,
  TextElement,
  MetricCardElement,
} from '../types/reports';
import { useReportBuilder } from '../context/ReportBuilderContext';

// ===================================================================
// MAIN PROPERTIES PANEL
// ===================================================================

export const ReportPropertiesPanel: React.FC = () => {
  const { state, report, updateElement } = useReportBuilder();
  const [activeTab, setActiveTab] = useState<'properties' | 'style' | 'data' | 'interactions'>('properties');

  const selectedElements = state.selectedElements;

  // No selection
  if (selectedElements.length === 0) {
    return (
      <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <svg
            className="w-16 h-16 mx-auto mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
            />
          </svg>
          <p className="text-sm">Select an element to view properties</p>
        </div>
      </div>
    );
  }

  // Multiple selection
  if (selectedElements.length > 1) {
    const elements = selectedElements.map(id => report?.elements.find(el => el.id === id)).filter(Boolean);

    const handleBulkUpdate = (updates: Partial<ReportElement>) => {
      selectedElements.forEach(id => {
        updateElement(id, updates);
      });
    };

    return (
      <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4">Multiple Elements Selected</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {selectedElements.length} elements selected
        </p>

        <div className="space-y-6">
          {/* Bulk Position Adjustments */}
          <PropertyGroup label="Position Adjustments">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleBulkUpdate({ position: { ...elements[0]?.position, x: elements[0]?.position.x + 10 } })}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                Move Right
              </button>
              <button
                onClick={() => handleBulkUpdate({ position: { ...elements[0]?.position, x: elements[0]?.position.x - 10 } })}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                Move Left
              </button>
              <button
                onClick={() => handleBulkUpdate({ position: { ...elements[0]?.position, y: elements[0]?.position.y - 10 } })}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                Move Up
              </button>
              <button
                onClick={() => handleBulkUpdate({ position: { ...elements[0]?.position, y: elements[0]?.position.y + 10 } })}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                Move Down
              </button>
            </div>
          </PropertyGroup>

          {/* Bulk Alignment */}
          <PropertyGroup label="Align Elements">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const minX = Math.min(...elements.map(e => e?.position.x || 0));
                  elements.forEach(el => {
                    if (el) updateElement(el.id, { position: { ...el.position, x: minX } });
                  });
                }}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                Align Left
              </button>
              <button
                onClick={() => {
                  const maxX = Math.max(...elements.map(e => (e?.position.x || 0) + (e?.position.width || 0)));
                  elements.forEach(el => {
                    if (el) updateElement(el.id, { position: { ...el.position, x: maxX - el.position.width } });
                  });
                }}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                Align Right
              </button>
              <button
                onClick={() => {
                  const minY = Math.min(...elements.map(e => e?.position.y || 0));
                  elements.forEach(el => {
                    if (el) updateElement(el.id, { position: { ...el.position, y: minY } });
                  });
                }}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                Align Top
              </button>
              <button
                onClick={() => {
                  const maxY = Math.max(...elements.map(e => (e?.position.y || 0) + (e?.position.height || 0)));
                  elements.forEach(el => {
                    if (el) updateElement(el.id, { position: { ...el.position, y: maxY - el.position.height } });
                  });
                }}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                Align Bottom
              </button>
            </div>
          </PropertyGroup>

          {/* Bulk Styling */}
          <PropertyGroup label="Apply Style to All">
            <div className="space-y-2">
              <ColorInput
                label="Background"
                value={''}
                onChange={(value) => handleBulkUpdate({ style: { ...elements[0]?.style, backgroundColor: value } })}
              />
              <ColorInput
                label="Border"
                value={''}
                onChange={(value) => handleBulkUpdate({ style: { ...elements[0]?.style, borderColor: value } })}
              />
            </div>
          </PropertyGroup>

          {/* Bulk Lock/Unlock */}
          <PropertyGroup label="Lock/Unlock">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleBulkUpdate({ locked: true })}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                Lock All
              </button>
              <button
                onClick={() => handleBulkUpdate({ locked: false })}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                Unlock All
              </button>
            </div>
          </PropertyGroup>
        </div>
      </div>
    );
  }

  // Single selection
  const elementId = selectedElements[0];
  const element = report?.elements.find((el) => el.id === elementId);

  if (!element) return null;

  const tabs = [
    { id: 'properties', label: 'Properties', icon: '⚙️' },
    { id: 'style', label: 'Style', icon: '🎨' },
    { id: 'data', label: 'Data', icon: '📊' },
    { id: 'interactions', label: 'Interactions', icon: '🔗' },
  ];

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-1">{element.name}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">{element.type}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            <span className="hidden lg:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'properties' && <PropertiesTab element={element} updateElement={updateElement} />}
        {activeTab === 'style' && <StyleTab element={element} updateElement={updateElement} />}
        {activeTab === 'data' && <DataTab element={element} updateElement={updateElement} />}
        {activeTab === 'interactions' && <InteractionsTab element={element} updateElement={updateElement} />}
      </div>
    </div>
  );
};

// ===================================================================
// PROPERTIES TAB
// ===================================================================

const PropertiesTab: React.FC<{
  element: ReportElement;
  updateElement: (id: string, updates: Partial<ReportElement>) => void;
}> = ({ element, updateElement }) => {
  const handlePositionChange = (updates: Partial<ElementPosition>) => {
    updateElement(element.id, {
      position: { ...element.position, ...updates },
    });
  };

  return (
    <div className="space-y-6">
      {/* Name */}
      <PropertyGroup label="Name">
        <input
          type="text"
          value={element.name}
          onChange={(e) => updateElement(element.id, { name: e.target.value })}
          className="input"
        />
      </PropertyGroup>

      {/* Position */}
      <PropertyGroup label="Position">
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="X"
            value={element.position.x}
            onChange={(value) => handlePositionChange({ x: value })}
            unit="px"
          />
          <NumberInput
            label="Y"
            value={element.position.y}
            onChange={(value) => handlePositionChange({ y: value })}
            unit="px"
          />
        </div>
      </PropertyGroup>

      {/* Size */}
      <PropertyGroup label="Size">
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="Width"
            value={element.position.width}
            onChange={(value) => handlePositionChange({ width: value })}
            unit="px"
            min={10}
          />
          <NumberInput
            label="Height"
            value={element.position.height}
            onChange={(value) => handlePositionChange({ height: value })}
            unit="px"
            min={10}
          />
        </div>
      </PropertyGroup>

      {/* Rotation */}
      <PropertyGroup label="Rotation">
        <NumberInput
          label="Angle"
          value={element.position.rotation || 0}
          onChange={(value) => handlePositionChange({ rotation: value })}
          unit="°"
          min={-180}
          max={180}
        />
      </PropertyGroup>

      {/* Layer */}
      <PropertyGroup label="Layer">
        <NumberInput
          label="Z-Index"
          value={element.position.zIndex || 0}
          onChange={(value) => handlePositionChange({ zIndex: value })}
        />
      </PropertyGroup>

      {/* Locked */}
      <PropertyGroup label="Lock">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={element.locked || false}
            onChange={(e) => updateElement(element.id, { locked: e.target.checked })}
            className="checkbox"
          />
          <span className="text-sm">Lock element</span>
        </label>
      </PropertyGroup>
    </div>
  );
};

// ===================================================================
// STYLE TAB
// ===================================================================

const StyleTab: React.FC<{
  element: ReportElement;
  updateElement: (id: string, updates: Partial<ReportElement>) => void;
}> = ({ element, updateElement }) => {
  const handleStyleChange = (updates: Partial<ElementStyle>) => {
    updateElement(element.id, {
      style: { ...element.style, ...updates },
    });
  };

  return (
    <div className="space-y-6">
      {/* Background */}
      <PropertyGroup label="Background">
        <ColorInput
          label="Color"
          value={element.style.backgroundColor || ''}
          onChange={(value) => handleStyleChange({ backgroundColor: value })}
        />
      </PropertyGroup>

      {/* Border */}
      <PropertyGroup label="Border">
        <div className="space-y-2">
          <ColorInput
            label="Color"
            value={element.style.borderColor || ''}
            onChange={(value) => handleStyleChange({ borderColor: value })}
          />
          <NumberInput
            label="Width"
            value={element.style.borderWidth || 0}
            onChange={(value) => handleStyleChange({ borderWidth: value })}
            unit="px"
            min={0}
          />
          <NumberInput
            label="Radius"
            value={element.style.borderRadius || 0}
            onChange={(value) => handleStyleChange({ borderRadius: value })}
            unit="px"
            min={0}
          />
          <SelectInput
            label="Style"
            value={element.style.borderStyle || 'solid'}
            options={[
              { label: 'Solid', value: 'solid' },
              { label: 'Dashed', value: 'dashed' },
              { label: 'Dotted', value: 'dotted' },
              { label: 'None', value: 'none' },
            ]}
            onChange={(value) => handleStyleChange({ borderStyle: value as any })}
          />
        </div>
      </PropertyGroup>

      {/* Opacity */}
      <PropertyGroup label="Opacity">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={element.style.opacity !== undefined ? element.style.opacity : 1}
          onChange={(e) => handleStyleChange({ opacity: parseFloat(e.target.value) })}
          className="w-full"
        />
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {((element.style.opacity !== undefined ? element.style.opacity : 1) * 100).toFixed(0)}%
        </div>
      </PropertyGroup>

      {/* Shadow */}
      <PropertyGroup label="Shadow">
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={!!element.style.shadow}
            onChange={(e) => {
              if (e.target.checked) {
                handleStyleChange({ shadow: { x: 0, y: 4, blur: 6, spread: 0, color: 'rgba(0, 0, 0, 0.1)' } });
              } else {
                handleStyleChange({ shadow: undefined });
              }
            }}
            className="checkbox"
          />
          <span className="text-sm">Enable shadow</span>
        </label>
        {element.style.shadow && (
          <div className="space-y-2 pl-6">
            <NumberInput
              label="X"
              value={element.style.shadow.x}
              onChange={(value) =>
                handleStyleChange({ shadow: { ...element.style.shadow!, x: value } })
              }
              unit="px"
            />
            <NumberInput
              label="Y"
              value={element.style.shadow.y}
              onChange={(value) =>
                handleStyleChange({ shadow: { ...element.style.shadow!, y: value } })
              }
              unit="px"
            />
            <NumberInput
              label="Blur"
              value={element.style.shadow.blur}
              onChange={(value) =>
                handleStyleChange({ shadow: { ...element.style.shadow!, blur: value } })
              }
              unit="px"
              min={0}
            />
          </div>
        )}
      </PropertyGroup>
    </div>
  );
};

// ===================================================================
// DATA TAB
// ===================================================================

const DataTab: React.FC<{
  element: ReportElement;
  updateElement: (id: string, updates: Partial<ReportElement>) => void;
}> = ({ element, updateElement }) => {
  // Show data configuration based on element type
  if (element.type === ReportElementType.CHART) {
    return <ChartDataConfig element={element as ChartElement} updateElement={updateElement} />;
  }

  if (element.type === ReportElementType.TABLE) {
    return <TableDataConfig element={element as TableElement} updateElement={updateElement} />;
  }

  if (element.type === ReportElementType.METRIC_CARD) {
    return <MetricDataConfig element={element as MetricCardElement} updateElement={updateElement} />;
  }

  return (
    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
      <p className="text-sm">No data configuration available for this element type</p>
    </div>
  );
};

const ChartDataConfig: React.FC<{
  element: ChartElement;
  updateElement: (id: string, updates: Partial<ReportElement>) => void;
}> = ({ element, updateElement }) => {
  return (
    <div className="space-y-6">
      <PropertyGroup label="Data Source">
        <SelectInput
          label="Type"
          value={element.dataSource.type}
          options={[
            { label: 'Static', value: 'static' },
            { label: 'API', value: 'api' },
            { label: 'Query', value: 'query' },
          ]}
          onChange={(value) =>
            updateElement(element.id, {
              dataSource: { ...element.dataSource, type: value as any },
            })
          }
        />
      </PropertyGroup>

      {element.dataSource.type === 'api' && (
        <PropertyGroup label="API Endpoint">
          <input
            type="text"
            value={element.dataSource.apiEndpoint || ''}
            onChange={(e) =>
              updateElement(element.id, {
                dataSource: { ...element.dataSource, apiEndpoint: e.target.value },
              })
            }
            placeholder="https://api.example.com/data"
            className="input"
          />
        </PropertyGroup>
      )}

      <PropertyGroup label="Refresh">
        <NumberInput
          label="Interval (seconds)"
          value={element.refreshInterval || 0}
          onChange={(value) => updateElement(element.id, { refreshInterval: value })}
          min={0}
        />
      </PropertyGroup>
    </div>
  );
};

const TableDataConfig: React.FC<{
  element: TableElement;
  updateElement: (id: string, updates: Partial<ReportElement>) => void;
}> = ({ element, updateElement }) => {
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null);

  const handleAddColumn = () => {
    const newColumn = {
      id: `col_${Date.now()}`,
      field: '',
      header: 'New Column',
      visible: true,
      width: 100,
      align: 'left' as const,
    };
    updateElement(element.id, {
      columns: [...element.columns, newColumn],
    });
  };

  const handleRemoveColumn = (index: number) => {
    const newColumns = element.columns.filter((_, i) => i !== index);
    updateElement(element.id, { columns: newColumns });
    setSelectedColumnIndex(null);
  };

  const handleUpdateColumn = (index: number, updates: any) => {
    const newColumns = [...element.columns];
    newColumns[index] = { ...newColumns[index], ...updates };
    updateElement(element.id, { columns: newColumns });
  };

  return (
    <div className="space-y-6">
      <PropertyGroup label="Columns">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {element.columns.length} columns
            </p>
            <button
              onClick={handleAddColumn}
              className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              + Add
            </button>
          </div>

          {/* Column List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {element.columns.map((column, index) => (
              <div
                key={column.id}
                className={`border rounded p-2 cursor-pointer ${
                  selectedColumnIndex === index
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                onClick={() => setSelectedColumnIndex(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{column.header}</div>
                    <div className="text-xs text-gray-500">{column.field}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveColumn(index);
                    }}
                    className="text-red-600 hover:text-red-700 text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Column Editor */}
          {selectedColumnIndex !== null && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded space-y-3">
              <h4 className="text-sm font-medium">Edit Column</h4>
              <input
                type="text"
                value={element.columns[selectedColumnIndex].header}
                onChange={(e) =>
                  handleUpdateColumn(selectedColumnIndex, { header: e.target.value })
                }
                placeholder="Column header"
                className="input w-full"
              />
              <input
                type="text"
                value={element.columns[selectedColumnIndex].field}
                onChange={(e) =>
                  handleUpdateColumn(selectedColumnIndex, { field: e.target.value })
                }
                placeholder="Field name"
                className="input w-full"
              />
              <div className="grid grid-cols-2 gap-2">
                <NumberInput
                  label="Width"
                  value={element.columns[selectedColumnIndex].width || 100}
                  onChange={(value) =>
                    handleUpdateColumn(selectedColumnIndex, { width: value })
                  }
                  min={50}
                />
                <SelectInput
                  label="Align"
                  value={element.columns[selectedColumnIndex].align || 'left'}
                  options={[
                    { label: 'Left', value: 'left' },
                    { label: 'Center', value: 'center' },
                    { label: 'Right', value: 'right' },
                  ]}
                  onChange={(value) =>
                    handleUpdateColumn(selectedColumnIndex, { align: value })
                  }
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={element.columns[selectedColumnIndex].visible !== false}
                  onChange={(e) =>
                    handleUpdateColumn(selectedColumnIndex, { visible: e.target.checked })
                  }
                  className="checkbox"
                />
                <span className="text-sm">Visible</span>
              </label>
            </div>
          )}
        </div>
      </PropertyGroup>

      <PropertyGroup label="Pagination">
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={element.pagination?.enabled || false}
            onChange={(e) =>
              updateElement(element.id, {
                pagination: { ...element.pagination, enabled: e.target.checked, pageSize: 10 },
              })
            }
            className="checkbox"
          />
          <span className="text-sm">Enable pagination</span>
        </label>
        {element.pagination?.enabled && (
          <NumberInput
            label="Page Size"
            value={element.pagination.pageSize}
            onChange={(value) =>
              updateElement(element.id, {
                pagination: { ...element.pagination!, pageSize: value },
              })
            }
            min={1}
          />
        )}
      </PropertyGroup>
    </div>
  );
};

const MetricDataConfig: React.FC<{
  element: MetricCardElement;
  updateElement: (id: string, updates: Partial<ReportElement>) => void;
}> = ({ element, updateElement }) => {
  return (
    <div className="space-y-6">
      <PropertyGroup label="Metric">
        <input
          type="text"
          value={element.metric.label}
          onChange={(e) =>
            updateElement(element.id, {
              metric: { ...element.metric, label: e.target.value },
            })
          }
          placeholder="Metric label"
          className="input mb-2"
        />
        <input
          type="text"
          value={element.metric.field}
          onChange={(e) =>
            updateElement(element.id, {
              metric: { ...element.metric, field: e.target.value },
            })
          }
          placeholder="Field name"
          className="input"
        />
      </PropertyGroup>

      <PropertyGroup label="Comparison">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!element.comparison}
            onChange={(e) => {
              if (e.target.checked) {
                updateElement(element.id, {
                  comparison: { type: 'previous_period', showPercentChange: true },
                });
              } else {
                updateElement(element.id, { comparison: undefined });
              }
            }}
            className="checkbox"
          />
          <span className="text-sm">Show comparison</span>
        </label>
      </PropertyGroup>
    </div>
  );
};

// ===================================================================
// INTERACTIONS TAB
// ===================================================================

const InteractionsTab: React.FC<{
  element: ReportElement;
  updateElement: (id: string, updates: Partial<ReportElement>) => void;
}> = ({ element, updateElement }) => {
  const [interactions, setInteractions] = useState(element.interactions || []);
  const [selectedInteractionIndex, setSelectedInteractionIndex] = useState<number | null>(null);

  const handleAddInteraction = () => {
    const newInteraction = {
      type: 'click' as const,
      action: {
        type: 'navigate' as const,
        target: '',
      },
    };
    const updatedInteractions = [...interactions, newInteraction];
    setInteractions(updatedInteractions);
    updateElement(element.id, { interactions: updatedInteractions });
  };

  const handleRemoveInteraction = (index: number) => {
    const updatedInteractions = interactions.filter((_, i) => i !== index);
    setInteractions(updatedInteractions);
    updateElement(element.id, { interactions: updatedInteractions });
    setSelectedInteractionIndex(null);
  };

  const handleUpdateInteraction = (index: number, updates: any) => {
    const updatedInteractions = [...interactions];
    updatedInteractions[index] = { ...updatedInteractions[index], ...updates };
    setInteractions(updatedInteractions);
    updateElement(element.id, { interactions: updatedInteractions });
  };

  return (
    <div className="space-y-6">
      <PropertyGroup label="Interactions">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {interactions.length} interactions
            </p>
            <button
              onClick={handleAddInteraction}
              className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              + Add Interaction
            </button>
          </div>

          {/* Interaction List */}
          <div className="space-y-2">
            {interactions.map((interaction, index) => (
              <div
                key={index}
                className={`border rounded p-2 cursor-pointer ${
                  selectedInteractionIndex === index
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                onClick={() => setSelectedInteractionIndex(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium capitalize">{interaction.type}</div>
                    <div className="text-xs text-gray-500">{interaction.action.type}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveInteraction(index);
                    }}
                    className="text-red-600 hover:text-red-700 text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Interaction Editor */}
          {selectedInteractionIndex !== null && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded space-y-3">
              <h4 className="text-sm font-medium">Edit Interaction</h4>

              <SelectInput
                label="Trigger"
                value={interactions[selectedInteractionIndex].type}
                options={[
                  { label: 'Click', value: 'click' },
                  { label: 'Hover', value: 'hover' },
                  { label: 'Double Click', value: 'doubleclick' },
                ]}
                onChange={(value) =>
                  handleUpdateInteraction(selectedInteractionIndex, { type: value })
                }
              />

              <SelectInput
                label="Action"
                value={interactions[selectedInteractionIndex].action.type}
                options={[
                  { label: 'Navigate to URL', value: 'navigate' },
                  { label: 'Show Tooltip', value: 'tooltip' },
                  { label: 'Drill Down', value: 'drilldown' },
                  { label: 'Open Modal', value: 'modal' },
                  { label: 'Update Filter', value: 'filter' },
                ]}
                onChange={(value) =>
                  handleUpdateInteraction(selectedInteractionIndex, {
                    action: { ...interactions[selectedInteractionIndex].action, type: value },
                  })
                }
              />

              {interactions[selectedInteractionIndex].action.type === 'navigate' && (
                <input
                  type="text"
                  placeholder="Target URL"
                  value={interactions[selectedInteractionIndex].action.target || ''}
                  onChange={(e) =>
                    handleUpdateInteraction(selectedInteractionIndex, {
                      action: { ...interactions[selectedInteractionIndex].action, target: e.target.value },
                    })
                  }
                  className="input w-full"
                />
              )}

              {interactions[selectedInteractionIndex].action.type === 'tooltip' && (
                <textarea
                  placeholder="Tooltip content"
                  value={interactions[selectedInteractionIndex].action.content || ''}
                  onChange={(e) =>
                    handleUpdateInteraction(selectedInteractionIndex, {
                      action: { ...interactions[selectedInteractionIndex].action, content: e.target.value },
                    })
                  }
                  rows={3}
                  className="input w-full"
                />
              )}

              {interactions[selectedInteractionIndex].action.type === 'drilldown' && (
                <input
                  type="text"
                  placeholder="Drilldown level"
                  value={interactions[selectedInteractionIndex].action.level || ''}
                  onChange={(e) =>
                    handleUpdateInteraction(selectedInteractionIndex, {
                      action: { ...interactions[selectedInteractionIndex].action, level: e.target.value },
                    })
                  }
                  className="input w-full"
                />
              )}

              {interactions[selectedInteractionIndex].action.type === 'filter' && (
                <>
                  <input
                    type="text"
                    placeholder="Filter field"
                    value={interactions[selectedInteractionIndex].action.field || ''}
                    onChange={(e) =>
                      handleUpdateInteraction(selectedInteractionIndex, {
                        action: { ...interactions[selectedInteractionIndex].action, field: e.target.value },
                      })
                    }
                    className="input w-full"
                  />
                  <input
                    type="text"
                    placeholder="Filter value"
                    value={interactions[selectedInteractionIndex].action.value || ''}
                    onChange={(e) =>
                      handleUpdateInteraction(selectedInteractionIndex, {
                        action: { ...interactions[selectedInteractionIndex].action, value: e.target.value },
                      })
                    }
                    className="input w-full"
                  />
                </>
              )}
            </div>
          )}
        </div>
      </PropertyGroup>

      <PropertyGroup label="Visibility">
        <SelectInput
          label="Condition"
          value={element.visibility?.type || 'always'}
          options={[
            { label: 'Always Visible', value: 'always' },
            { label: 'Conditional', value: 'conditional' },
            { label: 'Based on Parameter', value: 'parameter' },
          ]}
          onChange={(value) =>
            updateElement(element.id, {
              visibility: { type: value as any },
            })
          }
        />

        {element.visibility?.type === 'conditional' && (
          <textarea
            placeholder="Condition expression"
            value={element.visibility.condition || ''}
            onChange={(e) =>
              updateElement(element.id, {
                visibility: { ...element.visibility!, condition: e.target.value },
              })
            }
            rows={3}
            className="input w-full mt-2"
          />
        )}

        {element.visibility?.type === 'parameter' && (
          <input
            type="text"
            placeholder="Parameter name"
            value={element.visibility.parameterName || ''}
            onChange={(e) =>
              updateElement(element.id, {
                visibility: { ...element.visibility!, parameterName: e.target.value },
              })
            }
            className="input w-full mt-2"
          />
        )}
      </PropertyGroup>
    </div>
  );
};

// ===================================================================
// REUSABLE INPUT COMPONENTS
// ===================================================================

const PropertyGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>
      {children}
    </div>
  );
};

const NumberInput: React.FC<{
  label?: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
}> = ({ label, value, onChange, unit, min, max, step = 1 }) => {
  return (
    <div>
      {label && <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</label>}
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          className="input flex-1"
        />
        {unit && <span className="text-xs text-gray-500">{unit}</span>}
      </div>
    </div>
  );
};

const ColorInput: React.FC<{
  label?: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => {
  return (
    <div>
      {label && <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</label>}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-8 rounded border"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="input flex-1"
        />
      </div>
    </div>
  );
};

const SelectInput: React.FC<{
  label?: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => {
  return (
    <div>
      {label && <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</label>}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
        {options.map((option) => (
          <key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
