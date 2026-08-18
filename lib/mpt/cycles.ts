// BitcoinHub MPT — /api/mpt/cycles
// Self-contained Vercel serverless function. No shared imports except axios + types.
// Mirrors the api/dca-simulator.ts pattern (proven to bundle cleanly on Vercel).

import type { VercelRequest, VercelResponse } from '@vercel/node';

function ok(res: VercelResponse, data: unknown) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
  res.json(data);
}

function err(res: VercelResponse, status: number, message: string) {
  res.status(status).json({ error: message });
}

interface MPTAsset {
  symbol: string;
  name: string;
  source: 'coingecko' | 'yahoo';
  yahooSymbol?: string;
  firstAvailable: string;
}

// Option A universe: BTC + 6 BTC-correlated equities/ETFs.
const UNIVERSE: MPTAsset[] = [
  { symbol: 'BTC',  name: 'Bitcoin',           source: 'yahoo', yahooSymbol: 'BTC-USD', firstAvailable: '2014-09-17' },
  { symbol: 'IBIT', name: 'iShares Bitcoin Trust', source: 'yahoo', yahooSymbol: 'IBIT',  firstAvailable: '2024-01-11' },
  { symbol: 'FBTC', name: 'Fidelity Wise Origin Bitcoin Fund', source: 'yahoo', yahooSymbol: 'FBTC', firstAvailable: '2024-01-11' },
  { symbol: 'MSTR', name: 'MicroStrategy',     source: 'yahoo', yahooSymbol: 'MSTR',  firstAvailable: '2014-09-17' },
  { symbol: 'COIN', name: 'Coinbase',          source: 'yahoo', yahooSymbol: 'COIN',  firstAvailable: '2021-04-14' },
  { symbol: 'MARA', name: 'Marathon Digital',  source: 'yahoo', yahooSymbol: 'MARA',  firstAvailable: '2014-09-17' },
  { symbol: 'RIOT', name: 'Riot Platforms',    source: 'yahoo', yahooSymbol: 'RIOT',  firstAvailable: '2014-09-17' },
];

interface Cycle {
  id: string;
  label: string;
  start: string;
  end: string;
  halvingDate: string;
}

const CYCLES: Cycle[] = [
  { id: 'cycle1', label: 'Cycle 1 (2012 halving)',  start: '2013-01-01', end: '2016-07-08', halvingDate: '2012-11-28' },
  { id: 'cycle2', label: 'Cycle 2 (2016 halving)',  start: '2016-07-09', end: '2020-05-10', halvingDate: '2016-07-09' },
  { id: 'cycle3', label: 'Cycle 3 (2020 halving)',  start: '2020-05-11', end: '2024-04-19', halvingDate: '2020-05-11' },
  { id: 'cycle4', label: 'Cycle 4 (2024 halving)',  start: '2024-04-20', end: '2028-04-01', halvingDate: '2024-04-20' },
];

const DEFAULT_RISK_FREE_RATE = 0.045;

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    return ok(res, {
      cycles: CYCLES,
      universe: UNIVERSE,
      defaultRiskFreeRate: DEFAULT_RISK_FREE_RATE,
      minAssets: 2,
      maxAssets: UNIVERSE.length,
    });
  } catch (e: any) {
    console.error('[mpt-cycles] error:', e);
    return err(res, 500, e?.message ?? 'Failed to list cycles');
  }
}