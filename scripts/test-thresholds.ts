// BitcoinHub Risk Metric — thresholds smoke test
// Validates lib/risk/thresholds.ts (§9 Phase 6b addendum):
//   1. CYCLE_TOP_THRESHOLDS config has the expected 3 entries (0.5/0.4/0.3)
//   2. APPROACHING_FACTOR produces the expected status bands
//   3. computeCycleCrossings produces sane output for synthetic data
//   4. Live BTC fetch + composite + crossings — MUST PASS:
//      - cycle 2 (2017 top) peak risk ≥ 0.5
//      - cycle 3 (2021 top) peak risk ≥ 0.4
//      Per RISK_SPEC §9.6. If either fails, the threshold table needs an
//      `accuracy` flag (out of scope for 6b) — the test exit code reflects
//      this so UI work is gated on green.
//
// Usage:  npx tsx scripts/test-thresholds.ts

import {
  CYCLE_TOP_THRESHOLDS,
  APPROACHING_FACTOR,
  computeCycleCrossings,
  statusFor,
  type ThresholdStatus,
} from '../lib/risk/thresholds.js';
import { computeRiskSeries } from '../lib/risk/composite.js';
import { fetchDailyCloses } from '../lib/risk/quote.js';
import { HALVINGS } from '../lib/risk/cycles-shared.js';

interface TestResult { name: string; pass: boolean; detail?: string; }
const results: TestResult[] = [];

function check(name: string, cond: boolean, detail?: string) {
  results.push({ name, pass: cond, detail });
  const tag = cond ? '✅' : '❌';
  console.log(`${tag} ${name}${detail ? ` — ${detail}` : ''}`);
}

// ─── 1. Config sanity ────────────────────────────────────────────────────────
{
  check('1. CYCLE_TOP_THRESHOLDS has 3 entries',
    CYCLE_TOP_THRESHOLDS.length === 3,
    `got ${CYCLE_TOP_THRESHOLDS.length}`);

  const byCycle = new Map(CYCLE_TOP_THRESHOLDS.map(c => [c.cycleIndex, c]));
  check('1b. cycle 2 threshold = 0.5 (historical)',
    byCycle.get(2)?.threshold === 0.5 && byCycle.get(2)?.kind === 'historical');
  check('1c. cycle 3 threshold = 0.4 (historical)',
    byCycle.get(3)?.threshold === 0.4 && byCycle.get(3)?.kind === 'historical');
  check('1d. cycle 4 threshold = 0.3 (projected)',
    byCycle.get(4)?.threshold === 0.3 && byCycle.get(4)?.kind === 'projected');

  check('1e. every threshold has a source citation',
    CYCLE_TOP_THRESHOLDS.every(c => typeof c.source === 'string' && c.source.length > 0));

  check('1f. every cycleIndex maps to a HALVINGS entry',
    CYCLE_TOP_THRESHOLDS.every(c => HALVINGS.some(h => h.cycleIndex === c.cycleIndex)));
}

// ─── 2. statusFor band classification (§9.3) ─────────────────────────────────
{
  check('2. statusFor(0.10, 0.30) = below',
    statusFor(0.10, 0.30) === 'below');
  check('2b. statusFor(0.27, 0.30) = approaching (0.85 × 0.30 = 0.255)',
    statusFor(0.27, 0.30) === 'approaching');
  check('2c. statusFor(0.30, 0.30) = above (exactly at threshold)',
    statusFor(0.30, 0.30) === 'above');
  check('2d. statusFor(0.50, 0.30) = above',
    statusFor(0.50, 0.30) === 'above');
  check('2e. APPROACHING_FACTOR = 0.85',
    APPROACHING_FACTOR === 0.85);

  // Boundary check: risk at exactly APPROACHING_FACTOR × threshold is "approaching"
  const boundary = APPROACHING_FACTOR * 0.30;
  check('2f. statusFor at boundary = approaching',
    statusFor(boundary, 0.30) === 'approaching',
    `boundary = ${boundary}`);
  check('2g. statusFor just below boundary = below',
    statusFor(boundary - 0.001, 0.30) === 'below');
}

// ─── 3. computeCycleCrossings with synthetic data ───────────────────────────
{
  // Build a series spanning 2012-01 to 2030-01 with two explicit pump cycles:
  // one near the "2017" window and one near the "2021" window. We anchor
  // timestamps to actual dates (not "now") so each cycle's window has data.
  const startTs = Math.floor(new Date('2012-01-01').getTime() / 1000);
  const endTs = Math.floor(new Date('2030-01-01').getTime() / 1000);
  const totalDays = Math.floor((endTs - startTs) / 86400);
  const closes: number[] = [];
  let p = 100;
  for (let i = 0; i < totalDays; i++) {
    // Sinusoidal pump-and-dump: large pumps centered on 2017-12 and 2021-11
    const dayTs = startTs + i * 86400;
    const yearFrac = (dayTs - startTs) / (365.25 * 86400);
    const pump1 = Math.exp(-Math.pow((yearFrac - 5.95) / 0.4, 2)) * 0.02;
    const pump2 = Math.exp(-Math.pow((yearFrac - 9.85) / 0.4, 2)) * 0.015;
    const cycle = pump1 + pump2 + 0.0005;
    p *= 1 + cycle;
    closes.push(p);
  }
  const timestamps = Array.from({ length: closes.length }, (_, i) => startTs + i * 86400);

  const { risk } = computeRiskSeries(closes, true);
  const crossings = computeCycleCrossings(risk, timestamps, 0.42, timestamps[timestamps.length - 1]);

  check('3. computeCycleCrossings returns one entry per CYCLE_TOP_THRESHOLDS row',
    crossings.length === CYCLE_TOP_THRESHOLDS.length);

  check('3b. synthetic series has peak risk > 0 for every cycle',
    crossings.every(c => c.peakRisk > 0),
    crossings.map(c => `cycle ${c.cycleIndex}: peak=${c.peakRisk} on ${c.peakDate}`).join(', '));

  check('3c. currentCycle flag set on exactly one entry (the last/ongoing cycle)',
    crossings.filter(c => c.currentCycle).length === 1);

  check('3d. every crossing has a peakDate + cycleStart',
    crossings.every(c => c.peakDate && c.cycleStart));
}

// ─── 4. Live BTC fetch + end-to-end threshold validation (§9.6 gate) ────────
{
  console.log('\n🌐 Live BTC fetch (10y) + threshold validation...');
  try {
    const { closes, timestamps, meta } = await fetchDailyCloses('BTC', 5475);
    check('4. live fetch returned > 2500 closes (10y daily)',
      closes.length > 2500,
      `got ${closes.length} closes for ${meta.symbol} via ${meta.source}`);

    const { risk } = computeRiskSeries(closes, true);
    const lastValid = (() => {
      for (let i = risk.length - 1; i >= 0; i--) if (Number.isFinite(risk[i])) return risk[i];
      return 0;
    })();
    const crossings = computeCycleCrossings(risk, timestamps, lastValid, Math.floor(Date.now() / 1000));

    console.log('\n  Per-cycle results:');
    console.log('  ' + '-'.repeat(78));
    console.log(`  ${'cycle'.padEnd(7)} ${'thresh'.padEnd(7)} ${'kind'.padEnd(11)} ${'peakRisk'.padEnd(10)} ${'peakDate'.padEnd(12)} ${'firstCross'.padEnd(14)} ${'daysAbove'.padEnd(10)} ${'topDate'.padEnd(12)} ${'status'}`);
    console.log('  ' + '-'.repeat(78));
    for (const c of crossings) {
      const fc = c.firstCrossDate ?? '—';
      const td = c.topDate ?? '—';
      console.log(`  ${('#' + c.cycleIndex).padEnd(7)} ${c.threshold.toFixed(2).padEnd(7)} ${c.kind.padEnd(11)} ${c.peakRisk.toFixed(3).padEnd(10)} ${c.peakDate.padEnd(12)} ${fc.padEnd(14)} ${String(c.daysAboveThreshold).padEnd(10)} ${td.padEnd(12)} ${c.status}`);
    }
    console.log('  ' + '-'.repeat(78));
    console.log(`  Current risk: ${lastValid.toFixed(4)} | Current threshold: ${CYCLE_TOP_THRESHOLDS[CYCLE_TOP_THRESHOLDS.length - 1].threshold} | Status: ${statusFor(lastValid, CYCLE_TOP_THRESHOLDS[CYCLE_TOP_THRESHOLDS.length - 1].threshold)}`);

    // Per §9.6 — REQUIRED: cycle 2 peak must be >= 0.5 and cycle 3 peak >= 0.4.
    const cycle2 = crossings.find(c => c.cycleIndex === 2);
    const cycle3 = crossings.find(c => c.cycleIndex === 3);
    const cycle4 = crossings.find(c => c.cycleIndex === 4);

    check('4b. cycle 2 (2017) peak risk >= 0.5 — §9.6 gate',
      cycle2 !== undefined && cycle2.peakRisk >= 0.5,
      cycle2 ? `peak=${cycle2.peakRisk.toFixed(3)} on ${cycle2.peakDate}` : 'missing');

    check('4c. cycle 3 (2021) peak risk >= 0.4 — §9.6 gate',
      cycle3 !== undefined && cycle3.peakRisk >= 0.4,
      cycle3 ? `peak=${cycle3.peakRisk.toFixed(3)} on ${cycle3.peakDate}` : 'missing');

    check('4d. cycle 4 (current) firstCrossDate exists — threshold was crossed',
      cycle4 !== undefined && cycle4.firstCrossDate !== null,
      cycle4 ? `first cross: ${cycle4.firstCrossDate} (${cycle4.firstCrossRisk?.toFixed(3)})` : 'missing');

    check('4e. cycle 4 daysAboveThreshold > 0',
      cycle4 !== undefined && cycle4.daysAboveThreshold > 0,
      cycle4 ? `${cycle4.daysAboveThreshold} days above 0.3` : 'missing');

    check('4f. cycle 4 status reflects current risk correctly',
      cycle4 !== undefined && cycle4.status === statusFor(lastValid, cycle4.threshold),
      `crossings.status=${cycle4?.status} | statusFor()=${statusFor(lastValid, 0.3)}`);

  } catch (e: any) {
    check('4. live BTC threshold validation', false, e?.message ?? 'unknown');
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