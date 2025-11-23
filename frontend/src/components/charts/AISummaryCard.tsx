/**
 * AI Summary Card Component
 *
 * Displays AI-generated insights, summaries, and recommendations
 * based on project/task data.
 */

import React, { useState, useEffect } from 'react';
import { BaseChartProps } from '../../types/charts';

interface AISummary {
  summary: string;
  insights: string[];
  recommendations: string[];
  metrics?: {
    label: string;
    value: string;
    trend?: 'up' | 'down' | 'stable';
  }[];
  lastUpdated?: string;
}

export const AISummaryCard: React.FC<BaseChartProps> = ({
  data,
  config,
  theme,
  dimensions,
  onEvent,
  loading,
  error,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<AISummary | null>(null);

  useEffect(() => {
    // Load summary from data
    if (data?.metadata?.aiSummary) {
      setSummary(data.metadata.aiSummary);
    } else if (data?.series?.[0]?.data?.[0]) {
      // Generate mock summary for demo purposes
      const item = data.series[0].data[0];
      setSummary({
        summary: item.summary || 'AI-generated summary will appear here.',
        insights: item.insights || [],
        recommendations: item.recommendations || [],
        metrics: item.metrics || [],
        lastUpdated: item.lastUpdated || new Date().toISOString(),
      });
    }
  }, [data]);

  const handleRegenerate = async () => {
    setIsGenerating(true);

    // Simulate AI generation (in real implementation, call AI service)
    setTimeout(() => {
      setSummary({
        summary: 'Updated AI-generated summary based on the latest data.',
        insights: [
          'Team velocity has increased by 15% over the last sprint',
          'Three high-priority tasks are at risk of missing deadlines',
          'Code review cycle time has decreased by 2 days',
        ],
        recommendations: [
          'Consider reallocating resources to high-priority tasks',
          'Schedule a sync meeting to address blockers',
          'Continue optimizing code review process',
        ],
        metrics: [
          { label: 'Velocity', value: '+15%', trend: 'up' },
          { label: 'Cycle Time', value: '-2 days', trend: 'down' },
          { label: 'At Risk', value: '3 tasks', trend: 'stable' },
        ],
        lastUpdated: new Date().toISOString(),
      });
      setIsGenerating(false);
    }, 2000);
  };

  if (loading || isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4" />
        <p className="text-sm text-gray-600">
          {isGenerating ? 'Generating AI insights...' : 'Loading...'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600">Error: {error.message}</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
        <svg
          className="w-16 h-16 mb-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <p className="text-sm">No AI summary available</p>
        <button
          onClick={handleRegenerate}
          className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          Generate Summary
        </button>
      </div>
    );
  }

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return '↗';
      case 'down':
        return '↘';
      case 'stable':
        return '→';
      default:
        return '';
    }
  };

  const getTrendColor = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {config.title && (
            <h3
              className="font-semibold mb-1"
              style={{
                fontSize: theme?.fonts?.title?.size || 16,
                color: theme?.fonts?.title?.color || '#111827',
                fontFamily: theme?.fonts?.title?.family,
              }}
            >
              {config.title}
            </h3>
          )}
          {summary.lastUpdated && (
            <p className="text-xs text-gray-500">
              Last updated: {new Date(summary.lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
        <button
          onClick={handleRegenerate}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Regenerate summary"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Key Metrics */}
      {summary.metrics && summary.metrics.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {summary.metrics.map((metric, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">{metric.label}</div>
              <div className={`text-lg font-bold ${getTrendColor(metric.trend)}`}>
                {metric.value} {getTrendIcon(metric.trend)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <h4 className="font-semibold text-gray-900">Summary</h4>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed bg-purple-50 p-4 rounded-lg border border-purple-100">
          {summary.summary}
        </p>
      </div>

      {/* Key Insights */}
      {summary.insights && summary.insights.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <h4 className="font-semibold text-gray-900">Key Insights</h4>
          </div>
          <ul className="space-y-2">
            {summary.insights.map((insight, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {summary.recommendations && summary.recommendations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h4 className="font-semibold text-gray-900">Recommendations</h4>
          </div>
          <ul className="space-y-2">
            {summary.recommendations.map((rec, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-gray-700 bg-green-50 p-3 rounded-lg border border-green-100"
              >
                <span className="text-green-600 font-bold mt-0.5">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-6 pt-4 border-t text-xs text-gray-500 italic">
        AI-generated content. Please verify important information before taking action.
      </div>
    </div>
  );
};
