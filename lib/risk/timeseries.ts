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
    // Slice the result to the requested `days` window for display.
    const FETCH_DAYS = 3650;
    const { closes, timestamps, meta } = await fetchDailyCloses(symbol, FETCH_DAYS);

    const isBTC = symbol === 'BTC';

    // Slice closes/timestamps to the last `days` for the user's window.
    const cutoffTs = timestamps[timestamps.length - 1] - days * 86400;
    let startIdx = 0;
    for (let i = 0; i < timestamps.length; i++) {
      if (timestamps[i] >= cutoffTs) { startIdx = i; break; }
    }
    const sliceCloses = closes.slice(startIdx);
    const sliceTimestamps = timestamps.slice(startIdx);

    const points = computeRiskTimeSeries(sliceCloses, sliceTimestamps, isBTC, maxPoints);

    // Halving markers as ISO date strings, in scope of `days`.
    const firstTs = sliceTimestamps[0] * 1000;
    const lastTs = sliceTimestamps[sliceTimestamps.length - 1] * 1000;
    const halvings = HALVINGS
      .filter(h => {
        const t = new Date(h.date).getTime();
        return t >= firstTs && t <= lastTs;
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
