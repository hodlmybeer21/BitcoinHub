// Tests for the audit PR3a fixes (B5, B6, D1–D6). Reference values are the ones
// recorded in /workspace/bitcoinhub-audit/findings.md from FRED/Coinbase on 2026-10-24.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFredCsv, yoyPct, momPct, bpChange, onOrBefore } from '../../../shared/fred-math';
import { compactUsd } from '../../../shared/format-usd';
import { weeklyCloses, sma, changeOverDays } from '../../../lib/cycle/live-math';
import { parseInstrument, parseOptions, aggregate, topStrikes } from '../../../lib/options/deribit';
import { calculateDCA, mergeMonthly, monthlyAveragesFromDaily, BTC_MONTHLY_PRICES } from '../../../api/dca-simulator';
import { windowStatus, windowPhrase } from './cycleWindow';

test('parseFredCsv drops "." and header, sorts ascending', () => {
  const pts = parseFredCsv('observation_date,DGS10\n2026-10-22,4.96\n2026-10-21,.\n2026-10-15,5.10\n');
  assert.deepEqual(pts, [{ date: '2026-10-15', value: 5.10 }, { date: '2026-10-22', value: 4.96 }]);
});

test('DGS10 deltas are basis points by calendar date (audit D4)', () => {
  const pts = [
    { date: '2026-09-22', value: 4.96 },
    { date: '2026-10-01', value: 5.02 },
    { date: '2026-10-15', value: 5.10 },
    { date: '2026-10-20', value: 5.00 },
    { date: '2026-10-22', value: 4.96 },
  ];
  assert.equal(bpChange(pts, 7), -14);
  assert.equal(bpChange(pts, 30), 0);
  assert.equal(onOrBefore(pts, '2026-10-16')?.value, 5.10);
});

test('M2SL is in billions: $23,342.8B -> $23.34T, YoY positive (audit D1/D2)', () => {
  const pts = [
    { date: '2025-08-01', value: 22092.6 },
    { date: '2025-09-01', value: 22150 },
    { date: '2026-07-01', value: 23300 },
    { date: '2026-08-01', value: 23342.8 },
  ];
  const last = pts[pts.length - 1].value;
  assert.equal((last / 1e3).toFixed(2), '23.34');
  assert.equal(yoyPct(pts)!.toFixed(1), '5.7');
  assert.ok(momPct(pts)! > 0);
});

test('CPI YoY from CPIAUCSL (audit D3)', () => {
  const pts = [{ date: '2025-09-01', value: 324.245 }, { date: '2026-09-01', value: 336.298 }];
  assert.equal(yoyPct(pts)!.toFixed(1), '3.7');
  assert.equal(yoyPct([{ date: '2026-09-01', value: 1 }]), null);
});

test('200-week SMA uses completed Sunday-ending weeks only (audit B5)', () => {
  const daily = [] as { date: string; price: number }[];
  const start = Date.UTC(2022, 0, 3); // Monday
  for (let i = 0; i < 7 * 205; i++) daily.push({ date: new Date(start + i * 86400000).toISOString().slice(0, 10), price: 1000 + Math.floor(i / 7) });
  const now = new Date(start + (7 * 205 - 3) * 86400000); // mid-week of the last week
  const w = weeklyCloses(daily, now);
  assert.equal(w.length, 204);
  assert.equal(w[w.length - 1], 1000 + 203);
  assert.equal(sma(w, 200), w.slice(-200).reduce((a, b) => a + b, 0) / 200);
  assert.equal(sma([1, 2], 200), null);
  assert.equal(changeOverDays([{ date: '2026-10-01', price: 100 }, { date: '2026-10-08', price: 110 }], 7)!.toFixed(1), '10.0');
});

test('Deribit v2 instrument parsing and USD notional (audit B6)', () => {
  assert.deepEqual(parseInstrument('BTC-27NOV26-73000-P'), { expiry: '27NOV26', strike: 73000, type: 'put' });
  assert.equal(parseInstrument('BTC-PERPETUAL'), null);
  const opts = parseOptions([
    { instrument_name: 'BTC-27NOV26-73000-P', open_interest: 10, underlying_price: 80000, mark_iv: 40, mark_price: 0.01, volume_usd: 5000 },
    { instrument_name: 'BTC-25DEC26-73000-P', open_interest: 5, underlying_price: 81000, mark_iv: 50, mark_price: 0.02, volume_usd: 1000 },
    { instrument_name: 'BTC-27NOV26-90000-C', open_interest: 20, underlying_price: 80000, mark_iv: 45, mark_price: 0.005 },
  ]);
  const agg = aggregate(opts);
  assert.equal(agg.totalOI, 10 * 80000 + 5 * 81000 + 20 * 80000);
  assert.equal(agg.sentiment, 'bullish');
  const top = topStrikes(opts, 5);
  assert.equal(top[0].strike, 90000);
  assert.equal(top[1].openInterest, 10 * 80000 + 5 * 81000);
  assert.equal(compactUsd(2_840_000_000), '$2.84B');
  assert.equal(compactUsd(234_000_000), '$234.0M');
});

test('DCA: live months extend the table, live spot is "now", no $$ (audit D5)', () => {
  const t0 = Date.UTC(2026, 9, 1) / 1000;
  const live = monthlyAveragesFromDaily([t0, t0 + 86400, t0 - 86400], [100000, 80000, 90000]);
  assert.deepEqual(live, { '2026-10': 90000, '2026-09': 90000 });
  const merged = mergeMonthly(BTC_MONTHLY_PRICES, { ...live, '2025-03': 1 });
  assert.equal(merged['2025-03'], BTC_MONTHLY_PRICES['2025-03']); // table wins
  const r = calculateDCA(100, 2026, merged, { price: 80573, source: 'Coinbase' }, new Date(Date.UTC(2026, 9, 24)));
  assert.equal(r.monthsInvested, 2);
  assert.equal(r.priceNow, 80573);
  assert.equal(r.pricesThrough, '2026-10');
  assert.match(r.priceNowSource, /Coinbase spot/);
  const fb = calculateDCA(100, 2024, BTC_MONTHLY_PRICES, null, new Date(Date.UTC(2026, 9, 24)));
  assert.match(fb.priceNowSource, /live price unavailable/);
});

test('Q4-2026 window phrase: open on Oct 24, 2026 (audit D6)', () => {
  const s = windowStatus('2026-08-01T00:00:00Z', new Date('2026-10-24T13:00:00Z'));
  assert.deepEqual(s, { phase: 'open', weeksSinceOpen: 12 });
  assert.match(windowPhrase(s), /open now: it opened Aug 1, 2026 \(12 weeks ago\)/);
  assert.equal(windowStatus('2026-08-01T00:00:00Z', new Date('2026-07-01T00:00:00Z')).phase, 'before');
  assert.equal(windowStatus('2026-08-01T00:00:00Z', new Date('2026-11-02T00:00:00Z')).phase, 'closed');
});

test('parseFredApiJson drops missing values and sorts by date', async () => {
  const { parseFredApiJson } = await import('../../../lib/macro/fred-csv.ts');
  const pts = parseFredApiJson({ observations: [
    { date: '2026-09-01', value: '22390.1' }, { date: '2026-08-01', value: '.' }, { date: '2026-07-01', value: '22300.5' },
  ] });
  assert.deepEqual(pts, [{ date: '2026-07-01', value: 22300.5 }, { date: '2026-09-01', value: 22390.1 }]);
});
