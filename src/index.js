/**
 * MeauxOS Cloudflare Worker
 * Serves the static MeauxOS dashboard
 */

// Import the HTML content (you can also fetch from KV or R2)
const HTML_CONTENT = `<!-- This will be replaced with index.html content during build -->`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Basic routing
    if (url.pathname === '/') {
      return new Response(HTML_CONTENT, {
        headers: {
          'content-type': 'text/html;charset=UTF-8',
          'cache-control': 'public, max-age=3600',
        },
      });
    }

    // API endpoints can go here
    if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, env);
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: env.ENVIRONMENT || 'production',
      }), {
        headers: { 'content-type': 'application/json' },
      });
    }

    // 404 for other routes
    return new Response('Not Found', { status: 404 });
  },
};

/**
 * Handle API requests
 */
async function handleAPI(request, env) {
  const url = new URL(request.url);

  // Example: /api/verify
  if (url.pathname === '/api/verify') {
    return new Response(JSON.stringify({
      success: true,
      message: 'MeauxOS API is operational',
    }), {
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    error: 'API endpoint not found',
  }), {
    status: 404,
    headers: { 'content-type': 'application/json' },
  });
}
