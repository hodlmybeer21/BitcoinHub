// BitcoinHub — BTC + Bitcoin-correlated Asset Daily Price History (server-side)
// Fetches daily close series from Yahoo Finance for BTC, IBIT, COIN, MSTR,
// FBTC, MARA, RIOT — used by /api/cycle/markers, /api/cycle/overlay, and
// /api/cycle/asset-overlay.
//
// Source: Yahoo Finance v8 chart API (no key, daily granularity, reliable
// for all assets above since their respective IPOs).
//
// Lazy-imports axios inside each fetcher function (per architecture
// invariant #3) so it doesn't pull into the api/index.ts cold-start bundle.

import type { VercelResponse } from '@vercel/node';

export interface DailyClose {
  date: string;   // YYYY-MM-DD
  price: number;  // USD close
}

export interface AssetMeta {
  symbol: string;
  yahoo: string;
  label: string;
  firstAvailable: string;  // YYYY-MM-DD
}

// Asset registry — covers BTC + the BTC-correlated equities/ETFs from the
// MPT universe (lib/mpt/cycles.ts). firstAvailable dates are Yahoo's
// earliest reliable daily close.
export const ASSET_REGISTRY: Record<string, AssetMeta> = {
  BTC:  { symbol: 'BTC',  yahoo: 'BTC-USD', label: 'Bitcoin',                  firstAvailable: '2014-09-17' },
  IBIT: { symbol: 'IBIT', yahoo: 'IBIT',    label: 'iShares Bitcoin Trust',    firstAvailable: '2024-01-11' },
  FBTC: { symbol: 'FBTC', yahoo: 'FBTC',    label: 'Fidelity Wise Origin BTC', firstAvailable: '2024-01-11' },
  MSTR: { symbol: 'MSTR', yahoo: 'MSTR',    label: 'MicroStrategy',            firstAvailable: '2014-06-26' },
  COIN: { symbol: 'COIN', yahoo: 'COIN',    label: 'Coinbase',                 firstAvailable: '2021-04-14' },
  MARA: { symbol: 'MARA', yahoo: 'MARA',    label: 'Marathon Digital',         firstAvailable: '2014-07-02' },
  RIOT: { symbol: 'RIOT', yahoo: 'RIOT',    label: 'Riot Platforms',           firstAvailable: '2014-07-02' },
};

export function getAssetMeta(symbol: string): AssetMeta | null {
  return ASSET_REGISTRY[symbol.toUpperCase()] ?? null;
}

interface CacheEntry {
  fetchedAt: number;
  series: DailyClose[];
}

const ASSET_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Generic asset history fetcher — used for all BTC-correlated assets.
// Yahoo returns empty data for missing dates; we filter those out.
export async function fetchAssetDailyHistory(symbol: string): Promise<DailyClose[]> {
  const meta = getAssetMeta(symbol);
  if (!meta) throw new Error(`Unknown asset symbol: ${symbol}`);

  const cached = ASSET_CACHE.get(meta.symbol);
  const now = Date.now();
  if (cached && cached.series.length > 0 && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.series;
  }

  // Lazy import per architecture invariant #3
  const { default: axios } = await import('axios');

  const period1 = Math.floor(Date.parse(meta.firstAvailable + 'T00:00:00Z') / 1000);
  const period2 = Math.floor(now / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(meta.yahoo)}?period1=${period1}&period2=${period2}&interval=1d&events=history`;

  const res = await axios.get(url, {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BitcoinHub/1.0)' },
  });

  const result = res.data?.chart?.result?.[0];
  const timestamps: number[] = result?.timestamp ?? [];
  const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];
  if (!timestamps.length || !closes.length) {
    throw new Error(`Yahoo returned empty ${meta.symbol} history`);
  }

  const series: DailyClose[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    if (c === null || c === undefined || Number.isNaN(c)) continue;
    const ts = timestamps[i] * 1000;
    const isoDay = new Date(ts).toISOString().split('T')[0];
    series.push({ date: isoDay, price: c });
  }
  series.sort((a, b) => a.date.localeCompare(b.date));

  ASSET_CACHE.set(meta.symbol, { fetchedAt: now, series });
  return series;
}

// Backward-compat wrapper for the BTC-only callers (markers, existing
// overlay math still references this name).
export async function fetchBTCDailyHistory(): Promise<DailyClose[]> {
  return fetchAssetDailyHistory('BTC');
}

// ── Helpers used by overlay + markers handlers ────────────────────────────

export function priceOnOrBefore(series: DailyClose[], isoDay: string): number | null {
  // Walk from the end (most days are recent) — small linear scan is fine
  // for the typical query patterns (we only need the last few days or so).
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].date <= isoDay) return series[i].price;
  }
  return null;
}

export function sliceSeries(series: DailyClose[], fromISO: string, toISO: string): DailyClose[] {
  const out: DailyClose[] = [];
  for (const p of series) {
    if (p.date < fromISO) continue;
    if (p.date > toISO) break;
    out.push(p);
  }
  return out;
}

// Detect "ATH break" events: any daily close that exceeds the running
// max-prior-to-this-point. Returns the date of the *first* close above the
// previous cycle's top (so the green line marks the moment each prior peak
// was eclipsed).
export function findATHBreaks(series: DailyClose[]): Array<{ date: string; price: number; priorTop: number }> {
  const breaks: Array<{ date: string; price: number; priorTop: number }> = [];
  let runningMax = -Infinity;
  for (const p of series) {
    if (p.price > runningMax) {
      // First close to exceed the prior running max = a new ATH
      if (Number.isFinite(runningMax) && runningMax > 0 && p.price > runningMax * 1.0001) {
        breaks.push({ date: p.date, price: p.price, priorTop: runningMax });
      }
      runningMax = p.price;
    }
  }
  return breaks;
}

// Vercel response helper for cycle handlers.
export function okJson(res: VercelResponse, data: unknown, maxAgeSec = 3600) {
  res.setHeader('Cache-Control', `s-maxage=${maxAgeSec}, stale-while-revalidate=${maxAgeSec * 2}`);
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(data);
}

export function errJson(res: VercelResponse, status: number, message: string) {
  res.status(status).json({ error: message });
}