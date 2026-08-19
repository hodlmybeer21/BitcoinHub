// BitcoinHub Risk Metric — indicators.ts
// Bull Market Support Band (BMSB) + Pi Cycle Top Indicator + Cycle
// Position helper. Computed from the same daily price series as the
// composite risk score.
//
// All math is pure loops in mayer.ts (SMA, EMA). No external libs.

import { smaSeries, emaSeries } from './mayer.js';
import { getCurrentCycleState } from './cycles.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface BmsbSnapshot {
  bmsbLower: number;          // 20w SMA
  bmsbUpper: number;          // 21w EMA
  price: number;
  aboveLower: boolean;
  aboveUpper: boolean;
  aboveLowerPct: number;
  aboveUpperPct: number;
  asOf: string;
}

export interface PiCycleSnapshot {
  piLong: number;             // 350d MA × 2
  piShort: number;            // 111d MA
  ratio: number;              // piShort / piLong (top signal near 1.0)
  distanceToTopPct: number;   // how far ratio has to climb to reach 1.0
  piCrossAboveTriggered: boolean;
  asOf: string;
}

/**
 * Bull Market Support Band snapshot from a daily close series.
 * Approximates weekly granularity via daily SMA/EMA over windows
 * equivalent to 20w × 5 = 100 days and 21w × 5 = 105 days.
 *
 * (Weekly-only data would be ideal; CoinGecko gives us daily at most,
 * so we approximate. Ben's methodology works on weekly; ours is close.)
 */
export function computeBmsb(closes: number[]): BmsbSnapshot {
  const n = closes.length;
  if (n < 105) throw new Error(`BMSB needs ≥105 daily closes, got ${n}`);

  const sma20w = smaSeries(closes, 100);
  const ema21w = emaSeries(closes, 105);

  let idx = -1;
  for (let i = n - 1; i >= 0; i--) {
    if (Number.isFinite(sma20w[i]) && Number.isFinite(ema21w[i])) { idx = i; break; }
  }
  if (idx < 0) throw new Error('BMSB warmup not satisfied');

  const price = closes[idx];
  const lower = sma20w[idx];
  const upper = ema21w[idx];

  return {
    bmsbLower: round(lower, 2),
    bmsbUpper: round(upper, 2),
    price,                                // unrounded for downstream equality checks
    aboveLower: price > lower,
    aboveUpper: price > upper,
    aboveLowerPct: round((price / lower - 1) * 100, 2),
    aboveUpperPct: round((price / upper - 1) * 100, 2),
    asOf: new Date().toISOString(),
  };
}

/**
 * Pi Cycle Top Indicator snapshot.
 *   pi_long  = MA(close, 350, daily) × 2
 *   pi_short = MA(close, 111, daily)
 * Top historically fires when pi_short crosses UP through pi_long
 * (ratio reaches ~1.0 from below).
 */
export function computePiCycle(closes: number[]): PiCycleSnapshot {
  const n = closes.length;
  if (n < 350) throw new Error(`Pi Cycle needs ≥350 daily closes, got ${n}`);

  const ma350 = smaSeries(closes, 350);
  const ma111 = smaSeries(closes, 111);

  let idx = -1;
  for (let i = n - 1; i >= 0; i--) {
    if (Number.isFinite(ma350[i]) && Number.isFinite(ma111[i])) { idx = i; break; }
  }
  if (idx < 0) throw new Error('Pi Cycle warmup not satisfied');

  const longVal = ma350[idx] * 2;
  const shortVal = ma111[idx];
  const ratio = shortVal / longVal;
  // Distance to cross: how much short needs to climb to reach long.
  // (current long - current short) / current short, as %.
  const distanceToTopPct = ((longVal - shortVal) / shortVal) * 100;

  return {
    piLong: round(longVal, 2),
    piShort: round(shortVal, 2),
    ratio: round(ratio, 4),
    distanceToTopPct: round(distanceToTopPct, 2),
    piCrossAboveTriggered: shortVal >= longVal,
    asOf: new Date().toISOString(),
  };
}

/**
 * Cycle position snapshot (BTC-only meaningful; others return neutral).
 */
export function computeCyclePos(isBTC: boolean = true): ReturnType<typeof getCurrentCycleState> & { isBTC: boolean } {
  return { ...getCurrentCycleState(), isBTC };
}

function round(x: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(x * f) / f;
}

// ─── Standalone /api/risk/indicators handler ────────────────────────────────

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const symbol = String(req.query?.symbol ?? 'BTC').toUpperCase();
    const days = Number(req.query?.days ?? 3650);

    const { fetchDailyCloses } = await import('./quote.js');
    const { closes, meta } = await fetchDailyCloses(symbol, days);

    const isBTC = symbol === 'BTC';
    const bmsb = isBTC || closes.length >= 105 ? computeBmsb(closes) : null;
    const piCycle = closes.length >= 350 ? computePiCycle(closes) : null;
    const cyclePos = computeCyclePos(isBTC);

    return res.status(200).json({
      bmsb,
      piCycle,
      cyclePos,
      meta,
    });
  } catch (e: any) {
    console.error('[risk-indicators] error:', e);
    return res.status(500).json({ error: e?.message ?? 'Failed to compute indicators' });
  }
}

export default handler;
