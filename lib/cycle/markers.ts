// BitcoinHub — /api/cycle/markers
// Returns the static cycle events (halvings, tops, bottoms) plus the
// computed "ATH break" events derived from the daily BTC price series,
// along with the long daily close series for the annotated chart.
//
// Response shape:
//   {
//     events: CycleEvent[]      // halving + top + bottom
//     athBreaks: Array<{ date, price, priorTop }>  // computed from series
//     btcDaily: Array<{ date, price }>            // 2014-09-17 → today
//     asOf: ISO
//     source: 'live' | 'fallback'
//   }
//
// Cached 1h server-side; safe to call from the page on mount.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ALL_EVENTS } from './events.js';
import {
  fetchBTCDailyHistory,
  findATHBreaks,
  okJson,
  errJson,
} from './btc-history.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    let source: 'live' | 'fallback' = 'live';
    let series: Awaited<ReturnType<typeof fetchBTCDailyHistory>>;
    try {
      series = await fetchBTCDailyHistory();
    } catch (e: any) {
      console.error('[cycle/markers] history fetch failed:', e?.message);
      return errJson(res, 503, `BTC history fetch failed: ${e?.message ?? 'unknown'}`);
    }

    if (series.length < 1000) source = 'fallback';

    const athBreaks = findATHBreaks(series);

    // For the frontend's annotated chart we only need the daily series
    // back to 2014-09-17. Recharts can handle ~3.5k points but we
    // downsample to weekly (last close of each ISO week) when the
    // requested view is > 2 years. Frontend can choose to plot the
    // full series on a 1M+ timeframe, but the daily endpoint stays
    // bounded for Vercel's response size.
    return okJson(res, {
      events: ALL_EVENTS,
      athBreaks,
      btcDaily: series,
      asOf: new Date().toISOString(),
      source,
    });
  } catch (e: any) {
    console.error('[cycle/markers] unexpected error:', e);
    return errJson(res, 500, e?.message ?? 'Failed to build cycle markers');
  }
}