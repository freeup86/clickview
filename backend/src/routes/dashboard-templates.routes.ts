import { Router, Request, Response } from 'express';
import { query, transaction } from '../config/database';
import { logger } from '../config/logger';

const router = Router();

/**
 * Get all dashboard templates
 * GET /dashboards/templates
 * Query params: category, tags, isPublic, search
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, tags, isPublic, search } = req.query;

    let whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramCount = 1;

    if (category) {
      whereConditions.push(`category = $${paramCount}`);
      queryParams.push(category);
      paramCount++;
    }

    if (isPublic !== undefined) {
      whereConditions.push(`is_public = $${paramCount}`);
      queryParams.push(isPublic === 'true');
      paramCount++;
    }

    if (search) {
      whereConditions.push(`(name ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    if (tags && Array.isArray(tags)) {
      whereConditions.push(`tags && $${paramCount}`);
      queryParams.push(tags);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const result = await query(
      `SELECT dt.*, d.name as dashboard_name,
              COUNT(dfu.id) as usage_count
       FROM dashboard_templates dt
       JOIN dashboards d ON dt.dashboard_id = d.id
       LEFT JOIN dashboard_from_template_usage dfu ON dt.id = dfu.template_id
       ${whereClause}
       GROUP BY dt.id, d.name
       ORDER BY dt.created_at DESC`,
      queryParams
    );

    const templates = result.rows.map(row => ({
      ...row,
      tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || '[]')
    }));

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    logger.error('Failed to fetch templates', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * Get single template by ID
 * GET /dashboards/templates/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT dt.*, d.name as dashboard_name, d.layout_config, d.global_filters,
              COUNT(dfu.id) as usage_count
       FROM dashboard_templates dt
       JOIN dashboards d ON dt.dashboard_id = d.id
       LEFT JOIN dashboard_from_template_usage dfu ON dt.id = dfu.template_id
       WHERE dt.id = $1
       GROUP BY dt.id, d.name, d.layout_config, d.global_filters`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Get widgets for the template's dashboard
    const widgetsResult = await query(
      `SELECT * FROM widgets WHERE dashboard_id = $1 ORDER BY created_at`,
      [result.rows[0].dashboard_id]
    );

    const template = {
      ...result.rows[0],
      tags: Array.isArray(result.rows[0].tags) ? result.rows[0].tags : JSON.parse(result.rows[0].tags || '[]'),
      widgets: widgetsResult.rows
    };

    res.json({
      success: true,
      template
    });
  } catch (error) {
    logger.error('Failed to fetch template', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

/**
 * Create dashboard template
 * POST /dashboards/templates
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      dashboardId,
      name,
      description,
      category,
      tags = [],
      isPublic = false,
      generateThumbnail = false
    } = req.body;

    if (!dashboardId || !name || !category) {
      return res.status(400).json({
        error: 'Dashboard ID, name, and category are required'
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

    // Generate thumbnail URL if requested (placeholder for now)
    const thumbnailUrl = generateThumbnail
      ? `/api/thumbnails/${dashboardId}.png`
      : null;

    const result = await query(
      `INSERT INTO dashboard_templates (
        dashboard_id, name, description, category, tags,
        is_public, thumbnail_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        dashboardId,
        name,
        description,
        category,
        JSON.stringify(tags),
        isPublic,
        thumbnailUrl
      ]
    );

    res.status(201).json({
      success: true,
      template: {
        ...result.rows[0],
        tags
      }
    });
  } catch (error) {
    logger.error('Failed to create template', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

/**
 * Update dashboard template
 * PUT /dashboards/templates/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, category, tags, isPublic } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (category !== undefined) {
      updates.push(`category = $${paramCount}`);
      values.push(category);
      paramCount++;
    }

    if (tags !== undefined) {
      updates.push(`tags = $${paramCount}`);
      values.push(JSON.stringify(tags));
      paramCount++;
    }

    if (isPublic !== undefined) {
      updates.push(`is_public = $${paramCount}`);
      values.push(isPublic);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    values.push(id);
    const result = await query(
      `UPDATE dashboard_templates
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({
      success: true,
      template: {
        ...result.rows[0],
        tags: Array.isArray(result.rows[0].tags) ? result.rows[0].tags : JSON.parse(result.rows[0].tags || '[]')
      }
    });
  } catch (error) {
    logger.error('Failed to update template', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

/**
 * Delete dashboard template
 * DELETE /dashboards/templates/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM dashboard_templates WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete template', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

/**
 * Create dashboard from template
 * POST /dashboards/from-template
 */
router.post('/from-template', async (req: Request, res: Response) => {
  try {
    const { templateId, workspaceId, name } = req.body;

    if (!templateId || !workspaceId) {
      return res.status(400).json({
        error: 'Template ID and workspace ID are required'
      });
    }

    const newDashboard = await transaction(async (client) => {
      // Get template
      const templateResult = await client.query(
        `SELECT dt.*, d.*
         FROM dashboard_templates dt
         JOIN dashboards d ON dt.dashboard_id = d.id
         WHERE dt.id = $1`,
        [templateId]
      );

      if (templateResult.rows.length === 0) {
        throw new Error('Template not found');
      }

      const template = templateResult.rows[0];

      // Create new dashboard
      const dashboardResult = await client.query(
        `INSERT INTO dashboards (
          workspace_id, name, description, layout_config,
          global_filters, refresh_interval, is_template, template_category
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          workspaceId,
          name || template.name,
          template.description,
          template.layout_config,
          template.global_filters,
          template.refresh_interval,
          false,
          null
        ]
      );

      const newDashboard = dashboardResult.rows[0];

      // Copy widgets
      await client.query(
        `INSERT INTO widgets (
          dashboard_id, type, title, description, position,
          config, data_config, filters, refresh_interval
        )
        SELECT $1, type, title, description, position,
               config, data_config, filters, refresh_interval
        FROM widgets
        WHERE dashboard_id = $2`,
        [newDashboard.id, template.dashboard_id]
      );

      // Track usage
      await client.query(
        `INSERT INTO dashboard_from_template_usage (template_id, dashboard_id)
         VALUES ($1, $2)`,
        [templateId, newDashboard.id]
      );

      return newDashboard;
    });

    res.status(201).json({
      success: true,
      dashboard: newDashboard
    });
  } catch (error) {
    logger.error('Failed to create dashboard from template', error);
    res.status(500).json({ error: 'Failed to create dashboard from template' });
  }
});

export default router;
