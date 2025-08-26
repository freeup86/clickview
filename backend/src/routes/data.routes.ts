import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { ClickUpService } from '../services/clickup.service';
import { DataAggregationService } from '../services/data-aggregation.service';
import { cacheService } from '../services/cache.service';
import { dataQuerySchema } from '../validation/schemas';
import { logger } from '../config/logger';

const router = Router();

// Get aggregated data
router.get('/aggregate', async (req: Request, res: Response) => {
  try {
    // Parse dataConfig if it's a string
    const queryWithParsedDataConfig = {
      ...req.query,
      dataConfig: req.query.dataConfig 
        ? (typeof req.query.dataConfig === 'string' 
          ? JSON.parse(req.query.dataConfig) 
          : req.query.dataConfig)
        : undefined
    };
    
    const { error, value } = dataQuerySchema.validate(queryWithParsedDataConfig);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const {
      workspaceId,
      sourceType,
      spaceId,
      folderId,
      listId,
      filters,
      aggregationType,
      groupBy,
      timeGroupBy,
      startDate,
      endDate,
      dataConfig,
    } = value;

    // Create cache key
    const cacheKey = `aggregate:${sourceType}:${spaceId || ''}:${listId || ''}:${JSON.stringify(filters)}`;
    
    // DISABLED: Skip cache to always get fresh data
    // const cached = await cacheService.get(workspaceId, cacheKey);
    // if (cached) {
    //   return res.json({
    //     success: true,
    //     data: cached,
    //     fromCache: true
    //   });
    // }

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
    
    // Validate that we have the encryption data
    if (!encrypted_api_key || !api_key_iv) {
      logger.error('Missing API key encryption data for workspace', { workspaceId });
      return res.status(500).json({ error: 'Workspace not properly configured' });
    }
    
    const clickup = new ClickUpService(workspaceId, encrypted_api_key, api_key_iv);

    let rawData: any[] = [];

    // Fetch data based on source type
    switch (sourceType) {
      case 'tasks':
        // Use stored tasks from database instead of ClickUp API
        let taskQuery = `
          SELECT 
            task_id as id,
            task_name as name,
            status,
            task_content as description,
            assignee,
            priority,
            due_date,
            start_date,
            date_created,
            date_updated,
            date_closed,
            date_done,
            created_by,
            space,
            space_id,
            folder,
            list,
            list_id,
            tags,
            time_estimate,
            development_status,
            value_stream,
            overdue_status,
            overall_due_date,
            modalities
          FROM tasks 
          WHERE workspace_id = $1
        `;
        const taskParams: any[] = [workspaceId];
        let paramCount = 1;

        // Filter by specific list or space ID
        if (listId && listId.trim() !== '') {
          taskQuery += ` AND list_id = $${++paramCount}`;
          taskParams.push(listId);
        } else if (spaceId && spaceId.trim() !== '') {
          taskQuery += ` AND space_id = $${++paramCount}`;
          taskParams.push(spaceId);
        }

        if (startDate) {
          taskQuery += ` AND date_created >= $${++paramCount}`;
          taskParams.push(new Date(startDate));
        }

        if (endDate) {
          taskQuery += ` AND date_created <= $${++paramCount}`;
          taskParams.push(new Date(endDate));
        }

        const taskResult = await query(taskQuery, taskParams);
        
        // Transform database records to match expected format
        rawData = taskResult.rows.map((row: any) => ({
          ...row,
          status: typeof row.status === 'object' ? row.status : { status: row.status },
          assignees: row.assignee ? row.assignee.split(',').map((a: string) => ({ username: a.trim() })) : [],
          priority: row.priority ? { priority: row.priority } : null,
          tags: row.tags || [],
        }));
        break;

      case 'time_tracking':
        rawData = await clickup.getTimeEntries(clickup_team_id, {
          start_date: startDate ? new Date(startDate).getTime() : undefined,
          end_date: endDate ? new Date(endDate).getTime() : undefined,
          space_id: spaceId,
          folder_id: folderId,
          list_id: listId,
        });
        break;

      case 'custom_fields':
        if (listId && listId.trim() !== '') {
          rawData = await clickup.getCustomFields(listId);
        } else {
          return res.status(400).json({ error: 'listId is required for custom fields' });
        }
        break;

      default:
        return res.status(400).json({ error: 'Invalid source type' });
    }

    // Handle special case for task completion comparison
    let aggregatedData;
    
    if (dataConfig?.comparisonDateField && sourceType === 'tasks') {
      // Create forecast data from comparisonDateField (due_date)
      const forecastData = rawData
        .filter(item => item[dataConfig.comparisonDateField])
        .map(item => ({
          ...item,
          _date_for_grouping: item[dataConfig.comparisonDateField],
          _series_type: 'forecast'
        }));
      
      // Create actual data from dateField (date_done)
      const actualData = rawData
        .filter(item => item[dataConfig.dateField])
        .map(item => ({
          ...item,
          _date_for_grouping: item[dataConfig.dateField],
          _series_type: 'actual'
        }));
      
      // Aggregate forecast data
      const forecastAgg = DataAggregationService.aggregate({
        sourceData: forecastData,
        aggregationType: aggregationType || 'count',
        field: '_date_for_grouping',
        groupBy: dataConfig.groupBy || groupBy,
        timeGroupBy: dataConfig.timeGroupBy || timeGroupBy,
        filters: filters || [],
        dateField: '_date_for_grouping',
        calculatedFields: [],
      });
      
      // Aggregate actual data
      const actualAgg = DataAggregationService.aggregate({
        sourceData: actualData,
        aggregationType: aggregationType || 'count',
        field: '_date_for_grouping',
        groupBy: dataConfig.groupBy || groupBy,
        timeGroupBy: dataConfig.timeGroupBy || timeGroupBy,
        filters: filters || [],
        dateField: '_date_for_grouping',
        calculatedFields: [],
      });
      
      // Combine into multi-series format
      const grouped = new Map();
      
      forecastAgg.forEach(item => {
        grouped.set(item.group, {
          group: item.group,
          forecast: item.value,
          actual: 0
        });
      });
      
      actualAgg.forEach(item => {
        if (grouped.has(item.group)) {
          grouped.get(item.group).actual = item.value;
        } else {
          grouped.set(item.group, {
            group: item.group,
            forecast: 0,
            actual: item.value
          });
        }
      });
      
      aggregatedData = Array.from(grouped.values());
      
      // Sort by day of week if applicable
      if (dataConfig.groupBy === 'day_of_week') {
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'No Date'];
        aggregatedData.sort((a, b) => {
          const indexA = dayOrder.indexOf(a.group);
          const indexB = dayOrder.indexOf(b.group);
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
          return 0;
        });
      }
    } else {
      // Standard aggregation
      aggregatedData = DataAggregationService.aggregate({
        sourceData: rawData,
        aggregationType: aggregationType || 'count',
        field: groupBy,
        groupBy,
        timeGroupBy,
        filters: filters || [],
        dateField: dataConfig?.dateField,
        calculatedFields: [],
      });
    }

    // DISABLED: Don't cache to ensure fresh data
    // await cacheService.set(workspaceId, cacheKey, aggregatedData, 300);

    res.json({
      success: true,
      data: aggregatedData,
      fromCache: false
    });
  } catch (error: any) {
    logger.error('Failed to get aggregated data', {
      error: error.message,
      stack: error.stack,
      workspaceId: req.query.workspaceId,
      sourceType: req.query.sourceType
    });
    
    // Return more detailed error for debugging
    const errorMessage = error.response?.data?.err || error.message || 'Failed to get aggregated data';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        endpoint: error.config?.url,
        status: error.response?.status
      } : undefined
    });
  }
});

// Get tasks
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const { workspaceId, listId } = req.query;

    if (!workspaceId || !listId) {
      return res.status(400).json({ error: 'Missing required parameters' });
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
    const clickup = new ClickUpService(workspaceId as string, encrypted_api_key, api_key_iv);

    const tasks = await clickup.getTasks(listId as string, {
      include_closed: true,
    });

    res.json({
      success: true,
      tasks
    });
  } catch (error: any) {
    logger.error('Failed to get tasks', {
      error: error.message,
      workspaceId: req.query.workspaceId,
      listId: req.query.listId
    });
    
    const errorMessage = error.response?.data?.err || error.message || 'Failed to get tasks';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        endpoint: error.config?.url,
        status: error.response?.status
      } : undefined
    });
  }
});

// Get custom fields
router.get('/custom-fields', async (req: Request, res: Response) => {
  try {
    const { workspaceId, listId } = req.query;

    if (!workspaceId || !listId) {
      return res.status(400).json({ error: 'Missing required parameters' });
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
    const clickup = new ClickUpService(workspaceId as string, encrypted_api_key, api_key_iv);

    const fields = await clickup.getCustomFields(listId as string);

    res.json({
      success: true,
      fields
    });
  } catch (error: any) {
    logger.error('Failed to get custom fields', {
      error: error.message,
      workspaceId: req.query.workspaceId,
      listId: req.query.listId
    });
    
    const errorMessage = error.response?.data?.err || error.message || 'Failed to get custom fields';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        endpoint: error.config?.url,
        status: error.response?.status
      } : undefined
    });
  }
});

// Refresh data
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { workspaceId, dashboardId } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    // Clear cache for workspace
    await cacheService.invalidate(workspaceId);

    // Update last refresh timestamp if dashboard ID provided
    if (dashboardId) {
      await query(
        `UPDATE dashboards 
         SET last_refresh_at = NOW()
         WHERE id = $1`,
        [dashboardId]
      );
    }

    res.json({
      success: true,
      message: 'Data refreshed successfully'
    });
  } catch (error) {
    logger.error('Failed to refresh data', error);
    res.status(500).json({ error: 'Failed to refresh data' });
  }
});

export default router;