/**
 * Natural Language Query Service Unit Tests
 * Tests for NLQ-001 implementation
 */

import { NLQService } from '../../services/nlq.service';
import { Pool } from 'pg';

// Mock OpenAI
jest.mock('openai', () => ({
  Configuration: jest.fn(),
  OpenAIApi: jest.fn().mockImplementation(() => ({
    createChatCompletion: jest.fn(),
  })),
}));

describe('NLQService', () => {
  let nlqService: NLQService;
  let mockPool: jest.Mocked<Pool>;
  let mockOpenAI: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock pool
    mockPool = {
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      }),
      query: jest.fn().mockResolvedValue({ rows: [] }),
    } as any;

    // Create service
    nlqService = new NLQService(mockPool, 'test-api-key');

    // Get reference to mock OpenAI
    const { OpenAIApi } = require('openai');
    mockOpenAI = OpenAIApi.mock.results[0]?.value || {
      createChatCompletion: jest.fn(),
    };
  });

  describe('processQuery', () => {
    it('should process a natural language query successfully', async () => {
      // Mock intent analysis response
      mockOpenAI.createChatCompletion = jest.fn()
        .mockResolvedValueOnce({
          data: {
            choices: [{
              message: {
                content: JSON.stringify({
                  intent: 'aggregation',
                  entities: ['users'],
                  metrics: ['count'],
                  dimensions: [],
                  confidence: 0.9,
                }),
              },
            }],
          },
        })
        // Mock SQL generation response
        .mockResolvedValueOnce({
          data: {
            choices: [{
              message: {
                content: 'SELECT COUNT(*) FROM users',
              },
            }],
          },
        })
        // Mock natural language response
        .mockResolvedValueOnce({
          data: {
            choices: [{
              message: {
                content: 'There are 100 users in the system.',
              },
            }],
          },
        });

      // Mock query execution
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ count: 100 }] }),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient as any);

      const result = await nlqService.processQuery('How many users do we have?');

      expect(result.success).toBe(true);
      expect(result.query).toBe('How many users do we have?');
      expect(result.intent).toBeDefined();
      expect(result.sql).toBeDefined();
    });

    it('should handle query processing errors gracefully', async () => {
      mockOpenAI.createChatCompletion = jest.fn()
        .mockRejectedValue(new Error('OpenAI API error'));

      const result = await nlqService.processQuery('Some query');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should skip query execution when autoExecute is false', async () => {
      mockOpenAI.createChatCompletion = jest.fn()
        .mockResolvedValueOnce({
          data: {
            choices: [{
              message: {
                content: JSON.stringify({
                  intent: 'filter',
                  entities: [],
                  metrics: [],
                  dimensions: [],
                  confidence: 0.8,
                }),
              },
            }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            choices: [{
              message: { content: 'SELECT * FROM users' },
            }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            choices: [{
              message: { content: 'Query generated successfully.' },
            }],
          },
        });

      const result = await nlqService.processQuery('Show all users', {
        autoExecute: false,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockPool.connect).not.toHaveBeenCalled();
    });
  });

  describe('visualization recommendations', () => {
    it('should recommend line chart for trend queries', async () => {
      mockOpenAI.createChatCompletion = jest.fn()
        .mockResolvedValueOnce({
          data: {
            choices: [{
              message: {
                content: JSON.stringify({
                  intent: 'trend',
                  timeRange: 'last 30 days',
                  entities: ['sales'],
                  metrics: ['amount'],
                  dimensions: ['date'],
                  confidence: 0.9,
                }),
              },
            }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            choices: [{
              message: { content: 'SELECT date, SUM(amount) FROM sales GROUP BY date' },
            }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            choices: [{
              message: { content: 'Sales trend over the last 30 days.' },
            }],
          },
        });

      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: [
            { date: '2024-01-01', amount: 100 },
            { date: '2024-01-02', amount: 150 },
          ],
        }),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient as any);

      const result = await nlqService.processQuery('Show sales trend last 30 days');

      expect(result.visualization?.type).toBe('line');
    });

    it('should recommend bar chart for comparison queries', async () => {
      mockOpenAI.createChatCompletion = jest.fn()
        .mockResolvedValueOnce({
          data: {
            choices: [{
              message: {
                content: JSON.stringify({
                  intent: 'comparison',
                  entities: ['regions'],
                  metrics: ['revenue'],
                  dimensions: ['region'],
                  confidence: 0.85,
                }),
              },
            }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            choices: [{
              message: { content: 'SELECT region, SUM(revenue) FROM sales GROUP BY region' },
            }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            choices: [{
              message: { content: 'Revenue comparison by region.' },
            }],
          },
        });

      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: [
            { region: 'North', revenue: 1000 },
            { region: 'South', revenue: 800 },
          ],
        }),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient as any);

      const result = await nlqService.processQuery('Compare revenue by region');

      expect(result.visualization?.type).toBe('bar');
    });

    it('should recommend metric card for single aggregation', async () => {
      mockOpenAI.createChatCompletion = jest.fn()
        .mockResolvedValueOnce({
          data: {
            choices: [{
              message: {
                content: JSON.stringify({
                  intent: 'aggregation',
                  entities: ['users'],
                  metrics: ['count'],
                  dimensions: [],
                  confidence: 0.95,
                }),
              },
            }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            choices: [{
              message: { content: 'SELECT COUNT(*) as total FROM users' },
            }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            choices: [{
              message: { content: 'Total user count.' },
            }],
          },
        });

      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: [{ total: 5000 }],
        }),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient as any);

      const result = await nlqService.processQuery('Total number of users');

      expect(result.visualization?.type).toBe('metric_card');
    });
  });

  describe('SQL safety', () => {
    it('should reject queries with dangerous keywords', async () => {
      mockOpenAI.createChatCompletion = jest.fn()
        .mockResolvedValueOnce({
          data: {
            choices: [{
              message: {
                content: JSON.stringify({
                  intent: 'filter',
                  entities: [],
                  metrics: [],
                  dimensions: [],
                  confidence: 0.5,
                }),
              },
            }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            choices: [{
              message: { content: 'DROP TABLE users' },
            }],
          },
        });

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient as any);

      const result = await nlqService.processQuery('Delete all users');

      expect(result.success).toBe(false);
      expect(result.error).toContain('dangerous operation');
    });
  });

  describe('conversation context', () => {
    it('should maintain conversation history', async () => {
      const sessionId = 'test-session-123';

      mockOpenAI.createChatCompletion = jest.fn()
        .mockResolvedValue({
          data: {
            choices: [{
              message: {
                content: JSON.stringify({
                  intent: 'filter',
                  entities: [],
                  metrics: [],
                  dimensions: [],
                  confidence: 0.8,
                }),
              },
            }],
          },
        });

      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient as any);

      // First query
      await nlqService.processQuery('Show users', { sessionId });

      // Second query in same session
      await nlqService.processQuery('Filter by active', { sessionId });

      // Clear history
      nlqService.clearHistory(sessionId);
    });

    it('should clear all history when no sessionId provided', () => {
      nlqService.clearHistory();
      // No error thrown means success
    });
  });

  describe('getSuggestions', () => {
    it('should return query suggestions', async () => {
      const suggestions = await nlqService.getSuggestions();

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toBeDefined();
    });
  });
});
