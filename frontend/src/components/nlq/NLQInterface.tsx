/**
 * Natural Language Query Interface Component
 *
 * Interactive UI for querying data using natural language.
 * Features autocomplete, query history, and real-time visualization.
 *
 * Part of AI-001 implementation (Phase 5)
 */

import React, { useState, useEffect, useRef } from 'react';
import { NLQService, NLQResponse, QueryTemplates } from '../../services/nlqService';
import { WidgetRenderer } from '../dashboard/WidgetRenderer';

// ===================================================================
// COMPONENT PROPS
// ===================================================================

export interface NLQInterfaceProps {
  nlqService: NLQService;
  onQuerySuccess?: (response: NLQResponse) => void;
  onQueryError?: (error: string) => void;
  showHistory?: boolean;
  showSuggestions?: boolean;
  maxHistoryItems?: number;
}

// ===================================================================
// MAIN COMPONENT
// ===================================================================

export const NLQInterface: React.FC<NLQInterfaceProps> = ({
  nlqService,
  onQuerySuccess,
  onQueryError,
  showHistory = true,
  showSuggestions = true,
  maxHistoryItems = 5,
}) => {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<NLQResponse | null>(null);
  const [history, setHistory] = useState<NLQResponse[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Load query history on mount
   */
  useEffect(() => {
    loadHistory();
  }, []);

  /**
   * Load query history
   */
  const loadHistory = async () => {
    try {
      const historyData = await nlqService.getQueryHistory(maxHistoryItems);
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  /**
   * Handle query submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim() || isProcessing) return;

    setIsProcessing(true);
    setCurrentResponse(null);

    try {
      const response = await nlqService.processQuery({ query });

      if (response.success) {
        setCurrentResponse(response);
        setHistory([response, ...history.slice(0, maxHistoryItems - 1)]);
        setSuggestions(response.suggestions || []);
        onQuerySuccess?.(response);
      } else {
        onQueryError?.(response.error || 'Failed to process query');
      }
    } catch (error: any) {
      onQueryError?.(error.message || 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle template selection
   */
  const handleTemplateSelect = (template: string) => {
    setQuery(template);
    setShowTemplates(false);
    inputRef.current?.focus();
  };

  /**
   * Handle suggestion click
   */
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    inputRef.current?.focus();
  };

  /**
   * Handle history item click
   */
  const handleHistoryClick = (item: NLQResponse) => {
    setQuery(item.query);
    setCurrentResponse(item);
    inputRef.current?.focus();
  };

  return (
    <div className="nlq-interface flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Ask a Question
        </h2>
        <p className="text-sm text-gray-600">
          Use natural language to query your data and generate visualizations
        </p>
      </div>

      {/* Query Input */}
      <div className="p-6 border-b border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="e.g., Show sales trend over the last 30 days..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              disabled={isProcessing}
            />

            {isProcessing && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-sm text-blue-600 hover:text-blue-700 focus:outline-none"
            >
              {showTemplates ? 'Hide Templates' : 'Show Query Templates'}
            </button>

            <button
              type="submit"
              disabled={!query.trim() || isProcessing}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Ask'}
            </button>
          </div>
        </form>

        {/* Query Templates */}
        {showTemplates && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Query Templates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(QueryTemplates).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => handleTemplateSelect(template)}
                  className="text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  {template}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto p-6">
        {currentResponse && (
          <div className="space-y-6">
            {/* Interpretation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-1">
                Interpretation
              </h3>
              <p className="text-sm text-blue-700">
                {currentResponse.interpretation}
              </p>
              <div className="mt-2 flex items-center text-xs text-blue-600">
                <span>Confidence: {Math.round(currentResponse.confidence * 100)}%</span>
              </div>
            </div>

            {/* Visualization */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {currentResponse.visualization.title}
              </h3>
              <div className="h-96">
                <WidgetRenderer config={currentResponse.visualization} />
              </div>
            </div>

            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Follow-up Suggestions
                </h3>
                <div className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="block w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!currentResponse && !isProcessing && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              Start by asking a question
            </h3>
            <p className="text-sm text-gray-500 max-w-md">
              Use natural language to explore your data. Try questions like "Show sales by region" or "What's the revenue trend?"
            </p>
          </div>
        )}
      </div>

      {/* History Sidebar */}
      {showHistory && history.length > 0 && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Recent Queries
          </h3>
          <div className="space-y-2">
            {history.map((item, index) => (
              <button
                key={index}
                onClick={() => handleHistoryClick(item)}
                className="block w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors truncate"
              >
                {item.query}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ===================================================================
// COMPACT NLQ INPUT
// ===================================================================

export interface CompactNLQInputProps {
  nlqService: NLQService;
  onVisualizationGenerated: (response: NLQResponse) => void;
  placeholder?: string;
}

export const CompactNLQInput: React.FC<CompactNLQInputProps> = ({
  nlqService,
  onVisualizationGenerated,
  placeholder = 'Ask a question about your data...',
}) => {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim() || isProcessing) return;

    setIsProcessing(true);

    try {
      const response = await nlqService.processQuery({ query });

      if (response.success) {
        onVisualizationGenerated(response);
        setQuery('');
      }
    } catch (error) {
      console.error('Query failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isProcessing}
      />
      <button
        type="submit"
        disabled={!query.trim() || isProcessing}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        ) : (
          'Ask'
        )}
      </button>
    </form>
  );
};
