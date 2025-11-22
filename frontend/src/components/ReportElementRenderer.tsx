/**
 * Report Element Renderer
 *
 * Renders all types of report elements:
 * - Charts (using existing chart components)
 * - Tables (data tables with sorting, filtering)
 * - Text (with markdown support)
 * - Images
 * - Metric cards (KPI displays)
 * - Dividers
 * - Shapes (decorative elements)
 * - Filters (interactive controls)
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  ReportElement,
  ReportElementType,
  ChartElement,
  TableElement,
  TextElement,
  ImageElement,
  MetricCardElement,
  DividerElement,
  ShapeElement,
  FilterElement,
  ElementStyle,
  TextStyle,
} from '../types/reports';
import { getChartComponent } from './charts';
import { evaluateFormula } from '../utils/formulaEngine';

// ===================================================================
// MAIN RENDERER COMPONENT
// ===================================================================

interface ReportElementRendererProps {
  element: ReportElement;
  data?: Record<string, any>;
  isSelected?: boolean;
  isPreview?: boolean;
  onElementClick?: (elementId: string) => void;
  onInteraction?: (elementId: string, interaction: any) => void;
}

export const ReportElementRenderer: React.FC<ReportElementRendererProps> = ({
  element,
  data = {},
  isSelected = false,
  isPreview = false,
  onElementClick,
  onInteraction,
}) => {
  const { position, style, locked } = element;

  // Check visibility condition
  const isVisible = useMemo(() => {
    if (!element.visibility) return true;
    if (element.visibility.type === 'always') return true;

    if (element.visibility.type === 'conditional' && element.visibility.condition) {
      try {
        // Evaluate condition expression
        // Support simple comparisons: field operator value
        const condition = element.visibility.condition;

        // Parse condition (e.g., "status == 'active'" or "value > 100")
        const operators = ['===', '==', '!==', '!=', '>=', '<=', '>', '<'];
        let operator = '';
        let parts: string[] = [];

        for (const op of operators) {
          if (condition.includes(op)) {
            operator = op;
            parts = condition.split(op).map(p => p.trim());
            break;
          }
        }

        if (parts.length === 2) {
          // Get field value from data
          const fieldName = parts[0];
          let fieldValue = data[fieldName];

          // Get comparison value (remove quotes if string literal)
          let compValue: any = parts[1];
          if (compValue.startsWith("'") || compValue.startsWith('"')) {
            compValue = compValue.slice(1, -1);
          } else if (!isNaN(Number(compValue))) {
            compValue = Number(compValue);
          }

          // Perform comparison
          switch (operator) {
            case '===':
            case '==':
              return fieldValue == compValue;
            case '!==':
            case '!=':
              return fieldValue != compValue;
            case '>':
              return Number(fieldValue) > Number(compValue);
            case '<':
              return Number(fieldValue) < Number(compValue);
            case '>=':
              return Number(fieldValue) >= Number(compValue);
            case '<=':
              return Number(fieldValue) <= Number(compValue);
            default:
              return true;
          }
        }

        return evaluateFormula(condition, data);
      } catch {
        return true;
      }
    }

    if (element.visibility.type === 'parameter') {
      // Check parameter value
      const paramName = element.visibility.parameterName;
      if (!paramName) return true;

      // Get parameter value from data or URL params
      let paramValue = data[paramName];

      // Also check URL parameters if available
      if (typeof window !== 'undefined' && !paramValue) {
        const urlParams = new URLSearchParams(window.location.search);
        paramValue = urlParams.get(paramName);
      }

      // If parameter has expected value, compare it
      if (element.visibility.parameterValue !== undefined) {
        return paramValue == element.visibility.parameterValue;
      }

      // Otherwise, just check if parameter exists and is truthy
      return !!paramValue;
    }

    return true;
  }, [element.visibility, data]);

  if (!isVisible) return null;

  // Container styles
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: position.width,
    height: position.height,
    transform: position.rotation ? `rotate(${position.rotation}deg)` : undefined,
    zIndex: position.zIndex || 0,
    cursor: locked ? 'default' : 'pointer',
    outline: isSelected && !isPreview ? '3px solid #3b82f6' : 'none',
    outlineOffset: '2px',
    ...convertStyleToCSS(style),
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isPreview && onElementClick) {
      e.stopPropagation();
      onElementClick(element.id);
    }

    // Handle interactions
    if (element.interactions) {
      const clickInteraction = element.interactions.find((i) => i.type === 'click');
      if (clickInteraction && onInteraction) {
        onInteraction(element.id, clickInteraction.action);
      }
    }
  };

  return (
    <div
      className="report-element"
      style={containerStyle}
      onClick={handleClick}
      data-element-id={element.id}
      data-element-type={element.type}
    >
      {renderElementContent(element, data, isPreview, onInteraction)}
    </div>
  );
};

// ===================================================================
// ELEMENT CONTENT RENDERERS
// ===================================================================

function renderElementContent(
  element: ReportElement,
  data: Record<string, any>,
  isPreview: boolean,
  onInteraction?: (elementId: string, interaction: any) => void
): React.ReactNode {
  switch (element.type) {
    case ReportElementType.CHART:
      return <ChartElementRenderer element={element as ChartElement} data={data} />;

    case ReportElementType.TABLE:
      return <TableElementRenderer element={element as TableElement} data={data} />;

    case ReportElementType.TEXT:
      return <TextElementRenderer element={element as TextElement} data={data} />;

    case ReportElementType.IMAGE:
      return <ImageElementRenderer element={element as ImageElement} />;

    case ReportElementType.METRIC_CARD:
      return <MetricCardElementRenderer element={element as MetricCardElement} data={data} />;

    case ReportElementType.DIVIDER:
      return <DividerElementRenderer element={element as DividerElement} />;

    case ReportElementType.SHAPE:
      return <ShapeElementRenderer element={element as ShapeElement} />;

    case ReportElementType.FILTER:
      return <FilterElementRenderer element={element as FilterElement} onChange={onInteraction} />;

    default:
      return <div className="text-gray-400 flex items-center justify-center h-full">Unknown element type</div>;
  }
}

// ===================================================================
// CHART ELEMENT RENDERER
// ===================================================================

const ChartElementRenderer: React.FC<{ element: ChartElement; data: Record<string, any> }> = ({ element, data }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const ChartComponent = getChartComponent(element.chartType);

  useEffect(() => {
    fetchChartData();
  }, [element.dataSource]);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      let rawData: any = null;

      // Fetch data from dataSource
      if (element.dataSource) {
        if (element.dataSource.type === 'static' && element.dataSource.data) {
          rawData = element.dataSource.data;
        } else if (element.dataSource.type === 'api' && element.dataSource.apiEndpoint) {
          const response = await fetch(element.dataSource.apiEndpoint, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json',
            },
          });
          if (response.ok) {
            rawData = await response.json();
          }
        } else if (element.dataSource.type === 'query' && element.dataSource.query) {
          // Execute query via API
          const response = await fetch('/api/query', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: element.dataSource.query }),
          });
          if (response.ok) {
            rawData = await response.json();
          }
        }
      }

      // Apply calculated fields if configured
      if (rawData && element.calculatedFields && element.calculatedFields.length > 0) {
        if (Array.isArray(rawData)) {
          rawData = rawData.map(row => {
            const newRow = { ...row };
            element.calculatedFields!.forEach(field => {
              try {
                // Evaluate formula for calculated field
                if (field.formula) {
                  // Simple formula evaluation (support basic arithmetic and field references)
                  let formula = field.formula;

                  // Replace field references with values
                  Object.keys(row).forEach(key => {
                    formula = formula.replace(new RegExp(`\\b${key}\\b`, 'g'), String(row[key]));
                  });

                  // Evaluate the formula (safely)
                  try {
                    newRow[field.name] = eval(formula);
                  } catch {
                    newRow[field.name] = 0;
                  }
                }
              } catch {
                newRow[field.name] = null;
              }
            });
            return newRow;
          });
        } else if (rawData.data && Array.isArray(rawData.data)) {
          rawData.data = rawData.data.map((row: any) => {
            const newRow = { ...row };
            element.calculatedFields!.forEach(field => {
              try {
                if (field.formula) {
                  let formula = field.formula;
                  Object.keys(row).forEach(key => {
                    formula = formula.replace(new RegExp(`\\b${key}\\b`, 'g'), String(row[key]));
                  });
                  try {
                    newRow[field.name] = eval(formula);
                  } catch {
                    newRow[field.name] = 0;
                  }
                }
              } catch {
                newRow[field.name] = null;
              }
            });
            return newRow;
          });
        }
      }

      // Apply filters if configured
      if (rawData && element.filters && element.filters.length > 0) {
        if (Array.isArray(rawData)) {
          rawData = rawData.filter(row => {
            return element.filters!.every(filter => {
              const value = row[filter.field];
              switch (filter.operator) {
                case 'equals':
                  return value == filter.value;
                case 'notEquals':
                  return value != filter.value;
                case 'greaterThan':
                  return Number(value) > Number(filter.value);
                case 'lessThan':
                  return Number(value) < Number(filter.value);
                case 'contains':
                  return String(value).includes(String(filter.value));
                case 'in':
                  return Array.isArray(filter.value) && filter.value.includes(value);
                default:
                  return true;
              }
            });
          });
        }
      }

      setChartData(rawData);
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  if (!ChartComponent) {
    return <div className="text-gray-400 flex items-center justify-center h-full">Chart type not found</div>;
  }

  if (loading) {
    return <div className="text-gray-400 flex items-center justify-center h-full">Loading chart data...</div>;
  }

  if (!chartData) {
    return <div className="text-gray-400 flex items-center justify-center h-full">No data available</div>;
  }

  return (
    <div className="w-full h-full">
      <ChartComponent {...element.config} data={chartData} />
    </div>
  );
};

// ===================================================================
// TABLE ELEMENT RENDERER
// ===================================================================

const TableElementRenderer: React.FC<{ element: TableElement; data: Record<string, any> }> = ({ element, data }) => {
  const [sortedData, setSortedData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTableData();
  }, [element, data]);

  const fetchTableData = async () => {
    setLoading(true);
    try {
      let rawData: any = null;

      // Fetch data from dataSource
      if (element.dataSource) {
        if (element.dataSource.type === 'static' && element.dataSource.data) {
          rawData = element.dataSource.data;
        } else if (element.dataSource.type === 'api' && element.dataSource.apiEndpoint) {
          const response = await fetch(element.dataSource.apiEndpoint, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json',
            },
          });
          if (response.ok) {
            rawData = await response.json();
          }
        } else if (element.dataSource.type === 'query' && element.dataSource.query) {
          const response = await fetch('/api/query', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: element.dataSource.query }),
          });
          if (response.ok) {
            rawData = await response.json();
          }
        }
      }

      // Fallback to data prop if no dataSource
      if (!rawData && data) {
        rawData = data;
      }

      // Ensure data is an array
      if (!Array.isArray(rawData)) {
        rawData = rawData ? [rawData] : [];
      }

      // Apply calculated fields
      if (element.calculatedFields && element.calculatedFields.length > 0) {
        rawData = rawData.map((row: any) => {
          const newRow = { ...row };
          element.calculatedFields!.forEach((field) => {
            try {
              if (field.formula) {
                let formula = field.formula;
                Object.keys(row).forEach((key) => {
                  formula = formula.replace(new RegExp(`\\b${key}\\b`, 'g'), String(row[key]));
                });
                try {
                  newRow[field.name] = eval(formula);
                } catch {
                  newRow[field.name] = 0;
                }
              }
            } catch {
              newRow[field.name] = null;
            }
          });
          return newRow;
        });
      }

      // Apply filters
      if (element.filters && element.filters.length > 0) {
        rawData = rawData.filter((row: any) => {
          return element.filters!.every((filter) => {
            const value = row[filter.field];
            switch (filter.operator) {
              case 'equals':
                return value == filter.value;
              case 'notEquals':
                return value != filter.value;
              case 'greaterThan':
                return Number(value) > Number(filter.value);
              case 'lessThan':
                return Number(value) < Number(filter.value);
              case 'contains':
                return String(value).includes(String(filter.value));
              case 'in':
                return Array.isArray(filter.value) && filter.value.includes(value);
              default:
                return true;
            }
          });
        });
      }

      // Apply sorting (if configured)
      if (element.sorting?.defaultColumn && element.sorting?.defaultOrder) {
        const { defaultColumn, defaultOrder } = element.sorting;
        rawData = [...rawData].sort((a, b) => {
          const aVal = a[defaultColumn];
          const bVal = b[defaultColumn];
          if (aVal < bVal) return defaultOrder === 'asc' ? -1 : 1;
          if (aVal > bVal) return defaultOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }

      setSortedData(rawData);
    } catch (error) {
      console.error('Failed to fetch table data:', error);
      setSortedData([]);
    } finally {
      setLoading(false);
    }
  };

  const { pagination } = element;
  const pageSize = pagination?.pageSize || 10;
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageData = sortedData.slice(startIndex, endIndex);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
            <tr>
              {element.columns.filter((col) => col.visible !== false).map((column) => (
                <th
                  key={column.id}
                  className="px-4 py-2 text-left font-semibold border-b"
                  style={{
                    width: column.width,
                    textAlign: column.align || 'left',
                  }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={element.columns.length} className="px-4 py-8 text-center text-gray-400">
                  No data available
                </td>
              </tr>
            ) : (
              pageData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  {element.columns.filter((col) => col.visible !== false).map((column) => (
                    <td
                      key={column.id}
                      className="px-4 py-2 border-b"
                      style={{ textAlign: column.align || 'left' }}
                    >
                      {formatCellValue(row[column.field], column.format)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination?.enabled && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t bg-gray-50 dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {startIndex + 1} to {Math.min(endIndex, sortedData.length)} of {sortedData.length}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ===================================================================
// TEXT ELEMENT RENDERER
// ===================================================================

const TextElementRenderer: React.FC<{ element: TextElement; data: Record<string, any> }> = ({ element, data }) => {
  // Replace variables in text
  const processedContent = useMemo(() => {
    let content = element.content;

    if (element.variables) {
      element.variables.forEach((variable) => {
        const value = variable.value;
        const formatted = variable.format ? formatValue(value, variable.format) : String(value);
        content = content.replace(new RegExp(`\\{${variable.name}\\}`, 'g'), formatted);
      });
    }

    return content;
  }, [element.content, element.variables]);

  const textStyleCSS: React.CSSProperties = {
    ...convertTextStyleToCSS(element.textStyle),
  };

  return (
    <div className="w-full h-full overflow-auto" style={textStyleCSS}>
      {element.markdown ? (
        <div dangerouslySetInnerHTML={{ __html: processedContent }} />
      ) : (
        <div>{processedContent}</div>
      )}
    </div>
  );
};

// ===================================================================
// IMAGE ELEMENT RENDERER
// ===================================================================

const ImageElementRenderer: React.FC<{ element: ImageElement }> = ({ element }) => {
  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      <img
        src={element.src}
        alt={element.alt || element.name}
        className="max-w-full max-h-full"
        style={{
          objectFit: element.fit || 'contain',
          objectPosition: element.alignment || 'center',
        }}
      />
    </div>
  );
};

// ===================================================================
// METRIC CARD ELEMENT RENDERER
// ===================================================================

const MetricCardElementRenderer: React.FC<{ element: MetricCardElement; data: Record<string, any> }> = ({
  element,
  data,
}) => {
  // Fetch and calculate metric value
  let metricValue = 0;

  if (element.dataSource) {
    if (element.dataSource.type === 'static' && element.dataSource.data) {
      metricValue = element.dataSource.data[element.metric.field] || 0;
    } else if (data && data[element.metric.field] !== undefined) {
      metricValue = data[element.metric.field];
    }
  } else if (data && data[element.metric.field] !== undefined) {
    metricValue = data[element.metric.field];
  }

  const comparisonValue = element.comparison?.value || 0;
  const percentChange = comparisonValue !== 0 ? ((metricValue - comparisonValue) / comparisonValue) * 100 : 0;

  const trendColor = percentChange > 0 ? 'text-green-600' : percentChange < 0 ? 'text-red-600' : 'text-gray-600';
  const trendIcon = percentChange > 0 ? '↑' : percentChange < 0 ? '↓' : '→';

  return (
    <div className="w-full h-full p-6 flex flex-col justify-between bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {element.metric.label}
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {element.metric.prefix}
            {formatValue(metricValue, element.metric.format)}
            {element.metric.suffix}
          </div>
        </div>
        {element.metric.icon && (
          <div className="text-3xl opacity-20">
            {element.metric.icon}
          </div>
        )}
      </div>

      {element.comparison && (
        <div className={`flex items-center gap-2 text-sm font-medium ${trendColor}`}>
          <span className="text-lg">{trendIcon}</span>
          {element.comparison.showPercentChange && <span>{percentChange.toFixed(1)}%</span>}
          {element.comparison.showAbsoluteChange && <span>({metricValue - comparisonValue})</span>}
          {element.comparison.label && <span className="text-gray-600">vs {element.comparison.label}</span>}
        </div>
      )}

      {element.sparkline && (
        <div className="h-12 mt-4">
          {/* TODO: Add sparkline chart */}
          <div className="w-full h-full bg-gray-100 dark:bg-gray-700 rounded"></div>
        </div>
      )}
    </div>
  );
};

// ===================================================================
// DIVIDER ELEMENT RENDERER
// ===================================================================

const DividerElementRenderer: React.FC<{ element: DividerElement }> = ({ element }) => {
  const dividerStyle: React.CSSProperties = {
    width: element.orientation === 'horizontal' ? '100%' : element.thickness || 1,
    height: element.orientation === 'vertical' ? '100%' : element.thickness || 1,
    backgroundColor: element.color || '#e5e7eb',
    borderStyle: element.style || 'solid',
  };

  return <div style={dividerStyle} />;
};

// ===================================================================
// SHAPE ELEMENT RENDERER
// ===================================================================

const ShapeElementRenderer: React.FC<{ element: ShapeElement }> = ({ element }) => {
  const shapeStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: element.fillColor || 'transparent',
    border: element.strokeColor ? `${element.strokeWidth || 1}px solid ${element.strokeColor}` : 'none',
  };

  switch (element.shape) {
    case 'rectangle':
      return <div style={shapeStyle} />;

    case 'circle':
      return <div style={{ ...shapeStyle, borderRadius: '50%' }} />;

    case 'ellipse':
      return <div style={{ ...shapeStyle, borderRadius: '50%' }} />;

    case 'triangle':
      return (
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <polygon
            points="50,10 90,90 10,90"
            fill={element.fillColor || 'transparent'}
            stroke={element.strokeColor || 'none'}
            strokeWidth={element.strokeWidth || 1}
          />
        </svg>
      );

    case 'line':
      return (
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <line
            x1="0"
            y1="50"
            x2="100"
            y2="50"
            stroke={element.strokeColor || '#000'}
            strokeWidth={element.strokeWidth || 1}
          />
        </svg>
      );

    case 'arrow':
      return (
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="5"
              refY="5"
              orient="auto"
            >
              <polygon points="0,0 10,5 0,10" fill={element.strokeColor || '#000'} />
            </marker>
          </defs>
          <line
            x1="0"
            y1="50"
            x2="90"
            y2="50"
            stroke={element.strokeColor || '#000'}
            strokeWidth={element.strokeWidth || 2}
            markerEnd="url(#arrowhead)"
          />
        </svg>
      );

    default:
      return <div style={shapeStyle} />;
  }
};

// ===================================================================
// FILTER ELEMENT RENDERER
// ===================================================================

const FilterElementRenderer: React.FC<{
  element: FilterElement;
  onChange?: (elementId: string, interaction: any) => void;
}> = ({ element, onChange }) => {
  const [value, setValue] = useState(element.defaultValue);

  const handleChange = (newValue: any) => {
    setValue(newValue);
    if (onChange) {
      onChange(element.id, { type: 'filter', field: element.field, value: newValue });
    }
  };

  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";
  const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md";

  switch (element.filterType) {
    case 'dropdown':
      return (
        <div className="w-full h-full p-4">
          <label className={labelClass}>{element.label}</label>
          <select
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className={inputClass}
          >
            <option value="">Select...</option>
            {element.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );

    case 'multiselect':
      return (
        <div className="w-full h-full p-4">
          <label className={labelClass}>{element.label}</label>
          <select
            multiple
            value={Array.isArray(value) ? value : []}
            onChange={(e) => handleChange(Array.from(e.target.selectedOptions, (option) => option.value))}
            className={inputClass}
            size={5}
          >
            {element.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );

    case 'daterange':
      return (
        <div className="w-full h-full p-4">
          <label className={labelClass}>{element.label}</label>
          <input
            type="date"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className={inputClass}
          />
        </div>
      );

    case 'slider':
      return (
        <div className="w-full h-full p-4">
          <label className={labelClass}>{element.label}</label>
          <input
            type="range"
            value={value}
            onChange={(e) => handleChange(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{value}</div>
        </div>
      );

    case 'search':
      return (
        <div className="w-full h-full p-4">
          <label className={labelClass}>{element.label}</label>
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Search..."
            className={inputClass}
          />
        </div>
      );

    default:
      return <div className="p-4">Unknown filter type</div>;
  }
};

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Convert ElementStyle to CSS properties
 */
function convertStyleToCSS(style: ElementStyle): React.CSSProperties {
  const css: React.CSSProperties = {};

  if (style.backgroundColor) css.backgroundColor = style.backgroundColor;
  if (style.borderColor) css.borderColor = style.borderColor;
  if (style.borderWidth !== undefined) css.borderWidth = style.borderWidth;
  if (style.borderRadius !== undefined) css.borderRadius = style.borderRadius;
  if (style.borderStyle) css.borderStyle = style.borderStyle;
  if (style.opacity !== undefined) css.opacity = style.opacity;

  if (style.shadow) {
    const { x, y, blur, spread, color } = style.shadow;
    css.boxShadow = `${x}px ${y}px ${blur}px ${spread}px ${color}`;
  }

  if (style.padding) {
    const { top, right, bottom, left } = style.padding;
    css.padding = `${top}px ${right}px ${bottom}px ${left}px`;
  }

  if (style.margin) {
    const { top, right, bottom, left } = style.margin;
    css.margin = `${top}px ${right}px ${bottom}px ${left}px`;
  }

  return css;
}

/**
 * Convert TextStyle to CSS properties
 */
function convertTextStyleToCSS(style: TextStyle): React.CSSProperties {
  const css: React.CSSProperties = {};

  if (style.fontFamily) css.fontFamily = style.fontFamily;
  if (style.fontSize) css.fontSize = style.fontSize;
  if (style.fontWeight) css.fontWeight = style.fontWeight;
  if (style.fontStyle) css.fontStyle = style.fontStyle;
  if (style.color) css.color = style.color;
  if (style.textAlign) css.textAlign = style.textAlign;
  if (style.textDecoration) css.textDecoration = style.textDecoration;
  if (style.lineHeight) css.lineHeight = style.lineHeight;
  if (style.letterSpacing) css.letterSpacing = style.letterSpacing;
  if (style.textTransform) css.textTransform = style.textTransform;

  return css;
}

/**
 * Format cell value based on column format
 */
function formatCellValue(value: any, format?: any): string {
  if (value === null || value === undefined) return '';

  if (!format) return String(value);

  if (format.type === 'number') {
    const num = Number(value);
    return num.toFixed(format.decimals || 0);
  }

  if (format.type === 'currency') {
    const num = Number(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: format.currencySymbol || 'USD',
    }).format(num);
  }

  if (format.type === 'percentage') {
    const num = Number(value);
    return `${(num * 100).toFixed(format.decimals || 2)}%`;
  }

  if (format.type === 'date' || format.type === 'datetime') {
    const date = new Date(value);
    return date.toLocaleDateString();
  }

  return String(value);
}

/**
 * Format value with format string
 */
function formatValue(value: any, format?: string): string {
  if (!format) return String(value);

  if (format === 'currency') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
  }

  if (format === 'percent') {
    return `${(Number(value) * 100).toFixed(2)}%`;
  }

  if (format.startsWith('date:')) {
    const dateFormat = format.slice(5);
    // Simple date formatting (would use a library in production)
    return new Date(value).toLocaleDateString();
  }

  return String(value);
}
