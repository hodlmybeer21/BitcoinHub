// BitcoinHub — /api/btc/monthly
// Monthly BTC close + return series for the heatmap tile on /analytics.
//
// Data merge so the heatmap can reach back to Jan 2014:
//   - Bitstamp public OHLC (free, no key, timestamps in seconds) covers
//     Jan 1, 2014 → Sep 15, 2014.
//   - Yahoo BTC daily (via fetchBTCDailyHistory) covers Sep 17, 2014 → today.
// Both feeds are stitched by date (newer wins on conflict) and deduped before
// month bucketing. Bitstamp failure is graceful — endpoint falls back to
// Yahoo-only with a console.error log.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchBTCDailyHistory } from '../cycle/btc-history.js';
import type { DailyClose } from '../cycle/btc-history.js';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min
let cache: { at: number; data: unknown } | null = null;

interface MonthlyRow {
  year: number;
  month: number;          // 1-12
  startDate: string;       // YYYY-MM-DD (first daily close in the month)
  endDate: string;         // YYYY-MM-DD (last daily close in the month)
  startPrice: number;
  endPrice: number;
  returnPct: number;
}

/**
 * Fetch early-2014 BTCUSD daily closes from Bitstamp's free public OHLC.
 * Bitstamp timestamps are in SECONDS (not ms). No auth, no rate-limit
 * issues at 10-min cache cadence. Buffered ±10d on both ends so any paging
 * quirks don't clip the window.
 */
async function fetchBitstampEarlyDaily(
  startISO: string,
  endISO: string,
): Promise<DailyClose[]> {
  const bufferDays = 10;
  const startBuffer = (new Date(startISO + 'T00:00:00Z').getTime() / 1000) - bufferDays * 86400;
  const endBuffer = (new Date(endISO + 'T00:00:00Z').getTime() / 1000) + bufferDays * 86400;
  const url =
    `https://www.bitstamp.net/api/v2/ohlc/btcusd/?step=86400` +
    `&start=${Math.floor(startBuffer)}&end=${Math.floor(endBuffer)}&limit=1000`;
  const r = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!r.ok) throw new Error(`Bitstamp upstream returned ${r.status}`);
  const payload = (await r.json()) as {
    data?: { ohlc?: Array<{ timestamp?: string; close?: string }> };
  };
  const ohlc = payload?.data?.ohlc ?? [];
  const out: DailyClose[] = [];
  for (const bar of ohlc) {
    const ts = Number(bar.timestamp);
    if (!Number.isFinite(ts) || ts <= 0) continue;
    const date = new Date(ts * 1000).toISOString().slice(0, 10);
    if (date < startISO || date > endISO) continue;
    const px = Number(bar.close);
    if (Number.isFinite(px) && px > 0) out.push({ date, price: px });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  const seen = new Set<string>();
  return out.filter((p) => (seen.has(p.date) ? false : (seen.add(p.date), true)));
}

/** Merge daily series by date. Later series wins on conflict. */
function mergeDaily(...series: DailyClose[][]): DailyClose[] {
  const seen = new Map<string, DailyClose>();
  for (const s of series) for (const p of s) seen.set(p.date, p);
  return Array.from(seen.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function json(res: VercelResponse, status: number, body: unknown, cacheHeader = 'HIT') {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Cache', cacheHeader);
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
  return res.status(status).json(body);
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return json(res, 200, cache.data, 'HIT');
    }

    const [yahooDaily, bitstampEarly] = await Promise.all([
      fetchBTCDailyHistory(),
      fetchBitstampEarlyDaily('2014-01-01', '2014-09-16').catch((e) => {
        console.error('[btc/monthly] Bitstamp fetch failed, falling back to Yahoo-only:', e?.message ?? e);
        return [] as DailyClose[];
      }),
    ]);

    const hist = mergeDaily(bitstampEarly, yahooDaily);
    if (hist.length === 0) return json(res, 500, { error: 'BTC daily history is empty' }, 'MISS');

    // Group by year-month
    const buckets = new Map<string, { start?: DailyClose; end?: DailyClose; count: number }>();
    for (const p of hist) {
      const ym = p.date.slice(0, 7);
      let b = buckets.get(ym);
      if (!b) { b = { count: 0 }; buckets.set(ym, b); }
      if (b.start === undefined) b.start = p;
      b.end = p;
      b.count += 1;
    }

    const monthly: MonthlyRow[] = [];
    for (const [ym, b] of buckets) {
      if (!b.start || !b.end || b.count < 2) continue;
      const [y, m] = ym.split('-').map(Number);
      const ret = ((b.end.price - b.start.price) / b.start.price) * 100;
      monthly.push({
        year: y,
        month: m,
        startDate: b.start.date,
        endDate: b.end.date,
        startPrice: b.start.price,
        endPrice: b.end.price,
        returnPct: ret,
      });
    }
    monthly.sort((a, b) => a.year - b.year || a.month - b.month);

    const lastRow = monthly[monthly.length - 1];
    if (!lastRow) return json(res, 500, { error: 'no months produced' }, 'MISS');

    const ytdMonths = monthly.filter((r) => r.year === lastRow.year && r.month <= lastRow.month);
    const ytdStart = ytdMonths[0].startPrice;
    const ytdEnd = lastRow.endPrice;
    const ytdPct = ytdStart > 0 ? ((ytdEnd - ytdStart) / ytdStart) * 100 : 0;
    const data = {
      asOf: lastRow.endDate,
      source: 'yahoo+bitstamp',
      bitstampBackfill: {
        from: bitstampEarly[0]?.date ?? null,
        to: bitstampEarly[bitstampEarly.length - 1]?.date ?? null,
        bars: bitstampEarly.length,
      },
      count: monthly.length,
      firstYear: monthly[0]?.year,
      firstMonth:
        monthly[0]
          ? `${monthly[0].year}-${String(monthly[0].month).padStart(2, '0')}`
          : null,
      lastYear: lastRow.year,
      ytd: { from: ytdMonths[0].startDate, to: lastRow.endDate, returnPct: ytdPct },
      monthly,
    };

    cache = { at: Date.now(), data };
    return json(res, 200, data, 'MISS');
  } catch (e: any) {
    return json(res, 500, { error: e?.message ?? 'unknown error' }, 'MISS');
  }
}
