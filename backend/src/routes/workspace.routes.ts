import { Router, Request, Response } from 'express';
import { query, transaction } from '../config/database';
import { EncryptionService } from '../config/encryption';
import { ClickUpService } from '../services/clickup.service';
import { cacheService } from '../services/cache.service';
import { createWorkspaceSchema, updateWorkspaceSchema } from '../validation/schemas';
import { logger } from '../config/logger';

const router = Router();

// Create workspace
router.post('/', async (req: Request, res: Response) => {
  try {
    const { error, value } = createWorkspaceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, apiKey, clickupTeamId } = value;

    // Encrypt the API key
    const { encrypted, iv } = EncryptionService.encrypt(apiKey);

    // Validate API key with ClickUp (use null for workspace ID during validation)
    const clickup = new ClickUpService('validation', encrypted, iv);
    const isValid = await clickup.validateApiKey();

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid ClickUp API key' });
    }

    // Get team ID if not provided
    let teamId = clickupTeamId;
    if (!teamId) {
      const teams = await clickup.getTeams();
      if (teams && teams.length > 0) {
        teamId = teams[0].id;
      }
    }

    // Create workspace in database
    const result = await query(
      `INSERT INTO workspaces (name, clickup_team_id, encrypted_api_key, api_key_iv)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, clickup_team_id, is_active, created_at`,
      [name, teamId, encrypted, iv]
    );

    const workspace = result.rows[0];

    res.status(201).json({
      success: true,
      workspace
    });
  } catch (error) {
    logger.error('Failed to create workspace', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

// Get all workspaces
router.get('/', async (req: Request, res: Response) => {
  try {
    // Mock mode for development without database
    if (process.env.USE_MOCK_DATA === 'true') {
      return res.json({
        success: true,
        workspaces: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Demo Workspace',
            clickup_team_id: 'demo_team_1',
            is_active: true,
            last_sync_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
      });
    }

    const result = await query(
      `SELECT id, name, clickup_team_id, is_active, last_sync_at, created_at, updated_at
       FROM workspaces
       WHERE is_active = true
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      workspaces: result.rows
    });
  } catch (error) {
    logger.error('Failed to fetch workspaces', error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

// Get workspace by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, name, clickup_team_id, is_active, last_sync_at, created_at, updated_at
       FROM workspaces
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    res.json({
      success: true,
      workspace: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to fetch workspace', error);
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
});

// Update workspace
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error, value } = updateWorkspaceSchema.validate(req.body);
    
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

    if (value.apiKey !== undefined) {
      const { encrypted, iv } = EncryptionService.encrypt(value.apiKey);
      
      // Validate new API key
      const clickup = new ClickUpService(id, encrypted, iv);
      const isValid = await clickup.validateApiKey();
      
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid ClickUp API key' });
      }

      updates.push(`encrypted_api_key = $${paramCount}, api_key_iv = $${paramCount + 1}`);
      values.push(encrypted, iv);
      paramCount += 2;
    }

    if (value.isActive !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      values.push(value.isActive);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    values.push(id);
    const updateQuery = `
      UPDATE workspaces 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING id, name, clickup_team_id, is_active, last_sync_at, created_at, updated_at
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Invalidate cache for this workspace
    await cacheService.invalidate(id);

    res.json({
      success: true,
      workspace: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to update workspace', error);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

// Delete workspace
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE workspaces 
       SET is_active = false, updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Invalidate all cache for this workspace
    await cacheService.invalidate(id);

    res.json({
      success: true,
      message: 'Workspace deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete workspace', error);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
});

// Validate workspace API key
router.post('/:id/validate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT encrypted_api_key, api_key_iv
       FROM workspaces
       WHERE id = $1 AND is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const { encrypted_api_key, api_key_iv } = result.rows[0];
    const clickup = new ClickUpService(id, encrypted_api_key, api_key_iv);
    const isValid = await clickup.validateApiKey();

    res.json({
      success: true,
      valid: isValid
    });
  } catch (error) {
    logger.error('Failed to validate API key', error);
    res.status(500).json({ error: 'Failed to validate API key' });
  }
});

// Get workspace hierarchy
router.get('/:id/hierarchy', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT encrypted_api_key, api_key_iv, clickup_team_id
       FROM workspaces
       WHERE id = $1 AND is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const { encrypted_api_key, api_key_iv, clickup_team_id } = result.rows[0];

    // Check cache first
    const cacheKey = 'hierarchy';
    const cached = await cacheService.get(id, cacheKey);
    if (cached) {
      return res.json({
        success: true,
        hierarchy: cached,
        fromCache: true
      });
    }

    // Fetch from ClickUp
    const clickup = new ClickUpService(id, encrypted_api_key, api_key_iv);
    const hierarchy = await clickup.getWorkspaceHierarchy(clickup_team_id);

    // Cache for 5 minutes
    await cacheService.set(id, cacheKey, hierarchy, 300);

    res.json({
      success: true,
      hierarchy,
      fromCache: false
    });
  } catch (error) {
    logger.error('Failed to fetch workspace hierarchy', error);
    res.status(500).json({ error: 'Failed to fetch workspace hierarchy' });
  }
});

export default router;