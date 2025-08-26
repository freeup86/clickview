import { Router, Request, Response } from 'express';
import { query, transaction } from '../config/database';
import { createWidgetSchema, updateWidgetSchema, batchUpdateWidgetsSchema } from '../validation/schemas';
import { logger } from '../config/logger';

const router = Router();

// Create widget
router.post('/', async (req: Request, res: Response) => {
  try {
    const { error, value } = createWidgetSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const result = await query(
      `INSERT INTO widgets (
        dashboard_id, type, title, description, position,
        config, data_config, filters, refresh_interval
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        value.dashboardId,
        value.type,
        value.title,
        value.description || null,
        JSON.stringify(value.position),
        JSON.stringify(value.config || {}),
        JSON.stringify(value.dataConfig),
        JSON.stringify(value.filters || {}),
        value.refreshInterval || null
      ]
    );

    // Create data source if needed
    if (value.dataConfig) {
      await query(
        `INSERT INTO widget_data_sources (
          widget_id, source_type, clickup_space_id, clickup_folder_id,
          clickup_list_id, custom_field_id, aggregation_type,
          group_by, time_group_by, calculated_fields
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          result.rows[0].id,
          value.dataConfig.sourceType,
          value.dataConfig.spaceId || null,
          value.dataConfig.folderId || null,
          value.dataConfig.listId || null,
          value.dataConfig.customFieldId || null,
          value.dataConfig.aggregationType || null,
          value.dataConfig.groupBy || null,
          value.dataConfig.timeGroupBy || null,
          JSON.stringify(value.dataConfig.calculatedFields || [])
        ]
      );
    }

    res.status(201).json({
      success: true,
      widget: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to create widget', error);
    res.status(500).json({ error: 'Failed to create widget' });
  }
});

// Update widget
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error, value } = updateWidgetSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (value.type !== undefined) {
      updates.push(`type = $${paramCount}`);
      values.push(value.type);
      paramCount++;
    }

    if (value.title !== undefined) {
      updates.push(`title = $${paramCount}`);
      values.push(value.title);
      paramCount++;
    }

    if (value.description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(value.description);
      paramCount++;
    }

    if (value.position !== undefined) {
      updates.push(`position = $${paramCount}`);
      values.push(JSON.stringify(value.position));
      paramCount++;
    }

    if (value.config !== undefined) {
      updates.push(`config = $${paramCount}`);
      values.push(JSON.stringify(value.config));
      paramCount++;
    }

    if (value.dataConfig !== undefined) {
      updates.push(`data_config = $${paramCount}`);
      values.push(JSON.stringify(value.dataConfig));
      paramCount++;
    }

    if (value.filters !== undefined) {
      updates.push(`filters = $${paramCount}`);
      values.push(JSON.stringify(value.filters));
      paramCount++;
    }

    if (value.refreshInterval !== undefined) {
      updates.push(`refresh_interval = $${paramCount}`);
      values.push(value.refreshInterval);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    values.push(id);
    const updateQuery = `
      UPDATE widgets 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    // Parse JSON fields
    const widget = {
      ...result.rows[0],
      position: typeof result.rows[0].position === 'string' 
        ? JSON.parse(result.rows[0].position) 
        : result.rows[0].position,
      config: typeof result.rows[0].config === 'string' 
        ? JSON.parse(result.rows[0].config) 
        : result.rows[0].config,
      data_config: typeof result.rows[0].data_config === 'string' 
        ? JSON.parse(result.rows[0].data_config) 
        : result.rows[0].data_config,
      filters: typeof result.rows[0].filters === 'string' 
        ? JSON.parse(result.rows[0].filters) 
        : result.rows[0].filters
    };

    res.json({
      success: true,
      widget
    });
  } catch (error) {
    logger.error('Failed to update widget', error);
    res.status(500).json({ error: 'Failed to update widget' });
  }
});

// Delete widget
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `DELETE FROM widgets WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    res.json({
      success: true,
      message: 'Widget deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete widget', error);
    res.status(500).json({ error: 'Failed to delete widget' });
  }
});

// Update widget position
router.put('/:id/position', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { position } = req.body;

    if (!position || typeof position !== 'object') {
      return res.status(400).json({ error: 'Invalid position data' });
    }

    const result = await query(
      `UPDATE widgets 
       SET position = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(position), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    // Parse JSON fields
    const widget = {
      ...result.rows[0],
      position: typeof result.rows[0].position === 'string' 
        ? JSON.parse(result.rows[0].position) 
        : result.rows[0].position,
      config: typeof result.rows[0].config === 'string' 
        ? JSON.parse(result.rows[0].config) 
        : result.rows[0].config,
      data_config: typeof result.rows[0].data_config === 'string' 
        ? JSON.parse(result.rows[0].data_config) 
        : result.rows[0].data_config,
      filters: typeof result.rows[0].filters === 'string' 
        ? JSON.parse(result.rows[0].filters) 
        : result.rows[0].filters
    };

    res.json({
      success: true,
      widget
    });
  } catch (error) {
    logger.error('Failed to update widget position', error);
    res.status(500).json({ error: 'Failed to update widget position' });
  }
});

// Batch update widgets
router.post('/batch-update', async (req: Request, res: Response) => {
  try {
    const { error, value } = batchUpdateWidgetsSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    logger.info('Batch update request:', {
      widgetCount: value.widgets.length,
      sample: value.widgets[0]
    });

    const updatedWidgets = await transaction(async (client) => {
      const results = [];
      
      for (const widget of value.widgets) {
        if (widget.position) {
          // Ensure minimum dimensions
          const position = {
            x: widget.position.x || 0,
            y: widget.position.y || 0,
            w: Math.max(widget.position.w || 1, 3),
            h: Math.max(widget.position.h || 1, 3)
          };
          
          const result = await client.query(
            `UPDATE widgets 
             SET position = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
            [JSON.stringify(position), widget.id]
          );
          
          if (result.rows.length > 0) {
            results.push(result.rows[0]);
          }
        }
        
        if (widget.config) {
          const result = await client.query(
            `UPDATE widgets 
             SET config = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
            [JSON.stringify(widget.config), widget.id]
          );
          
          if (result.rows.length > 0) {
            results.push(result.rows[0]);
          }
        }
      }
      
      return results;
    });

    // Parse JSON fields for all updated widgets
    const parsedWidgets = updatedWidgets.map(widget => ({
      ...widget,
      position: typeof widget.position === 'string' 
        ? JSON.parse(widget.position) 
        : widget.position,
      config: typeof widget.config === 'string' 
        ? JSON.parse(widget.config) 
        : widget.config,
      data_config: typeof widget.data_config === 'string' 
        ? JSON.parse(widget.data_config) 
        : widget.data_config,
      filters: typeof widget.filters === 'string' 
        ? JSON.parse(widget.filters) 
        : widget.filters
    }));

    res.json({
      success: true,
      widgets: parsedWidgets
    });
  } catch (error) {
    logger.error('Failed to batch update widgets', error);
    res.status(500).json({ error: 'Failed to batch update widgets' });
  }
});

export default router;