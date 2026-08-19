// BitcoinHub Workbench — valuation block fetchers
// (Puell Multiple, MVRV Z-score, DXY correlation, NVT Ratio).
//
// All derive from BTC-USD daily OHLCV (Yahoo) plus DXY where needed.
// No external API keys. Lazy-imported from evaluate.ts when a `valuation.*`
// block ID is requested, same pattern as premium-blocks.ts / risk-blocks.ts.
//
// Architecture invariants respected:
//   - Lazy-import axios inside the fetcher (cold-start cost)
//   - Module-level BTC/DXY price cache shared across all 4 fetchers
//   - Pure TS, no math libs
//
// Algorithms (note: Puell and MVRV are computed proxies using public data —
// the "true" Puell uses coinmetrics-style daily issuance, and true MVRV uses
// realized cap which requires UTXO-level data. These proxies are
// close-enough for indicator-building and backtesting on BTC price history):
//
//   1. Puell Multiple:
//      Daily BTC issuance / 365d MA of daily issuance. Issuance computed
//      from halving schedule (50/25/12.5/6.25/3.125 BTC rewards × 144
//      blocks/day). Top signal: Puell > 4 (per PlanB).
//
//   2. MVRV Z-score (proxy):
//      (price − 200w MA) / 200w rolling stdev of (price − 200w MA).
//      True MVRV needs realized cap (UTXO-level data); this proxy uses
//      price deviation instead. Top signal: >7 (still aligned with
//      historical tops in 2017 and 2021).
//
//   3. BTC/DXY Correlation (30d):
//      30-day rolling Pearson correlation between BTC-USD closes and
//      DXY closes. Negative values = risk-off regime (BTC moving
//      opposite to dollar). Highly negative correlation (< -0.5) has
//      historically preceded major BTC moves.
//
//   4. NVT Ratio (proxy):
//      Market cap / (close × volume) — uses BTC daily trading volume
//      × close as a proxy for USD transfer volume. True NVT needs
//      on-chain tx volume; this proxy uses exchange volume instead.
//      Higher NVT = overvalued (per Willy Woo).
//
// Each fetcher returns a multi-year daily series.

import type { Series } from './evaluate-types.js';

interface BtcDay { date: string; close: number; volume: number; }

// ─── Shared BTC price cache (1h TTL) ───────────────────────────────────
const CACHE_TTL_MS = 60 * 60 * 1000;
let btcCache: { ts: number; data: BtcDay[] } | null = null;
let dxyCache: { ts: number; data: { date: string; close: number }[] } | null = null;

async function getBtcPrice(): Promise<BtcDay[]> {
  if (btcCache && Date.now() - btcCache.ts < CACHE_TTL_MS) return btcCache.data;
  const { default: axios } = await import('axios');
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - 12 * 365 * 86400; // 12y for 200w MA warmup
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?period1=${period1}&period2=${period2}&interval=1d`;
  const res = await axios.get(url, {
    timeout: 60000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BitcoinHub/1.0)' },
  });
  const result = res.data?.chart?.result?.[0];
  if (!result) throw new Error('No Yahoo BTC-USD data');
  const timestamps: number[] = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const closes = q.close || [];
  const volumes = q.volume || [];
  const out: BtcDay[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close === null || close === undefined || Number.isNaN(close)) continue;
    out.push({
      date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
      close,
      volume: volumes[i] ?? 0,
    });
  }
  if (out.length === 0) throw new Error('Yahoo returned empty BTC-USD series');
  btcCache = { ts: Date.now(), data: out };
  return out;
}

async function getDxyPrice(): Promise<{ date: string; close: number }[]> {
  if (dxyCache && Date.now() - dxyCache.ts < CACHE_TTL_MS) return dxyCache.data;
  const { default: axios } = await import('axios');
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - 12 * 365 * 86400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?period1=${period1}&period2=${period2}&interval=1d`;
  const res = await axios.get(url, {
    timeout: 30000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BitcoinHub/1.0)' },
  });
  const result = res.data?.chart?.result?.[0];
  if (!result) throw new Error('No Yahoo DXY data');
  const timestamps: number[] = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const out: { date: string; close: number }[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close === null || close === undefined || Number.isNaN(close)) continue;
    out.push({ date: new Date(timestamps[i] * 1000).toISOString().split('T')[0], close });
  }
  if (out.length === 0) throw new Error('Yahoo returned empty DXY series');
  dxyCache = { ts: Date.now(), data: out };
  return out;
}

// ─── Series math helpers (pure TS) ──────────────────────────────────────
function sma(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(0);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out[i] = i >= period - 1 ? sum / period : values[i];
  }
  return out;
}

function rollingStdev(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(0);
  for (let i = 0; i < values.length; i++) {
    if (i >= period - 1) {
      let s = 0;
      const start = i - period + 1;
      for (let k = start; k <= i; k++) s += values[k];
      const m = s / period;
      let v = 0;
      for (let k = start; k <= i; k++) v += (values[k] - m) ** 2;
      out[i] = Math.sqrt(v / period);
    }
  }
  return out;
}

function rollingCorr(a: number[], b: number[], period: number): number[] {
  const out: number[] = new Array(a.length).fill(0);
  for (let i = 0; i < a.length; i++) {
    if (i >= period - 1) {
      let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
      const start = i - period + 1;
      for (let k = start; k <= i; k++) {
        sa += a[k]; sb += b[k];
        saa += a[k] * a[k];
        sbb += b[k] * b[k];
        sab += a[k] * b[k];
      }
      const n = period;
      const ma = sa / n;
      const mb = sb / n;
      const va = saa / n - ma * ma;
      const vb = sbb / n - mb * mb;
      const cov = sab / n - ma * mb;
      const denom = Math.sqrt(va * vb);
      out[i] = denom > 0 ? cov / denom : 0;
    }
  }
  return out;
}

// ─── BTC halving schedule for Puell Multiple ───────────────────────────
const HALVINGS: { date: string; reward: number }[] = [
  { date: '2009-01-03', reward: 50 },
  { date: '2012-11-28', reward: 25 },
  { date: '2016-07-09', reward: 12.5 },
  { date: '2020-05-11', reward: 6.25 },
  { date: '2024-04-19', reward: 3.125 },
];
const BLOCKS_PER_DAY = 144;

function issuanceReward(date: string): number {
  let reward = 0;
  for (const h of HALVINGS) if (date >= h.date) reward = h.reward;
  return reward;
}

// ─── Block 1: Puell Multiple ──────────────────────────────────────────
// Puell = daily BTC issuance / 365d MA of daily issuance
async function fetchPuell(): Promise<Series[]> {
  const btc = await getBtcPrice();
  // Daily USD issuance = block reward × blocks_per_day × BTC price.
  const dailyIssuanceUSD = btc.map(d => issuanceReward(d.date) * BLOCKS_PER_DAY * d.close);
  const ma365 = sma(dailyIssuanceUSD, 365);
  const puell = dailyIssuanceUSD.map((iss, i) => (ma365[i] > 0 ? iss / ma365[i] : 0));
  return btc.map((d, i) => ({ date: d.date, value: puell[i] }));
}

// ─── Block 2: MVRV Z-score proxy ──────────────────────────────────────
// (price − 200w MA) / 200w rolling stdev of (price − 200w MA)
async function fetchMvrvZ(): Promise<Series[]> {
  const btc = await getBtcPrice();
  const closes = btc.map(d => d.close);
  const ma200 = sma(closes, 200 * 5); // 200w ≈ 1400 trading days
  const diff = closes.map((c, i) => c - ma200[i]);
  const stdev = rollingStdev(diff, 200 * 5);
  const z = diff.map((d, i) => (stdev[i] > 0 ? d / stdev[i] : 0));
  return btc.map((b, i) => ({ date: b.date, value: z[i] }));
}

// ─── Block 3: BTC/DXY Correlation (30d rolling Pearson) ───────────────
async function fetchDxyCorrelation(): Promise<Series[]> {
  const [btc, dxy] = await Promise.all([getBtcPrice(), getDxyPrice()]);
  const dxyMap = new Map(dxy.map(d => [d.date, d.close]));
  const btcCloses = btc.map(d => d.close);
  const dxyCloses = btc.map(d => dxyMap.get(d.date) ?? 0);
  const corr = rollingCorr(btcCloses, dxyCloses, 30);
  return btc.map((b, i) => ({ date: b.date, value: corr[i] }));
}

// ─── Block 4: NVT Ratio (proxy) ───────────────────────────────────────
// NVT = market_cap / (close × volume) — uses BTC exchange volume × price
// as proxy for USD transfer volume. True NVT needs on-chain tx volume
// (Glassnode/CoinMetrics paid). Circulating supply approximation: 19.5M.
async function fetchNvt(): Promise<Series[]> {
  const btc = await getBtcPrice();
  const SUPPLY = 19_500_000; // approximate current BTC supply
  const nvt = btc.map(d => {
    const usdVolume = d.close * d.volume;
    return usdVolume > 0 ? (d.close * SUPPLY) / usdVolume : 0;
  });
  return btc.map((b, i) => ({ date: b.date, value: nvt[i] }));
}

export const VALUATION_BLOCK_FETCHERS: Record<string, () => Promise<Series[]>> = {
  'valuation.puell':    fetchPuell,
  'valuation.mvrv_z':   fetchMvrvZ,
  'valuation.dxy_corr': fetchDxyCorrelation,
  'valuation.nvt':      fetchNvt,
};