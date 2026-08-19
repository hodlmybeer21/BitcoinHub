// BitcoinHub Risk Metric — composite.ts
// The headline 0–1 risk score per the RISK_SPEC.md math section.
//
// risk = 0.55 * risk_z + 0.20 * (RSI/100) + 0.15 * cycle_pos + 0.10 * d200w_norm
//
// - risk_z  = clamp((MM_z + 3) / 6, 0, 1)  where MM_z = Mayer Multiple z-score
// - RSI(14) normalized 0–1
// - cycle_pos: 0–1 (BTC-only via getCurrentCycleState); 0.5 for non-BTC
// - d200w_norm: distance from 200w MA, normalized [-100%, +100%] → [0, 1]
//
// Output: { risk, band, bandLabel, bandColor, confidence, ... }

import { rsiSeries, smaSeries, mayerZScoreSeries } from './mayer.js';
import { getCurrentCycleState } from './cycles.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export type RiskBand =
  | 'extreme_fear'
  | 'fear'
  | 'cautious'
  | 'neutral'
  | 'greed'
  | 'extreme_greed';

export interface RiskBandDef {
  band: RiskBand;
  label: string;
  color: string;
  min: number;
  max: number;
}

export const RISK_BANDS: RiskBandDef[] = [
  { band: 'extreme_fear',   label: 'Extreme Fear',    color: '#16a34a', min: 0.00, max: 0.15 },
  { band: 'fear',           label: 'Fear',            color: '#65a30d', min: 0.15, max: 0.35 },
  { band: 'cautious',       label: 'Cautious',        color: '#ca8a04', min: 0.35, max: 0.50 },
  { band: 'neutral',        label: 'Neutral',         color: '#eab308', min: 0.50, max: 0.65 },
  { band: 'greed',          label: 'Greed',           color: '#ea580c', min: 0.65, max: 0.80 },
  { band: 'extreme_greed',  label: 'Extreme Greed',   color: '#dc2626', min: 0.80, max: 1.01 },
];

export function riskBandFor(risk: number): RiskBandDef {
  for (const b of RISK_BANDS) {
    if (risk >= b.min && risk < b.max) return b;
  }
  return RISK_BANDS[RISK_BANDS.length - 1];
}

export type Confidence = 'very_low' | 'low' | 'medium' | 'high';

export function confidenceForYears(years: number): Confidence {
  if (years >= 8) return 'high';
  if (years >= 4) return 'medium';
  if (years >= 2) return 'low';
  return 'very_low';
}

/**
 * Compute the full composite risk for a daily price series.
 * Returns series aligned to closes (NaN during warmup).
 */
export function computeRiskSeries(closes: number[], isBTC: boolean = false): {
  risk: number[];
  mmZ: number[];
  rsi: number[];
  cyclePos: number[];
  d200w: number[];
} {
  const n = closes.length;
  const { z: mmZ } = mayerZScoreSeries(closes);
  const rsi = rsiSeries(closes, 14);
  const ma200w = smaSeries(closes, 200 * 5); // 200w ≈ 200*5 daily bars (rough), or
                                              // better: 200 weekly bars.
                                              // CoinGecko daily granularity gives
                                              // ~5 bars/week; use 1000 ≈ 200w * 5.
  const ma200wSeries = smaSeries(closes, 1000);

  const cycleState = getCurrentCycleState();
  const cyclePos = new Array<number>(n).fill(isBTC ? cycleState.cyclePosition : 0.5);

  const risk = new Array<number>(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(mmZ[i])) continue;
    const zClamped = Math.max(0, Math.min(1, (mmZ[i] + 3) / 6));
    const rsiNorm = Number.isFinite(rsi[i]) ? rsi[i] / 100 : 0.5;
    const cyc = cyclePos[i];
    let dNorm = 0.5;
    if (Number.isFinite(ma200wSeries[i]) && ma200wSeries[i] > 0) {
      const d = (closes[i] - ma200wSeries[i]) / ma200wSeries[i];
      dNorm = Math.max(0, Math.min(1, (d + 1) / 2));
    }
    risk[i] = 0.55 * zClamped + 0.20 * rsiNorm + 0.15 * cyc + 0.10 * dNorm;
  }

  return { risk, mmZ, rsi, cyclePos, d200w: ma200wSeries };
}

/**
 * Compute the current risk snapshot for a price series.
 * Pulls the latest non-NaN value from the risk series.
 */
export function computeCurrentRisk(closes: number[], isBTC: boolean = false): {
  risk: number;
  band: RiskBandDef;
  confidence: Confidence;
  yearsOfHistory: number;
  mmZ: number | null;
  rsi: number | null;
  cyclePos: number;
  d200w: number | null;
  asOf: string;
} {
  const n = closes.length;
  if (n < 250) {
    throw new Error(`Need ≥250 closes for risk computation, got ${n}`);
  }
  const series = computeRiskSeries(closes, isBTC);

  // Find the latest valid risk value (walk backwards).
  let idx = -1;
  for (let i = n - 1; i >= 0; i--) {
    if (Number.isFinite(series.risk[i])) { idx = i; break; }
  }
  if (idx < 0) throw new Error('No valid risk values in series (insufficient warmup)');

  const years = (n - idx) / 365.25 + (closes.length / 365.25); // rough total history
  // Use the full series length for years-of-history (more accurate):
  const totalYears = n / 365.25;

  return {
    risk: round(series.risk[idx], 4),
    band: riskBandFor(series.risk[idx]),
    confidence: confidenceForYears(totalYears),
    yearsOfHistory: round(totalYears, 2),
    mmZ: Number.isFinite(series.mmZ[idx]) ? round(series.mmZ[idx], 3) : null,
    rsi: Number.isFinite(series.rsi[idx]) ? round(series.rsi[idx], 1) : null,
    cyclePos: round(series.cyclePos[idx], 4),
    d200w: Number.isFinite(series.d200w[idx]) ? round(series.d200w[idx], 4) : null,
    asOf: new Date().toISOString(),
  };
}

/**
 * Compute historical risk time series for a chart.
 * Returns downsampled points (every Nth day) so the chart doesn't get huge.
 */
export function computeRiskTimeSeries(
  closes: number[],
  timestamps: number[],
  isBTC: boolean = false,
  maxPoints: number = 365,
): { date: string; risk: number; band: RiskBand; bandColor: string; price: number }[] {
  const series = computeRiskSeries(closes, isBTC);
  const n = closes.length;
  if (n < 250) throw new Error(`Need ≥250 closes, got ${n}`);

  // Step to downsample to ~maxPoints.
  const step = Math.max(1, Math.floor(n / maxPoints));
  const out: { date: string; risk: number; band: RiskBand; bandColor: string; price: number }[] = [];

  for (let i = 0; i < n; i += step) {
    if (!Number.isFinite(series.risk[i])) continue;
    const risk = series.risk[i];
    const b = riskBandFor(risk);
    out.push({
      date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
      risk: round(risk, 4),
      band: b.band,
      bandColor: b.color,
      price: round(closes[i], 2),
    });
  }
  // Always include the most recent point.
  const last = n - 1;
  if (Number.isFinite(series.risk[last])) {
    const risk = series.risk[last];
    const b = riskBandFor(risk);
    const lastDate = new Date(timestamps[last] * 1000).toISOString().slice(0, 10);
    if (out.length === 0 || out[out.length - 1].date !== lastDate) {
      out.push({
        date: lastDate,
        risk: round(risk, 4),
        band: b.band,
        bandColor: b.color,
        price: round(closes[last], 2),
      });
    }
  }
  return out;
}

function round(x: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(x * f) / f;
}

// ─── Standalone /api/risk/indicator handler ─────────────────────────────────
// Lazy-imports fetchDailyCloses from quote.js inside the handler.

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const symbol = String(req.query?.symbol ?? 'BTC').toUpperCase();
    const days = Number(req.query?.days ?? 3650);

    const { fetchDailyCloses } = await import('./quote.js');
    const { closes, meta } = await fetchDailyCloses(symbol, days);

    const isBTC = symbol === 'BTC';
    const snapshot = computeCurrentRisk(closes, isBTC);

    return res.status(200).json({
      ...snapshot,
      meta,
    });
  } catch (e: any) {
    console.error('[risk-indicator] error:', e);
    return res.status(500).json({ error: e?.message ?? 'Failed to compute risk' });
  }
}

export default handler;
