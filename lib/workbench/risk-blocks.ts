// BitcoinHub Workbench — risk block fetchers (Phase 6, 2026-08-19)
// Lazy-imported from evaluate.ts when a `risk.*` block ID is requested.
// Each fetcher returns a `Series[]` aligned to the formula's date range.
//
// Snapshot blocks (risk.metric, risk.bmsb_lower, etc.) return a one-point
// series for today — the user queries a narrow range to see the value.

import type { Series } from './evaluate-types.js';

// We can't import evaluate.ts's Series type directly (circular dep risk
// at module-evaluation time on Vercel), so we duplicate the interface.
// The shape MUST match: { date: 'YYYY-MM-DD'; value: number }

async function fetchRiskMetric(): Promise<Series[]> {
  const today = new Date().toISOString().split('T')[0];
  const { default: axios } = await import('axios');
  const res = await axios.get('https://bitcoinhub.goodbotai.tech/api/risk/indicator?symbol=BTC&days=3650', { timeout: 25000 });
  const v = res.data?.risk;
  if (typeof v !== 'number') throw new Error('No risk value returned');
  return [{ date: today, value: v }];
}

async function fetchBmsbLower(): Promise<Series[]> {
  const today = new Date().toISOString().split('T')[0];
  const { default: axios } = await import('axios');
  const res = await axios.get('https://bitcoinhub.goodbotai.tech/api/risk/indicators?symbol=BTC&days=3650', { timeout: 25000 });
  const v = res.data?.bmsb?.bmsbLower;
  if (typeof v !== 'number') throw new Error('No BMSB lower returned');
  return [{ date: today, value: v }];
}

async function fetchBmsbUpper(): Promise<Series[]> {
  const today = new Date().toISOString().split('T')[0];
  const { default: axios } = await import('axios');
  const res = await axios.get('https://bitcoinhub.goodbotai.tech/api/risk/indicators?symbol=BTC&days=3650', { timeout: 25000 });
  const v = res.data?.bmsb?.bmsbUpper;
  if (typeof v !== 'number') throw new Error('No BMSB upper returned');
  return [{ date: today, value: v }];
}

async function fetchPiLong(): Promise<Series[]> {
  const today = new Date().toISOString().split('T')[0];
  const { default: axios } = await import('axios');
  const res = await axios.get('https://bitcoinhub.goodbotai.tech/api/risk/indicators?symbol=BTC&days=3650', { timeout: 25000 });
  const v = res.data?.piCycle?.piLong;
  if (typeof v !== 'number') throw new Error('No Pi Cycle long returned');
  return [{ date: today, value: v }];
}

async function fetchPiShort(): Promise<Series[]> {
  const today = new Date().toISOString().split('T')[0];
  const { default: axios } = await import('axios');
  const res = await axios.get('https://bitcoinhub.goodbotai.tech/api/risk/indicators?symbol=BTC&days=3650', { timeout: 25000 });
  const v = res.data?.piCycle?.piShort;
  if (typeof v !== 'number') throw new Error('No Pi Cycle short returned');
  return [{ date: today, value: v }];
}

async function fetchCyclePos(): Promise<Series[]> {
  const today = new Date().toISOString().split('T')[0];
  const { default: axios } = await import('axios');
  const res = await axios.get('https://bitcoinhub.goodbotai.tech/api/risk/cycles', { timeout: 15000 });
  const v = res.data?.current?.cyclePosition;
  if (typeof v !== 'number') throw new Error('No cycle position returned');
  return [{ date: today, value: v }];
}

/**
 * Returns 6 series, one per risk band, with the % of days BTC has spent
 * in that band over the 4y window. Works as a Workbench bar chart source.
 *   Series 0 = extreme_fear pct, Series 1 = fear pct, ..., Series 5 = extreme_greed pct
 */
async function fetchBandStats(): Promise<Series[]> {
  const today = new Date().toISOString().split('T')[0];
  const { default: axios } = await import('axios');
  const res = await axios.get(
    'https://bitcoinhub.goodbotai.tech/api/risk/bands-stats?symbol=BTC&days=1460',
    { timeout: 25000 },
  );
  const dist: Array<{ band: string; label: string; pct: number }> = res.data?.distribution ?? [];
  if (dist.length !== 6) throw new Error(`Expected 6 band entries, got ${dist.length}`);
  return dist.map(d => ({ date: today, value: d.pct }));
}

export const RISK_BLOCK_FETCHERS: Record<string, () => Promise<Series[]>> = {
  'risk.metric':     fetchRiskMetric,
  'risk.bmsb_lower': fetchBmsbLower,
  'risk.bmsb_upper': fetchBmsbUpper,
  'risk.pi_long':    fetchPiLong,
  'risk.pi_short':   fetchPiShort,
  'risk.cycle_pos':  fetchCyclePos,
  'risk.band_stats': fetchBandStats,
};

// ─── Phase 6b — Cowen cycle-top threshold blocks (2026-08-22) ──────

async function fetchThresholdCurrent(): Promise<Series[]> {
  const today = new Date().toISOString().split('T')[0];
  const { default: axios } = await import('axios');
  const res = await axios.get('https://bitcoinhub.goodbotai.tech/api/risk/thresholds?symbol=BTC', { timeout: 25000 });
  const v = res.data?.currentThreshold;
  if (typeof v !== 'number') throw new Error('No currentThreshold returned (BTC-only)');
  return [{ date: today, value: v }];
}

async function fetchThresholdPct(): Promise<Series[]> {
  const today = new Date().toISOString().split('T')[0];
  const { default: axios } = await import('axios');
  const res = await axios.get('https://bitcoinhub.goodbotai.tech/api/risk/thresholds?symbol=BTC', { timeout: 25000 });
  const v = res.data?.pctOfThreshold;
  if (typeof v !== 'number') throw new Error('No pctOfThreshold returned');
  return [{ date: today, value: v }];
}

/**
 * Numeric encoding of the threshold status for Workbench compatibility
 * (the evaluator only does numeric comparisons):
 *   below       → 0.0
 *   approaching → 0.5
 *   above       → 1.0
 *
 * So `risk.threshold_status >= 1` means "above threshold (cycle-top signal)".
 */
async function fetchThresholdStatus(): Promise<Series[]> {
  const today = new Date().toISOString().split('T')[0];
  const { default: axios } = await import('axios');
  const res = await axios.get('https://bitcoinhub.goodbotai.tech/api/risk/thresholds?symbol=BTC', { timeout: 25000 });
  const s: string = res.data?.status;
  let encoded = 0;
  if (s === 'approaching') encoded = 0.5;
  else if (s === 'above') encoded = 1.0;
  return [{ date: today, value: encoded }];
}

export const THRESHOLD_BLOCK_FETCHERS: Record<string, () => Promise<Series[]>> = {
  'risk.threshold_current': fetchThresholdCurrent,
  'risk.threshold_pct':     fetchThresholdPct,
  'risk.threshold_status':  fetchThresholdStatus,
};

// Combined map for evaluate.ts convenience — both groups under one import.
export const ALL_RISK_BLOCK_FETCHERS: Record<string, () => Promise<Series[]>> = {
  ...RISK_BLOCK_FETCHERS,
  ...THRESHOLD_BLOCK_FETCHERS,
};
