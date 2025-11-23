import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../config/logger';

const router = Router();

/**
 * Get all comments for a dashboard
 * GET /dashboards/:dashboardId/comments
 */
router.get('/:dashboardId/comments', async (req: Request, res: Response) => {
  try {
    const { dashboardId } = req.params;

    const result = await query(
      `SELECT dc.*,
              u.username as user_name,
              u.email as user_email,
              u.avatar_url as user_avatar
       FROM dashboard_comments dc
       JOIN users u ON dc.user_id = u.id
       WHERE dc.dashboard_id = $1
       ORDER BY dc.created_at ASC`,
      [dashboardId]
    );

    res.json({
      success: true,
      comments: result.rows
    });
  } catch (error) {
    logger.error('Failed to fetch comments', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

/**
 * Add comment to dashboard
 * POST /dashboards/:dashboardId/comments
 */
router.post('/:dashboardId/comments', async (req: Request, res: Response) => {
  try {
    const { dashboardId } = req.params;
    const { content, parentId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Get user ID from auth middleware (would be set in production)
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000000';

    // Verify dashboard exists
    const dashboardCheck = await query(
      'SELECT id FROM dashboards WHERE id = $1',
      [dashboardId]
    );

    if (dashboardCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    // If parent_id is provided, verify it exists
    if (parentId) {
      const parentCheck = await query(
        'SELECT id FROM dashboard_comments WHERE id = $1 AND dashboard_id = $2',
        [parentId, dashboardId]
      );

      if (parentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }

    const result = await query(
      `INSERT INTO dashboard_comments (dashboard_id, user_id, content, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [dashboardId, userId, content, parentId]
    );

    // Get user info for response
    const userResult = await query(
      'SELECT username, email, avatar_url FROM users WHERE id = $1',
      [userId]
    );

    const comment = {
      ...result.rows[0],
      user_name: userResult.rows[0]?.username,
      user_email: userResult.rows[0]?.email,
      user_avatar: userResult.rows[0]?.avatar_url
    };

    res.status(201).json({
      success: true,
      comment
    });
  } catch (error) {
    logger.error('Failed to add comment', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

/**
 * Update comment
 * PUT /dashboard-comments/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Get user ID from auth middleware
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000000';

    // Verify comment exists and user owns it
    const commentCheck = await query(
      'SELECT user_id FROM dashboard_comments WHERE id = $1',
      [id]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (commentCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this comment' });
    }

    const result = await query(
      `UPDATE dashboard_comments
       SET content = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [content, id]
    );

    // Get user info for response
    const userResult = await query(
      'SELECT username, email, avatar_url FROM users WHERE id = $1',
      [userId]
    );

    const comment = {
      ...result.rows[0],
      user_name: userResult.rows[0]?.username,
      user_email: userResult.rows[0]?.email,
      user_avatar: userResult.rows[0]?.avatar_url
    };

    res.json({
      success: true,
      comment
    });
  } catch (error) {
    logger.error('Failed to update comment', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

/**
 * Delete comment
 * DELETE /dashboard-comments/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get user ID from auth middleware
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000000';

    // Verify comment exists and user owns it
    const commentCheck = await query(
      'SELECT user_id FROM dashboard_comments WHERE id = $1',
      [id]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (commentCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    // Delete comment and its replies (cascade)
    await query(
      'DELETE FROM dashboard_comments WHERE id = $1 OR parent_id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete comment', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
