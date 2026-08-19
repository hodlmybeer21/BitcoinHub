// BitcoinHub Workbench — macro block fetchers (Phase 6b, 2026-08-19)
// Lazy-imported from evaluate.ts when a `macro.*` block ID is requested.
// Each fetcher hits /api/fred/data?series_id=X with a sensible default
// lookback. All fetchers return a single-point Series (today's value) so
// they compose naturally with Workbench formulas.

import type { Series } from './evaluate-types.js';

const DEFAULT_DAYS = 1825; // 5y — long enough for weekly/monthly cadence
const BASE = 'https://bitcoinhub.goodbotai.tech';

async function fetchMacroSeries(seriesId: string, days: number = DEFAULT_DAYS): Promise<Series[]> {
  const today = new Date().toISOString().split('T')[0];
  const { default: axios } = await import('axios');
  const res = await axios.get(`${BASE}/api/fred/data`, {
    // Don't pass maxPoints: downsampleObservations is start-anchored, so
    // maxPoints:1 returns only the first 2 obs (likely 2016 data, not today's
    // latest). We just want the latest observation; ask for the full range
    // and read pts[pts.length - 1].
    params: { series_id: seriesId, days },
    timeout: 25000,
  });
  const pts = res.data?.points;
  if (!Array.isArray(pts) || pts.length === 0) throw new Error(`No data for ${seriesId}`);
  const last = pts[pts.length - 1];
  if (typeof last?.value !== 'number') throw new Error(`No numeric value for ${seriesId}`);
  return [{ date: last.date ?? today, value: last.value }];
}

// Helper: define 12 fetchers with consistent shape.
const make =
  (id: string) =>
  (): Promise<Series[]> =>
    fetchMacroSeries(id);

export const MACRO_BLOCK_FETCHERS: Record<string, () => Promise<Series[]>> = {
  'macro.fed_assets':     make('WALCL'),
  'macro.onrrp':          make('RRPONTSYD'),
  'macro.m1':             make('M1SL'),
  'macro.ust_2s10s':      make('T10Y2Y'),
  'macro.ust_3m10y':      make('T10Y3M'),
  'macro.mortgage_30y':   make('MORTGAGE30US'),
  'macro.breakeven_5y5y': make('T5YIE'),
  'macro.cpi_yoy':        make('CPIAUCSL'),  // handler applies YoY transform
  'macro.cpi_core_yoy':   make('CPILFESL'),
  'macro.unemployment':   make('UNRATE'),
  'macro.initial_claims': make('ICSA'),
  'macro.nfci':           make('NFCI'),
};
