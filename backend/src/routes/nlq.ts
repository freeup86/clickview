/**
 * Natural Language Query API Routes
 *
 * Handles NLQ requests, query parsing, and data retrieval.
 * Integrates with OpenAI GPT-4 for query understanding.
 *
 * Part of AI-001 implementation (Phase 5)
 */

import express, { Request, Response } from 'express';
import axios from 'axios';
import { Pool } from 'pg';

const router = express.Router();

// ===================================================================
// DATABASE CONNECTION
// ===================================================================

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'clickview',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

// ===================================================================
// CONFIGURATION
// ===================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4';

// ===================================================================
// MIDDLEWARE
// ===================================================================

/**
 * Validate API key
 */
const validateApiKey = (req: Request, res: Response, next: express.NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

// ===================================================================
// ROUTES
// ===================================================================

/**
 * POST /api/nlq/parse
 * Parse natural language query using AI
 */
router.post('/parse', validateApiKey, async (req: Request, res: Response) => {
  const { system, prompt } = req.body;

  if (!system || !prompt) {
    return res.status(400).json({ error: 'Missing system or prompt' });
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = response.data.choices[0].message.content;

    res.json({ result });
  } catch (error: any) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to parse query',
      details: error.response?.data?.error?.message || error.message,
    });
  }
});

/**
 * POST /api/nlq/execute
 * Execute data query
 */
router.post('/execute', validateApiKey, async (req: Request, res: Response) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }

  try {
    // Sanitize query (basic SQL injection prevention)
    const sanitizedQuery = sanitizeQuery(query);

    // Execute query
    const result = await pool.query(sanitizedQuery);

    res.json({
      data: result.rows,
      rowCount: result.rowCount,
    });
  } catch (error: any) {
    console.error('Query execution error:', error.message);
    res.status(500).json({
      error: 'Failed to execute query',
      details: error.message,
    });
  }
});

/**
 * GET /api/nlq/history
 * Get query history for current user
 */
router.get('/history', validateApiKey, async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;
  const userId = (req as any).user?.id || 'anonymous';

  try {
    const result = await pool.query(
      `
      SELECT query, interpretation, visualization, confidence, created_at
      FROM nlq_history
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
      `,
      [userId, limit]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('History retrieval error:', error.message);
    res.status(500).json({
      error: 'Failed to retrieve history',
      details: error.message,
    });
  }
});

/**
 * POST /api/nlq/save
 * Save query to history
 */
router.post('/save', validateApiKey, async (req: Request, res: Response) => {
  const { query, interpretation, visualization, confidence } = req.body;
  const userId = (req as any).user?.id || 'anonymous';

  if (!query || !interpretation) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await pool.query(
      `
      INSERT INTO nlq_history (user_id, query, interpretation, visualization, confidence)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [userId, query, interpretation, JSON.stringify(visualization), confidence]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Save history error:', error.message);
    res.status(500).json({
      error: 'Failed to save query',
      details: error.message,
    });
  }
});

/**
 * GET /api/nlq/schemas
 * Get available data source schemas
 */
router.get('/schemas', validateApiKey, async (req: Request, res: Response) => {
  try {
    // Get table schemas from database
    const result = await pool.query(`
      SELECT
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    // Group by table
    const schemas: Record<string, any> = {};

    result.rows.forEach((row) => {
      if (!schemas[row.table_name]) {
        schemas[row.table_name] = {
          name: row.table_name,
          fields: [],
        };
      }

      schemas[row.table_name].fields.push({
        name: row.column_name,
        type: mapDataType(row.data_type),
      });
    });

    res.json(Object.values(schemas));
  } catch (error: any) {
    console.error('Schema retrieval error:', error.message);
    res.status(500).json({
      error: 'Failed to retrieve schemas',
      details: error.message,
    });
  }
});

/**
 * POST /api/nlq/suggest
 * Get query suggestions based on partial input
 */
router.post('/suggest', validateApiKey, async (req: Request, res: Response) => {
  const { partial } = req.body;

  if (!partial) {
    return res.json({ suggestions: [] });
  }

  try {
    // Get common queries from history
    const result = await pool.query(
      `
      SELECT DISTINCT query
      FROM nlq_history
      WHERE query ILIKE $1
      ORDER BY created_at DESC
      LIMIT 5
      `,
      [`%${partial}%`]
    );

    const suggestions = result.rows.map((row) => row.query);

    res.json({ suggestions });
  } catch (error: any) {
    console.error('Suggestion error:', error.message);
    res.json({ suggestions: [] });
  }
});

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Sanitize SQL query to prevent injection
 */
function sanitizeQuery(query: string): string {
  // Remove dangerous SQL keywords
  const dangerous = [
    'DROP',
    'DELETE',
    'TRUNCATE',
    'ALTER',
    'CREATE',
    'INSERT',
    'UPDATE',
    'EXEC',
    'EXECUTE',
    ';--',
    'xp_',
  ];

  let sanitized = query;

  dangerous.forEach((keyword) => {
    const regex = new RegExp(keyword, 'gi');
    if (regex.test(sanitized)) {
      throw new Error(`Dangerous keyword detected: ${keyword}`);
    }
  });

  return sanitized;
}

/**
 * Map PostgreSQL data types to standard types
 */
function mapDataType(pgType: string): 'string' | 'number' | 'date' | 'boolean' {
  const lowerType = pgType.toLowerCase();

  if (lowerType.includes('char') || lowerType.includes('text')) {
    return 'string';
  }

  if (lowerType.includes('int') || lowerType.includes('numeric') || lowerType.includes('decimal')) {
    return 'number';
  }

  if (lowerType.includes('date') || lowerType.includes('time')) {
    return 'date';
  }

  if (lowerType.includes('bool')) {
    return 'boolean';
  }

  return 'string';
}

export default router;
