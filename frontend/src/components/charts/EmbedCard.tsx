/**
 * Embed Card Component
 *
 * Allows embedding external content via iframe (Google Sheets, Figma, etc.)
 * or custom HTML/widgets.
 */

import React, { useState } from 'react';
import { BaseChartProps } from '../../types/charts';

export const EmbedCard: React.FC<BaseChartProps> = ({
  data,
  config,
  theme,
  dimensions,
  onEvent,
  loading,
  error,
}) => {
  const [iframeError, setIframeError] = useState(false);

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
        <div className="text-red-600">Error loading embed: {error.message}</div>
      </div>
    );
  }

  // Get embed configuration
  const embedUrl = config.embedUrl || data?.metadata?.embedUrl;
  const embedType = config.embedType || 'iframe'; // 'iframe', 'html', 'script'
  const embedContent = config.embedContent || data?.metadata?.embedContent;
  const allowFullscreen = config.allowFullscreen !== false;
  const sandbox = config.sandbox || 'allow-scripts allow-same-origin allow-forms allow-popups';

  if (!embedUrl && !embedContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
        <svg className="w-16 h-16 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-sm">No embed content configured</p>
        <p className="text-xs text-gray-400 mt-1">Add an embedUrl or embedContent to display external content</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Title */}
      {config.title && (
        <div className="px-4 py-3 border-b">
          <h3
            className="font-semibold"
            style={{
              fontSize: theme?.fonts?.title?.size || 16,
              color: theme?.fonts?.title?.color || '#111827',
              fontFamily: theme?.fonts?.title?.family,
            }}
          >
            {config.title}
          </h3>
          {config.subtitle && (
            <p
              className="text-sm mt-1"
              style={{
                color: theme?.fonts?.axis?.color || '#6b7280',
                fontFamily: theme?.fonts?.axis?.family,
              }}
            >
              {config.subtitle}
            </p>
          )}
        </div>
      )}

      {/* Embed content */}
      <div className="flex-1 relative overflow-hidden">
        {embedType === 'iframe' && embedUrl && (
          <>
            {iframeError ? (
              <div className="flex flex-col items-center justify-center h-full p-4">
                <svg className="w-12 h-12 text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-red-600">Failed to load embedded content</p>
                <p className="text-xs text-gray-500 mt-1">{embedUrl}</p>
                <button
                  onClick={() => setIframeError(false)}
                  className="mt-3 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            ) : (
              <iframe
                src={embedUrl}
                className="w-full h-full border-0"
                allowFullScreen={allowFullscreen}
                sandbox={sandbox}
                onError={() => setIframeError(true)}
                title={config.title || 'Embedded Content'}
              />
            )}
          </>
        )}

        {embedType === 'html' && embedContent && (
          <div
            className="w-full h-full overflow-auto p-4"
            dangerouslySetInnerHTML={{ __html: embedContent }}
          />
        )}

        {embedType === 'script' && embedContent && (
          <div className="w-full h-full overflow-auto p-4">
            <div id={`embed-container-${config.id}`} />
            <script>{embedContent}</script>
          </div>
        )}
      </div>

      {/* External link */}
      {embedUrl && config.showExternalLink !== false && (
        <div className="px-4 py-2 border-t bg-gray-50">
          <a
            href={embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Open in new tab</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
};
