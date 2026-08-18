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