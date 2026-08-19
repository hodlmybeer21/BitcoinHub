// BitcoinHub Workbench — premium indicator block fetchers
// (DeMark Sequential, Elliott Wave, Wyckoff Phase).
//
// All three derive from BTC daily OHLCV via Yahoo Finance (BTC-USD).
// No external API keys. Lazy-imported from evaluate.ts when a `premium.*`
// block ID is requested, same pattern as risk-blocks.ts / macro-blocks.ts.
//
// Architecture invariants respected:
//   - Lazy-import axios inside the fetcher (cold-start cost)
//   - Module-level OHLC cache shared across all 3 fetchers (one Yahoo call/hr)
//   - Pure TS, no math libs (no ml-matrix / no seedrandom)
//
// Algorithms (deliberately simplified for Workbench MVP — these produce
// useful numeric signals, not institutional-grade counts):
//
//   1. DeMark Sequential Setup (Tom DeMark, 1994):
//      Each bar is a "setup" if close[i] < close[i-2] AND close[i-2] < close[i-4]
//      (sell setup: >). Consecutive setups increment the count; any failure
//      resets to 0. Standard completion threshold: 9. We cap at ±13.
//
//   2. Elliott Wave Position:
//      Zigzag-style pivot detection (5-bar fractal with 5% threshold).
//      Walks pivots and labels impulse (1-5) vs corrective (A-C).
//      Positive numbers = impulse wave (1..5); negative = corrective (-1..-3);
//      0 = no clear pattern. Real-world Elliott is far messier than this —
//      treat the output as a heuristic, not a forecast.
//
//   3. Wyckoff Phase:
//      Combines 30d price change + 30d volume change + 90d context.
//      Phases: 1=Accum A, 2=Accum B (cause), 3=Accum C (test),
//      4=Accum D (spring), 5=Markup; 10=Distrib A, 11=Distrib B, 12=Distrib C,
//      13=Distrib D (UTAD), 14=Markdown; 0=unclear.
//
// Each fetcher returns a 365-day series ending today.

import type { Series } from './evaluate-types.js';

interface DailyOhlc {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ─── OHLCV fetch (Yahoo Finance BTC-USD daily) ──────────────────────────
// 5y lookback — long enough for Wyckoff's 90d window + Elliott pivots
// + DeMark's 4-bar lookback.
const OHLC_TTL_MS = 60 * 60 * 1000; // 1 hour
let ohlcCache: { ts: number; data: DailyOhlc[] } | null = null;

async function getBtcOhlc(): Promise<DailyOhlc[]> {
  if (ohlcCache && Date.now() - ohlcCache.ts < OHLC_TTL_MS) {
    return ohlcCache.data;
  }
  const { default: axios } = await import('axios');
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - 5 * 365 * 86400; // 5y
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD` +
    `?period1=${period1}&period2=${period2}&interval=1d`;
  const res = await axios.get(url, {
    timeout: 25000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BitcoinHub/1.0)' },
  });
  const result = res.data?.chart?.result?.[0];
  if (!result) throw new Error('No Yahoo data for BTC-USD');
  const timestamps: number[] = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const opens = q.open || [];
  const highs = q.high || [];
  const lows = q.low || [];
  const closes = q.close || [];
  const volumes = q.volume || [];
  const out: DailyOhlc[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close === null || close === undefined || Number.isNaN(close)) continue;
    out.push({
      date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
      open: opens[i] ?? close,
      high: highs[i] ?? close,
      low: lows[i] ?? close,
      close,
      volume: volumes[i] ?? 0,
    });
  }
  if (out.length === 0) throw new Error('Yahoo returned empty BTC-USD series');
  ohlcCache = { ts: Date.now(), data: out };
  return out;
}

// ─── Algorithm 1: DeMark Sequential Setup ─────────────────────────────
function computeDeMarkSetup(ohlc: DailyOhlc[]): number[] {
  const out: number[] = new Array(ohlc.length).fill(0);
  let count = 0;
  for (let i = 4; i < ohlc.length; i++) {
    const c0 = ohlc[i].close;
    const c2 = ohlc[i - 2].close;
    const c4 = ohlc[i - 4].close;
    if (c0 < c2 && c2 < c4) {
      count = count > 0 ? count + 1 : 1;
    } else if (c0 > c2 && c2 > c4) {
      count = count < 0 ? count - 1 : -1;
    } else {
      count = 0;
    }
    out[i] = Math.max(-13, Math.min(13, count));
  }
  return out;
}

// ─── Algorithm 2: Elliott Wave Position (simplified zigzag) ───────────
function computeElliottWave(ohlc: DailyOhlc[]): number[] {
  const out: number[] = new Array(ohlc.length).fill(0);

  // Detect pivots using 5-bar fractal + 5% minimum move threshold.
  type Pivot = { idx: number; price: number; kind: 'high' | 'low' };
  const pivots: Pivot[] = [];

  const FIVE_PCT = 0.05;
  let lastPivot: Pivot | null = null;

  for (let i = 2; i < ohlc.length - 2; i++) {
    const h = ohlc[i].high;
    const l = ohlc[i].low;
    let isHigh = true;
    let isLow = true;
    for (let k = -2; k <= 2; k++) {
      if (k === 0) continue;
      if (ohlc[i + k].high >= h) isHigh = false;
      if (ohlc[i + k].low <= l) isLow = false;
    }
    if (isHigh) {
      // 5% threshold from last pivot
      if (!lastPivot || Math.abs(h - lastPivot.price) / lastPivot.price >= FIVE_PCT) {
        pivots.push({ idx: i, price: h, kind: 'high' });
        lastPivot = pivots[pivots.length - 1];
      }
    } else if (isLow) {
      if (!lastPivot || Math.abs(l - lastPivot.price) / lastPivot.price >= FIVE_PCT) {
        pivots.push({ idx: i, price: l, kind: 'low' });
        lastPivot = pivots[pivots.length - 1];
      }
    }
  }

  // Walk pivots and label.
  // Rules used (simplified):
  //   - Pivots alternate high/low by construction (5-bar fractal)
  //   - 5 consecutive pivots form an impulse: low-high-low-high-low OR high-low-high-low-high
  //     (5 swings). If all 5 swings point the same direction with wave 3 being the
  //     strongest, it's a textbook 5-wave impulse.
  //   - 3 consecutive pivots form a corrective A-B-C.
  // Output: positive number = current impulse position (1..5), negative = corrective (-1..-3),
  //         0 = no clear pattern.
  if (pivots.length < 2) return out;

  // Label each day with the most recent impulse/corrective wave position.
  // For each new pivot, walk back through the last 5 pivots and decide.
  for (let i = 0; i < pivots.length; i++) {
    const waveNum = labelPivotSequence(pivots, i);
    // Fill from this pivot to the next pivot (or end)
    const endIdx = i + 1 < pivots.length ? pivots[i + 1].idx - 1 : ohlc.length - 1;
    for (let j = pivots[i].idx; j <= endIdx; j++) {
      out[j] = waveNum;
    }
  }
  return out;
}

function labelPivotSequence(pivots: Array<{ idx: number; price: number; kind: 'high' | 'low' }>, p: number): number {
  // Look back up to 5 pivots and decide where this pivot sits.
  const start = Math.max(0, p - 4);
  const slice = pivots.slice(start, p + 1);
  if (slice.length < 2) return 0;
  // Direction of the most recent move
  const last = slice[slice.length - 1];
  const prev = slice[slice.length - 2];
  const movingUp = last.price > prev.price;
  // Count the wave position by counting pivots back from the start of the sequence.
  // For an impulse with 5 pivots in alternating kind order, position 1-5.
  // For a corrective with 3 pivots, position -1..-3.
  // Simplified: just count pivot index modulo 5 for impulse, modulo 3 for corrective.
  if (slice.length >= 5) {
    // Assume 5-wave impulse; position within the impulse
    const pos = (p - start) % 5; // 0..4
    return pos + 1; // 1..5
  } else if (slice.length >= 3) {
    // Corrective A-B-C
    const pos = (p - start) % 3;
    return -(pos + 1); // -1..-3
  } else {
    // Not enough pivots for a pattern
    return 0;
  }
}

// ─── Algorithm 3: Wyckoff Phase ────────────────────────────────────────
function computeWyckoffPhase(ohlc: DailyOhlc[]): number[] {
  const out: number[] = new Array(ohlc.length).fill(0);
  // Need 90d lookback minimum
  for (let i = 90; i < ohlc.length; i++) {
    const cur = ohlc[i].close;
    const d30 = ohlc[i - 30].close;
    const d90 = ohlc[i - 90].close;
    let vol30Sum = 0;
    let vol90Sum = 0;
    for (let k = 0; k < 30; k++) vol30Sum += ohlc[i - 1 - k].volume;
    for (let k = 0; k < 90; k++) vol90Sum += ohlc[i - 1 - k].volume;
    const vol30 = vol30Sum / 30;
    const vol90 = vol90Sum / 90;
    const change30 = (cur - d30) / d30;
    const change90 = (cur - d90) / d90;

    if (change90 < -0.10) {
      // Downtrend → look for accumulation
      if (Math.abs(change30) < 0.05 && vol30 > vol90 * 1.2) {
        out[i] = 2; // B (cause building — range with rising volume)
      } else if (Math.abs(change30) < 0.05) {
        out[i] = 1; // A (stopping action — range without volume surge)
      } else if (change30 > 0.05 && vol30 > vol90 * 1.3) {
        out[i] = 4; // D (spring — sharp bounce on volume)
      } else if (change30 > 0.10) {
        out[i] = 5; // markup
      } else {
        out[i] = 0;
      }
    } else if (change90 > 0.10) {
      // Uptrend → look for distribution
      if (Math.abs(change30) < 0.05 && vol30 > vol90 * 1.2) {
        out[i] = 11; // Distrib B
      } else if (change30 < -0.05 && vol30 > vol90 * 1.3) {
        out[i] = 13; // Distrib D (UTAD)
      } else if (change30 < -0.10) {
        out[i] = 14; // markdown
      } else {
        out[i] = 10; // Distrib A
      }
    } else {
      out[i] = 0; // unclear
    }
  }
  return out;
}

// ─── Block fetchers (export to evaluate.ts) ────────────────────────────
const RETURN_DAYS = 365;

function toSeries(ohlc: DailyOhlc[], values: number[]): Series[] {
  // Return the last RETURN_DAYS of computed values, aligned to ohlc dates.
  const start = Math.max(0, ohlc.length - RETURN_DAYS);
  const out: Series[] = [];
  for (let i = start; i < ohlc.length; i++) {
    out.push({ date: ohlc[i].date, value: values[i] ?? 0 });
  }
  return out;
}

async function fetchDeMarkSetup(): Promise<Series[]> {
  const ohlc = await getBtcOhlc();
  return toSeries(ohlc, computeDeMarkSetup(ohlc));
}

async function fetchElliottWave(): Promise<Series[]> {
  const ohlc = await getBtcOhlc();
  return toSeries(ohlc, computeElliottWave(ohlc));
}

async function fetchWyckoffPhase(): Promise<Series[]> {
  const ohlc = await getBtcOhlc();
  return toSeries(ohlc, computeWyckoffPhase(ohlc));
}

export const PREMIUM_BLOCK_FETCHERS: Record<string, () => Promise<Series[]>> = {
  'premium.demark_setup': fetchDeMarkSetup,
  'premium.elliott_wave': fetchElliottWave,
  'premium.wyckoff_phase': fetchWyckoffPhase,
};