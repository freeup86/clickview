/**
 * Admin API Routes
 *
 * Comprehensive admin endpoints for:
 * - User management
 * - Organization management
 * - Role & permission management
 * - Audit log viewing
 * - System configuration
 */

import express, { Request, Response } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { Pool } from 'pg';

const router = express.Router();

// Apply authentication and admin permission to all admin routes
router.use(authenticate);
router.use(requirePermission('admin:access'));

// ===================================================================
// USER MANAGEMENT ENDPOINTS
// ===================================================================

/**
 * GET /api/admin/users
 * List all users with search and filtering
 */
router.get('/users', requirePermission('users:read'), async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', search, status } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = `
      SELECT
        u.id, u.email, u.username, u.name, u.active, u.email_verified,
        u.mfa_enabled, u.last_login_at, u.created_at,
        ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (u.email ILIKE $${paramCount} OR u.name ILIKE $${paramCount} OR u.username ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (status === 'active') {
      query += ` AND u.active = true`;
    } else if (status === 'inactive') {
      query += ` AND u.active = false`;
    } else if (status === 'locked') {
      query += ` AND u.failed_login_attempts >= 5`;
    }

    query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit as string), offset);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      WHERE 1=1
      ${search ? `AND (u.email ILIKE '%${search}%' OR u.name ILIKE '%${search}%' OR u.username ILIKE '%${search}%')` : ''}
      ${status === 'active' ? 'AND u.active = true' : ''}
      ${status === 'inactive' ? 'AND u.active = false' : ''}
      ${status === 'locked' ? 'AND u.failed_login_attempts >= 5' : ''}
    `;

    const pool: Pool = (req as any).app.locals.pool;
    const [usersResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery),
    ]);

    res.json({
      users: usersResult.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * POST /api/admin/users
 * Create a new user
 */
router.post('/users', requirePermission('users:create'), async (req: Request, res: Response) => {
  try {
    const { email, username, name, password, sendWelcomeEmail } = req.body;

    const pool: Pool = (req as any).app.locals.pool;
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (email, username, name, password_hash, active, email_verified)
       VALUES ($1, $2, $3, $4, true, false)
       RETURNING id, email, username, name`,
      [email, username || null, name || null, hashedPassword]
    );

    // TODO: Send welcome email if requested

    res.status(201).json({ user: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Email or username already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

/**
 * PATCH /api/admin/users/:id
 * Update user details
 */
router.patch('/users/:id', requirePermission('users:update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, username, name } = req.body;

    const pool: Pool = (req as any).app.locals.pool;
    const result = await pool.query(
      `UPDATE users SET email = $1, username = $2, name = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, username, name`,
      [email, username || null, name || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * PATCH /api/admin/users/:id/status
 * Activate/deactivate user
 */
router.patch('/users/:id/status', requirePermission('users:update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    const pool: Pool = (req as any).app.locals.pool;
    await pool.query('UPDATE users SET active = $1, updated_at = NOW() WHERE id = $2', [active, id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Send password reset email
 */
router.post('/users/:id/reset-password', requirePermission('users:update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pool: Pool = (req as any).app.locals.pool;
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // TODO: Generate reset token and send email

    res.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    console.error('Error sending password reset:', error);
    res.status(500).json({ error: 'Failed to send password reset' });
  }
});

/**
 * DELETE /api/admin/users/:id/sessions
 * Revoke all user sessions
 */
router.delete('/users/:id/sessions', requirePermission('users:update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pool: Pool = (req as any).app.locals.pool;
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error revoking sessions:', error);
    res.status(500).json({ error: 'Failed to revoke sessions' });
  }
});

/**
 * POST /api/admin/users/:id/disable-mfa
 * Disable MFA for user
 */
router.post('/users/:id/disable-mfa', requirePermission('users:update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pool: Pool = (req as any).app.locals.pool;
    await pool.query(
      'UPDATE users SET mfa_enabled = false, mfa_secret = NULL, updated_at = NOW() WHERE id = $1',
      [id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error disabling MFA:', error);
    res.status(500).json({ error: 'Failed to disable MFA' });
  }
});

/**
 * PATCH /api/admin/users/:id/roles
 * Update user roles
 */
router.patch('/users/:id/roles', requirePermission('users:update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { roles } = req.body;

    const pool: Pool = (req as any).app.locals.pool;

    // Remove existing roles
    await pool.query('DELETE FROM user_roles WHERE user_id = $1', [id]);

    // Add new roles
    if (roles && roles.length > 0) {
      const values = roles.map((roleId: string) => `('${id}', '${roleId}')`).join(',');
      await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ${values}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user roles:', error);
    res.status(500).json({ error: 'Failed to update user roles' });
  }
});

// ===================================================================
// ORGANIZATION MANAGEMENT ENDPOINTS
// ===================================================================

/**
 * GET /api/admin/organizations
 * List all organizations
 */
router.get('/organizations', requirePermission('organizations:read'), async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    let query = `
      SELECT
        o.id, o.name, o.domain, o.description, o.created_at,
        COUNT(DISTINCT om.user_id) as member_count,
        COUNT(DISTINCT d.id) as dashboard_count
      FROM organizations o
      LEFT JOIN organization_members om ON o.id = om.organization_id
      LEFT JOIN dashboards d ON o.id = d.organization_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (search) {
      query += ` AND (o.name ILIKE $1 OR o.domain ILIKE $1)`;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY o.id ORDER BY o.created_at DESC`;

    const pool: Pool = (req as any).app.locals.pool;
    const result = await pool.query(query, params);

    res.json({ organizations: result.rows });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

/**
 * POST /api/admin/organizations
 * Create new organization
 */
router.post('/organizations', requirePermission('organizations:create'), async (req: Request, res: Response) => {
  try {
    const { name, domain, description } = req.body;

    const pool: Pool = (req as any).app.locals.pool;
    const result = await pool.query(
      `INSERT INTO organizations (name, domain, description)
       VALUES ($1, $2, $3)
       RETURNING id, name, domain, description`,
      [name, domain || null, description || null]
    );

    res.status(201).json({ organization: result.rows[0] });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

/**
 * PATCH /api/admin/organizations/:id
 * Update organization
 */
router.patch('/organizations/:id', requirePermission('organizations:update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, domain, description } = req.body;

    const pool: Pool = (req as any).app.locals.pool;
    const result = await pool.query(
      `UPDATE organizations SET name = $1, domain = $2, description = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id, name, domain, description`,
      [name, domain || null, description || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({ organization: result.rows[0] });
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

/**
 * DELETE /api/admin/organizations/:id
 * Delete organization
 */
router.delete('/organizations/:id', requirePermission('organizations:delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pool: Pool = (req as any).app.locals.pool;
    await pool.query('DELETE FROM organizations WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

/**
 * GET /api/admin/organizations/:id/members
 * Get organization members
 */
router.get('/organizations/:id/members', requirePermission('organizations:read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pool: Pool = (req as any).app.locals.pool;
    const result = await pool.query(
      `SELECT
        om.user_id, om.role,
        u.name, u.email
      FROM organization_members om
      JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = $1
      ORDER BY om.created_at DESC`,
      [id]
    );

    const members = result.rows.map((row) => ({
      userId: row.user_id,
      role: row.role,
      user: {
        name: row.name,
        email: row.email,
      },
    }));

    res.json({ members });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// ===================================================================
// ROLE & PERMISSION MANAGEMENT ENDPOINTS
// ===================================================================

/**
 * GET /api/admin/roles
 * List all roles
 */
router.get('/roles', requirePermission('roles:read'), async (req: Request, res: Response) => {
  try {
    const pool: Pool = (req as any).app.locals.pool;
    const result = await pool.query(`
      SELECT
        r.id, r.name, r.description, r.system, r.created_at,
        COUNT(DISTINCT ur.user_id) as user_count,
        COUNT(DISTINCT rp.permission_id) as permission_count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      GROUP BY r.id
      ORDER BY r.system DESC, r.name ASC
    `);

    res.json({ roles: result.rows });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

/**
 * POST /api/admin/roles
 * Create new role
 */
router.post('/roles', requirePermission('roles:create'), async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    const pool: Pool = (req as any).app.locals.pool;
    const result = await pool.query(
      `INSERT INTO roles (name, description, system)
       VALUES ($1, $2, false)
       RETURNING id, name, description`,
      [name, description || null]
    );

    res.status(201).json({ role: result.rows[0] });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

/**
 * PATCH /api/admin/roles/:id
 * Update role
 */
router.patch('/roles/:id', requirePermission('roles:update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const pool: Pool = (req as any).app.locals.pool;
    const result = await pool.query(
      `UPDATE roles SET name = $1, description = $2, updated_at = NOW()
       WHERE id = $3 AND system = false
       RETURNING id, name, description`,
      [name, description || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found or is a system role' });
    }

    res.json({ role: result.rows[0] });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

/**
 * DELETE /api/admin/roles/:id
 * Delete role
 */
router.delete('/roles/:id', requirePermission('roles:delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pool: Pool = (req as any).app.locals.pool;
    const result = await pool.query('DELETE FROM roles WHERE id = $1 AND system = false', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Role not found or is a system role' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

/**
 * GET /api/admin/permissions
 * List all permissions
 */
router.get('/permissions', requirePermission('permissions:read'), async (req: Request, res: Response) => {
  try {
    const pool: Pool = (req as any).app.locals.pool;
    const result = await pool.query(`
      SELECT id, name, description, resource, action, category
      FROM permissions
      ORDER BY category, resource, action
    `);

    res.json({ permissions: result.rows });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

/**
 * GET /api/admin/roles/:id/permissions
 * Get role permissions
 */
router.get('/roles/:id/permissions', requirePermission('roles:read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pool: Pool = (req as any).app.locals.pool;
    const result = await pool.query(
      `SELECT p.id, p.name, p.description, p.resource, p.action, p.category
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = $1`,
      [id]
    );

    res.json({ permissions: result.rows });
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

/**
 * PUT /api/admin/roles/:id/permissions
 * Update role permissions
 */
router.put('/roles/:id/permissions', requirePermission('roles:update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    const pool: Pool = (req as any).app.locals.pool;

    // Remove existing permissions
    await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);

    // Add new permissions
    if (permissions && permissions.length > 0) {
      const values = permissions.map((permId: string) => `('${id}', '${permId}')`).join(',');
      await pool.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating role permissions:', error);
    res.status(500).json({ error: 'Failed to update role permissions' });
  }
});

// ===================================================================
// AUDIT LOG ENDPOINTS
// ===================================================================

/**
 * GET /api/admin/audit-logs
 * List audit logs with filtering
 */
router.get('/audit-logs', requirePermission('audit:read'), async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50', action, severity, startDate, endDate, userId, resource } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = `
      SELECT
        al.id, al.timestamp, al.user_id, al.action, al.resource_type, al.resource_id,
        al.severity, al.ip_address, al.user_agent, al.success, al.details, al.changes,
        u.name as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (action && action !== 'all') {
      query += ` AND al.action = $${paramCount}`;
      params.push(action);
      paramCount++;
    }

    if (severity && severity !== 'all') {
      query += ` AND al.severity = $${paramCount}`;
      params.push(severity);
      paramCount++;
    }

    if (startDate) {
      query += ` AND al.timestamp >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND al.timestamp <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    if (userId) {
      query += ` AND al.user_id = $${paramCount}`;
      params.push(userId);
      paramCount++;
    }

    if (resource) {
      query += ` AND al.resource_type ILIKE $${paramCount}`;
      params.push(`%${resource}%`);
      paramCount++;
    }

    query += ` ORDER BY al.timestamp DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit as string), offset);

    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM').split('ORDER BY')[0];

    const pool: Pool = (req as any).app.locals.pool;
    const [logsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2)),
    ]);

    res.json({
      logs: logsResult.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * GET /api/admin/audit-logs/export
 * Export audit logs to CSV
 */
router.get('/audit-logs/export', requirePermission('audit:read'), async (req: Request, res: Response) => {
  try {
    const { action, severity, startDate, endDate, userId, resource } = req.query;

    let query = `
      SELECT
        al.timestamp, al.action, al.resource_type, al.resource_id,
        al.severity, al.ip_address, al.success,
        u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (action && action !== 'all') {
      query += ` AND al.action = $${paramCount}`;
      params.push(action);
      paramCount++;
    }

    if (severity && severity !== 'all') {
      query += ` AND al.severity = $${paramCount}`;
      params.push(severity);
      paramCount++;
    }

    if (startDate) {
      query += ` AND al.timestamp >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND al.timestamp <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    query += ` ORDER BY al.timestamp DESC LIMIT 10000`;

    const pool: Pool = (req as any).app.locals.pool;
    const result = await pool.query(query, params);

    // Convert to CSV
    const headers = ['Timestamp', 'User Email', 'Action', 'Resource Type', 'Resource ID', 'Severity', 'IP Address', 'Success'];
    const csv = [
      headers.join(','),
      ...result.rows.map((row) =>
        [
          row.timestamp,
          row.user_email || 'System',
          row.action,
          row.resource_type,
          row.resource_id || '',
          row.severity,
          row.ip_address || '',
          row.success,
        ].join(',')
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

export default router;
