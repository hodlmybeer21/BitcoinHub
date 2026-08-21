// BitcoinHub — /api/btc/monthly
// Monthly BTC close + return series for the heatmap tile on /analytics.
// Uses the same Yahoo daily series as /api/cycle/markers (5-min server cache
// inherited via fetchBTCDailyHistory).

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchBTCDailyHistory } from '../cycle/btc-history.js';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min — daily data, monthly buckets
let cache: { at: number; data: unknown } | null = null;

interface MonthlyRow {
  year: number;
  month: number;            // 1-12
  startDate: string;         // YYYY-MM-DD (first daily close in the month)
  endDate: string;           // YYYY-MM-DD (last daily close in the month)
  startPrice: number;
  endPrice: number;
  returnPct: number;         // month-over-month % change from first close to last close
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

    const hist = await fetchBTCDailyHistory();
    if (hist.length === 0) {
      return json(res, 500, { error: 'BTC daily history is empty' }, 'MISS');
    }

    // Group by year-month (YYYY-MM)
    const buckets = new Map<string, { start?: typeof hist[number]; end?: typeof hist[number]; count: number }>();
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
    // Sort ascending by date (oldest first)
    monthly.sort((a, b) => a.year - b.year || a.month - b.month);

    // Include a YTD snapshot for fast headline: sum of current-year monthly returns
    // is a rough approximation of running YTD (it excludes intra-month moves at the
    // start/end days), but a clean single-number for the UI.
    const lastRow = monthly[monthly.length - 1];
    if (lastRow) {
      const ytdMonths = monthly.filter((r) => r.year === lastRow.year && r.month <= lastRow.month);
      const ytdStart = ytdMonths[0].startPrice;
      const ytdEnd = lastRow.endPrice;
      const ytdPct = ytdStart > 0 ? ((ytdEnd - ytdStart) / ytdStart) * 100 : 0;
      const data = {
        asOf: lastRow.endDate,
        source: 'yahoo',
        count: monthly.length,
        firstYear: monthly[0]?.year,
        lastYear: lastRow.year,
        ytd: { from: ytdMonths[0].startDate, to: lastRow.endDate, returnPct: ytdPct },
        monthly,
      };
      cache = { at: Date.now(), data };
      return json(res, 200, data, 'MISS');
    }

    return json(res, 500, { error: 'no months produced' }, 'MISS');
  } catch (e: any) {
    return json(res, 500, { error: e?.message ?? 'unknown error' }, 'MISS');
  }
}
