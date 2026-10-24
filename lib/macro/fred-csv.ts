// FRED observations for the date-aware macro figures (M2 YoY, inflation, 10Y, breakeven).
//
// Production note: from Vercel (iad1), fredgraph.csv requests with `cosd=` and a browser-like
// User-Agent timed out (8s) on every call, while the plain `fredgraph.csv?id=X` request that
// api/index.ts's fredCsv() uses kept working. So:
//   1. use the official FRED API when FRED_API_KEY is set (read per call, never logged), then
//   2. fall back to the exact plain fredgraph request and filter by date locally.
import { parseFredCsv, type FredPoint } from '../../shared/fred-math.js';
export * from '../../shared/fred-math.js';

export type FredFetchSource = 'fred-api' | 'fredgraph';
export interface FredFetchResult { points: FredPoint[]; source: FredFetchSource }

function reasonOf(e: any): string {
  if (e?.name === 'TimeoutError' || e?.name === 'AbortError') return 'timeout';
  return String(e?.message ?? e).replace(/api_key=[^&\s]+/gi, 'api_key=***').slice(0, 120);
}

/** Parse the FRED API's JSON observations (value "." = missing). */
export function parseFredApiJson(json: any): FredPoint[] {
  const obs: Array<{ date: string; value: string }> = json?.observations ?? [];
  return obs
    .filter(o => /^\d{4}-\d{2}-\d{2}$/.test(o.date) && o.value !== '.' && o.value !== '' && Number.isFinite(Number(o.value)))
    .map(o => ({ date: o.date, value: Number(o.value) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function viaApi(seriesId: string, startISO: string, key: string, timeoutMs: number): Promise<FredPoint[]> {
  const qs = new URLSearchParams({ series_id: seriesId, api_key: key, file_type: 'json', observation_start: startISO, sort_order: 'asc' });
  const r = await fetch(`https://api.stlouisfed.org/fred/series/observations?${qs}`, { signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) {
    // FRED returns e.g. 400 {"error_message":"Bad Request.  The value for variable api_key is not registered..."}
    let detail = '';
    try { detail = String((await r.json())?.error_message ?? '').slice(0, 100); } catch { /* ignore */ }
    throw new Error(`FRED API ${seriesId} HTTP ${r.status}${detail ? `: ${detail}` : ''}`);
  }
  const pts = parseFredApiJson(await r.json());
  if (!pts.length) throw new Error(`FRED API ${seriesId}: no observations`);
  return pts;
}

async function viaFredgraph(seriesId: string, startISO: string, timeoutMs: number): Promise<FredPoint[]> {
  // Same request shape as fredCsv() in api/index.ts (no cosd, default User-Agent), which works from Vercel.
  const r = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`, { signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) throw new Error(`fredgraph ${seriesId} HTTP ${r.status}`);
  const pts = parseFredCsv(await r.text()).filter(p => p.date >= startISO);
  if (!pts.length) throw new Error(`fredgraph ${seriesId}: no observations`);
  return pts;
}

/** FRED series from `startISO` onward, with which source answered. Throws a key-free reason if both fail. */
export async function fetchFredSeries(seriesId: string, startISO: string, timeoutMs = 8000): Promise<FredFetchResult> {
  const reasons: string[] = [];
  const key = process.env.FRED_API_KEY?.trim();
  if (key) {
    try { return { points: await viaApi(seriesId, startISO, key, timeoutMs), source: 'fred-api' }; }
    catch (e) { reasons.push(reasonOf(e)); }
  }
  try { return { points: await viaFredgraph(seriesId, startISO, timeoutMs), source: 'fredgraph' }; }
  catch (e) { reasons.push(reasonOf(e)); }
  throw new Error(reasons.join('; '));
}

/** Back-compat: points only. */
export async function fetchFredCsv(seriesId: string, startISO: string, timeoutMs = 8000): Promise<FredPoint[]> {
  return (await fetchFredSeries(seriesId, startISO, timeoutMs)).points;
}
