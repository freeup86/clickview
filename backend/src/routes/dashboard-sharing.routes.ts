import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { EncryptionService } from '../config/encryption';
import { logger } from '../config/logger';
import bcrypt from 'bcryptjs';

const router = Router();

/**
 * Create enhanced share link with password and expiration
 * POST /dashboards/:dashboardId/share-links
 */
router.post('/:dashboardId/share-links', async (req: Request, res: Response) => {
  try {
    const { dashboardId } = req.params;
    const { expiresIn, password, permission = 'view' } = req.body;

    // Verify dashboard exists
    const dashboardCheck = await query(
      'SELECT id FROM dashboards WHERE id = $1',
      [dashboardId]
    );

    if (dashboardCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    const shareToken = EncryptionService.generateShareToken();
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 60 * 60 * 1000)
      : null;

    // Hash password if provided
    const passwordHash = password
      ? await bcrypt.hash(password, 10)
      : null;

    const result = await query(
      `INSERT INTO dashboard_share_links (
        dashboard_id, share_token, expires_at, password_hash, permission
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, dashboard_id, share_token, expires_at, permission, created_at, is_active`,
      [dashboardId, shareToken, expiresAt, passwordHash, permission]
    );

    const shareUrl = `${process.env.FRONTEND_URL}/shared/${shareToken}`;

    res.status(201).json({
      success: true,
      shareLink: {
        ...result.rows[0],
        url: shareUrl,
        hasPassword: !!password
      }
    });
  } catch (error) {
    logger.error('Failed to create share link', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

/**
 * Get all share links for a dashboard
 * GET /dashboards/:dashboardId/share-links
 */
router.get('/:dashboardId/share-links', async (req: Request, res: Response) => {
  try {
    const { dashboardId } = req.params;

    const result = await query(
      `SELECT id, dashboard_id, share_token, expires_at, permission,
              is_active, view_count, created_at, updated_at,
              CASE WHEN password_hash IS NULL THEN false ELSE true END as has_password
       FROM dashboard_share_links
       WHERE dashboard_id = $1
       ORDER BY created_at DESC`,
      [dashboardId]
    );

    const shareLinks = result.rows.map(link => ({
      ...link,
      url: `${process.env.FRONTEND_URL}/shared/${link.share_token}`,
      isExpired: link.expires_at ? new Date(link.expires_at) < new Date() : false
    }));

    res.json({
      success: true,
      shareLinks
    });
  } catch (error) {
    logger.error('Failed to fetch share links', error);
    res.status(500).json({ error: 'Failed to fetch share links' });
  }
});

/**
 * Update share link
 * PUT /share-links/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { expiresIn, password, permission, isActive } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (expiresIn !== undefined) {
      const expiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 60 * 60 * 1000)
        : null;
      updates.push(`expires_at = $${paramCount}`);
      values.push(expiresAt);
      paramCount++;
    }

    if (password !== undefined) {
      const passwordHash = password
        ? await bcrypt.hash(password, 10)
        : null;
      updates.push(`password_hash = $${paramCount}`);
      values.push(passwordHash);
      paramCount++;
    }

    if (permission !== undefined) {
      updates.push(`permission = $${paramCount}`);
      values.push(permission);
      paramCount++;
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      values.push(isActive);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    values.push(id);
    const result = await query(
      `UPDATE dashboard_share_links
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING id, dashboard_id, share_token, expires_at, permission, is_active`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    res.json({
      success: true,
      shareLink: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to update share link', error);
    res.status(500).json({ error: 'Failed to update share link' });
  }
});

/**
 * Revoke (delete) share link
 * DELETE /share-links/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM dashboard_share_links WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    res.json({
      success: true,
      message: 'Share link revoked successfully'
    });
  } catch (error) {
    logger.error('Failed to revoke share link', error);
    res.status(500).json({ error: 'Failed to revoke share link' });
  }
});

/**
 * Verify share link password
 * POST /share-links/verify-password
 */
router.post('/verify-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    const result = await query(
      `SELECT password_hash FROM dashboard_share_links
       WHERE share_token = $1 AND is_active = true
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Share link not found or expired' });
    }

    const { password_hash } = result.rows[0];

    if (!password_hash) {
      return res.status(400).json({ error: 'No password set for this link' });
    }

    const isValid = await bcrypt.compare(password, password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    res.json({
      success: true,
      message: 'Password verified'
    });
  } catch (error) {
    logger.error('Failed to verify password', error);
    res.status(500).json({ error: 'Failed to verify password' });
  }
});

/**
 * Get dashboard permissions
 * GET /dashboards/:dashboardId/permissions
 */
router.get('/:dashboardId/permissions', async (req: Request, res: Response) => {
  try {
    const { dashboardId } = req.params;

    const result = await query(
      `SELECT dp.*,
              u.username as user_name, u.email as user_email,
              t.name as team_name
       FROM dashboard_permissions dp
       LEFT JOIN users u ON dp.user_id = u.id
       LEFT JOIN teams t ON dp.team_id = t.id
       WHERE dp.dashboard_id = $1
       ORDER BY dp.created_at DESC`,
      [dashboardId]
    );

    res.json({
      success: true,
      permissions: result.rows
    });
  } catch (error) {
    logger.error('Failed to fetch permissions', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

/**
 * Add dashboard permission
 * POST /dashboards/:dashboardId/permissions
 */
router.post('/:dashboardId/permissions', async (req: Request, res: Response) => {
  try {
    const { dashboardId } = req.params;
    const { userId, teamId, role } = req.body;

    if (!userId && !teamId) {
      return res.status(400).json({
        error: 'Either userId or teamId is required'
      });
    }

    if (!['viewer', 'editor', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be viewer, editor, or admin'
      });
    }

    // Check if permission already exists
    const existingCheck = await query(
      `SELECT id FROM dashboard_permissions
       WHERE dashboard_id = $1 AND (user_id = $2 OR team_id = $3)`,
      [dashboardId, userId, teamId]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'Permission already exists for this user/team'
      });
    }

    const result = await query(
      `INSERT INTO dashboard_permissions (dashboard_id, user_id, team_id, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [dashboardId, userId, teamId, role]
    );

    res.status(201).json({
      success: true,
      permission: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to add permission', error);
    res.status(500).json({ error: 'Failed to add permission' });
  }
});

/**
 * Update dashboard permission
 * PUT /dashboard-permissions/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['viewer', 'editor', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be viewer, editor, or admin'
      });
    }

    const result = await query(
      `UPDATE dashboard_permissions
       SET role = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    res.json({
      success: true,
      permission: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to update permission', error);
    res.status(500).json({ error: 'Failed to update permission' });
  }
});

/**
 * Remove dashboard permission
 * DELETE /dashboard-permissions/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM dashboard_permissions WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    res.json({
      success: true,
      message: 'Permission removed successfully'
    });
  } catch (error) {
    logger.error('Failed to remove permission', error);
    res.status(500).json({ error: 'Failed to remove permission' });
  }
});

/**
 * Get available users for a workspace (for permission assignment)
 * GET /workspaces/:workspaceId/users
 */
router.get('/:workspaceId/users', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { dashboardId } = req.query;

    let usersQuery = `
      SELECT u.id, u.username, u.email, u.first_name, u.last_name
      FROM users u
      JOIN workspace_members wm ON u.id = wm.user_id
      WHERE wm.workspace_id = $1
    `;

    // Optionally exclude users who already have permissions on the dashboard
    if (dashboardId) {
      usersQuery += `
        AND u.id NOT IN (
          SELECT user_id FROM dashboard_permissions
          WHERE dashboard_id = $2 AND user_id IS NOT NULL
        )
      `;
    }

    const params = dashboardId ? [workspaceId, dashboardId] : [workspaceId];
    const result = await query(usersQuery, params);

    // Get current user ID (would come from auth middleware in production)
    const currentUserId = req.user?.id || null;

    res.json({
      success: true,
      users: result.rows,
      currentUserId,
      currentUserName: req.user?.username || 'Unknown User'
    });
  } catch (error) {
    logger.error('Failed to fetch users', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * Get available teams for a workspace (for permission assignment)
 * GET /workspaces/:workspaceId/teams
 */
router.get('/:workspaceId/teams', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { dashboardId } = req.query;

    let teamsQuery = `
      SELECT t.id, t.name, t.description, COUNT(tm.user_id) as member_count
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      WHERE t.workspace_id = $1
    `;

    if (dashboardId) {
      teamsQuery += `
        AND t.id NOT IN (
          SELECT team_id FROM dashboard_permissions
          WHERE dashboard_id = $2 AND team_id IS NOT NULL
        )
      `;
    }

    teamsQuery += ` GROUP BY t.id ORDER BY t.name`;

    const params = dashboardId ? [workspaceId, dashboardId] : [workspaceId];
    const result = await query(teamsQuery, params);

    res.json({
      success: true,
      teams: result.rows
    });
  } catch (error) {
    logger.error('Failed to fetch teams', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

export default router;
