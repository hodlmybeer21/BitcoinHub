// BitcoinHub Workbench — /api/workbench/backtest
// Replays a Workbench formula over historical price data and computes
// strategy stats. Two modes:
//
//   1. Single-asset (BTC only) — default. Long/cash signal: signal_t > 0
//      → hold BTC for return from t to t+1; else cash. Compare to
//      buy-and-hold BTC.
//
//   2. Multi-asset portfolio — pass `weights: { BTC: 0.5, IBIT: 0.3, ... }`.
//      Universe: BTC + IBIT + FBTC + MSTR + COIN + MARA + RIOT (same
//      as MPT optimizer). Daily rebalancing to target weights.
//      Compare to equal-weight buy-and-hold of the same universe.
//
// Strategy semantics (MVP): long-only, daily rebalancing.
//   - signal_t > 0  →  hold target portfolio for return from t to t+1
//   - signal_t == 0 →  in cash (return 0)
// Signal_t is determined end-of-day t (Workbench formula evaluated on
// that date). Applied to next-day's portfolio return to avoid look-ahead
// bias. For single-asset mode, "portfolio return" = BTC daily return.
//
// Inputs:
//   POST {
//     formula: string,
//     range?: { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' },
//     strategy?: 'long_cash',
//     weights?: { [asset: string]: number },  // 0-1 fractions, sum to 1
//   }
//
// Output:
//   {
//     formula, mode: 'single_asset' | 'portfolio',
//     weights?: Record<string, number>,
//     range: {start, end, actualStart, actualEnd},
//     strategy: 'long_cash',
//     stats: { totalReturnPct, annualizedReturnPct, sharpeRatio,
//              maxDrawdownPct, winRatePct, exposurePct,
//              numTrades, signalDays, totalDays,
//              benchmarkReturnPct, alphaPct },
//     equityCurve: Array<{ date, strategy, benchmark }>,
//   }
//
// Default range: 2016-01-01 → today. For portfolio mode, actualStart
// reflects the intersection of all asset data (IBIT/FBTC only from
// Jan 2024; pre-2024 dates get cash because the ETF didn't exist).

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface SeriesPoint { date: string; value: number; }

const DEFAULT_RANGE_START = '2016-01-01';
const HOST = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://bitcoinhub.goodbotai.tech';

// Yahoo Finance symbols for the MPT portfolio universe
const PORTFOLIO_UNIVERSE: Record<string, { symbol: string; label: string }> = {
  BTC:  { symbol: 'BTC-USD', label: 'Bitcoin' },
  IBIT: { symbol: 'IBIT',    label: 'BlackRock IBIT ETF' },
  FBTC: { symbol: 'FBTC',    label: 'Fidelity FBTC ETF' },
  MSTR: { symbol: 'MSTR',    label: 'MicroStrategy' },
  COIN: { symbol: 'COIN',    label: 'Coinbase' },
  MARA: { symbol: 'MARA',    label: 'Marathon Digital' },
  RIOT: { symbol: 'RIOT',    label: 'Riot Platforms' },
};

function ok(res: VercelResponse, data: unknown) {
  res.setHeader('Cache-Control', 'no-store');
  res.json(data);
}

function err(res: VercelResponse, status: number, message: string) {
  res.status(status).json({ error: message });
}

// Fetch a single Yahoo Finance symbol's daily closes
async function fetchYahooCloses(symbol: string, start: string, end: string): Promise<SeriesPoint[]> {
  const { default: axios } = await import('axios');
  const period1 = Math.floor(new Date(start).getTime() / 1000);
  const period2 = Math.floor(new Date(end).getTime() / 1000) + 86400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`;
  const res = await axios.get(url, {
    timeout: 60000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BitcoinHub/1.0)' },
  });
  const result = res.data?.chart?.result?.[0];
  if (!result) throw new Error(`No Yahoo data for ${symbol}`);
  const timestamps: number[] = result.timestamp || [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];
  const out: SeriesPoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close === null || close === undefined || Number.isNaN(close)) continue;
    out.push({
      date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
      value: close,
    });
  }
  return out;
}

// Fetch multiple Yahoo Finance symbols in parallel (graceful on per-symbol failure)
async function fetchAssetPrices(
  symbols: string[],
  start: string,
  end: string,
): Promise<Map<string, SeriesPoint[]>> {
  const results = await Promise.allSettled(
    symbols.map(async sym => ({ sym, data: await fetchYahooCloses(sym, start, end) }))
  );
  const out = new Map<string, SeriesPoint[]>();
  for (const r of results) {
    if (r.status !== 'fulfilled' || r.value.data.length === 0) continue;
    out.set(r.value.sym, r.value.data);
  }
  if (out.size === 0) throw new Error('No asset price data from Yahoo Finance');
  return out;
}

// Self-call /api/workbench/evaluate to get the formula's signal series.
// Coerces to binary 0/1 (truthy → 1, falsy → 0).
async function fetchSignalSeries(formula: string, range: { start: string; end: string }): Promise<SeriesPoint[]> {
  const { default: axios } = await import('axios');
  const res = await axios.post(`${HOST}/api/workbench/evaluate`, { formula, range }, { timeout: 120000 });
  const series = res.data?.series;
  if (!Array.isArray(series)) return [];
  return series
    .filter((p: any) => p && typeof p.date === 'string')
    .map((p: any) => ({
      date: p.date,
      value: typeof p.value === 'number' && Number.isFinite(p.value) ? (p.value > 0.5 ? 1 : 0) : 0,
    }));
}

// Union of dates across all input series
function unionOfDates(arrs: SeriesPoint[][]): string[] {
  const s = new Set<string>();
  for (const arr of arrs) for (const p of arr) s.add(p.date);
  return Array.from(s).sort();
}

// Per-asset daily returns (index 0 = 0, no prior data)
function computeAssetReturns(prices: number[]): number[] {
  const N = prices.length;
  const rets: number[] = new Array(N).fill(0);
  for (let i = 1; i < N; i++) {
    const prev = prices[i - 1];
    if (prev > 0) rets[i] = (prices[i] - prev) / prev;
  }
  return rets;
}

// Portfolio daily returns with daily rebalancing to target weights.
// weights: { symbol: fraction } — fractions must sum to 1.
function portfolioReturns(
  alignedPrices: Record<string, number[]>,
  weights: Record<string, number>,
): number[] {
  const firstArr = Object.values(alignedPrices)[0];
  const N = firstArr ? firstArr.length : 0;
  // Pre-compute per-asset returns
  const assetRets: Record<string, number[]> = {};
  for (const [sym, prices] of Object.entries(alignedPrices)) {
    assetRets[sym] = computeAssetReturns(prices);
  }
  const portRets: number[] = new Array(N).fill(0);
  for (let i = 1; i < N; i++) {
    let r = 0;
    for (const [sym, w] of Object.entries(weights)) {
      const ar = assetRets[sym];
      if (ar && Number.isFinite(ar[i])) r += w * ar[i];
    }
    portRets[i] = r;
  }
  return portRets;
}

// Build aligned (forward-filled) series for a set of dates
function buildAlignedSeries<K extends string>(
  dates: string[],
  sourceMaps: Record<K, Map<string, number>>,
): { sigs: Record<K, number[]> } {
  const out: Record<string, number[]> = {};
  for (const key of Object.keys(sourceMaps) as K[]) {
    const map = sourceMaps[key];
    const arr: number[] = [];
    let last = 0;
    for (const d of dates) {
      const v = map.get(d);
      if (typeof v === 'number' && Number.isFinite(v)) last = v;
      arr.push(last);
    }
    out[key] = arr;
  }
  return out as { sigs: Record<K, number[]> };
}

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
  benchmarkReturnPct: number;
  alphaPct: number;
}

interface EquityPoint { date: string; strategy: number; benchmark: number; }

function computeStatsFromReturns(
  dates: string[],
  sigs: number[],
  stratReturns: number[],
  benchReturns: number[],
): { stats: BacktestStats; equityCurve: EquityPoint[] } {
  const N = dates.length;
  let stratEquity = 1;
  let benchEquity = 1;
  let stratPeak = 1;
  let maxDD = 0;
  let signalDays = 0;
  let numTrades = 0;
  let prevSig = 0;
  let wins = 0;
  let posDays = 0;
  const equityCurve: EquityPoint[] = [];

  for (let i = 0; i < N; i++) {
    const sig = sigs[i];
    if (sig > 0) signalDays++;
    if (prevSig === 0 && sig > 0) numTrades++;
    if (prevSig > 0 && sig === 0) numTrades++;
    prevSig = sig;

    if (i > 0) {
      stratEquity *= (1 + stratReturns[i]);
      benchEquity *= (1 + benchReturns[i]);
      if (sig > 0) {
        posDays++;
        if (stratReturns[i] > 0) wins++;
      }
    }

    if (stratEquity > stratPeak) stratPeak = stratEquity;
    const dd = stratPeak > 0 ? (stratPeak - stratEquity) / stratPeak : 0;
    if (dd > maxDD) maxDD = dd;

    equityCurve.push({ date: dates[i], strategy: stratEquity, benchmark: benchEquity });
  }

  const totalReturnPct = (stratEquity - 1) * 100;
  const benchmarkReturnPct = (benchEquity - 1) * 100;
  const alphaPct = totalReturnPct - benchmarkReturnPct;

  const years = (N - 1) / 365.25;
  const annualizedReturnPct = years > 0 && stratEquity > 0 ? (Math.pow(stratEquity, 1 / years) - 1) * 100 : 0;

  const allReturns = stratReturns.slice(1);
  let sharpeRatio = 0;
  if (allReturns.length > 1) {
    const mean = allReturns.reduce((s, r) => s + r, 0) / allReturns.length;
    const variance = allReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / allReturns.length;
    const stdDev = Math.sqrt(variance);
    sharpeRatio = stdDev > 0 ? (mean / stdDev) * Math.sqrt(365) : 0;
  }

  const winRatePct = posDays > 0 ? (wins / posDays) * 100 : 0;
  const exposurePct = N > 0 ? (signalDays / N) * 100 : 0;

  return {
    stats: {
      totalReturnPct,
      annualizedReturnPct,
      sharpeRatio,
      maxDrawdownPct: maxDD * 100,
      winRatePct,
      exposurePct,
      numTrades,
      signalDays,
      totalDays: N,
      benchmarkReturnPct,
      alphaPct,
    },
    equityCurve,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return err(res, 405, 'POST required');

    const body = req.body ?? {};
    const formula = typeof body.formula === 'string' ? body.formula.trim() : '';
    if (!formula) return err(res, 400, '`formula` is required');

    const endDate = typeof body.range?.end === 'string'
      ? body.range.end
      : new Date().toISOString().slice(0, 10);
    const startDate = typeof body.range?.start === 'string'
      ? body.range.start
      : DEFAULT_RANGE_START;

    // Detect portfolio mode
    const weights = body.weights;
    const isPortfolio = !!weights && typeof weights === 'object' && !Array.isArray(weights) && Object.keys(weights).length > 0;

    // Validate weights
    if (isPortfolio) {
      const sum = Object.values(weights as Record<string, number>).reduce((s: number, w: any) => s + (Number(w) || 0), 0);
      if (Math.abs(sum - 1) > 0.01) {
        return err(res, 400, `Portfolio weights must sum to 1.0 (got ${sum.toFixed(3)})`);
      }
      const validAssets = Object.keys(PORTFOLIO_UNIVERSE);
      const invalid = Object.keys(weights as Record<string, number>).filter(k => !validAssets.includes(k));
      if (invalid.length > 0) {
        return err(res, 400, `Unknown asset(s): ${invalid.join(', ')}. Valid: ${validAssets.join(', ')}`);
      }
    }

    // Always fetch signals; in portfolio mode also fetch all asset prices + BTC.
    const signalPromise = fetchSignalSeries(formula, { start: startDate, end: endDate });

    if (isPortfolio) {
      // Portfolio mode
      const symbolSet = new Set<string>();
      for (const [asset, w] of Object.entries(weights as Record<string, number>)) {
        if (w > 0) symbolSet.add(PORTFOLIO_UNIVERSE[asset].symbol);
      }
      // Always include BTC for reference (used by UI for single-asset comparison)
      symbolSet.add(PORTFOLIO_UNIVERSE.BTC.symbol);
      const symbols = Array.from(symbolSet);

      const [signals, assetPrices] = await Promise.all([
        signalPromise,
        fetchAssetPrices(symbols, startDate, endDate),
      ]);

      if (signals.length === 0) {
        return err(res, 400, 'Formula returned no data — check syntax / range.');
      }
      if (assetPrices.size < 1) {
        return err(res, 500, 'Asset price data unavailable (Yahoo Finance)');
      }

      // Map weights to Yahoo symbols first — needed for portfolioStart filter below.
      const symbolWeights: Record<string, number> = {};
      for (const [asset, w] of Object.entries(weights as Record<string, number>)) {
        if (w > 0) symbolWeights[PORTFOLIO_UNIVERSE[asset].symbol] = w;
      }

      // Find first date each asset has data — used to compute portfolioStart.
      // Without this filter, dates before an asset's listing get forward-filled
      // with 0, then computeAssetReturns produces 0/0 = NaN for the transition,
      // poisoning the entire portfolio sum (regression caught by test 6 with
      // IBIT starting 2024-01-10).
      const firstAvailableDate: Record<string, string> = {};
      for (const [sym, prices] of assetPrices.entries()) {
        firstAvailableDate[sym] = prices[0]?.date ?? '9999-99-99';
      }

      // Portfolio starts at the latest firstAvailableDate across WEIGHTED assets.
      // Non-weighted fetched assets (BTC reference) don't constrain the start.
      const allWeightedSymbols = Object.keys(symbolWeights);
      let portfolioStart = '0000-00-00';
      for (const sym of allWeightedSymbols) {
        const d = firstAvailableDate[sym];
        if (d > portfolioStart) portfolioStart = d;
      }

      // Align all series to common dates (union), filtered to portfolioStart onwards
      const allSeries: SeriesPoint[][] = [signals, ...assetPrices.values()];
      const dates = unionOfDates(allSeries).filter(d => d >= portfolioStart);

      // Build aligned per-symbol price arrays + aligned signal array
      const aligned: Record<string, number[]> = {};
      for (const [sym, prices] of assetPrices.entries()) {
        const map = new Map(prices.map(p => [p.date, p.value]));
        const arr: number[] = [];
        let last = 0;
        for (const d of dates) {
          const v = map.get(d);
          if (typeof v === 'number' && Number.isFinite(v)) last = v;
          arr.push(last);
        }
        aligned[sym] = arr;
      }
      const sigMap = new Map(signals.map(s => [s.date, s.value]));
      const sigs: number[] = [];
      let lastSig = 0;
      for (const d of dates) {
        const v = sigMap.get(d);
        if (typeof v === 'number') lastSig = v;
        sigs.push(lastSig);
      }

      // Portfolio composition: any WEIGHTED asset (BTC included if weighted) with data.
      // The previous version filtered out BTC unconditionally, which broke any
      // user passing {BTC: 1.0} (regression caught by test 5: 0% returns instead
      // of ~14858%).
      const availableSymbols = allWeightedSymbols.filter(s => aligned[s] !== undefined);
      const availableWeights: Record<string, number> = {};
      let wsum = 0;
      for (const sym of availableSymbols) {
        if (symbolWeights[sym]) {
          availableWeights[sym] = symbolWeights[sym];
          wsum += symbolWeights[sym];
        }
      }
      // Renormalize to sum to 1 (in case some assets had no data)
      if (wsum > 0 && wsum < 1) {
        for (const k of Object.keys(availableWeights)) availableWeights[k] /= wsum;
      }
      const portRets = portfolioReturns(aligned, availableWeights);

      // Equal-weight benchmark (1/N for each asset with data in portfolio)
      const nAssets = availableSymbols.length;
      const eqWeights: Record<string, number> = {};
      for (const sym of availableSymbols) eqWeights[sym] = 1 / nAssets;
      const benchRets = portfolioReturns(aligned, eqWeights);

      // Strategy returns: signal > 0 → portfolio return, else 0 (avoid look-ahead)
      const stratRets: number[] = dates.map((_, i) => (i > 0 && sigs[i - 1] > 0) ? portRets[i] : 0);

      const { stats, equityCurve } = computeStatsFromReturns(dates, sigs, stratRets, benchRets);

      return ok(res, {
        formula,
        mode: 'portfolio',
        weights,
        range: {
          start: startDate,
          end: endDate,
          actualStart: dates[0],
          actualEnd: dates[dates.length - 1],
        },
        strategy: body.strategy ?? 'long_cash',
        stats,
        equityCurve,
      });
    } else {
      // Single-asset BTC mode (existing behavior)
      const [signals, btcPrices] = await Promise.all([
        signalPromise,
        fetchYahooCloses(PORTFOLIO_UNIVERSE.BTC.symbol, startDate, endDate),
      ]);

      if (signals.length === 0) {
        return err(res, 400, 'Formula returned no data — check syntax / range.');
      }
      if (btcPrices.length === 0) {
        return err(res, 500, 'BTC price data unavailable (Yahoo Finance)');
      }

      const dates = unionOfDates([signals, btcPrices]);
      const signalMap = new Map(signals.map(s => [s.date, s.value]));
      const priceMap = new Map(btcPrices.map(p => [p.date, p.value]));

      const sigs: number[] = [];
      const prices: number[] = [];
      let lastSig = 0;
      let lastPrice = 0;
      for (const d of dates) {
        if (signalMap.has(d)) lastSig = signalMap.get(d)!;
        if (priceMap.has(d)) lastPrice = priceMap.get(d)!;
        sigs.push(lastSig);
        prices.push(lastPrice);
      }

      const btcReturns = computeAssetReturns(prices);
      const stratReturns = dates.map((_, i) => (i > 0 && sigs[i - 1] > 0) ? btcReturns[i] : 0);
      const { stats, equityCurve } = computeStatsFromReturns(dates, sigs, stratReturns, btcReturns);

      return ok(res, {
        formula,
        mode: 'single_asset',
        range: {
          start: startDate,
          end: endDate,
          actualStart: dates[0],
          actualEnd: dates[dates.length - 1],
        },
        strategy: body.strategy ?? 'long_cash',
        stats,
        equityCurve,
      });
    }
  } catch (e: any) {
    console.error('[workbench-backtest] error:', e);
    const msg = e?.message ?? 'Backtest failed';
    const status = msg.includes('timeout') || msg.includes('ECONNREFUSED') ? 502 : 500;
    return err(res, status, msg);
  }
}