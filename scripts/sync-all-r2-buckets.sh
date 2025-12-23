#!/bin/bash
# Sync All R2 Buckets to D1 Database
# Registers all Cloudflare R2 buckets in your account to the D1 database for SQL querying

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== R2 Bucket Sync to D1 ===${NC}"
echo ""

# Get list of all R2 buckets
echo -e "${YELLOW}Fetching all R2 buckets from Cloudflare...${NC}"
BUCKETS=$(npx wrangler r2 bucket list 2>/dev/null | grep -E '^\s*-' | sed 's/^[[:space:]]*-[[:space:]]*//')

if [ -z "$BUCKETS" ]; then
  echo -e "${YELLOW}⚠ Could not fetch buckets via wrangler. Please provide bucket names manually.${NC}"
  echo ""
  echo "Usage: Manually register buckets with:"
  echo "  npx wrangler d1 execute meauxos --local --command \\"
  echo "    \"INSERT OR IGNORE INTO r2_buckets (bucket_name, binding_name, description) VALUES ('bucket-name', 'BINDING', 'Description')\""
  exit 1
fi

BUCKET_COUNT=$(echo "$BUCKETS" | wc -l)
echo -e "${GREEN}Found ${BUCKET_COUNT} R2 buckets${NC}"
echo ""

# Register each bucket to D1
REGISTERED=0
ALREADY_EXISTS=0

for BUCKET in $BUCKETS; do
  echo -e "${BLUE}Processing: ${BUCKET}${NC}"

  # Create binding name (uppercase, replace hyphens with underscores)
  BINDING=$(echo "$BUCKET" | tr '[:lower:]' '[:upper:]' | tr '-' '_')

  # Insert into D1 (local)
  npx wrangler d1 execute meauxos --local --command \
    "INSERT OR IGNORE INTO r2_buckets (bucket_name, binding_name, description)
     VALUES ('$BUCKET', '$BINDING', 'Auto-registered bucket')" >/dev/null 2>&1

  if [ $? -eq 0 ]; then
    REGISTERED=$((REGISTERED + 1))
    echo -e "  ${GREEN}✓ Registered${NC}"
  else
    ALREADY_EXISTS=$((ALREADY_EXISTS + 1))
    echo -e "  ${YELLOW}○ Already exists${NC}"
  fi
done

echo ""
echo -e "${GREEN}=== Sync Complete ===${NC}"
echo -e "Total buckets: ${BUCKET_COUNT}"
echo -e "Newly registered: ${REGISTERED}"
echo -e "Already registered: ${ALREADY_EXISTS}"
echo ""

# Show current count in D1
echo -e "${BLUE}Current D1 bucket count:${NC}"
npx wrangler d1 execute meauxos --local --command \
  "SELECT COUNT(*) as total FROM r2_buckets" | grep -A 5 "results"

echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Sync to remote D1: npx wrangler d1 execute meauxos --remote --file=schema.sql"
echo "2. Deploy worker: npx wrangler deploy"
echo "3. Query all buckets: curl https://gcloudv3.meauxbility.workers.dev/api/r2/buckets"
