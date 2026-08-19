// BitcoinHub Workbench — /api/workbench/blocks
// Self-contained Vercel serverless function.
// Returns the block registry metadata (no fetch functions).

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface BlockMeta {
  id: string;
  label: string;
  category: string;
  description: string;
  unit?: string;
}

const BLOCKS: BlockMeta[] = [
  { id: 'btc.price',              label: 'BTC Price',              category: 'price',    description: 'BTC close price in USD',                          unit: 'USD' },
  { id: 'btc.dominance',          label: 'BTC Dominance',          category: 'price',    description: 'BTC share of total crypto market cap (%)',        unit: '%' },
  { id: 'fear_greed.value',       label: 'Fear & Greed Index',     category: 'sentiment',description: 'Daily Fear & Greed Index (0-100)',                unit: '0-100' },
  { id: 'funding.bybit',          label: 'Bybit Funding Rate',     category: 'funding',  description: 'BTCUSDT perp funding rate (per 8h)',             unit: 'rate' },
  { id: 'etf.volume',             label: 'Spot ETF Volume (proxy)',category: 'currency', description: 'Sum daily volume of IBIT+FBTC+ARKB+HODL',         unit: 'shares' },
  { id: 'stablecoin.total_supply',label: 'Stablecoin Supply',     category: 'liquidity',description: 'Total stablecoin USD supply (DefiLlama)',        unit: 'USD' },
  { id: 'options.put_call',       label: 'Options Put/Call Ratio', category: 'options',  description: 'BTC options put/call OI ratio (Deribit)',        unit: 'ratio' },
  { id: 'onchain.hashrate',       label: 'On-Chain Hashrate',      category: 'onchain',  description: 'Network hashrate (H/s)',                          unit: 'H/s' },
  { id: 'onchain.active_addresses',label:'Active Addresses',       category: 'onchain',  description: 'Unique senders per day',                          unit: 'addresses' },
  { id: 'macro.dxy',              label: 'Dollar Index (DXY)',     category: 'macro',    description: 'US Dollar Index',                                  unit: 'index' },
  { id: 'macro.sp500',            label: 'S&P 500',                category: 'macro',    description: 'S&P 500 Index',                                    unit: 'index' },
  { id: 'macro.ust10y',           label: '10Y Treasury Yield',     category: 'macro',    description: 'US 10-Year Treasury yield (%)',                    unit: '%' },
  { id: 'macro.vix',              label: 'VIX',                    category: 'macro',    description: 'CBOE Volatility Index',                            unit: 'index' },
  { id: 'macro.gold',             label: 'Gold',                   category: 'macro',    description: 'Gold spot price (USD/oz)',                         unit: 'USD' },
  { id: 'time.day_of_week',       label: 'Day of Week',            category: 'time',     description: '0=Sunday, 6=Saturday',                            unit: '0-6' },
  { id: 'risk.metric',            label: 'BTC Risk Metric',        category: 'risk',     description: '0–1 cycle-position score (BTC)',                  unit: '0–1' },
  { id: 'risk.bmsb_lower',        label: 'BMSB Lower (20w SMA)',   category: 'risk',     description: 'Bull Market Support Band lower boundary',         unit: 'USD' },
  { id: 'risk.bmsb_upper',        label: 'BMSB Upper (21w EMA)',   category: 'risk',     description: 'Bull Market Support Band upper boundary',         unit: 'USD' },
  { id: 'risk.pi_long',           label: 'Pi Cycle Long (350d ×2)',category: 'risk',     description: '350-day MA × 2 (top signal trigger)',             unit: 'USD' },
  { id: 'risk.pi_short',          label: 'Pi Cycle Short (111d)',  category: 'risk',     description: '111-day MA (top signal trigger)',                 unit: 'USD' },
  { id: 'risk.cycle_pos',         label: 'Halving Cycle Position', category: 'risk',     description: 'Position in 4-year halving cycle (0–1)',          unit: '0–1' },
  { id: 'risk.band_stats',        label: 'Time in Risk Bands',     category: 'risk',     description: '% of days BTC spent in each risk band (6 series)',unit: '0–1 each' },
];

function ok(res: VercelResponse, data: unknown) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
  res.json(data);
}

function err(res: VercelResponse, status: number, message: string) {
  res.status(status).json({ error: message });
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    return ok(res, { blocks: BLOCKS });
  } catch (e: any) {
    console.error('[workbench-blocks] error:', e);
    return err(res, 500, e?.message ?? 'Failed to list blocks');
  }
}