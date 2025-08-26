import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { XIcon } from './icons';

interface FilterPanelProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  onClose: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  onClose,
}) => {
  const [localFilters, setLocalFilters] = useState(filters || {});

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleResetFilters = () => {
    setLocalFilters({});
    onFiltersChange({});
  };

  return (
    <div className="bg-white border-b px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Global Filters</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <XIcon className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Date Range */}
        <div>
          <label className="label">Date Range</label>
          <div className="flex space-x-2">
            <DatePicker
              selected={localFilters.startDate ? new Date(localFilters.startDate) : null}
              onChange={(date) =>
                setLocalFilters({
                  ...localFilters,
                  startDate: date?.toISOString(),
                })
              }
              placeholderText="Start date"
              className="input flex-1"
              isClearable
            />
            <DatePicker
              selected={localFilters.endDate ? new Date(localFilters.endDate) : null}
              onChange={(date) =>
                setLocalFilters({
                  ...localFilters,
                  endDate: date?.toISOString(),
                })
              }
              placeholderText="End date"
              className="input flex-1"
              isClearable
            />
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={localFilters.status || ''}
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                status: e.target.value || undefined,
              })
            }
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <label className="label">Priority</label>
          <select
            className="input"
            value={localFilters.priority || ''}
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                priority: e.target.value || undefined,
              })
            }
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Assignee Filter */}
        <div>
          <label className="label">Assignee</label>
          <input
            type="text"
            className="input"
            placeholder="Filter by assignee..."
            value={localFilters.assignee || ''}
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                assignee: e.target.value || undefined,
              })
            }
          />
        </div>

        {/* Tags Filter */}
        <div>
          <label className="label">Tags</label>
          <input
            type="text"
            className="input"
            placeholder="Comma-separated tags..."
            value={localFilters.tags || ''}
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                tags: e.target.value || undefined,
              })
            }
          />
        </div>

        {/* Value Stream Filter */}
        <div>
          <label className="label">Value Stream</label>
          <select
            className="input"
            value={localFilters.value_stream || ''}
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                value_stream: e.target.value || undefined,
              })
            }
          >
            <option value="">All Value Streams</option>
            <option value="stream1">Stream 1</option>
            <option value="stream2">Stream 2</option>
            <option value="stream3">Stream 3</option>
          </select>
        </div>

        {/* Modalities Filter */}
        <div>
          <label className="label">Modalities</label>
          <input
            type="text"
            className="input"
            placeholder="Comma-separated modalities..."
            value={localFilters.modalities || ''}
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                modalities: e.target.value || undefined,
              })
            }
          />
        </div>

        {/* Quick Date Presets */}
        <div>
          <label className="label">Quick Presets</label>
          <select
            className="input"
            onChange={(e) => {
              const preset = e.target.value;
              const now = new Date();
              let startDate: Date | null = null;
              
              switch (preset) {
                case 'today':
                  startDate = new Date(now.setHours(0, 0, 0, 0));
                  break;
                case 'yesterday':
                  startDate = new Date(now.setDate(now.getDate() - 1));
                  startDate.setHours(0, 0, 0, 0);
                  break;
                case 'last7days':
                  startDate = new Date(now.setDate(now.getDate() - 7));
                  break;
                case 'last30days':
                  startDate = new Date(now.setDate(now.getDate() - 30));
                  break;
                case 'thisMonth':
                  startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                  break;
                case 'lastMonth':
                  startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                  break;
              }

              if (startDate) {
                setLocalFilters({
                  ...localFilters,
                  startDate: startDate.toISOString(),
                  endDate: preset === 'yesterday' 
                    ? new Date(startDate.getTime() + 24 * 60 * 60 * 1000).toISOString()
                    : new Date().toISOString(),
                });
              }
            }}
          >
            <option value="">Select preset...</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7days">Last 7 days</option>
            <option value="last30days">Last 30 days</option>
            <option value="thisMonth">This month</option>
            <option value="lastMonth">Last month</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-4">
        <button onClick={handleResetFilters} className="btn btn-outline">
          Reset Filters
        </button>
        <button onClick={handleApplyFilters} className="btn btn-primary">
          Apply Filters
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;