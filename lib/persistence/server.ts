// BitcoinHub persistence server helper (anonymous-UUID MVP)
// Self-healing CREATE TABLE IF NOT EXISTS — no migration step required on
// Vercel deploy. Lazy-imports neon + ws inside the handler to avoid pulling
// them into the cold-start bundle until the first persistence call.

let poolPromise: Promise<any> | null = null;
let tableEnsured: Promise<void> | null = null;

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

export async function upsertAnonData(userId: string, dataKey: string, dataValue: string): Promise<void> {
  await ensureTable();
  const pool = await getPool();
  await pool.query(
    `INSERT INTO anonymous_data (user_id, data_key, data_value, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, data_key)
     DO UPDATE SET data_value = $3, updated_at = NOW()`,
    [userId, dataKey, dataValue],
  );
}

export async function getAnonData(
  userId: string,
  dataKey?: string,
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
  const data: Record<string, string> = {};
  for (const row of result.rows) {
    data[row.data_key as string] = row.data_value as string;
  }
  return { userId, data };
}

export function isPersistenceConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}