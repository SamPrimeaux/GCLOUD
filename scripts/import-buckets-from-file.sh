#!/bin/bash
# Import R2 Buckets from Text File
# Reads buckets.txt and registers each to D1

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BUCKET_FILE="${1:-buckets.txt}"

if [ ! -f "$BUCKET_FILE" ]; then
  echo -e "${RED}Error: Bucket file not found: $BUCKET_FILE${NC}"
  echo ""
  echo "Usage: $0 [bucket-file]"
  echo ""
  echo "Create a file with format:"
  echo "  bucket-name|BINDING_NAME|Description"
  echo ""
  echo "Example:"
  echo "  my-bucket|MY_BUCKET|My bucket description"
  exit 1
fi

echo -e "${BLUE}=== Import R2 Buckets from File ===${NC}"
echo -e "File: ${BUCKET_FILE}"
echo ""

TOTAL=0
REGISTERED=0
FAILED=0

while IFS='|' read -r BUCKET BINDING DESC; do
  # Skip comments and empty lines
  [[ "$BUCKET" =~ ^#.*$ ]] && continue
  [[ -z "$BUCKET" ]] && continue

  TOTAL=$((TOTAL + 1))

  # Trim whitespace
  BUCKET=$(echo "$BUCKET" | xargs)
  BINDING=$(echo "$BINDING" | xargs)
  DESC=$(echo "$DESC" | xargs)

  # If no binding provided, auto-generate
  if [ -z "$BINDING" ]; then
    BINDING=$(echo "$BUCKET" | tr '[:lower:]' '[:upper:]' | tr '-' '_')
  fi

  # If no description, use default
  if [ -z "$DESC" ]; then
    DESC="R2 bucket"
  fi

  echo -e "${BLUE}[$TOTAL] ${BUCKET}${NC}"
  echo -e "    Binding: ${BINDING}"
  echo -e "    Description: ${DESC}"

  # Insert into D1 (local)
  OUTPUT=$(npx wrangler d1 execute meauxos --local --command \
    "INSERT OR IGNORE INTO r2_buckets (bucket_name, binding_name, description)
     VALUES ('$BUCKET', '$BINDING', '$DESC')" 2>&1)

  if echo "$OUTPUT" | grep -q "success.*true"; then
    REGISTERED=$((REGISTERED + 1))
    echo -e "    ${GREEN}✓ Registered${NC}"
  else
    FAILED=$((FAILED + 1))
    echo -e "    ${YELLOW}○ Already exists or failed${NC}"
  fi
  echo ""

done < "$BUCKET_FILE"

echo -e "${GREEN}=== Import Complete ===${NC}"
echo -e "Total processed: ${TOTAL}"
echo -e "Newly registered: ${REGISTERED}"
echo -e "Skipped/Failed: ${FAILED}"
echo ""

# Show current count in D1
echo -e "${BLUE}Current D1 bucket registry:${NC}"
npx wrangler d1 execute meauxos --local --command \
  "SELECT COUNT(*) as total_buckets FROM r2_buckets" | grep -A 5 "results"

echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. List buckets: npx wrangler d1 execute meauxos --local --file=scripts/list-all-buckets.sql"
echo "2. Sync to remote: npx wrangler d1 execute meauxos --remote --file=schema.sql"
echo "3. Deploy: npx wrangler deploy"
