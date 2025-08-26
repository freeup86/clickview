import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { ClickUpService } from '../services/clickup.service';
import { logger } from '../config/logger';
import * as XLSX from 'xlsx';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Helper function to convert Excel date to JavaScript date
function excelDateToJSDate(excelDate: number | string | undefined): Date | null {
  if (!excelDate) return null;
  if (typeof excelDate === 'string') {
    const parsed = Date.parse(excelDate);
    return isNaN(parsed) ? null : new Date(parsed);
  }
  // Excel dates start from 1900-01-01
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return isNaN(date.getTime()) ? null : date;
}

// Helper function to parse JSON arrays from string
function parseJsonArray(value: string | undefined): any[] | null {
  if (!value || value.trim() === '') return null;
  try {
    // Handle newline-separated values
    if (value.includes('\n')) {
      return value.split('\n').map(v => v.trim()).filter(v => v);
    }
    // Handle comma-separated values
    if (value.includes(',')) {
      return value.split(',').map(v => v.trim()).filter(v => v);
    }
    // Single value
    return [value.trim()];
  } catch {
    return null;
  }
}

// Get all tasks for a workspace
router.get('/', async (req: Request, res: Response) => {
  try {
    const { workspaceId, listId, spaceId, status, assignee, limit = 100, offset = 0 } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    let queryText = `
      SELECT * FROM tasks 
      WHERE workspace_id = $1
    `;
    const queryParams: any[] = [workspaceId];
    let paramCount = 1;

    if (listId) {
      queryText += ` AND list_id = $${++paramCount}`;
      queryParams.push(listId);
    }

    if (spaceId) {
      queryText += ` AND space_id = $${++paramCount}`;
      queryParams.push(spaceId);
    }

    if (status) {
      queryText += ` AND status = $${++paramCount}`;
      queryParams.push(status);
    }

    if (assignee) {
      queryText += ` AND assignee = $${++paramCount}`;
      queryParams.push(assignee);
    }

    queryText += ` ORDER BY date_created DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) FROM tasks 
      WHERE workspace_id = $1
    `;
    const countParams: any[] = [workspaceId];
    let countParamIndex = 1;

    if (listId) {
      countQuery += ` AND list_id = $${++countParamIndex}`;
      countParams.push(listId);
    }

    if (spaceId) {
      countQuery += ` AND space_id = $${++countParamIndex}`;
      countParams.push(spaceId);
    }

    if (status) {
      countQuery += ` AND status = $${++countParamIndex}`;
      countParams.push(status);
    }

    if (assignee) {
      countQuery += ` AND assignee = $${++countParamIndex}`;
      countParams.push(assignee);
    }

    const countResult = await query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      tasks: result.rows,
      total: totalCount,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error: any) {
    logger.error('Failed to get tasks', { error: error.message });
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Upload tasks from Excel file
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.body;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    // Start sync history record
    const syncId = uuidv4();
    await query(
      `INSERT INTO task_sync_history (id, workspace_id, sync_type, sync_started_at, status)
       VALUES ($1, $2, $3, NOW(), $4)`,
      [syncId, workspaceId, 'excel_upload', 'in_progress']
    );

    let tasksCreated = 0;
    let tasksUpdated = 0;
    let errors: string[] = [];

    // Process each row
    for (const row of jsonData) {
      try {
        const taskData: any = row;
        
        // Check if task already exists
        const existingTask = await query(
          'SELECT id FROM tasks WHERE task_id = $1 AND workspace_id = $2',
          [taskData['Task ID'], workspaceId]
        );

        if (existingTask.rows.length > 0) {
          // Update existing task
          await query(
            `UPDATE tasks SET
              task_name = $1,
              status = $2,
              task_content = $3,
              assignee = $4,
              priority = $5,
              latest_comment = $6,
              comment_count = $7,
              assigned_comment_count = $8,
              due_date = $9,
              start_date = $10,
              date_created = $11,
              date_updated = $12,
              date_closed = $13,
              date_done = $14,
              created_by = $15,
              space = $16,
              folder = $17,
              list = $18,
              subtask_ids = $19,
              subtask_urls = $20,
              tags = $21,
              lists = $22,
              time_in_status = $23,
              points_estimate_rolled_up = $24,
              alpha_draft_date = $25,
              at_risk_checkbox = $26,
              development_status = $27,
              itc_phase = $28,
              l2_substream = $29,
              l3_labels = $30,
              modalities = $31,
              number_of_screens = $32,
              overall_due_date = $33,
              overdue_status = $34,
              progress_updates = $35,
              value_stream = $36,
              value_stream_lead = $37,
              last_synced_at = NOW(),
              updated_at = NOW()
            WHERE task_id = $38 AND workspace_id = $39`,
            [
              taskData['Task Name'],
              taskData['Status'],
              taskData['Task Content'] || '',
              taskData['Assignee'] || null,
              taskData['Priority'],
              taskData['Latest Comment'] || null,
              parseInt(taskData['Comment Count']) || 0,
              parseInt(taskData['Assigned Comment Count']) || 0,
              excelDateToJSDate(taskData['Due Date']),
              excelDateToJSDate(taskData['Start Date']),
              excelDateToJSDate(taskData['Date Created']),
              excelDateToJSDate(taskData['Date Updated']),
              excelDateToJSDate(taskData['Date Closed']),
              excelDateToJSDate(taskData['Date Done']),
              taskData['Created By'] || null,
              taskData['Space'],
              taskData['Folder'],
              taskData['List'],
              JSON.stringify(parseJsonArray(taskData["Subtask ID's"])),
              JSON.stringify(parseJsonArray(taskData["Subtask URL's"])),
              JSON.stringify(parseJsonArray(taskData['tags'])),
              JSON.stringify(parseJsonArray(taskData['Lists'])),
              taskData['Time In Status'] || null,
              parseFloat(taskData['Points Estimate Rolled Up']) || 0,
              excelDateToJSDate(taskData['Alpha Draft (date)']),
              taskData['At risk? (checkbox)'] === 'TRUE' || taskData['At risk? (checkbox)'] === true,
              taskData['Development Status (drop down)'] || null,
              taskData['ITC Phase (drop down)'] || null,
              taskData['L2 / Substream (drop down)'] || null,
              JSON.stringify(parseJsonArray(taskData['L3 (labels)'])),
              JSON.stringify(parseJsonArray(taskData['Modalities (labels)'])),
              parseInt(taskData['Number of Screens (number)']) || null,
              excelDateToJSDate(taskData['Overall Due Date (date)']),
              taskData['Overdue Status (drop down)'] || null,
              taskData['Progress Updates (text)'] || null,
              taskData['Value Stream (drop down)'] || null,
              JSON.stringify(parseJsonArray(taskData['Value Stream Lead (users)'])),
              taskData['Task ID'],
              workspaceId
            ]
          );
          tasksUpdated++;
        } else {
          // Insert new task
          await query(
            `INSERT INTO tasks (
              workspace_id, task_id, task_name, status, task_content, assignee, priority,
              latest_comment, comment_count, assigned_comment_count,
              due_date, start_date, date_created, date_updated, date_closed, date_done,
              created_by, space, folder, list,
              subtask_ids, subtask_urls, tags, lists,
              time_in_status, points_estimate_rolled_up,
              alpha_draft_date, at_risk_checkbox, development_status,
              itc_phase, l2_substream, l3_labels, modalities,
              number_of_screens, overall_due_date, overdue_status,
              progress_updates, value_stream, value_stream_lead
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
              $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
              $31, $32, $33, $34, $35, $36, $37, $38, $39
            )`,
            [
              workspaceId,
              taskData['Task ID'],
              taskData['Task Name'],
              taskData['Status'],
              taskData['Task Content'] || '',
              taskData['Assignee'] || null,
              taskData['Priority'],
              taskData['Latest Comment'] || null,
              parseInt(taskData['Comment Count']) || 0,
              parseInt(taskData['Assigned Comment Count']) || 0,
              excelDateToJSDate(taskData['Due Date']),
              excelDateToJSDate(taskData['Start Date']),
              excelDateToJSDate(taskData['Date Created']),
              excelDateToJSDate(taskData['Date Updated']),
              excelDateToJSDate(taskData['Date Closed']),
              excelDateToJSDate(taskData['Date Done']),
              taskData['Created By'] || null,
              taskData['Space'],
              taskData['Folder'],
              taskData['List'],
              JSON.stringify(parseJsonArray(taskData["Subtask ID's"])),
              JSON.stringify(parseJsonArray(taskData["Subtask URL's"])),
              JSON.stringify(parseJsonArray(taskData['tags'])),
              JSON.stringify(parseJsonArray(taskData['Lists'])),
              taskData['Time In Status'] || null,
              parseFloat(taskData['Points Estimate Rolled Up']) || 0,
              excelDateToJSDate(taskData['Alpha Draft (date)']),
              taskData['At risk? (checkbox)'] === 'TRUE' || taskData['At risk? (checkbox)'] === true,
              taskData['Development Status (drop down)'] || null,
              taskData['ITC Phase (drop down)'] || null,
              taskData['L2 / Substream (drop down)'] || null,
              JSON.stringify(parseJsonArray(taskData['L3 (labels)'])),
              JSON.stringify(parseJsonArray(taskData['Modalities (labels)'])),
              parseInt(taskData['Number of Screens (number)']) || null,
              excelDateToJSDate(taskData['Overall Due Date (date)']),
              taskData['Overdue Status (drop down)'] || null,
              taskData['Progress Updates (text)'] || null,
              taskData['Value Stream (drop down)'] || null,
              JSON.stringify(parseJsonArray(taskData['Value Stream Lead (users)']))
            ]
          );
          tasksCreated++;
        }
      } catch (error: any) {
        logger.error('Failed to process task', { error: error.message, taskId: (row as any)['Task ID'] });
        errors.push(`Task ${(row as any)['Task ID']}: ${error.message}`);
      }
    }

    // Update sync history
    await query(
      `UPDATE task_sync_history SET
        tasks_synced = $1,
        tasks_created = $2,
        tasks_updated = $3,
        sync_completed_at = NOW(),
        status = $4,
        error_message = $5
      WHERE id = $6`,
      [
        jsonData.length,
        tasksCreated,
        tasksUpdated,
        errors.length > 0 ? 'completed_with_errors' : 'completed',
        errors.length > 0 ? JSON.stringify(errors) : null,
        syncId
      ]
    );

    res.json({
      success: true,
      message: 'Tasks uploaded successfully',
      summary: {
        total: jsonData.length,
        created: tasksCreated,
        updated: tasksUpdated,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    logger.error('Failed to upload tasks', { error: error.message });
    res.status(500).json({ error: 'Failed to upload tasks: ' + error.message });
  }
});

// Sync tasks from ClickUp API
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { workspaceId, listId, spaceId, syncAll } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    // If syncAll is true, we'll fetch all tasks from all spaces
    if (!syncAll && !listId && !spaceId) {
      return res.status(400).json({ error: 'Either List ID, Space ID, or syncAll flag is required' });
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
      logger.error('Missing API key encryption data for workspace', { workspaceId });
      return res.status(500).json({ error: 'Workspace not properly configured' });
    }
    
    const clickup = new ClickUpService(workspaceId, encrypted_api_key, api_key_iv);

    // Start sync history record
    const syncId = uuidv4();
    await query(
      `INSERT INTO task_sync_history (id, workspace_id, sync_type, sync_started_at, status, metadata)
       VALUES ($1, $2, $3, NOW(), $4, $5)`,
      [syncId, workspaceId, 'api_sync', 'in_progress', JSON.stringify({ listId, spaceId })]
    );

    let tasks: any[] = [];

    // Fetch tasks from ClickUp
    if (syncAll) {
      // Fetch all spaces first
      const spacesResponse = await clickup.getSpaces(clickup_team_id);
      logger.info(`Fetching tasks from ${spacesResponse.length} spaces`);
      
      for (const space of spacesResponse) {
        try {
          const spaceTasks = await clickup.getAllTasksFromSpace(space.id, {
            include_closed: true,
          });
          tasks = tasks.concat(spaceTasks);
          logger.info(`Fetched ${spaceTasks.length} tasks from space: ${space.name}`);
        } catch (error: any) {
          logger.error(`Failed to fetch tasks from space ${space.name}:`, error.message);
        }
      }
    } else if (listId) {
      tasks = await clickup.getTasks(listId, {
        include_closed: true,
      });
    } else if (spaceId) {
      tasks = await clickup.getAllTasksFromSpace(spaceId, {
        include_closed: true,
      });
    }

    let tasksCreated = 0;
    let tasksUpdated = 0;

    // Process each task
    for (const task of tasks) {
      try {
        // Check if task exists
        const existingTask = await query(
          'SELECT id FROM tasks WHERE task_id = $1 AND workspace_id = $2',
          [task.id, workspaceId]
        );

        // Helper function to extract custom field value
        const getCustomFieldValue = (fieldName: string, fieldType: string = 'text') => {
          const field = task.custom_fields?.find((f: any) => 
            f.name?.toLowerCase().includes(fieldName.toLowerCase())
          );
          if (!field) return null;
          
          if (fieldType === 'date' && field.value) {
            // ClickUp dates are in milliseconds
            return new Date(parseInt(field.value));
          } else if (fieldType === 'checkbox') {
            return field.value === 'true' || field.value === true;
          } else if (fieldType === 'number' && field.value) {
            return parseFloat(field.value);
          } else if (fieldType === 'users' && field.value) {
            // Users field might be an array or comma-separated
            return Array.isArray(field.value) ? 
              JSON.stringify(field.value) : 
              JSON.stringify(field.value.split(',').map((u: string) => u.trim()));
          } else if (fieldType === 'labels' && field.value) {
            return JSON.stringify(Array.isArray(field.value) ? field.value : [field.value]);
          }
          return field.value || null;
        };

        const taskData = {
          task_id: task.id,
          task_name: task.name,
          status: task.status?.status || task.status,
          task_content: task.description || '',
          assignee: task.assignees?.map((a: any) => a.username).join(', ') || null,
          priority: task.priority?.priority || null,
          due_date: task.due_date ? new Date(parseInt(task.due_date)) : null,
          start_date: task.start_date ? new Date(parseInt(task.start_date)) : null,
          date_created: task.date_created ? new Date(parseInt(task.date_created)) : null,
          date_updated: task.date_updated ? new Date(parseInt(task.date_updated)) : null,
          date_closed: task.date_closed ? new Date(parseInt(task.date_closed)) : null,
          date_done: task.date_done ? new Date(parseInt(task.date_done)) : null,
          created_by: task.creator?.username || null,
          space: task.space?.name || 'Unknown',
          space_id: task.space?.id || spaceId || null,
          folder: task.folder?.name || null,
          list: task.list?.name || 'Unknown',
          list_id: task.list?.id || listId || null,
          tags: JSON.stringify(task.tags?.map((t: any) => t.name) || []),
          time_estimate: task.time_estimate ? (task.time_estimate / 3600000).toString() : null,
          
          // Comments
          comment_count: task.comment_count || 0,
          
          // Subtasks
          subtask_ids: task.subtasks ? JSON.stringify(task.subtasks.map((s: any) => s.id)) : null,
          
          // Custom fields mapping
          alpha_draft_date: getCustomFieldValue('alpha draft', 'date'),
          alpha_review_date: getCustomFieldValue('alpha review', 'date'),
          at_risk_checkbox: getCustomFieldValue('at risk', 'checkbox'),
          beta_review_date: getCustomFieldValue('beta review', 'date'),
          beta_revision_date: getCustomFieldValue('beta revision', 'date'),
          design_priority: getCustomFieldValue('design priority'),
          developer: getCustomFieldValue('developer', 'users'),
          development_status: getCustomFieldValue('development status'),
          final_review_sign_off_date: getCustomFieldValue('final review', 'date'),
          final_revision_received_date: getCustomFieldValue('final revision', 'date'),
          graphics_design_request_checkbox: getCustomFieldValue('graphics', 'checkbox'),
          itc_phase: getCustomFieldValue('itc phase'),
          l2_substream: getCustomFieldValue('l2', 'text') || getCustomFieldValue('substream', 'text'),
          l3_labels: getCustomFieldValue('l3', 'labels'),
          l3_script_available_checkbox: getCustomFieldValue('l3 script', 'checkbox'),
          modalities: getCustomFieldValue('modalities', 'labels'),
          number_of_screens: getCustomFieldValue('screens', 'number'),
          overall_due_date: getCustomFieldValue('overall due', 'date'),
          overdue_status: getCustomFieldValue('overdue status'),
          progress_updates: getCustomFieldValue('progress updates'),
          qa_users: getCustomFieldValue('qa', 'users'),
          qa_date: getCustomFieldValue('qa', 'date'),
          qa_lm_users: getCustomFieldValue('qa (lm)', 'users'),
          ready_to_be_assigned_checkbox: getCustomFieldValue('ready to be assigned', 'checkbox'),
          release_status: getCustomFieldValue('release status'),
          roles: getCustomFieldValue('roles', 'labels'),
          sme_approver: getCustomFieldValue('sme', 'labels') || getCustomFieldValue('approver', 'labels'),
          script_received_date: getCustomFieldValue('script received', 'date'),
          sign_off_received_date: getCustomFieldValue('sign off', 'date'),
          start_date_custom: getCustomFieldValue('start date', 'date'),
          submit_first_draft_date: getCustomFieldValue('submit', 'date') || getCustomFieldValue('1st draft', 'date'),
          t_codes: getCustomFieldValue('t-codes', 'labels') || getCustomFieldValue('tcodes', 'labels'),
          target_close_date: getCustomFieldValue('target close', 'date'),
          temp_archived_checkbox: getCustomFieldValue('temparchived', 'checkbox') || getCustomFieldValue('archived', 'checkbox'),
          value_stream: getCustomFieldValue('value stream'),
          value_stream_lead: getCustomFieldValue('value stream lead', 'users'),
        };

        if (existingTask.rows.length > 0) {
          // Update existing task with all fields
          await query(
            `UPDATE tasks SET
              task_name = $1, status = $2, task_content = $3, assignee = $4, priority = $5,
              due_date = $6, start_date = $7, date_created = $8, date_updated = $9,
              date_closed = $10, date_done = $11, created_by = $12,
              space = $13, folder = $14, list = $15, space_id = $16, list_id = $17, tags = $18, time_estimate = $19,
              comment_count = $20, subtask_ids = $21,
              alpha_draft_date = $22, alpha_review_date = $23, at_risk_checkbox = $24,
              beta_review_date = $25, beta_revision_date = $26, design_priority = $27,
              developer = $28, development_status = $29, final_review_sign_off_date = $30,
              final_revision_received_date = $31, graphics_design_request_checkbox = $32,
              itc_phase = $33, l2_substream = $34, l3_labels = $35, l3_script_available_checkbox = $36,
              modalities = $37, number_of_screens = $38, overall_due_date = $39,
              overdue_status = $40, progress_updates = $41, qa_users = $42, qa_date = $43,
              qa_lm_users = $44, ready_to_be_assigned_checkbox = $45, release_status = $46,
              roles = $47, sme_approver = $48, script_received_date = $49,
              sign_off_received_date = $50, start_date_custom = $51, submit_first_draft_date = $52,
              t_codes = $53, target_close_date = $54, temp_archived_checkbox = $55,
              value_stream = $56, value_stream_lead = $57,
              last_synced_at = NOW()
            WHERE task_id = $58 AND workspace_id = $59`,
            [
              taskData.task_name, taskData.status, taskData.task_content, taskData.assignee, taskData.priority,
              taskData.due_date, taskData.start_date, taskData.date_created, taskData.date_updated,
              taskData.date_closed, taskData.date_done, taskData.created_by,
              taskData.space, taskData.folder, taskData.list, taskData.space_id, taskData.list_id, taskData.tags, taskData.time_estimate,
              taskData.comment_count, taskData.subtask_ids,
              taskData.alpha_draft_date, taskData.alpha_review_date, taskData.at_risk_checkbox,
              taskData.beta_review_date, taskData.beta_revision_date, taskData.design_priority,
              taskData.developer, taskData.development_status, taskData.final_review_sign_off_date,
              taskData.final_revision_received_date, taskData.graphics_design_request_checkbox,
              taskData.itc_phase, taskData.l2_substream, taskData.l3_labels, taskData.l3_script_available_checkbox,
              taskData.modalities, taskData.number_of_screens, taskData.overall_due_date,
              taskData.overdue_status, taskData.progress_updates, taskData.qa_users, taskData.qa_date,
              taskData.qa_lm_users, taskData.ready_to_be_assigned_checkbox, taskData.release_status,
              taskData.roles, taskData.sme_approver, taskData.script_received_date,
              taskData.sign_off_received_date, taskData.start_date_custom, taskData.submit_first_draft_date,
              taskData.t_codes, taskData.target_close_date, taskData.temp_archived_checkbox,
              taskData.value_stream, taskData.value_stream_lead,
              task.id,
              workspaceId
            ]
          );
          tasksUpdated++;
        } else {
          // Insert new task with all fields
          await query(
            `INSERT INTO tasks (
              workspace_id, task_id, task_name, status, task_content, assignee, priority,
              due_date, start_date, date_created, date_updated, date_closed, date_done,
              created_by, space, folder, list, space_id, list_id, tags, time_estimate,
              comment_count, subtask_ids,
              alpha_draft_date, alpha_review_date, at_risk_checkbox,
              beta_review_date, beta_revision_date, design_priority,
              developer, development_status, final_review_sign_off_date,
              final_revision_received_date, graphics_design_request_checkbox,
              itc_phase, l2_substream, l3_labels, l3_script_available_checkbox,
              modalities, number_of_screens, overall_due_date,
              overdue_status, progress_updates, qa_users, qa_date,
              qa_lm_users, ready_to_be_assigned_checkbox, release_status,
              roles, sme_approver, script_received_date,
              sign_off_received_date, start_date_custom, submit_first_draft_date,
              t_codes, target_close_date, temp_archived_checkbox,
              value_stream, value_stream_lead
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
              $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
              $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
              $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
              $51, $52, $53, $54, $55, $56, $57, $58, $59
            )`,
            [
              workspaceId,
              taskData.task_id, taskData.task_name, taskData.status, taskData.task_content, taskData.assignee, taskData.priority,
              taskData.due_date, taskData.start_date, taskData.date_created, taskData.date_updated,
              taskData.date_closed, taskData.date_done, taskData.created_by,
              taskData.space, taskData.folder, taskData.list, taskData.space_id, taskData.list_id, taskData.tags, taskData.time_estimate,
              taskData.comment_count, taskData.subtask_ids,
              taskData.alpha_draft_date, taskData.alpha_review_date, taskData.at_risk_checkbox,
              taskData.beta_review_date, taskData.beta_revision_date, taskData.design_priority,
              taskData.developer, taskData.development_status, taskData.final_review_sign_off_date,
              taskData.final_revision_received_date, taskData.graphics_design_request_checkbox,
              taskData.itc_phase, taskData.l2_substream, taskData.l3_labels, taskData.l3_script_available_checkbox,
              taskData.modalities, taskData.number_of_screens, taskData.overall_due_date,
              taskData.overdue_status, taskData.progress_updates, taskData.qa_users, taskData.qa_date,
              taskData.qa_lm_users, taskData.ready_to_be_assigned_checkbox, taskData.release_status,
              taskData.roles, taskData.sme_approver, taskData.script_received_date,
              taskData.sign_off_received_date, taskData.start_date_custom, taskData.submit_first_draft_date,
              taskData.t_codes, taskData.target_close_date, taskData.temp_archived_checkbox,
              taskData.value_stream, taskData.value_stream_lead
            ]
          );
          tasksCreated++;
        }
      } catch (error: any) {
        logger.error('Failed to sync task', { error: error.message, taskId: task.id });
      }
    }

    // Update sync history
    await query(
      `UPDATE task_sync_history SET
        tasks_synced = $1,
        tasks_created = $2,
        tasks_updated = $3,
        sync_completed_at = NOW(),
        status = 'completed'
      WHERE id = $4`,
      [tasks.length, tasksCreated, tasksUpdated, syncId]
    );

    res.json({
      success: true,
      message: 'Tasks synced successfully',
      summary: {
        total: tasks.length,
        created: tasksCreated,
        updated: tasksUpdated
      }
    });
  } catch (error: any) {
    logger.error('Failed to sync tasks', { error: error.message });
    res.status(500).json({ error: 'Failed to sync tasks: ' + error.message });
  }
});

// Get task statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { workspaceId, listId, spaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    let whereClause = 'WHERE workspace_id = $1';
    const params: any[] = [workspaceId];
    let paramCount = 1;

    if (listId) {
      whereClause += ` AND list = $${++paramCount}`;
      params.push(listId);
    }

    if (spaceId) {
      whereClause += ` AND space = $${++paramCount}`;
      params.push(spaceId);
    }

    // Get various statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(DISTINCT status) as unique_statuses,
        COUNT(DISTINCT assignee) as unique_assignees,
        COUNT(DISTINCT list) as unique_lists,
        COUNT(CASE WHEN status IN ('completed', 'done', 'closed') THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status IN ('in progress', 'in_progress') THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN status IN ('open', 'to do', 'todo') THEN 1 END) as open_tasks,
        COUNT(CASE WHEN overdue_status = 'Overdue' THEN 1 END) as overdue_tasks,
        AVG(CASE WHEN date_done IS NOT NULL AND date_created IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (date_done - date_created))/86400 END) as avg_completion_days
      FROM tasks
      ${whereClause}
    `;

    const statsResult = await query(statsQuery, params);

    // Get status breakdown
    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM tasks
      ${whereClause}
      GROUP BY status
      ORDER BY count DESC
    `;

    const statusResult = await query(statusQuery, params);

    // Get assignee breakdown
    const assigneeQuery = `
      SELECT assignee, COUNT(*) as count
      FROM tasks
      ${whereClause} AND assignee IS NOT NULL
      GROUP BY assignee
      ORDER BY count DESC
      LIMIT 10
    `;

    const assigneeResult = await query(assigneeQuery, params);

    res.json({
      success: true,
      stats: statsResult.rows[0],
      statusBreakdown: statusResult.rows,
      topAssignees: assigneeResult.rows
    });
  } catch (error: any) {
    logger.error('Failed to get task statistics', { error: error.message });
    res.status(500).json({ error: 'Failed to get task statistics' });
  }
});

// Get sync history
router.get('/sync-history', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    const result = await query(
      `SELECT * FROM task_sync_history
       WHERE workspace_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [workspaceId]
    );

    res.json({
      success: true,
      history: result.rows
    });
  } catch (error: any) {
    logger.error('Failed to get sync history', { error: error.message });
    res.status(500).json({ error: 'Failed to get sync history' });
  }
});

export default router;