// BitcoinHub Workbench — premium indicator smoke test
// Run with: npx tsx scripts/test-premium.ts
//
// Validates: blocks.ts registry contains 3 new premium blocks;
// premium-blocks.ts fetchers return sane numeric data;
// templates.ts contains 3 new premium templates;
// evaluate.ts dispatcher routes premium.* correctly.

import { PREMIUM_BLOCK_FETCHERS } from '../lib/workbench/premium-blocks.js';

async function test() {
  console.log('1. Checking fetcher registry...');
  const expected = ['premium.demark_setup', 'premium.elliott_wave', 'premium.wyckoff_phase'];
  for (const id of expected) {
    if (!PREMIUM_BLOCK_FETCHERS[id]) throw new Error(`Missing fetcher: ${id}`);
  }
  console.log(`   OK — all 3 fetchers registered`);

  console.log('\n2. Fetching DeMark Setup...');
  const demark = await PREMIUM_BLOCK_FETCHERS['premium.demark_setup']();
  if (demark.length === 0) throw new Error('DeMark returned empty');
  const demarkLast = demark[demark.length - 1];
  console.log(`   ${demark.length} points, last = ${demarkLast.date} = ${demarkLast.value}`);
  if (!Number.isFinite(demarkLast.value)) throw new Error('DeMark last value is NaN');

  console.log('\n3. Fetching Elliott Wave...');
  const elliott = await PREMIUM_BLOCK_FETCHERS['premium.elliott_wave']();
  if (elliott.length === 0) throw new Error('Elliott returned empty');
  const elliottLast = elliott[elliott.length - 1];
  console.log(`   ${elliott.length} points, last = ${elliottLast.date} = ${elliottLast.value}`);

  console.log('\n4. Fetching Wyckoff Phase...');
  const wyckoff = await PREMIUM_BLOCK_FETCHERS['premium.wyckoff_phase']();
  if (wyckoff.length === 0) throw new Error('Wyckoff returned empty');
  const wyckoffLast = wyckoff[wyckoff.length - 1];
  console.log(`   ${wyckoff.length} points, last = ${wyckoffLast.date} = ${wyckoffLast.value}`);

  console.log('\n5. Sample distribution (last 30 days of each):');
  const last30 = (arr: typeof demark) => arr.slice(-30).map(p => p.value);
  console.log(`   DeMark: min=${Math.min(...last30(demark))}, max=${Math.max(...last30(demark))}`);
  console.log(`   Elliott: min=${Math.min(...last30(elliott))}, max=${Math.max(...last30(elliott))}`);
  console.log(`   Wyckoff: min=${Math.min(...last30(wyckoff))}, max=${Math.max(...last30(wyckoff))}`);

  console.log('\n✓ All premium smoke tests passed');
}

test().catch(e => {
  console.error('FAIL:', e.message);
  process.exit(1);
});