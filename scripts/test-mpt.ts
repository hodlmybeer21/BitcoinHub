// Smoke test for MPT compute pipeline.
// Runs computeMPT against the locked universe + a sample portfolio.
// Verifies outputs look reasonable.

import { computeMPT } from '../server/mpt';

const PORTFOLIO = [
  { symbol: 'BTC', quantity: 0.5 },
  { symbol: 'IBIT', quantity: 100 },
  { symbol: 'MSTR', quantity: 5 },
];

function pct(n: number, digits: number = 1): string {
  return (n * 100).toFixed(digits) + '%';
}

async function main() {
  console.log('=== MPT SMOKE TEST ===');
  console.log('Portfolio:', JSON.stringify(PORTFOLIO));
  console.log('Cycle: cycle3 (2020-2024)');
  console.log('Risk-free rate: 4.5%');
  console.log('');

  const t0 = Date.now();
  const result = await computeMPT(PORTFOLIO, 'cycle3', 0.045);
  const totalMs = Date.now() - t0;

  console.log('Cycle: ' + result.cycle.label + ' (' + result.cycle.start + ' → ' + result.cycle.end + ')');
  console.log('Assets included: ' + result.symbols.join(', '));
  if (result.excludedAssets.length) {
    const exclStr = result.excludedAssets.map(function(a) { return a.symbol + ' (' + a.reason + ')'; }).join('; ');
    console.log('Excluded: ' + exclStr);
  }
  console.log('Common dates: ' + result.metadata.commonDates);
  console.log('Eval time: ' + result.metadata.evalMs + 'ms (total ' + totalMs + 'ms incl. fetches)');
  console.log('');

  console.log('--- Per-asset stats (annualized) ---');
  for (let i = 0; i < result.symbols.length; i++) {
    const s = result.symbols[i];
    const a = result.perAsset[s];
    const ret = pct(a.meanReturn);
    const vol = pct(a.volatility);
    const sharpe = a.sharpe.toFixed(2);
    const mdd = pct(a.maxDrawdown, 0);
    const total = pct(a.totalReturn, 0);
    console.log('  ' + s.padEnd(5) + '  ret=' + ret.padStart(8) + '  vol=' + vol.padStart(7) + '  sharpe=' + sharpe.padStart(6) + '  mdd=' + mdd.padStart(5) + '  totalRet=' + total.padStart(6));
  }

  console.log('');
  console.log('--- Correlation matrix ---');
  const syms = result.symbols;
  let header = '         ';
  for (let i = 0; i < syms.length; i++) header += syms[i].padStart(8);
  console.log(header);
  for (let i = 0; i < syms.length; i++) {
    let row = syms[i].padEnd(8) + ' ';
    for (let j = 0; j < syms.length; j++) {
      row += result.correlation[i][j].toFixed(2).padStart(8);
    }
    console.log(row);
  }

  console.log('');
  console.log('--- Your portfolio ---');
  console.log('  Value: $' + (result.currentPortfolio.totalValue || 0).toFixed(2));
  console.log('  Weights: ' + JSON.stringify(result.currentPortfolio.weights));
  console.log('  Return: ' + pct(result.currentPortfolio.expectedReturn) + '   Vol: ' + pct(result.currentPortfolio.volatility) + '   Sharpe: ' + result.currentPortfolio.sharpe.toFixed(2));

  console.log('');
  console.log('--- Max Sharpe portfolio ---');
  console.log('  Weights: ' + JSON.stringify(result.maxSharpe.weights));
  console.log('  Return: ' + pct(result.maxSharpe.expectedReturn) + '   Vol: ' + pct(result.maxSharpe.volatility) + '   Sharpe: ' + result.maxSharpe.sharpe.toFixed(2));

  console.log('');
  console.log('--- Min Vol portfolio ---');
  console.log('  Weights: ' + JSON.stringify(result.minVol.weights));
  console.log('  Return: ' + pct(result.minVol.expectedReturn) + '   Vol: ' + pct(result.minVol.volatility) + '   Sharpe: ' + result.minVol.sharpe.toFixed(2));

  console.log('');
  console.log('--- Rebalance trades (current → max-sharpe) ---');
  for (let i = 0; i < result.rebalanceTrades.length; i++) {
    const t = result.rebalanceTrades[i];
    const dir = t.deltaValue >= 0 ? 'BUY ' : 'SELL';
    const from = pct(t.currentWeight);
    const to = pct(t.targetWeight);
    const delta = '$' + t.deltaValue.toFixed(0);
    console.log('  ' + dir + ' ' + t.symbol.padEnd(5) + '  ' + from + ' → ' + to + '  (Δ ' + delta + ')');
  }

  console.log('');
  console.log('--- Frontier metrics ---');
  console.log('  Distance from frontier: ' + pct(result.distanceFromFrontier, 2));
  const impStr = isFinite(result.improvementPotential) ? pct(result.improvementPotential) : 'infinity';
  console.log('  Improvement potential:  ' + impStr);

  // Sanity checks
  console.log('');
  console.log('--- Sanity checks ---');
  let passed = 0;
  let failed = 0;
  function check(label: string, cond: boolean) {
    if (cond) { passed++; console.log('  PASS ' + label); }
    else { failed++; console.log('  FAIL ' + label); }
  }

  check('At least 2 assets included', result.symbols.length >= 2);
  check('Per-asset stats populated for every included asset',
    result.symbols.every(function(s) { return result.perAsset[s] !== undefined; }));
  check('Correlation matrix is square (NxN)',
    result.correlation.length === syms.length &&
    result.correlation.every(function(r) { return r.length === syms.length; }));

  let diagOk = true;
  for (let i = 0; i < syms.length; i++) {
    if (Math.abs(result.correlation[i][i] - 1.0) >= 0.001) diagOk = false;
  }
  check('Diagonal of correlation matrix is ~1.0', diagOk);

  let curSum = 0;
  for (let i = 0; i < syms.length; i++) curSum += result.currentPortfolio.weights[syms[i]];
  check('Current weights sum to 1', Math.abs(curSum - 1) < 0.001);

  let maxSum = 0;
  for (let i = 0; i < syms.length; i++) maxSum += result.maxSharpe.weights[syms[i]];
  check('Max Sharpe weights sum to 1', Math.abs(maxSum - 1) < 0.001);

  check('Max Sharpe Sharpe >= Current Sharpe',
    result.maxSharpe.sharpe >= result.currentPortfolio.sharpe);
  check('Min Vol volatility <= Current volatility',
    result.minVol.volatility <= result.currentPortfolio.volatility);
  check('All annualizations are positive (cycle 3 was a bull)',
    result.symbols.every(function(s) { return result.perAsset[s].meanReturn > 0; }));

  let allCorrPos = true;
  for (let i = 0; i < syms.length; i++) {
    for (let j = 0; j < syms.length; j++) {
      if (i !== j && result.correlation[i][j] <= 0) allCorrPos = false;
    }
  }
  check('Cross-correlations are positive (BTC-correlated universe)', allCorrPos);

  console.log('');
  console.log(passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
}

main().catch(function(e) {
  console.error('');
  console.error('TEST FAILED:', e);
  process.exit(1);
});