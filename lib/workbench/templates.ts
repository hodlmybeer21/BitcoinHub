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
  // ─── Phase 6b — Cowen cycle-top threshold (2026-08-22) ────────────
  {
    id: 'risk_btc_vs_threshold',
    name: 'BTC vs Cycle Top Threshold',
    description: 'Current BTC risk divided by the current cycle\'s Cowen threshold (0.5 / 0.4 / 0.3). 1.0 = at threshold, >1 = above (cycle-top signal). Pair with risk.threshold_status for confirmation.',
    formula: 'risk.metric / risk.threshold_current',
    range: { start: '2026-08-01', end: '2026-08-31' },
  },
  // ─── Macro suite templates (Phase 6b, 2026-08-19) ────────────────────────
  {
    id: 'macro_liquidity_snapshot',
    name: 'Macro Liquidity Snapshot',
    description: 'Current Fed balance sheet, ONRRP, and M1 — the 3 liquidity indicators that matter for BTC. Composite into a single chart in the Workbench.',
    formula: 'macro.fed_assets',
    range: { start: '2026-08-01', end: '2026-08-31' },
  },
  {
    id: 'macro_recession_watch',
    name: 'Recession Watch (Yield Curve)',
    description: '2s10s and 3m10y Treasury spreads. Negative values have preceded every US recession since 1970.',
    formula: 'macro.ust_2s10s',
    range: { start: '2026-08-01', end: '2026-08-31' },
  },
  {
    id: 'macro_inflation_snapshot',
    name: 'Inflation Snapshot',
    description: 'Headline CPI YoY + Core CPI YoY + 5y5y breakevens. See if market inflation expectations match reality.',
    formula: 'macro.cpi_yoy',
    range: { start: '2026-08-01', end: '2026-08-31' },
  },
  // ─── Premium indicator templates (DeMark / Elliott / Wyckoff) ─────────
  {
    id: 'demark_setup_count',
    name: 'DeMark Setup Count (1y)',
    description: 'Daily DeMark Sequential setup count for BTC. Hits ±9 = completed setup (Tom DeMark\'s classic exhaustion signal). Use crosses_above() to detect completion days.',
    formula: 'premium.demark_setup',
    range: { start: '2025-08-01', end: '2026-08-31' },
  },
  {
    id: 'elliott_wave_position',
    name: 'Elliott Wave Position (1y)',
    description: 'Current Elliott wave position from 5-bar zigzag pivots. Positive = impulse wave (1..5), negative = corrective (-1..-3), 0 = unclear. Combine with crosses_above(..., 0) to detect new impulse starts.',
    formula: 'premium.elliott_wave',
    range: { start: '2025-08-01', end: '2026-08-31' },
  },
  {
    id: 'wyckoff_phase',
    name: 'Wyckoff Phase (1y)',
    description: 'Detected Wyckoff phase per day: 1–5 = Accum A→Markup (buy zone late), 10–14 = Distrib A→Markdown (sell zone late), 0 = unclear. Combine with prior price action to confirm.',
    formula: 'premium.wyckoff_phase',
    range: { start: '2025-08-01', end: '2026-08-31' },
  },
  {
    id: 'whale_activity_snapshot',
    name: 'Mempool Whale Activity (Current)',
    description: 'Real-time USD volume of BTC transactions ≥100 BTC currently in the mempool. Snapshot — not historical. Useful for F&G / risk divergence: rising whale activity + extreme_fear = potential local bottom.',
    formula: 'premium.whale_activity',
    range: { start: '2026-08-01', end: '2026-08-31' },
  },
  // ─── Valuation templates (Puell / MVRV / DXY corr) ──────────────────
  {
    id: 'puell_top_signal',
    name: 'Puell Multiple Top Signal',
    description: 'Days when Puell Multiple > 4 — historically a major top signal (per PlanB). Backtest this to see if "sell when Puell > 4" beats buy-and-hold.',
    formula: 'valuation.puell > 4',
    range: { start: '2016-01-01', end: '2026-08-31' },
  },
  {
    id: 'mvrv_top_signal',
    name: 'MVRV Z-Score Top Signal',
    description: 'Days when MVRV-Z > 7 — historically a major top signal (2017, 2021). Combine with Puell > 4 for confirmation: valuation.puell > 4 and valuation.mvrv_z > 7.',
    formula: 'valuation.mvrv_z > 7',
    range: { start: '2016-01-01', end: '2026-08-31' },
  },
  {
    id: 'dxy_btc_inverse',
    name: 'BTC/DXY Strong Inverse Correlation',
    description: 'Days when 30d BTC/DXY correlation < -0.5 — strong risk-off regime. Historically precedes major BTC upside moves. Combine with valuation.mvrv_z < 0 for "buy the inverse-correlation dip" signal.',
    formula: 'valuation.dxy_corr < -0.5',
    range: { start: '2016-01-01', end: '2026-08-31' },
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