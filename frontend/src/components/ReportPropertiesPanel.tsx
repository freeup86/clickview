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
    return (
      <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4">Multiple Elements Selected</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {selectedElements.length} elements selected
        </p>
        {/* TODO: Add bulk edit options */}
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
  return (
    <div className="space-y-6">
      <PropertyGroup label="Columns">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {element.columns.length} columns configured
        </p>
        {/* TODO: Add column configuration UI */}
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
  return (
    <div className="space-y-6">
      <PropertyGroup label="Interactions">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Configure click, hover, and other interactions
        </p>
        {/* TODO: Add interaction configuration UI */}
        <button className="btn btn-sm">Add Interaction</button>
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
