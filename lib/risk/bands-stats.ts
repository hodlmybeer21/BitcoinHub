// BitcoinHub Risk Metric — bands-stats.ts
// /api/risk/bands-stats handler. Returns Time-in-Risk-Bands statistics:
// % of days BTC has spent in each band over the window, current streak,
// and most recent band transition.

import { computeRiskSeries, computeBandStats, RISK_BANDS } from './composite.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const symbol = String(req.query?.symbol ?? 'BTC').toUpperCase();
    const days = Number(req.query?.days ?? 1460);  // 4y default for band stats

    const { fetchDailyCloses } = await import('./quote.js');
    // Always fetch 10y so the 1460-day z-score warmup is satisfied.
    const FETCH_DAYS = 3650;
    const { closes, timestamps, meta } = await fetchDailyCloses(symbol, FETCH_DAYS);

    const isBTC = symbol === 'BTC';
    const series = computeRiskSeries(closes, isBTC);
    const stats = computeBandStats(series.risk, timestamps, days);

    return res.status(200).json({
      symbol,
      bands: RISK_BANDS,
      ...stats,
      meta,
    });
  } catch (e: any) {
    console.error('[risk-bands-stats] error:', e);
    return res.status(500).json({ error: e?.message ?? 'Failed to compute band stats' });
  }
}

export default handler;