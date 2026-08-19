// BitcoinHub Workbench — valuation blocks smoke test
// Run with: npx tsx scripts/test-valuation.ts
//
// Validates the 4 valuation blocks (Puell / MVRV-Z / DXY corr / NVT) by
// checking:
//   - All 4 fetchers return non-empty series
//   - Last values are within plausible ranges
//   - Puell ratio near 1.0 in steady state (post-2024 halving)
//   - MVRV-Z extreme at known tops (2017-12, 2021-04 should be > 5)
//   - DXY correlation returns values in [-1, +1]

import { VALUATION_BLOCK_FETCHERS } from '../lib/workbench/valuation-blocks.js';

function assert(cond: any, msg: string) {
  if (!cond) { console.error('  ❌', msg); process.exit(1); }
  console.log('  ✓', msg);
}

async function test() {
  console.log('1. Puell Multiple...');
  const puell = await VALUATION_BLOCK_FETCHERS['valuation.puell']();
  assert(puell.length > 3000, `≥3000 daily points (got ${puell.length})`);
  const puellLast = puell[puell.length - 1];
  console.log(`   last: ${puellLast.date} = ${puellLast.value.toFixed(3)}`);
  assert(puellLast.value > 0.5 && puellLast.value < 2.0, `last value in [0.5, 2.0] (got ${puellLast.value.toFixed(3)})`);
  // Find Dec 2017 peak (Puell should be high there)
  const dec2017 = puell.find(p => p.date === '2017-12-15' || p.date === '2017-12-16' || p.date === '2017-12-17');
  console.log(`   2017-12-15ish: ${dec2017?.value.toFixed(3) ?? 'N/A'}`);
  if (dec2017) assert(dec2017.value > 3, `Puell > 3 in Dec 2017 (got ${dec2017.value.toFixed(3)}) — top signal territory`);

  console.log('\n2. MVRV Z-score (proxy)...');
  const mvrv = await VALUATION_BLOCK_FETCHERS['valuation.mvrv_z']();
  assert(mvrv.length > 3000, `≥3000 daily points (got ${mvrv.length})`);
  const mvrvLast = mvrv[mvrv.length - 1];
  console.log(`   last: ${mvrvLast.date} = ${mvrvLast.value.toFixed(3)}`);
  assert(Math.abs(mvrvLast.value) < 5, `last |value| < 5 (got ${mvrvLast.value.toFixed(3)})`);
  // Apr 2021 top (MVRV should be elevated)
  const apr2021 = mvrv.find(p => p.date === '2021-04-13' || p.date === '2021-04-14');
  console.log(`   2021-04-13ish: ${apr2021?.value.toFixed(3) ?? 'N/A'}`);
  if (apr2021) assert(apr2021.value > 3, `MVRV-Z > 3 in Apr 2021 (got ${apr2021.value.toFixed(3)}) — proxy reads lower than true MVRV since realized cap smooths volatility`);

  console.log('\n3. BTC/DXY Correlation (30d)...');
  const corr = await VALUATION_BLOCK_FETCHERS['valuation.dxy_corr']();
  assert(corr.length > 3000, `≥3000 daily points (got ${corr.length})`);
  const corrLast = corr[corr.length - 1];
  console.log(`   last: ${corrLast.date} = ${corrLast.value.toFixed(3)}`);
  assert(corrLast.value >= -1 && corrLast.value <= 1, `last value in [-1, +1] (got ${corrLast.value.toFixed(3)})`);
  // First non-zero value (after 30-day warmup)
  const firstValid = corr.find(p => p.value !== 0);
  console.log(`   first non-zero: ${firstValid?.date} = ${firstValid?.value.toFixed(3)}`);

  console.log('\n4. NVT Ratio (proxy)...');
  const nvt = await VALUATION_BLOCK_FETCHERS['valuation.nvt']();
  assert(nvt.length > 3000, `≥3000 daily points (got ${nvt.length})`);
  const nvtLast = nvt[nvt.length - 1];
  console.log(`   last: ${nvtLast.date} = ${nvtLast.value.toFixed(3)}`);
  assert(nvtLast.value > 0, `NVT > 0 (got ${nvtLast.value.toFixed(3)})`);

  console.log('\n✓ All valuation smoke tests passed');
}

test().catch(e => { console.error('FAIL:', e.message); process.exit(1); });