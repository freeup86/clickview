import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../config/logger';

const router = Router();

/**
 * Get all dashboard folders for a workspace
 * GET /workspaces/:workspaceId/dashboard-folders
 */
router.get('/:workspaceId/dashboard-folders', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const result = await query(
      `SELECT df.*,
              COUNT(DISTINCT d.id) as dashboard_count
       FROM dashboard_folders df
       LEFT JOIN dashboards d ON d.folder_id = df.id
       WHERE df.workspace_id = $1
       GROUP BY df.id
       ORDER BY df.name`,
      [workspaceId]
    );

    res.json({
      success: true,
      folders: result.rows
    });
  } catch (error) {
    logger.error('Failed to fetch dashboard folders', error);
    res.status(500).json({ error: 'Failed to fetch dashboard folders' });
  }
});

/**
 * Create dashboard folder
 * POST /workspaces/:workspaceId/dashboard-folders
 */
router.post('/:workspaceId/dashboard-folders', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { name, parentId = null, icon, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    // If parent_id is provided, verify it exists
    if (parentId) {
      const parentCheck = await query(
        'SELECT id FROM dashboard_folders WHERE id = $1 AND workspace_id = $2',
        [parentId, workspaceId]
      );

      if (parentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Parent folder not found' });
      }
    }

    const result = await query(
      `INSERT INTO dashboard_folders (
        workspace_id, name, parent_id, icon, color
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [workspaceId, name, parentId, icon, color]
    );

    res.status(201).json({
      success: true,
      folder: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to create dashboard folder', error);
    res.status(500).json({ error: 'Failed to create dashboard folder' });
  }
});

/**
 * Update dashboard folder
 * PUT /dashboard-folders/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, parentId, icon, color } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (parentId !== undefined) {
      // Check for circular references
      if (parentId) {
        const checkCircular = await query(
          `WITH RECURSIVE folder_tree AS (
            SELECT id, parent_id FROM dashboard_folders WHERE id = $1
            UNION ALL
            SELECT df.id, df.parent_id
            FROM dashboard_folders df
            INNER JOIN folder_tree ft ON df.id = ft.parent_id
          )
          SELECT id FROM folder_tree WHERE id = $2`,
          [parentId, id]
        );

        if (checkCircular.rows.length > 0) {
          return res.status(400).json({
            error: 'Cannot set parent folder: would create circular reference'
          });
        }
      }

      updates.push(`parent_id = $${paramCount}`);
      values.push(parentId);
      paramCount++;
    }

    if (icon !== undefined) {
      updates.push(`icon = $${paramCount}`);
      values.push(icon);
      paramCount++;
    }

    if (color !== undefined) {
      updates.push(`color = $${paramCount}`);
      values.push(color);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    values.push(id);
    const result = await query(
      `UPDATE dashboard_folders
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    res.json({
      success: true,
      folder: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to update dashboard folder', error);
    res.status(500).json({ error: 'Failed to update dashboard folder' });
  }
});

/**
 * Delete dashboard folder
 * DELETE /dashboard-folders/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if folder has dashboards
    const dashboardCheck = await query(
      'SELECT COUNT(*) FROM dashboards WHERE folder_id = $1',
      [id]
    );

    if (parseInt(dashboardCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete folder with dashboards. Move or delete dashboards first.'
      });
    }

    // Check if folder has subfolders
    const subfolderCheck = await query(
      'SELECT COUNT(*) FROM dashboard_folders WHERE parent_id = $1',
      [id]
    );

    if (parseInt(subfolderCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete folder with subfolders. Delete subfolders first.'
      });
    }

    const result = await query(
      'DELETE FROM dashboard_folders WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    res.json({
      success: true,
      message: 'Folder deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete dashboard folder', error);
    res.status(500).json({ error: 'Failed to delete dashboard folder' });
  }
});

/**
 * Move dashboard to folder
 * PUT /dashboards/:id/move
 */
router.put('/:id/move', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { folderId } = req.body;

    // Verify folder exists if provided
    if (folderId) {
      const folderCheck = await query(
        'SELECT id FROM dashboard_folders WHERE id = $1',
        [folderId]
      );

      if (folderCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Folder not found' });
      }
    }

    const result = await query(
      `UPDATE dashboards
       SET folder_id = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [folderId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    res.json({
      success: true,
      dashboard: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to move dashboard', error);
    res.status(500).json({ error: 'Failed to move dashboard' });
  }
});

/**
 * Toggle dashboard favorite
 * POST /dashboards/:id/favorite
 */
router.post('/:id/favorite', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // In a real application, you'd track favorites per user
    // For now, we'll use a simple boolean on the dashboard

    const result = await query(
      `UPDATE dashboards
       SET is_favorite = NOT COALESCE(is_favorite, false), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    res.json({
      success: true,
      dashboard: result.rows[0],
      isFavorite: result.rows[0].is_favorite
    });
  } catch (error) {
    logger.error('Failed to toggle favorite', error);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

/**
 * Track dashboard view
 * POST /dashboards/:id/view
 */
router.post('/:id/view', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await query(
      `UPDATE dashboards
       SET last_viewed_at = NOW(), view_count = COALESCE(view_count, 0) + 1
       WHERE id = $1`,
      [id]
    );

    res.json({
      success: true,
      message: 'View tracked successfully'
    });
  } catch (error) {
    logger.error('Failed to track dashboard view', error);
    res.status(500).json({ error: 'Failed to track dashboard view' });
  }
});

export default router;
