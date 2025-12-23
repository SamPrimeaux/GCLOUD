#!/bin/bash
# Sync SEO metadata from D1 (local) to Supabase

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SUPABASE_URL="https://qmpghmthbhuumemnahcz.supabase.co"
SUPABASE_KEY="sb_publishable_BQ3iz_92Jh8xvEiMg9WXpg_FNRpy2ZL"

echo -e "${BLUE}=== Syncing D1 to Supabase ===${NC}"
echo ""

# Get all SEO entries from D1
echo -e "${YELLOW}Fetching SEO entries from D1...${NC}"
D1_DATA=$(npx wrangler d1 execute meauxos --local --command \
  "SELECT * FROM seo_meta" 2>/dev/null | grep -A 1000 "results" | \
  python3 -c "import sys, json; data = json.load(sys.stdin); print(json.dumps(data[0]['results']))" 2>/dev/null)

if [ -z "$D1_DATA" ] || [ "$D1_DATA" == "[]" ]; then
  echo -e "${YELLOW}No data in D1 seo_meta table${NC}"
  exit 0
fi

echo -e "${GREEN}Found $(echo "$D1_DATA" | jq 'length') entries${NC}"
echo ""

# Sync each entry to Supabase
echo "$D1_DATA" | jq -c '.[]' | while read -r entry; do
  URL=$(echo "$entry" | jq -r '.url')
  echo -e "${BLUE}Syncing: ${URL}${NC}"

  # Convert SQLite format to Postgres format
  # Note: tags need to be converted from string to array
  TAGS=$(echo "$entry" | jq -r '.tags // ""' | sed 's/,/", "/g' | sed 's/^/["/' | sed 's/$/"]/')
  if [ "$TAGS" == '[""]' ]; then
    TAGS='[]'
  fi

  # Build JSON payload
  PAYLOAD=$(echo "$entry" | jq --argjson tags "$TAGS" '{
    url: .url,
    title: .title,
    description: .description,
    meta_robots: .meta_robots,
    canonical_url: .canonical_url,
    language: .language,
    locale: .locale,
    tags: $tags,
    source: .source,
    notes: .notes,
    is_published: (.is_published == 1),
    seo_score: .seo_score
  }')

  # Upsert to Supabase
  RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/seo_meta" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates" \
    -d "$PAYLOAD")

  if echo "$RESPONSE" | jq -e '.code' >/dev/null 2>&1; then
    echo -e "  ${RED}✗ Error: $(echo "$RESPONSE" | jq -r '.message')${NC}"
  else
    echo -e "  ${GREEN}✓ Synced${NC}"
  fi
done

echo ""
echo -e "${GREEN}=== Sync Complete ===${NC}"
echo ""
echo "Verify in Supabase:"
echo "curl '${SUPABASE_URL}/rest/v1/seo_meta?select=count' -H 'apikey: ${SUPABASE_KEY}'"
