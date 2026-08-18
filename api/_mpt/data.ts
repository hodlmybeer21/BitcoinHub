// BitcoinHub MPT — Historical price data fetching
// BTC from CoinGecko; stocks/ETFs from Yahoo Finance.

import axios from 'axios';
import type { MPTAsset } from './cycles';

export interface PricePoint {
  date: string;   // YYYY-MM-DD
  price: number;
}

const TIMEOUT_MS = 30000;

// Per-source cache: 1 hour for daily-aligned historical series.
// Key = `${source}:${symbol}:${start}:${end}`
type CacheKey = string;
const cache = new Map<CacheKey, { ts: number; data: PricePoint[] }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function cachedFetch<T>(key: CacheKey, fetcher: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && (Date.now() - hit.ts) < CACHE_TTL_MS) {
    return Promise.resolve(hit.data as unknown as T);
  }
  return fetcher().then(data => {
    cache.set(key, { ts: Date.now(), data: data as unknown as PricePoint[] });
    return data;
  });
}

async function fetchCoinGeckoBitcoin(start: string, end: string): Promise<PricePoint[]> {
  const startTs = Math.floor(new Date(start).getTime() / 1000);
  const endTs = end ? Math.floor(new Date(end).getTime() / 1000) : Math.floor(Date.now() / 1000);
  const days = Math.ceil((endTs - startTs) / 86400);

  const key = `coingecko:bitcoin:${start}:${end}`;
  return cachedFetch(key, async () => {
    const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`;
    const res = await axios.get(url, { timeout: TIMEOUT_MS });
    if (!res.data?.prices) throw new Error('CoinGecko returned no price data');
    return res.data.prices.map(([ts, price]: [number, number]) => ({
      date: new Date(ts).toISOString().split('T')[0],
      price,
    }));
  });
}

async function fetchYahooFinance(symbol: string, start: string, end: string): Promise<PricePoint[]> {
  const period1 = Math.floor(new Date(start).getTime() / 1000);
  const period2 = end ? Math.floor(new Date(end).getTime() / 1000) : Math.floor(Date.now() / 1000);

  const key = `yahoo:${symbol}:${start}:${end}`;
  return cachedFetch(key, async () => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&events=history`;
    const res = await axios.get(url, {
      timeout: TIMEOUT_MS,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BitcoinHub/1.0)' },
    });

    const result = res.data?.chart?.result?.[0];
    if (!result) throw new Error(`No chart data for ${symbol}`);

    const timestamps: number[] = result.timestamp || [];
    const indicators = result.indicators || {};
    // adjclose handles splits; fall back to close
    const closes: (number | null)[] =
      (indicators.adjclose?.[0]?.adjclose as (number | null)[] | undefined) ||
      (indicators.quote?.[0]?.close as (number | null)[] | undefined) ||
      [];

    return timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        price: closes[i],
      }))
      .filter((p): p is PricePoint => p.price !== null && p.price !== undefined && !Number.isNaN(p.price));
  });
}

export async function fetchAssetPrices(asset: MPTAsset, start: string, end: string): Promise<PricePoint[]> {
  let series: PricePoint[];
  if (asset.source === 'coingecko') {
    series = await fetchCoinGeckoBitcoin(start, end);
  } else {
    series = await fetchYahooFinance(asset.yahooSymbol!, start, end);
  }

  // Trim to asset's first available date
  return series.filter(p => p.date >= asset.firstAvailable);
}