# MCP (Model Context Protocol) Integration Guide

## 🚀 Overview

GCLOUD v3 now includes a **full MCP server** that enables AI assistants to query your infrastructure using SQL and tools. This allows you to:

- Run SQL queries on D1 database
- Query metadata about all 76+ R2 buckets using SQL
- List, search, and analyze R2 objects
- Sync R2 bucket metadata to D1 for powerful SQL queries
- Integrate with Supabase
- Access GitHub Models API for AI chat

## 🎯 What is MCP?

**Model Context Protocol (MCP)** is an open standard by Anthropic that allows AI assistants (like Claude) to connect to data sources and tools. With MCP, you can:

- Query databases with natural language → SQL
- Search across all R2 buckets
- Analyze storage usage and patterns
- Automate data operations

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│              GCLOUD v3 Worker                        │
│                                                      │
│  ┌──────────────┐       ┌─────────────────────┐    │
│  │ MCP Server   │←──────│  HTTP Endpoint      │    │
│  │ (8 Tools)    │       │  POST /mcp          │    │
│  └──────┬───────┘       └─────────────────────┘    │
│         │                                            │
│         ├─→ D1 Database (MEAUXOS_DB)                │
│         │   • r2_buckets (registry)                 │
│         │   • r2_objects (76+ buckets indexed)      │
│         │   • mcp_tool_logs                         │
│         │                                            │
│         ├─→ R2 Buckets (5 bound + 71 queryable)     │
│         │   • APP_ASSETS                            │
│         │   • EMAIL_ARCHIVE                         │
│         │   • PERSONAL_BACKUP                       │
│         │   • R2_AUTORAG                            │
│         │   • R2_DASHBOARD                          │
│         │                                            │
│         ├─→ Supabase (via REST API)                 │
│         └─→ GitHub Models (GPT-4o, etc.)            │
└─────────────────────────────────────────────────────┘
```

## 📦 Available MCP Tools

### 1. `query_d1`
Execute SQL queries on your D1 database.

```json
{
  "name": "query_d1",
  "arguments": {
    "query": "SELECT * FROM r2_buckets WHERE bucket_name LIKE '%dashboard%'",
    "params": []
  }
}
```

### 2. `list_r2_buckets`
List all R2 buckets with statistics.

```json
{
  "name": "list_r2_buckets",
  "arguments": {}
}
```

**Response:**
```json
[
  {
    "bucket_name": "meauxbility-dashboard",
    "binding_name": "R2_DASHBOARD",
    "object_count": 127,
    "total_size_bytes": 45032891,
    "latest_update": "2025-12-22T04:30:00Z"
  }
]
```

### 3. `query_r2_objects`
Query R2 objects using SQL filters.

```json
{
  "name": "query_r2_objects",
  "arguments": {
    "bucket_name": "meauxbility-dashboard",
    "content_type": "image/png",
    "limit": 50
  }
}
```

### 4. `sync_r2_bucket`
Sync R2 bucket metadata to D1 for SQL querying.

```json
{
  "name": "sync_r2_bucket",
  "arguments": {
    "bucket_name": "meauxbility-dashboard"
  }
}
```

**Why sync?** R2 is object storage (like S3), not a database. By syncing metadata to D1, you can run powerful SQL queries across all your buckets.

### 5. `get_r2_object`
Retrieve metadata about a specific R2 object.

```json
{
  "name": "get_r2_object",
  "arguments": {
    "bucket_name": "meauxbility-dashboard",
    "object_key": "index.html"
  }
}
```

### 6. `list_r2_objects`
List objects in an R2 bucket directly.

```json
{
  "name": "list_r2_objects",
  "arguments": {
    "bucket_name": "meauxbility-dashboard",
    "prefix": "assets/",
    "limit": 100
  }
}
```

### 7. `query_supabase`
Query your Supabase database.

```json
{
  "name": "query_supabase",
  "arguments": {
    "table": "users",
    "select": "id,email,created_at",
    "filter": {
      "status": "active"
    },
    "limit": 100
  }
}
```

### 8. `analyze_r2_usage`
Get analytics and usage statistics.

```json
{
  "name": "analyze_r2_usage",
  "arguments": {
    "bucket_name": "meauxbility-dashboard"
  }
}
```

**All buckets analysis:**
```json
{
  "name": "analyze_r2_usage",
  "arguments": {}
}
```

## 🔧 API Endpoints

### MCP Protocol Endpoint
```bash
POST https://gcloudv3.meauxbility.workers.dev/mcp
Content-Type: application/json

{
  "method": "tools/list"
}
```

### REST API Endpoints

#### 1. Health Check
```bash
GET https://gcloudv3.meauxbility.workers.dev/health
```

#### 2. List MCP Tools
```bash
GET https://gcloudv3.meauxbility.workers.dev/api/mcp/tools
```

#### 3. Query D1 Directly
```bash
POST https://gcloudv3.meauxbility.workers.dev/api/d1/query
Content-Type: application/json

{
  "query": "SELECT * FROM v_bucket_stats",
  "params": []
}
```

#### 4. List R2 Buckets
```bash
GET https://gcloudv3.meauxbility.workers.dev/api/r2/buckets
```

#### 5. Sync R2 Bucket
```bash
POST https://gcloudv3.meauxbility.workers.dev/api/r2/sync/meauxbility-dashboard
```

#### 6. GitHub Models Chat
```bash
POST https://gcloudv3.meauxbility.workers.dev/api/chat
Content-Type: application/json

{
  "message": "What is GCLOUD?",
  "model": "gpt-4o"
}
```

## 🗄️ Database Schema

### Tables

#### `r2_buckets`
Registry of all R2 buckets (76+ buckets)

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| bucket_name | TEXT | Unique bucket name |
| binding_name | TEXT | Cloudflare binding |
| description | TEXT | Bucket description |
| created_at | DATETIME | Creation timestamp |
| object_count | INTEGER | Number of objects |
| total_size_bytes | INTEGER | Total storage used |

#### `r2_objects`
Metadata index for all objects across buckets

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| bucket_id | INTEGER | Foreign key to r2_buckets |
| object_key | TEXT | Object path/key |
| content_type | TEXT | MIME type |
| size_bytes | INTEGER | File size |
| etag | TEXT | Entity tag |
| last_modified | DATETIME | Last modified date |
| metadata | JSON | Custom metadata |

#### `mcp_tool_logs`
Audit log of all MCP tool executions

| Column | Type | Description |
|--------|------|-------------|
| tool_name | TEXT | Tool that was called |
| parameters | JSON | Tool arguments |
| result | JSON | Tool response |
| execution_time_ms | INTEGER | Execution duration |
| success | BOOLEAN | Success/failure |
| error_message | TEXT | Error details |

### Views

#### `v_bucket_stats`
Real-time bucket statistics

```sql
SELECT * FROM v_bucket_stats;
```

#### `v_recent_objects`
100 most recently modified objects

```sql
SELECT * FROM v_recent_objects;
```

## 🚀 Setup Instructions

### 1. Initialize Remote D1 Database

```bash
npx wrangler d1 execute MEAUXOS_DB --remote --file=schema.sql
```

### 2. Sync Your R2 Buckets

Sync each bucket to make it queryable with SQL:

```bash
# Via API
curl -X POST https://gcloudv3.meauxbility.workers.dev/api/r2/sync/meauxbility-dashboard
curl -X POST https://gcloudv3.meauxbility.workers.dev/api/r2/sync/meauxlife-appkit
# ... repeat for all 76 buckets
```

Or use the MCP tool:

```json
{
  "method": "tools/call",
  "params": {
    "name": "sync_r2_bucket",
    "arguments": {
      "bucket_name": "meauxbility-dashboard"
    }
  }
}
```

### 3. Set Up Supabase (Optional)

Add secrets to Cloudflare Workers:

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE
```

## 📊 Example Use Cases

### 1. Find All Images Across All Buckets

```sql
SELECT
  b.bucket_name,
  o.object_key,
  o.size_bytes / 1024 / 1024 as size_mb,
  o.last_modified
FROM r2_objects o
JOIN r2_buckets b ON o.bucket_id = b.id
WHERE o.content_type LIKE 'image/%'
ORDER BY o.size_bytes DESC
LIMIT 100;
```

### 2. Get Total Storage Usage

```sql
SELECT
  SUM(total_size_bytes) / 1024 / 1024 / 1024 as total_gb,
  COUNT(*) as total_buckets,
  SUM(object_count) as total_objects
FROM r2_buckets;
```

### 3. Find Large Files (>10MB)

```sql
SELECT
  b.bucket_name,
  o.object_key,
  o.size_bytes / 1024 / 1024 as size_mb
FROM r2_objects o
JOIN r2_buckets b ON o.bucket_id = b.id
WHERE o.size_bytes > 10485760
ORDER BY o.size_bytes DESC;
```

### 4. Find Recently Modified Files

```sql
SELECT * FROM v_recent_objects
WHERE last_modified > datetime('now', '-7 days');
```

### 5. Search by Filename Pattern

```sql
SELECT
  b.bucket_name,
  o.object_key,
  o.last_modified
FROM r2_objects o
JOIN r2_buckets b ON o.bucket_id = b.id
WHERE o.object_key LIKE '%.pdf'
ORDER BY o.last_modified DESC;
```

## 🔐 Security

- **MCP endpoint**: Public, but consider adding authentication
- **D1 queries**: Validated and parameterized to prevent SQL injection
- **R2 access**: Only metadata exposed unless you explicitly fetch objects
- **Supabase**: Uses service role key (keep secret!)
- **GitHub Models**: Token-based authentication

## 🎯 Integration with Claude Code

To connect Claude Code to your MCP server:

1. Install Claude Code MCP extension
2. Configure MCP server URL:
   ```
   https://gcloudv3.meauxbility.workers.dev/mcp
   ```
3. Claude can now query your infrastructure!

Example prompts:
- "Show me all PDF files in my buckets"
- "What's my total R2 storage usage?"
- "Find all images uploaded this week"
- "Which bucket has the most files?"

## 📚 Resources

- **MCP Specification**: https://modelcontextprotocol.io/
- **Cloudflare D1 Docs**: https://developers.cloudflare.com/d1/
- **Cloudflare R2 Docs**: https://developers.cloudflare.com/r2/
- **GitHub Models**: https://github.com/marketplace/models

## 🔄 Maintenance

### Keep Buckets Synced

Set up a cron trigger to auto-sync buckets:

```toml
# In wrangler.toml
[triggers]
crons = ["0 */6 * * *"]  # Every 6 hours
```

Then handle in your worker:

```javascript
export default {
  async scheduled(event, env, ctx) {
    const server = new MCPServer(env);
    const buckets = await server.listR2Buckets();

    for (const bucket of buckets) {
      await server.syncR2Bucket({ bucket_name: bucket.bucket_name });
    }
  }
};
```

## 🎉 What's Next?

- [ ] Add authentication to MCP endpoint
- [ ] Set up automated R2 sync (cron)
- [ ] Add more Supabase integration features
- [ ] Create dashboard for MCP analytics
- [ ] Build custom MCP clients
- [ ] Add full-text search across R2 objects
