import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { ClickUpService } from '../services/clickup.service';
import { logger } from '../config/logger';

const router = Router();

// Get spaces for a workspace
router.get('/spaces', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }

    // Get workspace credentials
    const workspaceResult = await query(
      `SELECT encrypted_api_key, api_key_iv, clickup_team_id
       FROM workspaces
       WHERE id = $1 AND is_active = true`,
      [workspaceId]
    );

    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const { encrypted_api_key, api_key_iv, clickup_team_id } = workspaceResult.rows[0];
    
    if (!encrypted_api_key || !api_key_iv) {
      return res.status(400).json({ error: 'Workspace API key not configured' });
    }

    const clickup = new ClickUpService(workspaceId as string, encrypted_api_key, api_key_iv);
    const spaces = await clickup.getSpaces(clickup_team_id);

    res.json({
      success: true,
      data: spaces
    });
  } catch (error) {
    logger.error('Failed to fetch spaces', error);
    res.status(500).json({ error: 'Failed to fetch spaces' });
  }
});

// Get lists for a space
router.get('/lists', async (req: Request, res: Response) => {
  try {
    const { workspaceId, spaceId } = req.query;
    
    if (!workspaceId || !spaceId) {
      return res.status(400).json({ error: 'workspaceId and spaceId are required' });
    }

    // Get workspace credentials
    const workspaceResult = await query(
      `SELECT encrypted_api_key, api_key_iv
       FROM workspaces
       WHERE id = $1 AND is_active = true`,
      [workspaceId]
    );

    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const { encrypted_api_key, api_key_iv } = workspaceResult.rows[0];
    
    if (!encrypted_api_key || !api_key_iv) {
      return res.status(400).json({ error: 'Workspace API key not configured' });
    }

    const clickup = new ClickUpService(workspaceId as string, encrypted_api_key, api_key_iv);
    const lists = await clickup.getSpaceLists(spaceId as string);

    res.json({
      success: true,
      data: lists
    });
  } catch (error) {
    logger.error('Failed to fetch lists', error);
    res.status(500).json({ error: 'Failed to fetch lists' });
  }
});

// Get folders for a space
router.get('/folders', async (req: Request, res: Response) => {
  try {
    const { workspaceId, spaceId } = req.query;
    
    if (!workspaceId || !spaceId) {
      return res.status(400).json({ error: 'workspaceId and spaceId are required' });
    }

    // Get workspace credentials
    const workspaceResult = await query(
      `SELECT encrypted_api_key, api_key_iv
       FROM workspaces
       WHERE id = $1 AND is_active = true`,
      [workspaceId]
    );

    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const { encrypted_api_key, api_key_iv } = workspaceResult.rows[0];
    
    if (!encrypted_api_key || !api_key_iv) {
      return res.status(400).json({ error: 'Workspace API key not configured' });
    }

    const clickup = new ClickUpService(workspaceId as string, encrypted_api_key, api_key_iv);
    const folders = await clickup.getFolders(spaceId as string);

    res.json({
      success: true,
      data: folders
    });
  } catch (error) {
    logger.error('Failed to fetch folders', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// Get folder lists
router.get('/folder-lists', async (req: Request, res: Response) => {
  try {
    const { workspaceId, folderId } = req.query;
    
    if (!workspaceId || !folderId) {
      return res.status(400).json({ error: 'workspaceId and folderId are required' });
    }

    // Get workspace credentials
    const workspaceResult = await query(
      `SELECT encrypted_api_key, api_key_iv
       FROM workspaces
       WHERE id = $1 AND is_active = true`,
      [workspaceId]
    );

    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const { encrypted_api_key, api_key_iv } = workspaceResult.rows[0];
    
    if (!encrypted_api_key || !api_key_iv) {
      return res.status(400).json({ error: 'Workspace API key not configured' });
    }

    const clickup = new ClickUpService(workspaceId as string, encrypted_api_key, api_key_iv);
    const lists = await clickup.getFolderLists(folderId as string);

    res.json({
      success: true,
      data: lists
    });
  } catch (error) {
    logger.error('Failed to fetch folder lists', error);
    res.status(500).json({ error: 'Failed to fetch folder lists' });
  }
});

// Get full hierarchy (spaces, folders, and lists)
router.get('/hierarchy', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }

    // Get workspace credentials
    const workspaceResult = await query(
      `SELECT encrypted_api_key, api_key_iv, clickup_team_id
       FROM workspaces
       WHERE id = $1 AND is_active = true`,
      [workspaceId]
    );

    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const { encrypted_api_key, api_key_iv, clickup_team_id } = workspaceResult.rows[0];
    
    if (!encrypted_api_key || !api_key_iv) {
      return res.status(400).json({ error: 'Workspace API key not configured' });
    }

    const clickup = new ClickUpService(workspaceId as string, encrypted_api_key, api_key_iv);
    
    // Get all spaces
    const spaces = await clickup.getSpaces(clickup_team_id);
    
    // Build hierarchy
    const hierarchy = await Promise.all(spaces.map(async (space: any) => {
      const [folders, lists] = await Promise.all([
        clickup.getFolders(space.id),
        clickup.getLists(space.id)
      ]);
      
      // Get lists for each folder
      const foldersWithLists = await Promise.all(folders.map(async (folder: any) => {
        const folderLists = await clickup.getFolderLists(folder.id);
        return {
          ...folder,
          lists: folderLists
        };
      }));
      
      return {
        id: space.id,
        name: space.name,
        folders: foldersWithLists,
        lists: lists // Space-level lists (not in folders)
      };
    }));

    res.json({
      success: true,
      data: hierarchy
    });
  } catch (error) {
    logger.error('Failed to fetch hierarchy', error);
    res.status(500).json({ error: 'Failed to fetch hierarchy' });
  }
});

export default router;