#!/bin/bash
# GCLOUD Secret Registration Script
# Registers API key fingerprints to D1 database (local or remote)
# NEVER stores plaintext keys - only SHA256 fingerprints

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Help function
show_help() {
  cat << EOF
Usage: $0 [OPTIONS]

Securely register API key fingerprints to GCLOUD D1 database.
This script NEVER stores plaintext keys - only SHA256 fingerprints.

OPTIONS:
  -s, --service      Service name (e.g., google-gemini, cloudflare)
  -k, --key          API key (plaintext, only hashed locally)
  -e, --env-vars     Environment variable names (comma-separated)
  -n, --notes        Optional notes
  -r, --remote       Register to remote D1 (default: local)
  -h, --help         Show this help message

EXAMPLES:
  # Register Google Gemini API key (local)
  export GOOGLE_GEMINI_KEY='your-key-here'
  $0 -s google-gemini -k "\$GOOGLE_GEMINI_KEY" -e "GOOGLE_GEMINI_KEY,GEMINI_API_KEY"

  # Register Cloudflare API token (remote)
  $0 -s cloudflare -k "\$CLOUDFLARE_API_TOKEN" -e "CLOUDFLARE_API_TOKEN" -r

  # With notes
  $0 -s github -k "\$GITHUB_TOKEN" -e "GITHUB_TOKEN,GH_TOKEN" -n "GitHub Models API"

SECURITY:
  - API keys are hashed with SHA256 before transmission
  - Only the fingerprint is stored in the database
  - Plaintext keys never leave your machine
  - Use environment variables to avoid shell history exposure

EOF
}

# Parse arguments
SERVICE=""
API_KEY=""
ENV_VARS=""
NOTES=""
REMOTE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -s|--service)
      SERVICE="$2"
      shift 2
      ;;
    -k|--key)
      API_KEY="$2"
      shift 2
      ;;
    -e|--env-vars)
      ENV_VARS="$2"
      shift 2
      ;;
    -n|--notes)
      NOTES="$2"
      shift 2
      ;;
    -r|--remote)
      REMOTE=true
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      show_help
      exit 1
      ;;
  esac
done

# Validate required arguments
if [[ -z "$SERVICE" ]] || [[ -z "$API_KEY" ]]; then
  echo -e "${RED}Error: Service name and API key are required${NC}"
  show_help
  exit 1
fi

echo -e "${BLUE}=== GCLOUD Secret Registration ===${NC}"
echo -e "Service: ${GREEN}${SERVICE}${NC}"
echo -e "Env Vars: ${GREEN}${ENV_VARS:-none}${NC}"
echo -e "Notes: ${GREEN}${NOTES:-none}${NC}"
echo -e "Target: ${YELLOW}$([ "$REMOTE" = true ] && echo "Remote D1" || echo "Local D1")${NC}"
echo ""

# Generate SHA256 fingerprint
echo -e "${BLUE}Generating SHA256 fingerprint...${NC}"
FINGERPRINT=$(printf '%s' "$API_KEY" | sha256sum | awk '{print $1}')
echo -e "Fingerprint: ${GREEN}${FINGERPRINT:0:16}...${FINGERPRINT:48}${NC}"
echo ""

# Build SQL query
SQL=$(cat <<EOF
INSERT INTO api_keys (service_name, key_fingerprint, env_var_names, notes, updated_at)
VALUES ('$SERVICE', '$FINGERPRINT', '$ENV_VARS', '$NOTES', CURRENT_TIMESTAMP)
ON CONFLICT(service_name) DO UPDATE SET
  key_fingerprint = excluded.key_fingerprint,
  env_var_names = excluded.env_var_names,
  notes = excluded.notes,
  updated_at = CURRENT_TIMESTAMP;

SELECT
  service_name,
  substr(key_fingerprint, 1, 16) || '...' || substr(key_fingerprint, -16) as fingerprint_preview,
  env_var_names,
  is_active,
  updated_at
FROM api_keys
WHERE service_name = '$SERVICE';
EOF
)

# Execute SQL
if [ "$REMOTE" = true ]; then
  echo -e "${YELLOW}Executing on remote D1...${NC}"
  echo "$SQL" | npx wrangler d1 execute meauxos --remote
else
  echo -e "${YELLOW}Executing on local D1...${NC}"
  echo "$SQL" | npx wrangler d1 execute meauxos --local
fi

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✓ API key fingerprint registered successfully${NC}"
  echo -e "${YELLOW}⚠ Plaintext key was never stored - only the SHA256 fingerprint${NC}"
  echo ""
  echo -e "${BLUE}Verify your key:${NC}"
  echo -e "curl -X POST https://gcloudv3.meauxbility.workers.dev/api/secrets/verify \\"
  echo -e "  -H 'Content-Type: application/json' \\"
  echo -e "  -d '{\"service_name\":\"$SERVICE\",\"fingerprint\":\"$FINGERPRINT\"}'"
else
  echo ""
  echo -e "${RED}✗ Failed to register API key fingerprint${NC}"
  exit 1
fi

# Clear sensitive variables
unset API_KEY FINGERPRINT
