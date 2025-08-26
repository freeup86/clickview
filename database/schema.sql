-- ClickView Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS api_request_logs CASCADE;
DROP TABLE IF EXISTS cached_data CASCADE;
DROP TABLE IF EXISTS filter_presets CASCADE;
DROP TABLE IF EXISTS widget_filters CASCADE;
DROP TABLE IF EXISTS widget_data_sources CASCADE;
DROP TABLE IF EXISTS widgets CASCADE;
DROP TABLE IF EXISTS dashboard_shares CASCADE;
DROP TABLE IF EXISTS dashboards CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;

-- Workspaces table
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    clickup_team_id VARCHAR(50),
    encrypted_api_key TEXT NOT NULL,
    api_key_iv VARCHAR(32) NOT NULL,
    webhook_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    rate_limit_remaining INTEGER DEFAULT 100,
    rate_limit_reset_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dashboards table
CREATE TABLE dashboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    layout_config JSONB DEFAULT '[]'::jsonb,
    global_filters JSONB DEFAULT '{}'::jsonb,
    refresh_interval INTEGER, -- in seconds, NULL means manual refresh only
    last_refresh_at TIMESTAMP WITH TIME ZONE,
    is_template BOOLEAN DEFAULT false,
    template_category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard shares table
CREATE TABLE dashboard_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    share_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Widgets table
CREATE TABLE widgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'kpi_card', 'bar_chart', 'line_chart', 'pie_chart', 'donut_chart',
        'area_chart', 'gantt_chart', 'heatmap', 'data_table', 'progress_bar',
        'burndown_chart', 'custom_field_summary'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "w": 4, "h": 3}'::jsonb,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    data_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    filters JSONB DEFAULT '{}'::jsonb,
    refresh_interval INTEGER, -- override dashboard refresh interval
    last_refresh_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Widget data sources table
CREATE TABLE widget_data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN (
        'tasks', 'custom_fields', 'time_tracking', 'comments', 'attachments'
    )),
    clickup_space_id VARCHAR(50),
    clickup_folder_id VARCHAR(50),
    clickup_list_id VARCHAR(50),
    custom_field_id VARCHAR(50),
    aggregation_type VARCHAR(20) CHECK (aggregation_type IN (
        'sum', 'avg', 'count', 'min', 'max', 'distinct'
    )),
    group_by VARCHAR(100),
    time_group_by VARCHAR(20) CHECK (time_group_by IN (
        'day', 'week', 'month', 'quarter', 'year'
    )),
    calculated_fields JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Widget filters table
CREATE TABLE widget_filters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    operator VARCHAR(20) NOT NULL CHECK (operator IN (
        'equals', 'not_equals', 'contains', 'not_contains',
        'greater_than', 'less_than', 'between', 'in', 'not_in',
        'is_null', 'is_not_null'
    )),
    value JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Filter presets table
CREATE TABLE filter_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_global BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cached data table
CREATE TABLE cached_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    cache_key VARCHAR(500) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, cache_key)
);

-- API request logs table
CREATE TABLE api_request_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    error_message TEXT,
    rate_limit_remaining INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_dashboards_workspace_id ON dashboards(workspace_id);
CREATE INDEX idx_widgets_dashboard_id ON widgets(dashboard_id);
CREATE INDEX idx_widget_data_sources_widget_id ON widget_data_sources(widget_id);
CREATE INDEX idx_widget_filters_widget_id ON widget_filters(widget_id);
CREATE INDEX idx_filter_presets_workspace_id ON filter_presets(workspace_id);
CREATE INDEX idx_cached_data_workspace_id ON cached_data(workspace_id);
CREATE INDEX idx_cached_data_cache_key ON cached_data(cache_key);
CREATE INDEX idx_cached_data_expires_at ON cached_data(expires_at);
CREATE INDEX idx_api_request_logs_workspace_id ON api_request_logs(workspace_id);
CREATE INDEX idx_api_request_logs_created_at ON api_request_logs(created_at);
CREATE INDEX idx_dashboard_shares_share_token ON dashboard_shares(share_token);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboards_updated_at BEFORE UPDATE ON dashboards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_widgets_updated_at BEFORE UPDATE ON widgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_filter_presets_updated_at BEFORE UPDATE ON filter_presets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean expired cache
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM cached_data WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to get dashboard with widgets
CREATE OR REPLACE FUNCTION get_dashboard_with_widgets(dashboard_uuid UUID)
RETURNS TABLE (
    dashboard_json JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'description', d.description,
        'layout_config', d.layout_config,
        'global_filters', d.global_filters,
        'refresh_interval', d.refresh_interval,
        'last_refresh_at', d.last_refresh_at,
        'widgets', COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', w.id,
                    'type', w.type,
                    'title', w.title,
                    'description', w.description,
                    'position', w.position,
                    'config', w.config,
                    'data_config', w.data_config,
                    'filters', w.filters
                ) ORDER BY (w.position->>'y')::int, (w.position->>'x')::int
            ) FILTER (WHERE w.id IS NOT NULL),
            '[]'::jsonb
        )
    )
    FROM dashboards d
    LEFT JOIN widgets w ON w.dashboard_id = d.id
    WHERE d.id = dashboard_uuid
    GROUP BY d.id;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE workspaces IS 'Stores ClickUp workspace connections with encrypted API keys';
COMMENT ON TABLE dashboards IS 'User-created dashboards with layout and filter configurations';
COMMENT ON TABLE widgets IS 'Individual chart/visualization widgets within dashboards';
COMMENT ON TABLE widget_data_sources IS 'Data source configuration for each widget';
COMMENT ON TABLE cached_data IS 'Temporary cache for ClickUp API responses with TTL';
COMMENT ON TABLE api_request_logs IS 'Logs for monitoring API usage and debugging';
COMMENT ON COLUMN workspaces.encrypted_api_key IS 'AES-256 encrypted ClickUp API key';
COMMENT ON COLUMN workspaces.api_key_iv IS 'Initialization vector for API key encryption';
COMMENT ON COLUMN dashboards.layout_config IS 'React-grid-layout configuration';
COMMENT ON COLUMN widgets.position IS 'Grid position {x, y, w, h} for react-grid-layout';