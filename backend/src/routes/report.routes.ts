/**
 * Report Routes
 *
 * REST API endpoints for report builder service
 * Handles report CRUD, execution, and export operations
 */

import { Router, Request, Response } from 'express';
import { ReportBuilderService } from '../services/reportBuilderService';
import { logger } from '../config/logger';

const router = Router();
const reportService = new ReportBuilderService();

// ===================================================================
// REPORT CRUD OPERATIONS
// ===================================================================

/**
 * POST /api/reports
 * Create a new report
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';

    const report = await reportService.createReport({
      ...req.body,
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      report,
    });
  } catch (error: any) {
    logger.error('Failed to create report', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create report'
    });
  }
});

/**
 * GET /api/reports
 * List reports with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const filters = {
      userId,
      category: req.query.category as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      search: req.query.search as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await reportService.listReports(filters);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    logger.error('Failed to list reports', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list reports'
    });
  }
});

/**
 * GET /api/reports/:id
 * Get report by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const report = await reportService.getReport(req.params.id, userId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    res.json({
      success: true,
      report,
    });
  } catch (error: any) {
    logger.error('Failed to get report', error);

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get report'
    });
  }
});

/**
 * PUT /api/reports/:id
 * Update report
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';

    const report = await reportService.updateReport(
      req.params.id,
      req.body,
      userId
    );

    res.json({
      success: true,
      report,
    });
  } catch (error: any) {
    logger.error('Failed to update report', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update report'
    });
  }
});

/**
 * DELETE /api/reports/:id
 * Delete report
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';

    await reportService.deleteReport(req.params.id, userId);

    res.json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error: any) {
    logger.error('Failed to delete report', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete report'
    });
  }
});

/**
 * POST /api/reports/:id/duplicate
 * Duplicate report
 */
router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';
    const newName = req.body.name;

    const report = await reportService.duplicateReport(
      req.params.id,
      userId,
      newName
    );

    res.status(201).json({
      success: true,
      report,
    });
  } catch (error: any) {
    logger.error('Failed to duplicate report', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to duplicate report'
    });
  }
});

// ===================================================================
// REPORT ELEMENT OPERATIONS
// ===================================================================

/**
 * POST /api/reports/:id/elements
 * Add element to report
 */
router.post('/:id/elements', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';

    const report = await reportService.addElement(
      req.params.id,
      req.body,
      userId
    );

    res.status(201).json({
      success: true,
      report,
    });
  } catch (error: any) {
    logger.error('Failed to add element', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add element'
    });
  }
});

/**
 * PUT /api/reports/:id/elements/:elementId
 * Update element in report
 */
router.put('/:id/elements/:elementId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';

    const report = await reportService.updateElement(
      req.params.id,
      req.params.elementId,
      req.body,
      userId
    );

    res.json({
      success: true,
      report,
    });
  } catch (error: any) {
    logger.error('Failed to update element', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update element'
    });
  }
});

/**
 * DELETE /api/reports/:id/elements/:elementId
 * Delete element from report
 */
router.delete('/:id/elements/:elementId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';

    const report = await reportService.deleteElement(
      req.params.id,
      req.params.elementId,
      userId
    );

    res.json({
      success: true,
      report,
    });
  } catch (error: any) {
    logger.error('Failed to delete element', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete element'
    });
  }
});

// ===================================================================
// REPORT EXECUTION
// ===================================================================

/**
 * POST /api/reports/:id/execute
 * Execute report and fetch all data
 */
router.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const parameters = req.body.parameters || {};

    const result = await reportService.executeReport(req.params.id, parameters);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    logger.error('Failed to execute report', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute report'
    });
  }
});

// ===================================================================
// REPORT EXPORT
// ===================================================================

/**
 * GET /api/reports/:id/export/pdf
 * Export report as PDF
 */
router.get('/:id/export/pdf', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const pdfBuffer = await reportService.exportToPDF(req.params.id, userId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${req.params.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    logger.error('Failed to export PDF', error);

    if (error.message.includes('not yet implemented')) {
      return res.status(501).json({
        success: false,
        error: 'PDF export not yet implemented'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export PDF'
    });
  }
});

/**
 * GET /api/reports/:id/export/excel
 * Export report as Excel
 */
router.get('/:id/export/excel', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const excelBuffer = await reportService.exportToExcel(req.params.id, userId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="report-${req.params.id}.xlsx"`);
    res.send(excelBuffer);
  } catch (error: any) {
    logger.error('Failed to export Excel', error);

    if (error.message.includes('not yet implemented')) {
      return res.status(501).json({
        success: false,
        error: 'Excel export not yet implemented'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export Excel'
    });
  }
});

export default router;
