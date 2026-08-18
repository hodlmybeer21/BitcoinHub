// BitcoinHub MPT — /api/mpt/compute
// Self-contained Vercel serverless function.
// Inlines all MPT math as vanilla TypeScript — no ml-matrix, no seedrandom.
// Mirrors the api/dca-simulator.ts bundling pattern.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// ============================================================================
// Types
// ============================================================================

interface Holding { symbol: string; quantity: number; }

interface MPTAsset {
  symbol: string;
  name: string;
  source: 'yahoo';
  yahooSymbol: string;
  firstAvailable: string;
}

interface Cycle {
  id: string;
  label: string;
  start: string;
  end: string;
}

interface PricePoint { date: string; price: number; }

interface AssetStats {
  symbol: string;
  meanReturn: number;
  volatility: number;
  sharpe: number;
  maxDrawdown: number;
  totalReturn: number;
  dataPoints: number;
}

interface OptimizationResult {
  expectedReturn: number;
  volatility: number;
  sharpe: number;
  weights: number[];
}

interface FrontierPoint {
  return: number;
  volatility: number;
  sharpe: number;
}

interface RebalanceTrade {
  symbol: string;
  action: 'buy' | 'sell';
  shares: number;
  notional: number;
}

interface MPTResult {
  cycle: { id: string; label: string; start: string; end: string };
  riskFreeRate: number;
  symbols: string[];
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
  distanceFromFrontier: number;
  improvementPotential: number;
  rebalanceTrades: RebalanceTrade[];
  metadata: {
    evalMs: number;
    commonDates: number;
    cacheHits: number;
    fetchMs: number;
    computeMs: number;
  };
}

// ============================================================================
// Constants — universe + cycles
// ============================================================================

const UNIVERSE: MPTAsset[] = [
  { symbol: 'BTC',  name: 'Bitcoin',                       source: 'yahoo', yahooSymbol: 'BTC-USD', firstAvailable: '2014-09-17' },
  { symbol: 'IBIT', name: 'iShares Bitcoin Trust',         source: 'yahoo', yahooSymbol: 'IBIT',    firstAvailable: '2024-01-11' },
  { symbol: 'FBTC', name: 'Fidelity Wise Origin Bitcoin',  source: 'yahoo', yahooSymbol: 'FBTC',    firstAvailable: '2024-01-11' },
  { symbol: 'MSTR', name: 'MicroStrategy',                 source: 'yahoo', yahooSymbol: 'MSTR',    firstAvailable: '2014-09-17' },
  { symbol: 'COIN', name: 'Coinbase',                      source: 'yahoo', yahooSymbol: 'COIN',    firstAvailable: '2021-04-14' },
  { symbol: 'MARA', name: 'Marathon Digital',              source: 'yahoo', yahooSymbol: 'MARA',    firstAvailable: '2014-09-17' },
  { symbol: 'RIOT', name: 'Riot Platforms',                source: 'yahoo', yahooSymbol: 'RIOT',    firstAvailable: '2014-09-17' },
];

const CYCLES: Cycle[] = [
  { id: 'cycle1', label: 'Cycle 1 (2012 halving)', start: '2013-01-01', end: '2016-07-08' },
  { id: 'cycle2', label: 'Cycle 2 (2016 halving)', start: '2016-07-09', end: '2020-05-10' },
  { id: 'cycle3', label: 'Cycle 3 (2020 halving)', start: '2020-05-11', end: '2024-04-19' },
  { id: 'cycle4', label: 'Cycle 4 (2024 halving)', start: '2024-04-20', end: '2028-04-01' },
];

const DEFAULT_RISK_FREE_RATE = 0.045;
const TRADING_DAYS_PER_YEAR = 365;
const MIN_DATA_POINTS = 90;
const MONTE_CARLO_SAMPLES = 10000;

// ============================================================================
// Vanilla math — mulberry32 PRNG, Dirichlet, covariance, etc.
// ============================================================================

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Gamma sampler (Marsaglia-Tsang) for Dirichlet — pure JS, no deps.
function sampleGamma(rng: () => number, shape: number): number {
  if (shape < 1) {
    const u = rng();
    return sampleGamma(rng, shape + 1) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x: number, v: number;
    do {
      x = sampleNormal(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

// Box-Muller for standard normal.
function sampleNormal(rng: () => number): number {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function sampleDirichlet(rng: () => number, n: number): number[] {
  const gammas = new Array(n).fill(0).map(() => sampleGamma(rng, 1));
  const sum = gammas.reduce((a, b) => a + b, 0);
  return gammas.map(g => g / sum);
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < xs.length; i++) s += xs[i];
  return s / xs.length;
}

function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let s = 0;
  for (let i = 0; i < xs.length; i++) s += (xs[i] - m) ** 2;
  return Math.sqrt(s / (xs.length - 1));
}

function totalReturn(prices: number[]): number {
  if (prices.length < 2) return 0;
  return prices[prices.length - 1] / prices[0] - 1;
}

function maxDrawdown(prices: number[]): number {
  if (prices.length < 2) return 0;
  let peak = prices[0];
  let maxDD = 0;
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > peak) peak = prices[i];
    const dd = peak === 0 ? 0 : (prices[i] - peak) / peak;
    if (dd < maxDD) maxDD = dd;
  }
  return maxDD;
}

function computeLogReturns(prices: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > 0 && prices[i - 1] > 0) {
      out.push(Math.log(prices[i] / prices[i - 1]));
    }
  }
  return out;
}

function alignOnCommonDates(series: PricePoint[][]): { aligned: number[][]; dates: string[] } {
  const dateCounts = new Map<string, number>();
  for (const s of series) for (const p of s) dateCounts.set(p.date, (dateCounts.get(p.date) ?? 0) + 1);
  const commonDates = Array.from(dateCounts.entries())
    .filter(([_, c]) => c === series.length)
    .map(([d]) => d)
    .sort();
  const aligned = series.map(s => {
    const m = new Map(s.map(p => [p.date, p.price]));
    return commonDates.map(d => m.get(d) ?? NaN);
  }).map(arr => arr.filter(v => !Number.isNaN(v)));
  return { aligned, dates: commonDates };
}

// Ledoit-Wolf shrinkage covariance on a TxN returns matrix.
function shrunkCovariance(returnsMatrix: number[][], shrinkage: number = 0.2): number[][] {
  const T = returnsMatrix.length;
  const N = returnsMatrix[0].length;
  // Per-asset mean
  const means = new Array(N).fill(0);
  for (let t = 0; t < T; t++) for (let j = 0; j < N; j++) means[j] += returnsMatrix[t][j];
  for (let j = 0; j < N; j++) means[j] /= T;
  // Sample covariance
  const sample: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    for (let j = i; j < N; j++) {
      let s = 0;
      for (let t = 0; t < T; t++) s += (returnsMatrix[t][i] - means[i]) * (returnsMatrix[t][j] - means[j]);
      s /= (T - 1);
      sample[i][j] = s;
      sample[j][i] = s;
    }
  }
  // Shrinkage target: diagonal of average variance
  const avgVar = (() => {
    let s = 0;
    for (let i = 0; i < N; i++) s += sample[i][i];
    return s / N;
  })();
  const target: number[][] = Array.from({ length: N }, (_, i) =>
    Array.from({ length: N }, (_, j) => (i === j ? avgVar : 0))
  );
  // Blend
  const out: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      out[i][j] = (1 - shrinkage) * sample[i][j] + shrinkage * target[i][j];
    }
  }
  return out;
}

function corrFromCov(cov: number[][]): number[][] {
  const N = cov.length;
  const std = new Array(N);
  for (let i = 0; i < N; i++) std[i] = Math.sqrt(Math.max(cov[i][i], 0));
  const out: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const denom = std[i] * std[j];
      out[i][j] = denom > 0 ? cov[i][j] / denom : 0;
    }
  }
  return out;
}

// Matrix * vector (NxN) * (N).
function matVecMul(mat: number[][], vec: number[]): number[] {
  const N = vec.length;
  const out = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (let j = 0; j < N; j++) s += mat[i][j] * vec[j];
    out[i] = s;
  }
  return out;
}

function vecDot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function computePortfolioStats(w: number[], mu: number[], cov: number[][], rF: number): OptimizationResult {
  const ret = vecDot(w, mu);
  const volArr = matVecMul(cov, w);
  const variance = vecDot(w, volArr);
  const vol = Math.sqrt(Math.max(variance, 0));
  const sharpe = vol > 0 ? (ret - rF) / vol : 0;
  return { expectedReturn: ret, volatility: vol, sharpe, weights: w };
}

function monteCarloOptimize(
  mu: number[],
  cov: number[][],
  rF: number,
  samples: number,
  seed: number = 42
) {
  const rng = mulberry32(seed);
  const N = mu.length;
  const cloud: FrontierPoint[] = [];
  let maxSharpe: OptimizationResult = { expectedReturn: 0, volatility: 0, sharpe: -Infinity, weights: new Array(N).fill(0) };
  let minVol: OptimizationResult = { expectedReturn: 0, volatility: Infinity, sharpe: 0, weights: new Array(N).fill(0) };

  for (let k = 0; k < samples; k++) {
    const w = sampleDirichlet(rng, N);
    const stats = computePortfolioStats(w, mu, cov, rF);
    cloud.push({ return: stats.expectedReturn, volatility: stats.volatility, sharpe: stats.sharpe });
    if (stats.sharpe > maxSharpe.sharpe) maxSharpe = stats;
    if (stats.volatility < minVol.volatility) minVol = stats;
  }

  // Subsample cloud for response (cap at 500)
  const subsample = cloud.length > 500
    ? cloud.filter((_, i) => i % Math.ceil(cloud.length / 500) === 0)
    : cloud;

  // Approximate "frontier at given return" — find min-vol among points with return >= target
  function nearFrontierAt(targetReturn: number): FrontierPoint {
    let best: FrontierPoint | null = null;
    for (const p of cloud) {
      if (p.return >= targetReturn && (!best || p.volatility < best.volatility)) {
        best = p;
      }
    }
    return best ?? { return: targetReturn, volatility: Infinity, sharpe: 0 };
  }

  return { maxSharpe, minVol, cloud: subsample, nearFrontierAt };
}

function computeRebalanceTrades(
  symbols: string[],
  currentWeights: number[],
  targetWeights: number[],
  totalValue: number
): RebalanceTrade[] {
  const out: RebalanceTrade[] = [];
  for (let i = 0; i < symbols.length; i++) {
    const delta = (targetWeights[i] - currentWeights[i]) * totalValue;
    if (Math.abs(delta) < 1) continue;
    out.push({
      symbol: symbols[i],
      action: delta > 0 ? 'buy' : 'sell',
      shares: Math.round(Math.abs(delta) * 100) / 100,
      notional: Math.round(Math.abs(delta) * 100) / 100,
    });
  }
  return out;
}

// ============================================================================
// Yahoo Finance fetcher with simple cache
// ============================================================================

interface CacheEntry { ts: number; data: PricePoint[]; }
const priceCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000;

async function fetchYahooPrices(yahooSymbol: string, start: string, end: string): Promise<PricePoint[]> {
  const key = `yahoo:${yahooSymbol}:${start}:${end}`;
  const hit = priceCache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.data;

  const period1 = Math.floor(new Date(start).getTime() / 1000);
  const period2 = end ? Math.floor(new Date(end).getTime() / 1000) : Math.floor(Date.now() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${period1}&period2=${period2}&interval=1d&events=history`;

  const res = await axios.get(url, {
    timeout: 30000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BitcoinHub/1.0)' },
  });

  const result = res.data?.chart?.result?.[0];
  if (!result) throw new Error(`No Yahoo data for ${yahooSymbol}`);

  const timestamps: number[] = result.timestamp || [];
  const indicators = result.indicators || {};
  const closes: (number | null)[] =
    (indicators.adjclose?.[0]?.adjclose as (number | null)[] | undefined) ||
    (indicators.quote?.[0]?.close as (number | null)[] | undefined) ||
    [];

  const data = timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      price: closes[i],
    }))
    .filter((p): p is PricePoint => p.price !== null && p.price !== undefined && !Number.isNaN(p.price));

  priceCache.set(key, { ts: Date.now(), data });
  return data;
}

// ============================================================================
// Handler
// ============================================================================

function ok(res: VercelResponse, data: unknown) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.json(data);
}

function err(res: VercelResponse, status: number, message: string) {
  res.status(status).json({ error: message });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return err(res, 405, 'POST required');

    const { holdings, cycleId, riskFreeRate } = req.body ?? {};

    if (!Array.isArray(holdings) || holdings.length === 0) {
      return err(res, 400, '`holdings` must be a non-empty array');
    }
    if (typeof cycleId !== 'string') {
      return err(res, 400, '`cycleId` is required');
    }

    const cycle = CYCLES.find(c => c.id === cycleId);
    if (!cycle) return err(res, 400, `Unknown cycleId: ${cycleId}`);

    const normalized: Holding[] = holdings
      .map((h: any) => ({
        symbol: String(h.symbol ?? '').toUpperCase().trim(),
        quantity: Number(h.quantity),
      }))
      .filter(h => h.symbol && Number.isFinite(h.quantity) && h.quantity > 0);

    if (normalized.length === 0) {
      return err(res, 400, 'No valid holdings after normalization');
    }

    const rF =
      typeof riskFreeRate === 'number' &&
      Number.isFinite(riskFreeRate) &&
      riskFreeRate >= 0 &&
      riskFreeRate < 1
        ? riskFreeRate
        : DEFAULT_RISK_FREE_RATE;

    const t0 = Date.now();

    // 1. Resolve assets
    const heldSymbols = [...new Set(normalized.map(h => h.symbol))];
    const assetBySymbol = new Map<string, MPTAsset>();
    for (const sym of heldSymbols) {
      const asset = UNIVERSE.find(a => a.symbol === sym);
      if (asset) assetBySymbol.set(sym, asset);
    }
    if (assetBySymbol.size === 0) {
      return err(res, 400, `No recognized assets. Valid: ${UNIVERSE.map(a => a.symbol).join(', ')}`);
    }

    // 2. Fetch all in parallel
    const tFetch = Date.now();
    const fetchResults = await Promise.allSettled(
      Array.from(assetBySymbol.entries()).map(async ([symbol, assetDef]) => {
        const series = await fetchYahooPrices(assetDef.yahooSymbol, cycle.start, cycle.end);
        const trimmed = series.filter(p => p.date >= assetDef.firstAvailable);
        return { symbol, series: trimmed };
      })
    );

    // 3. Process results
    const seriesBySymbol = new Map<string, PricePoint[]>();
    const excludedAssets: { symbol: string; reason: string }[] = [];

    Array.from(assetBySymbol.entries()).forEach(([symbol], i) => {
      const result = fetchResults[i];
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
    });

    const fetchMs = Date.now() - tFetch;

    if (seriesBySymbol.size < 2) {
      return err(res, 400,
        `At least 2 assets with sufficient data are required. Got ${seriesBySymbol.size}. ` +
        `Excluded: ${excludedAssets.map(a => `${a.symbol} (${a.reason})`).join('; ')}`
      );
    }

    // 4. Align on common dates
    const symbols = Array.from(seriesBySymbol.keys());
    const perAssetSeries = symbols.map(s => seriesBySymbol.get(s)!);
    const { aligned, dates: commonDates } = alignOnCommonDates(perAssetSeries);

    if (commonDates.length < MIN_DATA_POINTS) {
      return err(res, 400, `Insufficient overlapping dates (${commonDates.length}) across ${symbols.join(', ')}`);
    }

    // 5. Compute log returns + per-asset stats
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

    const perAsset: Record<string, AssetStats> = {};
    const mu: number[] = [];

    for (let j = 0; j < N; j++) {
      const returns = returnsByAsset[j];
      const prices = aligned[j];
      const meanDaily = mean(returns);
      const stdDaily = std(returns);
      const meanAnnual = meanDaily * TRADING_DAYS_PER_YEAR;
      const volAnnual = stdDaily * Math.sqrt(TRADING_DAYS_PER_YEAR);
      const sharpe = volAnnual > 0 ? (meanAnnual - rF) / volAnnual : 0;

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

    // 6. Shrunk covariance (annualized)
    const covDaily = shrunkCovariance(returnsMatrix, 0.2);
    const cov: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        cov[i][j] = covDaily[i][j] * TRADING_DAYS_PER_YEAR;
      }
    }

    const correlation = corrFromCov(cov);

    // 7. User's current portfolio weights
    const lastPrices = aligned.map(p => p[p.length - 1]);
    const holdingBySym = new Map(normalized.map(h => [h.symbol, h.quantity]));
    const valuesBySym = symbols.map(s => (holdingBySym.get(s) ?? 0) * (lastPrices[symbols.indexOf(s)] ?? 0));
    const totalValue = valuesBySym.reduce((a, b) => a + b, 0);

    if (totalValue <= 0) {
      return err(res, 400, 'Computed total portfolio value is zero — check holdings quantities');
    }

    const currentWeights = valuesBySym.map(v => v / totalValue);
    const currentStats = computePortfolioStats(currentWeights, mu, cov, rF);

    const currentPortfolio = {
      ...currentStats,
      weights: Object.fromEntries(symbols.map((s, i) => [s, currentWeights[i]])),
      totalValue,
    };

    // 8. Optimize (Monte Carlo)
    const optResult = monteCarloOptimize(mu, cov, rF, MONTE_CARLO_SAMPLES);

    const toOpt = (o: OptimizationResult) => ({
      ...o,
      weights: Object.fromEntries(symbols.map((s, i) => [s, o.weights[i]])),
    });

    const maxSharpe = toOpt(optResult.maxSharpe);
    const minVol = toOpt(optResult.minVol);

    // 9. Frontier metrics
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

    // 10. Rebalance trades
    const rebalanceTrades = computeRebalanceTrades(
      symbols,
      currentWeights,
      symbols.map(s => maxSharpe.weights[s]),
      totalValue
    );

    const computeMs = Date.now() - tCompute;

    const result: MPTResult = {
      cycle: { id: cycle.id, label: cycle.label, start: cycle.start, end: cycle.end },
      riskFreeRate: rF,
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

    return ok(res, result);
  } catch (e: any) {
    console.error('[mpt-compute] error:', e);
    return err(res, 500, e?.message ?? 'Failed to compute MPT');
  }
}