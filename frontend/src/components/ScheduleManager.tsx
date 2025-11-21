/**
 * Schedule Management UI
 *
 * Frontend interface for managing report schedules:
 * - List all schedules with status and next run time
 * - Create new schedules with wizard
 * - Edit existing schedules
 * - Enable/disable schedules
 * - Delete schedules
 * - View execution history
 * - Monitor schedule health
 */

import React, { useState, useEffect } from 'react';
import { ReportSchedule, ScheduleConfig, DistributionConfig, ScheduleExecution } from '../types/reports';

// ===================================================================
// MAIN SCHEDULE MANAGER COMPONENT
// ===================================================================

export const ScheduleManager: React.FC = () => {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<ReportSchedule | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/schedules');
      const data = await response.json();
      setSchedules(data);
    } catch (error) {
      console.error('Failed to load schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (scheduleId: string, enabled: boolean) => {
    try {
      await fetch(`/api/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      await loadSchedules();
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      await fetch(`/api/schedules/${scheduleId}`, { method: 'DELETE' });
      await loadSchedules();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    }
  };

  const handleExecuteNow = async (scheduleId: string) => {
    try {
      await fetch(`/api/schedules/${scheduleId}/execute`, { method: 'POST' });
      alert('Schedule execution started');
    } catch (error) {
      console.error('Failed to execute schedule:', error);
    }
  };

  const filteredSchedules = schedules.filter((s) => {
    if (filter === 'enabled') return s.enabled;
    if (filter === 'disabled') return !s.enabled;
    return true;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Report Schedules</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage automated report generation and distribution
            </p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            <span>New Schedule</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(['all', 'enabled', 'disabled'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && (
                <span className="ml-2 text-xs">
                  ({schedules.filter((s) => (f === 'enabled' ? s.enabled : !s.enabled)).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule List */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading schedules...</div>
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p>No schedules found</p>
            <button
              onClick={() => setShowWizard(true)}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first schedule
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSchedules.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                onToggleEnabled={handleToggleEnabled}
                onDelete={handleDeleteSchedule}
                onExecuteNow={handleExecuteNow}
                onEdit={() => setSelectedSchedule(schedule)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Wizard Modal */}
      {showWizard && (
        <ScheduleWizard
          onClose={() => setShowWizard(false)}
          onComplete={() => {
            setShowWizard(false);
            loadSchedules();
          }}
        />
      )}

      {/* Edit Modal */}
      {selectedSchedule && (
        <ScheduleEditDialog
          schedule={selectedSchedule}
          onClose={() => setSelectedSchedule(null)}
          onSave={() => {
            setSelectedSchedule(null);
            loadSchedules();
          }}
        />
      )}
    </div>
  );
};

// ===================================================================
// SCHEDULE CARD COMPONENT
// ===================================================================

interface ScheduleCardProps {
  schedule: ReportSchedule;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onExecuteNow: (id: string) => void;
  onEdit: () => void;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({
  schedule,
  onToggleEnabled,
  onDelete,
  onExecuteNow,
  onEdit,
}) => {
  const getScheduleDescription = (config: ScheduleConfig): string => {
    if (config.type === 'cron') {
      return `Cron: ${config.cron}`;
    } else if (config.type === 'interval') {
      return `Every ${config.interval} minutes`;
    } else if (config.type === 'event') {
      return `Event: ${config.eventTrigger}`;
    }
    return 'Unknown schedule';
  };

  const getDistributionSummary = (distribution: DistributionConfig[]): string => {
    const enabled = distribution.filter((d) => d.enabled);
    if (enabled.length === 0) return 'No distribution';
    if (enabled.length === 1) return enabled[0].type;
    return `${enabled.length} channels`;
  };

  const formatNextRun = (date?: Date): string => {
    if (!date) return 'Not scheduled';
    const now = new Date();
    const diff = new Date(date).getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      return `in ${Math.floor(hours / 24)} days`;
    } else if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `in ${minutes}m`;
    } else {
      return 'soon';
    }
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border ${
        schedule.enabled
          ? 'border-gray-200 dark:border-gray-700'
          : 'border-gray-300 dark:border-gray-600 opacity-60'
      } p-4 hover:shadow-lg transition-shadow`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{schedule.name}</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">{getScheduleDescription(schedule.schedule)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleEnabled(schedule.id, !schedule.enabled)}
            className={`w-12 h-6 rounded-full transition-colors ${
              schedule.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
            title={schedule.enabled ? 'Disable' : 'Enable'}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                schedule.enabled ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
          <div className="text-xs text-gray-600 dark:text-gray-400">Next Run</div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{formatNextRun(schedule.nextRun)}</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
          <div className="text-xs text-gray-600 dark:text-gray-400">Executions</div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{schedule.runCount || 0}</div>
        </div>
      </div>

      {/* Distribution */}
      <div className="mb-3">
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Distribution</div>
        <div className="flex flex-wrap gap-1">
          {schedule.distribution.filter((d) => d.enabled).map((dist, idx) => (
            <span
              key={idx}
              className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded"
            >
              {dist.type}
            </span>
          ))}
          {schedule.distribution.filter((d) => d.enabled).length === 0 && (
            <span className="text-xs text-gray-500">None configured</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onExecuteNow(schedule.id)}
          disabled={!schedule.enabled}
          className="flex-1 px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Run Now
        </button>
        <button
          onClick={() => onDelete(schedule.id)}
          className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded transition-colors"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

// ===================================================================
// SCHEDULE WIZARD (Placeholder)
// ===================================================================

interface ScheduleWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

const ScheduleWizard: React.FC<ScheduleWizardProps> = ({ onClose, onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    reportId: '',
    scheduleType: 'cron' as 'cron' | 'interval',
    cron: '0 9 * * *', // 9 AM daily
    interval: 60,
    timezone: 'UTC',
    distribution: [] as any[],
  });

  const handleSubmit = async () => {
    try {
      await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          reportId: formData.reportId,
          enabled: true,
          schedule: {
            type: formData.scheduleType,
            cron: formData.scheduleType === 'cron' ? formData.cron : undefined,
            interval: formData.scheduleType === 'interval' ? formData.interval : undefined,
            timezone: formData.timezone,
          },
          distribution: formData.distribution,
        }),
      });
      onComplete();
    } catch (error) {
      console.error('Failed to create schedule:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Create Schedule</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded ${
                  s <= step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Basic Information</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Schedule Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Daily Sales Report"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Report
                </label>
                <select
                  value={formData.reportId}
                  onChange={(e) => setFormData({ ...formData, reportId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  <option value="">Select a report...</option>
                  {/* TODO: Load reports dynamically */}
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Schedule Configuration</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Schedule Type
                </label>
                <select
                  value={formData.scheduleType}
                  onChange={(e) => setFormData({ ...formData, scheduleType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  <option value="cron">Cron Expression</option>
                  <option value="interval">Fixed Interval</option>
                </select>
              </div>

              {formData.scheduleType === 'cron' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cron Expression
                  </label>
                  <input
                    type="text"
                    value={formData.cron}
                    onChange={(e) => setFormData({ ...formData, cron: e.target.value })}
                    placeholder="0 9 * * *"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">Examples: 0 9 * * * (9 AM daily), 0 */6 * * * (every 6 hours)</p>
                </div>
              )}

              {formData.scheduleType === 'interval' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Interval (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.interval}
                    onChange={(e) => setFormData({ ...formData, interval: parseInt(e.target.value) })}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Distribution</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure how and where reports will be delivered
              </p>
              {/* TODO: Add distribution configuration UI */}
              <div className="text-center text-gray-500 py-8">
                Distribution configuration coming soon
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={() => (step < 3 ? setStep(step + 1) : handleSubmit())}
            disabled={step === 1 && (!formData.name || !formData.reportId)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === 3 ? 'Create Schedule' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ===================================================================
// SCHEDULE EDIT DIALOG (Placeholder)
// ===================================================================

interface ScheduleEditDialogProps {
  schedule: ReportSchedule;
  onClose: () => void;
  onSave: () => void;
}

const ScheduleEditDialog: React.FC<ScheduleEditDialogProps> = ({ schedule, onClose, onSave }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold">Edit Schedule: {schedule.name}</h2>
        </div>
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-400">Edit functionality coming soon...</p>
        </div>
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
