// BitcoinHub Risk Metric — mayer.ts
// Pure-TS technical indicators: SMA, EMA, stdev, Wilder's RSI, Mayer
// Multiple z-score. No external math libs (architecture invariant #5).
//
// All functions are O(n) single-pass except RSI which is O(n) too —
// Wilder's smoothing uses a single exponential running average.

/**
 * Simple moving average over `closes[end - period + 1 .. end]`.
 * Returns NaN if the window isn't full.
 */
export function sma(closes: number[], period: number, end?: number): number {
  const n = closes.length;
  if (n < period) return NaN;
  const e = end ?? n - 1;
  if (e < period - 1) return NaN;
  let sum = 0;
  for (let i = e - period + 1; i <= e; i++) sum += closes[i];
  return sum / period;
}

/**
 * Full SMA series aligned to closes (NaN for warmup).
 * output[i] = NaN for i < period-1, else SMA of last `period` values ending at i.
 */
export function smaSeries(closes: number[], period: number): number[] {
  const n = closes.length;
  const out = new Array<number>(n).fill(NaN);
  if (n < period) return out;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += closes[i];
  out[period - 1] = sum / period;
  for (let i = period; i < n; i++) {
    sum += closes[i] - closes[i - period];
    out[i] = sum / period;
  }
  return out;
}

/**
 * Exponential moving average. Returns full series aligned to closes.
 * Seed = SMA of first `period` values (standard convention).
 */
export function emaSeries(closes: number[], period: number): number[] {
  const n = closes.length;
  const out = new Array<number>(n).fill(NaN);
  if (n < period) return out;

  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += closes[i];
  out[period - 1] = sum / period;
  for (let i = period; i < n; i++) {
    out[i] = closes[i] * k + out[i - 1] * (1 - k);
  }
  return out;
}

/**
 * Population standard deviation over the last `period` closes ending at `end`.
 */
export function stdev(closes: number[], period: number, end?: number): number {
  const n = closes.length;
  if (n < period) return NaN;
  const e = end ?? n - 1;
  if (e < period - 1) return NaN;
  const m = sma(closes, period, e);
  if (!Number.isFinite(m)) return NaN;
  let s = 0;
  for (let i = e - period + 1; i <= e; i++) {
    const d = closes[i] - m;
    s += d * d;
  }
  return Math.sqrt(s / period);
}

/**
 * Population standard deviation over a precomputed series.
 * Used for the Mayer Multiple z-score where the input is the MM series.
 */
export function stdevOf(values: number[]): number {
  const n = values.length;
  if (n === 0) return NaN;
  let sum = 0;
  for (const v of values) if (Number.isFinite(v)) sum += v;
  const m = sum / n;
  let s = 0;
  for (const v of values) if (Number.isFinite(v)) s += (v - m) ** 2;
  return Math.sqrt(s / n);
}

/**
 * Mean of a series.
 */
export function mean(values: number[]): number {
  let sum = 0;
  let n = 0;
  for (const v of values) if (Number.isFinite(v)) { sum += v; n++; }
  return n === 0 ? NaN : sum / n;
}

/**
 * Wilder's RSI(period). Returns full series aligned to closes (NaN for warmup).
 * Uses Wilder's smoothing: avgGain/avgLoss seeded as SMA of first `period`
 * diffs, then smoothed recursively.
 */
export function rsiSeries(closes: number[], period: number = 14): number[] {
  const n = closes.length;
  const out = new Array<number>(n).fill(NaN);
  if (n <= period) return out;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d;
    else avgLoss += -d;
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < n; i++) {
    const d = closes[i] - closes[i - 1];
    const gain = d > 0 ? d : 0;
    const loss = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

/**
 * Mayer Multiple z-score over a 4-year (default) rolling window.
 *
 * MM_t = price_t / SMA(price, 200, daily)
 * z_t = (MM_t - μ) / σ   where μ, σ are mean/stdev of MM over the window.
 *
 * Returns a series aligned to closes. Each element is the z-score at that
 * day, OR NaN if the window isn't full (need 200 + window days).
 */
export function mayerZScoreSeries(
  closes: number[],
  mayerPeriod: number = 200,
  zWindowDays: number = 1460,
): { mm: number[]; z: number[] } {
  const n = closes.length;
  const mm = smaSeries(closes, mayerPeriod);
  const mmArr: number[] = mm.map((m, i) => (Number.isFinite(m) && closes[i] > 0 ? closes[i] / m : NaN));

  const zArr = new Array<number>(n).fill(NaN);
  // We need mayerPeriod days for the first MM, then zWindowDays more to
  // build the z-score window. Earliest valid index = mayerPeriod - 1 + zWindowDays - 1.
  const firstIdx = mayerPeriod - 1 + zWindowDays - 1;
  if (n <= firstIdx) return { mm: mmArr, z: zArr };

  for (let i = firstIdx; i < n; i++) {
    // Window is [i - zWindowDays + 1, i]
    let sum = 0;
    let count = 0;
    for (let j = i - zWindowDays + 1; j <= i; j++) {
      const v = mmArr[j];
      if (Number.isFinite(v)) { sum += v; count++; }
    }
    if (count < zWindowDays / 2) continue; // require at least half the window
    const meanV = sum / count;

    let s = 0;
    for (let j = i - zWindowDays + 1; j <= i; j++) {
      const v = mmArr[j];
      if (Number.isFinite(v)) s += (v - meanV) ** 2;
    }
    const stdV = Math.sqrt(s / count);

    if (stdV > 0 && Number.isFinite(mmArr[i])) {
      zArr[i] = (mmArr[i] - meanV) / stdV;
    }
  }
  return { mm: mmArr, z: zArr };
}
