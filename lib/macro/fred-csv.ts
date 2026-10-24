// Keyless FRED access via fredgraph.csv (the endpoint api/index.ts already uses).
import { parseFredCsv, type FredPoint } from '../../shared/fred-math.js';
export * from '../../shared/fred-math.js';

/** Fetch a FRED series as CSV starting at `startISO` (cosd). No API key needed. */
export async function fetchFredCsv(seriesId: string, startISO: string, timeoutMs = 8000): Promise<FredPoint[]> {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}&cosd=${startISO}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BitcoinHub/1.0)' } });
  if (!r.ok) throw new Error(`FRED ${seriesId} HTTP ${r.status}`);
  return parseFredCsv(await r.text());
}
