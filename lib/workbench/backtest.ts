// BitcoinHub Workbench — /api/workbench/backtest
// Replays a Workbench formula over historical BTC-USD daily data and
// computes strategy stats vs buy-and-hold.
//
// Strategy semantics (MVP): long-only.
//   - signal_t > 0  →  hold BTC for the return from t to t+1
//   - signal_t == 0 →  in cash (return 0)
// Signal_t is determined end-of-day t (or the formula's evaluation for
// that date). Applied to next-day's BTC return to avoid look-ahead.
//
// Inputs:
//   POST { formula: string, range?: { start, end }, strategy?: 'long_cash' }
//
// Output:
//   {
//     formula, range: {start, end, actualStart, actualEnd},
//     stats: { totalReturnPct, annualizedReturnPct, sharpeRatio,
//              maxDrawdownPct, winRatePct, exposurePct,
//              numTrades, signalDays, totalDays,
//              buyHoldReturnPct, alphaPct },
//     equityCurve: Array<{ date, strategy, buyHold }>,
//   }
//
// Default range: 2016-01-01 → today (~10.5 years of BTC history from
// Yahoo Finance BTC-USD daily). actualStart/actualEnd reflect the
// overlap with the formula's data sources (e.g., Fear & Greed only has
// data from 2018-02-01, so a formula using fear_greed.value will
// auto-shrink the actual range).

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface SignalPoint { date: string; value: number; }
interface BtcPoint { date: string; value: number; }

const DEFAULT_RANGE_START = '2016-01-01';
const HOST = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://bitcoinhub.goodbotai.tech';

function ok(res: VercelResponse, data: unknown) {
  res.setHeader('Cache-Control', 'no-store');
  res.json(data);
}

function err(res: VercelResponse, status: number, message: string) {
  res.status(status).json({ error: message });
}

// Fetch BTC-USD daily closes from Yahoo Finance. Range up to ~10y is fine.
async function fetchBtcDaily(start: string, end: string): Promise<BtcPoint[]> {
  const { default: axios } = await import('axios');
  const period1 = Math.floor(new Date(start).getTime() / 1000);
  const period2 = Math.floor(new Date(end).getTime() / 1000) + 86400; // inclusive end
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?period1=${period1}&period2=${period2}&interval=1d`;
  const res = await axios.get(url, {
    timeout: 60000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BitcoinHub/1.0)' },
  });
  const result = res.data?.chart?.result?.[0];
  if (!result) throw new Error('No Yahoo data for BTC-USD');
  const timestamps: number[] = result.timestamp || [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];
  const out: BtcPoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close === null || close === undefined || Number.isNaN(close)) continue;
    out.push({
      date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
      value: close,
    });
  }
  if (out.length === 0) throw new Error('Yahoo returned empty BTC-USD series');
  return out;
}

// Self-call /api/workbench/evaluate to get the formula's signal series
// over the date range. This reuses the existing parser + fetcher chain.
async function fetchSignalSeries(formula: string, range: { start: string; end: string }): Promise<SignalPoint[]> {
  const { default: axios } = await import('axios');
  const res = await axios.post(`${HOST}/api/workbench/evaluate`, { formula, range }, { timeout: 120000 });
  const series = res.data?.series;
  if (!Array.isArray(series)) return [];
  // Coerce values to 0/1 binary signal (truthy → 1, falsy → 0)
  return series
    .filter((p: any) => p && typeof p.date === 'string')
    .map((p: any) => ({ date: p.date, value: typeof p.value === 'number' && Number.isFinite(p.value) ? (p.value > 0.5 ? 1 : 0) : 0 }));
}

function unionDates(a: SignalPoint[], b: BtcPoint[]): string[] {
  const set = new Set<string>();
  for (const p of a) set.add(p.date);
  for (const p of b) set.add(p.date);
  return Array.from(set).sort();
}

function buildAligned(
  dates: string[],
  signals: Map<string, number>,
  prices: Map<string, number>,
): { dates: string[]; sigs: number[]; prices: number[] } {
  // Forward-fill signals (assume hold current position until next signal).
  // Forward-fill prices too in case of gaps.
  const sigs: number[] = [];
  const pricesOut: number[] = [];
  let lastSig = 0;
  let lastPrice = 0;
  for (const d of dates) {
    if (signals.has(d)) lastSig = signals.get(d)!;
    if (prices.has(d)) lastPrice = prices.get(d)!;
    sigs.push(lastSig);
    pricesOut.push(lastPrice);
  }
  return { dates, sigs, prices: pricesOut };
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
  buyHoldReturnPct: number;
  alphaPct: number;
}

function computeBacktest(
  dates: string[],
  sigs: number[],
  prices: number[],
): { stats: BacktestStats; equityCurve: Array<{ date: string; strategy: number; buyHold: number }> } {
  const N = dates.length;

  // BTC return from t-1 to t (realized). btcReturns[0] = 0 (no prior data).
  const btcReturns: number[] = new Array(N).fill(0);
  for (let i = 1; i < N; i++) {
    const prev = prices[i - 1];
    if (prev > 0) btcReturns[i] = (prices[i] - prev) / prev;
  }

  // Strategy: hold BTC if signal[i-1] > 0 (avoid look-ahead bias).
  // On day 0 we have no prior signal so we treat as cash.
  const stratReturns: number[] = new Array(N).fill(0);
  for (let i = 1; i < N; i++) {
    stratReturns[i] = sigs[i - 1] > 0 ? btcReturns[i] : 0;
  }

  let stratEquity = 1;
  let bhEquity = 1;
  let stratEquityPeak = 1;
  let maxDD = 0;
  let signalDays = 0;
  let numTrades = 0;
  let prevSig = 0;
  let winsInPos = 0;
  let totalPosDays = 0;
  const equityCurve: Array<{ date: string; strategy: number; buyHold: number }> = [];

  for (let i = 0; i < N; i++) {
    const sig = sigs[i];
    if (sig > 0) signalDays++;
    // Count trades: transitions between in/out of position
    if (prevSig === 0 && sig > 0) numTrades++;
    if (prevSig > 0 && sig === 0) numTrades++;
    prevSig = sig;

    if (i > 0) {
      stratEquity *= (1 + stratReturns[i]);
      bhEquity *= (1 + btcReturns[i]);
      // Track in-position win rate
      if (sig > 0) {
        totalPosDays++;
        if (stratReturns[i] > 0) winsInPos++;
      }
    }

    if (stratEquity > stratEquityPeak) stratEquityPeak = stratEquity;
    const dd = stratEquityPeak > 0 ? (stratEquityPeak - stratEquity) / stratEquityPeak : 0;
    if (dd > maxDD) maxDD = dd;

    equityCurve.push({
      date: dates[i],
      strategy: stratEquity,
      buyHold: bhEquity,
    });
  }

  const totalReturnPct = (stratEquity - 1) * 100;
  const buyHoldReturnPct = (bhEquity - 1) * 100;
  const alphaPct = totalReturnPct - buyHoldReturnPct;

  // CAGR using trading days (subtract 1 because first day has no return).
  const tradingDays = N - 1;
  const years = tradingDays / 365.25;
  const annualizedReturnPct = years > 0 && stratEquity > 0 ? (Math.pow(stratEquity, 1 / years) - 1) * 100 : 0;

  // Sharpe ratio (annualized, zero risk-free rate, all days).
  const allReturns = stratReturns.slice(1); // skip day 0
  let sharpeRatio = 0;
  if (allReturns.length > 1) {
    const mean = allReturns.reduce((s, r) => s + r, 0) / allReturns.length;
    const variance = allReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / allReturns.length;
    const stdDev = Math.sqrt(variance);
    sharpeRatio = stdDev > 0 ? (mean / stdDev) * Math.sqrt(365) : 0;
  }

  const winRatePct = totalPosDays > 0 ? (winsInPos / totalPosDays) * 100 : 0;
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
      buyHoldReturnPct,
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

    // Fetch signals + BTC prices in parallel
    const [signals, btcPrices] = await Promise.all([
      fetchSignalSeries(formula, { start: startDate, end: endDate }),
      fetchBtcDaily(startDate, endDate),
    ]);

    if (signals.length === 0) {
      return err(res, 400, 'Formula returned no data — check syntax / range. Try a shorter range or simpler formula.');
    }
    if (btcPrices.length === 0) {
      return err(res, 500, 'BTC price data unavailable (Yahoo Finance)');
    }

    // Align to common dates, forward-fill gaps
    const signalMap = new Map(signals.map(s => [s.date, s.value]));
    const priceMap = new Map(btcPrices.map(p => [p.date, p.value]));
    const dates = unionDates(signals, btcPrices);
    const { sigs, prices } = buildAligned(dates, signalMap, priceMap);

    const { stats, equityCurve } = computeBacktest(dates, sigs, prices);

    // actualStart/End reflect the overlap window
    const actualStart = dates[0];
    const actualEnd = dates[dates.length - 1];

    return ok(res, {
      formula,
      range: { start: startDate, end: endDate, actualStart, actualEnd },
      strategy: body.strategy ?? 'long_cash',
      stats,
      equityCurve,
    });
  } catch (e: any) {
    console.error('[workbench-backtest] error:', e);
    const msg = e?.message ?? 'Backtest failed';
    // Distinguish upstream-timeout vs internal error
    const status = msg.includes('timeout') || msg.includes('ECONNREFUSED') ? 502 : 500;
    return err(res, status, msg);
  }
}