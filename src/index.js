/**
 * GCLOUD v3 Cloudflare Worker
 * Multi-tenant SaaS monorepo platform with MCP integration
 */

import { handleMCPRequest, MCPServer } from './mcp-server.js';
import { HTML_CONTENT } from './html-content.js';

// Serve index.html from R2 or fallback to inline
async function getIndexHTML(env) {
  try {
    // Try to fetch from R2_DASHBOARD bucket
    if (env.R2_DASHBOARD) {
      const object = await env.R2_DASHBOARD.get('index.html');
      if (object) {
        return await object.text();
      }
    }
  } catch (error) {
    console.error('Failed to fetch index.html from R2:', error);
  }

  // Fallback to inline HTML content
  return HTML_CONTENT;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // MCP Server endpoint
    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      return handleMCPRequest(request, env);
    }

    // API endpoints
    if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, env, ctx);
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: env.APP_ENV || 'production',
        version: '3.0.0',
        features: {
          mcp: true,
          d1: !!env.MEAUXOS_DB,
          r2_buckets: 5,
          vectorize: !!env.VECTORIZE,
          github_models: !!env.GCLOUD_GH_TOKEN
        }
      }), {
        headers: { 'content-type': 'application/json', ...corsHeaders },
      });
    }

    // Serve index.html
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const html = await getIndexHTML(env);
      return new Response(html, {
        headers: {
          'content-type': 'text/html;charset=UTF-8',
          'cache-control': 'public, max-age=300',
          ...corsHeaders
        },
      });
    }

    // 404 for other routes
    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};

/**
 * Handle API requests
 */
async function handleAPI(request, env, ctx) {
  const url = new URL(request.url);
  const corsHeaders = {
    'content-type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  // API: Verify endpoint
  if (url.pathname === '/api/verify') {
    return new Response(JSON.stringify({
      success: true,
      message: 'GCLOUD v3 API is operational',
      mcp_endpoint: '/mcp',
      timestamp: new Date().toISOString()
    }), { headers: corsHeaders });
  }

  // API: List MCP tools
  if (url.pathname === '/api/mcp/tools') {
    const server = new MCPServer(env);
    const tools = server.listTools();
    return new Response(JSON.stringify(tools), { headers: corsHeaders });
  }

  // API: Query D1 (direct SQL endpoint)
  if (url.pathname === '/api/d1/query' && request.method === 'POST') {
    try {
      const { query, params = [] } = await request.json();
      const server = new MCPServer(env);
      const result = await server.queryD1({ query, params });

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), { headers: corsHeaders });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), { status: 500, headers: corsHeaders });
    }
  }

  // API: List R2 buckets
  if (url.pathname === '/api/r2/buckets') {
    try {
      const server = new MCPServer(env);
      const buckets = await server.listR2Buckets();

      return new Response(JSON.stringify({
        success: true,
        data: buckets
      }), { headers: corsHeaders });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), { status: 500, headers: corsHeaders });
    }
  }

  // API: Sync R2 bucket
  if (url.pathname.startsWith('/api/r2/sync/') && request.method === 'POST') {
    const bucket_name = url.pathname.split('/').pop();
    try {
      const server = new MCPServer(env);
      const result = await server.syncR2Bucket({ bucket_name });

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), { headers: corsHeaders });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), { status: 500, headers: corsHeaders });
    }
  }

  // API: GitHub Models chat
  if (url.pathname === '/api/chat' && request.method === 'POST') {
    try {
      const { message, model = 'gpt-4o' } = await request.json();

      const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.GCLOUD_GH_TOKEN}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant for the GCLOUD monorepo SaaS platform.'
            },
            {
              role: 'user',
              content: message
            }
          ]
        })
      });

      const data = await response.json();
      return new Response(JSON.stringify({
        success: true,
        data: data.choices[0].message.content
      }), { headers: corsHeaders });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response(JSON.stringify({
    error: 'API endpoint not found',
    available_endpoints: [
      '/api/verify',
      '/api/mcp/tools',
      '/api/d1/query',
      '/api/r2/buckets',
      '/api/r2/sync/:bucket_name',
      '/api/chat'
    ]
  }), {
    status: 404,
    headers: corsHeaders
  });
}
