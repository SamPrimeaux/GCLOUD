#!/bin/bash
# Test D1 Database Queries
# Verifies all tables and data integrity

set -e

echo "🔍 Testing D1 Database Queries"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: List all tables
echo -e "${BLUE}Test 1: List all tables${NC}"
npx wrangler d1 execute meauxos --local --command \
  "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY name" \
  | grep -A 50 "results"
echo ""

# Test 2: Count R2 buckets
echo -e "${BLUE}Test 2: Count R2 buckets${NC}"
npx wrangler d1 execute meauxos --local --command \
  "SELECT COUNT(*) as bucket_count FROM r2_buckets" \
  | grep -A 5 "results"
echo ""

# Test 3: List all buckets
echo -e "${BLUE}Test 3: List all R2 buckets${NC}"
npx wrangler d1 execute meauxos --local --command \
  "SELECT bucket_name, binding_name, description FROM r2_buckets ORDER BY bucket_name" \
  | grep -A 20 "results"
echo ""

# Test 4: Count API keys
echo -e "${BLUE}Test 4: Count API keys${NC}"
npx wrangler d1 execute meauxos --local --command \
  "SELECT COUNT(*) as key_count FROM api_keys" \
  | grep -A 5 "results"
echo ""

# Test 5: List API keys
echo -e "${BLUE}Test 5: List all API keys${NC}"
npx wrangler d1 execute meauxos --local --command \
  "SELECT service_name, key_fingerprint, env_var_names FROM api_keys ORDER BY service_name" \
  | grep -A 20 "results"
echo ""

# Test 6: Test view v_bucket_stats
echo -e "${BLUE}Test 6: Query v_bucket_stats view${NC}"
npx wrangler d1 execute meauxos --local --command \
  "SELECT bucket_name, object_count, total_size_bytes FROM v_bucket_stats LIMIT 3" \
  | grep -A 15 "results"
echo ""

# Test 7: Verify indexes exist
echo -e "${BLUE}Test 7: Verify indexes${NC}"
npx wrangler d1 execute meauxos --local --command \
  "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name" \
  | grep -A 25 "results"
echo ""

echo -e "${GREEN}✅ All D1 queries completed successfully${NC}"
echo ""
echo "Next steps:"
echo "1. Run 'npx wrangler dev' to test MCP endpoints"
echo "2. Run 'node test-mcp.js' to test all 13 MCP tools"
echo "3. Use './scripts/register-secret.sh' to register API keys"
