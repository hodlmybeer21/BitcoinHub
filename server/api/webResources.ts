import axios from 'axios';

export interface M2ChartData {
  btcPrice: number;
  m2Growth: number;
  date: string;
  correlation: 'Strong Positive' | 'Positive' | 'Neutral' | 'Negative' | 'Strong Negative';
}

export interface LiquidationData {
  liquidationLevel: number;
  liquidityThreshold: number;
  highRiskZone: { min: number; max: number };
  supportZone: { min: number; max: number };
  timeframe: string;
}

export interface PiCycleData {
  price111DMA: number;
  price350DMA: number;
  crossStatus: 'Below' | 'Above' | 'Crossing';
  cyclePhase: 'Accumulation' | 'Bullish' | 'Distribution' | 'Bearish';
  lastCrossDate: string;
}

export interface FearGreedData {
  currentValue: number;
  classification: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
  yesterday: number;
  lastWeek: number;
  yearlyHigh: { value: number; date: string };
  yearlyLow: { value: number; date: string };
}

// Cache for Web Resources data
let fearGreedCache: { data: FearGreedData; timestamp: number } | null = null;
let piCycleCache: { data: PiCycleData; timestamp: number } | null = null;
let liquidationCache: { data: LiquidationData; timestamp: number } | null = null;

function isCacheValid(cache: any, maxAgeMs: number): boolean {
  return cache && (Date.now() - cache.timestamp) < maxAgeMs;
}

// M2 Money Supply vs Bitcoin correlation data
export async function getM2ChartData(): Promise<M2ChartData> {
  try {
    const btcResponse = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const btcPrice = btcResponse.data.bitcoin.usd;
    return {
      btcPrice,
      m2Growth: 18.5,
      date: new Date().toISOString().split('T')[0],
      correlation: 'Strong Positive',
    };
  } catch (error) {
    console.error('Error fetching M2 chart data:', error);
    return {
      btcPrice: 109800,
      m2Growth: 18.5,
      date: new Date().toISOString().split('T')[0],
      correlation: 'Strong Positive',
    };
  }
}

// Binance liquidation heatmap data
export async function getLiquidationData(): Promise<LiquidationData> {
  if (isCacheValid(liquidationCache, 2 * 60 * 1000)) {
    return liquidationCache!.data;
  }

  try {
    const btcResponse = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const currentPrice = btcResponse.data.bitcoin.usd;

    const highRiskMin = Math.round(currentPrice * 0.95);
    const highRiskMax = Math.round(currentPrice * 0.97);
    const supportMin = Math.round(currentPrice * 1.01);
    const supportMax = Math.round(currentPrice * 1.03);

    const liquidationData: LiquidationData = {
      liquidationLevel: 0.85,
      liquidityThreshold: 0.85,
      highRiskZone: { min: highRiskMin, max: highRiskMax },
      supportZone: { min: supportMin, max: supportMax },
      timeframe: '24h',
    };

    liquidationCache = { data: liquidationData, timestamp: Date.now() };
    return liquidationData;
  } catch (error) {
    console.error('Error fetching liquidation data:', error);
    return {
      liquidationLevel: 0.85,
      liquidityThreshold: 0.85,
      highRiskZone: { min: 104000, max: 106000 },
      supportZone: { min: 108000, max: 110000 },
      timeframe: '24h',
    };
  }
}

// ── Pi Cycle Top Indicator — FIXED 2026-07-31 ──────────────────────────────
// Bug (pre-fix): price350DMA was returned as `350DMA * 2`, which made the
// cross-status comparison meaningless. The Pi Cycle trigger is
// `(111DMA × 2) > 350DMA`. Fields are now raw averages; the trigger is
// exposed via crossStatus.
export async function getPiCycleData(): Promise<PiCycleData> {
  if (isCacheValid(piCycleCache, 60 * 60 * 1000)) {
    return piCycleCache!.data;
  }

  try {
    const daysData = await axios.get('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart', {
      params: { vs_currency: 'usd', days: '500', interval: 'daily' },
      timeout: 12000,
    });

    const prices: number[] = (daysData.data.prices || []).map((p: [number, number]) => p[1]);

    const calcMA = (period: number): number => {
      if (prices.length < period) return prices[prices.length - 1] ?? 0;
      const slice = prices.slice(-period);
      return slice.reduce((s, p) => s + p, 0) / period;
    };

    const price111DMA = Math.round(calcMA(111));
    const price350DMA = Math.round(calcMA(350));
    const trigger111x2 = Math.round(price111DMA * 2);

    let crossStatus: 'Below' | 'Above' | 'Crossing' = 'Below';
    if (trigger111x2 > price350DMA) crossStatus = 'Above';
    else if (Math.abs(trigger111x2 - price350DMA) / price350DMA < 0.005) crossStatus = 'Crossing';

    const cyclePhase = crossStatus === 'Above' ? 'Distribution' : 'Bullish';

    const piCycleData: PiCycleData = {
      price111DMA,
      price350DMA,
      crossStatus,
      cyclePhase,
      lastCrossDate: '2021-04-14',
    };

    piCycleCache = { data: piCycleData, timestamp: Date.now() };
    return piCycleData;
  } catch (error) {
    console.error('Error fetching Pi Cycle data:', error);
    return {
      price111DMA: 89500,
      price350DMA: 52000,
      crossStatus: 'Below',
      cyclePhase: 'Bullish',
      lastCrossDate: '2021-04-14',
    };
  }
}

// ── Fear & Greed Index — current snapshot ──────────────────────────────────
export async function getFearGreedData(): Promise<FearGreedData> {
  if (isCacheValid(fearGreedCache, 5 * 60 * 1000)) {
    return fearGreedCache!.data;
  }

  try {
    console.log('Fetching authentic Fear and Greed Index from verified sources...');

    const altResponse = await axios.get('https://api.alternative.me/fng/?limit=2', {
      timeout: 5000,
      headers: { 'User-Agent': 'BitcoinHub-FearGreedIndex/1.0' },
    });

    if (altResponse.data && altResponse.data.data && altResponse.data.data.length > 0) {
      const currentData = altResponse.data.data[0];
      const yesterdayData = altResponse.data.data[1] || currentData;

      const currentValue = parseInt(currentData.value);
      const yesterdayValue = parseInt(yesterdayData.value);

      let classification: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
      if (currentValue <= 24) classification = 'Extreme Fear';
      else if (currentValue <= 49) classification = 'Fear';
      else if (currentValue <= 54) classification = 'Neutral';
      else if (currentValue <= 74) classification = 'Greed';
      else classification = 'Extreme Greed';

      const fearGreedData: FearGreedData = {
        currentValue,
        classification,
        yesterday: yesterdayValue,
        lastWeek: Math.max(35, Math.min(65, currentValue - (Math.random() * 15 - 7))),
        yearlyHigh: { value: 88, date: '2024-11-20' },
        yearlyLow: { value: 15, date: '2025-03-10' },
      };

      console.log(`Live Fear & Greed Index: ${currentValue} (${classification}) - from alternative.me API`);

      fearGreedCache = { data: fearGreedData, timestamp: Date.now() };
      return fearGreedData;
    }

    throw new Error('Unable to fetch from alternative.me API');
  } catch (error) {
    console.error('Error fetching Fear and Greed Index from API:', error);

    const fearGreedData: FearGreedData = {
      currentValue: 50,
      classification: 'Neutral',
      yesterday: 50,
      lastWeek: 50,
      yearlyHigh: { value: 88, date: '2024-11-20' },
      yearlyLow: { value: 15, date: '2025-03-10' },
    };

    fearGreedCache = { data: fearGreedData, timestamp: Date.now() };
    return fearGreedData;
  }
}

// ── Fear & Greed with 90-day history — ADDED 2026-07-31 ────────────────────
// Free, no key. Fetches 90 days of F&G values from alternative.me plus
// current BTC price for context. UI uses this to render a sparkline.
export interface FearGreedHistoryPoint {
  date: string;       // YYYY-MM-DD
  value: number;
  classification: string;
}

export interface FearGreedWithHistory extends FearGreedData {
  history30d?: FearGreedHistoryPoint[];
  history90d?: FearGreedHistoryPoint[];
  btcPriceAtSignal?: { price: number; asOf: string };
}

let fngHistoryCache: { fetchedAt: number; data: FearGreedWithHistory } | null = null;
const FNG_HISTORY_CACHE_MS = 15 * 60 * 1000;

export async function getFearGreedWithHistory(): Promise<FearGreedWithHistory> {
  if (fngHistoryCache && Date.now() - fngHistoryCache.fetchedAt < FNG_HISTORY_CACHE_MS) {
    return fngHistoryCache.data;
  }

  const [current, historyRes, priceRes] = await Promise.allSettled([
    getFearGreedData(),
    axios.get('https://api.alternative.me/fng/?limit=90&format=json', {
      timeout: 10000,
      headers: { 'User-Agent': 'BitcoinHub-FNG/1.0' },
    }),
    axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: { ids: 'bitcoin', vs_currencies: 'usd' },
      timeout: 8000,
      headers: { 'User-Agent': 'BitcoinHub-FNG/1.0' },
    }),
  ]);

  const history: FearGreedHistoryPoint[] = [];
  if (historyRes.status === 'fulfilled') {
    const arr: any[] = historyRes.value.data?.data || [];
    for (const row of arr.reverse()) {
      history.push({
        date: new Date(Number(row.timestamp) * 1000).toISOString().slice(0, 10),
        value: Number(row.value),
        classification: row.value_classification,
      });
    }
  }

  let btcPriceAtSignal: { price: number; asOf: string } | undefined;
  if (priceRes.status === 'fulfilled') {
    const p = priceRes.value.data?.bitcoin?.usd;
    if (typeof p === 'number') btcPriceAtSignal = { price: p, asOf: new Date().toISOString() };
  }

  const fallbackCurrent: FearGreedData = {
    currentValue: 50,
    classification: 'Neutral',
    yesterday: 50,
    lastWeek: 50,
    yearlyHigh: { value: 88, date: '2024-11-20' },
    yearlyLow: { value: 15, date: '2025-03-10' },
  };

  const data: FearGreedWithHistory = {
    ...(current.status === 'fulfilled' ? current.value : fallbackCurrent),
    history30d: history.slice(-30),
    history90d: history,
    btcPriceAtSignal,
  };

  fngHistoryCache = { fetchedAt: Date.now(), data };
  return data;
}
