// Audit PR 3b: Fear & Greed summary, MPT rebalance shape (B12), per-route meta (I3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeFng, classifyFng } from '../../../lib/sentiment/fng.ts';
import { computeRebalanceTrades } from '../../../lib/mpt/compute.ts';
import { metaForPath, SITE_ORIGIN } from './routeMeta.ts';

test('summarizeFng uses real rows: yesterday, last week, yearly high/low', () => {
  const day = 86400;
  const rows = [30, 35, 40, 45, 50, 55, 60, 65, 90, 10].map((v, i) => ({ value: String(v), timestamp: String(1_790_000_000 - i * day) }));
  const s = summarizeFng(rows);
  assert.equal(s.currentValue, 30);
  assert.equal(s.classification, 'Fear');
  assert.equal(s.yesterday, 35);
  assert.equal(s.lastWeek, 65);
  assert.equal(s.yearlyHigh.value, 90);
  assert.equal(s.yearlyLow.value, 10);
  assert.equal(s.daysInWindow, 10);
});

test('summarizeFng returns null (not a made-up value) when history is short', () => {
  const s = summarizeFng([{ value: 70, timestamp: 1_790_000_000 }]);
  assert.equal(s.yesterday, null);
  assert.equal(s.lastWeek, null);
  assert.throws(() => summarizeFng([]));
});

test('classifyFng bands', () => {
  assert.equal(classifyFng(10), 'Extreme Fear');
  assert.equal(classifyFng(52), 'Neutral');
  assert.equal(classifyFng(80), 'Extreme Greed');
});

test('computeRebalanceTrades returns the fields the MPT table renders, all finite', () => {
  const t = computeRebalanceTrades(['BTC', 'MSTR'], [0.8, 0.2], [0.6, 0.4], 10_000);
  assert.equal(t.length, 2);
  for (const r of t) for (const k of ['currentWeight', 'targetWeight', 'deltaWeight', 'deltaValue'] as const) assert.ok(Number.isFinite(r[k]), k);
  assert.ok(Math.abs(t[0].deltaValue + 2000) < 1e-6);
  assert.equal(t[0].action, 'sell');
  assert.ok(Math.abs(t[1].deltaValue - 2000) < 1e-6);
});

test('computeRebalanceTrades never emits NaN for bad inputs', () => {
  assert.deepEqual(computeRebalanceTrades(['BTC'], [NaN], [0.5], NaN), []);
});

test('metaForPath gives per-route title and canonical', () => {
  const c = metaForPath('/cycle');
  assert.match(c.title, /4-Year Bitcoin Cycle/);
  assert.equal(c.canonical, SITE_ORIGIN + '/cycle');
  assert.equal(metaForPath('/cycle/?x=1').canonical, SITE_ORIGIN + '/cycle');
  assert.equal(metaForPath('/').canonical, SITE_ORIGIN);
  assert.match(metaForPath('/workbench/backtests/abc').title, /Backtest/);
  assert.match(metaForPath('/nope').title, /BitcoinHub/);
});

test('auction parser groups reopenings by original term and skips TIPS / unheld auctions', async () => {
  const { parseRows } = await import('../../../lib/treasury/auctions.ts');
  const rows = parseRows([
    { record_date: '2026-10-15', auction_date: '2026-10-08', security_term: '29-Year 10-Month', original_security_term: '30-Year', inflation_index_security: 'No', bid_to_cover_ratio: '2.54', offering_amt: '22000000000' },
    { record_date: '2026-08-31', auction_date: '2026-08-20', security_term: '29-Year 6-Month', original_security_term: '30-Year', inflation_index_security: 'Yes', bid_to_cover_ratio: '2.82' },
    { record_date: '2026-10-23', auction_date: '2026-10-21', security_term: '30-Year', original_security_term: '30-Year', inflation_index_security: 'No', bid_to_cover_ratio: 'null' },
    { record_date: '2026-08-17', auction_date: '2026-08-13', security_term: '30-Year', original_security_term: '30-Year', inflation_index_security: 'No', bid_to_cover_ratio: '2.39' },
  ]);
  assert.deepEqual(rows.map(r => [r.auction_date, r.security_term]), [['2026-10-08', '30-Year'], ['2026-08-13', '30-Year']]);
});
