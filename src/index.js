/**
 * GCLOUD v3 Cloudflare Worker
 * Multi-tenant SaaS monorepo platform with MCP integration
 */

import { handleMCPRequest, MCPServer } from './mcp-server.js';
import { HTML_CONTENT } from './html-content.js';
import { SupabaseSync } from './supabase-sync.js';

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
          mcp_tools: 17,
          d1: !!env.DB,
          r2_buckets: 6,
          secret_management: true,
          knowledge_base: true,
          seo_management: true,
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

  const json = (obj, init = {}) =>
    new Response(JSON.stringify(obj), { headers: { ...corsHeaders, ...(init.headers || {}) }, status: init.status || 200 });

  const requireInternalAuth = () => {
    if (!env.INTERNAL_SYNC_TOKEN) {
      return { ok: false, status: 503, body: { success: false, error: 'Sync/auth not configured (set INTERNAL_SYNC_TOKEN)' } };
    }
    const auth = request.headers.get('authorization') || '';
    const expected = `Bearer ${env.INTERNAL_SYNC_TOKEN}`;
    if (auth !== expected) {
      return { ok: false, status: 403, body: { success: false, error: 'Forbidden' } };
    }
    return { ok: true };
  };

  // --------------------------------------------------------------------------
  // Sync endpoints (protected)
  // --------------------------------------------------------------------------

  if (url.pathname === '/api/sync/d1-to-supabase' && request.method === 'POST') {
    const auth = requireInternalAuth();
    if (!auth.ok) return json(auth.body, { status: auth.status });

    try {
      const { table, options = {} } = await request.json();
      const sync = new SupabaseSync(env);
      const result = await sync.syncD1ToSupabase(table, options);
      return json(result);
    } catch (error) {
      return json({ success: false, error: error.message }, { status: 500 });
    }
  }

  if (url.pathname === '/api/sync/supabase-to-d1' && request.method === 'POST') {
    const auth = requireInternalAuth();
    if (!auth.ok) return json(auth.body, { status: auth.status });

    try {
      const { table, options = {} } = await request.json();
      const sync = new SupabaseSync(env);
      const result = await sync.syncSupabaseToD1(table, options);
      return json(result);
    } catch (error) {
      return json({ success: false, error: error.message }, { status: 500 });
    }
  }

  if (url.pathname === '/api/sync/all' && request.method === 'POST') {
    const auth = requireInternalAuth();
    if (!auth.ok) return json(auth.body, { status: auth.status });

    try {
      const body = await request.json().catch(() => ({}));
      const sync = new SupabaseSync(env);
      const result = await sync.syncAll(body || {});
      return json(result);
    } catch (error) {
      return json({ success: false, error: error.message }, { status: 500 });
    }
  }

  if (url.pathname === '/api/sync/status' && request.method === 'GET') {
    const auth = requireInternalAuth();
    if (!auth.ok) return json(auth.body, { status: auth.status });

    try {
      if (!env.DB) throw new Error('D1 not configured');
      const result = await env.DB.prepare(
        `
        SELECT table_name, last_sync, record_count, sync_status, error_message, created_at
        FROM supabase_sync
        ORDER BY created_at DESC
        LIMIT 20
        `
      ).all();
      return json({ success: true, data: result.results || [] });
    } catch (error) {
      return json({ success: false, error: error.message }, { status: 500 });
    }
  }

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

  // --------------------------------------------------------------------------
  // Command Center dashboard APIs (read-only)
  // --------------------------------------------------------------------------

  if (url.pathname === '/api/dashboard/overview' && request.method === 'GET') {
    try {
      if (!env.DB) throw new Error('D1 database not configured');

      // Cross-system overview (safe even if some tables empty)
      const counts = await env.DB.prepare(
        `
        SELECT 'Grants' as metric, (SELECT COUNT(*) FROM grant_applications) as value
        UNION ALL
        SELECT 'Pending Grants', (SELECT COUNT(*) FROM grant_applications WHERE status = 'pending')
        UNION ALL
        SELECT 'Active Projects', (SELECT COUNT(*) FROM projects WHERE status = 'active')
        UNION ALL
        SELECT 'Team Members', (SELECT COUNT(DISTINCT user_id) FROM team_members WHERE is_active = 1)
        UNION ALL
        SELECT 'R2 Buckets', (SELECT COUNT(*) FROM r2_buckets)
        UNION ALL
        SELECT 'Total R2 Objects', (SELECT COALESCE(SUM(object_count), 0) FROM r2_buckets)
        UNION ALL
        SELECT 'API Keys', (SELECT COUNT(*) FROM api_keys WHERE is_active = 1)
        UNION ALL
        SELECT 'SEO Pages', (SELECT COUNT(*) FROM seo_meta WHERE is_published = 1)
        `
      ).all();

      // Lightweight panels
      const pendingGrants = await env.DB.prepare(
        `
        SELECT id, applicant_name, grant_type, amount_requested, status, created_at, updated_at
        FROM grant_applications
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 10
        `
      ).all();

      const activeProjects = await env.DB.prepare(
        `
        SELECT
          p.id, p.name, p.status, p.priority,
          COUNT(DISTINCT pt.id) as task_count,
          COUNT(DISTINCT pm.user_id) as team_size,
          p.start_date, p.deadline
        FROM projects p
        LEFT JOIN project_tasks pt ON p.id = pt.project_id
        LEFT JOIN project_members pm ON p.id = pm.project_id
        WHERE p.status = 'active'
        GROUP BY p.id
        ORDER BY p.priority DESC, p.deadline ASC
        LIMIT 10
        `
      ).all();

      const overdueTasks = await env.DB.prepare(
        `
        SELECT
          pt.id, pt.title, p.name as project_name,
          pt.due_date, pt.assigned_to, pt.priority
        FROM project_tasks pt
        JOIN projects p ON pt.project_id = p.id
        WHERE pt.status != 'completed'
          AND pt.due_date IS NOT NULL
          AND pt.due_date < date('now')
        ORDER BY pt.due_date ASC, pt.priority DESC
        LIMIT 10
        `
      ).all();

      const storage = await env.DB.prepare(
        `
        SELECT
          b.bucket_name,
          b.object_count,
          ROUND(CAST(b.total_size_bytes AS REAL) / 1024 / 1024 / 1024, 2) as size_gb,
          b.latest_update
        FROM v_bucket_stats b
        ORDER BY b.total_size_bytes DESC
        LIMIT 10
        `
      ).all();

      const deployments = await env.DB.prepare(
        `
        SELECT
          d.id, d.project_name, d.environment,
          d.status, d.deployed_by, d.deployed_at,
          COUNT(dl.id) as log_entries
        FROM deployments d
        LEFT JOIN deployment_logs dl ON d.id = dl.deployment_id
        GROUP BY d.id
        ORDER BY d.deployed_at DESC
        LIMIT 10
        `
      ).all();

      return json({
        success: true,
        data: {
          metrics: counts.results || [],
          pending_grants: pendingGrants.results || [],
          active_projects: activeProjects.results || [],
          overdue_tasks: overdueTasks.results || [],
          storage_by_bucket: storage.results || [],
          recent_deployments: deployments.results || [],
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return json({ success: false, error: error.message }, { status: 500 });
    }
  }

  if (url.pathname === '/api/grants/pending' && request.method === 'GET') {
    try {
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 100);
      const result = await env.DB.prepare(
        `
        SELECT id, applicant_name, grant_type, amount_requested, status, created_at, updated_at
        FROM grant_applications
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT ?
        `
      ).bind(limit).all();
      return json({ success: true, data: result.results || [] });
    } catch (error) {
      return json({ success: false, error: error.message }, { status: 500 });
    }
  }

  if (url.pathname === '/api/grants/summary' && request.method === 'GET') {
    try {
      const result = await env.DB.prepare(
        `
        SELECT
          grant_type,
          COUNT(*) as total,
          SUM(amount_requested) as total_requested,
          SUM(amount_approved) as total_approved,
          ROUND(AVG(amount_approved), 2) as avg_approved
        FROM grant_applications
        WHERE status = 'approved'
        GROUP BY grant_type
        ORDER BY total DESC
        `
      ).all();
      return json({ success: true, data: result.results || [] });
    } catch (error) {
      return json({ success: false, error: error.message }, { status: 500 });
    }
  }

  if (url.pathname === '/api/projects/active' && request.method === 'GET') {
    try {
      const result = await env.DB.prepare(
        `
        SELECT
          p.id, p.name, p.status, p.priority,
          COUNT(DISTINCT pt.id) as task_count,
          COUNT(DISTINCT pm.user_id) as team_size,
          p.start_date, p.deadline
        FROM projects p
        LEFT JOIN project_tasks pt ON p.id = pt.project_id
        LEFT JOIN project_members pm ON p.id = pm.project_id
        WHERE p.status = 'active'
        GROUP BY p.id
        ORDER BY p.priority DESC, p.deadline ASC
        `
      ).all();
      return json({ success: true, data: result.results || [] });
    } catch (error) {
      return json({ success: false, error: error.message }, { status: 500 });
    }
  }

  if (url.pathname === '/api/tasks/overdue' && request.method === 'GET') {
    try {
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 100);
      const result = await env.DB.prepare(
        `
        SELECT
          pt.id, pt.title, p.name as project_name,
          pt.due_date, pt.assigned_to, pt.priority
        FROM project_tasks pt
        JOIN projects p ON pt.project_id = p.id
        WHERE pt.status != 'completed'
          AND pt.due_date IS NOT NULL
          AND pt.due_date < date('now')
        ORDER BY pt.due_date ASC, pt.priority DESC
        LIMIT ?
        `
      ).bind(limit).all();
      return json({ success: true, data: result.results || [] });
    } catch (error) {
      return json({ success: false, error: error.message }, { status: 500 });
    }
  }

  if (url.pathname === '/api/storage/buckets' && request.method === 'GET') {
    try {
      const result = await env.DB.prepare(
        `
        SELECT
          b.bucket_name,
          b.object_count,
          ROUND(CAST(b.total_size_bytes AS REAL) / 1024 / 1024 / 1024, 2) as size_gb,
          b.latest_update
        FROM v_bucket_stats b
        ORDER BY b.total_size_bytes DESC
        `
      ).all();
      return json({ success: true, data: result.results || [] });
    } catch (error) {
      return json({ success: false, error: error.message }, { status: 500 });
    }
  }

  if (url.pathname === '/api/deployments/recent' && request.method === 'GET') {
    try {
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10) || 10, 50);
      const result = await env.DB.prepare(
        `
        SELECT
          d.id, d.project_name, d.environment,
          d.status, d.deployed_by, d.deployed_at,
          COUNT(dl.id) as log_entries
        FROM deployments d
        LEFT JOIN deployment_logs dl ON d.id = dl.deployment_id
        GROUP BY d.id
        ORDER BY d.deployed_at DESC
        LIMIT ?
        `
      ).bind(limit).all();
      return json({ success: true, data: result.results || [] });
    } catch (error) {
      return json({ success: false, error: error.message }, { status: 500 });
    }
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

  // API: Register API key fingerprint
  if (url.pathname === '/api/secrets/register' && request.method === 'POST') {
    try {
      const { service_name, fingerprint, env_var_names, notes } = await request.json();
      const server = new MCPServer(env);
      const result = await server.registerApiKey({ service_name, fingerprint, env_var_names, notes });

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

  // API: Verify API key fingerprint
  if (url.pathname === '/api/secrets/verify' && request.method === 'POST') {
    try {
      const { service_name, fingerprint } = await request.json();
      const server = new MCPServer(env);
      const result = await server.verifyApiKey({ service_name, fingerprint });

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

  // API: List API keys
  if (url.pathname === '/api/secrets/list') {
    try {
      const active_only = url.searchParams.get('active_only') !== 'false';
      const server = new MCPServer(env);
      const result = await server.listApiKeys({ active_only });

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

  // API: Store knowledge base entry
  if (url.pathname === '/api/knowledge/store' && request.method === 'POST') {
    try {
      const { id, category, title, content } = await request.json();
      const server = new MCPServer(env);
      const result = await server.storeKnowledge({ id, category, title, content });

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

  // API: Query knowledge base
  if (url.pathname === '/api/knowledge/query') {
    try {
      const category = url.searchParams.get('category');
      const search = url.searchParams.get('search');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const server = new MCPServer(env);
      const result = await server.queryKnowledge({ category, search, limit });

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

  // API: SEO - List pages needing optimization
  if (url.pathname === '/api/seo/pending') {
    try {
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const server = new MCPServer(env);
      const result = await server.seoListPending({ limit });

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

  // API: SEO - Get page metadata
  if (url.pathname.startsWith('/api/seo/page/') && request.method === 'GET') {
    try {
      const pageUrl = decodeURIComponent(url.pathname.split('/api/seo/page/')[1]);
      const server = new MCPServer(env);
      const result = await server.seoGetPage({ url: pageUrl });

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

  // API: SEO - Update page metadata
  if (url.pathname === '/api/seo/update' && request.method === 'POST') {
    try {
      const data = await request.json();
      const server = new MCPServer(env);
      const result = await server.seoUpdatePage(data);

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

  // API: SEO - Generate metadata with AI
  if (url.pathname === '/api/seo/generate' && request.method === 'POST') {
    try {
      const { url: pageUrl, content, brand } = await request.json();
      const server = new MCPServer(env);
      const result = await server.seoGenerateMeta({ url: pageUrl, content, brand });

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
      '/api/secrets/register (POST)',
      '/api/secrets/verify (POST)',
      '/api/secrets/list',
      '/api/knowledge/store (POST)',
      '/api/knowledge/query',
      '/api/seo/pending',
      '/api/seo/page/:url',
      '/api/seo/update (POST)',
      '/api/seo/generate (POST)',
      '/api/chat'
    ]
  }), {
    status: 404,
    headers: corsHeaders
  });
}
