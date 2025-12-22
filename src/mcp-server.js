/**
 * MCP (Model Context Protocol) Server for GCLOUD
 * Provides AI tools for querying D1, R2 buckets, and Supabase
 *
 * API Spec: https://modelcontextprotocol.io/
 */

/**
 * MCP Server Implementation
 */
export class MCPServer {
  constructor(env) {
    this.env = env;
    this.tools = this.registerTools();
  }

  /**
   * Register all available MCP tools
   */
  registerTools() {
    return {
      // D1 SQL Query Tool
      'query_d1': {
        description: 'Execute SQL queries on the D1 database (MEAUXOS_DB)',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'SQL query to execute' },
            params: { type: 'array', description: 'Query parameters (optional)' }
          },
          required: ['query']
        },
        handler: this.queryD1.bind(this)
      },

      // List R2 Buckets
      'list_r2_buckets': {
        description: 'List all R2 buckets and their statistics',
        parameters: {
          type: 'object',
          properties: {}
        },
        handler: this.listR2Buckets.bind(this)
      },

      // Query R2 Objects
      'query_r2_objects': {
        description: 'Query R2 objects using SQL filters',
        parameters: {
          type: 'object',
          properties: {
            bucket_name: { type: 'string', description: 'Bucket name to query (optional)' },
            content_type: { type: 'string', description: 'Filter by content type (optional)' },
            limit: { type: 'number', description: 'Maximum results (default 100)' }
          }
        },
        handler: this.queryR2Objects.bind(this)
      },

      // Sync R2 Bucket to D1
      'sync_r2_bucket': {
        description: 'Sync R2 bucket metadata to D1 for SQL querying',
        parameters: {
          type: 'object',
          properties: {
            bucket_name: { type: 'string', description: 'Bucket name to sync' }
          },
          required: ['bucket_name']
        },
        handler: this.syncR2Bucket.bind(this)
      },

      // Get R2 Object
      'get_r2_object': {
        description: 'Retrieve an object from R2 storage',
        parameters: {
          type: 'object',
          properties: {
            bucket_name: { type: 'string', description: 'Bucket name' },
            object_key: { type: 'string', description: 'Object key/path' }
          },
          required: ['bucket_name', 'object_key']
        },
        handler: this.getR2Object.bind(this)
      },

      // List R2 Objects in Bucket
      'list_r2_objects': {
        description: 'List objects in an R2 bucket',
        parameters: {
          type: 'object',
          properties: {
            bucket_name: { type: 'string', description: 'Bucket name' },
            prefix: { type: 'string', description: 'Object key prefix (optional)' },
            limit: { type: 'number', description: 'Maximum results (default 100)' }
          },
          required: ['bucket_name']
        },
        handler: this.listR2Objects.bind(this)
      },

      // Query Supabase
      'query_supabase': {
        description: 'Query Supabase database',
        parameters: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name' },
            select: { type: 'string', description: 'Columns to select (default: *)' },
            filter: { type: 'object', description: 'Filter conditions' },
            limit: { type: 'number', description: 'Maximum results (default 100)' }
          },
          required: ['table']
        },
        handler: this.querySupabase.bind(this)
      },

      // Analyze R2 Usage
      'analyze_r2_usage': {
        description: 'Get analytics and usage statistics for R2 buckets',
        parameters: {
          type: 'object',
          properties: {
            bucket_name: { type: 'string', description: 'Specific bucket (optional, shows all if empty)' }
          }
        },
        handler: this.analyzeR2Usage.bind(this)
      },

      // Register API Key Fingerprint
      'register_api_key': {
        description: 'Register or update API key fingerprint (SHA256 hash only, never plaintext)',
        parameters: {
          type: 'object',
          properties: {
            service_name: { type: 'string', description: 'Service identifier (e.g., google-gemini, cloudflare)' },
            fingerprint: { type: 'string', description: 'SHA256 hash of the API key' },
            env_var_names: { type: 'string', description: 'Comma-separated environment variable names' },
            notes: { type: 'string', description: 'Optional notes' }
          },
          required: ['service_name', 'fingerprint']
        },
        handler: this.registerApiKey.bind(this)
      },

      // Verify API Key
      'verify_api_key': {
        description: 'Verify if a key fingerprint matches the stored fingerprint',
        parameters: {
          type: 'object',
          properties: {
            service_name: { type: 'string', description: 'Service identifier' },
            fingerprint: { type: 'string', description: 'SHA256 hash to verify' }
          },
          required: ['service_name', 'fingerprint']
        },
        handler: this.verifyApiKey.bind(this)
      },

      // List API Keys
      'list_api_keys': {
        description: 'List all registered API keys (fingerprints only)',
        parameters: {
          type: 'object',
          properties: {
            active_only: { type: 'boolean', description: 'Show only active keys (default: true)' }
          }
        },
        handler: this.listApiKeys.bind(this)
      },

      // Store Knowledge Base Entry
      'store_knowledge': {
        description: 'Store or update entry in AI knowledge base',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique identifier' },
            category: { type: 'string', description: 'Category (e.g., secrets, docs, config)' },
            title: { type: 'string', description: 'Entry title' },
            content: { type: 'object', description: 'JSON content' }
          },
          required: ['id', 'category', 'title', 'content']
        },
        handler: this.storeKnowledge.bind(this)
      },

      // Query Knowledge Base
      'query_knowledge': {
        description: 'Query AI knowledge base by category or search',
        parameters: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Filter by category' },
            search: { type: 'string', description: 'Search in title' },
            limit: { type: 'number', description: 'Max results (default 50)' }
          }
        },
        handler: this.queryKnowledge.bind(this)
      }
    };
  }

  /**
   * Handle MCP requests
   */
  async handleRequest(request) {
    const { method, params } = await request.json();

    // MCP Protocol methods
    switch (method) {
      case 'initialize':
        return this.initialize(params);

      case 'tools/list':
        return this.listTools();

      case 'tools/call':
        return await this.callTool(params);

      default:
        return { error: `Unknown method: ${method}` };
    }
  }

  /**
   * Initialize MCP session
   */
  initialize(params) {
    return {
      protocolVersion: '1.0',
      serverInfo: {
        name: 'GCLOUD MCP Server',
        version: '3.0.0'
      },
      capabilities: {
        tools: true,
        resources: true
      }
    };
  }

  /**
   * List available tools
   */
  listTools() {
    return {
      tools: Object.entries(this.tools).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: tool.parameters
      }))
    };
  }

  /**
   * Call a tool
   */
  async callTool(params) {
    const { name, arguments: args } = params;
    const tool = this.tools[name];

    if (!tool) {
      return { error: `Tool not found: ${name}` };
    }

    const startTime = Date.now();
    try {
      const result = await tool.handler(args);
      const executionTime = Date.now() - startTime;

      // Log tool usage
      await this.logToolUsage(name, args, result, executionTime, true);

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      await this.logToolUsage(name, args, null, executionTime, false, error.message);

      return { error: error.message };
    }
  }

  /**
   * Query D1 Database
   */
  async queryD1(args) {
    const { query, params = [] } = args;

    if (!this.env.MEAUXOS_DB) {
      throw new Error('D1 database not configured');
    }

    const stmt = params.length > 0
      ? this.env.MEAUXOS_DB.prepare(query).bind(...params)
      : this.env.MEAUXOS_DB.prepare(query);

    const result = await stmt.all();
    return result.results;
  }

  /**
   * List R2 Buckets from D1
   */
  async listR2Buckets() {
    const query = 'SELECT * FROM v_bucket_stats ORDER BY bucket_name';
    return await this.queryD1({ query });
  }

  /**
   * Query R2 Objects metadata from D1
   */
  async queryR2Objects(args) {
    const { bucket_name, content_type, limit = 100 } = args;

    let query = `
      SELECT
        b.bucket_name,
        o.object_key,
        o.content_type,
        o.size_bytes,
        o.last_modified
      FROM r2_objects o
      JOIN r2_buckets b ON o.bucket_id = b.id
      WHERE 1=1
    `;

    const params = [];

    if (bucket_name) {
      query += ' AND b.bucket_name = ?';
      params.push(bucket_name);
    }

    if (content_type) {
      query += ' AND o.content_type LIKE ?';
      params.push(`%${content_type}%`);
    }

    query += ' ORDER BY o.last_modified DESC LIMIT ?';
    params.push(limit);

    return await this.queryD1({ query, params });
  }

  /**
   * Sync R2 Bucket metadata to D1
   */
  async syncR2Bucket(args) {
    const { bucket_name } = args;
    const binding = this.getBucketBinding(bucket_name);

    if (!binding) {
      throw new Error(`Bucket not found or not bound: ${bucket_name}`);
    }

    // Get bucket ID from D1
    const bucketResult = await this.queryD1({
      query: 'SELECT id FROM r2_buckets WHERE bucket_name = ?',
      params: [bucket_name]
    });

    if (bucketResult.length === 0) {
      throw new Error(`Bucket not registered in D1: ${bucket_name}`);
    }

    const bucketId = bucketResult[0].id;
    const bucket = this.env[binding];

    // List all objects in bucket
    const listed = await bucket.list();
    let syncCount = 0;

    for (const object of listed.objects) {
      // Insert or update object metadata
      await this.queryD1({
        query: `
          INSERT INTO r2_objects (bucket_id, object_key, size_bytes, etag, last_modified)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(bucket_id, object_key) DO UPDATE SET
            size_bytes = excluded.size_bytes,
            etag = excluded.etag,
            last_modified = excluded.last_modified,
            updated_at = CURRENT_TIMESTAMP
        `,
        params: [bucketId, object.key, object.size, object.etag, object.uploaded.toISOString()]
      });
      syncCount++;
    }

    // Update bucket stats
    await this.queryD1({
      query: `
        UPDATE r2_buckets
        SET object_count = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      params: [syncCount, bucketId]
    });

    return {
      bucket_name,
      objects_synced: syncCount,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get R2 Object
   */
  async getR2Object(args) {
    const { bucket_name, object_key } = args;
    const binding = this.getBucketBinding(bucket_name);

    if (!binding) {
      throw new Error(`Bucket not found: ${bucket_name}`);
    }

    const bucket = this.env[binding];
    const object = await bucket.get(object_key);

    if (!object) {
      throw new Error(`Object not found: ${object_key}`);
    }

    return {
      key: object.key,
      size: object.size,
      etag: object.etag,
      httpEtag: object.httpEtag,
      uploaded: object.uploaded,
      httpMetadata: object.httpMetadata,
      customMetadata: object.customMetadata,
      // Note: actual body content not included in response
      // Use object.text() or object.arrayBuffer() to get content
    };
  }

  /**
   * List R2 Objects directly from bucket
   */
  async listR2Objects(args) {
    const { bucket_name, prefix = '', limit = 100 } = args;
    const binding = this.getBucketBinding(bucket_name);

    if (!binding) {
      throw new Error(`Bucket not found: ${bucket_name}`);
    }

    const bucket = this.env[binding];
    const listed = await bucket.list({ prefix, limit });

    return {
      bucket: bucket_name,
      objects: listed.objects.map(obj => ({
        key: obj.key,
        size: obj.size,
        etag: obj.etag,
        uploaded: obj.uploaded
      })),
      truncated: listed.truncated,
      cursor: listed.cursor
    };
  }

  /**
   * Query Supabase
   */
  async querySupabase(args) {
    const { table, select = '*', filter = {}, limit = 100 } = args;

    if (!this.env.SUPABASE_URL || !this.env.SUPABASE_SERVICE_ROLE) {
      throw new Error('Supabase not configured');
    }

    let url = `${this.env.SUPABASE_URL}/rest/v1/${table}?select=${select}&limit=${limit}`;

    // Add filters
    for (const [key, value] of Object.entries(filter)) {
      url += `&${key}=eq.${value}`;
    }

    const response = await fetch(url, {
      headers: {
        'apikey': this.env.SUPABASE_SERVICE_ROLE,
        'Authorization': `Bearer ${this.env.SUPABASE_SERVICE_ROLE}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase query failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Analyze R2 Usage
   */
  async analyzeR2Usage(args) {
    const { bucket_name } = args;

    if (bucket_name) {
      // Specific bucket analysis
      return await this.queryD1({
        query: `
          SELECT
            bucket_name,
            binding_name,
            object_count,
            total_size_bytes,
            latest_update,
            created_at
          FROM v_bucket_stats
          WHERE bucket_name = ?
        `,
        params: [bucket_name]
      });
    } else {
      // All buckets analysis
      const stats = await this.queryD1({
        query: 'SELECT * FROM v_bucket_stats ORDER BY total_size_bytes DESC'
      });

      const totalObjects = stats.reduce((sum, b) => sum + (b.object_count || 0), 0);
      const totalBytes = stats.reduce((sum, b) => sum + (b.total_size_bytes || 0), 0);

      return {
        summary: {
          total_buckets: stats.length,
          total_objects: totalObjects,
          total_size_bytes: totalBytes,
          total_size_gb: (totalBytes / (1024 ** 3)).toFixed(2)
        },
        buckets: stats
      };
    }
  }

  /**
   * Register or Update API Key Fingerprint
   */
  async registerApiKey(args) {
    const { service_name, fingerprint, env_var_names = '', notes = '' } = args;

    // Validate fingerprint format (64 char hex for SHA256)
    if (!/^[a-f0-9]{64}$/i.test(fingerprint)) {
      throw new Error('Invalid fingerprint format. Expected 64-character SHA256 hex string.');
    }

    const result = await this.queryD1({
      query: `
        INSERT INTO api_keys (service_name, key_fingerprint, env_var_names, notes, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(service_name) DO UPDATE SET
          key_fingerprint = excluded.key_fingerprint,
          env_var_names = excluded.env_var_names,
          notes = excluded.notes,
          updated_at = CURRENT_TIMESTAMP
      `,
      params: [service_name, fingerprint, env_var_names, notes]
    });

    return {
      service_name,
      fingerprint: fingerprint.substring(0, 16) + '...' + fingerprint.substring(48), // Truncate for display
      env_vars: env_var_names.split(','),
      status: 'registered',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Verify API Key Fingerprint
   */
  async verifyApiKey(args) {
    const { service_name, fingerprint } = args;

    const result = await this.queryD1({
      query: 'SELECT key_fingerprint, is_active FROM api_keys WHERE service_name = ?',
      params: [service_name]
    });

    if (result.length === 0) {
      return {
        service_name,
        verified: false,
        message: 'Service not found in registry'
      };
    }

    const stored = result[0];
    const matches = stored.key_fingerprint === fingerprint;

    if (matches) {
      // Update last verified timestamp
      await this.queryD1({
        query: 'UPDATE api_keys SET last_verified = CURRENT_TIMESTAMP WHERE service_name = ?',
        params: [service_name]
      });
    }

    return {
      service_name,
      verified: matches,
      is_active: stored.is_active === 1,
      last_verified: matches ? new Date().toISOString() : null
    };
  }

  /**
   * List API Keys
   */
  async listApiKeys(args) {
    const { active_only = true } = args;

    let query = `
      SELECT
        service_name,
        substr(key_fingerprint, 1, 16) || '...' || substr(key_fingerprint, -16) as fingerprint_preview,
        env_var_names,
        is_active,
        last_verified,
        notes,
        created_at,
        updated_at
      FROM api_keys
    `;

    if (active_only) {
      query += ' WHERE is_active = 1';
    }

    query += ' ORDER BY service_name';

    return await this.queryD1({ query });
  }

  /**
   * Store Knowledge Base Entry
   */
  async storeKnowledge(args) {
    const { id, category, title, content } = args;
    const timestamp = Math.floor(Date.now() / 1000);

    await this.queryD1({
      query: `
        INSERT INTO ai_knowledge_base (id, category, title, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          category = excluded.category,
          title = excluded.title,
          content = excluded.content,
          updated_at = ?
      `,
      params: [id, category, title, JSON.stringify(content), timestamp, timestamp, timestamp]
    });

    return {
      id,
      category,
      title,
      status: 'stored',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Query Knowledge Base
   */
  async queryKnowledge(args) {
    const { category, search, limit = 50 } = args;

    let query = 'SELECT * FROM ai_knowledge_base WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (title LIKE ? OR id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY updated_at DESC LIMIT ?';
    params.push(limit);

    const results = await this.queryD1({ query, params });

    // Parse JSON content
    return results.map(row => ({
      ...row,
      content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content
    }));
  }

  /**
   * Get bucket binding name from bucket name
   */
  getBucketBinding(bucketName) {
    const bucketMap = {
      'meauxlife-appkit': 'APP_ASSETS',
      'inneranimalmedia-email-archive': 'EMAIL_ARCHIVE',
      'samicloudbackups': 'PERSONAL_BACKUP',
      'autorag-meauxbility-chatbot': 'R2_AUTORAG',
      'meauxbility-dashboard': 'R2_DASHBOARD'
    };

    return bucketMap[bucketName];
  }

  /**
   * Log tool usage to D1
   */
  async logToolUsage(toolName, parameters, result, executionTime, success, errorMessage = null) {
    try {
      await this.queryD1({
        query: `
          INSERT INTO mcp_tool_logs
          (tool_name, parameters, result, execution_time_ms, success, error_message)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        params: [
          toolName,
          JSON.stringify(parameters),
          result ? JSON.stringify(result) : null,
          executionTime,
          success ? 1 : 0,
          errorMessage
        ]
      });
    } catch (error) {
      console.error('Failed to log tool usage:', error);
    }
  }
}

/**
 * Export handler for direct endpoint access
 */
export async function handleMCPRequest(request, env) {
  const server = new MCPServer(env);
  const result = await server.handleRequest(request);

  return new Response(JSON.stringify(result), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
