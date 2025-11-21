/**
 * Natural Language Query Component
 *
 * Chat-like interface for querying data with natural language:
 * - Text input for natural language queries
 * - Conversation history display
 * - Automatic visualization generation
 * - Query suggestions
 * - SQL preview (optional)
 * - Export results
 */

import React, { useState, useRef, useEffect } from 'react';
import { getChartComponent } from './charts';
import { ChartType } from '../types/charts';

// ===================================================================
// MAIN NLQ COMPONENT
// ===================================================================

export const NaturalLanguageQuery: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSQL, setShowSQL] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSuggestions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadSuggestions = async () => {
    try {
      const response = await fetch('/api/nlq/suggestions');
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const handleSubmit = async (query: string) => {
    if (!query.trim() || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      type: 'user',
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call NLQ API
      const response = await fetch('/api/nlq/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const result = await response.json();

      // Add assistant response
      const assistantMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        type: 'assistant',
        content: result.response || 'Here are the results:',
        timestamp: new Date(),
        data: result.data,
        visualization: result.visualization,
        sql: result.sql,
        confidence: result.confidence,
        executionTime: result.executionTime,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('NLQ query failed:', error);

      const errorMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        type: 'assistant',
        content: 'Sorry, I encountered an error processing your query. Please try again.',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSubmit(suggestion);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearHistory = () => {
    setMessages([]);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ask Your Data</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Query your data using natural language
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSQL(!showSQL)}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              {showSQL ? 'Hide' : 'Show'} SQL
            </button>
            <button
              onClick={clearHistory}
              disabled={messages.length === 0}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <WelcomeScreen suggestions={suggestions} onSuggestionClick={handleSuggestionClick} />
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} showSQL={showSQL} />
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Analyzing your query...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(inputValue);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question about your data..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ===================================================================
// SUB-COMPONENTS
// ===================================================================

interface WelcomeScreenProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ suggestions, onSuggestionClick }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12">
      <div className="text-6xl mb-6">💬</div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Ask Your Data Anything</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8 text-center max-w-md">
        Use natural language to query your data. I'll understand your question and show you the results with the best
        visualization.
      </p>

      {suggestions.length > 0 && (
        <div className="w-full max-w-2xl">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Try these examples:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => onSuggestionClick(suggestion)}
                className="p-4 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{suggestion}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface MessageBubbleProps {
  message: Message;
  showSQL: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, showSQL }) => {
  const isUser = message.type === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3xl ${isUser ? 'w-auto' : 'w-full'}`}>
        {/* Message Content */}
        <div
          className={`p-4 rounded-lg ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
          }`}
        >
          <p className={`text-sm ${isUser ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{message.content}</p>

          {/* Confidence Badge */}
          {!isUser && message.confidence && (
            <div className="mt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Confidence: {(message.confidence * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>

        {/* SQL Query (if enabled) */}
        {!isUser && showSQL && message.sql && (
          <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Generated SQL</span>
              <button
                onClick={() => navigator.clipboard.writeText(message.sql!)}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Copy
              </button>
            </div>
            <pre className="text-xs text-gray-800 dark:text-gray-200 font-mono overflow-x-auto">{message.sql}</pre>
          </div>
        )}

        {/* Visualization */}
        {!isUser && message.visualization && message.data && message.data.length > 0 && (
          <div className="mt-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <VisualizationDisplay data={message.data} visualization={message.visualization} />
          </div>
        )}

        {/* Data Table (fallback) */}
        {!isUser && message.data && message.data.length > 0 && !message.visualization && (
          <div className="mt-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <DataTable data={message.data} />
          </div>
        )}

        {/* Error Display */}
        {!isUser && message.error && (
          <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-400">{message.error}</p>
          </div>
        )}

        {/* Timestamp */}
        <div className={`mt-1 text-xs ${isUser ? 'text-right' : 'text-left'} text-gray-500 dark:text-gray-400`}>
          {message.timestamp.toLocaleTimeString()}
          {message.executionTime && ` • ${message.executionTime}ms`}
        </div>
      </div>
    </div>
  );
};

interface VisualizationDisplayProps {
  data: any[];
  visualization: {
    type: string;
    config: Record<string, any>;
    reason: string;
  };
}

const VisualizationDisplay: React.FC<VisualizationDisplayProps> = ({ data, visualization }) => {
  // TODO: Map visualization type to actual chart component
  const ChartComponent = getChartComponent(visualization.type as ChartType);

  if (!ChartComponent) {
    return <DataTable data={data} />;
  }

  // Transform data for chart component
  const chartData = {
    series: [
      {
        name: 'Data',
        data: data.map((row, idx) => ({
          x: Object.values(row)[0],
          y: Object.values(row)[1],
        })),
      },
    ],
  };

  return (
    <div>
      <div className="mb-3">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Visualization</div>
        <div className="text-xs text-gray-600 dark:text-gray-400">{visualization.reason}</div>
      </div>
      <div className="h-64">
        <ChartComponent data={chartData} />
      </div>
    </div>
  );
};

interface DataTableProps {
  data: any[];
}

const DataTable: React.FC<DataTableProps> = ({ data }) => {
  if (data.length === 0) return <p className="text-gray-500">No data found.</p>;

  const columns = Object.keys(data[0]);
  const displayData = data.slice(0, 10); // Limit to 10 rows

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {displayData.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              {columns.map((col) => (
                <td key={col} className="px-4 py-2 text-gray-900 dark:text-gray-100">
                  {String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 10 && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Showing 10 of {data.length} rows
        </div>
      )}
    </div>
  );
};

// ===================================================================
// TYPES
// ===================================================================

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any[];
  visualization?: {
    type: string;
    config: Record<string, any>;
    reason: string;
  };
  sql?: string;
  confidence?: number;
  executionTime?: number;
  error?: string;
}
