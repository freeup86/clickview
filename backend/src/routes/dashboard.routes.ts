import { Router, Request, Response } from 'express';
import { query, transaction } from '../config/database';
import { EncryptionService } from '../config/encryption';
import { createDashboardSchema, updateDashboardSchema, paginationSchema } from '../validation/schemas';
import { logger } from '../config/logger';

const router = Router();

// Create dashboard
router.post('/', async (req: Request, res: Response) => {
  try {
    const { error, value } = createDashboardSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const result = await query(
      `INSERT INTO dashboards (
        workspace_id, name, description, layout_config, 
        global_filters, refresh_interval, is_template, template_category
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        value.workspaceId,
        value.name,
        value.description || null,
        JSON.stringify(value.layoutConfig || []),
        JSON.stringify(value.globalFilters || {}),
        value.refreshInterval || null,
        value.isTemplate || false,
        value.templateCategory || null
      ]
    );

    res.status(201).json({
      success: true,
      dashboard: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to create dashboard', error);
    res.status(500).json({ error: 'Failed to create dashboard' });
  }
});

// Get dashboards with pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const { error, value } = paginationSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { page, limit, sortBy, sortOrder } = value;
    const offset = (page - 1) * limit;
    const workspaceId = req.query.workspaceId as string;

    let whereClause = '';
    const queryParams: any[] = [];
    let paramCount = 1;

    if (workspaceId) {
      whereClause = `WHERE workspace_id = $${paramCount}`;
      queryParams.push(workspaceId);
      paramCount++;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM dashboards ${whereClause}`,
      queryParams
    );

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    queryParams.push(limit, offset);
    const sortColumn = sortBy || 'created_at';
    const dashboardsResult = await query(
      `SELECT * FROM dashboards 
       ${whereClause}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      queryParams
    );

    res.json({
      success: true,
      dashboards: dashboardsResult.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    });
  } catch (error) {
    logger.error('Failed to fetch dashboards', error);
    res.status(500).json({ error: 'Failed to fetch dashboards' });
  }
});

// Get dashboard by ID with widgets
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get dashboard
    const dashboardResult = await query(
      `SELECT * FROM dashboards WHERE id = $1`,
      [id]
    );

    if (dashboardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    // Get widgets for this dashboard
    const widgetsResult = await query(
      `SELECT * FROM widgets WHERE dashboard_id = $1 ORDER BY created_at`,
      [id]
    );

    // Parse JSON fields for widgets
    const widgets = widgetsResult.rows.map(widget => ({
      ...widget,
      position: typeof widget.position === 'string' ? JSON.parse(widget.position) : widget.position,
      config: typeof widget.config === 'string' ? JSON.parse(widget.config) : widget.config,
      data_config: typeof widget.data_config === 'string' ? JSON.parse(widget.data_config) : widget.data_config,
      filters: typeof widget.filters === 'string' ? JSON.parse(widget.filters) : widget.filters
    }));

    // Parse JSON fields for dashboard
    const dashboard = {
      ...dashboardResult.rows[0],
      layout_config: typeof dashboardResult.rows[0].layout_config === 'string' 
        ? JSON.parse(dashboardResult.rows[0].layout_config) 
        : dashboardResult.rows[0].layout_config,
      global_filters: typeof dashboardResult.rows[0].global_filters === 'string' 
        ? JSON.parse(dashboardResult.rows[0].global_filters) 
        : dashboardResult.rows[0].global_filters,
      widgets
    };

    res.json({
      success: true,
      dashboard
    });
  } catch (error) {
    logger.error('Failed to fetch dashboard', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// Update dashboard
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error, value } = updateDashboardSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (value.name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(value.name);
      paramCount++;
    }

    if (value.description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(value.description);
      paramCount++;
    }

    if (value.layoutConfig !== undefined) {
      updates.push(`layout_config = $${paramCount}`);
      values.push(JSON.stringify(value.layoutConfig));
      paramCount++;
    }

    if (value.globalFilters !== undefined) {
      updates.push(`global_filters = $${paramCount}`);
      values.push(JSON.stringify(value.globalFilters));
      paramCount++;
    }

    if (value.refreshInterval !== undefined) {
      updates.push(`refresh_interval = $${paramCount}`);
      values.push(value.refreshInterval);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    values.push(id);
    const updateQuery = `
      UPDATE dashboards 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    res.json({
      success: true,
      dashboard: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to update dashboard', error);
    res.status(500).json({ error: 'Failed to update dashboard' });
  }
});

// Delete dashboard
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `DELETE FROM dashboards WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    res.json({
      success: true,
      message: 'Dashboard deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete dashboard', error);
    res.status(500).json({ error: 'Failed to delete dashboard' });
  }
});

// Duplicate dashboard
router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const newDashboard = await transaction(async (client) => {
      // Get original dashboard
      const dashboardResult = await client.query(
        `SELECT * FROM dashboards WHERE id = $1`,
        [id]
      );

      if (dashboardResult.rows.length === 0) {
        throw new Error('Dashboard not found');
      }

      const original = dashboardResult.rows[0];

      // Create new dashboard
      const newDashboardResult = await client.query(
        `INSERT INTO dashboards (
          workspace_id, name, description, layout_config,
          global_filters, refresh_interval, is_template, template_category
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          original.workspace_id,
          name || `${original.name} (Copy)`,
          original.description,
          original.layout_config,
          original.global_filters,
          original.refresh_interval,
          false,
          null
        ]
      );

      const newDashboard = newDashboardResult.rows[0];

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
        [newDashboard.id, id]
      );

      return newDashboard;
    });

    res.status(201).json({
      success: true,
      dashboard: newDashboard
    });
  } catch (error) {
    logger.error('Failed to duplicate dashboard', error);
    res.status(500).json({ error: 'Failed to duplicate dashboard' });
  }
});

// Create share link
router.post('/:id/share', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { expiresIn } = req.body; // hours

    const shareToken = EncryptionService.generateShareToken();
    const expiresAt = expiresIn 
      ? new Date(Date.now() + expiresIn * 60 * 60 * 1000)
      : null;

    const result = await query(
      `INSERT INTO dashboard_shares (dashboard_id, share_token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, shareToken, expiresAt]
    );

    const shareUrl = `${process.env.FRONTEND_URL}/shared/${shareToken}`;

    res.json({
      success: true,
      share: {
        ...result.rows[0],
        url: shareUrl
      }
    });
  } catch (error) {
    logger.error('Failed to create share link', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

// Get shared dashboard
router.get('/shared/:shareToken', async (req: Request, res: Response) => {
  try {
    const { shareToken } = req.params;

    // Update view count and get dashboard
    const result = await query(
      `UPDATE dashboard_shares
       SET view_count = view_count + 1
       WHERE share_token = $1 AND (expires_at IS NULL OR expires_at > NOW())
       RETURNING dashboard_id`,
      [shareToken]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Share link not found or expired' });
    }

    // Get dashboard
    const dashboardResult = await query(
      `SELECT * FROM dashboards WHERE id = $1`,
      [result.rows[0].dashboard_id]
    );

    // Get widgets
    const widgetsResult = await query(
      `SELECT * FROM widgets WHERE dashboard_id = $1 ORDER BY created_at`,
      [result.rows[0].dashboard_id]
    );

    // Parse JSON fields for widgets
    const widgets = widgetsResult.rows.map(widget => ({
      ...widget,
      position: typeof widget.position === 'string' ? JSON.parse(widget.position) : widget.position,
      config: typeof widget.config === 'string' ? JSON.parse(widget.config) : widget.config,
      data_config: typeof widget.data_config === 'string' ? JSON.parse(widget.data_config) : widget.data_config,
      filters: typeof widget.filters === 'string' ? JSON.parse(widget.filters) : widget.filters
    }));

    // Parse JSON fields for dashboard
    const dashboard = {
      ...dashboardResult.rows[0],
      layout_config: typeof dashboardResult.rows[0].layout_config === 'string' 
        ? JSON.parse(dashboardResult.rows[0].layout_config) 
        : dashboardResult.rows[0].layout_config,
      global_filters: typeof dashboardResult.rows[0].global_filters === 'string' 
        ? JSON.parse(dashboardResult.rows[0].global_filters) 
        : dashboardResult.rows[0].global_filters,
      widgets
    };

    res.json({
      success: true,
      dashboard,
      readOnly: true
    });
  } catch (error) {
    logger.error('Failed to fetch shared dashboard', error);
    res.status(500).json({ error: 'Failed to fetch shared dashboard' });
  }
});

export default router;