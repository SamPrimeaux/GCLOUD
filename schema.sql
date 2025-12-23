-- D1 Database Schema for GCLOUD MCP Integration
-- This schema enables SQL queries across R2 buckets and system metadata

-- R2 Buckets Registry
CREATE TABLE IF NOT EXISTS r2_buckets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket_name TEXT NOT NULL UNIQUE,
  binding_name TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  object_count INTEGER DEFAULT 0,
  total_size_bytes INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT 0
);

-- R2 Objects Index (for SQL queryable metadata)
CREATE TABLE IF NOT EXISTS r2_objects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket_id INTEGER NOT NULL,
  object_key TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  etag TEXT,
  last_modified DATETIME,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bucket_id) REFERENCES r2_buckets(id),
  UNIQUE(bucket_id, object_key)
);

-- MCP Tool Usage Logs
CREATE TABLE IF NOT EXISTS mcp_tool_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_name TEXT NOT NULL,
  parameters JSON,
  result JSON,
  execution_time_ms INTEGER,
  success BOOLEAN DEFAULT 1,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Supabase Integration Tracking
CREATE TABLE IF NOT EXISTS supabase_sync (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  last_sync DATETIME,
  record_count INTEGER,
  sync_status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI Knowledge Base & Secrets Management
-- Stores API key fingerprints (SHA256 hashes) - NEVER stores plaintext
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSON NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- API Keys & Secrets Registry (fingerprints only)
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT NOT NULL UNIQUE,
  key_fingerprint TEXT NOT NULL,
  env_var_names TEXT,
  last_verified DATETIME,
  is_active BOOLEAN DEFAULT 1,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- SEO Meta Management (D1/SQLite version)
CREATE TABLE IF NOT EXISTS seo_meta (
  id            TEXT PRIMARY KEY,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),

  url           TEXT NOT NULL UNIQUE,
  title         TEXT,
  description   TEXT,
  meta_robots   TEXT,
  canonical_url TEXT,

  open_graph       TEXT,
  twitter_card     TEXT,
  structured_data  TEXT,

  language      TEXT,
  locale        TEXT,
  tags          TEXT,
  source        TEXT,
  notes         TEXT,

  publish_date  TEXT,
  is_published  INTEGER NOT NULL DEFAULT 0,
  seo_score     REAL
);

-- ============================================================================
-- MeauxOS Command Center (SaaS Dashboard) Tables
-- ============================================================================

-- Grant Management
CREATE TABLE IF NOT EXISTS grant_applications (
  id TEXT PRIMARY KEY,
  applicant_name TEXT NOT NULL,
  grant_type TEXT NOT NULL,
  amount_requested REAL NOT NULL DEFAULT 0,
  amount_approved REAL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected|needs_info
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS grant_activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grant_id TEXT NOT NULL,
  action TEXT NOT NULL, -- submitted|reviewed|approved|rejected|comment
  actor TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (grant_id) REFERENCES grant_applications(id)
);

CREATE INDEX IF NOT EXISTS idx_grants_status_created ON grant_applications(status, created_at);
CREATE INDEX IF NOT EXISTS idx_grant_log_grant_created ON grant_activity_log(grant_id, created_at);

-- Project Management
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active|paused|completed|archived
  priority INTEGER NOT NULL DEFAULT 0, -- higher = more important
  start_date TEXT,
  deadline TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open|in_progress|blocked|completed
  assigned_to TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS project_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, user_id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_projects_status_priority_deadline ON projects(status, priority, deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status_due ON project_tasks(project_id, status, due_date);

-- Team directory (for aggregate counts)
CREATE TABLE IF NOT EXISTS team_members (
  user_id TEXT PRIMARY KEY,
  display_name TEXT,
  email TEXT,
  role TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Analytics & Metrics
CREATE TABLE IF NOT EXISTS analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action_type TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_created_action ON analytics(created_at, action_type);

-- Infrastructure Monitoring
CREATE TABLE IF NOT EXISTS deployments (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  environment TEXT NOT NULL, -- dev|staging|prod
  status TEXT NOT NULL, -- success|failed|running
  deployed_by TEXT,
  deployed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deployment_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deployment_id TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (deployment_id) REFERENCES deployments(id)
);

CREATE INDEX IF NOT EXISTS idx_deployments_deployed_at ON deployments(deployed_at);
CREATE INDEX IF NOT EXISTS idx_deployment_logs_deployment_id ON deployment_logs(deployment_id);

CREATE TABLE IF NOT EXISTS worker_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_name TEXT NOT NULL,
  execution_time_ms INTEGER,
  status_code INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_worker_stats_created_worker ON worker_stats(created_at, worker_name);

-- Knowledge / workflow tables referenced by sync (minimal MVP)
CREATE TABLE IF NOT EXISTS infrastructure_documentation (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS development_workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  steps_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS code_knowledge_base (
  id TEXT PRIMARY KEY,
  category TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Triggers for updated_at (Command Center)
CREATE TRIGGER IF NOT EXISTS trg_grant_applications_updated_at
AFTER UPDATE ON grant_applications
FOR EACH ROW
BEGIN
  UPDATE grant_applications SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_projects_updated_at
AFTER UPDATE ON projects
FOR EACH ROW
BEGIN
  UPDATE projects SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_project_tasks_updated_at
AFTER UPDATE ON project_tasks
FOR EACH ROW
BEGIN
  UPDATE project_tasks SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Seed minimal sample rows (safe to ignore if already present)
INSERT OR IGNORE INTO team_members (user_id, display_name, email, role, is_active) VALUES
  ('u_admin', 'Admin', 'admin@example.com', 'admin', 1),
  ('u_ops', 'Ops', 'ops@example.com', 'ops', 1),
  ('u_pm', 'PM', 'pm@example.com', 'pm', 1);

INSERT OR IGNORE INTO projects (id, name, status, priority, start_date, deadline) VALUES
  ('proj_meauxos', 'MeauxOS Command Center', 'active', 10, date('now', '-7 day'), date('now', '+21 day')),
  ('proj_seo', 'SEO Backlog', 'active', 7, date('now', '-14 day'), date('now', '+14 day'));

INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES
  ('proj_meauxos', 'u_pm', 'owner'),
  ('proj_meauxos', 'u_ops', 'contributor'),
  ('proj_seo', 'u_ops', 'owner');

INSERT OR IGNORE INTO project_tasks (id, project_id, title, status, assigned_to, priority, due_date) VALUES
  ('task_1', 'proj_meauxos', 'Wire dashboard panels to D1 queries', 'in_progress', 'u_pm', 10, date('now', '+3 day')),
  ('task_2', 'proj_meauxos', 'Add grant tables + sample data', 'completed', 'u_ops', 8, date('now', '-1 day')),
  ('task_3', 'proj_seo', 'Improve SEO for low scoring pages', 'open', 'u_ops', 6, date('now', '-2 day'));

INSERT OR IGNORE INTO grant_applications (id, applicant_name, grant_type, amount_requested, amount_approved, status, notes) VALUES
  ('ga_1', 'Alex Rivera', 'Power Chair', 12000, NULL, 'pending', 'Initial intake complete'),
  ('ga_2', 'Jamie Chen', 'Home Modification', 8000, 7500, 'approved', 'Approved with minor adjustments'),
  ('ga_3', 'Morgan Patel', 'Vehicle Modification', 15000, NULL, 'pending', 'Awaiting quotes');

INSERT OR IGNORE INTO grant_activity_log (grant_id, action, actor, details) VALUES
  ('ga_1', 'submitted', 'u_ops', 'Submitted via web form'),
  ('ga_2', 'approved', 'u_admin', 'Approved by committee'),
  ('ga_3', 'submitted', 'u_ops', 'Submitted via intake call');

INSERT OR IGNORE INTO deployments (id, project_name, environment, status, deployed_by) VALUES
  ('dep_1', 'gcloudv3', 'prod', 'success', 'ci'),
  ('dep_2', 'gcloudv3', 'prod', 'success', 'ci');

INSERT OR IGNORE INTO deployment_logs (deployment_id, level, message) VALUES
  ('dep_1', 'info', 'Worker deployed successfully'),
  ('dep_2', 'info', 'Pages deployed successfully');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_r2_objects_bucket_id ON r2_objects(bucket_id);
CREATE INDEX IF NOT EXISTS idx_r2_objects_key ON r2_objects(object_key);
CREATE INDEX IF NOT EXISTS idx_r2_objects_content_type ON r2_objects(content_type);
CREATE INDEX IF NOT EXISTS idx_r2_objects_modified ON r2_objects(last_modified);
CREATE INDEX IF NOT EXISTS idx_mcp_logs_tool ON mcp_tool_logs(tool_name);
CREATE INDEX IF NOT EXISTS idx_mcp_logs_created ON mcp_tool_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_kb_category ON ai_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_api_keys_service ON api_keys(service_name);
CREATE INDEX IF NOT EXISTS idx_seo_meta_url ON seo_meta(url);
CREATE INDEX IF NOT EXISTS idx_seo_meta_is_published ON seo_meta(is_published);

-- Insert initial R2 buckets from wrangler.toml
INSERT OR IGNORE INTO r2_buckets (bucket_name, binding_name, description) VALUES
  ('allinfrastructure', 'ALLINFRASTRUCTURE', 'All infrastructure data and configurations'),
  ('meauxlife-appkit', 'APP_ASSETS', 'Application assets and static files'),
  ('inneranimalmedia-email-archive', 'EMAIL_ARCHIVE', 'Email archive storage'),
  ('samicloudbackups', 'PERSONAL_BACKUP', 'Personal backup storage'),
  ('autorag-meauxbility-chatbot', 'R2_AUTORAG', 'AutoRAG chatbot data'),
  ('meauxbility-dashboard', 'R2_DASHBOARD', 'Meauxbility dashboard assets');

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS trg_seo_meta_updated_at
AFTER UPDATE ON seo_meta
FOR EACH ROW
BEGIN
  UPDATE seo_meta
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

-- Insert initial API key registry (fingerprints will be added via MCP tools)
INSERT OR IGNORE INTO api_keys (service_name, key_fingerprint, env_var_names, notes) VALUES
  ('google-gemini', 'pending', 'GOOGLE_GEMINI_KEY,GEMINI_API_KEY', 'Google Gemini API for AI/ML'),
  ('cloudflare', 'pending', 'CLOUDFLARE_API_TOKEN', 'Cloudflare API for R2/D1/Workers'),
  ('supabase', 'pending', 'SUPABASE_SERVICE_ROLE,SUPABASE_URL', 'Supabase database and auth'),
  ('anthropic-claude', 'pending', 'ANTHROPIC_API_KEY,CLAUDE_API_KEY', 'Claude API for AI assistance'),
  ('github', 'pending', 'GITHUB_TOKEN,GH_TOKEN', 'GitHub API for repos and models');

-- Initial SEO entries
INSERT OR IGNORE INTO seo_meta (id, url, title, description, meta_robots, canonical_url, language, locale, tags, source, is_published, publish_date) VALUES
  ('meauxbility-home', 'https://meauxbility.org/', 'Meauxbility – More Options. More Access. More Life.', 'Meauxbility is a survivor-led nonprofit helping people with spinal cord injuries access treatments, equipment, and community support.', 'index,follow', 'https://meauxbility.org/', 'en', 'en-US', 'nonprofit,spinal-cord-injury,trauma,recovery,meauxbility', 'meauxos', 1, datetime('now'));

-- Views for easy querying
CREATE VIEW IF NOT EXISTS v_bucket_stats AS
SELECT
  b.bucket_name,
  b.binding_name,
  b.description,
  COUNT(o.id) as object_count,
  SUM(o.size_bytes) as total_size_bytes,
  MAX(o.last_modified) as latest_update,
  b.created_at
FROM r2_buckets b
LEFT JOIN r2_objects o ON b.id = o.bucket_id
GROUP BY b.id;

CREATE VIEW IF NOT EXISTS v_recent_objects AS
SELECT
  b.bucket_name,
  o.object_key,
  o.content_type,
  o.size_bytes,
  o.last_modified
FROM r2_objects o
JOIN r2_buckets b ON o.bucket_id = b.id
ORDER BY o.last_modified DESC
LIMIT 100;
