/**
 * Portfolio Card Component
 *
 * Displays aggregated metrics across multiple projects/lists.
 * Provides high-level portfolio overview with drill-down capability.
 */

import React from 'react';
import { BaseChartProps } from '../../types/charts';

interface ProjectMetrics {
  name: string;
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
  completionRate: number;
  health: 'healthy' | 'at-risk' | 'critical';
}

export const PortfolioCard: React.FC<BaseChartProps> = ({
  data,
  config,
  theme,
  dimensions,
  onEvent,
  loading,
  error,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600">Error loading portfolio: {error.message}</div>
      </div>
    );
  }

  if (!data?.series || data.series.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No portfolio data available
      </div>
    );
  }

  // Transform data to portfolio metrics
  const projects: ProjectMetrics[] = data.series[0].data.map((item: any) => {
    const total = item.total || item.count || 0;
    const completed = item.completed || 0;
    const inProgress = item.inProgress || item.in_progress || 0;
    const blocked = item.blocked || 0;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    // Determine health
    let health: 'healthy' | 'at-risk' | 'critical' = 'healthy';
    if (blocked > total * 0.2 || completionRate < 30) {
      health = 'critical';
    } else if (blocked > total * 0.1 || completionRate < 60) {
      health = 'at-risk';
    }

    return {
      name: item.x || item.name || item.project || 'Unnamed Project',
      total,
      completed,
      inProgress,
      blocked,
      completionRate,
      health,
    };
  });

  // Calculate portfolio totals
  const portfolioTotals = {
    total: projects.reduce((sum, p) => sum + p.total, 0),
    completed: projects.reduce((sum, p) => sum + p.completed, 0),
    inProgress: projects.reduce((sum, p) => sum + p.inProgress, 0),
    blocked: projects.reduce((sum, p) => sum + p.blocked, 0),
  };

  const portfolioCompletionRate =
    portfolioTotals.total > 0 ? (portfolioTotals.completed / portfolioTotals.total) * 100 : 0;

  const healthCounts = {
    healthy: projects.filter((p) => p.health === 'healthy').length,
    atRisk: projects.filter((p) => p.health === 'at-risk').length,
    critical: projects.filter((p) => p.health === 'critical').length,
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'at-risk':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy':
        return '✓';
      case 'at-risk':
        return '⚠';
      case 'critical':
        return '✕';
      default:
        return '?';
    }
  };

  const handleProjectClick = (project: ProjectMetrics) => {
    if (onEvent && config.interactivity?.clickable) {
      onEvent({
        type: 'click',
        data: project,
      });
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-4 overflow-auto">
      {/* Title */}
      {config.title && (
        <h3
          className="mb-4 font-semibold"
          style={{
            fontSize: theme?.fonts?.title?.size || 16,
            color: theme?.fonts?.title?.color || '#111827',
            fontFamily: theme?.fonts?.title?.family,
          }}
        >
          {config.title}
        </h3>
      )}

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="text-xs text-blue-600 font-medium mb-1">Total Items</div>
          <div className="text-2xl font-bold text-blue-900">{portfolioTotals.total}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <div className="text-xs text-green-600 font-medium mb-1">Completed</div>
          <div className="text-2xl font-bold text-green-900">{portfolioTotals.completed}</div>
          <div className="text-xs text-green-600 mt-1">{portfolioCompletionRate.toFixed(0)}%</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
          <div className="text-xs text-purple-600 font-medium mb-1">In Progress</div>
          <div className="text-2xl font-bold text-purple-900">{portfolioTotals.inProgress}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
          <div className="text-xs text-red-600 font-medium mb-1">Blocked</div>
          <div className="text-2xl font-bold text-red-900">{portfolioTotals.blocked}</div>
        </div>
      </div>

      {/* Health Distribution */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <span className="text-gray-600 font-medium">Project Health:</span>
        <div className="flex items-center gap-2">
          <span className="text-green-600">✓ {healthCounts.healthy}</span>
          <span className="text-yellow-600">⚠ {healthCounts.atRisk}</span>
          <span className="text-red-600">✕ {healthCounts.critical}</span>
        </div>
      </div>

      {/* Project List */}
      <div className="flex-1 space-y-3 overflow-auto">
        {projects.map((project, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
              config.interactivity?.clickable ? 'cursor-pointer' : ''
            } ${getHealthColor(project.health)}`}
            onClick={() => handleProjectClick(project)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{project.name}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded">
                    {getHealthIcon(project.health)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{project.completionRate.toFixed(0)}%</div>
                <div className="text-xs text-gray-600">complete</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-green-500 to-green-600"
                style={{ width: `${project.completionRate}%` }}
              />
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-600">
                <span className="font-medium">{project.completed}</span> / {project.total} done
              </span>
              {project.inProgress > 0 && (
                <span className="text-purple-600">
                  {project.inProgress} in progress
                </span>
              )}
              {project.blocked > 0 && (
                <span className="text-red-600 font-medium">
                  {project.blocked} blocked
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
