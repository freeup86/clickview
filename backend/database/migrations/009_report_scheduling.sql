-- Report Scheduling Tables
-- Manages scheduled report generation and distribution

-- =================================================================
-- REPORT SCHEDULES
-- =================================================================

CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,

  -- Schedule configuration
  schedule_config JSONB NOT NULL, -- { type: 'cron' | 'interval' | 'event', cron?: string, interval?: number, timezone?: string }

  -- Distribution configuration
  distribution_config JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of distribution configs

  -- Parameters for report execution
  parameters JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP,

  -- Execution tracking
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  run_count INTEGER DEFAULT 0,

  -- Indexes
  CONSTRAINT fk_report FOREIGN KEY (report_id) REFERENCES dashboards(id) ON DELETE CASCADE,
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_report_schedules_report_id ON report_schedules(report_id);
CREATE INDEX idx_report_schedules_enabled ON report_schedules(enabled) WHERE enabled = TRUE;
CREATE INDEX idx_report_schedules_next_run ON report_schedules(next_run) WHERE enabled = TRUE;
CREATE INDEX idx_report_schedules_created_by ON report_schedules(created_by);

-- =================================================================
-- SCHEDULE EXECUTIONS
-- =================================================================

CREATE TABLE IF NOT EXISTS schedule_executions (
  id VARCHAR(50) PRIMARY KEY,
  schedule_id UUID NOT NULL,

  -- Execution timing
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_ms INTEGER,

  -- Status
  status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'success', 'failed', 'partial')),
  error TEXT,

  -- Distribution results
  distribution_results JSONB, -- Array of { type, success, error?, timestamp }

  -- Report metadata
  report_size_bytes INTEGER,
  records_processed INTEGER,

  CONSTRAINT fk_schedule FOREIGN KEY (schedule_id) REFERENCES report_schedules(id) ON DELETE CASCADE
);

CREATE INDEX idx_schedule_executions_schedule_id ON schedule_executions(schedule_id);
CREATE INDEX idx_schedule_executions_started_at ON schedule_executions(started_at DESC);
CREATE INDEX idx_schedule_executions_status ON schedule_executions(status);

-- =================================================================
-- EXECUTION LOGS
-- =================================================================

CREATE TABLE IF NOT EXISTS schedule_execution_logs (
  id SERIAL PRIMARY KEY,
  execution_id VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  level VARCHAR(10) NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),
  message TEXT NOT NULL,
  context JSONB,

  CONSTRAINT fk_execution FOREIGN KEY (execution_id) REFERENCES schedule_executions(id) ON DELETE CASCADE
);

CREATE INDEX idx_execution_logs_execution_id ON schedule_execution_logs(execution_id);
CREATE INDEX idx_execution_logs_timestamp ON schedule_execution_logs(timestamp DESC);
CREATE INDEX idx_execution_logs_level ON schedule_execution_logs(level);

-- =================================================================
-- DISTRIBUTION HISTORY
-- =================================================================

CREATE TABLE IF NOT EXISTS distribution_history (
  id SERIAL PRIMARY KEY,
  execution_id VARCHAR(50) NOT NULL,
  distribution_type VARCHAR(20) NOT NULL CHECK (distribution_type IN ('email', 'slack', 'teams', 'sftp', 'webhook')),

  -- Timing
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_ms INTEGER,

  -- Status
  success BOOLEAN NOT NULL,
  error TEXT,

  -- Details
  recipient_count INTEGER,
  file_size_bytes INTEGER,
  metadata JSONB,

  CONSTRAINT fk_execution FOREIGN KEY (execution_id) REFERENCES schedule_executions(id) ON DELETE CASCADE
);

CREATE INDEX idx_distribution_history_execution_id ON distribution_history(execution_id);
CREATE INDEX idx_distribution_history_type ON distribution_history(distribution_type);
CREATE INDEX idx_distribution_history_success ON distribution_history(success);

-- =================================================================
-- REPORT EXPORTS
-- =================================================================

CREATE TABLE IF NOT EXISTS report_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL,

  -- Export configuration
  format VARCHAR(20) NOT NULL CHECK (format IN ('pdf', 'excel', 'csv', 'json', 'ppt')),
  parameters JSONB DEFAULT '{}'::jsonb,

  -- File info
  file_path VARCHAR(500),
  file_size_bytes INTEGER,

  -- Status
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error TEXT,

  -- Timing
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP, -- Auto-cleanup old exports

  -- Creator
  created_by UUID NOT NULL,

  CONSTRAINT fk_report FOREIGN KEY (report_id) REFERENCES dashboards(id) ON DELETE CASCADE,
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_report_exports_report_id ON report_exports(report_id);
CREATE INDEX idx_report_exports_status ON report_exports(status);
CREATE INDEX idx_report_exports_created_at ON report_exports(created_at DESC);
CREATE INDEX idx_report_exports_expires_at ON report_exports(expires_at) WHERE expires_at IS NOT NULL;

-- =================================================================
-- SCHEDULE ALERTS
-- =================================================================

CREATE TABLE IF NOT EXISTS schedule_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL,

  -- Alert configuration
  alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('failure', 'success', 'delayed', 'threshold')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,

  -- Conditions
  consecutive_failures INTEGER, -- Alert after N consecutive failures
  delay_minutes INTEGER, -- Alert if execution delayed by N minutes
  threshold_config JSONB, -- Custom threshold conditions

  -- Recipients
  notification_channels JSONB NOT NULL, -- Array of { type: 'email' | 'slack' | 'teams', config: {...} }

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP,
  last_triggered_at TIMESTAMP,
  trigger_count INTEGER DEFAULT 0,

  CONSTRAINT fk_schedule FOREIGN KEY (schedule_id) REFERENCES report_schedules(id) ON DELETE CASCADE
);

CREATE INDEX idx_schedule_alerts_schedule_id ON schedule_alerts(schedule_id);
CREATE INDEX idx_schedule_alerts_enabled ON schedule_alerts(enabled) WHERE enabled = TRUE;

-- =================================================================
-- FUNCTIONS
-- =================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for report_schedules
DROP TRIGGER IF EXISTS trigger_update_report_schedules_updated_at ON report_schedules;
CREATE TRIGGER trigger_update_report_schedules_updated_at
  BEFORE UPDATE ON report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for schedule_alerts
DROP TRIGGER IF EXISTS trigger_update_schedule_alerts_updated_at ON schedule_alerts;
CREATE TRIGGER trigger_update_schedule_alerts_updated_at
  BEFORE UPDATE ON schedule_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Calculate execution duration
CREATE OR REPLACE FUNCTION calculate_execution_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_ms = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_execution_duration ON schedule_executions;
CREATE TRIGGER trigger_calculate_execution_duration
  BEFORE UPDATE ON schedule_executions
  FOR EACH ROW
  WHEN (NEW.completed_at IS NOT NULL)
  EXECUTE FUNCTION calculate_execution_duration();

-- =================================================================
-- VIEWS
-- =================================================================

-- Schedule execution summary
CREATE OR REPLACE VIEW schedule_execution_summary AS
SELECT
  s.id AS schedule_id,
  s.name AS schedule_name,
  s.enabled,
  s.last_run,
  s.next_run,
  s.run_count,
  COUNT(e.id) AS total_executions,
  COUNT(CASE WHEN e.status = 'success' THEN 1 END) AS successful_executions,
  COUNT(CASE WHEN e.status = 'failed' THEN 1 END) AS failed_executions,
  AVG(e.duration_ms) AS avg_duration_ms,
  MAX(e.started_at) AS last_execution_at
FROM report_schedules s
LEFT JOIN schedule_executions e ON s.id = e.schedule_id
GROUP BY s.id, s.name, s.enabled, s.last_run, s.next_run, s.run_count;

-- Recent execution failures
CREATE OR REPLACE VIEW recent_execution_failures AS
SELECT
  s.id AS schedule_id,
  s.name AS schedule_name,
  e.id AS execution_id,
  e.started_at,
  e.completed_at,
  e.error,
  e.distribution_results
FROM schedule_executions e
JOIN report_schedules s ON e.schedule_id = s.id
WHERE e.status = 'failed'
  AND e.started_at > NOW() - INTERVAL '7 days'
ORDER BY e.started_at DESC;

-- =================================================================
-- COMMENTS
-- =================================================================

COMMENT ON TABLE report_schedules IS 'Scheduled report generation and distribution';
COMMENT ON TABLE schedule_executions IS 'History of schedule execution runs';
COMMENT ON TABLE schedule_execution_logs IS 'Detailed logs for each execution';
COMMENT ON TABLE distribution_history IS 'History of report distributions';
COMMENT ON TABLE report_exports IS 'On-demand report exports';
COMMENT ON TABLE schedule_alerts IS 'Alert configuration for schedule failures/delays';

COMMENT ON COLUMN report_schedules.schedule_config IS 'JSON configuration: { type, cron, interval, eventTrigger, timezone }';
COMMENT ON COLUMN report_schedules.distribution_config IS 'Array of distribution configurations';
COMMENT ON COLUMN schedule_executions.distribution_results IS 'Results of each distribution attempt';
COMMENT ON COLUMN schedule_alerts.notification_channels IS 'Array of notification channel configurations';
