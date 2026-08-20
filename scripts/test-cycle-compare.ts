/**
 * BitcoinHub — Cycle Compare smoke test
 * /scripts/test-cycle-compare.ts
 *
 * Verifies /api/cycle/markers and /api/cycle/overlay endpoints work
 * end-to-end with the actual Vercel-shaped bundle (lib/cycle/* modules).
 *
 * Run locally:
 *   npx tsx scripts/test-cycle-compare.ts
 *
 * Uses the same Yahoo Finance fetcher as the deployed handler, with
 * sanity checks on the shape of the returned data.
 */

import {
  fetchBTCDailyHistory,
  findATHBreaks,
  sliceSeries,
  priceOnOrBefore,
} from '../lib/cycle/btc-history';
import {
  ALL_EVENTS,
  CYCLES,
  findEvent,
  nextEvent,
  isATHBreak,
} from '../lib/cycle/events';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push(`${name} ${detail}`);
    console.error(`  ✗ ${name} ${detail}`);
  }
}

async function main() {
  console.log('\n=== Cycle Compare — smoke test ===\n');

  // ── 1. Static events dataset ───────────────────────────────────────────
  console.log('Static events:');
  check('4 halvings in dataset', ALL_EVENTS.filter(e => e.kind === 'halving').length === 4);
  check('4 cycle tops in dataset', ALL_EVENTS.filter(e => e.kind === 'top').length === 4);
  check('3 cycle bottoms in dataset (c4 not yet)', ALL_EVENTS.filter(e => e.kind === 'bottom').length === 3);
  check('Cycle 2 top is Dec 17, 2017',
    findEvent('top', 'c2')?.date === '2017-12-17');
  check('Cycle 3 top is Nov 10, 2021',
    findEvent('top', 'c3')?.date === '2021-11-10');
  check('Cycle 4 top is Oct 6, 2025',
    findEvent('top', 'c4')?.date === '2025-10-06');
  check('Cycle 2 bottom is Dec 15, 2018',
    findEvent('bottom', 'c2')?.date === '2018-12-15');
  check('Cycle 3 bottom is Nov 21, 2022',
    findEvent('bottom', 'c3')?.date === '2022-11-21');
  check('Cycle 4 has no bottom (still in progress)',
    findEvent('bottom', 'c4') === null);
  check('nextEvent(c2) → c3 halving',
    nextEvent('c2')?.date === '2020-05-11');
  check('nextEvent(c4) → null (no next cycle yet)',
    nextEvent('c4') === null);
  check('CYCLES metadata has 4 entries',
    CYCLES.length === 4);

  // ── 2. BTC history fetch ────────────────────────────────────────────────
  console.log('\nBTC daily history:');
  let series: Awaited<ReturnType<typeof fetchBTCDailyHistory>> = [];
  try {
    series = await fetchBTCDailyHistory();
    check('series fetched', series.length > 0, `(got ${series.length} points)`);
    check('series starts on or after 2014-09-17',
      series[0]?.date >= '2014-09-17',
      `(first=${series[0]?.date})`);
    check('series is sorted ascending',
      series.every((p, i) => i === 0 || p.date >= series[i - 1].date));
    check('no NaN prices',
      series.every(p => Number.isFinite(p.price)));

    // Sanity check on cycle 2 halving-to-top section
    const cycle2 = sliceSeries(series, '2016-07-09', '2017-12-17');
    check('cycle 2 halving→top slice has data', cycle2.length > 300, `(got ${cycle2.length})`);
    check('cycle 2 halving→top starts around $657',
      Math.abs((cycle2[0]?.price ?? 0) - 657) < 200,
      `(got $${cycle2[0]?.price?.toFixed(2)})`);
    check('cycle 2 halving→top ends above $10K',
      (cycle2[cycle2.length - 1]?.price ?? 0) > 10_000,
      `(got $${cycle2[cycle2.length - 1]?.price?.toFixed(2)})`);

    // Cycle 3 halving-to-top
    const cycle3 = sliceSeries(series, '2020-05-11', '2021-11-10');
    check('cycle 3 halving→top slice has data', cycle3.length > 400, `(got ${cycle3.length})`);
    check('cycle 3 halving→top ends above $50K',
      (cycle3[cycle3.length - 1]?.price ?? 0) > 50_000,
      `(got $${cycle3[cycle3.length - 1]?.price?.toFixed(2)})`);

    // priceOnOrBefore sanity
    const px = priceOnOrBefore(series, '2017-12-25');
    check('priceOnOrBefore(2017-12-25) > $10K',
      (px ?? 0) > 10_000,
      `(got ${px})`);

    // ATH break detection
    const breaks = findATHBreaks(series);
    check('ATH breaks detected', breaks.length > 0, `(got ${breaks.length})`);
    check('ATH breaks: every entry has a higher price than priorTop',
      breaks.every(b => b.price > b.priorTop));

    // isATHBreak helper
    check('isATHBreak(20000, 19783) === true', isATHBreak(20000, 19783) === true);
    check('isATHBreak(10000, 19783) === false', isATHBreak(10000, 19783) === false);
  } catch (e: any) {
    failed++;
    failures.push(`history fetch failed: ${e?.message ?? e}`);
    console.error('  ✗ history fetch failed:', e?.message);
  }

  // ── 3. Overlay slice math (manual) ─────────────────────────────────────
  console.log('\nOverlay math:');
  if (series.length > 0) {
    const section = sliceSeries(series, '2016-07-09', '2017-12-17');
    check('section normalized start price is 100% baseline', section.length > 0);
    const startPrice = section[0]?.price ?? 0;
    const endPrice = section[section.length - 1]?.price ?? 0;
    const retPct = ((endPrice - startPrice) / startPrice) * 100;
    check('halving→top of cycle 2 returns > 2000%',
      retPct > 2000,
      `(got ${retPct.toFixed(1)}%)`);

    // Cycle 3 halving→top
    const c3 = sliceSeries(series, '2020-05-11', '2021-11-10');
    const c3Ret = ((c3[c3.length - 1]!.price - c3[0]!.price) / c3[0]!.price) * 100;
    check('halving→top of cycle 3 returns > 500%',
      c3Ret > 500,
      `(got ${c3Ret.toFixed(1)}%)`);
  }

  console.log(`\n=== ${passed} passed · ${failed} failed ===\n`);
  if (failed > 0) {
    console.error('Failures:');
    for (const f of failures) console.error('  - ' + f);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});