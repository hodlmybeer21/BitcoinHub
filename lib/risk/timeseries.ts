// BitcoinHub Risk Metric — timeseries.ts
// /api/risk/timeseries handler. Returns downsampled historical risk
// data for the chart, plus halving markers for overlay.

import { computeRiskTimeSeries } from './composite.js';
import { HALVINGS } from './cycles-shared.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const symbol = String(req.query?.symbol ?? 'BTC').toUpperCase();
    const days = Number(req.query?.days ?? 1460);     // 4y default for the displayed window
    const maxPoints = Number(req.query?.maxPoints ?? 365);

    const { fetchDailyCloses } = await import('./quote.js');
    // Always fetch 10y so the z-score window (1460d) is fully satisfied.
    // computeRiskTimeSeries handles the window slicing internally — it needs
    // the full history to produce valid (non-warmup) risk values.
    const FETCH_DAYS = 3650;
    const { closes, timestamps, meta } = await fetchDailyCloses(symbol, FETCH_DAYS);

    const isBTC = symbol === 'BTC';
    const points = computeRiskTimeSeries(closes, timestamps, isBTC, maxPoints, days);

    // Halving markers as ISO date strings, in scope of the displayed window.
    const lastTsFull = timestamps[timestamps.length - 1] * 1000;
    const firstTsFull = (timestamps[timestamps.length - 1] - days * 86400) * 1000;
    const halvings = HALVINGS
      .filter(h => {
        const t = new Date(h.date).getTime();
        return t >= firstTsFull && t <= lastTsFull;
      })
      .map(h => ({ date: h.date, cycleIndex: h.cycleIndex }));

    return res.status(200).json({
      symbol,
      points,
      halvings,
      count: points.length,
      meta,
    });
  } catch (e: any) {
    console.error('[risk-timeseries] error:', e);
    return res.status(500).json({ error: e?.message ?? 'Failed to compute timeseries' });
  }
}

export default handler;
