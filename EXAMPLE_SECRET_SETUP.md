# Example: Setting Up Google Gemini API Key

This example demonstrates the complete workflow for securely registering and verifying a Google Gemini API key using GCLOUD's fingerprint-based secret management system.

## Step 1: Set Environment Variable

```bash
# Use 'read' to avoid shell history exposure
read -s GOOGLE_GEMINI_KEY
# Paste your key and press Enter
export GOOGLE_GEMINI_KEY
```

## Step 2: Register to Local D1

```bash
./scripts/register-secret.sh \
  -s google-gemini \
  -k "$GOOGLE_GEMINI_KEY" \
  -e "GOOGLE_GEMINI_KEY,GEMINI_API_KEY" \
  -n "Google Gemini API for AI/ML"
```

**Output:**
```
=== GCLOUD Secret Registration ===
Service: google-gemini
Env Vars: GOOGLE_GEMINI_KEY,GEMINI_API_KEY
Notes: Google Gemini API for AI/ML
Target: Local D1

Generating SHA256 fingerprint...
Fingerprint: 4a3b2c1d8f7e6a5b...1234567890abcdef

Executing on local D1...
✓ API key fingerprint registered successfully
⚠ Plaintext key was never stored - only the SHA256 fingerprint
```

## Step 3: Register to Remote D1

```bash
./scripts/register-secret.sh \
  -s google-gemini \
  -k "$GOOGLE_GEMINI_KEY" \
  -e "GOOGLE_GEMINI_KEY,GEMINI_API_KEY" \
  -n "Google Gemini API for AI/ML" \
  -r
```

## Step 4: Verify via API

```bash
# Generate fingerprint
FINGERPRINT=$(printf '%s' "$GOOGLE_GEMINI_KEY" | sha256sum | awk '{print $1}')

# Verify
curl -X POST https://gcloudv3.meauxbility.workers.dev/api/secrets/verify \
  -H 'Content-Type: application/json' \
  -d "{\"service_name\":\"google-gemini\",\"fingerprint\":\"$FINGERPRINT\"}"
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

## Step 5: Store Metadata in Knowledge Base

```bash
curl -X POST https://gcloudv3.meauxbility.workers.dev/api/knowledge/store \
  -H 'Content-Type: application/json' \
  -d "{
    \"id\": \"secret-google-gemini\",
    \"category\": \"secrets\",
    \"title\": \"Google Gemini API key metadata\",
    \"content\": {
      \"service\": \"google/gemini\",
      \"fingerprint\": \"$FINGERPRINT\",
      \"env_var_names\": [\"GOOGLE_GEMINI_KEY\", \"GEMINI_API_KEY\"],
      \"stored_plaintext\": false,
      \"notes\": \"Fingerprint stored securely in D1\"
    }
  }"
```

## Step 6: List All API Keys

```bash
curl https://gcloudv3.meauxbility.workers.dev/api/secrets/list
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
    },
    {
      "service_name": "cloudflare",
      "fingerprint_preview": "pending",
      "env_var_names": "CLOUDFLARE_API_TOKEN",
      "is_active": 1,
      "last_verified": null,
      "notes": "Cloudflare API for R2/D1/Workers",
      "created_at": "2025-12-22T08:00:00.000Z",
      "updated_at": "2025-12-22T08:00:00.000Z"
    }
  ]
}
```

## Step 7: Clean Up Sensitive Data

```bash
# Always clear sensitive variables after use
unset GOOGLE_GEMINI_KEY FINGERPRINT
```

## Using MCP Tools (AI Assistants)

```json
// AI assistant can verify keys without seeing plaintext
{
  "method": "tools/call",
  "params": {
    "name": "verify_api_key",
    "arguments": {
      "service_name": "google-gemini",
      "fingerprint": "4a3b2c1d8f7e6a5b..."
    }
  }
}
```

## Security Benefits

✓ **Zero-Knowledge Storage**: Database never sees plaintext keys
✓ **Fingerprint Verification**: Compare hashes, not passwords
✓ **Audit Trail**: Track when keys were verified
✓ **AI-Accessible**: AI assistants can verify without seeing secrets
✓ **Multi-Service**: Manage all API keys in one place

## Pre-Registered Services

The following services are ready for activation:

1. **google-gemini** - Google Gemini API for AI/ML
2. **cloudflare** - Cloudflare API for R2/D1/Workers
3. **supabase** - Supabase database and auth
4. **anthropic-claude** - Claude API for AI assistance
5. **github** - GitHub API for repos and models

All have `fingerprint: "pending"` status. Run `register-secret.sh` to activate.
