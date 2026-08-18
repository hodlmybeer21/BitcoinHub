// BitcoinHub MPT — /api/mpt/quote
// Self-contained Vercel serverless function.
// Returns current portfolio value + per-asset mark without full optimization.

import type { VercelRequest, VercelResponse } from '@vercel/node';
// axios is lazy-imported inside fetchYahooLastPrice to avoid cold-start bundle crash

interface Holding { symbol: string; quantity: number; }
interface PricePoint { date: string; price: number; }

const UNIVERSE = [
  { symbol: 'BTC',  yahooSymbol: 'BTC-USD' },
  { symbol: 'IBIT', yahooSymbol: 'IBIT' },
  { symbol: 'FBTC', yahooSymbol: 'FBTC' },
  { symbol: 'MSTR', yahooSymbol: 'MSTR' },
  { symbol: 'COIN', yahooSymbol: 'COIN' },
  { symbol: 'MARA', yahooSymbol: 'MARA' },
  { symbol: 'RIOT', yahooSymbol: 'RIOT' },
];

interface CacheEntry { ts: number; price: number; }
const priceCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchYahooLastPrice(yahooSymbol: string): Promise<number> {
  const hit = priceCache.get(yahooSymbol);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.price;

  // Lazy-import axios to avoid pulling it into Vercel's cold-start bundle.
  // esbuild still bundles this file but defers axios load to first request.
  const { default: axios } = await import('axios');

  // Fetch a 5-day window to get a recent close.
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - 5 * 86400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${period1}&period2=${period2}&interval=1d`;
  const res = await axios.get(url, {
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BitcoinHub/1.0)' },
  });

  const closes: (number | null)[] = res.data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
  // Walk backwards to find the most recent non-null close.
  for (let i = closes.length - 1; i >= 0; i--) {
    if (closes[i] !== null && closes[i] !== undefined && !Number.isNaN(closes[i])) {
      const price = closes[i] as number;
      priceCache.set(yahooSymbol, { ts: Date.now(), price });
      return price;
    }
  }
  throw new Error(`No price data for ${yahooSymbol}`);
}

function ok(res: VercelResponse, data: unknown) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  res.json(data);
}

function err(res: VercelResponse, status: number, message: string) {
  res.status(status).json({ error: message });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return err(res, 405, 'POST required');

    const { holdings } = req.body ?? {};
    if (!Array.isArray(holdings) || holdings.length === 0) {
      return err(res, 400, '`holdings` must be a non-empty array');
    }

    const normalized: Holding[] = holdings
      .map((h: any) => ({
        symbol: String(h.symbol ?? '').toUpperCase().trim(),
        quantity: Number(h.quantity),
      }))
      .filter(h => h.symbol && Number.isFinite(h.quantity) && h.quantity > 0);

    if (normalized.length === 0) {
      return err(res, 400, 'No valid holdings after normalization');
    }

    // Fetch all prices in parallel
    const results = await Promise.allSettled(
      normalized.map(async (h) => {
        const asset = UNIVERSE.find(a => a.symbol === h.symbol);
        if (!asset) throw new Error(`Unknown symbol: ${h.symbol}`);
        const price = await fetchYahooLastPrice(asset.yahooSymbol);
        return { symbol: h.symbol, quantity: h.quantity, price, value: h.quantity * price };
      })
    );

    const symbols: { symbol: string; quantity: number; price: number; value: number }[] = [];
    const excluded: { symbol: string; reason: string }[] = [];

    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        symbols.push(r.value);
      } else {
        excluded.push({ symbol: normalized[i].symbol, reason: (r.reason as Error)?.message ?? 'Quote failed' });
      }
    });

    const totalValue = symbols.reduce((sum, s) => sum + s.value, 0);

    return ok(res, {
      totalValue,
      symbols,
      excludedAssets: excluded,
      asOf: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[mpt-quote] error:', e);
    return err(res, 500, e?.message ?? 'Failed to fetch quotes');
  }
}