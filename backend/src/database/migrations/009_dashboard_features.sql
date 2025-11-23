-- Migration: Dashboard Features (Templates, Calculated Fields, Folders, Sharing, Comments, Exports)
-- Version: 009
-- Description: Add comprehensive dashboard features for Week 1-7 implementation

-- Dashboard Templates
CREATE TABLE IF NOT EXISTS dashboard_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  is_public BOOLEAN DEFAULT false,
  thumbnail_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dashboard_templates_dashboard_id ON dashboard_templates(dashboard_id);
CREATE INDEX idx_dashboard_templates_category ON dashboard_templates(category);
CREATE INDEX idx_dashboard_templates_is_public ON dashboard_templates(is_public);
CREATE INDEX idx_dashboard_templates_tags ON dashboard_templates USING GIN(tags);

-- Track template usage
CREATE TABLE IF NOT EXISTS dashboard_from_template_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES dashboard_templates(id) ON DELETE CASCADE,
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_template_usage_template_id ON dashboard_from_template_usage(template_id);

-- Calculated Fields
CREATE TABLE IF NOT EXISTS calculated_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  expression TEXT NOT NULL,
  description TEXT,
  return_type VARCHAR(50) DEFAULT 'number',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calculated_fields_dashboard_id ON calculated_fields(dashboard_id);

-- Dashboard Folders
CREATE TABLE IF NOT EXISTS dashboard_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES dashboard_folders(id) ON DELETE CASCADE,
  icon VARCHAR(50),
  color VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dashboard_folders_workspace_id ON dashboard_folders(workspace_id);
CREATE INDEX idx_dashboard_folders_parent_id ON dashboard_folders(parent_id);

-- Add folder_id to dashboards table
ALTER TABLE dashboards
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES dashboard_folders(id) ON DELETE SET NULL;

-- Add favorite and view tracking to dashboards
ALTER TABLE dashboards
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

CREATE INDEX idx_dashboards_folder_id ON dashboards(folder_id);
CREATE INDEX idx_dashboards_is_favorite ON dashboards(is_favorite);
CREATE INDEX idx_dashboards_last_viewed ON dashboards(last_viewed_at DESC);

-- Enhanced Share Links (replacing simple dashboard_shares)
CREATE TABLE IF NOT EXISTS dashboard_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  share_token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP,
  password_hash VARCHAR(255),
  permission VARCHAR(50) DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'admin')),
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_share_links_dashboard_id ON dashboard_share_links(dashboard_id);
CREATE INDEX idx_share_links_token ON dashboard_share_links(share_token);
CREATE INDEX idx_share_links_expires_at ON dashboard_share_links(expires_at);

-- Dashboard Permissions
CREATE TABLE IF NOT EXISTS dashboard_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('viewer', 'editor', 'admin', 'owner')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_user_or_team CHECK (
    (user_id IS NOT NULL AND team_id IS NULL) OR
    (user_id IS NULL AND team_id IS NOT NULL)
  )
);

CREATE INDEX idx_dashboard_permissions_dashboard_id ON dashboard_permissions(dashboard_id);
CREATE INDEX idx_dashboard_permissions_user_id ON dashboard_permissions(user_id);
CREATE INDEX idx_dashboard_permissions_team_id ON dashboard_permissions(team_id);

-- Dashboard Comments
CREATE TABLE IF NOT EXISTS dashboard_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES dashboard_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dashboard_comments_dashboard_id ON dashboard_comments(dashboard_id);
CREATE INDEX idx_dashboard_comments_user_id ON dashboard_comments(user_id);
CREATE INDEX idx_dashboard_comments_parent_id ON dashboard_comments(parent_id);

-- Dashboard Exports
CREATE TABLE IF NOT EXISTS dashboard_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  format VARCHAR(50) NOT NULL CHECK (format IN ('pdf', 'excel', 'csv', 'powerpoint')),
  options JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  file_path TEXT,
  file_size BIGINT,
  download_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_dashboard_exports_dashboard_id ON dashboard_exports(dashboard_id);
CREATE INDEX idx_dashboard_exports_user_id ON dashboard_exports(user_id);
CREATE INDEX idx_dashboard_exports_status ON dashboard_exports(status);
CREATE INDEX idx_dashboard_exports_created_at ON dashboard_exports(created_at DESC);

-- Teams table (if not exists)
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_teams_workspace_id ON teams(workspace_id);

-- Team Members (if not exists)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

-- Workspace Members (if not exists)
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);

-- Add avatar_url to users table if not exists
ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DO $$
BEGIN
  -- Dashboard templates
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_dashboard_templates_updated_at') THEN
    CREATE TRIGGER update_dashboard_templates_updated_at
      BEFORE UPDATE ON dashboard_templates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Calculated fields
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_calculated_fields_updated_at') THEN
    CREATE TRIGGER update_calculated_fields_updated_at
      BEFORE UPDATE ON calculated_fields
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Dashboard folders
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_dashboard_folders_updated_at') THEN
    CREATE TRIGGER update_dashboard_folders_updated_at
      BEFORE UPDATE ON dashboard_folders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Share links
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_share_links_updated_at') THEN
    CREATE TRIGGER update_share_links_updated_at
      BEFORE UPDATE ON dashboard_share_links
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Permissions
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_permissions_updated_at') THEN
    CREATE TRIGGER update_permissions_updated_at
      BEFORE UPDATE ON dashboard_permissions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Comments
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_comments_updated_at') THEN
    CREATE TRIGGER update_comments_updated_at
      BEFORE UPDATE ON dashboard_comments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Teams
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_teams_updated_at') THEN
    CREATE TRIGGER update_teams_updated_at
      BEFORE UPDATE ON teams
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Insert sample data for development (optional)
-- Uncomment if you want sample data

-- Sample team
-- INSERT INTO teams (id, workspace_id, name, description)
-- VALUES (
--   '11111111-1111-1111-1111-111111111111',
--   (SELECT id FROM workspaces LIMIT 1),
--   'Engineering Team',
--   'Main engineering team'
-- )
-- ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE dashboard_templates IS 'Dashboard templates for quick dashboard creation';
COMMENT ON TABLE calculated_fields IS 'Custom calculated fields with formulas for dashboards';
COMMENT ON TABLE dashboard_folders IS 'Hierarchical folder structure for organizing dashboards';
COMMENT ON TABLE dashboard_share_links IS 'Enhanced share links with password protection and expiration';
COMMENT ON TABLE dashboard_permissions IS 'User and team permissions for dashboard access control';
COMMENT ON TABLE dashboard_comments IS 'Threaded comments on dashboards for collaboration';
COMMENT ON TABLE dashboard_exports IS 'Dashboard export history and status tracking';
COMMENT ON TABLE teams IS 'Teams within workspaces for permission management';

-- Version tracking
INSERT INTO schema_migrations (version, description)
VALUES (9, 'Dashboard Features - Templates, Calculated Fields, Folders, Sharing, Comments, Exports')
ON CONFLICT (version) DO NOTHING;
