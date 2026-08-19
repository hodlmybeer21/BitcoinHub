// BitcoinHub Workbench — /api/workbench/templates
// Self-contained Vercel serverless function.
// Returns the built-in starter templates.

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Template {
  id: string;
  name: string;
  description: string;
  formula: string;
  range: { start: string; end: string };
}

const TEMPLATES: Template[] = [
  {
    id: 'fear_greed_extreme_fear',
    name: 'Extreme Fear (F&G < 25)',
    description: 'Historical days when the Fear & Greed Index signaled extreme fear — historically a buying opportunity.',
    formula: 'fear_greed.value < 25',
    range: { start: '2024-01-01', end: '2025-12-31' },
  },
  {
    id: 'fear_greed_extreme_greed',
    name: 'Extreme Greed (F&G > 75)',
    description: 'Days when F&G signaled extreme greed — historically a sign of market euphoria / tops.',
    formula: 'fear_greed.value > 75',
    range: { start: '2024-01-01', end: '2025-12-31' },
  },
  {
    id: 'btc_drawdown_10pct',
    name: 'BTC Drawdown > 10% (90d)',
    description: 'Days when BTC dropped more than 10% over the prior 90 days.',
    formula: 'change(btc.price, 90) < -0.10',
    range: { start: '2020-01-01', end: '2025-12-31' },
  },
  {
    id: 'btc_50_200_cross',
    name: 'BTC Golden / Death Cross',
    description: 'Days when BTC 50d SMA crosses above (or below) the 200d SMA.',
    formula: 'crosses_above(sma(btc.price, 50), sma(btc.price, 200))',
    range: { start: '2015-01-01', end: '2025-12-31' },
  },
  {
    id: 'funding_positive',
    name: 'Positive Funding (longs paying)',
    description: 'Days when BTC perp funding rate is positive (longs pay shorts).',
    formula: 'funding.bybit > 0.0001',
    range: { start: '2024-01-01', end: '2025-12-31' },
  },
  {
    id: 'risk_off_dxy',
    name: 'Risk-Off: DXY Strengthening',
    description: 'Days when the US Dollar Index is rising (30d change > 2%).',
    formula: 'change(macro.dxy, 30) > 0.02',
    range: { start: '2020-01-01', end: '2025-12-31' },
  },
  {
    id: 'vix_spike',
    name: 'VIX Spike (> 30)',
    description: 'Days when the VIX is elevated (>30), signaling market stress.',
    formula: 'macro.vix > 30',
    range: { start: '2020-01-01', end: '2025-12-31' },
  },
  {
    id: 'btc_above_200dma',
    name: 'BTC Above 200d SMA',
    description: 'Days when BTC is trading above its 200-day moving average.',
    formula: 'btc.price > sma(btc.price, 200)',
    range: { start: '2015-01-01', end: '2025-12-31' },
  },
  // ─── Risk Metric templates (Phase 6, 2026-08-19) ─────────────────────────
  {
    id: 'risk_metric_snapshot',
    name: 'BTC Risk Metric (Current)',
    description: 'Current BTC cycle-position risk score on the 0–1 scale. Reads from the Risk Indicator dashboard.',
    formula: 'risk.metric',
    range: { start: '2026-08-01', end: '2026-08-31' },
  },
  {
    id: 'risk_bmsb_lower',
    name: 'Bull Market Support Band (Lower)',
    description: 'BTC 20-week SMA — Ben Cowen\'s BMSB lower boundary. Historically a buy zone when price is below.',
    formula: 'risk.bmsb_lower',
    range: { start: '2026-08-01', end: '2026-08-31' },
  },
  {
    id: 'risk_bmsb_upper',
    name: 'Bull Market Support Band (Upper)',
    description: 'BTC 21-week EMA — Ben Cowen\'s BMSB upper boundary.',
    formula: 'risk.bmsb_upper',
    range: { start: '2026-08-01', end: '2026-08-31' },
  },
  {
    id: 'risk_pi_cycle_ratio',
    name: 'Pi Cycle Top Ratio',
    description: 'Pi Cycle ratio (111d MA / 350d MA × 2). Tops historically fire when this crosses 1.0.',
    formula: 'risk.pi_short / risk.pi_long',
    range: { start: '2026-08-01', end: '2026-08-31' },
  },
  {
    id: 'risk_cycle_position_pct',
    name: 'Halving Cycle Position %',
    description: 'Position in the 4-year halving cycle (0–100%). Year 1 = early cycle, year 4 = late cycle.',
    formula: 'risk.cycle_pos * 100',
    range: { start: '2026-08-01', end: '2026-08-31' },
  },
  // ─── Phase 6a — Time in Risk Bands (2026-08-19) ─────────────────────────
  {
    id: 'risk_band_stats_snapshot',
    name: 'Time in Risk Bands (Current)',
    description: 'Returns the 6 series — % of days BTC has spent in each risk band over the last 4y. Plottable as a stacked bar.',
    formula: 'risk.band_stats',
    range: { start: '2026-08-01', end: '2026-08-31' },
  },
  {
    id: 'risk_extreme_fear_share',
    name: 'Extreme-Fear Share (4y)',
    description: 'Fraction of the last 4 years BTC has been in the extreme_fear band. High values historically precede recoveries.',
    formula: 'risk.band_stats * 0',  // placeholder — Workbench returns the 6 series; user can pick index 0
    range: { start: '2026-08-01', end: '2026-08-31' },
  },
];

function ok(res: VercelResponse, data: unknown) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
  res.json(data);
}

function err(res: VercelResponse, status: number, message: string) {
  res.status(status).json({ error: message });
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    return ok(res, { templates: TEMPLATES });
  } catch (e: any) {
    console.error('[workbench-templates] error:', e);
    return err(res, 500, e?.message ?? 'Failed to list templates');
  }
}