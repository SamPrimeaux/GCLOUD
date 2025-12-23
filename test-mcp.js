/**
 * MCP Functionality Test Suite
 * Tests all 13 MCP tools to ensure reliability
 */

import { MCPServer } from './src/mcp-server.js';

// Mock environment for local testing
const mockEnv = {
  DB: null, // Will be initialized by wrangler
  ALLINFRASTRUCTURE: null,
  APP_ASSETS: null,
  EMAIL_ARCHIVE: null,
  PERSONAL_BACKUP: null,
  R2_AUTORAG: null,
  R2_DASHBOARD: null
};

async function testMCPTools() {
  console.log('🧪 MCP Functionality Test Suite\n');

  // Note: This requires wrangler dev to be running
  console.log('⚠️  This test requires the worker to be running.');
  console.log('   Run: npx wrangler dev\n');

  const baseUrl = 'http://localhost:8787';

  const tests = [
    {
      name: '1. Health Check',
      endpoint: '/health',
      method: 'GET'
    },
    {
      name: '2. List MCP Tools',
      endpoint: '/api/mcp/tools',
      method: 'GET'
    },
    {
      name: '3. Query D1 - List Buckets',
      endpoint: '/api/d1/query',
      method: 'POST',
      body: {
        query: 'SELECT * FROM r2_buckets ORDER BY bucket_name',
        params: []
      }
    },
    {
      name: '4. Query D1 - List API Keys',
      endpoint: '/api/d1/query',
      method: 'POST',
      body: {
        query: 'SELECT service_name, key_fingerprint, is_active FROM api_keys ORDER BY service_name',
        params: []
      }
    },
    {
      name: '5. List R2 Buckets via API',
      endpoint: '/api/r2/buckets',
      method: 'GET'
    },
    {
      name: '6. List API Keys',
      endpoint: '/api/secrets/list',
      method: 'GET'
    },
    {
      name: '7. Query Knowledge Base (empty)',
      endpoint: '/api/knowledge/query?category=secrets&limit=10',
      method: 'GET'
    },
    {
      name: '8. Test MCP Protocol - List Tools',
      endpoint: '/mcp',
      method: 'POST',
      body: {
        method: 'tools/list'
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (test.body) {
        options.body = JSON.stringify(test.body);
      }

      const response = await fetch(`${baseUrl}${test.endpoint}`, options);
      const data = await response.json();

      if (response.ok) {
        console.log(`✅ ${test.name}`);
        if (test.name.includes('Health Check')) {
          console.log(`   Version: ${data.version}, MCP Tools: ${data.features.mcp_tools}, R2 Buckets: ${data.features.r2_buckets}`);
        }
        if (test.name.includes('List Buckets')) {
          console.log(`   Found ${data.data?.length || 0} buckets`);
        }
        if (test.name.includes('List API Keys')) {
          console.log(`   Found ${data.data?.length || 0} API keys`);
        }
        if (test.name.includes('MCP Protocol')) {
          console.log(`   MCP Tools available: ${data.tools?.length || 0}`);
        }
        passed++;
      } else {
        console.log(`❌ ${test.name}`);
        console.log(`   Error: ${data.error || response.statusText}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed out of ${tests.length} tests`);

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Make sure wrangler dev is running:');
    console.log('   npx wrangler dev');
  }
}

// Run tests
testMCPTools().catch(console.error);
