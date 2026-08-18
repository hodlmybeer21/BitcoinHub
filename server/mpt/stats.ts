// BitcoinHub MPT — Stats math
// Returns, annualized mean/vol/Sharpe, max drawdown, correlation,
// covariance with Ledoit-Wolf shrinkage.

import { Matrix } from 'ml-matrix';

export const TRADING_DAYS_PER_YEAR = 365; // crypto trades 24/7

export function computeLogReturns(prices: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > 0 && prices[i - 1] > 0) {
      r.push(Math.log(prices[i] / prices[i - 1]));
    }
  }
  return r;
}

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

export function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  let v = 0;
  for (const x of arr) v += (x - m) ** 2;
  return Math.sqrt(v / (arr.length - 1));
}

export function maxDrawdown(prices: number[]): number {
  if (prices.length === 0) return 0;
  let peak = prices[0];
  let maxDD = 0;
  for (const p of prices) {
    if (p > peak) peak = p;
    const dd = (peak - p) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

export function totalReturn(prices: number[]): number {
  if (prices.length < 2) return 0;
  return prices[prices.length - 1] / prices[0] - 1;
}

/**
 * Build aligned price matrix: for each asset, an array of prices on the
 * common date set. Forward-fill missing days; leading NaNs are dropped.
 *
 * @param perAssetSeries PricePoint[] per asset (one per asset, in user-declared order)
 * @returns { aligned: number[][], dates: string[] } prices are TxN, dates length T
 */
export function alignOnCommonDates(perAssetSeries: { date: string; price: number }[][]): {
  aligned: number[][];
  dates: string[];
} {
  if (perAssetSeries.length === 0) return { aligned: [], dates: [] };

  // Compute intersection of all dates
  const sets = perAssetSeries.map(s => new Set(s.map(p => p.date)));
  const commonDates = Array.from(sets[0])
    .filter(d => sets.every(s => s.has(d)))
    .sort();

  const aligned = perAssetSeries.map(series => {
    const priceMap = new Map(series.map(p => [p.date, p.price]));
    return commonDates.map(d => priceMap.get(d)!);
  });

  return { aligned, dates: commonDates };
}

/**
 * Ledoit-Wolf shrinkage covariance estimator.
 * Shrinks the sample covariance S toward the scaled-identity target F.
 * Shrinkage intensity α ∈ [0,1] — 0 = raw sample, 1 = all target.
 *
 * MVP note: uses a fixed shrinkage intensity (default 0.2) rather than the
 * full data-driven estimator. This is a well-known stable choice for
 * noisy crypto covariances. Phase 4 can add the full Oracle Approximating
 * Shrinkage (OAS) estimator.
 */
export function shrunkCovariance(returnsMatrix: number[][], shrinkage: number = 0.2): Matrix {
  const T = returnsMatrix.length;
  const N = returnsMatrix[0].length;

  // Per-asset mean
  const mu: number[] = new Array(N).fill(0);
  for (let t = 0; t < T; t++) {
    for (let j = 0; j < N; j++) mu[j] += returnsMatrix[t][j];
  }
  for (let j = 0; j < N; j++) mu[j] /= T;

  // Sample covariance (1/T) X'X
  const S = new Matrix(N, N);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      let sum = 0;
      for (let t = 0; t < T; t++) sum += (returnsMatrix[t][i] - mu[i]) * (returnsMatrix[t][j] - mu[j]);
      S.set(i, j, sum / T);
    }
  }

  // Target = scaled identity (F = (tr S / N) * I)
  let trace = 0;
  for (let i = 0; i < N; i++) trace += S.get(i, i);
  const scale = trace / N;
  const F = Matrix.zeros(N, N);
  for (let i = 0; i < N; i++) F.set(i, i, scale);

  // Shrink: Σ* = (1-α) S + α F
  const out = new Matrix(N, N);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      out.set(i, j, (1 - shrinkage) * S.get(i, j) + shrinkage * F.get(i, j));
    }
  }
  return out;
}

/**
 * Correlation matrix from an annualized covariance.
 */
export function corrFromCov(cov: Matrix): number[][] {
  const N = cov.rows;
  const vols: number[] = [];
  for (let i = 0; i < N; i++) vols.push(Math.sqrt(Math.max(0, cov.get(i, i))));
  const corr: number[][] = [];
  for (let i = 0; i < N; i++) {
    const row: number[] = [];
    for (let j = 0; j < N; j++) {
      const denom = vols[i] * vols[j];
      row.push(denom > 0 ? Math.max(-1, Math.min(1, cov.get(i, j) / denom)) : 0);
    }
    corr.push(row);
  }
  return corr;
}