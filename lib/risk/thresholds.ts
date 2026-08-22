// BitcoinHub Risk Metric — thresholds.ts
// /api/risk/thresholds handler. Computes Ben Cowen's per-cycle "cycle-top
// threshold" overlay on the Phase 6 risk series. Threshold config (§9.1) is
// the single source of truth for which level marks the top of each halving
// cycle: 0.5 (2017 top), 0.4 (2021 top), 0.3 (current cycle, projected).
//
// Pure data + math, no fetches. Uses the Phase 6 `computeRiskSeries` output
// verbatim — no changes to §2.5 composite math.

import { computeRiskSeries } from './composite.js';
import { HALVINGS } from './cycles-shared.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ─── Threshold config (§9.1) ────────────────────────────────────────────────

export type ThresholdKind = 'historical' | 'projected';

export interface CycleTopThreshold {
  cycleIndex: number;        // matches HALVINGS[].cycleIndex (1-based halving number)
  threshold: number;         // 0–1 risk level that historically marked the cycle top
  kind: ThresholdKind;       // 'historical' = verified, 'projected' = Ben's forward call
  source: string;            // provenance for review
  note: string;
}

export const CYCLE_TOP_THRESHOLDS: CycleTopThreshold[] = [
  { cycleIndex: 2, threshold: 0.5, kind: 'historical',
    source: 'Into the Cryptoverse — "Bitcoin Risk Metric" (2021 retro)',
    note: 'BTC topped ~$19.8K on 2017-12-17; risk > 0.5' },
  { cycleIndex: 3, threshold: 0.4, kind: 'historical',
    source: 'Into the Cryptoverse — "Bitcoin Risk Metric" (2022 retro)',
    note: 'BTC topped ~$69K on 2021-11-10; risk > 0.4' },
  { cycleIndex: 4, threshold: 0.3, kind: 'projected',
    source: 'Into the Cryptoverse — early-2026 commentary',
    note: 'Ben\'s published call for the current cycle (2024 halving → next halving)' },
];

// Tunable: where the "approaching" band starts (fraction of threshold).
// Ben doesn't publish a pre-band; 0.85 gives ~2–3 weeks warning based on
// current rate of risk change. See §9.3.
export const APPROACHING_FACTOR = 0.85;

// BTC USD top dates for completed cycles. Current cycle is null until
// a top is confirmed.
const CYCLE_TOP_DATES: Record<number, string | null> = {
  2: '2017-12-17',
  3: '2021-11-10',
  4: null, // current cycle, no completed top
};

// ─── Output types (§9.4) ────────────────────────────────────────────────────

export type ThresholdStatus = 'below' | 'approaching' | 'above';

export interface ThresholdCrossing {
  cycleIndex: number;
  threshold: number;
  kind: ThresholdKind;

  cycleStart: string;
  cycleEnd: string;

  firstCrossDate: string | null;
  firstCrossRisk: number | null;
  peakDate: string;
  peakRisk: number;
  topDate: string | null;

  daysAboveThreshold: number;
  daysFromFirstCrossToPeak: number | null;
  daysFromFirstCrossToTop: number | null;

  currentCycle: boolean;
  triggered: boolean;
  status: ThresholdStatus;
}

export interface ThresholdsPayload {
  symbol: string;
  currentCycleIndex: number;
  currentThreshold: number | null;
  currentRisk: number;
  status: ThresholdStatus;
  pctOfThreshold: number;
  distanceToThreshold: number;
  historical: ThresholdCrossing[];
  asOf: string;
  meta: { symbol: string; name: string; days: number; fetchedAt: string; source: 'yahoo' | 'coingecko' };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isoDate(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

function _statusFor(risk: number, threshold: number): ThresholdStatus {
  if (risk >= threshold) return 'above';
  if (risk >= APPROACHING_FACTOR * threshold) return 'approaching';
  return 'below';
}

/**
 * Map a risk value to its band status relative to a threshold.
 * Exported for the test suite (§9.6 gate) and any future caller that
 * needs to render a status badge.
 */
export const statusFor = _statusFor;

function round(x: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(x * f) / f;
}

// ─── Per-cycle crossing math (§9.2) ──────────────────────────────────────────

/**
 * Walk each CYCLE_TOP_THRESHOLDS entry and produce a ThresholdCrossing
 * describing how the Phase 6 risk series behaved relative to it.
 *
 * @param risk         Phase 6 risk series (aligned to closes)
 * @param timestamps   unix seconds parallel to risk
 * @param currentRisk  latest valid risk value (used for current-cycle status)
 * @param nowTs        unix seconds — window end for the current cycle
 */
export function computeCycleCrossings(
  risk: number[],
  timestamps: number[],
  currentRisk: number,
  nowTs: number = Math.floor(Date.now() / 1000),
): ThresholdCrossing[] {
  const out: ThresholdCrossing[] = [];

  for (const cfg of CYCLE_TOP_THRESHOLDS) {
    const startEntry = HALVINGS.find(h => h.cycleIndex === cfg.cycleIndex);
    const nextEntry = HALVINGS.find(h => h.cycleIndex === cfg.cycleIndex + 1);
    if (!startEntry) continue;

    const startTs = Math.floor(new Date(startEntry.date).getTime() / 1000);
    const endTs = nextEntry
      ? Math.floor(new Date(nextEntry.date).getTime() / 1000)
      : nowTs;
    const isCurrentCycle = !nextEntry;

    // Walk the window [startTs, endTs) — find first crossing, peak, days above.
    let firstIdx = -1;
    let peakIdx = -1;
    let peakRisk = -Infinity;
    let daysAbove = 0;

    for (let i = 0; i < risk.length; i++) {
      if (timestamps[i] < startTs) continue;
      if (timestamps[i] >= endTs) break;
      if (!Number.isFinite(risk[i])) continue;

      if (firstIdx === -1 && risk[i] >= cfg.threshold) {
        firstIdx = i;
      }
      if (risk[i] > peakRisk) {
        peakRisk = risk[i];
        peakIdx = i;
      }
      if (risk[i] >= cfg.threshold) {
        daysAbove++;
      }
    }

    const topDate = CYCLE_TOP_DATES[cfg.cycleIndex] ?? null;
    const firstCrossDate = firstIdx >= 0 ? isoDate(timestamps[firstIdx]) : null;
    const firstCrossRisk = firstIdx >= 0 ? round(risk[firstIdx], 4) : null;
    const peakDate = peakIdx >= 0 ? isoDate(timestamps[peakIdx]) : isoDate(nowTs);
    const peakRiskVal = peakRisk === -Infinity ? (isCurrentCycle ? currentRisk : 0) : peakRisk;

    const daysFromFirstCrossToPeak = (firstIdx >= 0 && peakIdx >= 0)
      ? Math.floor((timestamps[peakIdx] - timestamps[firstIdx]) / 86400)
      : null;
    const daysFromFirstCrossToTop = (firstIdx >= 0 && topDate)
      ? Math.floor((new Date(topDate).getTime() / 1000 - timestamps[firstIdx]) / 86400)
      : null;

    // Triggered = "BTC crossed above this cycle's threshold at some point".
    // For the current cycle: currentRisk >= threshold OR has been crossed
    // historically within the cycle window.
    const triggered = (firstIdx >= 0) || (isCurrentCycle && currentRisk >= cfg.threshold);
    // Status for historical cycles reflects whether the threshold was ever
    // touched in the cycle. Current cycle uses live status from currentRisk.
    const status: ThresholdStatus = isCurrentCycle
      ? _statusFor(currentRisk, cfg.threshold)
      : (firstIdx >= 0 ? 'above' : 'below');

    out.push({
      cycleIndex: cfg.cycleIndex,
      threshold: cfg.threshold,
      kind: cfg.kind,
      cycleStart: startEntry.date,
      cycleEnd: nextEntry ? nextEntry.date : 'ongoing',
      firstCrossDate,
      firstCrossRisk,
      peakDate,
      peakRisk: round(peakRiskVal, 4),
      topDate,
      daysAboveThreshold: daysAbove,
      daysFromFirstCrossToPeak,
      daysFromFirstCrossToTop,
      currentCycle: isCurrentCycle,
      triggered,
      status,
    });
  }

  return out;
}

// ─── Standalone /api/risk/thresholds handler ────────────────────────────────

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const symbol = String(req.query?.symbol ?? 'BTC').toUpperCase();
    const days = Number(req.query?.days ?? 3650);

    const { fetchDailyCloses } = await import('./quote.js');
    // Fetch 15y so the 1460-day z-score warmup is satisfied AND we have
    // valid risk values through cycle 2's window (2016-07 halving). The
    // thresholds endpoint needs this longer window for the §9.6 cycle 2
    // peak-validation gate.
    const FETCH_DAYS = 5475;
    const { closes, timestamps, meta } = await fetchDailyCloses(symbol, FETCH_DAYS);

    const isBTC = symbol === 'BTC';
    const series = computeRiskSeries(closes, isBTC);

    // Current risk = latest valid value from the risk series.
    let currentRisk = 0;
    for (let i = series.risk.length - 1; i >= 0; i--) {
      if (Number.isFinite(series.risk[i])) {
        currentRisk = series.risk[i];
        break;
      }
    }

    const nowTs = Math.floor(Date.now() / 1000);
    const historical = isBTC
      ? computeCycleCrossings(series.risk, timestamps, currentRisk, nowTs)
      : [];

    // Current threshold = the most recent CYCLE_TOP_THRESHOLDS entry (i.e.,
    // the projection for the cycle BTC is in). For non-BTC we return null
    // explicitly — Cowen's framework is BTC-only.
    const currentThreshold = isBTC
      ? CYCLE_TOP_THRESHOLDS[CYCLE_TOP_THRESHOLDS.length - 1].threshold
      : null;
    const status: ThresholdStatus = isBTC && currentThreshold !== null
      ? _statusFor(currentRisk, currentThreshold)
      : 'below';
    const pctOfThreshold = currentThreshold ? round(currentRisk / currentThreshold, 4) : 0;
    const distanceToThreshold = currentThreshold ? round(currentThreshold - currentRisk, 4) : 0;

    const lastHalving = HALVINGS[HALVINGS.length - 1];

    return res.status(200).json({
      symbol,
      currentCycleIndex: isBTC ? lastHalving.cycleIndex : 0,
      currentThreshold,
      currentRisk: round(currentRisk, 4),
      status,
      pctOfThreshold,
      distanceToThreshold,
      historical,
      asOf: new Date().toISOString(),
      meta,
    });
  } catch (e: any) {
    console.error('[risk-thresholds] error:', e);
    return res.status(500).json({ error: e?.message ?? 'Failed to compute thresholds' });
  }
}

export default handler;