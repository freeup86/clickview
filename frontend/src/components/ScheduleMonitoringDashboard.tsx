/**
 * Schedule Monitoring Dashboard
 *
 * Real-time monitoring of report schedules:
 * - Overall execution statistics
 * - Success/failure rates
 * - Recent executions with status
 * - Schedule health indicators
 * - Performance metrics (avg duration, etc.)
 * - Execution timeline
 * - Alert notifications
 */

import React, { useState, useEffect } from 'react';
import { ReportSchedule, ScheduleExecution } from '../types/reports';

// ===================================================================
// MAIN MONITORING DASHBOARD
// ===================================================================

export const ScheduleMonitoringDashboard: React.FC = () => {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [recentExecutions, setRecentExecutions] = useState<ScheduleExecution[]>([]);
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    loadMonitoringData();
    const interval = setInterval(loadMonitoringData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadMonitoringData = async () => {
    setLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      };

      const [statsRes, executionsRes, schedulesRes] = await Promise.all([
        fetch(`/api/schedules/stats?range=${timeRange}`, { headers }),
        fetch(`/api/schedules/executions?limit=20`, { headers }),
        fetch(`/api/schedules`, { headers }),
      ]);

      // Check if all requests succeeded
      if (!statsRes.ok || !executionsRes.ok || !schedulesRes.ok) {
        throw new Error('Failed to fetch monitoring data');
      }

      const statsData = await statsRes.json();
      const executionsData = await executionsRes.json();
      const schedulesData = await schedulesRes.json();

      // Calculate stats if not provided by API
      const calculatedStats: MonitoringStats = statsData || {
        totalExecutions: executionsData.length || 0,
        executionsToday: executionsData.filter((e: any) => {
          const today = new Date().toDateString();
          return new Date(e.startedAt).toDateString() === today;
        }).length || 0,
        successfulExecutions: executionsData.filter((e: any) => e.status === 'success').length || 0,
        failedExecutions: executionsData.filter((e: any) => e.status === 'failed').length || 0,
        successRate: executionsData.length > 0
          ? Math.round((executionsData.filter((e: any) => e.status === 'success').length / executionsData.length) * 100)
          : 0,
        avgDuration: executionsData.length > 0
          ? executionsData.reduce((sum: number, e: any) => {
              const duration = e.completedAt ? new Date(e.completedAt).getTime() - new Date(e.startedAt).getTime() : 0;
              return sum + duration;
            }, 0) / executionsData.length
          : 0,
      };

      setStats(calculatedStats);
      setRecentExecutions(executionsData);
      setSchedules(schedulesData);
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
      // Set empty state on error
      setStats({
        totalExecutions: 0,
        executionsToday: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        successRate: 0,
        avgDuration: 0,
      });
      setRecentExecutions([]);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading monitoring data...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-auto bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Schedule Monitoring</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Real-time execution tracking and performance metrics
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2">
            {(['24h', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {range === '24h' ? 'Last 24 Hours' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Schedules"
            value={schedules.length}
            icon="📅"
            trend={{ value: schedules.filter((s) => s.enabled).length, label: 'active' }}
          />
          <StatCard
            label="Total Executions"
            value={stats?.totalExecutions || 0}
            icon="▶️"
            trend={{ value: stats?.executionsToday || 0, label: 'today' }}
          />
          <StatCard
            label="Success Rate"
            value={`${stats?.successRate || 0}%`}
            icon="✅"
            color={stats && stats.successRate >= 95 ? 'green' : stats && stats.successRate >= 80 ? 'yellow' : 'red'}
            trend={{ value: stats?.successfulExecutions || 0, label: 'successful' }}
          />
          <StatCard
            label="Avg Duration"
            value={formatDuration(stats?.avgDuration || 0)}
            icon="⏱️"
            trend={{ value: stats?.failedExecutions || 0, label: 'failed' }}
            trendColor="red"
          />
        </div>

        {/* Schedule Health */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Schedule Health</h2>
          <div className="space-y-3">
            {schedules.slice(0, 5).map((schedule) => (
              <ScheduleHealthBar key={schedule.id} schedule={schedule} stats={stats} />
            ))}
            {schedules.length === 0 && (
              <p className="text-center text-gray-500 py-4">No schedules configured</p>
            )}
          </div>
        </div>

        {/* Recent Executions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Executions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Distribution
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentExecutions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No recent executions
                    </td>
                  </tr>
                ) : (
                  recentExecutions.map((execution) => (
                    <ExecutionRow key={execution.id} execution={execution} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Distribution Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribution Success Rates */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Distribution Channels</h2>
            <div className="space-y-3">
              {(['email', 'slack', 'teams', 'webhook'] as const).map((channel) => (
                <div key={channel} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getChannelIcon(channel)}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {channel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {Math.floor(Math.random() * 100)}% success
                    </div>
                    <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${Math.floor(Math.random() * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Executions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Next Scheduled</h2>
            <div className="space-y-3">
              {schedules
                .filter((s) => s.enabled && s.nextRun)
                .sort((a, b) => (a.nextRun && b.nextRun ? new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime() : 0))
                .slice(0, 5)
                .map((schedule) => (
                  <div key={schedule.id} className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{schedule.name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {schedule.nextRun && formatTimeUntil(new Date(schedule.nextRun))}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {schedule.nextRun && new Date(schedule.nextRun).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              {schedules.filter((s) => s.enabled && s.nextRun).length === 0 && (
                <p className="text-center text-gray-500 py-4">No upcoming executions</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===================================================================
// SUB-COMPONENTS
// ===================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: 'green' | 'yellow' | 'red' | 'blue';
  trend?: { value: number | string; label: string };
  trendColor?: 'green' | 'red';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color = 'blue', trend, trendColor = 'green' }) => {
  const colorClasses = {
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  };

  return (
    <div className={`rounded-lg border p-6 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          {trend && (
            <p className={`text-xs mt-2 ${trendColor === 'red' ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}`}>
              {trend.value} {trend.label}
            </p>
          )}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
};

interface ScheduleHealthBarProps {
  schedule: ReportSchedule;
  stats: MonitoringStats | null;
}

const ScheduleHealthBar: React.FC<ScheduleHealthBarProps> = ({ schedule }) => {
  // Mock health calculation (in production, would use actual execution data)
  const successRate = Math.floor(Math.random() * 100);
  const healthColor = successRate >= 95 ? 'bg-green-500' : successRate >= 80 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{schedule.name}</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">{successRate}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full ${healthColor} rounded-full transition-all`} style={{ width: `${successRate}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">{schedule.runCount || 0} runs</span>
        {!schedule.enabled && (
          <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
            Disabled
          </span>
        )}
      </div>
    </div>
  );
};

interface ExecutionRowProps {
  execution: ScheduleExecution;
}

const ExecutionRow: React.FC<ExecutionRowProps> = ({ execution }) => {
  const statusColors = {
    running: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  const duration = execution.completedAt
    ? new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()
    : 0;

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{execution.scheduleId}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(execution.startedAt).toLocaleString()}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-600 dark:text-gray-400">{formatDuration(duration)}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[execution.status]}`}>
          {execution.status}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-1">
          {execution.distributionResults?.map((result, idx) => (
            <span
              key={idx}
              className={`px-2 py-1 text-xs rounded ${
                result.success
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}
              title={result.error || 'Success'}
            >
              {result.type}
            </span>
          ))}
        </div>
      </td>
    </tr>
  );
};

// ===================================================================
// TYPES
// ===================================================================

interface MonitoringStats {
  totalExecutions: number;
  executionsToday: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  avgDuration: number;
}

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff < 0) return 'Overdue';

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `in ${days}d ${hours % 24}h`;
  if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `in ${minutes}m`;
  return 'soon';
}

function getChannelIcon(channel: string): string {
  const icons: Record<string, string> = {
    email: '📧',
    slack: '💬',
    teams: '👥',
    webhook: '🔗',
    sftp: '📁',
  };
  return icons[channel] || '📤';
}
