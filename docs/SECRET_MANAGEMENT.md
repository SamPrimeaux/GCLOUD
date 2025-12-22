# GCLOUD Secret Management System

## Overview

The GCLOUD secret management system provides **secure, fingerprint-based API key storage** that ensures plaintext secrets **never** leave your local machine or enter the database.

## Security Model

### SHA256 Fingerprinting

- All API keys are hashed with **SHA256** before storage
- Only the 64-character hex fingerprint is stored in D1
- Plaintext keys are **never** transmitted or persisted
- Verification compares fingerprints, not plaintext

### Zero-Knowledge Storage

```
Your Machine          D1 Database
━━━━━━━━━━━━━        ━━━━━━━━━━━━
Plaintext Key   →    SHA256 Hash Only
AIzaSy...xyz         4a3b2c1d...8f7e
                     (fingerprint)
```

## Quick Start

### 1. Register API Key Fingerprint

#### Using the Helper Script (Recommended)

```bash
# Google Gemini API
export GOOGLE_GEMINI_KEY='your-actual-key-here'
./scripts/register-secret.sh \
  -s google-gemini \
  -k "$GOOGLE_GEMINI_KEY" \
  -e "GOOGLE_GEMINI_KEY,GEMINI_API_KEY" \
  -n "Google Gemini API for AI/ML"

# Cloudflare API Token (remote)
export CLOUDFLARE_API_TOKEN='your-token-here'
./scripts/register-secret.sh \
  -s cloudflare \
  -k "$CLOUDFLARE_API_TOKEN" \
  -e "CLOUDFLARE_API_TOKEN" \
  -r
```

#### Using curl (REST API)

```bash
# Generate fingerprint locally
export GOOGLE_GEMINI_KEY='your-actual-key-here'
FINGERPRINT=$(printf '%s' "$GOOGLE_GEMINI_KEY" | sha256sum | awk '{print $1}')

# Register to GCLOUD
curl -X POST https://gcloudv3.meauxbility.workers.dev/api/secrets/register \
  -H 'Content-Type: application/json' \
  -d "{
    \"service_name\": \"google-gemini\",
    \"fingerprint\": \"$FINGERPRINT\",
    \"env_var_names\": \"GOOGLE_GEMINI_KEY,GEMINI_API_KEY\",
    \"notes\": \"Google Gemini API for AI/ML\"
  }"
```

#### Using MCP Tools

```javascript
// Call the register_api_key MCP tool
{
  "method": "tools/call",
  "params": {
    "name": "register_api_key",
    "arguments": {
      "service_name": "google-gemini",
      "fingerprint": "4a3b2c1d8f7e6a5b...",
      "env_var_names": "GOOGLE_GEMINI_KEY,GEMINI_API_KEY",
      "notes": "Google Gemini API for AI/ML"
    }
  }
}
```

### 2. Verify API Key

```bash
# Verify your key matches the stored fingerprint
FINGERPRINT=$(printf '%s' "$GOOGLE_GEMINI_KEY" | sha256sum | awk '{print $1}')

curl -X POST https://gcloudv3.meauxbility.workers.dev/api/secrets/verify \
  -H 'Content-Type: application/json' \
  -d "{
    \"service_name\": \"google-gemini\",
    \"fingerprint\": \"$FINGERPRINT\"
  }"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "service_name": "google-gemini",
    "verified": true,
    "is_active": true,
    "last_verified": "2025-12-22T10:30:00.000Z"
  }
}
```

### 3. List All Registered Keys

```bash
# List active API keys
curl https://gcloudv3.meauxbility.workers.dev/api/secrets/list

# List all keys (including inactive)
curl 'https://gcloudv3.meauxbility.workers.dev/api/secrets/list?active_only=false'
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "service_name": "google-gemini",
      "fingerprint_preview": "4a3b2c1d8f7e6a5b...1234567890abcdef",
      "env_var_names": "GOOGLE_GEMINI_KEY,GEMINI_API_KEY",
      "is_active": 1,
      "last_verified": "2025-12-22T10:30:00.000Z",
      "notes": "Google Gemini API for AI/ML",
      "created_at": "2025-12-22T08:00:00.000Z",
      "updated_at": "2025-12-22T10:30:00.000Z"
    }
  ]
}
```

## MCP Tools

### register_api_key

Register or update an API key fingerprint.

**Parameters:**
- `service_name` (required): Service identifier (e.g., `google-gemini`, `cloudflare`)
- `fingerprint` (required): SHA256 hash of the API key (64-character hex string)
- `env_var_names` (optional): Comma-separated environment variable names
- `notes` (optional): Additional notes

**Example:**
```json
{
  "name": "register_api_key",
  "arguments": {
    "service_name": "anthropic-claude",
    "fingerprint": "a1b2c3d4e5f6...",
    "env_var_names": "ANTHROPIC_API_KEY,CLAUDE_API_KEY",
    "notes": "Claude API for AI assistance"
  }
}
```

### verify_api_key

Verify if a key fingerprint matches the stored fingerprint.

**Parameters:**
- `service_name` (required): Service identifier
- `fingerprint` (required): SHA256 hash to verify

**Example:**
```json
{
  "name": "verify_api_key",
  "arguments": {
    "service_name": "anthropic-claude",
    "fingerprint": "a1b2c3d4e5f6..."
  }
}
```

### list_api_keys

List all registered API keys (fingerprints only).

**Parameters:**
- `active_only` (optional): Show only active keys (default: `true`)

**Example:**
```json
{
  "name": "list_api_keys",
  "arguments": {
    "active_only": true
  }
}
```

## REST API Endpoints

### POST /api/secrets/register

Register or update an API key fingerprint.

**Request:**
```bash
curl -X POST https://gcloudv3.meauxbility.workers.dev/api/secrets/register \
  -H 'Content-Type: application/json' \
  -d '{
    "service_name": "github",
    "fingerprint": "abc123...",
    "env_var_names": "GITHUB_TOKEN,GH_TOKEN",
    "notes": "GitHub Models API"
  }'
```

### POST /api/secrets/verify

Verify an API key fingerprint.

**Request:**
```bash
curl -X POST https://gcloudv3.meauxbility.workers.dev/api/secrets/verify \
  -H 'Content-Type: application/json' \
  -d '{
    "service_name": "github",
    "fingerprint": "abc123..."
  }'
```

### GET /api/secrets/list

List all registered API keys.

**Request:**
```bash
curl 'https://gcloudv3.meauxbility.workers.dev/api/secrets/list?active_only=true'
```

## Pre-Registered Services

The following services are pre-registered in the database (fingerprints set to `"pending"`):

1. **google-gemini**: Google Gemini API for AI/ML
2. **cloudflare**: Cloudflare API for R2/D1/Workers
3. **supabase**: Supabase database and auth
4. **anthropic-claude**: Claude API for AI assistance
5. **github**: GitHub API for repos and models

To activate, run `register-secret.sh` with your actual keys.

## Database Schema

### api_keys Table

```sql
CREATE TABLE api_keys (
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
```

### ai_knowledge_base Table

```sql
CREATE TABLE ai_knowledge_base (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSON NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

## AI Knowledge Base

Store arbitrary JSON knowledge for AI assistants.

### Store Knowledge Entry

```bash
curl -X POST https://gcloudv3.meauxbility.workers.dev/api/knowledge/store \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "secret-google-gemini",
    "category": "secrets",
    "title": "Google Gemini API key metadata",
    "content": {
      "service": "google/gemini",
      "env_var_names": ["GOOGLE_GEMINI_KEY", "GEMINI_API_KEY"],
      "stored_plaintext": false,
      "notes": "Fingerprint stored securely"
    }
  }'
```

### Query Knowledge Base

```bash
# Query by category
curl 'https://gcloudv3.meauxbility.workers.dev/api/knowledge/query?category=secrets'

# Search by title
curl 'https://gcloudv3.meauxbility.workers.dev/api/knowledge/query?search=gemini&limit=10'
```

## Security Best Practices

### DO ✓

- **Always** hash keys locally before transmission
- **Always** use environment variables (avoid shell history)
- **Always** verify fingerprints after registration
- **Rotate** keys regularly and update fingerprints
- **Use** the helper script for automated hashing

### DON'T ✗

- **Never** store plaintext keys in the database
- **Never** transmit plaintext keys over the network
- **Never** commit keys to version control
- **Never** hardcode keys in source code
- **Never** share fingerprints publicly (they're still sensitive)

## Example Workflow

### Complete Google Gemini Setup

```bash
# 1. Set environment variable (never in shell history)
read -s GOOGLE_GEMINI_KEY
export GOOGLE_GEMINI_KEY

# 2. Register fingerprint locally
./scripts/register-secret.sh \
  -s google-gemini \
  -k "$GOOGLE_GEMINI_KEY" \
  -e "GOOGLE_GEMINI_KEY,GEMINI_API_KEY" \
  -n "Production Gemini API key"

# 3. Register to remote D1
./scripts/register-secret.sh \
  -s google-gemini \
  -k "$GOOGLE_GEMINI_KEY" \
  -e "GOOGLE_GEMINI_KEY,GEMINI_API_KEY" \
  -n "Production Gemini API key" \
  -r

# 4. Verify registration
FINGERPRINT=$(printf '%s' "$GOOGLE_GEMINI_KEY" | sha256sum | awk '{print $1}')
curl -X POST https://gcloudv3.meauxbility.workers.dev/api/secrets/verify \
  -H 'Content-Type: application/json' \
  -d "{\"service_name\":\"google-gemini\",\"fingerprint\":\"$FINGERPRINT\"}"

# 5. Store metadata in knowledge base
curl -X POST https://gcloudv3.meauxbility.workers.dev/api/knowledge/store \
  -H 'Content-Type: application/json' \
  -d "{
    \"id\": \"secret-google-gemini\",
    \"category\": \"secrets\",
    \"title\": \"Google Gemini API key\",
    \"content\": {
      \"service\": \"google/gemini\",
      \"fingerprint\": \"$FINGERPRINT\",
      \"stored_plaintext\": false
    }
  }"

# 6. Clear sensitive data
unset GOOGLE_GEMINI_KEY FINGERPRINT
```

## Troubleshooting

### Invalid Fingerprint Format

**Error:** `Invalid fingerprint format. Expected 64-character SHA256 hex string.`

**Solution:**
```bash
# Ensure you're using SHA256, not MD5 or SHA1
printf '%s' "$API_KEY" | sha256sum | awk '{print $1}'
# Should output exactly 64 hexadecimal characters
```

### Service Not Found

**Error:** `Service not found in registry`

**Solution:**
```bash
# Register the service first
./scripts/register-secret.sh -s your-service -k "$YOUR_KEY" -e "YOUR_ENV_VAR"
```

### Verification Failed

**Issue:** `verified: false`

**Possible Causes:**
1. Key was updated but fingerprint wasn't re-registered
2. Whitespace or newline characters in the key
3. Different encoding (ensure UTF-8)

**Solution:**
```bash
# Re-register with the current key
./scripts/register-secret.sh -s your-service -k "$YOUR_KEY" -e "YOUR_ENV_VAR"
```

## Advanced: Supabase Integration

For Supabase-based knowledge base (PostgreSQL):

```bash
# Generate fingerprint
export GOOGLE_GEMINI_KEY='your-key-here'
FINGERPRINT=$(printf '%s' "$GOOGLE_GEMINI_KEY" | sha256sum | awk '{print $1}')

# Insert to Supabase
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --set=FINGERPRINT="$FINGERPRINT" <<'SQL'
INSERT INTO public.ai_knowledge_base (id, category, title, content, created_at, updated_at)
VALUES (
  'secret-google-gemini',
  'secrets',
  'Google Gemini API key (fingerprint only)',
  jsonb_build_object(
    'env_var_names', to_jsonb(ARRAY['GOOGLE_GEMINI_KEY','GEMINI_API_KEY']),
    'service', 'google/gemini',
    'fingerprint', :'FINGERPRINT',
    'stored_plaintext', false,
    'notes', 'Fingerprint inserted via local shell. Plaintext never sent.'
  ),
  (extract(epoch from now()))::bigint,
  (extract(epoch from now()))::bigint
)
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  title = EXCLUDED.title,
  content = EXCLUDED.content || jsonb_build_object('updated_from_conflict', true),
  updated_at = (extract(epoch from now()))::bigint;
SQL

# Clear sensitive data
unset GOOGLE_GEMINI_KEY FINGERPRINT
```

## License

This secret management system is part of GCLOUD v3.

**Zero-Trust Security:** Plaintext secrets never leave your machine. Only cryptographic fingerprints are stored.
