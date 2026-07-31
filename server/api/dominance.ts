import axios from 'axios';

// Cache for dominance data
let dominanceCache: {
  data: any;
  timestamp: number;
} | null = null;

let dominanceHistoryCache: { fetchedAt: number; data: any } | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const HISTORY_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

function isCacheValid(): boolean {
  return dominanceCache !== null &&
    (Date.now() - dominanceCache.timestamp) < CACHE_DURATION;
}

// Clear cache function for manual refresh
export function clearDominanceCache(): void {
  dominanceCache = null;
  dominanceHistoryCache = null;
  console.log('Dominance cache cleared for fresh data fetch');
}

export async function getBitcoinDominance(): Promise<{
  dominance: number;
  totalMarketCap: number;
  history30d?: Array<{ date: string; dominance: number }>;
  lastUpdated: string;
  source: string;
}> {
  if (isCacheValid() && dominanceCache?.data) {
    return dominanceCache.data;
  }

  try {
    console.log('Fetching live Bitcoin dominance from CoinGecko API...');

    const response = await axios.get(
      'https://api.coingecko.com/api/v3/global',
      {
        timeout: 10000,
        headers: { 'User-Agent': 'BitcoinHub-DominanceTracker/1.0' },
      }
    );

    if (response.data && response.data.data) {
      const globalData = response.data.data;

      const dominanceData = {
        dominance: globalData.market_cap_percentage?.btc || 63.5,
        totalMarketCap: globalData.total_market_cap?.usd || 3600000000000,
        lastUpdated: new Date().toISOString(),
        source: 'CoinGecko Global',
      };

      console.log(`Bitcoin dominance from CoinGecko: ${dominanceData.dominance.toFixed(1)}%`);

      dominanceCache = { data: dominanceData, timestamp: Date.now() };
      return dominanceData;
    }

    throw new Error('Invalid response format from CoinGecko');
  } catch (error) {
    console.error('Error fetching Bitcoin dominance from CoinGecko:', error);

    const fallbackData = {
      dominance: 56.2,
      totalMarketCap: 2240000000000,
      lastUpdated: new Date().toISOString(),
      source: 'CoinGecko Global (Fallback)',
    };

    dominanceCache = { data: fallbackData, timestamp: Date.now() };
    return fallbackData;
  }
}

export async function getGlobalCryptoMetrics(): Promise<{
  totalMarketCap: number;
  total24hVolume: number;
  btcDominance: number;
  ethDominance: number;
  activeCryptocurrencies: number;
  lastUpdated: string;
  source: string;
}> {
  try {
    console.log('Fetching global crypto metrics from CoinGecko...');

    const response = await axios.get(
      'https://api.coingecko.com/api/v3/global',
      {
        timeout: 10000,
        headers: { 'User-Agent': 'BitcoinHub-GlobalMetrics/1.0' },
      }
    );

    if (response.data && response.data.data) {
      const globalData = response.data.data;

      return {
        totalMarketCap: globalData.total_market_cap?.usd || 3300000000000,
        total24hVolume: globalData.total_volume?.usd || 190000000000,
        btcDominance: globalData.market_cap_percentage?.btc || 60.8,
        ethDominance: globalData.market_cap_percentage?.eth || 13.2,
        activeCryptocurrencies: globalData.active_cryptocurrencies || 3200,
        lastUpdated: new Date().toISOString(),
        source: 'CoinGecko Global',
      };
    }

    throw new Error('Invalid response format from CoinGecko');
  } catch (error) {
    console.error('Error fetching global crypto metrics from CoinGecko:', error);

    return {
      totalMarketCap: 3300000000000,
      total24hVolume: 190000000000,
      btcDominance: 60.8,
      ethDominance: 13.2,
      activeCryptocurrencies: 3200,
      lastUpdated: new Date().toISOString(),
      source: 'CoinGecko Global (Fallback)',
    };
  }
}

/**
 * 30-day BTC dominance history — CoinGecko /market_chart, free, no key.
 * Returns daily samples so the UI can render a sparkline. ADDED 2026-07-31.
 */
export async function getDominanceHistory(days = 30): Promise<{
  history: Array<{ date: string; dominance: number; marketCapUSD: number }>;
  asOf: string;
  source: string;
}> {
  if (dominanceHistoryCache && Date.now() - dominanceHistoryCache.fetchedAt < HISTORY_CACHE_DURATION) {
    return dominanceHistoryCache.data;
  }

  const res = await axios.get('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart', {
    params: { vs_currency: 'usd', days, interval: 'daily' },
    timeout: 12000,
    headers: { 'User-Agent': 'BitcoinHub-DominanceHistory/1.0' },
  });

  const caps: [number, number][] = res.data?.market_caps || [];
  const totals: [number, number][] = res.data?.total_volumes || [];

  const history: Array<{ date: string; dominance: number; marketCapUSD: number }> = [];
  for (let i = 0; i < caps.length; i++) {
    const ts = caps[i][0];
    const cap = caps[i][1];
    const totalMcap = totals[i]?.[1] ?? cap;
    history.push({
      date: new Date(ts).toISOString().slice(0, 10),
      dominance: totalMcap > 0 ? Number(((cap / totalMcap) * 100).toFixed(2)) : 0,
      marketCapUSD: cap,
    });
  }

  const data = {
    history,
    asOf: new Date().toISOString(),
    source: 'CoinGecko market_chart',
  };
  dominanceHistoryCache = { fetchedAt: Date.now(), data };
  return data;
}
