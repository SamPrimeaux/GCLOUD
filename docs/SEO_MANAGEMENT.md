# GCLOUD SEO Management System

## Overview

Complete SEO metadata management with **AI-powered generation** using GitHub Models (GPT-4o) or Google Gemini. Supports both D1 (SQLite) and Supabase (Postgres) with pgvector for semantic search.

Your deployed Supabase Edge Function: `https://qmpghmthbhuumemnahcz.supabase.co/functions/v1/seo-mcp`

## Features

✅ **AI-Powered SEO Generation** - Auto-generate titles, descriptions, tags
✅ **SEO Score Calculation** - 0-100 quality score based on completeness
✅ **Rich Metadata Support** - Open Graph, Twitter Cards, Schema.org JSON-LD
✅ **Dual Database Support** - D1 (SQLite) and Supabase (Postgres)
✅ **MCP Tools** - 4 new tools for AI agents to manage SEO
✅ **REST API** - 4 endpoints for direct access
✅ **Auto-Timestamps** - Triggers for updated_at tracking

## Architecture

```
┌─────────────────────────────────────────────────┐
│          GCLOUD SEO Management                   │
│                                                  │
│  ┌──────────────┐      ┌─────────────────────┐ │
│  │ MCP Tools    │◄─────│  AI Generation      │ │
│  │ (4 new)      │      │  GitHub Models      │ │
│  └──────┬───────┘      │  GPT-4o / Gemini    │ │
│         │              └─────────────────────┘ │
│         ├─→ D1 (seo_meta table)                │
│         │   • 16 fields                        │
│         │   • Auto-scoring                     │
│         │   • Triggers for timestamps          │
│         │                                      │
│         └─→ Supabase (optional)                │
│             • Full JSONB support               │
│             • pgvector embeddings              │
│             • GIN indexes                      │
└─────────────────────────────────────────────────┘
```

## Database Schema

### D1 / SQLite (Built-in)

```sql
CREATE TABLE seo_meta (
  id            TEXT PRIMARY KEY,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),

  -- Core SEO
  url           TEXT NOT NULL UNIQUE,
  title         TEXT,
  description   TEXT,
  meta_robots   TEXT,
  canonical_url TEXT,

  -- Rich Metadata (JSON strings)
  open_graph       TEXT,
  twitter_card     TEXT,
  structured_data  TEXT,

  -- Classification
  language      TEXT,
  locale        TEXT,
  tags          TEXT,  -- comma-separated
  source        TEXT,
  notes         TEXT,

  -- Publishing
  publish_date  TEXT,
  is_published  INTEGER NOT NULL DEFAULT 0,
  seo_score     REAL
);
```

### Supabase / Postgres (schema-supabase-seo.sql)

```sql
CREATE TABLE public.seo_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  url              text NOT NULL UNIQUE,
  title            text,
  description      text,
  meta_robots      text,
  canonical_url    text,

  -- JSONB for rich queries
  open_graph       jsonb,
  twitter_card     jsonb,
  structured_data  jsonb,

  -- Arrays for tag search
  tags         text[],

  -- Optional pgvector for semantic search
  embedding    vector(1536)
);
```

## MCP Tools (17 Total)

### New SEO Tools (4)

#### 1. `seo_list_pending`
Find pages needing SEO optimization.

**Parameters:**
- `limit` (number): Max results (default: 20)

**Example:**
```json
{
  "name": "seo_list_pending",
  "arguments": {
    "limit": 10
  }
}
```

**Returns:**
```json
[
  {
    "id": "about-page",
    "url": "https://meauxbility.org/about",
    "title": null,
    "description": null,
    "seo_score": null,
    "is_published": 1
  }
]
```

#### 2. `seo_get_page`
Get SEO metadata for a specific URL.

**Parameters:**
- `url` (string, required): Page URL

**Example:**
```json
{
  "name": "seo_get_page",
  "arguments": {
    "url": "https://meauxbility.org/"
  }
}
```

**Returns:**
```json
{
  "id": "meauxbility-home",
  "url": "https://meauxbility.org/",
  "title": "Meauxbility – More Options. More Access. More Life.",
  "description": "Meauxbility is a survivor-led nonprofit...",
  "seo_score": 60,
  "is_published": 1,
  "tags": "nonprofit,spinal-cord-injury,trauma,recovery,meauxbility"
}
```

#### 3. `seo_update_page`
Update or create SEO metadata for a page.

**Parameters:**
- `url` (string, required): Page URL
- `title` (string): Page title (50-60 chars recommended)
- `description` (string): Meta description (150-160 chars recommended)
- `meta_robots` (string): Robots meta (default: "index,follow")
- `canonical_url` (string): Canonical URL
- `open_graph` (string): Open Graph JSON string
- `twitter_card` (string): Twitter Card JSON string
- `structured_data` (string): Schema.org JSON-LD string
- `tags` (string): Comma-separated tags
- `seo_score` (number): SEO quality score (0-100)
- `is_published` (boolean): Publish status

**Example:**
```json
{
  "name": "seo_update_page",
  "arguments": {
    "url": "https://meauxbility.org/programs",
    "title": "Programs & Services – Meauxbility Foundation",
    "description": "Explore our programs helping spinal cord injury survivors access equipment, treatments, and community support.",
    "tags": "programs,services,sci,equipment,support",
    "is_published": true
  }
}
```

#### 4. `seo_generate_meta` 🤖
AI-powered SEO generation using GitHub Models or Gemini.

**Parameters:**
- `url` (string, required): Page URL
- `content` (string, required): Page content to analyze (up to 2000 chars)
- `brand` (string): Brand name (default: "Meauxbility")

**Example:**
```json
{
  "name": "seo_generate_meta",
  "arguments": {
    "url": "https://meauxbility.org/donate",
    "content": "Support our mission to help spinal cord injury survivors...",
    "brand": "Meauxbility"
  }
}
```

**AI generates and updates:**
- Optimized title (50-60 characters)
- Compelling description (150-160 characters)
- Relevant tags (5-7 tags)
- SEO quality score (0-100)

## REST API Endpoints

### GET /api/seo/pending
List pages needing SEO optimization.

```bash
curl 'http://localhost:8787/api/seo/pending?limit=20'
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "about-page",
      "url": "https://meauxbility.org/about",
      "title": null,
      "seo_score": null
    }
  ]
}
```

### GET /api/seo/page/:url
Get metadata for specific URL.

```bash
curl 'http://localhost:8787/api/seo/page/https%3A%2F%2Fmeauxbility.org%2F'
```

### POST /api/seo/update
Update page metadata.

```bash
curl -X POST http://localhost:8787/api/seo/update \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://meauxbility.org/programs",
    "title": "Programs & Services – Meauxbility",
    "description": "Explore our programs helping spinal cord injury survivors.",
    "tags": "programs,services,sci",
    "is_published": true
  }'
```

### POST /api/seo/generate
AI-generate SEO metadata.

```bash
curl -X POST http://localhost:8787/api/seo/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://meauxbility.org/donate",
    "content": "Support our mission to help spinal cord injury survivors access the treatments and equipment they need.",
    "brand": "Meauxbility"
  }'
```

## SEO Score Calculation

**Automatic scoring (0-100):**

- **Title** (40 points max)
  - Exists: +30 points
  - Optimal length (50-60 chars): +10 points

- **Description** (40 points max)
  - Exists: +30 points
  - Optimal length (150-160 chars): +10 points

- **Structured Data** (20 points max)
  - Schema.org JSON-LD present: +20 points

**Example Scores:**
- Title + Description + Schema.org = 100 (perfect)
- Title + Description (optimal length) = 80 (good)
- Title only = 30 (needs work)
- No metadata = 0 (pending)

## AI Integration

### GitHub Models (Default)

Uses **GPT-4o** via Azure AI:

```javascript
const prompt = `Generate SEO metadata for this page:

URL: ${url}
Brand: ${brand}

Content:
${content.substring(0, 2000)}

Generate:
1. A compelling SEO title (50-60 characters)
2. A meta description (150-160 characters)
3. 5-7 relevant tags (comma-separated)
4. An SEO quality score (0-100)

Return as JSON with fields: title, description, tags, seo_score`;
```

**Response format:**
```json
{
  "title": "Programs & Services – Meauxbility Foundation",
  "description": "Explore our comprehensive programs helping spinal cord injury survivors access equipment, treatments, and community support.",
  "tags": "programs,services,sci,equipment,support,nonprofit,meauxbility",
  "seo_score": 95
}
```

### Google Gemini (Alternative)

Set `GOOGLE_GEMINI_KEY` for Gemini integration. Same prompt format, different model.

## Workflow: AI-Powered SEO Optimization

### 1. Find Pages Needing Work

```bash
curl http://localhost:8787/api/seo/pending
```

Returns pages with:
- Missing title or description
- SEO score < 70
- Published pages only

### 2. Generate SEO with AI

```bash
curl -X POST http://localhost:8787/api/seo/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://meauxbility.org/programs",
    "content": "Our programs help spinal cord injury survivors..."
  }'
```

AI analyzes content and generates optimized metadata.

### 3. Review and Adjust

```bash
curl http://localhost:8787/api/seo/page/https%3A%2F%2Fmeauxbility.org%2Fprograms
```

### 4. Manual Override (if needed)

```bash
curl -X POST http://localhost:8787/api/seo/update \
  -d '{
    "url": "https://meauxbility.org/programs",
    "title": "Custom Title Here",
    "description": "Custom description..."
  }'
```

## Example: Meauxbility.org Homepage

**Current entry:**
```sql
SELECT * FROM seo_meta WHERE id = 'meauxbility-home';
```

**Result:**
```json
{
  "id": "meauxbility-home",
  "url": "https://meauxbility.org/",
  "title": "Meauxbility – More Options. More Access. More Life.",
  "description": "Meauxbility is a survivor-led nonprofit helping people with spinal cord injuries access treatments, equipment, and community support.",
  "meta_robots": "index,follow",
  "canonical_url": "https://meauxbility.org/",
  "language": "en",
  "locale": "en-US",
  "tags": "nonprofit,spinal-cord-injury,trauma,recovery,meauxbility",
  "source": "meauxos",
  "is_published": 1,
  "publish_date": "2025-12-22 09:29:18"
}
```

## Supabase Edge Function Integration

Your deployed function: `https://qmpghmthbhuumemnahcz.supabase.co/functions/v1/seo-mcp`

### Download Function Code

```bash
supabase functions download seo-mcp
```

### Example Call to Supabase Function

```bash
curl -X POST 'https://qmpghmthbhuumemnahcz.supabase.co/functions/v1/seo-mcp' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "seo_list_pending",
      "arguments": {
        "limit": 10
      }
    }
  }'
```

## Advanced: Open Graph & Schema.org

### Update with Rich Metadata

```bash
curl -X POST http://localhost:8787/api/seo/update \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://meauxbility.org/",
    "title": "Meauxbility – More Options. More Access. More Life.",
    "description": "Survivor-led nonprofit helping people with spinal cord injuries.",
    "open_graph": "{\"og:title\":\"Meauxbility\",\"og:image\":\"https://meauxbility.org/og-image.jpg\"}",
    "twitter_card": "{\"twitter:card\":\"summary_large_image\",\"twitter:title\":\"Meauxbility\"}",
    "structured_data": "{\"@context\":\"https://schema.org\",\"@type\":\"Organization\",\"name\":\"Meauxbility\"}"
  }'
```

### Query Rich Metadata

```bash
curl http://localhost:8787/api/seo/page/https%3A%2F%2Fmeauxbility.org%2F
```

Response includes parsed JSON for `open_graph`, `twitter_card`, `structured_data`.

## Deployment

### Deploy to D1 (Local)

```bash
npx wrangler d1 execute MEAUXOS_DB --local --file=schema.sql
```

### Deploy to D1 (Remote)

```bash
npx wrangler d1 execute MEAUXOS_DB --remote --file=schema.sql
```

### Deploy to Supabase

```bash
# Run in Supabase SQL Editor
cat schema-supabase-seo.sql
```

### Deploy Worker

```bash
npx wrangler deploy
```

## Testing

### Test SEO Endpoints

```bash
# List pending pages
curl http://localhost:8787/api/seo/pending

# Get homepage metadata
curl 'http://localhost:8787/api/seo/page/https%3A%2F%2Fmeauxbility.org%2F'

# Update a page
curl -X POST http://localhost:8787/api/seo/update \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://meauxbility.org/test","title":"Test Page"}'

# Generate with AI (requires GCLOUD_GH_TOKEN)
curl -X POST http://localhost:8787/api/seo/generate \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://meauxbility.org/test","content":"Test content here"}'
```

## System Status

**MCP Tools:** 17 total (13 original + 4 SEO)
**REST Endpoints:** 15 total (11 original + 4 SEO)
**D1 Tables:** 9 (including seo_meta)
**Features:** ✅ AI Generation, ✅ Auto-Scoring, ✅ Rich Metadata

**Health Check:**
```bash
curl http://localhost:8787/health
```

```json
{
  "status": "ok",
  "version": "3.0.0",
  "features": {
    "mcp": true,
    "mcp_tools": 17,
    "seo_management": true
  }
}
```

## License

Part of GCLOUD v3 - Meauxbility Foundation SaaS Platform

**AI-Powered SEO:** Let Claude, GPT-4o, or Gemini work their ass off on your SQL! 🚀
