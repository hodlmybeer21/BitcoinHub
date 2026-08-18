// BitcoinHub MPT — Main compute orchestrator
// Pulls data, runs stats + optimization, returns full MPTResult.

import { Matrix } from 'ml-matrix';
import {
  CYCLES, UNIVERSE, DEFAULT_RISK_FREE_RATE,
  getCycle, getAsset,
  type MPTAsset,
} from './cycles';
import { fetchAssetPrices } from './data';
import {
  computeLogReturns,
  alignOnCommonDates,
  shrunkCovariance,
  corrFromCov,
  TRADING_DAYS_PER_YEAR,
  totalReturn,
  maxDrawdown,
  mean,
  std,
} from './stats';
import {
  monteCarloOptimize,
  computePortfolioStats,
  computeRebalanceTrades,
  type OptimizationResult,
  type FrontierPoint,
  type RebalanceTrade,
} from './optimize';

export interface Holding {
  symbol: string;
  quantity: number;
}

export interface AssetStats {
  symbol: string;
  meanReturn: number;      // annualized
  volatility: number;       // annualized
  sharpe: number;
  maxDrawdown: number;
  totalReturn: number;
  dataPoints: number;
}

export interface MPTResult {
  cycle: { id: string; label: string; start: string; end: string };
  riskFreeRate: number;
  symbols: string[];                                       // assets actually included
  excludedAssets: { symbol: string; reason: string }[];
  perAsset: Record<string, AssetStats>;
  correlation: number[][];
  currentPortfolio: OptimizationResult & { weights: Record<string, number>; totalValue: number };
  maxSharpe: OptimizationResult & { weights: Record<string, number> };
  minVol: OptimizationResult & { weights: Record<string, number> };
  frontier: {
    cloud: FrontierPoint[];
    maxSharpePoint: FrontierPoint;
    minVolPoint: FrontierPoint;
    userPoint: FrontierPoint;
  };
  distanceFromFrontier: number;                            // excess vol at user's return
  improvementPotential: number;                            // % sharpe gain if rebalanced to max
  rebalanceTrades: RebalanceTrade[];
  metadata: {
    evalMs: number;
    commonDates: number;
    cacheHits: number;
    fetchMs: number;
    computeMs: number;
  };
}

const MIN_DATA_POINTS = 90;                                // ~3 months minimum within the cycle

export async function computeMPT(
  holdings: Holding[],
  cycleId: string,
  riskFreeRate: number = DEFAULT_RISK_FREE_RATE
): Promise<MPTResult> {
  const t0 = Date.now();

  // 1. Validate
  const cycle = getCycle(cycleId);
  const endDate = cycle.end ?? new Date().toISOString().split('T')[0];

  if (!Array.isArray(holdings) || holdings.length === 0) {
    throw new Error('Portfolio must have at least one holding');
  }

  // 2. Resolve assets
  const heldSymbols = [...new Set(holdings.map(h => h.symbol.toUpperCase()))];
  const assetBySymbol = new Map<string, MPTAsset>();
  for (const sym of heldSymbols) {
    try { assetBySymbol.set(sym, getAsset(sym)); } catch { /* unknown */ }
  }

  if (assetBySymbol.size === 0) {
    throw new Error(`No recognized assets. Valid: ${UNIVERSE.map(a => a.symbol).join(', ')}`);
  }

  // 3. Fetch all in parallel
  const tFetch = Date.now();
  const fetchResults = await Promise.allSettled(
    Array.from(assetBySymbol.entries()).map(async ([symbol, assetDef]) => {
      const series = await fetchAssetPrices(assetDef, cycle.start, endDate);
      return { symbol, series };
    })
  );

  // 4. Process results, exclude failures / too-short series
  const seriesBySymbol = new Map<string, { date: string; price: number }[]>();
  const excludedAssets: { symbol: string; reason: string }[] = [];

  for (const [i, result] of fetchResults.entries()) {
    const symbol = Array.from(assetBySymbol.keys())[i];
    if (result.status === 'fulfilled') {
      const { series } = result.value;
      if (series.length < MIN_DATA_POINTS) {
        excludedAssets.push({ symbol, reason: `Insufficient data (${series.length} points)` });
      } else {
        seriesBySymbol.set(symbol, series);
      }
    } else {
      excludedAssets.push({ symbol, reason: (result.reason as Error)?.message ?? 'Fetch failed' });
    }
  }

  const fetchMs = Date.now() - tFetch;

  if (seriesBySymbol.size < 2) {
    throw new Error(
      `At least 2 assets with sufficient data are required. Got ${seriesBySymbol.size}. ` +
      `Excluded: ${excludedAssets.map(a => `${a.symbol} (${a.reason})`).join('; ')}`
    );
  }

  // 5. Align on common dates
  const symbols = Array.from(seriesBySymbol.keys());
  const perAssetSeries = symbols.map(s => seriesBySymbol.get(s)!);
  const { aligned, dates: commonDates } = alignOnCommonDates(perAssetSeries);

  if (commonDates.length < MIN_DATA_POINTS) {
    throw new Error(`Insufficient overlapping dates (${commonDates.length}) across ${symbols.join(', ')}`);
  }

  // 6. Compute log returns per asset (TxN matrix)
  const tCompute = Date.now();
  const returnsByAsset = aligned.map(prices => computeLogReturns(prices));
  const T = returnsByAsset[0].length;
  const N = symbols.length;

  const returnsMatrix: number[][] = [];
  for (let t = 0; t < T; t++) {
    const row: number[] = new Array(N);
    for (let j = 0; j < N; j++) row[j] = returnsByAsset[j][t];
    returnsMatrix.push(row);
  }

  // 7. Per-asset stats (annualized)
  const perAsset: Record<string, AssetStats> = {};
  const mu: number[] = [];

  for (let j = 0; j < N; j++) {
    const returns = returnsByAsset[j];
    const prices = aligned[j];
    const meanDaily = mean(returns);
    const stdDaily = std(returns);
    const meanAnnual = meanDaily * TRADING_DAYS_PER_YEAR;
    const volAnnual = stdDaily * Math.sqrt(TRADING_DAYS_PER_YEAR);
    const sharpe = volAnnual > 0 ? (meanAnnual - riskFreeRate) / volAnnual : 0;

    perAsset[symbols[j]] = {
      symbol: symbols[j],
      meanReturn: meanAnnual,
      volatility: volAnnual,
      sharpe,
      maxDrawdown: maxDrawdown(prices),
      totalReturn: totalReturn(prices),
      dataPoints: prices.length,
    };
    mu.push(meanAnnual);
  }

  // 8. Shrunk covariance (annualized)
  const covDaily = shrunkCovariance(returnsMatrix, 0.2);
  const cov = new Matrix(N, N);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      cov.set(i, j, covDaily.get(i, j) * TRADING_DAYS_PER_YEAR);
    }
  }

  // 9. Correlation
  const correlation = corrFromCov(cov);

  // 10. User's current portfolio weights (mark-to-market using last close)
  const lastPrices = aligned.map(p => p[p.length - 1]);
  const holdingBySym = new Map(holdings.map(h => [h.symbol.toUpperCase(), h.quantity]));
  const valuesBySym = symbols.map(s => (holdingBySym.get(s) ?? 0) * lastPrices[symbols.indexOf(s)]);
  const totalValue = valuesBySym.reduce((a, b) => a + b, 0);

  if (totalValue <= 0) {
    throw new Error('Computed total portfolio value is zero — check holdings quantities');
  }

  const currentWeights = valuesBySym.map(v => v / totalValue);
  const currentStats = computePortfolioStats(currentWeights, mu, cov, riskFreeRate);

  const currentPortfolio = {
    ...currentStats,
    weights: Object.fromEntries(symbols.map((s, i) => [s, currentWeights[i]])),
    totalValue,
  };

  // 11. Optimize (Monte Carlo)
  const optResult = monteCarloOptimize(mu, cov, riskFreeRate, 10000);

  const toOptResult = (o: OptimizationResult): OptimizationResult & { weights: Record<string, number> } => ({
    ...o,
    weights: Object.fromEntries(symbols.map((s, i) => [s, o.weights[i]])),
  });

  const maxSharpe = toOptResult(optResult.maxSharpe);
  const minVol = toOptResult(optResult.minVol);

  // 12. Frontier metrics
  const userPoint: FrontierPoint = {
    return: currentStats.expectedReturn,
    volatility: currentStats.volatility,
    sharpe: currentStats.sharpe,
  };

  const nearUserReturn = optResult.nearFrontierAt(currentStats.expectedReturn);
  const distanceFromFrontier = Math.max(0, currentStats.volatility - nearUserReturn.volatility);

  const improvementPotential =
    currentStats.sharpe > 0
      ? (maxSharpe.sharpe - currentStats.sharpe) / currentStats.sharpe
      : (maxSharpe.sharpe > 0 ? Infinity : 0);

  // 13. Rebalance trades (current → max-sharpe). maxSharpe.weights is a
  // Record (string-keyed) but computeRebalanceTrades expects an array —
  // project it back to array form.
  const rebalanceTrades = computeRebalanceTrades(
    symbols,
    currentWeights,
    symbols.map(s => maxSharpe.weights[s]),
    totalValue
  );

  const computeMs = Date.now() - tCompute;

  return {
    cycle: { id: cycle.id, label: cycle.label, start: cycle.start, end: endDate },
    riskFreeRate,
    symbols,
    excludedAssets,
    perAsset,
    correlation,
    currentPortfolio,
    maxSharpe,
    minVol,
    frontier: {
      cloud: optResult.cloud,
      maxSharpePoint: { return: maxSharpe.expectedReturn, volatility: maxSharpe.volatility, sharpe: maxSharpe.sharpe },
      minVolPoint: { return: minVol.expectedReturn, volatility: minVol.volatility, sharpe: minVol.sharpe },
      userPoint,
    },
    distanceFromFrontier,
    improvementPotential,
    rebalanceTrades,
    metadata: {
      evalMs: Date.now() - t0,
      commonDates: commonDates.length,
      cacheHits: 0,
      fetchMs,
      computeMs,
    },
  };
}

// Re-exports for convenience
export { CYCLES, UNIVERSE, DEFAULT_RISK_FREE_RATE } from './cycles';
export type { MPTAsset, MPTCycle } from './cycles';
export type { RebalanceTrade } from './optimize';