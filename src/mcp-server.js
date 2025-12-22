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
