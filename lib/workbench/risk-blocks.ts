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

export const RISK_BLOCK_FETCHERS: Record<string, () => Promise<Series[]>> = {
  'risk.metric':     fetchRiskMetric,
  'risk.bmsb_lower': fetchBmsbLower,
  'risk.bmsb_upper': fetchBmsbUpper,
  'risk.pi_long':    fetchPiLong,
  'risk.pi_short':   fetchPiShort,
  'risk.cycle_pos':  fetchCyclePos,
};
