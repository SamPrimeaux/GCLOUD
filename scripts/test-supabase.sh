#!/bin/bash
# Test Supabase Connection and SEO Table

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

SUPABASE_URL="https://qmpghmthbhuumemnahcz.supabase.co"
SUPABASE_KEY="sb_publishable_BQ3iz_92Jh8xvEiMg9WXpg_FNRpy2ZL"

echo -e "${BLUE}=== Testing Supabase Connection ===${NC}"
echo -e "URL: ${SUPABASE_URL}"
echo ""

# Test 1: Check if seo_meta table exists
echo -e "${BLUE}Test 1: Check seo_meta table${NC}"
curl -s "${SUPABASE_URL}/rest/v1/seo_meta?select=count" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" | jq '.'

echo ""

# Test 2: List all SEO entries
echo -e "${BLUE}Test 2: List SEO entries${NC}"
curl -s "${SUPABASE_URL}/rest/v1/seo_meta?select=*&limit=5" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" | jq '.'

echo ""

# Test 3: Query by URL
echo -e "${BLUE}Test 3: Query specific URL${NC}"
curl -s "${SUPABASE_URL}/rest/v1/seo_meta?url=eq.https://meauxbility.org/&select=*" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" | jq '.'

echo ""

# Test 4: Insert test entry
echo -e "${BLUE}Test 4: Insert test entry${NC}"
curl -s -X POST "${SUPABASE_URL}/rest/v1/seo_meta" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "url": "https://meauxbility.org/test",
    "title": "Test Page – Meauxbility",
    "description": "This is a test page for SEO management.",
    "meta_robots": "index,follow",
    "canonical_url": "https://meauxbility.org/test",
    "language": "en",
    "locale": "en-US",
    "tags": ["test", "demo", "meauxbility"],
    "source": "test-script",
    "is_published": true
  }' | jq '.'

echo ""

# Test 5: Query pages needing optimization
echo -e "${BLUE}Test 5: Pages needing SEO work${NC}"
curl -s "${SUPABASE_URL}/rest/v1/seo_meta?is_published=eq.true&or=(title.is.null,description.is.null)&select=url,title,description&limit=10" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" | jq '.'

echo ""
echo -e "${GREEN}✅ Supabase connection tests complete${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Run schema in Supabase: cat schema-supabase-seo.sql | supabase db query"
echo "2. Get service role key: https://supabase.com/dashboard/project/qmpghmthbhuumemnahcz/settings/api"
echo "3. Update wrangler.toml with Supabase vars"
echo "4. Deploy: npx wrangler deploy"
