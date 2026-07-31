/**
 * Stablecoin market cap endpoint — CoinGecko free, no key.
 *
 * Returns total stablecoin market cap + per-coin breakdown. Used on the
 * analytics dashboard as a liquidity proxy ("how much dry powder is on the
 * sidelines, denominated in stablecoins?").
 */
import axios from 'axios';

export interface StablecoinResponse {
  totalMarketCapUSD: number;
  total24hVolumeUSD: number;
  coinCount: number;
  topCoins: Array<{
    symbol: string;
    name: string;
    marketCapUSD: number;
    priceUSD: number;
    change24h: number;
    image?: string;
  }>;
  asOf: string;
  source: string;
}

let cache: { fetchedAt: number; data: StablecoinResponse } | null = null;
const CACHE_MS = 10 * 60 * 1000; // 10 min

export async function getStablecoinMarketData(): Promise<StablecoinResponse> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) {
    return cache.data;
  }

  const res = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
    params: {
      vs_currency: 'usd',
      category: 'stablecoins',
      order: 'market_cap_desc',
      per_page: 50,
      page: 1,
      sparkline: false,
      price_change_percentage: '24h',
    },
    timeout: 12000,
    headers: { 'User-Agent': 'BitcoinHub-Stablecoins/1.0' },
  });

  const coins: any[] = res.data || [];
  const topCoins = coins.map(c => ({
    symbol: (c.symbol || '').toUpperCase(),
    name: c.name || '',
    marketCapUSD: Number(c.market_cap) || 0,
    priceUSD: Number(c.current_price) || 0,
    change24h: Number(c.price_change_percentage_24h) || 0,
    image: c.image,
  })).filter(c => c.marketCapUSD > 0);

  const totalMarketCapUSD = topCoins.reduce((s, c) => s + c.marketCapUSD, 0);
  const total24hVolumeUSD = coins.reduce((s: number, c: any) => s + (Number(c.total_volume) || 0), 0);

  const data: StablecoinResponse = {
    totalMarketCapUSD,
    total24hVolumeUSD,
    coinCount: topCoins.length,
    topCoins: topCoins.slice(0, 15),
    asOf: new Date().toISOString(),
    source: 'CoinGecko',
  };

  cache = { fetchedAt: Date.now(), data };
  return data;
}
