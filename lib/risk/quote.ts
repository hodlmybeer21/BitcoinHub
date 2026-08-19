// BitcoinHub Risk Metric — /api/risk/quote
// Fetches daily price history for an asset. Primary: Yahoo Finance (proven
// on Vercel via MPT code). Fallback: CoinGecko (public endpoint, sometimes
// 401/429 from shared sandbox IPs).
//
// Lazy-imports axios inside the fetcher (architecture invariant #3).
// Caches last fetch per symbol for 1h to avoid hammering upstream.

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface CacheEntry {
  ts: number;
  closes: number[];          // daily close prices, oldest → newest
  timestamps: number[];      // unix seconds, parallel to closes
  source: 'yahoo' | 'coingecko';
}

const priceCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Asset registry. Yahoo symbol first; CoinGecko ID as fallback.
interface AssetInfo {
  yahooSymbol: string;
  coingeckoId: string;
  name: string;
}

const ASSET_MAP: Record<string, AssetInfo> = {
  BTC: { yahooSymbol: 'BTC-USD', coingeckoId: 'bitcoin',  name: 'Bitcoin'  },
  ETH: { yahooSymbol: 'ETH-USD', coingeckoId: 'ethereum', name: 'Ethereum' },
};

const DEFAULT_DAYS = 3650; // 10 years for stable 4y z-score windows

/**
 * Fetch daily close prices for an asset symbol. Tries Yahoo first
 * (proven on Vercel), falls back to CoinGecko on failure.
 *
 * @param symbol Uppercase ticker (BTC, ETH)
 * @param days Lookback in days (capped 30..3650)
 */
export async function fetchDailyCloses(
  symbol: string,
  days: number = DEFAULT_DAYS,
): Promise<{ closes: number[]; timestamps: number[]; meta: { symbol: string; name: string; days: number; fetchedAt: string; source: 'yahoo' | 'coingecko' } }> {
  const upper = symbol.toUpperCase();
  const asset = ASSET_MAP[upper];
  if (!asset) throw new Error(`Unsupported symbol: ${symbol}. Supported: ${Object.keys(ASSET_MAP).join(', ')}`);

  const safeDays = Math.max(30, Math.min(3650, Math.floor(days)));
  const cacheKey = `${upper}:${safeDays}`;
  const hit = priceCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return {
      closes: hit.closes,
      timestamps: hit.timestamps,
      meta: { symbol: upper, name: asset.name, days: safeDays, fetchedAt: new Date(hit.ts).toISOString(), source: hit.source },
    };
  }

  // Lazy-import axios — never at module top.
  const { default: axios } = await import('axios');

  // ─── Primary: Yahoo Finance ──────────────────────────────────────────────
  try {
    const result = await fetchFromYahoo(axios, asset.yahooSymbol, safeDays);
    priceCache.set(cacheKey, { ts: Date.now(), closes: result.closes, timestamps: result.timestamps, source: 'yahoo' });
    return {
      closes: result.closes,
      timestamps: result.timestamps,
      meta: { symbol: upper, name: asset.name, days: safeDays, fetchedAt: new Date().toISOString(), source: 'yahoo' },
    };
  } catch (e: any) {
    console.warn(`[risk-quote] Yahoo failed for ${upper}: ${e?.message ?? e}. Trying CoinGecko...`);
  }

  // ─── Fallback: CoinGecko ─────────────────────────────────────────────────
  const cgResult = await fetchFromCoinGecko(axios, asset.coingeckoId, safeDays);
  priceCache.set(cacheKey, { ts: Date.now(), closes: cgResult.closes, timestamps: cgResult.timestamps, source: 'coingecko' });
  return {
    closes: cgResult.closes,
    timestamps: cgResult.timestamps,
    meta: { symbol: upper, name: asset.name, days: safeDays, fetchedAt: new Date().toISOString(), source: 'coingecko' },
  };
}

async function fetchFromYahoo(
  axios: any,
  yahooSymbol: string,
  days: number,
): Promise<{ closes: number[]; timestamps: number[] }> {
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - days * 86400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${period1}&period2=${period2}&interval=1d`;

  const res = await axios.get(url, {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BitcoinHub/1.0)' },
  });

  const result = res.data?.chart?.result?.[0];
  if (!result) throw new Error(`No Yahoo data for ${yahooSymbol}`);

  const timestamps: number[] = result.timestamp || [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];

  const out_ts: number[] = [];
  const out_close: number[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    if (typeof timestamps[i] !== 'number' || c === null || c === undefined || Number.isNaN(c)) continue;
    out_ts.push(timestamps[i]);
    out_close.push(c);
  }

  if (out_close.length < 30) throw new Error(`Too few valid Yahoo closes: ${out_close.length}`);
  return { closes: out_close, timestamps: out_ts };
}

async function fetchFromCoinGecko(
  axios: any,
  coingeckoId: string,
  days: number,
): Promise<{ closes: number[]; timestamps: number[] }> {
  const url = `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
  const res = await axios.get(url, {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BitcoinHub/1.0)' },
  });

  const prices: [number, number][] = res.data?.prices ?? [];
  if (prices.length < 30) throw new Error(`Insufficient CoinGecko history: ${prices.length} points`);

  const timestamps: number[] = [];
  const closes: number[] = [];
  for (const [ts, price] of prices) {
    if (typeof ts !== 'number' || typeof price !== 'number' || !Number.isFinite(price)) continue;
    timestamps.push(Math.floor(ts / 1000));
    closes.push(price);
  }
  if (closes.length < 30) throw new Error('Too few valid closes after filtering');
  return { closes, timestamps };
}

/**
 * Get the list of supported symbols. Used by the dashboard to populate
 * the asset picker.
 */
export function getSupportedSymbols(): { symbol: string; name: string; yahooSymbol: string; coingeckoId: string }[] {
  return Object.entries(ASSET_MAP).map(([symbol, v]) => ({ symbol, name: v.name, yahooSymbol: v.yahooSymbol, coingeckoId: v.coingeckoId }));
}

// ─── Standalone handler ──────────────────────────────────────────────────────
// Useful for debugging; not currently wired into the dispatcher.

async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const symbol = String((_req.query?.symbol as string) ?? 'BTC').toUpperCase();
    const days = Number(_req.query?.days ?? DEFAULT_DAYS);
    const result = await fetchDailyCloses(symbol, days);
    return res.status(200).json({
      count: result.closes.length,
      first: result.timestamps[0],
      last: result.timestamps[result.timestamps.length - 1],
      latestClose: result.closes[result.closes.length - 1],
      meta: result.meta,
    });
  } catch (e: any) {
    console.error('[risk-quote] error:', e);
    return res.status(500).json({ error: e?.message ?? 'Quote fetch failed' });
  }
}

export default handler;
