-- Security hardening: MFA columns + security_alerts + indexes
-- Safe to run on existing databases (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)

ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_backup_codes JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created ON security_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_unresolved ON security_alerts(resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_sources_project_status ON data_sources(project_id, last_sync_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_project_status ON activities(project_id, calculation_status, created_at DESC);
