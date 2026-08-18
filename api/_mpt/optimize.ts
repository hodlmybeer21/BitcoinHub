// BitcoinHub MPT — Portfolio optimization
// Monte Carlo cloud + greedy Max-Sharpe / Min-Vol search.
// (Phase 4 will add a true QP solver for the exact efficient frontier curve.)

import { Matrix } from 'ml-matrix';
import seedrandom from 'seedrandom';

export interface FrontierPoint {
  return: number;
  volatility: number;
  sharpe: number;
}

export interface OptimizationResult {
  weights: number[];
  expectedReturn: number;
  volatility: number;
  sharpe: number;
}

function sampleDirichlet(N: number, rng: () => number): number[] {
  // Dirichlet(1,1,...,1) = uniform on the simplex
  const samples: number[] = [];
  let sum = 0;
  for (let i = 0; i < N; i++) {
    const x = -Math.log(rng());
    samples.push(x);
    sum += x;
  }
  return samples.map(x => x / sum);
}

export function computePortfolioStats(
  weights: number[],
  mu: number[],
  cov: Matrix,
  rF: number
): { expectedReturn: number; volatility: number; sharpe: number } {
  const w = new Matrix([weights]);
  const muRow = new Matrix([mu]);
  const wt = w.transpose();
  const expectedReturn = w.mmul(muRow.transpose()).get(0, 0);
  const variance = w.mmul(cov).mmul(wt).get(0, 0);
  const volatility = Math.sqrt(Math.max(0, variance));
  const sharpe = volatility > 1e-9 ? (expectedReturn - rF) / volatility : 0;
  return { expectedReturn, volatility, sharpe };
}

/**
 * Sample numSamples random portfolios (no-shorting, sum=1) and return:
 *   - the full Monte Carlo cloud
 *   - the Max-Sharpe portfolio
 *   - the Min-Vol portfolio
 *
 * Also reports the "near-frontier" point at the user's return level
 * (used to compute distance from efficient frontier).
 */
export function monteCarloOptimize(
  mu: number[],
  cov: Matrix,
  rF: number,
  numSamples: number = 10000,
  seed: string = 'mpt-mvp'
): {
  cloud: FrontierPoint[];
  maxSharpe: OptimizationResult;
  minVol: OptimizationResult;
  nearFrontierAt: (targetReturn: number) => FrontierPoint;
} {
  const N = mu.length;
  const rng = seedrandom(seed);

  const cloud: FrontierPoint[] = [];
  let bestSharpeW: number[] = new Array(N).fill(1 / N);
  let bestSharpeStats = { expectedReturn: 0, volatility: 1, sharpe: -Infinity };
  let bestVolW: number[] = new Array(N).fill(1 / N);
  let bestVolStats = { expectedReturn: 0, volatility: Infinity, sharpe: 0 };

  for (let i = 0; i < numSamples; i++) {
    const w = sampleDirichlet(N, rng);
    const stats = computePortfolioStats(w, mu, cov, rF);
    cloud.push({ return: stats.expectedReturn, volatility: stats.volatility, sharpe: stats.sharpe });

    if (stats.sharpe > bestSharpeStats.sharpe) {
      bestSharpeW = w;
      bestSharpeStats = stats;
    }
    if (stats.volatility < bestVolStats.volatility) {
      bestVolW = w;
      bestVolStats = stats;
    }
  }

  // Helper: find the cloud point with return closest to a target
  const nearFrontierAt = (targetReturn: number): FrontierPoint => {
    if (cloud.length === 0) return { return: 0, volatility: 0, sharpe: 0 };
    let best = cloud[0];
    let bestDiff = Math.abs(best.return - targetReturn);
    for (const p of cloud) {
      const diff = Math.abs(p.return - targetReturn);
      if (diff < bestDiff) {
        best = p;
        bestDiff = diff;
      }
    }
    return best;
  };

  return {
    cloud,
    maxSharpe: { weights: bestSharpeW, ...bestSharpeStats },
    minVol:    { weights: bestVolW,    ...bestVolStats    },
    nearFrontierAt,
  };
}

/**
 * Compute the implied dollar trade list to migrate from current weights
 * to target weights. Returns a list of buys (positive) and sells (negative)
 * per asset.
 */
export interface RebalanceTrade {
  symbol: string;
  currentWeight: number;
  targetWeight: number;
  deltaWeight: number;
  deltaValue: number;       // USD
}

export function computeRebalanceTrades(
  symbols: string[],
  currentWeights: number[],
  targetWeights: number[],
  totalValue: number
): RebalanceTrade[] {
  return symbols.map((s, i) => {
    const dw = targetWeights[i] - currentWeights[i];
    return {
      symbol: s,
      currentWeight: currentWeights[i],
      targetWeight: targetWeights[i],
      deltaWeight: dw,
      deltaValue: dw * totalValue,
    };
  });
}