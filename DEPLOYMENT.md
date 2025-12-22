# GCLOUD v3 Deployment Guide

Complete deployment checklist for dual database infrastructure (D1 + Supabase).

## 🎯 Quick Deployment

```bash
# 1. D1 Local Setup
npx wrangler d1 execute MEAUXOS_DB --local --file=schema.sql

# 2. D1 Remote Setup
npx wrangler d1 execute MEAUXOS_DB --remote --file=schema.sql

# 3. Supabase Schema Setup
cat schema-supabase-seo.sql | supabase db query
# OR paste into: https://supabase.com/dashboard/project/qmpghmthbhuumemnahcz/sql

# 4. Test Supabase
./scripts/test-supabase.sh

# 5. Sync D1 → Supabase
./scripts/sync-d1-to-supabase.sh

# 6. Set Secrets
wrangler secret put SUPABASE_SERVICE_ROLE
wrangler secret put GCLOUD_GH_TOKEN

# 7. Deploy Worker
npx wrangler deploy
```

## 📋 Detailed Steps

### Step 1: D1 Database Setup

#### Local D1 (Development)

```bash
# Initialize schema
npx wrangler d1 execute MEAUXOS_DB --local --file=schema.sql

# Verify tables
npx wrangler d1 execute MEAUXOS_DB --local --command \
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"

# Expected tables:
# - ai_knowledge_base
# - api_keys
# - mcp_tool_logs
# - r2_buckets (6 buckets)
# - r2_objects
# - seo_meta
# - supabase_sync
```

**Status:** ✅ **8 tables created**

#### Remote D1 (Production)

```bash
# Deploy schema to production
npx wrangler d1 execute MEAUXOS_DB --remote --file=schema.sql

# Verify remote
npx wrangler d1 execute MEAUXOS_DB --remote --command \
  "SELECT COUNT(*) as total FROM seo_meta"
```

### Step 2: Supabase Database Setup

#### Option A: Supabase CLI (Recommended)

```bash
# Install Supabase CLI (if not installed)
brew install supabase/tap/supabase
# or: npm install -g supabase

# Link to project
supabase link --project-ref qmpghmthbhuumemnahcz

# Deploy schema
cat schema-supabase-seo.sql | supabase db query
```

#### Option B: Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/qmpghmthbhuumemnahcz/sql
2. Copy contents of `schema-supabase-seo.sql`
3. Paste into SQL Editor
4. Click "Run"

**Expected Result:**
```
✓ Created extension: pgcrypto
✓ Created extension: vector
✓ Created table: public.seo_meta
✓ Created 4 indexes
✓ Created trigger function: set_updated_at()
✓ Created trigger: trg_seo_meta_set_updated_at
✓ Inserted 1 example row (meauxbility.org)
```

### Step 3: Test Connections

#### Test D1

```bash
# Local D1
npx wrangler d1 execute MEAUXOS_DB --local --command \
  "SELECT * FROM seo_meta WHERE id = 'meauxbility-home'"

# Remote D1
npx wrangler d1 execute MEAUXOS_DB --remote --command \
  "SELECT COUNT(*) as total_pages FROM seo_meta"
```

#### Test Supabase

```bash
# Run test suite
./scripts/test-supabase.sh

# Manual test
curl "https://qmpghmthbhuumemnahcz.supabase.co/rest/v1/seo_meta?select=count" \
  -H "apikey: sb_publishable_BQ3iz_92Jh8xvEiMg9WXpg_FNRpy2ZL"
```

**Expected:** Table exists, count >= 1

### Step 4: Sync Databases

```bash
# Sync D1 → Supabase
./scripts/sync-d1-to-supabase.sh

# Verify sync
curl "https://qmpghmthbhuumemnahcz.supabase.co/rest/v1/seo_meta?select=*" \
  -H "apikey: sb_publishable_BQ3iz_92Jh8xvEiMg9WXpg_FNRpy2ZL" | jq '.'
```

### Step 5: Configure Secrets

#### Get Service Role Key

1. Go to: https://supabase.com/dashboard/project/qmpghmthbhuumemnahcz/settings/api
2. Copy **Service Role Key** (secret, starts with `eyJ...`)
3. **DO NOT commit this to Git!**

#### Set Wrangler Secrets

```bash
# Supabase Service Role (required for writes)
wrangler secret put SUPABASE_SERVICE_ROLE
# Paste your service role key

# GitHub Models API (for AI-powered SEO)
wrangler secret put GCLOUD_GH_TOKEN
# Get from: https://github.com/settings/tokens

# Optional: Google Gemini
wrangler secret put GOOGLE_GEMINI_KEY

# Optional: Cloudflare API Token
wrangler secret put CLOUDFLARE_API_TOKEN
```

### Step 6: Deploy Worker

```bash
# Deploy to Cloudflare Workers
npx wrangler deploy

# Expected output:
# ⛅️ wrangler 4.56.0
# Uploaded gcloudv3 (X.XX sec)
# Published gcloudv3 (X.XX sec)
#   https://gcloudv3.meauxbility.workers.dev
# Current Deployment ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Step 7: Verify Deployment

```bash
# Health check
curl https://gcloudv3.meauxbility.workers.dev/health | jq '.'

# Expected:
# {
#   "status": "ok",
#   "version": "3.0.0",
#   "features": {
#     "mcp": true,
#     "mcp_tools": 17,
#     "d1": true,
#     "r2_buckets": 6,
#     "secret_management": true,
#     "knowledge_base": true,
#     "seo_management": true
#   }
# }
```

## 🧪 Testing MCP Tools

### D1 Query Test

```bash
curl -X POST https://gcloudv3.meauxbility.workers.dev/mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "query_d1",
      "arguments": {
        "query": "SELECT * FROM seo_meta WHERE seo_score < 70"
      }
    }
  }' | jq '.'
```

### Supabase Query Test

```bash
curl -X POST https://gcloudv3.meauxbility.workers.dev/mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "query_supabase",
      "arguments": {
        "table": "seo_meta",
        "select": "*",
        "filter": {"seo_score": "lt.70"}
      }
    }
  }' | jq '.'
```

### SEO Tools Test

```bash
# List pages needing SEO
curl https://gcloudv3.meauxbility.workers.dev/api/seo/pending | jq '.'

# Get page metadata
curl "https://gcloudv3.meauxbility.workers.dev/api/seo/page/https%3A%2F%2Fmeauxbility.org%2F" | jq '.'

# AI-generate SEO metadata
curl -X POST https://gcloudv3.meauxbility.workers.dev/api/seo/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://meauxbility.org/programs",
    "content": "Our programs help spinal cord injury survivors access treatments, equipment, and community support.",
    "brand": "Meauxbility"
  }' | jq '.'
```

## 🔐 Security Checklist

- [ ] ✅ Service Role Key stored as Wrangler secret (not in Git)
- [ ] ✅ Anon Key in wrangler.toml (safe for public)
- [ ] ✅ GitHub Token stored as secret
- [ ] ✅ API Keys registered as fingerprints only
- [ ] ✅ Row Level Security (RLS) enabled in Supabase
- [ ] ✅ CORS configured for allowed origins
- [ ] ✅ `.env` files in `.gitignore`

## 📊 Database Status

### D1 (Local)
```bash
npx wrangler d1 execute MEAUXOS_DB --local --command \
  "SELECT
    (SELECT COUNT(*) FROM r2_buckets) as buckets,
    (SELECT COUNT(*) FROM seo_meta) as seo_pages,
    (SELECT COUNT(*) FROM api_keys) as api_keys"
```

**Expected:**
- Buckets: 6
- SEO Pages: 1+
- API Keys: 5

### Supabase (Remote)
```bash
curl "https://qmpghmthbhuumemnahcz.supabase.co/rest/v1/seo_meta?select=count" \
  -H "apikey: sb_publishable_BQ3iz_92Jh8xvEiMg9WXpg_FNRpy2ZL"
```

**Expected:** `[{"count": X}]` where X >= 1

## 🚀 Production URLs

- **Worker:** `https://gcloudv3.meauxbility.workers.dev`
- **Health:** `https://gcloudv3.meauxbility.workers.dev/health`
- **MCP Endpoint:** `https://gcloudv3.meauxbility.workers.dev/mcp`
- **API Docs:** `https://gcloudv3.meauxbility.workers.dev/api/verify`
- **Supabase API:** `https://qmpghmthbhuumemnahcz.supabase.co/rest/v1/`
- **Supabase Edge Function:** `https://qmpghmthbhuumemnahcz.supabase.co/functions/v1/seo-mcp`

## 🔄 Maintenance

### Update D1 Schema

```bash
# Local
npx wrangler d1 execute MEAUXOS_DB --local --file=schema.sql

# Remote (careful!)
npx wrangler d1 execute MEAUXOS_DB --remote --file=schema.sql
```

### Update Supabase Schema

```bash
cat schema-supabase-seo.sql | supabase db query
```

### Sync Data

```bash
# D1 → Supabase
./scripts/sync-d1-to-supabase.sh

# Manual sync via API
curl -X POST https://gcloudv3.meauxbility.workers.dev/api/seo/update \
  -H 'Content-Type: application/json' \
  -d @seo-data.json
```

### View Logs

```bash
# Worker logs
npx wrangler tail

# Supabase logs
supabase logs --project-ref qmpghmthbhuumemnahcz
```

## 🐛 Troubleshooting

### D1 Schema Issues

**Problem:** Tables not created

```bash
# Check if tables exist
npx wrangler d1 execute MEAUXOS_DB --local --command \
  "SELECT name FROM sqlite_master WHERE type='table'"

# Recreate
npx wrangler d1 execute MEAUXOS_DB --local --file=schema.sql
```

### Supabase Connection Failed

**Problem:** `{"code": "PGRST301", "message": "Could not find the public.seo_meta table"}`

**Solution:**
```bash
# Deploy schema
cat schema-supabase-seo.sql | supabase db query

# OR via dashboard
# https://supabase.com/dashboard/project/qmpghmthbhuumemnahcz/sql
```

### Worker Deployment Failed

**Problem:** Secrets not found

```bash
# Check secrets
wrangler secret list

# Add missing secrets
wrangler secret put SUPABASE_SERVICE_ROLE
wrangler secret put GCLOUD_GH_TOKEN
```

### MCP Tools Not Working

**Problem:** `{"error": "Tool not found"}`

**Solution:**
```bash
# List available tools
curl https://gcloudv3.meauxbility.workers.dev/api/mcp/tools | jq '.tools[].name'

# Expected: 17 tools including seo_* tools
```

## 📝 Deployment Summary

After completing all steps, you should have:

✅ **D1 Database (Local & Remote)**
- 8 tables
- 2 views
- 10 indexes
- 6 R2 buckets registered
- 1+ SEO pages
- 5 API key placeholders

✅ **Supabase Database**
- `public.seo_meta` table with full JSONB support
- pgvector extension (optional)
- GIN indexes for fast queries
- Auto-updated_at triggers
- Example data (meauxbility.org)

✅ **Cloudflare Worker**
- 17 MCP tools
- 15 REST API endpoints
- Dual database support (D1 + Supabase)
- AI-powered SEO generation
- Secret management
- R2 bucket integration

✅ **Documentation**
- MCP_INTEGRATION_GUIDE.md
- SEO_MANAGEMENT.md
- SECRET_MANAGEMENT.md
- This DEPLOYMENT.md

## 🎉 Success Criteria

Your deployment is successful when:

1. ✅ Health check returns `{"status": "ok", "mcp_tools": 17}`
2. ✅ D1 query returns SEO data
3. ✅ Supabase query returns SEO data
4. ✅ MCP tools list shows 17 tools
5. ✅ AI generation works (with GCLOUD_GH_TOKEN)
6. ✅ All tests pass: `./scripts/test-supabase.sh`

**You're ready to let AI work its ass off on your SQL!** 🚀
