import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { ClickUpService } from '../services/clickup.service';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Sync tasks from ClickUp API with progress tracking
router.get('/sync-with-progress', async (req: Request, res: Response) => {
  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
  
  const sendProgress = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { workspaceId, listId, spaceId, syncAll } = req.query;

    if (!workspaceId) {
      sendProgress({ error: 'Workspace ID is required' });
      return res.end();
    }

    // Get workspace credentials
    const workspaceResult = await query(
      `SELECT encrypted_api_key, api_key_iv, clickup_team_id
       FROM workspaces
       WHERE id = $1 AND is_active = true`,
      [workspaceId]
    );

    if (workspaceResult.rows.length === 0) {
      sendProgress({ error: 'Workspace not found' });
      return res.end();
    }

    const { encrypted_api_key, api_key_iv } = workspaceResult.rows[0];
    
    if (!encrypted_api_key || !api_key_iv) {
      sendProgress({ error: 'Workspace not properly configured' });
      return res.end();
    }
    
    const clickup = new ClickUpService(workspaceId, encrypted_api_key, api_key_iv);

    // Start sync
    sendProgress({ 
      status: 'started', 
      message: 'Starting sync operation...',
      progress: 0 
    });

    let tasks: any[] = [];
    let totalSpaces = 0;
    let processedSpaces = 0;

    // Fetch tasks from ClickUp
    if (syncAll) {
      // Fetch all spaces first
      const spacesResponse = await clickup.getSpaces();
      totalSpaces = spacesResponse.length;
      
      sendProgress({ 
        status: 'fetching', 
        message: `Found ${totalSpaces} spaces to sync`,
        progress: 5 
      });
      
      for (const space of spacesResponse) {
        try {
          sendProgress({ 
            status: 'fetching_space', 
            message: `Fetching tasks from space: ${space.name}`,
            progress: 5 + (processedSpaces / totalSpaces) * 40 
          });
          
          const spaceTasks = await clickup.getAllTasksFromSpace(space.id, {
            include_closed: true,
          });
          tasks = tasks.concat(spaceTasks);
          processedSpaces++;
          
          sendProgress({ 
            status: 'fetched_space', 
            message: `Fetched ${spaceTasks.length} tasks from ${space.name}`,
            current: tasks.length,
            progress: 5 + (processedSpaces / totalSpaces) * 40
          });
        } catch (error: any) {
          logger.error(`Failed to fetch tasks from space ${space.name}:`, error.message);
          sendProgress({ 
            status: 'space_error', 
            message: `Error fetching from ${space.name}: ${error.message}`,
            progress: 5 + (processedSpaces / totalSpaces) * 40
          });
        }
      }
    } else if (listId) {
      sendProgress({ 
        status: 'fetching', 
        message: 'Fetching tasks from list...',
        progress: 10 
      });
      
      tasks = await clickup.getTasks(listId, {
        include_closed: true,
      });
      
      sendProgress({ 
        status: 'fetched', 
        message: `Fetched ${tasks.length} tasks`,
        current: tasks.length,
        progress: 45 
      });
    } else if (spaceId) {
      sendProgress({ 
        status: 'fetching', 
        message: 'Fetching tasks from space...',
        progress: 10 
      });
      
      tasks = await clickup.getAllTasksFromSpace(spaceId, {
        include_closed: true,
      });
      
      sendProgress({ 
        status: 'fetched', 
        message: `Fetched ${tasks.length} tasks`,
        current: tasks.length,
        progress: 45 
      });
    }

    // Process tasks in batches
    const batchSize = 50;
    let tasksCreated = 0;
    let tasksUpdated = 0;
    let tasksProcessed = 0;
    const totalTasks = tasks.length;

    sendProgress({ 
      status: 'processing', 
      message: `Processing ${totalTasks} tasks...`,
      total: totalTasks,
      progress: 50 
    });

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      
      for (const task of batch) {
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
              return new Date(parseInt(field.value));
            } else if (fieldType === 'checkbox') {
              return field.value === 'true' || field.value === true;
            } else if (fieldType === 'number' && field.value) {
              return parseFloat(field.value);
            } else if (fieldType === 'users' && field.value) {
              return Array.isArray(field.value) ? 
                JSON.stringify(field.value) :
                JSON.stringify(field.value.split(',').map((u: string) => u.trim()));
            } else if (fieldType === 'labels' && field.value) {
              return Array.isArray(field.value) ? 
                JSON.stringify(field.value) :
                JSON.stringify([field.value]);
            }
            return field.value || null;
          };

          const taskData = {
            task_name: task.name,
            status: task.status?.status || task.status || 'open',
            task_content: task.description || '',
            assignee: task.assignees?.map((a: any) => a.username || a.email).join(', ') || null,
            priority: task.priority?.priority || task.priority || null,
            latest_comment: null,
            comment_count: 0,
            assigned_comment_count: 0,
            due_date: task.due_date ? new Date(parseInt(task.due_date)) : null,
            start_date: task.start_date ? new Date(parseInt(task.start_date)) : null,
            date_created: task.date_created ? new Date(parseInt(task.date_created)) : null,
            date_updated: task.date_updated ? new Date(parseInt(task.date_updated)) : null,
            date_closed: task.date_closed ? new Date(parseInt(task.date_closed)) : null,
            date_done: task.date_done ? new Date(parseInt(task.date_done)) : null,
            created_by: task.creator?.username || task.creator?.email || null,
            space: task.space?.name || 'Unknown',
            folder: task.folder?.name || null,
            list: task.list?.name || 'Unknown',
            subtask_ids: task.subtasks ? JSON.stringify(task.subtasks.map((s: any) => s.id)) : null,
            subtask_urls: null,
            tags: task.tags ? JSON.stringify(task.tags.map((t: any) => t.name)) : null,
            lists: null,
            sprints: null,
            linked_tasks: task.linked_tasks ? JSON.stringify(task.linked_tasks.map((t: any) => t.task_id)) : null,
            linked_docs: null,
            time_logged: task.time_spent ? `${task.time_spent / 3600000}h` : null,
            time_logged_rolled_up: null,
            time_estimate: task.time_estimate ? `${task.time_estimate / 3600000}h` : null,
            time_estimate_rolled_up: null,
            time_in_status: null,
            points_estimate_rolled_up: 0,
            // Custom fields
            alpha_draft_date: getCustomFieldValue('alpha draft', 'date'),
            alpha_review_date: getCustomFieldValue('alpha review', 'date'),
            at_risk_checkbox: getCustomFieldValue('at risk', 'checkbox'),
            beta_review_date: getCustomFieldValue('beta review', 'date'),
            beta_revision_date: getCustomFieldValue('beta revision', 'date'),
            design_priority: getCustomFieldValue('design priority', 'text'),
            developer: getCustomFieldValue('developer', 'users'),
            development_status: getCustomFieldValue('development status', 'text'),
            final_review_sign_off_date: getCustomFieldValue('final review', 'date'),
            final_revision_received_date: getCustomFieldValue('final revision', 'date'),
            graphics_design_request_checkbox: getCustomFieldValue('graphics design', 'checkbox'),
            itc_phase: getCustomFieldValue('itc phase', 'text'),
            l2_substream: getCustomFieldValue('l2', 'text') || getCustomFieldValue('substream', 'text'),
            l3_labels: getCustomFieldValue('l3', 'labels'),
            l3_script_available_checkbox: getCustomFieldValue('l3 script', 'checkbox'),
            modalities: getCustomFieldValue('modalities', 'labels'),
            number_of_screens: getCustomFieldValue('number of screens', 'number'),
            overall_due_date: getCustomFieldValue('overall due', 'date'),
            overdue_status: getCustomFieldValue('overdue status', 'text'),
            progress_updates: getCustomFieldValue('progress updates', 'text'),
            qa_users: getCustomFieldValue('qa users', 'users'),
            qa_date: getCustomFieldValue('qa date', 'date'),
            qa_lm_users: getCustomFieldValue('qa lm', 'users'),
            ready_to_be_assigned_checkbox: getCustomFieldValue('ready to be assigned', 'checkbox'),
            release_status: getCustomFieldValue('release status', 'text'),
            roles: getCustomFieldValue('roles', 'labels'),
            sme_approver: getCustomFieldValue('sme approver', 'users'),
            script_received_date: getCustomFieldValue('script received', 'date'),
            sign_off_received_date: getCustomFieldValue('sign off', 'date'),
            start_date_custom: getCustomFieldValue('start date', 'date'),
            submit_first_draft_date: getCustomFieldValue('submit first draft', 'date'),
            t_codes: getCustomFieldValue('t codes', 'labels'),
            target_close_date: getCustomFieldValue('target close', 'date'),
            temp_archived_checkbox: getCustomFieldValue('temp archived', 'checkbox'),
            value_stream: getCustomFieldValue('value stream', 'text'),
            value_stream_lead: getCustomFieldValue('value stream lead', 'users'),
          };

          if (existingTask.rows.length > 0) {
            // Update existing task
            await query(
              `UPDATE tasks SET
                task_name = $1, status = $2, task_content = $3, assignee = $4, priority = $5,
                due_date = $6, start_date = $7, date_updated = $8, date_closed = $9, date_done = $10,
                space = $11, folder = $12, list = $13,
                subtask_ids = $14, tags = $15, linked_tasks = $16,
                time_logged = $17, time_estimate = $18,
                alpha_draft_date = $19, at_risk_checkbox = $20, development_status = $21,
                itc_phase = $22, l2_substream = $23, l3_labels = $24, modalities = $25,
                number_of_screens = $26, overall_due_date = $27, overdue_status = $28,
                progress_updates = $29, value_stream = $30, value_stream_lead = $31,
                design_priority = $32, developer = $33, qa_users = $34, qa_lm_users = $35,
                release_status = $36, sme_approver = $37,
                last_synced_at = NOW(), updated_at = NOW()
              WHERE task_id = $38 AND workspace_id = $39`,
              [
                taskData.task_name, taskData.status, taskData.task_content, taskData.assignee, taskData.priority,
                taskData.due_date, taskData.start_date, taskData.date_updated, taskData.date_closed, taskData.date_done,
                taskData.space, taskData.folder, taskData.list,
                taskData.subtask_ids, taskData.tags, taskData.linked_tasks,
                taskData.time_logged, taskData.time_estimate,
                taskData.alpha_draft_date, taskData.at_risk_checkbox, taskData.development_status,
                taskData.itc_phase, taskData.l2_substream, taskData.l3_labels, taskData.modalities,
                taskData.number_of_screens, taskData.overall_due_date, taskData.overdue_status,
                taskData.progress_updates, taskData.value_stream, taskData.value_stream_lead,
                taskData.design_priority, taskData.developer, taskData.qa_users, taskData.qa_lm_users,
                taskData.release_status, taskData.sme_approver,
                task.id, workspaceId
              ]
            );
            tasksUpdated++;
          } else {
            // Insert new task
            await query(
              `INSERT INTO tasks (
                workspace_id, task_id, task_name, status, task_content, assignee, priority,
                due_date, start_date, date_created, date_updated, date_closed, date_done,
                created_by, space, folder, list,
                subtask_ids, tags, linked_tasks,
                time_logged, time_estimate,
                alpha_draft_date, at_risk_checkbox, development_status,
                itc_phase, l2_substream, l3_labels, modalities,
                number_of_screens, overall_due_date, overdue_status,
                progress_updates, value_stream, value_stream_lead,
                design_priority, developer, qa_users, qa_lm_users,
                release_status, sme_approver
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
                $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
                $33, $34, $35, $36, $37, $38, $39, $40, $41
              )`,
              [
                workspaceId, task.id, taskData.task_name, taskData.status, taskData.task_content, 
                taskData.assignee, taskData.priority,
                taskData.due_date, taskData.start_date, taskData.date_created, taskData.date_updated, 
                taskData.date_closed, taskData.date_done,
                taskData.created_by, taskData.space, taskData.folder, taskData.list,
                taskData.subtask_ids, taskData.tags, taskData.linked_tasks,
                taskData.time_logged, taskData.time_estimate,
                taskData.alpha_draft_date, taskData.at_risk_checkbox, taskData.development_status,
                taskData.itc_phase, taskData.l2_substream, taskData.l3_labels, taskData.modalities,
                taskData.number_of_screens, taskData.overall_due_date, taskData.overdue_status,
                taskData.progress_updates, taskData.value_stream, taskData.value_stream_lead,
                taskData.design_priority, taskData.developer, taskData.qa_users, taskData.qa_lm_users,
                taskData.release_status, taskData.sme_approver
              ]
            );
            tasksCreated++;
          }
          
          tasksProcessed++;
        } catch (error: any) {
          logger.error(`Failed to process task ${task.id}:`, error);
        }
      }
      
      // Send progress update after each batch
      const progress = 50 + (tasksProcessed / totalTasks) * 45;
      sendProgress({ 
        status: 'processing', 
        message: `Processed ${tasksProcessed} of ${totalTasks} tasks`,
        processed: tasksProcessed,
        total: totalTasks,
        created: tasksCreated,
        updated: tasksUpdated,
        progress 
      });
    }

    // Final progress
    sendProgress({ 
      status: 'completed', 
      message: 'Sync completed successfully',
      summary: {
        total: tasks.length,
        created: tasksCreated,
        updated: tasksUpdated,
        failed: tasks.length - (tasksCreated + tasksUpdated)
      },
      progress: 100 
    });

    res.end();
  } catch (error: any) {
    logger.error('Sync failed:', error);
    sendProgress({ 
      status: 'error', 
      error: error.message,
      progress: 0 
    });
    res.end();
  }
});

export default router;