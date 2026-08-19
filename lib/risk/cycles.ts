// BitcoinHub Risk Metric — /api/risk/cycles
// Halving cycle state + cycle position helper.
// Pure data, no fetches. Used by both server (cycles endpoint) and
// client (display formatting).
//
// Halving dates are public knowledge (Bitcoin protocol). Cycle window
// follows Cowen's published framework (4y default).

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { HALVINGS } from './cycles-shared.js';

// Re-export so serverless bundlers that only pull cycles.ts still see it.
export { HALVINGS };

// Approximate next halving — protocol is 210,000 blocks × ~10min.
// Last was 2024-04-20 at block 840,000. Next at 1,050,000 ~ April 2028.
const NEXT_HALVING_ESTIMATE = '2028-04-15';
const CYCLE_LENGTH_DAYS = 1460; // 4 years

function ok(res: VercelResponse, data: unknown) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
  res.json(data);
}

function err(res: VercelResponse, status: number, message: string) {
  res.status(status).json({ error: message });
}

/**
 * Get the current cycle state: which halving we are in, days since,
 * position in cycle (0–1), and days to next halving.
 */
export function getCurrentCycleState(now: Date = new Date()): {
  currentCycleIndex: number;
  lastHalvingDate: string;
  nextHalvingEstimate: string;
  daysSinceHalving: number;
  daysToNextHalving: number;
  cyclePosition: number;     // 0–1
  cyclePositionPct: number;  // 0–100
} {
  const nowMs = now.getTime();

  // Find the most recent halving on or before `now`.
  let last = HALVINGS[0];
  for (const h of HALVINGS) {
    if (new Date(h.date).getTime() <= nowMs) last = h;
    else break;
  }

  const lastMs = new Date(last.date).getTime();
  const nextMs = new Date(NEXT_HALVING_ESTIMATE).getTime();

  const daysSinceHalving = Math.max(0, Math.floor((nowMs - lastMs) / 86400000));
  const daysToNextHalving = Math.max(0, Math.ceil((nextMs - nowMs) / 86400000));
  const cyclePosition = Math.max(0, Math.min(1, daysSinceHalving / CYCLE_LENGTH_DAYS));

  return {
    currentCycleIndex: last.cycleIndex,
    lastHalvingDate: last.date,
    nextHalvingEstimate: NEXT_HALVING_ESTIMATE,
    daysSinceHalving,
    daysToNextHalving,
    cyclePosition,
    cyclePositionPct: Math.round(cyclePosition * 1000) / 10,
  };
}

/**
 * Get the cycle position for an arbitrary date (0–1).
 */
export function getCyclePositionForDate(date: Date): number {
  return getCurrentCycleState(date).cyclePosition;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    return ok(res, {
      halvings: HALVINGS,
      nextHalvingEstimate: NEXT_HALVING_ESTIMATE,
      cycleLengthDays: CYCLE_LENGTH_DAYS,
      current: getCurrentCycleState(),
    });
  } catch (e: any) {
    console.error('[risk-cycles] error:', e);
    return err(res, 500, e?.message ?? 'Failed to compute cycle state');
  }
}
