// BitcoinHub — safe-api.ts
// Runtime shape validator for our JSON APIs. The three crashes this
// session (MacroIndicators, LiquidityWidget, OptionsFlowWidget) all had
// the same root cause: a TypeScript interface that promised a shape the
// API never actually returned, and a component that threw on first
// render — taking the whole page down with it.
//
// `safeFetch()` wraps fetch() with shape validation:
//   - On happy path: returns data unchanged, zero overhead.
//   - On shape mismatch: logs a console.warn AND returns the data anyway
//     so the page still renders (guarded by optional chaining in the
//     component). The warning is the signal for us to update the schema.
//
// Usage:
//   import { safeFetch, LiquiditySchema } from '@/lib/safe-api';
//   const data = await safeFetch('/api/liquidity', LiquiditySchema);

export type FieldType = 'number' | 'string' | 'boolean' | 'object' | 'array';

export interface FieldSpec {
  /** Dot-notation path. Use "[i]" for array indexing. e.g. "terms[0].latest.bid_to_cover_ratio" */
  path: string;
  /** Expected JS type. "array" = Array.isArray, "object" = plain object. */
  type: FieldType;
  /** Required = log a warning if missing/undefined. Optional = silent skip. */
  required: boolean;
}

export interface Schema {
  /** Human name used in warning messages. */
  name: string;
  fields: FieldSpec[];
}

/** Walk a dot-notation path through a JSON object. Returns undefined at the first missing key. */
export function getPath(obj: any, path: string): any {
  if (obj === null || obj === undefined) return undefined;
  // Tokenize: "terms[0].latest.bid_to_cover_ratio" → ["terms", "0", "latest", "bid_to_cover_ratio"]
  const tokens: (string | number)[] = [];
  for (const seg of path.split('.')) {
    const m = seg.match(/^([^\[]+)(?:\[(\d+)\])?$/);
    if (!m) {
      tokens.push(seg);
      continue;
    }
    if (m[1]) tokens.push(m[1]);
    if (m[2] !== undefined) tokens.push(Number(m[2]));
  }
  let cur: any = obj;
  for (const t of tokens) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[t];
  }
  return cur;
}

/** Type-coerce a value if reasonable (string "123" → 123). Otherwise return as-is. */
function asExpected(value: any, type: FieldType): boolean {
  if (value === null || value === undefined) return false;
  switch (type) {
    case 'number': return typeof value === 'number' && Number.isFinite(value);
    case 'string': return typeof value === 'string';
    case 'boolean': return typeof value === 'boolean';
    case 'array': return Array.isArray(value);
    case 'object': return typeof value === 'object' && !Array.isArray(value);
  }
}

/**
 * Validate `data` against `schema`. Logs warnings to console but does NOT throw.
 * Returns the data unchanged either way — the caller is expected to guard
 * individual field accesses with optional chaining.
 */
export function validateShape(
  data: any,
  schema: Schema,
  source: string,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const field of schema.fields) {
    const value = getPath(data, field.path);
    if (value === undefined || value === null) {
      if (field.required) {
        errors.push(`missing required: ${field.path}`);
      }
    } else if (!asExpected(value, field.type)) {
      errors.push(`wrong type: ${field.path} (expected ${field.type})`);
    }
  }
  if (errors.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[safe-api] Shape mismatch in ${source} (schema: ${schema.name}):\n  ${errors.join('\n  ')}`,
    );
  }
  return { ok: errors.length === 0, errors };
}

// ─── Schemas for the three endpoints that already bit us ─────────────────────

export const LiquiditySchema: Schema = {
  name: 'LiquidityData',
  fields: [
    { path: 'summary', type: 'object', required: true },
    { path: 'summary.overallSignal', type: 'string', required: true },
    { path: 'summary.stackSatsAlert', type: 'boolean', required: false },
    { path: 'summary.lastUpdated', type: 'string', required: false },
    // /api/liquidity returns `indicators` as a DICT (not the array the old
    // TS interface claimed). Validate the actual shape.
    { path: 'indicators', type: 'object', required: false },
    { path: 'indicators.m2', type: 'object', required: false },
    { path: 'indicators.m2.value', type: 'number', required: false },
    { path: 'indicators.m2.change', type: 'number', required: false },
    { path: 'indicators.rrp', type: 'object', required: false },
    { path: 'indicators.tga', type: 'object', required: false },
    { path: 'indicators.fedBalance', type: 'object', required: false },
    // derivedMetrics is also a dict of primitives — not the DerivedMetric[]
    // the old interface claimed. Don't require it (may be empty).
    { path: 'derivedMetrics', type: 'object', required: false },
    { path: 'lastUpdated', type: 'string', required: false },
  ],
};

export const OptionsFlowSchema: Schema = {
  name: 'OptionsFlowResponse',
  fields: [
    // /api/options-flow returns {btc, eth, topStrikes, lastUpdated, source}
    // — NOT the flat top-level fields the old interface claimed.
    { path: 'btc', type: 'object', required: true },
    { path: 'btc.putCallRatio', type: 'number', required: false },
    { path: 'btc.totalOI', type: 'number', required: false },
    { path: 'btc.totalVolume', type: 'number', required: false },
    { path: 'btc.netDelta', type: 'number', required: false },
    { path: 'btc.sentiment', type: 'string', required: false },
    { path: 'eth', type: 'object', required: false },
    { path: 'eth.putCallRatio', type: 'number', required: false },
    { path: 'topStrikes', type: 'array', required: true },
    { path: 'topStrikes[0].strike', type: 'number', required: false },
    { path: 'topStrikes[0].type', type: 'string', required: false },
    { path: 'topStrikes[0].iv', type: 'number', required: false },
    { path: 'lastUpdated', type: 'string', required: false },
    { path: 'source', type: 'string', required: false },
  ],
};

export const TreasuryAuctionsSchema: Schema = {
  name: 'AuctionsSnapshot',
  fields: [
    { path: 'fetchedAt', type: 'string', required: true },
    { path: 'terms', type: 'array', required: true },
    { path: 'terms[0].term', type: 'string', required: true },
    { path: 'terms[0].latest', type: 'object', required: true },
    { path: 'terms[0].latest.bid_to_cover_ratio', type: 'number', required: false },
    { path: 'terms[0].latest.high_yield', type: 'number', required: false },
    { path: 'terms[0].latest.indirect_bidder_accepted', type: 'number', required: false },
    { path: 'terms[0].baseline', type: 'object', required: true },
    { path: 'terms[0].baseline.mean', type: 'number', required: false },
    { path: 'terms[0].stressScore', type: 'number', required: true },
    { path: 'combinedStressScore', type: 'number', required: true },
  ],
};

// ─── Browser-side wrapper ───────────────────────────────────────────────────

/**
 * fetch() + JSON + shape validation. Returns the data either way.
 * On shape mismatch, logs a console.warn. Never throws on shape.
 */
export async function safeFetch<T = any>(
  url: string,
  schema: Schema,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Fetch ${url} failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  validateShape(data, schema, url);
  return data as T;
}

// ─── Server-side wrapper ────────────────────────────────────────────────────

/**
 * Wrap any API handler so the response is shape-validated before
 * being sent. On mismatch, logs a warning server-side AND still returns
 * the data — the client will see the same warning and render gracefully.
 */
export function withShapeValidation<T>(
  schema: Schema,
  handler: () => Promise<T>,
  source: string,
): Promise<T> {
  return handler().then(data => {
    validateShape(data, schema, source);
    return data;
  });
}
