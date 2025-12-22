# GCLOUD Scripts

Utility scripts for managing the GCLOUD infrastructure.

## Available Scripts

### `register-secret.sh`

Securely register API key fingerprints to D1 database.

**Features:**
- SHA256 fingerprinting (plaintext keys never stored)
- Local and remote D1 support
- Environment variable support (avoids shell history)
- Automatic verification

**Usage:**

```bash
# Register Google Gemini API key locally
export GOOGLE_GEMINI_KEY='your-key-here'
./scripts/register-secret.sh \
  -s google-gemini \
  -k "$GOOGLE_GEMINI_KEY" \
  -e "GOOGLE_GEMINI_KEY,GEMINI_API_KEY" \
  -n "Google Gemini API for AI/ML"

# Register to remote D1
./scripts/register-secret.sh \
  -s google-gemini \
  -k "$GOOGLE_GEMINI_KEY" \
  -e "GOOGLE_GEMINI_KEY,GEMINI_API_KEY" \
  -r
```

**Options:**
- `-s, --service`: Service name (required)
- `-k, --key`: API key (required)
- `-e, --env-vars`: Environment variable names (comma-separated)
- `-n, --notes`: Optional notes
- `-r, --remote`: Register to remote D1 (default: local)
- `-h, --help`: Show help

**Security:**
- Only SHA256 fingerprints are stored
- Plaintext keys never leave your machine
- Use environment variables to avoid shell history
- Supports verification after registration

See [docs/SECRET_MANAGEMENT.md](../docs/SECRET_MANAGEMENT.md) for complete documentation.
