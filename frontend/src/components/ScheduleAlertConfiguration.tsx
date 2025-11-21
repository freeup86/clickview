/**
 * Schedule Alert Configuration
 *
 * Configure alerts for schedule failures and delays:
 * - Alert triggers (failure, success, delayed, threshold)
 * - Notification channels (email, slack, teams)
 * - Alert conditions and thresholds
 * - Alert history and management
 * - Test alert functionality
 */

import React, { useState, useEffect } from 'react';

// ===================================================================
// MAIN ALERT CONFIGURATION COMPONENT
// ===================================================================

interface ScheduleAlertConfigurationProps {
  scheduleId: string;
  scheduleName: string;
  onClose: () => void;
}

export const ScheduleAlertConfiguration: React.FC<ScheduleAlertConfigurationProps> = ({
  scheduleId,
  scheduleName,
  onClose,
}) => {
  const [alerts, setAlerts] = useState<ScheduleAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, [scheduleId]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/schedules/${scheduleId}/alerts`);
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAlert = async (alertId: string, enabled: boolean) => {
    try {
      await fetch(`/api/schedules/${scheduleId}/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      await loadAlerts();
    } catch (error) {
      console.error('Failed to toggle alert:', error);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;

    try {
      await fetch(`/api/schedules/${scheduleId}/alerts/${alertId}`, {
        method: 'DELETE',
      });
      await loadAlerts();
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  const handleTestAlert = async (alertId: string) => {
    try {
      await fetch(`/api/schedules/${scheduleId}/alerts/${alertId}/test`, {
        method: 'POST',
      });
      alert('Test alert sent successfully!');
    } catch (error) {
      console.error('Failed to send test alert:', error);
      alert('Failed to send test alert');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Alert Configuration</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{scheduleName}</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading alerts...</div>
            </div>
          ) : (
            <>
              {/* Existing Alerts */}
              {alerts.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {alerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onToggle={handleToggleAlert}
                      onDelete={handleDeleteAlert}
                      onTest={handleTestAlert}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">No alerts configured</p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Create Your First Alert
                  </button>
                </div>
              )}

              {/* Add Alert Button */}
              {alerts.length > 0 && !showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  + Add New Alert
                </button>
              )}

              {/* Add Alert Form */}
              {showAddForm && (
                <AddAlertForm
                  scheduleId={scheduleId}
                  onSave={() => {
                    setShowAddForm(false);
                    loadAlerts();
                  }}
                  onCancel={() => setShowAddForm(false)}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// ===================================================================
// ALERT CARD COMPONENT
// ===================================================================

interface AlertCardProps {
  alert: ScheduleAlert;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, onToggle, onDelete, onTest }) => {
  const getAlertTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      failure: 'Execution Failure',
      success: 'Execution Success',
      delayed: 'Execution Delayed',
      threshold: 'Threshold Breach',
    };
    return labels[type] || type;
  };

  const getAlertTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      failure: '❌',
      success: '✅',
      delayed: '⏰',
      threshold: '📊',
    };
    return icons[type] || '🔔';
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl">{getAlertTypeIcon(alert.alertType)}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{getAlertTypeLabel(alert.alertType)}</h3>
              {!alert.enabled && (
                <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                  Disabled
                </span>
              )}
            </div>

            {/* Conditions */}
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              {alert.consecutiveFailures && (
                <div>• Alert after {alert.consecutiveFailures} consecutive failures</div>
              )}
              {alert.delayMinutes && <div>• Alert if delayed by {alert.delayMinutes} minutes</div>}
              {alert.thresholdConfig && <div>• Custom threshold conditions configured</div>}
            </div>

            {/* Notification Channels */}
            <div className="mt-2 flex flex-wrap gap-2">
              {alert.notificationChannels.map((channel, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded"
                >
                  {channel.type}
                  {channel.type === 'email' && channel.config.to && ` → ${channel.config.to.length} recipients`}
                </span>
              ))}
            </div>

            {/* Stats */}
            {alert.triggerCount !== undefined && alert.triggerCount > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                Triggered {alert.triggerCount} time{alert.triggerCount !== 1 ? 's' : ''}
                {alert.lastTriggeredAt && (
                  <span> • Last: {new Date(alert.lastTriggeredAt).toLocaleString()}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={() => onToggle(alert.id, !alert.enabled)}
          className={`w-12 h-6 rounded-full transition-colors ${
            alert.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
          title={alert.enabled ? 'Disable' : 'Enable'}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
              alert.enabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => onTest(alert.id)}
          className="flex-1 px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded transition-colors"
        >
          Test Alert
        </button>
        <button
          onClick={() => onDelete(alert.id)}
          className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

// ===================================================================
// ADD ALERT FORM
// ===================================================================

interface AddAlertFormProps {
  scheduleId: string;
  onSave: () => void;
  onCancel: () => void;
}

const AddAlertForm: React.FC<AddAlertFormProps> = ({ scheduleId, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<ScheduleAlert>>({
    alertType: 'failure',
    enabled: true,
    consecutiveFailures: 3,
    delayMinutes: 30,
    notificationChannels: [
      {
        type: 'email',
        config: { to: [], subject: 'Schedule Alert', body: '' },
      },
    ],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await fetch(`/api/schedules/${scheduleId}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      onSave();
    } catch (error) {
      console.error('Failed to create alert:', error);
      alert('Failed to create alert');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Create New Alert</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Alert Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Alert Type</label>
          <select
            value={formData.alertType}
            onChange={(e) => setFormData({ ...formData, alertType: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
          >
            <option value="failure">Execution Failure</option>
            <option value="success">Execution Success</option>
            <option value="delayed">Execution Delayed</option>
            <option value="threshold">Threshold Breach</option>
          </select>
        </div>

        {/* Conditions */}
        {formData.alertType === 'failure' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Consecutive Failures
            </label>
            <input
              type="number"
              value={formData.consecutiveFailures}
              onChange={(e) => setFormData({ ...formData, consecutiveFailures: parseInt(e.target.value) })}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
            />
            <p className="text-xs text-gray-500 mt-1">Alert after N consecutive failures</p>
          </div>
        )}

        {formData.alertType === 'delayed' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Delay (minutes)</label>
            <input
              type="number"
              value={formData.delayMinutes}
              onChange={(e) => setFormData({ ...formData, delayMinutes: parseInt(e.target.value) })}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
            />
            <p className="text-xs text-gray-500 mt-1">Alert if execution is delayed by N minutes</p>
          </div>
        )}

        {/* Notification Channel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Notification Channel
          </label>
          <select
            value={formData.notificationChannels?.[0]?.type || 'email'}
            onChange={(e) =>
              setFormData({
                ...formData,
                notificationChannels: [
                  {
                    type: e.target.value as any,
                    config: e.target.value === 'email' ? { to: [], subject: '', body: '' } : {},
                  },
                ],
              })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
          >
            <option value="email">Email</option>
            <option value="slack">Slack</option>
            <option value="teams">Microsoft Teams</option>
          </select>
        </div>

        {/* Email Recipients */}
        {formData.notificationChannels?.[0]?.type === 'email' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Recipients (comma-separated)
            </label>
            <input
              type="text"
              placeholder="email1@example.com, email2@example.com"
              onChange={(e) => {
                const emails = e.target.value.split(',').map((s) => s.trim());
                setFormData({
                  ...formData,
                  notificationChannels: [
                    {
                      type: 'email',
                      config: {
                        ...formData.notificationChannels![0].config,
                        to: emails,
                      },
                    },
                  ],
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Create Alert
          </button>
        </div>
      </form>
    </div>
  );
};

// ===================================================================
// TYPES
// ===================================================================

interface ScheduleAlert {
  id: string;
  scheduleId: string;
  alertType: 'failure' | 'success' | 'delayed' | 'threshold';
  enabled: boolean;
  consecutiveFailures?: number;
  delayMinutes?: number;
  thresholdConfig?: any;
  notificationChannels: Array<{
    type: 'email' | 'slack' | 'teams';
    config: any;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
  lastTriggeredAt?: Date;
  triggerCount?: number;
}
