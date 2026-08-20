// BitcoinHub — BTC Daily Price History (server-side)
// Fetches a long BTC-USD daily close series from Yahoo Finance and caches
// results across warm Vercel invocations. Used by /api/cycle/markers and
// /api/cycle/overlay.
//
// Source priority:
//   1. Yahoo Finance v8 chart API (no key, 2014-09-17 onwards reliably).
//   2. (No fallback needed — Yahoo has reliably served since 2014.)
//
// Lazy-imports axios inside the function body (per architecture invariant #3)
// so it doesn't pull into the api/index.ts cold-start bundle.

import type { VercelResponse } from '@vercel/node';

export interface DailyClose {
  date: string;   // YYYY-MM-DD
  price: number;  // USD close
}

interface CacheEntry {
  fetchedAt: number;
  series: DailyClose[];
}

const CACHE: CacheEntry = { fetchedAt: 0, series: [] };
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Earliest Yahoo BTC-USD data point is 2014-09-17. We anchor from that date
// so the long-history call only does one round trip.
const YAHOO_EARLIEST_MS = Date.UTC(2014, 8, 17); // Sep 17, 2014 UTC

export async function fetchBTCDailyHistory(): Promise<DailyClose[]> {
  const now = Date.now();
  if (CACHE.series.length > 0 && now - CACHE.fetchedAt < CACHE_TTL_MS) {
    return CACHE.series;
  }

  // Lazy import per architecture invariant #3
  const { default: axios } = await import('axios');

  const period1 = Math.floor(YAHOO_EARLIEST_MS / 1000);
  const period2 = Math.floor(now / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?period1=${period1}&period2=${period2}&interval=1d&events=history`;

  const res = await axios.get(url, {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BitcoinHub/1.0)' },
  });

  const result = res.data?.chart?.result?.[0];
  const timestamps: number[] = result?.timestamp ?? [];
  const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];
  if (!timestamps.length || !closes.length) {
    throw new Error('Yahoo returned empty BTC history');
  }

  const series: DailyClose[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    if (c === null || c === undefined || Number.isNaN(c)) continue;
    const ts = timestamps[i] * 1000;
    const isoDay = new Date(ts).toISOString().split('T')[0];
    series.push({ date: isoDay, price: c });
  }

  // Sort ascending by date (Yahoo should already be, but be defensive)
  series.sort((a, b) => a.date.localeCompare(b.date));

  CACHE.fetchedAt = now;
  CACHE.series = series;
  return series;
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