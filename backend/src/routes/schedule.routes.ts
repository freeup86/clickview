/**
 * Schedule Routes
 *
 * REST API endpoints for report scheduling service
 * Handles schedule CRUD, execution, and monitoring
 */

import { Router, Request, Response } from 'express';
import { ScheduleService } from '../services/scheduleService';
import { logger } from '../config/logger';

const router = Router();
const scheduleService = new ScheduleService();

// ===================================================================
// SCHEDULE CRUD OPERATIONS
// ===================================================================

/**
 * POST /api/schedules
 * Create a new schedule
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';

    const schedule = await scheduleService.createSchedule({
      ...req.body,
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      schedule,
    });
  } catch (error: any) {
    logger.error('Failed to create schedule', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create schedule'
    });
  }
});

/**
 * GET /api/schedules
 * List schedules with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const filters: any = {};

    if (req.query.reportId) {
      filters.reportId = req.query.reportId as string;
    }

    if (req.query.enabled !== undefined) {
      filters.enabled = req.query.enabled === 'true';
    }

    if (userId) {
      filters.userId = userId;
    }

    const schedules = await scheduleService.listSchedules(filters);

    res.json({
      success: true,
      schedules,
    });
  } catch (error: any) {
    logger.error('Failed to list schedules', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list schedules'
    });
  }
});

/**
 * GET /api/schedules/:id
 * Get schedule by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const schedule = await scheduleService.getSchedule(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found',
      });
    }

    res.json({
      success: true,
      schedule,
    });
  } catch (error: any) {
    logger.error('Failed to get schedule', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get schedule'
    });
  }
});

/**
 * PUT /api/schedules/:id
 * Update schedule
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const schedule = await scheduleService.updateSchedule(
      req.params.id,
      req.body
    );

    res.json({
      success: true,
      schedule,
    });
  } catch (error: any) {
    logger.error('Failed to update schedule', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update schedule'
    });
  }
});

/**
 * DELETE /api/schedules/:id
 * Delete schedule
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await scheduleService.deleteSchedule(req.params.id);

    res.json({
      success: true,
      message: 'Schedule deleted successfully',
    });
  } catch (error: any) {
    logger.error('Failed to delete schedule', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete schedule'
    });
  }
});

/**
 * PATCH /api/schedules/:id/toggle
 * Toggle schedule enabled/disabled
 */
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'enabled field must be a boolean',
      });
    }

    const schedule = await scheduleService.toggleSchedule(req.params.id, enabled);

    res.json({
      success: true,
      schedule,
    });
  } catch (error: any) {
    logger.error('Failed to toggle schedule', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to toggle schedule'
    });
  }
});

// ===================================================================
// SCHEDULE EXECUTION
// ===================================================================

/**
 * POST /api/schedules/:id/execute
 * Execute a schedule manually
 */
router.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const execution = await scheduleService.executeSchedule(req.params.id);

    res.json({
      success: true,
      execution,
    });
  } catch (error: any) {
    logger.error('Failed to execute schedule', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute schedule'
    });
  }
});

/**
 * GET /api/schedules/:id/history
 * Get execution history for a schedule
 */
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const history = await scheduleService.getExecutionHistory(
      req.params.id,
      limit
    );

    res.json({
      success: true,
      history,
    });
  } catch (error: any) {
    logger.error('Failed to get execution history', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get execution history'
    });
  }
});

/**
 * GET /api/schedules/executions
 * Get recent executions across all schedules
 */
router.get('/executions/recent', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const executions = await scheduleService.getRecentExecutions(limit);

    res.json({
      success: true,
      executions,
    });
  } catch (error: any) {
    logger.error('Failed to get recent executions', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get recent executions'
    });
  }
});

// ===================================================================
// STATISTICS & MONITORING
// ===================================================================

/**
 * GET /api/schedules/stats
 * Get schedule statistics
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.range as '24h' | '7d' | '30d') || '24h';

    const stats = await scheduleService.getStats(timeRange);

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    logger.error('Failed to get stats', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get stats'
    });
  }
});

export default router;
