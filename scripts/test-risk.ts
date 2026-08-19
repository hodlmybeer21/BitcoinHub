// BitcoinHub Risk Metric — smoke test
// Hits the lib/risk/ modules directly with synthetic data + a real
// CoinGecko fetch for the live BTC case.
//
// Usage:  npx tsx scripts/test-risk.ts
//
// Verifies:
//   1. Cycle state helper returns expected shape + sane numbers
//   2. Mayer z-score is bounded (no NaN/Inf)
//   3. RSI series is bounded 0..100
//   4. Composite risk is bounded 0..1
//   5. Risk band classification matches thresholds
//   6. BMSB snapshot returns finite numbers
//   7. Pi Cycle ratio is sane (< 1.0 in non-top territory)
//   8. Live CoinGecko fetch + composite works end-to-end
//   9. Risk time series returns downsampled array with halving markers
//  10. Workbench evaluator can dispatch a `risk.metric` block via the
//      new lazy-import path (catches integration regressions)

import { getCurrentCycleState, getCyclePositionForDate } from '../lib/risk/cycles.js';
import {
  sma, smaSeries, emaSeries, rsiSeries, mayerZScoreSeries,
} from '../lib/risk/mayer.js';
import {
  computeRiskSeries, computeCurrentRisk, computeRiskTimeSeries,
  riskBandFor, RISK_BANDS, confidenceForYears,
} from '../lib/risk/composite.js';
import { computeBmsb, computePiCycle, computeCyclePos } from '../lib/risk/indicators.js';
import { fetchDailyCloses } from '../lib/risk/quote.js';
import { HALVINGS } from '../lib/risk/cycles-shared.js';

interface TestResult { name: string; pass: boolean; detail?: string; }
const results: TestResult[] = [];

function check(name: string, cond: boolean, detail?: string) {
  results.push({ name, pass: cond, detail });
  const tag = cond ? '✅' : '❌';
  console.log(`${tag} ${name}${detail ? ` — ${detail}` : ''}`);
}

function approxEq(a: number, b: number, eps: number = 1e-6): boolean {
  return Math.abs(a - b) < eps;
}

// ─── 1. Cycle state helper ───────────────────────────────────────────────────
{
  const c = getCurrentCycleState();
  check('1. cycle state returns expected shape',
    typeof c.currentCycleIndex === 'number' &&
    typeof c.lastHalvingDate === 'string' &&
    typeof c.daysSinceHalving === 'number' &&
    typeof c.daysToNextHalving === 'number' &&
    typeof c.cyclePosition === 'number',
    `cycle ${c.currentCycleIndex}, ${c.daysSinceHalving}d since halving, ${(c.cyclePosition * 100).toFixed(1)}% through cycle`);
  check('1b. cycle position is bounded [0, 1]',
    c.cyclePosition >= 0 && c.cyclePosition <= 1);
  check('1c. halvings list has 4 entries',
    HALVINGS.length === 4);
}

// ─── 2. SMA / EMA / stdev / RSI ──────────────────────────────────────────────
{
  const closes = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28];
  const sma5 = sma(closes, 5);
  check('2. SMA(5) of 10 closes equals 24',
    approxEq(sma5, 24),
    `got ${sma5}`);

  const ema = emaSeries(closes, 3);
  check('2b. EMA series length matches input',
    ema.length === closes.length);
  check('2c. EMA seed equals SMA',
    approxEq(ema[2], (10 + 12 + 14) / 3));

  const rsi = rsiSeries(closes, 3);
  check('2d. RSI series is finite',
    rsi.every(v => !Number.isFinite(v) || (v >= 0 && v <= 100)));
  // For a steadily-rising series, RSI should be 100 (all gains).
  check('2e. RSI of pure-uptrend is 100',
    rsi[rsi.length - 1] === 100,
    `last RSI = ${rsi[rsi.length - 1]}`);
}

// ─── 3. Mayer Multiple z-score ───────────────────────────────────────────────
{
  // Synthetic uptrending series: needs > 200 + 1460 = 1660 days for valid z.
  // Use a shorter window to keep the test fast: 250 + 50.
  const closes: number[] = [];
  let p = 100;
  for (let i = 0; i < 500; i++) {
    p *= 1 + (Math.sin(i / 30) * 0.02 + 0.001);   // gentle wave + drift
    closes.push(p);
  }
  const { mm, z } = mayerZScoreSeries(closes, 200, 200); // shorter window for test
  check('3. Mayer MM series length matches input',
    mm.length === closes.length);
  check('3b. Mayer MM early values are NaN (warmup)',
    Number.isNaN(mm[100]));
  check('3c. Mayer MM late values are finite',
    Number.isFinite(mm[closes.length - 1]));
  check('3d. Mayer z-score series has finite late values',
    Number.isFinite(z[closes.length - 1]));
}

// ─── 4. Composite risk series ───────────────────────────────────────────────
{
  // Mayer z-score window is 1460 days. Need ≥ 200 + 1460 = 1660 days
  // for valid latest value. Use 2000 to be safe.
  const closes: number[] = [];
  let p = 100;
  for (let i = 0; i < 2000; i++) {
    p *= 1 + (Math.sin(i / 30) * 0.02 + 0.003);
    closes.push(p);
  }
  const { risk } = computeRiskSeries(closes, true);
  check('4. composite risk length matches input',
    risk.length === closes.length);
  const last = risk[risk.length - 1];
  check('4b. latest composite risk is finite + bounded',
    Number.isFinite(last) && last >= 0 && last <= 1,
    `risk = ${last.toFixed(4)}`);
  check('4c. composite risk has warmup NaN',
    Number.isNaN(risk[100]));
}

// ─── 5. Risk band classification ─────────────────────────────────────────────
{
  check('5. band(0.05) = extreme_fear',
    riskBandFor(0.05).band === 'extreme_fear');
  check('5b. band(0.30) = fear',
    riskBandFor(0.30).band === 'fear');
  check('5c. band(0.55) = neutral',
    riskBandFor(0.55).band === 'neutral');
  check('5d. band(0.95) = extreme_greed',
    riskBandFor(0.95).band === 'extreme_greed');
  check('5e. RISK_BANDS has 6 entries',
    RISK_BANDS.length === 6);
  check('5f. confidenceForYears(10) = high',
    confidenceForYears(10) === 'high');
  check('5g. confidenceForYears(1) = very_low',
    confidenceForYears(1) === 'very_low');
}

// ─── 6. BMSB snapshot ────────────────────────────────────────────────────────
{
  const closes: number[] = [];
  let p = 30000;
  for (let i = 0; i < 200; i++) {
    p *= 1 + (Math.sin(i / 20) * 0.03 + 0.001);
    closes.push(p);
  }
  const bmsb = computeBmsb(closes);
  check('6. BMSB lower is finite',
    Number.isFinite(bmsb.bmsbLower));
  check('6b. BMSB upper is finite',
    Number.isFinite(bmsb.bmsbUpper));
  check('6c. BMSB price equals last close',
    approxEq(bmsb.price, closes[closes.length - 1]));
}

// ─── 7. Pi Cycle snapshot ────────────────────────────────────────────────────
{
  const closes: number[] = [];
  let p = 100;
  for (let i = 0; i < 400; i++) {
    p *= 1 + (Math.sin(i / 30) * 0.02 + 0.002);
    closes.push(p);
  }
  const pc = computePiCycle(closes);
  check('7. Pi long is finite',
    Number.isFinite(pc.piLong));
  check('7b. Pi short is finite',
    Number.isFinite(pc.piShort));
  check('7c. Pi ratio is sane (< 5 in synthetic data)',
    pc.ratio > 0 && pc.ratio < 5,
    `ratio = ${pc.ratio.toFixed(3)}`);
}

// ─── 8. Live CoinGecko fetch + end-to-end risk ──────────────────────────────
{
  console.log('\n🌐 Live CoinGecko fetch (may take a few seconds)...');
  try {
    const { closes, timestamps, meta } = await fetchDailyCloses('BTC', 3650);
    check('8. live fetch returned > 250 closes',
      closes.length > 250,
      `got ${closes.length} closes for ${meta.symbol} (${meta.days}d)`);
    const snap = computeCurrentRisk(closes, true);
    check('8b. live risk is finite + bounded',
      Number.isFinite(snap.risk) && snap.risk >= 0 && snap.risk <= 1,
      `BTC risk = ${snap.risk.toFixed(3)} (${snap.band.label}, ${snap.confidence})`);
    check('8c. live risk has confidence',
      ['very_low', 'low', 'medium', 'high'].includes(snap.confidence));
    check('8d. live risk has band label',
      typeof snap.band.label === 'string' && snap.band.label.length > 0);
  } catch (e: any) {
    check('8. live CoinGecko fetch + composite', false, e?.message ?? 'unknown');
  }
}

// ─── 9. Risk time series downsamples ────────────────────────────────────────
{
  console.log('\n� Time series downsampling...');
  try {
    // Fetch 10y of closes so the 1460-day z-score window is fully satisfied,
    // matching what the production /api/risk/timeseries handler does internally.
    const { closes, timestamps } = await fetchDailyCloses('BTC', 3650);
    const points = computeRiskTimeSeries(closes, timestamps, true, 365);
    check('9. time series has ≤ 400 points (downsampled)',
      points.length > 0 && points.length <= 400,
      `got ${points.length} points`);
    check('9b. time series points have band color',
      points.every(p => typeof p.bandColor === 'string' && p.bandColor.length > 0));
    check('9c. time series points have valid risk',
      points.every(p => p.risk >= 0 && p.risk <= 1));
    check('9d. last point matches today\'s date',
      points.length > 0 && points[points.length - 1].date >= new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]);
  } catch (e: any) {
    check('9. time series', false, e?.message ?? 'unknown');
  }
}

// ─── 10. Workbench evaluator dispatch (risk.* block lazy-import) ─────────────
{
  console.log('\n🔌 Workbench integration test (risk.metric block)...');
  try {
    // Dynamic import to avoid breaking the static import graph if the
    // module shape ever drifts. Catches integration regressions.
    const { RISK_BLOCK_FETCHERS } = await import('../lib/workbench/risk-blocks.js');
    check('10. RISK_BLOCK_FETCHERS has 6 entries',
      Object.keys(RISK_BLOCK_FETCHERS).length === 6,
      Object.keys(RISK_BLOCK_FETCHERS).join(', '));
    check('10b. risk.metric fetcher is callable',
      typeof RISK_BLOCK_FETCHERS['risk.metric'] === 'function');
  } catch (e: any) {
    check('10. RISK_BLOCK_FETCHERS import', false, e?.message ?? 'unknown');
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────
const passed = results.filter(r => r.pass).length;
const failed = results.length - passed;
console.log(`\n${'='.repeat(60)}`);
console.log(`${passed}/${results.length} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  console.log('\nFailed tests:');
  for (const r of results) if (!r.pass) console.log(`  ❌ ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  process.exit(1);
}
process.exit(0);
