// BitcoinHub — /api/cycle/position
// Lightweight hero-widget payload: where we are in the 4-year BTC cycle.
// Used by client/src/components/CyclePositionWidget.tsx on the homepage hero.
//
// Reuses lib/cycle/btc-history.ts (Yahoo Finance v8 chart, daily BTC close)
// and merges with curated halving data from lib/cycle/events.ts.
// Cached 5 minutes server-side; s-maxage 5 min on the response.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchBTCDailyHistory, okJson, errJson } from './btc-history.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { at: number; data: unknown } | null = null;

// ── Curated constants (kept in sync with lib/cycle/events.ts) ────────────
const HALVING4_DATE = '2024-04-20';
const HALVING4_PRICE = 63817.30;

// Next halving (cycle 5) is projectable from hashrate; conservative estimate
// from BitcoinHalving.com's tracker. Block 1,050,000 expected ~2028-04-15.
const NEXT_HALVING_DATE = '2028-04-15';

// Prior cycles used for the mini-strip "BTC at the same days-post-halving"
// comparison. Halving prices mirror events.ts.
const PRIOR_CYCLES = [
  { cycleId: 'c2', label: 'Cycle 2 (2016 halving)', halvingDate: '2016-07-09', halvingPrice: 657.61 },
  { cycleId: 'c3', label: 'Cycle 3 (2020 halving)', halvingDate: '2020-05-11', halvingPrice: 8601.97 },
];

// Days-from-halving to cycle top for the "where past cycles topped" line.
// Cycle 2: 2016-07-09 → 2017-12-17 = 526d.  Cycle 3: 2020-05-11 → 2021-11-10 = 548d.
const HISTORICAL_TOP_DAYS = [
  { cycleId: 'c2', days: 526 },
  { cycleId: 'c3', days: 548 },
];

// ── Helpers ─────────────────────────────────────────────────────────────
function daysBetween(aISO: string, bISO: string): number {
  const a = Date.parse(aISO.length === 10 ? aISO + 'T00:00:00Z' : aISO);
  const b = Date.parse(bISO.length === 10 ? bISO + 'T00:00:00Z' : bISO);
  return Math.floor((b - a) / 86400000);
}

function findClosestPrice(series: Array<{ date: string; price: number }>, targetDate: string): number | null {
  const target = Date.parse(targetDate + 'T00:00:00Z');
  let best = Infinity;
  let bestPrice: number | null = null;
  for (const p of series) {
    const t = Date.parse(p.date + 'T00:00:00Z');
    const diff = Math.abs(t - target);
    if (diff < best) { best = diff; bestPrice = p.price; }
  }
  // Accept if within 7 days of target (BTC daily close is ~always present).
  return best <= 7 * 86400000 ? bestPrice : null;
}

function findLastAth(series: Array<{ date: string; price: number }>): { date: string; price: number } {
  let max = -Infinity;
  let date = '';
  for (const p of series) {
    if (p.price > max) { max = p.price; date = p.date; }
  }
  return { date, price: max };
}

// ── Handler ─────────────────────────────────────────────────────────────
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      res.setHeader('X-Cache', 'HIT');
      return okJson(res, cache.data, 300);
    }

    const hist = await fetchBTCDailyHistory();
    const last = hist[hist.length - 1];
    const prev = hist[hist.length - 2];
    if (!last || !prev) throw new Error('BTC daily history is empty');

    const currentPrice = last.price;
    const change24h = ((currentPrice - prev.price) / prev.price) * 100;

    const daysSinceHalving4 = daysBetween(HALVING4_DATE, last.date);
    if (daysSinceHalving4 < 0) throw new Error('Today predates halving 4');

    const daysUntilNextHalving = daysBetween(last.date, NEXT_HALVING_DATE);
    const priceSinceHalvingPct = ((currentPrice - HALVING4_PRICE) / HALVING4_PRICE) * 100;

    const lastAth = findLastAth(hist);
    const daysSinceLastAth = daysBetween(lastAth.date, last.date);
    const drawdownPctFromTop = ((currentPrice - lastAth.price) / lastAth.price) * 100;

    // Mini-strip: BTC at daysSinceHalving4 in each prior cycle.
    const miniStrip: any[] = PRIOR_CYCLES.map(c => {
      const target = new Date(Date.parse(c.halvingDate + 'T00:00:00Z') + daysSinceHalving4 * 86400000);
      const dateStr = target.toISOString().slice(0, 10);
      const price = findClosestPrice(hist, dateStr);
      return {
        cycleId: c.cycleId,
        cycleLabel: c.label,
        daysFromHalving: daysSinceHalving4,
        date: dateStr,
        price,
        fromHalvingPct: price != null ? ((price - c.halvingPrice) / c.halvingPrice) * 100 : null,
      };
    });
    miniStrip.push({
      cycleId: 'c4',
      cycleLabel: 'Cycle 4 (2024 halving) — Now',
      daysFromHalving: daysSinceHalving4,
      date: last.date,
      price: currentPrice,
      fromHalvingPct: priceSinceHalvingPct,
      current: true,
    });

    const data = {
      asOf: last.date,
      source: 'yahoo',
      currentPrice,
      change24h,
      halving4Date: HALVING4_DATE,
      halving4Price: HALVING4_PRICE,
      daysSinceHalving4,
      priceSinceHalvingPct,
      nextHalvingDate: NEXT_HALVING_DATE,
      daysUntilNextHalving,
      lastAthPrice: lastAth.price,
      lastAthDate: lastAth.date,
      daysSinceLastAth,
      drawdownPctFromTop,
      historicalTopDays: HISTORICAL_TOP_DAYS,
      miniStrip,
    };

    cache = { at: Date.now(), data };
    res.setHeader('X-Cache', 'MISS');
    return okJson(res, data, 300);
  } catch (e: any) {
    return errJson(res, 500, e?.message ?? 'unknown error');
  }
}
