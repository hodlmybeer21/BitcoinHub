// BitcoinHub FRED — quote.ts
// Fetcher for the St. Louis Fed FRED API. Returns observation arrays
// (date + value) for a given series_id. Gracefully degrades if the
// API key is missing (returns empty array + clear error).
//
// FRED docs: https://fred.stlouisfed.org/docs/api/api_key.html
//
// Architecture invariants respected:
//   - Lazy-import axios inside the fetcher (cold-start cost)
//   - 1h in-memory cache keyed by `${series_id}:${start}:${end}`
//   - Pure TS, no math libs

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface CacheEntry {
  ts: number;
  observations: FredObservation[];
}

export interface FredObservation {
  date: string;           // 'YYYY-MM-DD'
  value: number | null;   // null when FRED returns "." (missing)
}

const fredCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch observations for a FRED series.
 *
 * @param seriesId FRED series ID (e.g. 'WALCL', 'UNRATE')
 * @param opts.start ISO date string — defaults to '1900-01-01' (full history)
 * @param opts.end   ISO date string — defaults to today
 */
export async function fetchFredObservations(
  seriesId: string,
  opts: { start?: string; end?: string } = {},
): Promise<{ observations: FredObservation[]; meta: { seriesId: string; start: string; end: string; fetchedAt: string } }> {
  const upper = seriesId.toUpperCase().replace(/[^A-Z0-9_]/g, '');
  if (!upper || upper.length > 32) throw new Error(`Invalid FRED series_id: ${seriesId}`);

  const start = opts.start ?? '1900-01-01';
  const end = opts.end ?? new Date().toISOString().slice(0, 10);

  const cacheKey = `${upper}:${start}:${end}`;
  const hit = fredCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return {
      observations: hit.observations,
      meta: { seriesId: upper, start, end, fetchedAt: new Date(hit.ts).toISOString() },
    };
  }

  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    throw new Error('FRED_API_KEY not set — Tyler, please add it via Vercel dashboard (Project Settings → Environment Variables).');
  }

  // Lazy-import axios
  const { default: axios } = await import('axios');

  const url = 'https://api.stlouisfed.org/fred/series/observations';
  const params = {
    series_id: upper,
    api_key: apiKey,
    file_type: 'json',
    observation_start: start,
    observation_end: end,
    sort_order: 'asc',
  };

  const res = await axios.get(url, {
    params,
    timeout: 25000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BitcoinHub/1.0)' },
  });

  const raw: Array<{ date: string; value: string }> = res.data?.observations ?? [];
  const observations: FredObservation[] = raw.map(o => ({
    date: o.date,
    value: o.value === '.' || o.value === '' ? null : Number(o.value),
  })).filter(o => Number.isFinite(o.value ?? NaN) || o.value === null);

  // Skip entries where value is null and date is valid (kept as null for UI awareness)
  const cleaned = observations.filter(o => /^\d{4}-\d{2}-\d{2}$/.test(o.date));

  fredCache.set(cacheKey, { ts: Date.now(), observations: cleaned });

  return {
    observations: cleaned,
    meta: { seriesId: upper, start, end, fetchedAt: new Date().toISOString() },
  };
}

/**
 * Helper: compute a YoY (year-over-year) change series from a level series.
 * Returns array of { date, value } where value = (current - year-ago) / year-ago.
 * Useful for turning CPIAUCSL (level) into CPI YoY % change.
 */
export function yoySeries(
  obs: FredObservation[],
): { date: string; value: number }[] {
  const out: { date: string; value: number }[] = [];
  for (let i = 0; i < obs.length; i++) {
    const v = obs[i].value;
    if (v === null) continue;
    // Find the observation ~1 year (365 days) earlier
    const target = obs[i].date;
    const targetTime = new Date(target).getTime();
    const wantedTime = targetTime - 365 * 86400 * 1000;
    let prev: number | null = null;
    for (let j = i - 1; j >= 0; j--) {
      const jt = new Date(obs[j].date).getTime();
      if (jt <= wantedTime + 86400 * 1000) {
        prev = obs[j].value;
        break;
      }
    }
    if (prev === null || prev === 0) continue;
    out.push({ date: target, value: ((v - prev) / prev) * 100 });
  }
  return out;
}

/**
 * Helper: downsample to N points evenly across the series.
 * Used by the API handler to keep response payloads small.
 */
export function downsampleObservations(
  obs: FredObservation[],
  maxPoints: number = 365,
): FredObservation[] {
  const n = obs.length;
  if (n <= maxPoints) return obs;
  const step = Math.max(1, Math.floor(n / maxPoints));
  const out: FredObservation[] = [];
  for (let i = 0; i < n; i += step) out.push(obs[i]);
  // Always include last point
  if (out[out.length - 1] !== obs[n - 1]) out.push(obs[n - 1]);
  return out;
}
