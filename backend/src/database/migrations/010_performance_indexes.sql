-- Performance Indexes Migration
-- Implements PERF-002: Database optimization indexes

-- ============================================================
-- USER AND AUTHENTICATION INDEXES
-- ============================================================

-- User lookups by email and username (login)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active
ON users (email) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_active
ON users (username) WHERE is_active = true;

-- User sessions by user_id and expiry
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user_id
ON user_sessions (user_id, expires_at) WHERE is_valid = true;

-- Audit logs for compliance queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_timestamp
ON audit_logs (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action_timestamp
ON audit_logs (action, created_at DESC);

-- ============================================================
-- DASHBOARD AND WIDGET INDEXES
-- ============================================================

-- Dashboard lookups by workspace
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboards_workspace_created
ON dashboards (workspace_id, created_at DESC);

-- Dashboard filtering by public status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboards_workspace_public
ON dashboards (workspace_id) WHERE is_public = true;

-- Dashboard search by name
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboards_name_trgm
ON dashboards USING gin (name gin_trgm_ops);

-- Widget lookups by dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_widgets_dashboard_position
ON widgets (dashboard_id, position);

-- Widget type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_widgets_dashboard_type
ON widgets (dashboard_id, type);

-- ============================================================
-- REPORT AND SCHEDULE INDEXES
-- ============================================================

-- Report lookups by workspace
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_workspace_created
ON reports (workspace_id, created_at DESC);

-- Report generation history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_report_generations_report_status
ON report_generations (report_id, status, started_at DESC);

-- Schedule next run for job processing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_report_schedules_next_run
ON report_schedules (next_run) WHERE is_active = true;

-- ============================================================
-- SHARING AND PERMISSIONS INDEXES
-- ============================================================

-- Share links by dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_share_links_dashboard
ON share_links (dashboard_id) WHERE is_active = true;

-- Share link token lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_share_links_token
ON share_links (token) WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW());

-- Dashboard permissions by dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboard_permissions_dashboard
ON dashboard_permissions (dashboard_id);

-- Dashboard permissions by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboard_permissions_user
ON dashboard_permissions (user_id);

-- ============================================================
-- CACHING INDEXES
-- ============================================================

-- Cache lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cached_data_workspace_key
ON cached_data (workspace_id, cache_key);

-- Cache expiry cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cached_data_expires
ON cached_data (expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================
-- FOLDER AND ORGANIZATION INDEXES
-- ============================================================

-- Folder hierarchy
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboard_folders_workspace_parent
ON dashboard_folders (workspace_id, parent_id);

-- Dashboard folder assignment
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboards_folder
ON dashboards (folder_id) WHERE folder_id IS NOT NULL;

-- ============================================================
-- COMMENTS INDEXES
-- ============================================================

-- Comments by dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboard_comments_dashboard_created
ON dashboard_comments (dashboard_id, created_at DESC);

-- Comment replies
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboard_comments_parent
ON dashboard_comments (parent_id) WHERE parent_id IS NOT NULL;

-- ============================================================
-- CALCULATED FIELDS INDEXES
-- ============================================================

-- Calculated fields by dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calculated_fields_dashboard
ON calculated_fields (dashboard_id);

-- ============================================================
-- TIMESCALE OPTIMIZATION
-- ============================================================

-- For time-series data, use TimescaleDB hypertables and continuous aggregates
-- These would be created if using TimescaleDB extension

-- Example continuous aggregate for hourly metrics:
-- CREATE MATERIALIZED VIEW hourly_metrics
-- WITH (timescaledb.continuous) AS
-- SELECT
--   time_bucket('1 hour', timestamp) AS hour,
--   metric_id,
--   AVG(value) as avg_value,
--   MIN(value) as min_value,
--   MAX(value) as max_value,
--   COUNT(*) as count
-- FROM metric_values
-- GROUP BY hour, metric_id;

-- ============================================================
-- PARTIAL INDEXES FOR COMMON FILTERS
-- ============================================================

-- Active users only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active
ON users (id) WHERE is_active = true AND email_verified = true;

-- Active dashboards (not soft-deleted)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboards_active
ON dashboards (id) WHERE deleted_at IS NULL;

-- ============================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================

-- Dashboard list query (workspace + filters + sort)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboards_list_query
ON dashboards (workspace_id, is_public, created_at DESC)
WHERE deleted_at IS NULL;

-- User permissions check
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_permissions_composite
ON role_permissions (role_id, permission_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_composite
ON user_roles (user_id, role_id);

-- ============================================================
-- ANALYZE TABLES FOR OPTIMAL QUERY PLANNING
-- ============================================================

ANALYZE users;
ANALYZE dashboards;
ANALYZE widgets;
ANALYZE reports;
ANALYZE audit_logs;
ANALYZE user_sessions;
ANALYZE share_links;
ANALYZE dashboard_permissions;
ANALYZE cached_data;
