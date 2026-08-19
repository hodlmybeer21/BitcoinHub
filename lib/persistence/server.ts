// BitcoinHub persistence server helper (anonymous-UUID MVP + Phase 4 hardening)
// Self-healing CREATE TABLE IF NOT EXISTS — no migration step required on
// Vercel deploy. Lazy-imports neon + ws inside the handler to avoid pulling
// them into the cold-start bundle until the first persistence call.
//
// Hardening added in Phase 4 (commit pending):
//   - Per-IP in-memory rate limiter (60 writes/min, 300 reads/min)
//   - Self-healing persistence_audit table (hashed user IDs, hashed IPs, no PII)
//   - Audit log on every upsert / get / list call

import { createHash } from 'node:crypto';

let poolPromise: Promise<any> | null = null;
let tableEnsured: Promise<void> | null = null;
let auditTableEnsured: Promise<void> | null = null;

// --- Rate limiter (in-memory token bucket per IP) ---
// Cheap and effective for typical Vercel serverless workloads. Resets on cold
// start, which is fine — sustained abuse would need a Vercel KV / Redis layer.
const RATE_LIMITS = {
  write: { perMinute: 60 }, // 60 writes/min per IP
  read: { perMinute: 300 },  // 300 reads/min per IP
} as const;

interface RateBucket { tokens: number; lastRefill: number; }
const rateBuckets = new Map<string, RateBucket>();

export function checkRateLimit(ip: string, kind: 'write' | 'read'): boolean {
  const limit = RATE_LIMITS[kind].perMinute;
  const now = Date.now();
  const entry = rateBuckets.get(`${kind}:${ip}`) ?? { tokens: limit, lastRefill: now };
  // Refill: limit tokens per 60 seconds = ~1 per 1000ms.
  const elapsedMs = now - entry.lastRefill;
  const refill = Math.floor((elapsedMs * limit) / 60_000);
  entry.tokens = Math.min(limit, entry.tokens + refill);
  entry.lastRefill = now;
  if (entry.tokens <= 0) {
    rateBuckets.set(`${kind}:${ip}`, entry);
    return false;
  }
  entry.tokens -= 1;
  rateBuckets.set(`${kind}:${ip}`, entry);
  return true;
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

async function getPool(): Promise<any> {
  if (!poolPromise) {
    poolPromise = (async () => {
      const serverless = await import('@neondatabase/serverless');
      const wsModule = await import('ws');
      const ws = (wsModule as any).default ?? wsModule;
      serverless.neonConfig.webSocketConstructor = ws;
      const connectionString = process.env.DATABASE_URL || '';
      if (!connectionString) {
        throw new Error('DATABASE_URL is not set on the server');
      }
      const { Pool } = serverless;
      return new Pool({ connectionString });
    })();
  }
  return poolPromise;
}

async function ensureTable(): Promise<void> {
  if (tableEnsured) return tableEnsured;
  tableEnsured = (async () => {
    const pool = await getPool();
    // Base table (legacy schema). Idempotent.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS anonymous_data (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        data_key TEXT NOT NULL,
        data_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        CONSTRAINT anon_data_user_key_unique UNIQUE (user_id, data_key)
      );
    `);
    // Gallery columns (Phase 5). Idempotent — safe to re-run on every cold start.
    // Postgres 9.6+ supports ADD COLUMN IF NOT EXISTS.
    await pool.query(`ALTER TABLE anonymous_data ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private'`);
    await pool.query(`ALTER TABLE anonymous_data ADD COLUMN IF NOT EXISTS gallery_title TEXT`);
    await pool.query(`ALTER TABLE anonymous_data ADD COLUMN IF NOT EXISTS gallery_description TEXT`);
    await pool.query(`ALTER TABLE anonymous_data ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE anonymous_data ADD COLUMN IF NOT EXISTS fork_count INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE anonymous_data ADD COLUMN IF NOT EXISTS published_at TIMESTAMP`);
  })();
  return tableEnsured;
}

async function ensureAuditTable(): Promise<void> {
  if (auditTableEnsured) return auditTableEnsured;
  auditTableEnsured = (async () => {
    const pool = await getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS persistence_audit (
        id SERIAL PRIMARY KEY,
        user_id_hash TEXT NOT NULL,
        action TEXT NOT NULL,
        data_key TEXT,
        byte_size INTEGER,
        ip_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
  })();
  return auditTableEnsured;
}

async function logAudit(
  userId: string,
  action: 'read' | 'write' | 'list',
  dataKey: string | null,
  byteSize: number,
  ip: string,
): Promise<void> {
  try {
    await ensureAuditTable();
    const pool = await getPool();
    await pool.query(
      `INSERT INTO persistence_audit (user_id_hash, action, data_key, byte_size, ip_hash)
       VALUES ($1, $2, $3, $4, $5)`,
      [sha256(userId), action, dataKey, byteSize, sha256(ip)],
    );
  } catch (e) {
    // Audit logging must NEVER fail the request. Log to console at most.
    console.warn('[persistence] audit log failed:', (e as Error)?.message);
  }
}

export async function upsertAnonData(
  userId: string,
  dataKey: string,
  dataValue: string,
  ip: string = 'unknown',
): Promise<void> {
  await ensureTable();
  const pool = await getPool();
  await pool.query(
    `INSERT INTO anonymous_data (user_id, data_key, data_value, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, data_key)
     DO UPDATE SET data_value = $3, updated_at = NOW()`,
    [userId, dataKey, dataValue],
  );
  await logAudit(userId, 'write', dataKey, dataValue.length, ip);
}

export async function getAnonData(
  userId: string,
  dataKey: string | undefined,
  ip: string = 'unknown',
): Promise<
  | { dataKey: string; dataValue: string | null; updatedAt?: string }
  | { userId: string; data: Record<string, string> }
  | null
> {
  await ensureTable();
  const pool = await getPool();
  if (dataKey) {
    const result = await pool.query(
      `SELECT data_value, updated_at FROM anonymous_data WHERE user_id = $1 AND data_key = $2`,
      [userId, dataKey],
    );
    const byteSize = result.rows[0]?.data_value ? (result.rows[0].data_value as string).length : 0;
    await logAudit(userId, 'read', dataKey, byteSize, ip);
    if (result.rows.length === 0) return { dataKey, dataValue: null };
    return {
      dataKey,
      dataValue: result.rows[0].data_value as string,
      updatedAt: result.rows[0].updated_at as string,
    };
  }
  const result = await pool.query(
    `SELECT data_key, data_value, updated_at FROM anonymous_data WHERE user_id = $1`,
    [userId],
  );
  let totalBytes = 0;
  const data: Record<string, string> = {};
  for (const row of result.rows) {
    data[row.data_key as string] = row.data_value as string;
    totalBytes += (row.data_value as string).length;
  }
  await logAudit(userId, 'list', null, totalBytes, ip);
  return { userId, data };
}

export function isPersistenceConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

// --- Gallery (Phase 5: public indicator browser + fork) ---

export interface PublicIndicatorListItem {
  id: number;
  authorUuidPrefix: string;
  dataKey: string;
  title: string;
  description: string;
  excerpt: string;
  viewCount: number;
  forkCount: number;
  publishedAt: string;
}

export async function publishIndicator(
  userId: string,
  dataKey: string,
  galleryTitle: string,
  galleryDescription: string,
  ip: string = 'unknown',
): Promise<{ ok: true; publishedAt: string }> {
  await ensureTable();
  const pool = await getPool();
  const result = await pool.query(
    `UPDATE anonymous_data
     SET visibility = 'public', gallery_title = $3, gallery_description = $4, published_at = NOW()
     WHERE user_id = $1 AND data_key = $2
     RETURNING id, published_at`,
    [userId, dataKey, galleryTitle, galleryDescription],
  );
  if (result.rows.length === 0) {
    throw new Error('Indicator not found. Save it first before publishing.');
  }
  await logAudit(userId, 'publish', dataKey, galleryTitle.length, ip);
  return { ok: true, publishedAt: result.rows[0].published_at as string, id: result.rows[0].id as number };
}

export async function unpublishIndicator(
  userId: string,
  dataKey: string,
  ip: string = 'unknown',
): Promise<{ ok: true }> {
  await ensureTable();
  const pool = await getPool();
  await pool.query(
    `UPDATE anonymous_data
     SET visibility = 'private', gallery_title = NULL, gallery_description = NULL, published_at = NULL
     WHERE user_id = $1 AND data_key = $2`,
    [userId, dataKey],
  );
  await logAudit(userId, 'unpublish', dataKey, 0, ip);
  return { ok: true };
}

export async function listPublicIndicators(
  limit: number = 50,
  offset: number = 0,
  ip: string = 'unknown',
  dataKeyPrefix?: string,
): Promise<PublicIndicatorListItem[]> {
  await ensureTable();
  const pool = await getPool();
  // If a dataKeyPrefix is supplied, filter to rows whose data_key starts with
  // it (used by /api/workbench/backtests to scope to published backtests only
  // — each backtest gets its own dataKey like 'workbench_backtest_<ts>_<r>').
  const where = dataKeyPrefix
    ? `WHERE visibility = 'public' AND data_key LIKE $3`
    : `WHERE visibility = 'public'`;
  const params: any[] = dataKeyPrefix
    ? [limit, offset, `${dataKeyPrefix}%`]
    : [limit, offset];
  const result = await pool.query(
    `SELECT id, user_id, data_key, gallery_title, gallery_description, data_value,
            view_count, fork_count, published_at
     FROM anonymous_data
     ${where}
     ORDER BY published_at DESC
     LIMIT $1 OFFSET $2`,
    params,
  );
  await logAudit('anonymous', 'list_public', dataKeyPrefix ?? null, result.rows.length, ip);
  return result.rows.map((row: any) => ({
    id: row.id as number,
    authorUuidPrefix: String(row.user_id).slice(0, 8),
    dataKey: row.data_key as string,
    title: (row.gallery_title as string) || (row.data_key as string),
    description: (row.gallery_description as string) || '',
    excerpt: String(row.data_value).slice(0, 200),
    viewCount: row.view_count as number,
    forkCount: row.fork_count as number,
    publishedAt: row.published_at as string,
  }));
}

// Fetch a single public row by id (used by /api/workbench/backtest/[id] for
// the detail view). Increments view_count atomically. Returns null if the
// row doesn't exist or isn't public — the caller should respond 404.
export async function getPublicRowById(
  id: number,
  ip: string = 'unknown',
): Promise<{
  id: number;
  authorUuidPrefix: string;
  userId: string;
  dataKey: string;
  title: string;
  description: string;
  dataValue: string;
  viewCount: number;
  forkCount: number;
  publishedAt: string;
} | null> {
  await ensureTable();
  const pool = await getPool();
  const result = await pool.query(
    `UPDATE anonymous_data
     SET view_count = view_count + 1
     WHERE id = $1 AND visibility = 'public'
     RETURNING id, user_id, data_key, gallery_title, gallery_description,
               data_value, view_count, fork_count, published_at`,
    [id],
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  await logAudit('anonymous', 'read_public', row.data_key as string, (row.data_value as string).length, ip);
  return {
    id: row.id as number,
    authorUuidPrefix: String(row.user_id).slice(0, 8),
    userId: row.user_id as string,
    dataKey: row.data_key as string,
    title: (row.gallery_title as string) || (row.data_key as string),
    description: (row.gallery_description as string) || '',
    dataValue: row.data_value as string,
    viewCount: row.view_count as number,
    forkCount: row.fork_count as number,
    publishedAt: row.published_at as string,
  };
}

export async function forkIndicator(
  forkerUserId: string,
  sourceId: number,
  forkerDataKey: string,
  ip: string = 'unknown',
): Promise<{ ok: true; forkedDataKey: string; forkedAt: string; sourceTitle: string; sourceOwnerUserId: string; sourceDataKey: string }> {
  await ensureTable();
  const pool = await getPool();

  // 1. Fetch the source indicator by its numeric primary key (must be public).
  //    This is the canonical way to address a specific row without needing
  //    the full UUID (the gallery list endpoint only returns the 8-char
  //    prefix for privacy).
  const sourceResult = await pool.query(
    `SELECT user_id, data_key, data_value, gallery_title, visibility
     FROM anonymous_data
     WHERE id = $1`,
    [sourceId],
  );
  if (sourceResult.rows.length === 0) {
    throw new Error('Source indicator not found.');
  }
  const source = sourceResult.rows[0];
  if (source.visibility !== 'public') {
    throw new Error('Source indicator is not public and cannot be forked.');
  }
  const sourceOwnerUserId = source.user_id as string;
  const sourceDataKey = source.data_key as string;

  // 2. Insert a new row for the forker with the same dataValue.
  // ON CONFLICT (user_id, data_key) DO UPDATE: if the forker already has
  // an indicator at this dataKey, we re-fork (update the value). The
  // updated_at timestamp refreshes so the forker sees it as the latest.
  const insertResult = await pool.query(
    `INSERT INTO anonymous_data (user_id, data_key, data_value, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, data_key)
     DO UPDATE SET data_value = $3, updated_at = NOW()
     RETURNING updated_at`,
    [forkerUserId, forkerDataKey, source.data_value as string],
  );
  const forkedAt = insertResult.rows[0].updated_at as string;

  // 3. Increment the source's fork_count. The source's own updated_at
  // is NOT bumped (so its public ordering doesn't shift on every fork),
  // but fork_count is updated via a dedicated UPDATE.
  await pool.query(
    `UPDATE anonymous_data
     SET fork_count = fork_count + 1
     WHERE user_id = $1 AND data_key = $2`,
    [sourceOwnerUserId, sourceDataKey],
  );

  await logAudit(forkerUserId, 'fork', forkerDataKey, (source.data_value as string).length, ip);

  return {
    ok: true,
    forkedDataKey: forkerDataKey,
    forkedAt,
    sourceTitle: (source.gallery_title as string) || sourceDataKey,
    sourceOwnerUserId,
    sourceDataKey,
  };
}