// BitcoinHub MPT — Cycles & Universe
// Locked: halving-to-halving cycles, BTC + BTC-correlated instruments.

export type AssetSource = 'coingecko' | 'yahoo';

export interface MPTAsset {
  symbol: string;
  name: string;
  source: AssetSource;
  yahooSymbol?: string;        // for Yahoo-sourced assets
  firstAvailable: string;      // YYYY-MM-DD — first date this asset has price history
}

export interface MPTCycle {
  id: string;
  label: string;
  start: string;               // YYYY-MM-DD — halving date
  end: string | null;          // YYYY-MM-DD — next halving (null = live/current)
  isLive?: boolean;
}

// Bitcoin halving dates
export const CYCLES: MPTCycle[] = [
  { id: 'cycle1', label: 'Cycle 1 (2012 → 2016 halving)', start: '2012-11-28', end: '2016-07-09' },
  { id: 'cycle2', label: 'Cycle 2 (2016 → 2020 halving)', start: '2016-07-09', end: '2020-05-11' },
  { id: 'cycle3', label: 'Cycle 3 (2020 → 2024 halving)', start: '2020-05-11', end: '2024-04-20' },
  { id: 'cycle4', label: 'Cycle 4 (2024 → live)',        start: '2024-04-20', end: null, isLive: true },
];

// Locked universe (Option A): BTC + 6 BTC-correlated instruments.
// All highly BTC-correlated but with enough non-1.0 cross-correlation
// to make MPT meaningful.
export const UNIVERSE: MPTAsset[] = [
  { symbol: 'BTC',   name: 'Bitcoin',                       source: 'yahoo',     yahooSymbol: 'BTC-USD', firstAvailable: '2014-09-17' },
  { symbol: 'IBIT',  name: 'BlackRock iShares Bitcoin Trust', source: 'yahoo',     yahooSymbol: 'IBIT',  firstAvailable: '2024-01-11' },
  { symbol: 'FBTC',  name: 'Fidelity Wise Origin Bitcoin',  source: 'yahoo',     yahooSymbol: 'FBTC',  firstAvailable: '2024-01-11' },
  { symbol: 'MSTR',  name: 'MicroStrategy',                 source: 'yahoo',     yahooSymbol: 'MSTR',  firstAvailable: '2020-08-11' },
  { symbol: 'COIN',  name: 'Coinbase Global',               source: 'yahoo',     yahooSymbol: 'COIN',  firstAvailable: '2021-04-14' },
  { symbol: 'MARA',  name: 'Marathon Digital',              source: 'yahoo',     yahooSymbol: 'MARA',  firstAvailable: '2012-11-28' },
  { symbol: 'RIOT',  name: 'Riot Platforms',                source: 'yahoo',     yahooSymbol: 'RIOT',  firstAvailable: '2012-11-28' },
];

export const DEFAULT_RISK_FREE_RATE = 0.045; // 4.5% — current short-term T-bill proxy

export function getCycle(id: string): MPTCycle {
  const c = CYCLES.find(c => c.id === id);
  if (!c) throw new Error(`Unknown cycle: ${id}. Valid: ${CYCLES.map(c => c.id).join(', ')}`);
  return c;
}

export function getAsset(symbol: string): MPTAsset {
  const a = UNIVERSE.find(a => a.symbol === symbol);
  if (!a) throw new Error(`Unknown asset: ${symbol}. Valid: ${UNIVERSE.map(a => a.symbol).join(', ')}`);
  return a;
}