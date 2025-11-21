/**
 * Authorization Management API Routes
 *
 * Admin endpoints for managing:
 * - RLS policies
 * - Column permissions
 * - Data masking rules
 * - ABAC policies
 * - Permission delegations
 * - Resource sensitivity
 */

import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { buildAuthContext } from '../middleware/authorization.middleware';
import { AuthorizationService } from '../services/authorization.service';

const router = express.Router();

// Apply authentication and authorization context to all routes
router.use(authenticate);
router.use(buildAuthContext);

// ===================================================================
// RLS POLICIES
// ===================================================================

/**
 * GET /api/authorization/rls-policies
 * List all RLS policies
 */
router.get('/rls-policies', requirePermission('authorization:manage'), async (req: Request, res: Response) => {
  try {
    const { table_name, schema_name, is_enabled } = req.query;

    let query = `
      SELECT
        id, name, description, table_name, schema_name,
        policy_type, commands, using_expression, check_expression,
        applies_to_roles, is_enabled, priority,
        created_at, updated_at
      FROM rls_policies
      WHERE 1=1
    `;
    const params: any[] = [];

    if (schema_name) {
      params.push(schema_name);
      query += ` AND schema_name = $${params.length}`;
    }

    if (table_name) {
      params.push(table_name);
      query += ` AND table_name = $${params.length}`;
    }

    if (is_enabled !== undefined) {
      params.push(is_enabled === 'true');
      query += ` AND is_enabled = $${params.length}`;
    }

    query += ' ORDER BY priority DESC, created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      policies: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching RLS policies:', error);
    res.status(500).json({ error: 'Failed to fetch RLS policies' });
  }
});

/**
 * POST /api/authorization/rls-policies
 * Create new RLS policy
 */
router.post('/rls-policies', requirePermission('authorization:manage'), async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      table_name,
      schema_name = 'public',
      policy_type,
      commands = ['SELECT'],
      using_expression,
      check_expression,
      applies_to_roles = ['authenticated'],
      is_enabled = true,
      priority = 100
    } = req.body;

    // Validation
    if (!name || !table_name || !policy_type || !using_expression) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'table_name', 'policy_type', 'using_expression']
      });
      return;
    }

    if (!['permissive', 'restrictive'].includes(policy_type)) {
      res.status(400).json({ error: 'Invalid policy_type. Must be permissive or restrictive' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO rls_policies
       (name, description, table_name, schema_name, policy_type, commands,
        using_expression, check_expression, applies_to_roles, is_enabled, priority, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        name,
        description,
        table_name,
        schema_name,
        policy_type,
        commands,
        using_expression,
        check_expression,
        applies_to_roles,
        is_enabled,
        priority,
        req.user!.id
      ]
    );

    res.status(201).json({
      message: 'RLS policy created',
      policy: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating RLS policy:', error);

    if (error.code === '23505') { // Unique violation
      res.status(409).json({ error: 'Policy with this name already exists for this table' });
    } else {
      res.status(500).json({ error: 'Failed to create RLS policy' });
    }
  }
});

/**
 * PUT /api/authorization/rls-policies/:id
 * Update RLS policy
 */
router.put('/rls-policies/:id', requirePermission('authorization:manage'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      using_expression,
      check_expression,
      commands,
      applies_to_roles,
      is_enabled,
      priority
    } = req.body;

    const result = await pool.query(
      `UPDATE rls_policies
       SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         using_expression = COALESCE($3, using_expression),
         check_expression = COALESCE($4, check_expression),
         commands = COALESCE($5, commands),
         applies_to_roles = COALESCE($6, applies_to_roles),
         is_enabled = COALESCE($7, is_enabled),
         priority = COALESCE($8, priority),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [name, description, using_expression, check_expression, commands, applies_to_roles, is_enabled, priority, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'RLS policy not found' });
      return;
    }

    res.json({
      message: 'RLS policy updated',
      policy: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating RLS policy:', error);
    res.status(500).json({ error: 'Failed to update RLS policy' });
  }
});

/**
 * DELETE /api/authorization/rls-policies/:id
 * Delete RLS policy
 */
router.delete('/rls-policies/:id', requirePermission('authorization:manage'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM rls_policies WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'RLS policy not found' });
      return;
    }

    res.json({ message: 'RLS policy deleted' });
  } catch (error) {
    console.error('Error deleting RLS policy:', error);
    res.status(500).json({ error: 'Failed to delete RLS policy' });
  }
});

// ===================================================================
// DATA MASKING RULES
// ===================================================================

/**
 * GET /api/authorization/masking-rules
 * List all data masking rules
 */
router.get('/masking-rules', requirePermission('authorization:manage'), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        id, name, description, masking_type, config,
        custom_function, bypass_roles, bypass_users, is_enabled,
        created_at, updated_at
      FROM data_masking_rules
      ORDER BY name
    `);

    res.json({
      rules: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching masking rules:', error);
    res.status(500).json({ error: 'Failed to fetch masking rules' });
  }
});

/**
 * POST /api/authorization/masking-rules
 * Create new masking rule
 */
router.post('/masking-rules', requirePermission('authorization:manage'), async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      masking_type,
      config = {},
      custom_function,
      bypass_roles = [],
      bypass_users = [],
      is_enabled = true
    } = req.body;

    if (!name || !masking_type) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'masking_type']
      });
      return;
    }

    const validTypes = ['full', 'partial', 'email', 'phone', 'credit_card', 'ssn', 'custom', 'hash', 'null'];
    if (!validTypes.includes(masking_type)) {
      res.status(400).json({
        error: 'Invalid masking_type',
        validTypes
      });
      return;
    }

    const result = await pool.query(
      `INSERT INTO data_masking_rules
       (name, description, masking_type, config, custom_function, bypass_roles, bypass_users, is_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, description, masking_type, config, custom_function, bypass_roles, bypass_users, is_enabled]
    );

    res.status(201).json({
      message: 'Masking rule created',
      rule: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating masking rule:', error);

    if (error.code === '23505') {
      res.status(409).json({ error: 'Masking rule with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create masking rule' });
    }
  }
});

/**
 * POST /api/authorization/column-masking
 * Apply masking rule to a column
 */
router.post('/column-masking', requirePermission('authorization:manage'), async (req: Request, res: Response) => {
  try {
    const {
      table_name,
      column_name,
      schema_name = 'public',
      masking_rule_id,
      condition_expression,
      is_enabled = true
    } = req.body;

    if (!table_name || !column_name || !masking_rule_id) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['table_name', 'column_name', 'masking_rule_id']
      });
      return;
    }

    const result = await pool.query(
      `INSERT INTO column_masking
       (table_name, column_name, schema_name, masking_rule_id, condition_expression, is_enabled)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [table_name, column_name, schema_name, masking_rule_id, condition_expression, is_enabled]
    );

    res.status(201).json({
      message: 'Column masking configured',
      columnMasking: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error configuring column masking:', error);

    if (error.code === '23505') {
      res.status(409).json({ error: 'Masking already configured for this column' });
    } else if (error.code === '23503') {
      res.status(404).json({ error: 'Masking rule not found' });
    } else {
      res.status(500).json({ error: 'Failed to configure column masking' });
    }
  }
});

// ===================================================================
// ABAC POLICIES
// ===================================================================

/**
 * GET /api/authorization/abac-policies
 * List all ABAC policies
 */
router.get('/abac-policies', requirePermission('authorization:manage'), async (req: Request, res: Response) => {
  try {
    const { resource_type, action, is_enabled } = req.query;

    let query = `
      SELECT
        id, name, description, resource_type, action, effect,
        conditions, priority, organization_id, is_enabled,
        created_at, updated_at
      FROM abac_policies
      WHERE 1=1
    `;
    const params: any[] = [];

    if (resource_type) {
      params.push(resource_type);
      query += ` AND resource_type = $${params.length}`;
    }

    if (action) {
      params.push(action);
      query += ` AND action = $${params.length}`;
    }

    if (is_enabled !== undefined) {
      params.push(is_enabled === 'true');
      query += ` AND is_enabled = $${params.length}`;
    }

    query += ' ORDER BY priority DESC, created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      policies: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching ABAC policies:', error);
    res.status(500).json({ error: 'Failed to fetch ABAC policies' });
  }
});

/**
 * POST /api/authorization/abac-policies
 * Create new ABAC policy
 */
router.post('/abac-policies', requirePermission('authorization:manage'), async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      resource_type,
      action,
      effect,
      conditions,
      priority = 100,
      organization_id,
      is_enabled = true
    } = req.body;

    if (!name || !resource_type || !action || !effect || !conditions) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'resource_type', 'action', 'effect', 'conditions']
      });
      return;
    }

    if (!['allow', 'deny'].includes(effect)) {
      res.status(400).json({ error: 'Invalid effect. Must be allow or deny' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO abac_policies
       (name, description, resource_type, action, effect, conditions, priority, organization_id, is_enabled, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, description, resource_type, action, effect, conditions, priority, organization_id, is_enabled, req.user!.id]
    );

    // Clear policy cache when new policy is created
    await AuthorizationService.clearPolicyCache();

    res.status(201).json({
      message: 'ABAC policy created',
      policy: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating ABAC policy:', error);

    if (error.code === '23505') {
      res.status(409).json({ error: 'Policy with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create ABAC policy' });
    }
  }
});

/**
 * PUT /api/authorization/abac-policies/:id
 * Update ABAC policy
 */
router.put('/abac-policies/:id', requirePermission('authorization:manage'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, conditions, priority, is_enabled } = req.body;

    const result = await pool.query(
      `UPDATE abac_policies
       SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         conditions = COALESCE($3, conditions),
         priority = COALESCE($4, priority),
         is_enabled = COALESCE($5, is_enabled),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [name, description, conditions, priority, is_enabled, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'ABAC policy not found' });
      return;
    }

    // Clear policy cache when policy is updated
    await AuthorizationService.clearPolicyCache();

    res.json({
      message: 'ABAC policy updated',
      policy: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating ABAC policy:', error);
    res.status(500).json({ error: 'Failed to update ABAC policy' });
  }
});

/**
 * DELETE /api/authorization/abac-policies/:id
 * Delete ABAC policy
 */
router.delete('/abac-policies/:id', requirePermission('authorization:manage'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM abac_policies WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'ABAC policy not found' });
      return;
    }

    // Clear policy cache
    await AuthorizationService.clearPolicyCache();

    res.json({ message: 'ABAC policy deleted' });
  } catch (error) {
    console.error('Error deleting ABAC policy:', error);
    res.status(500).json({ error: 'Failed to delete ABAC policy' });
  }
});

// ===================================================================
// RESOURCE SENSITIVITY
// ===================================================================

/**
 * PUT /api/authorization/sensitivity/:resourceType/:resourceId
 * Set resource sensitivity classification
 */
router.put('/sensitivity/:resourceType/:resourceId', requirePermission('authorization:manage'), async (req: Request, res: Response) => {
  try {
    const { resourceType, resourceId } = req.params;
    const {
      sensitivity_level,
      compliance_tags = [],
      requires_mfa = false,
      allowed_ip_ranges,
      allowed_time_windows,
      data_classification = {}
    } = req.body;

    if (!sensitivity_level) {
      res.status(400).json({ error: 'sensitivity_level is required' });
      return;
    }

    const validLevels = ['public', 'internal', 'confidential', 'restricted', 'critical'];
    if (!validLevels.includes(sensitivity_level)) {
      res.status(400).json({
        error: 'Invalid sensitivity_level',
        validLevels
      });
      return;
    }

    const result = await pool.query(
      `INSERT INTO resource_sensitivity
       (resource_type, resource_id, sensitivity_level, compliance_tags, requires_mfa,
        allowed_ip_ranges, allowed_time_windows, data_classification, classified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (resource_type, resource_id)
       DO UPDATE SET
         sensitivity_level = $3,
         compliance_tags = $4,
         requires_mfa = $5,
         allowed_ip_ranges = $6,
         allowed_time_windows = $7,
         data_classification = $8,
         classified_by = $9,
         classified_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        resourceType,
        resourceId,
        sensitivity_level,
        compliance_tags,
        requires_mfa,
        allowed_ip_ranges,
        allowed_time_windows,
        data_classification,
        req.user!.id
      ]
    );

    res.json({
      message: 'Resource sensitivity updated',
      sensitivity: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating resource sensitivity:', error);
    res.status(500).json({ error: 'Failed to update resource sensitivity' });
  }
});

/**
 * GET /api/authorization/sensitivity/:resourceType/:resourceId
 * Get resource sensitivity
 */
router.get('/sensitivity/:resourceType/:resourceId', async (req: Request, res: Response) => {
  try {
    const { resourceType, resourceId } = req.params;

    const result = await pool.query(
      `SELECT * FROM resource_sensitivity
       WHERE resource_type = $1 AND resource_id = $2`,
      [resourceType, resourceId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Resource sensitivity not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching resource sensitivity:', error);
    res.status(500).json({ error: 'Failed to fetch resource sensitivity' });
  }
});

// ===================================================================
// PERMISSION DELEGATIONS
// ===================================================================

/**
 * POST /api/authorization/delegations
 * Delegate permissions to another user
 */
router.post('/delegations', async (req: Request, res: Response) => {
  try {
    const {
      delegated_to,
      resource_type,
      resource_id,
      permissions,
      valid_until,
      can_redelegate = false,
      max_uses
    } = req.body;

    if (!delegated_to || !resource_type || !resource_id || !permissions || !valid_until) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['delegated_to', 'resource_type', 'resource_id', 'permissions', 'valid_until']
      });
      return;
    }

    const result = await pool.query(
      `INSERT INTO permission_delegations
       (delegated_by, delegated_to, resource_type, resource_id, permissions,
        valid_until, can_redelegate, max_uses)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.user!.id,
        delegated_to,
        resource_type,
        resource_id,
        permissions,
        valid_until,
        can_redelegate,
        max_uses
      ]
    );

    res.status(201).json({
      message: 'Permissions delegated',
      delegation: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating delegation:', error);
    res.status(500).json({ error: 'Failed to create delegation' });
  }
});

/**
 * GET /api/authorization/delegations/received
 * Get delegations received by current user
 */
router.get('/delegations/received', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT d.*, u.username as delegated_by_username
       FROM permission_delegations d
       JOIN users u ON d.delegated_by = u.id
       WHERE d.delegated_to = $1
         AND d.is_active = true
         AND d.valid_until > CURRENT_TIMESTAMP
       ORDER BY d.created_at DESC`,
      [req.user!.id]
    );

    res.json({
      delegations: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching delegations:', error);
    res.status(500).json({ error: 'Failed to fetch delegations' });
  }
});

/**
 * DELETE /api/authorization/delegations/:id
 * Revoke delegation
 */
router.delete('/delegations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE permission_delegations
       SET is_active = false, revoked_at = CURRENT_TIMESTAMP, revoked_by = $1
       WHERE id = $2 AND (delegated_by = $1 OR delegated_to = $1)
       RETURNING *`,
      [req.user!.id, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Delegation not found or not authorized' });
      return;
    }

    res.json({ message: 'Delegation revoked' });
  } catch (error) {
    console.error('Error revoking delegation:', error);
    res.status(500).json({ error: 'Failed to revoke delegation' });
  }
});

// ===================================================================
// UTILITY ENDPOINTS
// ===================================================================

/**
 * POST /api/authorization/refresh-permissions
 * Refresh materialized permissions for current user
 */
router.post('/refresh-permissions', async (req: Request, res: Response) => {
  try {
    await AuthorizationService.refreshUserPermissions(req.user!.id);

    res.json({ message: 'Permissions refreshed' });
  } catch (error) {
    console.error('Error refreshing permissions:', error);
    res.status(500).json({ error: 'Failed to refresh permissions' });
  }
});

/**
 * POST /api/authorization/clear-cache
 * Clear ABAC policy cache
 */
router.post('/clear-cache', requirePermission('authorization:manage'), async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;

    await AuthorizationService.clearPolicyCache(user_id);

    res.json({ message: 'Policy cache cleared' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

export default router;
