-- Add columns to store space and list IDs in addition to names
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS space_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS list_id VARCHAR(255);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_space_id ON tasks(space_id);
CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);

-- Add comment to clarify the columns
COMMENT ON COLUMN tasks.space IS 'Space name for display';
COMMENT ON COLUMN tasks.list IS 'List name for display';  
COMMENT ON COLUMN tasks.space_id IS 'Space ID for filtering';
COMMENT ON COLUMN tasks.list_id IS 'List ID for filtering';