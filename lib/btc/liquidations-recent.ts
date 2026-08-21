// BitcoinHub — /api/btc/liquidations-recent
//
// "Recent Deribit options trades near BTC price" — bucketed by strike distance
// from the current BTC index price. Honest label: this is a PROXY for liquidation
// *zones*, not actual realized liquidations (which require Coinglass/Coinalyze
// paid feeds). It answers the question "where is recent options activity clustering
// around BTC", which is where liquidations cascade through.
//
// Data source: Deribit public REST `/api/v2/public/get_last_trades_by_currency`,
// free, no key, CORS-enabled.

import type { VercelRequest, VercelResponse } from '@vercel/node';

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 min — recent trades, refresh aggressively
let cache: { at: number; data: unknown } | null = null;

interface DeribitTrade {
  trade_id?: string;
  instrument_name?: string;
  price?: number;          // USD per contract
  amount?: number;         // contracts (1 contract = 1 BTC for standard options)
  direction?: 'buy' | 'sell';
  timestamp?: number;
  iv?: number;
  index_price?: number;
  mark_price?: number;
}

interface BucketDef {
  label: string;
  mid: number;            // for sorting
  minPct: number;         // strike vs index price, INCLUSIVE
  maxPct: number;         // EXCLUSIVE (max bound)
}

const BUCKETS: BucketDef[] = [
  { label: '< −20%',     mid: -25, minPct: -Infinity, maxPct: -20 },
  { label: '−20% to −10%', mid: -15, minPct: -20,     maxPct: -10 },
  { label: '−10% to −5%',  mid: -7.5, minPct: -10,     maxPct: -5 },
  { label: '−5% to −1%',   mid: -3,  minPct: -5,      maxPct: -1 },
  { label: '±1% (ATM)',   mid: 0,   minPct: -1,      maxPct: 1 },
  { label: '+1% to +5%',   mid: 3,   minPct: 1,       maxPct: 5 },
  { label: '+5% to +10%',  mid: 7.5, minPct: 5,       maxPct: 10 },
  { label: '+10% to +20%', mid: 15,  minPct: 10,      maxPct: 20 },
  { label: '> +20%',      mid: 25,  minPct: 20,      maxPct: Infinity },
];

interface BucketStat {
  label: string;
  mid: number;
  contractsBought: number;
  contractsSold: number;
  netContracts: number;
  notionalUsd: number;
  tradeCount: number;
}

function json(res: VercelResponse, status: number, body: unknown, cacheHeader = 'HIT') {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Cache', cacheHeader);
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=240');
  return res.status(status).json(body);
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return json(res, 200, cache.data, 'HIT');
    }

    const upstream = await fetch(
      'https://www.deribit.com/api/v2/public/get_last_trades_by_currency?count=200&currency=BTC&kind=option',
      { signal: AbortSignal.timeout(15_000) }
    );
    if (!upstream.ok) {
      return json(res, 502, { error: `Deribit trades upstream returned ${upstream.status}` }, 'MISS');
    }
    const payload = (await upstream.json()) as { result?: DeribitTrade[] };
    const trades = payload.result?.trades ?? [];

    // Aggregate by bucket. Strike = 3rd token of instrument name like "BTC-27DEC24-100000-C".
    const stats = new Map<string, BucketStat>();
    for (const b of BUCKETS) {
      stats.set(b.label, {
        label: b.label,
        mid: b.mid,
        contractsBought: 0,
        contractsSold: 0,
        netContracts: 0,
        notionalUsd: 0,
        tradeCount: 0,
      });
    }

    let btcIndexPrice: number | null = null;
    let totalNotional = 0;
    let totalContracts = 0;

    for (const t of trades) {
      if (!t.instrument_name || t.amount === undefined || t.price === undefined) continue;
      const parts = t.instrument_name.split('-');
      // parts: ["BTC", "DDMMMYY", "<strike>", "C"|"P"]
      const strike = Number(parts[2]);
      if (!Number.isFinite(strike) || strike <= 0) continue;
      if (btcIndexPrice === null && t.index_price) btcIndexPrice = t.index_price;
      const ref = btcIndexPrice ?? t.index_price ?? 0;
      if (!ref) continue;
      const distancePct = ((strike - ref) / ref) * 100;
      const matched = BUCKETS.find((b) => distancePct >= b.minPct && distancePct < b.maxPct);
      if (!matched) continue;
      const s = stats.get(matched.label)!;
      const notional = strike * t.amount * t.price;
      if (t.direction === 'buy') s.contractsBought += t.amount;
      else s.contractsSold += t.amount;
      s.netContracts += t.direction === 'buy' ? t.amount : -t.amount;
      s.notionalUsd += notional;
      s.tradeCount += 1;
      totalNotional += notional;
      totalContracts += t.amount;
    }

    const buckets = Array.from(stats.values()).sort((a, b) => a.mid - b.mid);

    const data = {
      asOf: new Date().toISOString(),
      source: 'deribit-public',
      btcIndexPrice,
      totalTrades: trades.length,
      totalNotionalUsd: totalNotional,
      totalContracts,
      buckets,
      note:
        'Recent Deribit options trades bucketed by strike distance from current BTC price — ' +
        'proxy for liquidation-*zones*. Actual realized liquidations (Coinglass/Coinalyze) are paid.',
    };

    cache = { at: Date.now(), data };
    return json(res, 200, data, 'MISS');
  } catch (e: any) {
    return json(res, 500, { error: e?.message ?? 'unknown error' }, 'MISS');
  }
}
