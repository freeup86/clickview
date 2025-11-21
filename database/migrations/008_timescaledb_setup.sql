-- ===================================================================
-- ClickView Enterprise - TimescaleDB Setup (ARCH-003)
-- Version: 2.0.0-enterprise
-- Date: 2025-11-21
-- Features: Time-series optimization, continuous aggregates, compression
-- ===================================================================

-- ===================================================================
-- ENABLE TIMESCALEDB EXTENSION
-- ===================================================================

-- Note: TimescaleDB must be installed on the PostgreSQL server first
-- Installation: https://docs.timescale.com/install/latest/

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- ===================================================================
-- CONVERT EXISTING TABLES TO HYPERTABLES
-- ===================================================================

-- Convert audit_logs to hypertable (partitioned by performed_at)
SELECT create_hypertable(
  'audit_logs',
  'performed_at',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Convert security_events to hypertable
SELECT create_hypertable(
  'security_events',
  'occurred_at',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Convert rls_policy_audit to hypertable
SELECT create_hypertable(
  'rls_policy_audit',
  'performed_at',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Convert abac_policy_cache to hypertable
SELECT create_hypertable(
  'abac_policy_cache',
  'evaluated_at',
  chunk_time_interval => INTERVAL '1 hour',
  if_not_exists => TRUE
);

-- Convert user_sessions to hypertable
SELECT create_hypertable(
  'user_sessions',
  'created_at',
  chunk_time_interval => INTERVAL '7 days',
  if_not_exists => TRUE
);

-- ===================================================================
-- CREATE NEW TIME-SERIES TABLES
-- ===================================================================

-- Dashboard view events (for analytics)
CREATE TABLE IF NOT EXISTS dashboard_views (
    id BIGSERIAL,
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID,

    -- View details
    duration_seconds INTEGER, -- Time spent on dashboard
    widget_interactions INTEGER DEFAULT 0,

    -- Context
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50),

    -- Timestamp
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id, viewed_at)
);

-- Convert to hypertable
SELECT create_hypertable(
    'dashboard_views',
    'viewed_at',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE
);

-- Create index on dashboard_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_views_dashboard
    ON dashboard_views(dashboard_id, viewed_at DESC);

-- Widget interaction events
CREATE TABLE IF NOT EXISTS widget_interactions (
    id BIGSERIAL,
    widget_id UUID NOT NULL,
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Interaction type
    interaction_type VARCHAR(50) NOT NULL, -- click, hover, resize, refresh, drill_down
    details JSONB,

    -- Timestamp
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id, occurred_at)
);

SELECT create_hypertable(
    'widget_interactions',
    'occurred_at',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE
);

-- Query performance metrics
CREATE TABLE IF NOT EXISTS query_metrics (
    id BIGSERIAL,

    -- Query identification
    query_hash VARCHAR(64), -- Hash of the query for grouping
    query_text TEXT,
    data_source_id UUID,

    -- Performance
    execution_time_ms INTEGER NOT NULL,
    rows_returned INTEGER,
    rows_examined INTEGER,

    -- Resource usage
    cpu_time_ms INTEGER,
    memory_mb NUMERIC(10,2),

    -- Context
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    dashboard_id UUID,
    widget_id UUID,

    -- Status
    status VARCHAR(20), -- success, error, timeout
    error_message TEXT,

    -- Timestamp
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id, executed_at)
);

SELECT create_hypertable(
    'query_metrics',
    'executed_at',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- API request metrics
CREATE TABLE IF NOT EXISTS api_metrics (
    id BIGSERIAL,

    -- Request details
    method VARCHAR(10) NOT NULL,
    path VARCHAR(500) NOT NULL,
    endpoint_hash VARCHAR(64), -- Hash for grouping similar endpoints

    -- Performance
    response_time_ms INTEGER NOT NULL,
    status_code INTEGER NOT NULL,

    -- User & Auth
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_authenticated BOOLEAN DEFAULT false,

    -- Context
    ip_address INET,
    user_agent TEXT,

    -- Timestamp
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id, requested_at)
);

SELECT create_hypertable(
    'api_metrics',
    'requested_at',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- System metrics
CREATE TABLE IF NOT EXISTS system_metrics (
    id BIGSERIAL,

    -- Metric identification
    metric_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- gauge, counter, histogram

    -- Value
    value NUMERIC(20,4) NOT NULL,
    unit VARCHAR(20),

    -- Tags for grouping
    tags JSONB,

    -- Timestamp
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id, recorded_at)
);

SELECT create_hypertable(
    'system_metrics',
    'recorded_at',
    chunk_time_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- ===================================================================
-- CONTINUOUS AGGREGATES (Pre-computed rollups)
-- ===================================================================

-- Hourly dashboard views
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_views_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', viewed_at) AS hour,
    dashboard_id,
    COUNT(*) AS view_count,
    COUNT(DISTINCT user_id) AS unique_viewers,
    AVG(duration_seconds) AS avg_duration,
    SUM(widget_interactions) AS total_interactions
FROM dashboard_views
GROUP BY hour, dashboard_id;

-- Daily dashboard views
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_views_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', viewed_at) AS day,
    dashboard_id,
    COUNT(*) AS view_count,
    COUNT(DISTINCT user_id) AS unique_viewers,
    AVG(duration_seconds) AS avg_duration,
    SUM(widget_interactions) AS total_interactions
FROM dashboard_views
GROUP BY day, dashboard_id;

-- Query performance hourly averages
CREATE MATERIALIZED VIEW IF NOT EXISTS query_performance_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', executed_at) AS hour,
    query_hash,
    data_source_id,
    COUNT(*) AS execution_count,
    AVG(execution_time_ms) AS avg_execution_time,
    MAX(execution_time_ms) AS max_execution_time,
    MIN(execution_time_ms) AS min_execution_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) AS p95_execution_time,
    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_count
FROM query_metrics
GROUP BY hour, query_hash, data_source_id;

-- API endpoint performance (5-minute buckets)
CREATE MATERIALIZED VIEW IF NOT EXISTS api_performance_5min
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('5 minutes', requested_at) AS bucket,
    method,
    endpoint_hash,
    COUNT(*) AS request_count,
    AVG(response_time_ms) AS avg_response_time,
    MAX(response_time_ms) AS max_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) AS p95_response_time,
    SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS error_count,
    SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) AS server_error_count
FROM api_metrics
GROUP BY bucket, method, endpoint_hash;

-- User activity daily
CREATE MATERIALIZED VIEW IF NOT EXISTS user_activity_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', viewed_at) AS day,
    user_id,
    COUNT(DISTINCT dashboard_id) AS dashboards_viewed,
    SUM(duration_seconds) AS total_time_seconds,
    SUM(widget_interactions) AS total_interactions
FROM dashboard_views
WHERE user_id IS NOT NULL
GROUP BY day, user_id;

-- ===================================================================
-- REFRESH POLICIES (Auto-update aggregates)
-- ===================================================================

-- Refresh dashboard views hourly aggregate every 5 minutes
SELECT add_continuous_aggregate_policy('dashboard_views_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '5 minutes');

-- Refresh dashboard views daily aggregate once per hour
SELECT add_continuous_aggregate_policy('dashboard_views_daily',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 hour');

-- Refresh query performance aggregate every 5 minutes
SELECT add_continuous_aggregate_policy('query_performance_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '5 minutes');

-- Refresh API performance aggregate every 1 minute
SELECT add_continuous_aggregate_policy('api_performance_5min',
    start_offset => INTERVAL '30 minutes',
    end_offset => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '1 minute');

-- Refresh user activity daily aggregate every hour
SELECT add_continuous_aggregate_policy('user_activity_daily',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 hour');

-- ===================================================================
-- DATA RETENTION POLICIES
-- ===================================================================

-- Keep detailed audit logs for 90 days
SELECT add_retention_policy('audit_logs', INTERVAL '90 days');

-- Keep security events for 1 year
SELECT add_retention_policy('security_events', INTERVAL '1 year');

-- Keep RLS policy audit for 30 days
SELECT add_retention_policy('rls_policy_audit', INTERVAL '30 days');

-- Keep ABAC cache for 1 day (it's a cache)
SELECT add_retention_policy('abac_policy_cache', INTERVAL '1 day');

-- Keep user sessions for 30 days
SELECT add_retention_policy('user_sessions', INTERVAL '30 days');

-- Keep dashboard views for 180 days (6 months)
SELECT add_retention_policy('dashboard_views', INTERVAL '180 days');

-- Keep widget interactions for 90 days
SELECT add_retention_policy('widget_interactions', INTERVAL '90 days');

-- Keep query metrics for 30 days (aggregates retained longer)
SELECT add_retention_policy('query_metrics', INTERVAL '30 days');

-- Keep API metrics for 14 days
SELECT add_retention_policy('api_metrics', INTERVAL '14 days');

-- Keep system metrics for 7 days (aggregates for trends)
SELECT add_retention_policy('system_metrics', INTERVAL '7 days');

-- ===================================================================
-- COMPRESSION POLICIES
-- ===================================================================

-- Compress audit logs older than 7 days
ALTER TABLE audit_logs SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'user_id',
    timescaledb.compress_orderby = 'performed_at DESC'
);

SELECT add_compression_policy('audit_logs', INTERVAL '7 days');

-- Compress security events older than 7 days
ALTER TABLE security_events SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'user_id, event_type',
    timescaledb.compress_orderby = 'occurred_at DESC'
);

SELECT add_compression_policy('security_events', INTERVAL '7 days');

-- Compress dashboard views older than 14 days
ALTER TABLE dashboard_views SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'dashboard_id',
    timescaledb.compress_orderby = 'viewed_at DESC'
);

SELECT add_compression_policy('dashboard_views', INTERVAL '14 days');

-- Compress query metrics older than 3 days
ALTER TABLE query_metrics SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'query_hash, data_source_id',
    timescaledb.compress_orderby = 'executed_at DESC'
);

SELECT add_compression_policy('query_metrics', INTERVAL '3 days');

-- Compress API metrics older than 3 days
ALTER TABLE api_metrics SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'endpoint_hash, method',
    timescaledb.compress_orderby = 'requested_at DESC'
);

SELECT add_compression_policy('api_metrics', INTERVAL '3 days');

-- ===================================================================
-- INDEXES FOR COMMON QUERIES
-- ===================================================================

-- Dashboard views indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_views_user ON dashboard_views(user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_views_session ON dashboard_views(session_id);

-- Query metrics indexes
CREATE INDEX IF NOT EXISTS idx_query_metrics_hash ON query_metrics(query_hash, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_metrics_datasource ON query_metrics(data_source_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_metrics_slow ON query_metrics(execution_time_ms DESC, executed_at DESC)
    WHERE execution_time_ms > 1000; -- Slow queries only

-- API metrics indexes
CREATE INDEX IF NOT EXISTS idx_api_metrics_endpoint ON api_metrics(endpoint_hash, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_metrics_errors ON api_metrics(status_code, requested_at DESC)
    WHERE status_code >= 400;

-- System metrics indexes
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_tags ON system_metrics USING GIN(tags);

-- ===================================================================
-- HELPER FUNCTIONS
-- ===================================================================

-- Function to get dashboard performance over time
CREATE OR REPLACE FUNCTION get_dashboard_performance(
    p_dashboard_id UUID,
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_end_time TIMESTAMP WITH TIME ZONE,
    p_bucket_size INTERVAL DEFAULT '1 hour'
)
RETURNS TABLE (
    time_bucket TIMESTAMP WITH TIME ZONE,
    view_count BIGINT,
    unique_viewers BIGINT,
    avg_duration NUMERIC,
    total_interactions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        time_bucket(p_bucket_size, viewed_at) AS time_bucket,
        COUNT(*)::BIGINT AS view_count,
        COUNT(DISTINCT user_id)::BIGINT AS unique_viewers,
        AVG(duration_seconds)::NUMERIC AS avg_duration,
        SUM(widget_interactions)::BIGINT AS total_interactions
    FROM dashboard_views
    WHERE dashboard_id = p_dashboard_id
      AND viewed_at >= p_start_time
      AND viewed_at <= p_end_time
    GROUP BY time_bucket
    ORDER BY time_bucket DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get slow queries
CREATE OR REPLACE FUNCTION get_slow_queries(
    p_threshold_ms INTEGER DEFAULT 1000,
    p_hours_back INTEGER DEFAULT 24,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    query_text TEXT,
    avg_time NUMERIC,
    max_time INTEGER,
    execution_count BIGINT,
    error_count BIGINT,
    last_executed TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        qm.query_text,
        AVG(qm.execution_time_ms)::NUMERIC AS avg_time,
        MAX(qm.execution_time_ms) AS max_time,
        COUNT(*)::BIGINT AS execution_count,
        SUM(CASE WHEN qm.status = 'error' THEN 1 ELSE 0 END)::BIGINT AS error_count,
        MAX(qm.executed_at) AS last_executed
    FROM query_metrics qm
    WHERE qm.executed_at >= NOW() - (p_hours_back || ' hours')::INTERVAL
      AND qm.execution_time_ms > p_threshold_ms
    GROUP BY qm.query_text
    ORDER BY avg_time DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- COMMENTS
-- ===================================================================

COMMENT ON TABLE dashboard_views IS 'Time-series tracking of dashboard views for analytics';
COMMENT ON TABLE widget_interactions IS 'Time-series tracking of user interactions with widgets';
COMMENT ON TABLE query_metrics IS 'Performance metrics for all data queries';
COMMENT ON TABLE api_metrics IS 'Performance metrics for API endpoints';
COMMENT ON TABLE system_metrics IS 'System-level metrics (CPU, memory, etc.)';

COMMENT ON MATERIALIZED VIEW dashboard_views_hourly IS 'Hourly aggregated dashboard view statistics';
COMMENT ON MATERIALIZED VIEW dashboard_views_daily IS 'Daily aggregated dashboard view statistics';
COMMENT ON MATERIALIZED VIEW query_performance_hourly IS 'Hourly query performance statistics';
COMMENT ON MATERIALIZED VIEW api_performance_5min IS '5-minute API performance statistics';
COMMENT ON MATERIALIZED VIEW user_activity_daily IS 'Daily user activity metrics';

-- ===================================================================
-- COMPLETION MESSAGE
-- ===================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TimescaleDB Setup Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Hypertables created: 9';
    RAISE NOTICE 'Continuous aggregates: 5';
    RAISE NOTICE 'Retention policies: 10';
    RAISE NOTICE 'Compression policies: 5';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Time-series optimization enabled for:';
    RAISE NOTICE '- Audit logs & security events';
    RAISE NOTICE '- Dashboard views & analytics';
    RAISE NOTICE '- Query performance metrics';
    RAISE NOTICE '- API performance monitoring';
    RAISE NOTICE '- System metrics tracking';
    RAISE NOTICE '========================================';
END $$;
