/**
 * Supabase Sync Manager
 * Bidirectional sync between D1 and Supabase (PostgREST).
 *
 * Security note:
 * - Expose sync endpoints behind INTERNAL_SYNC_TOKEN (handled in src/index.js).
 * - Table names are whitelist-validated to prevent SQL injection.
 */

const DEFAULT_SYNC_TABLES = [
  'r2_buckets',
  'r2_objects',
  'ai_knowledge_base',
  'api_keys',
  'seo_meta',
  'infrastructure_documentation',
  'development_workflows',
  'code_knowledge_base',
  'grant_applications',
  'projects',
  'project_tasks',
  'project_members',
  'team_members',
  'deployments',
  'deployment_logs',
  'worker_stats',
  'analytics',
];

function assertTableAllowed(tableName, allowedTables) {
  if (!tableName || typeof tableName !== 'string') {
    throw new Error('Missing table name');
  }
  if (!allowedTables.includes(tableName)) {
    throw new Error(`Table not allowed for sync: ${tableName}`);
  }
  // extra hardening: only allow snake_case identifiers
  if (!/^[a-z_][a-z0-9_]*$/.test(tableName)) {
    throw new Error('Invalid table name');
  }
}

function isIsoDateString(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value);
}

/**
 * Best-effort conversion: D1 values → Supabase-friendly values
 * - Integers for booleans → boolean
 * - JSON strings → objects (for known JSON columns)
 */
function normalizeD1Record(record) {
  const transformed = { ...record };

  // common integer booleans
  for (const key of ['is_public', 'is_active', 'is_published']) {
    if (typeof transformed[key] === 'number') {
      transformed[key] = transformed[key] === 1;
    }
  }

  // JSON columns we know about across schemas
  const jsonFields = [
    'content',
    'metadata',
    'metadata_json',
    'steps_json',
    'embedding_json',
    'settings',
  ];

  for (const field of jsonFields) {
    if (typeof transformed[field] === 'string') {
      const trimmed = transformed[field].trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          transformed[field] = JSON.parse(trimmed);
        } catch {
          // keep as string
        }
      }
    }
  }

  return transformed;
}

/**
 * Best-effort conversion: Supabase values → D1-friendly values
 * - booleans → 0/1 for certain columns
 * - objects → JSON strings for known JSON columns
 */
function normalizeSupabaseRecord(record) {
  const transformed = { ...record };

  for (const key of ['is_public', 'is_active', 'is_published']) {
    if (typeof transformed[key] === 'boolean') {
      transformed[key] = transformed[key] ? 1 : 0;
    }
  }

  const jsonFields = [
    'content',
    'metadata',
    'metadata_json',
    'steps_json',
    'embedding_json',
    'settings',
  ];

  for (const field of jsonFields) {
    if (transformed[field] && typeof transformed[field] === 'object' && !Array.isArray(transformed[field])) {
      transformed[field] = JSON.stringify(transformed[field]);
    } else if (Array.isArray(transformed[field])) {
      transformed[field] = JSON.stringify(transformed[field]);
    }
  }

  return transformed;
}

function buildUpsertQueryForRecord(tableName, record) {
  const columns = Object.keys(record);
  if (columns.length === 0) throw new Error('Cannot upsert empty record');

  // Prefer id-based conflict if present (most of our tables)
  const conflictTarget = columns.includes('id') ? 'id' : null;
  if (!conflictTarget) {
    throw new Error(`Cannot upsert ${tableName}: missing primary key column 'id' in record`);
  }

  const placeholders = columns.map(() => '?').join(', ');
  const updates = columns
    .filter((c) => c !== conflictTarget)
    .map((c) => `${c} = excluded.${c}`)
    .join(', ');

  return {
    sql: `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT(${conflictTarget}) DO UPDATE SET ${updates}
    `,
    columns,
  };
}

export class SupabaseSync {
  constructor(env, options = {}) {
    this.d1 = env.DB;
    this.supabaseUrl = env.SUPABASE_URL;
    this.supabaseKey = env.SUPABASE_SERVICE_ROLE; // service role for server-side sync
    this.allowedTables = options.allowedTables || DEFAULT_SYNC_TABLES;
  }

  isConfigured() {
    return !!(this.d1 && this.supabaseUrl && this.supabaseKey);
  }

  async syncD1ToSupabase(tableName, options = {}) {
    assertTableAllowed(tableName, this.allowedTables);
    if (!this.isConfigured()) {
      throw new Error('Supabase sync not configured (needs DB, SUPABASE_URL, SUPABASE_SERVICE_ROLE)');
    }

    const { batchSize = 100, whereClause = '', syncAll = false } = options;

    // D1 query
    let query = `SELECT * FROM ${tableName}`;
    if (!syncAll && whereClause) query += ` WHERE ${whereClause}`;
    query += ` ORDER BY updated_at DESC`;
    if (!syncAll) query += ` LIMIT ${Number(batchSize) || 100}`;

    const d1Result = await this.d1.prepare(query).all();
    const rows = d1Result?.results || [];

    if (rows.length === 0) {
      await this.logSync(tableName, 'd1_to_supabase', 0, 'success', null);
      return { success: true, table: tableName, records_synced: 0, message: 'No records to sync' };
    }

    const payload = rows.map(normalizeD1Record);

    const response = await fetch(`${this.supabaseUrl}/rest/v1/${tableName}`, {
      method: 'POST',
      headers: {
        apikey: this.supabaseKey,
        Authorization: `Bearer ${this.supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      await this.logSync(tableName, 'd1_to_supabase', 0, 'failed', errText);
      return { success: false, table: tableName, error: `Supabase upsert failed: ${errText}` };
    }

    await this.logSync(tableName, 'd1_to_supabase', payload.length, 'success', null);
    return { success: true, table: tableName, records_synced: payload.length, timestamp: new Date().toISOString() };
  }

  async syncSupabaseToD1(tableName, options = {}) {
    assertTableAllowed(tableName, this.allowedTables);
    if (!this.isConfigured()) {
      throw new Error('Supabase sync not configured (needs DB, SUPABASE_URL, SUPABASE_SERVICE_ROLE)');
    }

    const { batchSize = 100, filter = '' } = options;

    let url = `${this.supabaseUrl}/rest/v1/${tableName}?select=*&limit=${Number(batchSize) || 100}`;
    if (filter) url += `&${filter}`;

    const response = await fetch(url, {
      headers: {
        apikey: this.supabaseKey,
        Authorization: `Bearer ${this.supabaseKey}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      await this.logSync(tableName, 'supabase_to_d1', 0, 'failed', errText);
      return { success: false, table: tableName, error: `Supabase fetch failed: ${errText}` };
    }

    const supabaseRows = await response.json();
    if (!Array.isArray(supabaseRows) || supabaseRows.length === 0) {
      await this.logSync(tableName, 'supabase_to_d1', 0, 'success', null);
      return { success: true, table: tableName, records_synced: 0, message: 'No records to sync' };
    }

    const d1Rows = supabaseRows.map(normalizeSupabaseRecord);

    // Require id for D1 upserts (MVP constraint)
    const { sql, columns } = buildUpsertQueryForRecord(tableName, d1Rows[0]);

    let synced = 0;
    for (const row of d1Rows) {
      const values = columns.map((c) => (isIsoDateString(row[c]) ? row[c] : row[c]));
      await this.d1.prepare(sql).bind(...values).run();
      synced += 1;
    }

    await this.logSync(tableName, 'supabase_to_d1', synced, 'success', null);
    return { success: true, table: tableName, records_synced: synced, timestamp: new Date().toISOString() };
  }

  async syncAll(options = {}) {
    const tables = options.tables && Array.isArray(options.tables) ? options.tables : DEFAULT_SYNC_TABLES;
    const results = [];

    for (const table of tables) {
      // only sync whitelisted tables
      try {
        assertTableAllowed(table, this.allowedTables);
      } catch (e) {
        results.push({ success: false, table, error: e.message });
        continue;
      }

      // default: D1 → Supabase for now
      // (bidirectional can be done by calling both directions)
      // small delay between calls to reduce rate-limit pressure
      // eslint-disable-next-line no-await-in-loop
      const res = await this.syncD1ToSupabase(table, options.perTable?.[table] || {});
      results.push(res);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 100));
    }

    return { success: results.every((r) => r.success), results, timestamp: new Date().toISOString() };
  }

  /**
   * Log sync in D1's supabase_sync table (best effort)
   */
  async logSync(tableName, direction, recordsCount, status, errorMessage = null) {
    try {
      if (!this.d1) return;

      await this.d1.prepare(
        `
        INSERT INTO supabase_sync (table_name, last_sync, record_count, sync_status, error_message)
        VALUES (?, datetime('now'), ?, ?, ?)
        `
      )
        .bind(tableName, recordsCount, `${status}:${direction}`, errorMessage)
        .run();
    } catch (e) {
      // don't fail sync if logging fails
      // eslint-disable-next-line no-console
      console.error('Failed to log sync:', e);
    }
  }
}

