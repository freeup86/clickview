/**
 * Timeline Chart Component
 *
 * Chronological visualization of events and milestones.
 * Ideal for project history, company milestones, and event sequences.
 */

import React, { useMemo } from 'react';
import { BaseChartProps } from '../../types/charts';

interface TimelineEvent {
  id: string;
  date: Date;
  title: string;
  description?: string;
  category?: string;
  icon?: string;
  color?: string;
}

const DEFAULT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
];

export const TimelineChart: React.FC<BaseChartProps> = ({
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
        <div className="text-red-600">Error loading chart: {error.message}</div>
      </div>
    );
  }

  if (!data?.series || data.series.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No data available
      </div>
    );
  }

  // Transform data to timeline events
  const events: TimelineEvent[] = useMemo(() => {
    return data.series.flatMap((series, seriesIndex) =>
      series.data.map((point, index) => ({
        id: point.id || `event-${seriesIndex}-${index}`,
        date: new Date(point.date || point.x),
        title: point.title || point.name || series.name,
        description: point.description || point.y,
        category: point.category || series.name,
        icon: point.icon,
        color: point.color || series.color,
      }))
    ).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [data]);

  const colors = config.colors?.palette || theme?.colors.primary || DEFAULT_COLORS;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const orientation = config.orientation || 'vertical';

  if (orientation === 'horizontal') {
    // Horizontal timeline
    return (
      <div className="w-full h-full overflow-x-auto p-8">
        {config.title && (
          <h3
            className="text-center mb-8 font-semibold"
            style={{
              fontSize: theme?.fonts.title.size || 16,
              color: theme?.fonts.title.color || '#111827',
              fontFamily: theme?.fonts.title.family,
            }}
          >
            {config.title}
          </h3>
        )}

        <div className="relative flex items-start space-x-16 min-w-max pb-8">
          {/* Timeline line */}
          <div
            className="absolute top-12 left-0 right-0 h-1"
            style={{ backgroundColor: theme?.colors.gridLines || '#d1d5db' }}
          />

          {events.map((event, index) => {
            const color = event.color || colors[index % colors.length];

            return (
              <div
                key={event.id}
                className="relative flex flex-col items-center"
                style={{ minWidth: '200px' }}
                onClick={() => {
                  if (config.interactivity?.clickable && onEvent) {
                    onEvent({ type: 'click', data: event });
                  }
                }}
              >
                {/* Date */}
                <div
                  className="text-center mb-4"
                  style={{
                    fontSize: theme?.fonts.axis.size || 11,
                    color: theme?.fonts.axis.color || '#6b7280',
                    fontFamily: theme?.fonts.axis.family,
                  }}
                >
                  {formatDate(event.date)}
                </div>

                {/* Marker */}
                <div
                  className="w-6 h-6 rounded-full border-4 bg-white z-10 cursor-pointer hover:scale-110 transition-transform"
                  style={{
                    borderColor: color,
                  }}
                />

                {/* Event card */}
                <div
                  className="mt-4 p-4 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                  style={{
                    backgroundColor: theme?.colors.background || 'white',
                    border: `2px solid ${color}`,
                    borderRadius: theme?.borderRadius || 8,
                  }}
                >
                  <h4
                    className="font-semibold mb-2"
                    style={{
                      fontSize: theme?.fonts.axis.size || 13,
                      color: theme?.fonts.title.color || '#111827',
                      fontFamily: theme?.fonts.axis.family,
                    }}
                  >
                    {event.title}
                  </h4>
                  {event.description && (
                    <p
                      className="text-sm"
                      style={{
                        color: theme?.fonts.axis.color || '#6b7280',
                        fontFamily: theme?.fonts.axis.family,
                      }}
                    >
                      {event.description}
                    </p>
                  )}
                  {event.category && (
                    <div
                      className="mt-2 inline-block px-2 py-1 rounded text-xs"
                      style={{
                        backgroundColor: color,
                        color: 'white',
                      }}
                    >
                      {event.category}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Vertical timeline (default)
  return (
    <div className="w-full h-full overflow-y-auto p-8">
      {config.title && (
        <h3
          className="text-center mb-8 font-semibold"
          style={{
            fontSize: theme?.fonts.title.size || 16,
            color: theme?.fonts.title.color || '#111827',
            fontFamily: theme?.fonts.title.family,
          }}
        >
          {config.title}
        </h3>
      )}

      <div className="relative max-w-3xl mx-auto">
        {/* Timeline line */}
        <div
          className="absolute left-1/2 top-0 bottom-0 w-1 transform -translate-x-1/2"
          style={{ backgroundColor: theme?.colors.gridLines || '#d1d5db' }}
        />

        {events.map((event, index) => {
          const color = event.color || colors[index % colors.length];
          const isLeft = index % 2 === 0;

          return (
            <div
              key={event.id}
              className={`relative flex items-center mb-8 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
              onClick={() => {
                if (config.interactivity?.clickable && onEvent) {
                  onEvent({ type: 'click', data: event });
                }
              }}
            >
              {/* Event card */}
              <div className="w-5/12">
                <div
                  className="p-4 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                  style={{
                    backgroundColor: theme?.colors.background || 'white',
                    border: `2px solid ${color}`,
                    borderRadius: theme?.borderRadius || 8,
                  }}
                >
                  <div
                    className="text-sm mb-2"
                    style={{
                      fontSize: theme?.fonts.axis.size || 11,
                      color: theme?.fonts.axis.color || '#6b7280',
                      fontFamily: theme?.fonts.axis.family,
                    }}
                  >
                    {formatDate(event.date)}
                  </div>
                  <h4
                    className="font-semibold mb-2"
                    style={{
                      fontSize: theme?.fonts.axis.size || 13,
                      color: theme?.fonts.title.color || '#111827',
                      fontFamily: theme?.fonts.axis.family,
                    }}
                  >
                    {event.title}
                  </h4>
                  {event.description && (
                    <p
                      className="text-sm"
                      style={{
                        color: theme?.fonts.axis.color || '#6b7280',
                        fontFamily: theme?.fonts.axis.family,
                      }}
                    >
                      {event.description}
                    </p>
                  )}
                  {event.category && (
                    <div
                      className="mt-2 inline-block px-2 py-1 rounded text-xs"
                      style={{
                        backgroundColor: color,
                        color: 'white',
                      }}
                    >
                      {event.category}
                    </div>
                  )}
                </div>
              </div>

              {/* Marker */}
              <div className="w-2/12 flex justify-center">
                <div
                  className="w-6 h-6 rounded-full border-4 bg-white z-10 cursor-pointer hover:scale-110 transition-transform"
                  style={{
                    borderColor: color,
                  }}
                />
              </div>

              {/* Spacer */}
              <div className="w-5/12" />
            </div>
          );
        })}
      </div>
    </div>
  );
};
