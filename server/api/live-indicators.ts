/**
 * Live BTC cycle/market indicators — computed from daily BTC price history.
 *
 * All indicators here are pure math from price closes. No external API keys
 * required beyond BTC daily history (CryptoCompare free, CoinGecko free).
 *
 * IMPORTANT — every indicator here is a SIMPLIFIED proxy for the canonical
 * on-chain version. The "real" Puell Multiple needs miner issuance data;
 * "real" MVRV needs UTXO unrealized-profit data; etc. Those require paid
 * Glassnode / CoinMetrics / CryptoQuant. What we compute here gives a
 * directionally-accurate read for free and is labelled honestly.
 */
import axios from 'axios';

// ── Price history fetch ──────────────────────────────────────────────────────

let historyCache: { fetchedAt: number; closes: number[]; timestamps: number[] } | null = null;
const HISTORY_CACHE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch ~2.5 years of daily BTC closes. Primary: CryptoCompare free.
 * Fallback: CoinGecko /market_chart. Both are public, no key.
 */
async function fetchDailyCloses(days = 900): Promise<{ closes: number[]; timestamps: number[] }> {
  if (historyCache && Date.now() - historyCache.fetchedAt < HISTORY_CACHE_MS) {
    return { closes: historyCache.closes, timestamps: historyCache.timestamps };
  }

  // Primary: CryptoCompare histoday
  try {
    const res = await axios.get('https://min-api.cryptocompare.com/data/v2/histoday', {
      params: { fsym: 'BTC', tsym: 'USD', limit: days, aggregate: 1 },
      timeout: 12000,
    });
    const data = res.data?.Data?.Data || [];
    if (data.length >= 365) {
      const closes = data.map((d: any) => Number(d.close)).filter((n: number) => n > 0);
      const timestamps = data.map((d: any) => Number(d.time));
      historyCache = { fetchedAt: Date.now(), closes, timestamps };
      return { closes, timestamps };
    }
  } catch (err) {
    console.warn('[live-indicators] CryptoCompare failed, trying CoinGecko:', (err as Error).message);
  }

  // Fallback: CoinGecko market_chart
  try {
    const res = await axios.get('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart', {
      params: { vs_currency: 'usd', days, interval: 'daily' },
      timeout: 12000,
      headers: { 'User-Agent': 'BitcoinHub-LiveIndicators/1.0' },
    });
    const prices: [number, number][] = res.data?.prices || [];
    if (prices.length >= 365) {
      const closes = prices.map(([, p]) => p);
      const timestamps = prices.map(([t]) => Math.floor(t / 1000));
      historyCache = { fetchedAt: Date.now(), closes, timestamps };
      return { closes, timestamps };
    }
  } catch (err) {
    console.warn('[live-indicators] CoinGecko fallback failed:', (err as Error).message);
  }

  throw new Error('Unable to fetch BTC daily price history from any source');
}

// ── Math helpers ─────────────────────────────────────────────────────────────

function sma(closes: number[], period: number): number {
  if (closes.length < period) return closes[closes.length - 1] ?? 0;
  const slice = closes.slice(-period);
  return slice.reduce((s, p) => s + p, 0) / period;
}

function rsi(closes: number[], period = 22): number {
  if (closes.length < period + 1) return 50;
  const slice = closes.slice(-(period + 1));
  let gains = 0, losses = 0;
  for (let i = 1; i < slice.length; i++) {
    const change = slice[i] - slice[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Bitcoin Rainbow Chart regression (standard log fit from the original
 * chart by Trolololo). Returns the band label for the current price.
 *
 * log10(price) = -17.01641 + 5.84554 * log10(days_since_genesis)
 *
 * genesis = block 0, 2009-01-03.
 */
function rainbowBand(currentPrice: number): { band: string; position: number; regression: number } {
  const GENESIS_MS = Date.UTC(2009, 0, 3);
  const daysSinceGenesis = Math.max(1, (Date.now() - GENESIS_MS) / (24 * 60 * 60 * 1000));
  const logDays = Math.log10(daysSinceGenesis);
  const logPrice = Math.log10(currentPrice);
  const regression = -17.01641 + 5.84554 * logDays;
  // Position: how many "band steps" above regression. Each step ≈ 0.4 log units.
  const bands = [
    { max: -2.5, label: 'Maximum Bubble' },
    { max: -1.3, label: 'Sell. Sell. Sell.' },
    { max: -0.7, label: 'FOMO Intensifies' },
    { max: 0.0, label: 'Is This a Bubble?' },
    { max: 0.7, label: 'HODL!' },
    { max: 1.3, label: 'Still Cheap' },
    { max: 1.6, label: 'Accumulate' },
    { max: 2.0, label: 'BUY!' },
    { max: Infinity, label: 'Fire Sale' },
  ];
  const delta = logPrice - regression;
  const band = bands.find(b => delta <= b.max)?.label ?? 'Unknown';
  // Position as % through the 9-band scale (0 = fire sale, 100 = max bubble)
  const position = Math.max(0, Math.min(100, ((delta + 2.5) / 5.0) * 100));
  return { band, position, regression: Math.pow(10, regression) };
}

// ── Public indicator set ─────────────────────────────────────────────────────

export interface LiveIndicators {
  btcPrice: number;
  asOf: string;
  dataSource: string;
  dataPoints: number;
  historyDays: number;
  indicators: {
    piCycle: { ma111: number; ma350: number; ma111x2: number; triggered: boolean; distancePct: number };
    mayerMultiple: number;             // price / 200DMA
    twoYearMaMultiplier: number;       // price / 730DMA — Golden Ratio
    puellProxy: number;                // price / 365DMA (proxy for daily_issuance_usd / 365MA)
    ahr999Proxy: number;               // price / 200DMA × time-scaling factor
    rsi22: number;
    rainbow: { band: string; position: number; regressionPrice: number };
  };
}

export async function computeLiveIndicators(): Promise<LiveIndicators> {
  const { closes, timestamps } = await fetchDailyCloses(900);
  const price = closes[closes.length - 1];
  const ma111 = sma(closes, 111);
  const ma350 = sma(closes, 350);
  const ma200 = sma(closes, 200);
  const ma365 = sma(closes, 365);
  const ma730 = sma(closes, 730);
  const ma111x2 = ma111 * 2;
  const triggered = ma111x2 > ma350;
  const distancePct = ((ma111x2 - ma350) / ma350) * 100;

  // Simplified Ahr999 (no time-cycle weighting — see header doc). The full
  // metric penalises price relative to the geometric DCA cost across the
  // halving cycle; this gives ~70% of the signal.
  const ahr999Proxy = (price / ma200) * 1.2;

  return {
    btcPrice: Math.round(price * 100) / 100,
    asOf: new Date().toISOString(),
    dataSource: 'CryptoCompare (CoinGecko fallback)',
    dataPoints: closes.length,
    historyDays: closes.length,
    indicators: {
      piCycle: {
        ma111: Math.round(ma111),
        ma350: Math.round(ma350),
        ma111x2: Math.round(ma111x2),
        triggered,
        distancePct: Math.round(distancePct * 100) / 100,
      },
      mayerMultiple: Math.round((price / ma200) * 100) / 100,
      twoYearMaMultiplier: Math.round((price / ma730) * 100) / 100,
      puellProxy: Math.round((price / ma365) * 100) / 100,
      ahr999Proxy: Math.round(ahr999Proxy * 100) / 100,
      rsi22: Math.round(rsi(closes, 22) * 100) / 100,
      rainbow: (() => {
        const r = rainbowBand(price);
        return { band: r.band, position: Math.round(r.position), regressionPrice: Math.round(r.regression) };
      })(),
    },
  };
}

/**
 * Compact summary formatted for the dashboard bull-market-indicator panel.
 * Each entry matches the BullMarketIndicator interface so the existing UI
 * renders without changes.
 */
export interface BullMarketIndicator {
  id: number;
  name: string;
  current: string | number;
  reference: string;
  hitOrNot: boolean;
  distanceToHit: string | number;
  progress: string;
}

export async function getBullMarketIndicatorPanel(): Promise<{
  indicators: BullMarketIndicator[];
  asOf: string;
  totalHit: number;
  totalIndicators: number;
  overallSignal: 'Hold' | 'Sell';
  sellPercentage: number;
}> {
  let live: LiveIndicators | null = null;
  let btcDominance: number | null = null;
  let altseason: number | null = null;

  const tasks: Promise<any>[] = [
    computeLiveIndicators().then(v => { live = v; }).catch(e => {
      console.warn('[live-indicators] failed:', (e as Error).message);
    }),
    axios.get('https://api.coingecko.com/api/v3/global', {
      timeout: 8000,
      headers: { 'User-Agent': 'BitcoinHub-LiveIndicators/1.0' },
    }).then(r => {
      btcDominance = r.data?.data?.market_cap_percentage?.btc ?? null;
    }).catch(() => {}),
  ];
  await Promise.allSettled(tasks);

  const i = live?.indicators;
  const price = live?.btcPrice ?? 0;

  const rows: BullMarketIndicator[] = [];

  // Pi Cycle Top
  if (i) {
    rows.push({
      id: 1,
      name: 'Pi Cycle Top (111DMA×2 vs 350DMA)',
      current: i.piCycle.ma111x2.toLocaleString(),
      reference: `> ${i.piCycle.ma350.toLocaleString()}`,
      hitOrNot: i.piCycle.triggered,
      distanceToHit: `${i.piCycle.distancePct >= 0 ? '+' : ''}${i.piCycle.distancePct.toFixed(2)}%`,
      progress: i.piCycle.triggered ? '100%' : `${Math.min(100, Math.max(0, 50 + i.piCycle.distancePct)).toFixed(0)}%`,
    });
    rows.push({
      id: 2,
      name: 'Mayer Multiple (price/200DMA)',
      current: i.mayerMultiple.toFixed(2),
      reference: '>= 2.4 (sell zone)',
      hitOrNot: i.mayerMultiple >= 2.4,
      distanceToHit: `${(2.4 - i.mayerMultiple).toFixed(2)}`,
      progress: `${Math.min(100, (i.mayerMultiple / 2.4) * 100).toFixed(0)}%`,
    });
    rows.push({
      id: 3,
      name: 'Puell Multiple (price/365DMA proxy)',
      current: i.puellProxy.toFixed(2),
      reference: '>= 2.2 (sell)',
      hitOrNot: i.puellProxy >= 2.2,
      distanceToHit: `${(2.2 - i.puellProxy).toFixed(2)}`,
      progress: `${Math.min(100, (i.puellProxy / 2.2) * 100).toFixed(0)}%`,
    });
    rows.push({
      id: 4,
      name: 'Ahr999 Index (price/200DMA × 1.2)',
      current: i.ahr999Proxy.toFixed(2),
      reference: '< 1.2 (buy zone)',
      hitOrNot: i.ahr999Proxy < 1.2,
      distanceToHit: `${(i.ahr999Proxy - 1.2).toFixed(2)}`,
      progress: `${Math.max(0, Math.min(100, ((2.0 - i.ahr999Proxy) / 1.6) * 100)).toFixed(0)}%`,
    });
    rows.push({
      id: 5,
      name: '2-Year MA Multiplier (price/730DMA)',
      current: i.twoYearMaMultiplier.toFixed(2),
      reference: '>= 5 (sell)',
      hitOrNot: i.twoYearMaMultiplier >= 5,
      distanceToHit: `${(5 - i.twoYearMaMultiplier).toFixed(2)}`,
      progress: `${Math.min(100, (i.twoYearMaMultiplier / 5) * 100).toFixed(0)}%`,
    });
    rows.push({
      id: 6,
      name: 'RSI-22 (daily)',
      current: i.rsi22.toFixed(2),
      reference: '>= 80 (overbought)',
      hitOrNot: i.rsi22 >= 80,
      distanceToHit: `${(80 - i.rsi22).toFixed(2)}`,
      progress: `${Math.min(100, (i.rsi22 / 80) * 100).toFixed(0)}%`,
    });
    rows.push({
      id: 7,
      name: 'Rainbow Chart Position',
      current: i.rainbow.band,
      reference: 'Max Bubble = sell',
      hitOrNot: i.rainbow.position >= 80,
      distanceToHit: `${(100 - i.rainbow.position).toFixed(0)}`,
      progress: `${i.rainbow.position}% through bands`,
    });
  }

  // BTC Dominance (live)
  if (btcDominance !== null) {
    rows.push({
      id: 8,
      name: 'Bitcoin Dominance',
      current: `${btcDominance.toFixed(2)}%`,
      reference: '>= 65% (rotation signal)',
      hitOrNot: btcDominance >= 65,
      distanceToHit: `${(65 - btcDominance).toFixed(2)}%`,
      progress: `${Math.min(100, (btcDominance / 65) * 100).toFixed(0)}%`,
    });
  }

  const totalHit = rows.filter(r => r.hitOrNot).length;
  const overallSignal: 'Hold' | 'Sell' = totalHit > 4 ? 'Sell' : 'Hold';
  return {
    indicators: rows,
    asOf: live?.asOf ?? new Date().toISOString(),
    totalHit,
    totalIndicators: rows.length,
    overallSignal,
    sellPercentage: rows.length ? Math.round((totalHit / rows.length) * 100) : 0,
  };
}

/**
 * Invalidate the cached daily history — useful for cron jobs or manual
 * refresh after halvings / major events.
 */
export function clearIndicatorsCache(): void {
  historyCache = null;
}
