-- Create tasks table to store downloaded ClickUp tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Core task fields
  task_id VARCHAR(255) NOT NULL UNIQUE,
  task_name TEXT NOT NULL,
  status VARCHAR(100),
  task_content TEXT,
  assignee TEXT,
  priority VARCHAR(50),
  
  -- Comment fields
  latest_comment TEXT,
  comment_count INTEGER DEFAULT 0,
  assigned_comment_count INTEGER DEFAULT 0,
  
  -- Date fields (storing as TIMESTAMP)
  due_date TIMESTAMP,
  start_date TIMESTAMP,
  date_created TIMESTAMP,
  date_updated TIMESTAMP,
  date_closed TIMESTAMP,
  date_done TIMESTAMP,
  
  -- User and location fields
  created_by VARCHAR(255),
  space VARCHAR(255),
  folder VARCHAR(255),
  list VARCHAR(255),
  
  -- Related items (storing as JSON arrays)
  subtask_ids JSONB,
  subtask_urls JSONB,
  tags JSONB,
  lists JSONB,
  sprints JSONB,
  linked_tasks JSONB,
  linked_docs JSONB,
  
  -- Time tracking fields
  time_logged VARCHAR(100),
  time_logged_rolled_up VARCHAR(100),
  time_estimate VARCHAR(100),
  time_estimate_rolled_up VARCHAR(100),
  time_in_status VARCHAR(100),
  points_estimate_rolled_up DECIMAL(10,2),
  
  -- Custom fields for Lockheed Martin
  alpha_draft_date DATE,
  alpha_review_date DATE,
  at_risk_checkbox BOOLEAN DEFAULT FALSE,
  beta_review_date DATE,
  beta_revision_date DATE,
  design_priority VARCHAR(100),
  developer JSONB, -- Array of users
  development_status VARCHAR(100),
  final_review_sign_off_date DATE,
  final_revision_received_date DATE,
  graphics_design_request_checkbox BOOLEAN DEFAULT FALSE,
  itc_phase VARCHAR(50),
  l2_substream VARCHAR(255),
  l3_labels JSONB,
  l3_script_available_checkbox BOOLEAN DEFAULT FALSE,
  modalities JSONB,
  number_of_screens INTEGER,
  overall_due_date DATE,
  overdue_status VARCHAR(50),
  progress_updates TEXT,
  qa_users JSONB,
  qa_date DATE,
  qa_lm_users JSONB,
  ready_to_be_assigned_checkbox BOOLEAN DEFAULT FALSE,
  release_status VARCHAR(100),
  roles JSONB,
  sme_approver JSONB,
  script_received_date DATE,
  sign_off_received_date DATE,
  start_date_custom DATE,
  submit_first_draft_date DATE,
  t_codes JSONB,
  target_close_date DATE,
  temp_archived_checkbox BOOLEAN DEFAULT FALSE,
  value_stream VARCHAR(100),
  value_stream_lead JSONB,
  
  -- Metadata
  last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_task_workspace UNIQUE(task_id, workspace_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_list ON tasks(list);
CREATE INDEX idx_tasks_space ON tasks(space);
CREATE INDEX idx_tasks_assignee ON tasks(assignee);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_date_created ON tasks(date_created);
CREATE INDEX idx_tasks_development_status ON tasks(development_status);
CREATE INDEX idx_tasks_value_stream ON tasks(value_stream);
CREATE INDEX idx_tasks_itc_phase ON tasks(itc_phase);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- Create a table to track task sync history
CREATE TABLE IF NOT EXISTS task_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'manual'
  tasks_synced INTEGER DEFAULT 0,
  tasks_created INTEGER DEFAULT 0,
  tasks_updated INTEGER DEFAULT 0,
  tasks_deleted INTEGER DEFAULT 0,
  sync_started_at TIMESTAMP NOT NULL,
  sync_completed_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed'
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_task_sync_history_workspace ON task_sync_history(workspace_id);
CREATE INDEX idx_task_sync_history_status ON task_sync_history(status);
CREATE INDEX idx_task_sync_history_created ON task_sync_history(created_at DESC);