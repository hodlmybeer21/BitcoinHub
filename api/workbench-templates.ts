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