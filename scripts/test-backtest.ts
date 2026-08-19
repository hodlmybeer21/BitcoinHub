// BitcoinHub Workbench — backtest smoke test
// Run with: npx tsx scripts/test-backtest.ts
//
// Validates the backtest endpoint end-to-end against prod:
//   - POST /api/workbench/backtest with a simple formula
//   - Returns stats + equity curve
//   - 2016-today range produces ~3500+ data points
//   - Buy & Hold > Strategy for a "do nothing" formula (sanity check)
//   - Buy & Hold < Strategy for a "always in" formula (sanity check)

const HOST = process.env.HOST || 'https://bitcoinhub.goodbotai.tech';

interface BacktestStats {
  totalReturnPct: number;
  annualizedReturnPct: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
  winRatePct: number;
  exposurePct: number;
  numTrades: number;
  signalDays: number;
  totalDays: number;
  buyHoldReturnPct: number;
  alphaPct: number;
}

interface BacktestResult {
  formula: string;
  range: { start: string; end: string; actualStart: string; actualEnd: string };
  stats: BacktestStats;
  equityCurve: Array<{ date: string; strategy: number; buyHold: number }>;
}

async function runBacktest(formula: string, range: { start: string; end: string }): Promise<BacktestResult> {
  const res = await fetch(`${HOST}/api/workbench/backtest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ formula, range }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`Backtest error: ${json.error}`);
  return json;
}

function assert(cond: any, msg: string) {
  if (!cond) {
    console.error('  ❌', msg);
    process.exit(1);
  } else {
    console.log('  ✓', msg);
  }
}

async function test() {
  console.log('1. Always-in strategy (signal = 1, should ≈ buy & hold)...');
  // "sma(btc.price, 1) > 0" is always true — long-only entire period
  const r1 = await runBacktest('sma(btc.price, 1) > 0', { start: '2016-01-01', end: new Date().toISOString().slice(0, 10) });
  console.log(`   range: ${r1.range.actualStart} → ${r1.range.actualEnd}`);
  console.log(`   days: ${r1.stats.totalDays}, trades: ${r1.stats.numTrades}, exposure: ${r1.stats.exposurePct.toFixed(1)}%`);
  console.log(`   strategy: ${r1.stats.totalReturnPct.toFixed(1)}%, buy&hold: ${r1.stats.buyHoldReturnPct.toFixed(1)}%, sharpe: ${r1.stats.sharpeRatio.toFixed(2)}`);
  assert(r1.stats.totalDays >= 3500, `at least 3500 days (got ${r1.stats.totalDays})`);
  assert(r1.stats.exposurePct > 99, `exposure ≈ 100% (got ${r1.stats.exposurePct.toFixed(1)}%)`);
  assert(Math.abs(r1.stats.totalReturnPct - r1.stats.buyHoldReturnPct) < 1, `strategy ≈ buy&hold (alpha ${r1.stats.alphaPct.toFixed(2)}%)`);
  assert(r1.equityCurve.length === r1.stats.totalDays, `equityCurve length = totalDays`);

  console.log('\n2. Always-out strategy (signal = 0, should be flat at 1.0)...');
  const r2 = await runBacktest('fear_greed.value < 0', { start: '2016-01-01', end: new Date().toISOString().slice(0, 10) });
  console.log(`   days: ${r2.stats.totalDays}, exposure: ${r2.stats.exposurePct.toFixed(1)}%`);
  console.log(`   strategy: ${r2.stats.totalReturnPct.toFixed(2)}%, buy&hold: ${r2.stats.buyHoldReturnPct.toFixed(1)}%`);
  assert(r2.stats.exposurePct < 1, `exposure ≈ 0% (got ${r2.stats.exposurePct.toFixed(1)}%)`);
  assert(Math.abs(r2.stats.totalReturnPct) < 1, `strategy ≈ 0% (got ${r2.stats.totalReturnPct.toFixed(2)}%)`);
  // Buy & hold should still show BTC appreciation
  assert(r2.stats.buyHoldReturnPct > 100, `buy & hold shows BTC appreciation (got ${r2.stats.buyHoldReturnPct.toFixed(0)}%)`);

  console.log('\n3. Fear-greed strategy (long when F&G < 25 — extreme fear)...');
  // F&G only has data from 2018-02-01, so range will auto-shrink
  const r3 = await runBacktest('fear_greed.value < 25', { start: '2016-01-01', end: new Date().toISOString().slice(0, 10) });
  console.log(`   actual range: ${r3.range.actualStart} → ${r3.range.actualEnd}`);
  console.log(`   days: ${r3.stats.totalDays}, trades: ${r3.stats.numTrades}, exposure: ${r3.stats.exposurePct.toFixed(1)}%`);
  console.log(`   strategy: ${r3.stats.totalReturnPct.toFixed(1)}%, buy&hold: ${r3.stats.buyHoldReturnPct.toFixed(1)}%`);
  console.log(`   sharpe: ${r3.stats.sharpeRatio.toFixed(2)}, maxDD: ${r3.stats.maxDrawdownPct.toFixed(1)}%, winRate: ${r3.stats.winRatePct.toFixed(1)}%`);
  assert(r3.range.actualStart >= '2018-02-01', `actualStart reflects F&G data (got ${r3.range.actualStart})`);
  assert(r3.stats.numTrades >= 2, `at least 2 round-trip trades (got ${r3.stats.numTrades})`);

  console.log('\n4. Cross-above MA50 (50d MA crosses above price — typical exit signal)...');
  const r4 = await runBacktest('crosses_above(sma(btc.price, 50), btc.price)', { start: '2016-01-01', end: new Date().toISOString().slice(0, 10) });
  console.log(`   days: ${r4.stats.totalDays}, trades: ${r4.stats.numTrades}, exposure: ${r4.stats.exposurePct.toFixed(1)}%`);
  console.log(`   strategy: ${r4.stats.totalReturnPct.toFixed(1)}%, buy&hold: ${r4.stats.buyHoldReturnPct.toFixed(1)}%`);
  assert(r4.stats.numTrades >= 5, `at least 5 MA50 crosses (got ${r4.stats.numTrades})`);

  console.log('\n✓ All backtest smoke tests passed');
}

test().catch(e => {
  console.error('FAIL:', e.message);
  process.exit(1);
});