import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../config/logger';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

/**
 * Create dashboard export
 * POST /dashboards/export
 */
router.post('/export', async (req: Request, res: Response) => {
  try {
    const { dashboardId, format, options } = req.body;

    if (!dashboardId || !format) {
      return res.status(400).json({
        error: 'Dashboard ID and format are required'
      });
    }

    const validFormats = ['pdf', 'excel', 'csv', 'powerpoint'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({
        error: `Invalid format. Must be one of: ${validFormats.join(', ')}`
      });
    }

    // Verify dashboard exists
    const dashboardResult = await query(
      `SELECT d.*, COUNT(w.id) as widget_count
       FROM dashboards d
       LEFT JOIN widgets w ON d.id = w.dashboard_id
       WHERE d.id = $1
       GROUP BY d.id`,
      [dashboardId]
    );

    if (dashboardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    const dashboard = dashboardResult.rows[0];

    // Create export record
    const exportResult = await query(
      `INSERT INTO dashboard_exports (
        dashboard_id, format, options, status, user_id
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        dashboardId,
        format,
        JSON.stringify(options || {}),
        'processing',
        req.user?.id || null
      ]
    );

    const exportRecord = exportResult.rows[0];

    // In production, this would trigger an async job to generate the export
    // For now, we'll simulate the export process
    const fileName = `${dashboard.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${format}`;
    const filePath = path.join('/tmp', 'exports', fileName);

    // Simulate export generation delay
    setTimeout(async () => {
      try {
        // Update export status to completed
        await query(
          `UPDATE dashboard_exports
           SET status = 'completed',
               file_path = $1,
               file_size = $2,
               completed_at = NOW()
           WHERE id = $3`,
          [filePath, 1024 * 512, exportRecord.id] // Mock 512KB file
        );

        logger.info(`Export completed: ${exportRecord.id}`);
      } catch (error) {
        logger.error('Failed to complete export', error);
        await query(
          `UPDATE dashboard_exports
           SET status = 'failed', error_message = $1
           WHERE id = $2`,
          ['Export generation failed', exportRecord.id]
        );
      }
    }, 2000);

    res.status(202).json({
      success: true,
      export: exportRecord,
      downloadUrl: `/api/exports/${exportRecord.id}/download`
    });
  } catch (error) {
    logger.error('Failed to create export', error);
    res.status(500).json({ error: 'Failed to create export' });
  }
});

/**
 * Get export status
 * GET /exports/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT de.*, d.name as dashboard_name
       FROM dashboard_exports de
       JOIN dashboards d ON de.dashboard_id = d.id
       WHERE de.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Export not found' });
    }

    const exportRecord = result.rows[0];

    res.json({
      success: true,
      export: {
        ...exportRecord,
        options: JSON.parse(exportRecord.options || '{}'),
        downloadUrl: exportRecord.status === 'completed'
          ? `/api/exports/${exportRecord.id}/download`
          : null
      }
    });
  } catch (error) {
    logger.error('Failed to fetch export', error);
    res.status(500).json({ error: 'Failed to fetch export' });
  }
});

/**
 * Download export file
 * GET /exports/:id/download
 */
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT de.*, d.name as dashboard_name
       FROM dashboard_exports de
       JOIN dashboards d ON de.dashboard_id = d.id
       WHERE de.id = $1 AND de.status = 'completed'`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Export not found or not ready' });
    }

    const exportRecord = result.rows[0];

    // Update download count
    await query(
      `UPDATE dashboard_exports
       SET download_count = download_count + 1
       WHERE id = $1`,
      [id]
    );

    // In production, this would stream the actual file
    // For now, return a mock response
    const mockContent = `Mock ${exportRecord.format.toUpperCase()} export for ${exportRecord.dashboard_name}`;

    const contentTypes = {
      pdf: 'application/pdf',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
      powerpoint: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };

    const fileName = path.basename(exportRecord.file_path || `export.${exportRecord.format}`);

    res.setHeader('Content-Type', contentTypes[exportRecord.format] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(mockContent);
  } catch (error) {
    logger.error('Failed to download export', error);
    res.status(500).json({ error: 'Failed to download export' });
  }
});

/**
 * Get export history for a dashboard
 * GET /dashboards/:dashboardId/exports
 */
router.get('/:dashboardId/exports', async (req: Request, res: Response) => {
  try {
    const { dashboardId } = req.params;
    const { limit = 20 } = req.query;

    const result = await query(
      `SELECT de.*, d.name as dashboard_name
       FROM dashboard_exports de
       JOIN dashboards d ON de.dashboard_id = d.id
       WHERE de.dashboard_id = $1
       ORDER BY de.created_at DESC
       LIMIT $2`,
      [dashboardId, limit]
    );

    const exports = result.rows.map(exp => ({
      ...exp,
      options: JSON.parse(exp.options || '{}'),
      downloadUrl: exp.status === 'completed'
        ? `/api/exports/${exp.id}/download`
        : null
    }));

    res.json({
      success: true,
      exports
    });
  } catch (error) {
    logger.error('Failed to fetch export history', error);
    res.status(500).json({ error: 'Failed to fetch export history' });
  }
});

/**
 * Delete export
 * DELETE /exports/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get export file path before deleting
    const result = await query(
      'SELECT file_path FROM dashboard_exports WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Export not found' });
    }

    const filePath = result.rows[0].file_path;

    // Delete from database
    await query('DELETE FROM dashboard_exports WHERE id = $1', [id]);

    // Delete file if it exists (in production)
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        logger.warn(`Failed to delete export file: ${filePath}`, error);
      }
    }

    res.json({
      success: true,
      message: 'Export deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete export', error);
    res.status(500).json({ error: 'Failed to delete export' });
  }
});

export default router;
