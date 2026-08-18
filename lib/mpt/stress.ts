// BitcoinHub MPT — /api/mpt/stress-test
// Self-contained Vercel serverless function. No shared imports except axios + types.
// Mirrors the lib/mpt/{cycles,compute,quote}.ts pattern.

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Holding { symbol: string; quantity: number; }

interface PricePoint { date: string; price: number; }

interface StressEvent {
  id: string;
  label: string;
  description: string;
  start: string;     // YYYY-MM-DD
  end: string;       // YYYY-MM-DD
}

interface AssetDrawdown {
  symbol: string;
  quantity: number;
  priceBefore: number;
  priceLow: number;
  priceAfter: number;
  drawdownPct: number;     // 0-1, positive number representing the loss
  valueLost: number;       // USD value lost if user held quantity * priceBefore - quantity * priceLow
}

interface StressResult {
  event: StressEvent;
  assets: AssetDrawdown[];
  portfolioValueBefore: number;
  portfolioValueLow: number;
  portfolioValueAfter: number;
  portfolioDrawdownPct: number;
  recoveryPct: number;     // how much of the loss was recovered by end date
}

// Historical crash windows for the BTC-correlated universe.
// BTC: always Yahoo 'BTC-USD'.
// IBIT/FBTC: spot ETFs (Jan 2024+), stub for older windows.
// MSTR/COIN/MARA/RIOT: equities, Yahoo symbols.
const STRESS_EVENTS: StressEvent[] = [
  {
    id: 'covid_crash_2020',
    label: 'COVID Crash',
    description: 'BTC -50% in 2 days as global markets panicked (Mar 2020).',
    start: '2020-02-15',
    end: '2020-04-15',
  },
  {
    id: 'luna_ust_2022',
    label: 'Terra/LUNA Collapse',
    description: 'BTC -35% as UST depegged and LUNA went to zero (May 2022).',
    start: '2022-05-05',
    end: '2022-06-30',
  },
  {
    id: 'ftx_2022',
    label: 'FTX Collapse',
    description: 'BTC -25% on FTX fraud revelations and contagion (Nov 2022).',
    start: '2022-11-05',
    end: '2022-12-31',
  },
  {
    id: 'china_ban_2021',
    label: 'China Mining Ban',
    description: 'BTC -50% as China banned mining (May-Jul 2021).',
    start: '2021-05-10',
    end: '2021-08-01',
  },
];

const SYMBOL_TO_YAHOO: Record<string, { yahoo: string; firstAvailable: string }> = {
  BTC:  { yahoo: 'BTC-USD', firstAvailable: '2014-09-17' },
  IBIT: { yahoo: 'IBIT',    firstAvailable: '2024-01-11' },
  FBTC: { yahoo: 'FBTC',    firstAvailable: '2024-01-11' },
  MSTR: { yahoo: 'MSTR',    firstAvailable: '2014-09-17' },
  COIN: { yahoo: 'COIN',    firstAvailable: '2021-04-14' },
  MARA: { yahoo: 'MARA',    firstAvailable: '2014-09-17' },
  RIOT: { yahoo: 'RIOT',    firstAvailable: '2014-09-17' },
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const priceCache = new Map<string, { ts: number; data: PricePoint[] }>();

async function fetchYahooDaily(yahooSymbol: string, start: string, end: string): Promise<PricePoint[]> {
  const key = `yahoo:${yahooSymbol}:${start}:${end}`;
  const hit = priceCache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.data;

  // Lazy-import axios to avoid pulling it into Vercel's cold-start bundle.
  const { default: axios } = await import('axios');
  const period1 = Math.floor(new Date(start).getTime() / 1000);
  const period2 = Math.floor(new Date(end).getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${period1}&period2=${period2}&interval=1d&events=history`;

  const res = await axios.get(url, {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BitcoinHub/1.0)' },
  });

  const result = res.data?.chart?.result?.[0];
  if (!result) throw new Error(`No Yahoo data for ${yahooSymbol}`);

  const timestamps: number[] = result.timestamp || [];
  const closes: (number | null)[] =
    (result.indicators?.adjclose?.[0]?.adjclose as (number | null)[] | undefined) ||
    (result.indicators?.quote?.[0]?.close as (number | null)[] | undefined) ||
    [];

  const data = timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      price: closes[i],
    }))
    .filter((p): p is PricePoint => p.price !== null && p.price !== undefined && !Number.isNaN(p.price));

  priceCache.set(key, { ts: Date.now(), data });
  return data;
}

function padWindow(start: string, end: string): { fetchStart: string; fetchEnd: string } {
  // Fetch a few days before + after to get a stable "before" baseline.
  const s = new Date(start);
  s.setUTCDate(s.getUTCDate() - 7);
  const e = new Date(end);
  e.setUTCDate(e.getUTCDate() + 7);
  return {
    fetchStart: s.toISOString().split('T')[0],
    fetchEnd: e.toISOString().split('T')[0],
  };
}

function computeDrawdown(series: PricePoint[], eventStart: string, eventEnd: string): { before: number; low: number; after: number } {
  if (series.length === 0) return { before: 0, low: 0, after: 0 };
  // "Before" = last close on or before eventStart
  const beforePoint = [...series].reverse().find(p => p.date <= eventStart) || series[0];
  // "Low" = minimum price during eventStart..eventEnd
  const inWindow = series.filter(p => p.date >= eventStart && p.date <= eventEnd);
  const lowPoint = inWindow.length > 0
    ? inWindow.reduce((min, p) => (p.price < min.price ? p : min), inWindow[0])
    : series[0];
  // "After" = last close in the series
  const afterPoint = series[series.length - 1];
  return { before: beforePoint.price, low: lowPoint.price, after: afterPoint.price };
}

function ok(res: VercelResponse, data: unknown) {
  res.setHeader('Cache-Control', 'no-store');
  res.json(data);
}

function err(res: VercelResponse, status: number, message: string) {
  res.status(status).json({ error: message });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return err(res, 405, 'POST required');

    const { holdings, cycleId } = req.body ?? {};
    if (!Array.isArray(holdings) || holdings.length === 0) {
      return err(res, 400, '`holdings` must be a non-empty array');
    }
    if (typeof cycleId !== 'string') {
      return err(res, 400, '`cycleId` is required');
    }

    const normalized: Holding[] = holdings
      .map((h: any) => ({
        symbol: String(h.symbol ?? '').toUpperCase().trim(),
        quantity: Number(h.quantity),
      }))
      .filter(h => h.symbol && Number.isFinite(h.quantity) && h.quantity > 0);

    if (normalized.length < 1) {
      return err(res, 400, 'No valid holdings after normalization');
    }

    // Filter stress events to those fully within the cycle OR with overlap
    // (just include all — users want to see how each crash would have hit them).
    const results: StressResult[] = [];

    for (const event of STRESS_EVENTS) {
      // Fetch prices for each unique symbol in the window (with padding)
      const { fetchStart, fetchEnd } = padWindow(event.start, event.end);
      const symbolsInWindow = normalized.filter(h => {
        const sym = SYMBOL_TO_YAHOO[h.symbol];
        return sym && sym.firstAvailable <= event.end;
      });

      if (symbolsInWindow.length === 0) {
        continue;  // all assets didn't exist yet at this event
      }

      // Fetch all symbols in parallel
      const fetches = await Promise.allSettled(
        symbolsInWindow.map(async h => {
          const sym = SYMBOL_TO_YAHOO[h.symbol];
          const series = await fetchYahooDaily(sym.yahoo, fetchStart, fetchEnd);
          return { symbol: h.symbol, quantity: h.quantity, series };
        })
      );

      const assets: AssetDrawdown[] = [];
      let valueBefore = 0;
      let valueLow = 0;
      let valueAfter = 0;

      for (const f of fetches) {
        if (f.status !== 'fulfilled') continue;
        const { symbol, quantity, series } = f.value;
        const { before, low, after } = computeDrawdown(series, event.start, event.end);
        if (before === 0) continue;
        const drawdownPct = (before - low) / before;
        const valueLost = quantity * (before - low);
        assets.push({
          symbol,
          quantity,
          priceBefore: before,
          priceLow: low,
          priceAfter: after,
          drawdownPct,
          valueLost,
        });
        valueBefore += quantity * before;
        valueLow += quantity * low;
        valueAfter += quantity * after;
      }

      if (assets.length === 0) continue;

      results.push({
        event,
        assets,
        portfolioValueBefore: valueBefore,
        portfolioValueLow: valueLow,
        portfolioValueAfter: valueAfter,
        portfolioDrawdownPct: (valueBefore - valueLow) / valueBefore,
        recoveryPct: (valueAfter - valueLow) / (valueBefore - valueLow),
      });
    }

    return ok(res, {
      cycleId,
      events: results,
      summary: {
        worstDrawdown: results.reduce((max, r) => r.portfolioDrawdownPct > max ? r.portfolioDrawdownPct : max, 0),
        eventsRun: results.length,
      },
    });
  } catch (e: any) {
    console.error('[mpt-stress] error:', e);
    return err(res, 500, e?.message ?? 'Stress test failed');
  }
}