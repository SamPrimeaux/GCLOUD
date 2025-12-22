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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_r2_objects_bucket_id ON r2_objects(bucket_id);
CREATE INDEX IF NOT EXISTS idx_r2_objects_key ON r2_objects(object_key);
CREATE INDEX IF NOT EXISTS idx_r2_objects_content_type ON r2_objects(content_type);
CREATE INDEX IF NOT EXISTS idx_r2_objects_modified ON r2_objects(last_modified);
CREATE INDEX IF NOT EXISTS idx_mcp_logs_tool ON mcp_tool_logs(tool_name);
CREATE INDEX IF NOT EXISTS idx_mcp_logs_created ON mcp_tool_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_kb_category ON ai_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_api_keys_service ON api_keys(service_name);

-- Insert initial R2 buckets from wrangler.toml
INSERT OR IGNORE INTO r2_buckets (bucket_name, binding_name, description) VALUES
  ('meauxlife-appkit', 'APP_ASSETS', 'Application assets and static files'),
  ('inneranimalmedia-email-archive', 'EMAIL_ARCHIVE', 'Email archive storage'),
  ('samicloudbackups', 'PERSONAL_BACKUP', 'Personal backup storage'),
  ('autorag-meauxbility-chatbot', 'R2_AUTORAG', 'AutoRAG chatbot data'),
  ('meauxbility-dashboard', 'R2_DASHBOARD', 'Meauxbility dashboard assets');

-- Insert initial API key registry (fingerprints will be added via MCP tools)
INSERT OR IGNORE INTO api_keys (service_name, key_fingerprint, env_var_names, notes) VALUES
  ('google-gemini', 'pending', 'GOOGLE_GEMINI_KEY,GEMINI_API_KEY', 'Google Gemini API for AI/ML'),
  ('cloudflare', 'pending', 'CLOUDFLARE_API_TOKEN', 'Cloudflare API for R2/D1/Workers'),
  ('supabase', 'pending', 'SUPABASE_SERVICE_ROLE,SUPABASE_URL', 'Supabase database and auth'),
  ('anthropic-claude', 'pending', 'ANTHROPIC_API_KEY,CLAUDE_API_KEY', 'Claude API for AI assistance'),
  ('github', 'pending', 'GITHUB_TOKEN,GH_TOKEN', 'GitHub API for repos and models');

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
