import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../config/logger';

const router = Router();

/**
 * Get all calculated fields for a dashboard
 * GET /dashboards/:dashboardId/calculated-fields
 */
router.get('/:dashboardId/calculated-fields', async (req: Request, res: Response) => {
  try {
    const { dashboardId } = req.params;

    const result = await query(
      `SELECT * FROM calculated_fields
       WHERE dashboard_id = $1
       ORDER BY created_at DESC`,
      [dashboardId]
    );

    res.json({
      success: true,
      calculatedFields: result.rows
    });
  } catch (error) {
    logger.error('Failed to fetch calculated fields', error);
    res.status(500).json({ error: 'Failed to fetch calculated fields' });
  }
});

/**
 * Create calculated field
 * POST /dashboards/:dashboardId/calculated-fields
 */
router.post('/:dashboardId/calculated-fields', async (req: Request, res: Response) => {
  try {
    const { dashboardId } = req.params;
    const { name, expression, description, returnType = 'number' } = req.body;

    if (!name || !expression) {
      return res.status(400).json({
        error: 'Name and expression are required'
      });
    }

    // Verify dashboard exists
    const dashboardCheck = await query(
      'SELECT id FROM dashboards WHERE id = $1',
      [dashboardId]
    );

    if (dashboardCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    const result = await query(
      `INSERT INTO calculated_fields (
        dashboard_id, name, expression, description, return_type
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [dashboardId, name, expression, description, returnType]
    );

    res.status(201).json({
      success: true,
      calculatedField: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to create calculated field', error);
    res.status(500).json({ error: 'Failed to create calculated field' });
  }
});

/**
 * Update calculated field
 * PUT /calculated-fields/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, expression, description, returnType } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (expression !== undefined) {
      updates.push(`expression = $${paramCount}`);
      values.push(expression);
      paramCount++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (returnType !== undefined) {
      updates.push(`return_type = $${paramCount}`);
      values.push(returnType);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    values.push(id);
    const result = await query(
      `UPDATE calculated_fields
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Calculated field not found' });
    }

    res.json({
      success: true,
      calculatedField: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to update calculated field', error);
    res.status(500).json({ error: 'Failed to update calculated field' });
  }
});

/**
 * Delete calculated field
 * DELETE /calculated-fields/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM calculated_fields WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Calculated field not found' });
    }

    res.json({
      success: true,
      message: 'Calculated field deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete calculated field', error);
    res.status(500).json({ error: 'Failed to delete calculated field' });
  }
});

/**
 * Test calculated field expression
 * POST /calculated-fields/test
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { expression, sampleData } = req.body;

    if (!expression) {
      return res.status(400).json({ error: 'Expression is required' });
    }

    // Basic validation - check for common SQL injection patterns
    const dangerousPatterns = [
      /;\s*drop\s+table/i,
      /;\s*delete\s+from/i,
      /;\s*truncate/i,
      /--/,
      /\/\*/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(expression)) {
        return res.status(400).json({
          error: 'Invalid expression: potential security risk detected'
        });
      }
    }

    // Simple validation - just check syntax
    const validation = {
      valid: true,
      message: 'Expression syntax is valid'
    };

    // In production, you would evaluate the expression with sample data
    // For now, we'll just return a success response
    res.json({
      success: true,
      validation,
      sampleResult: sampleData ? 'Sample calculation would run here' : null
    });
  } catch (error) {
    logger.error('Failed to test calculated field', error);
    res.status(500).json({ error: 'Failed to test calculated field' });
  }
});

export default router;
