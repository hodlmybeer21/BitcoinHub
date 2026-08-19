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
  { id: 'onchain.active_addresses',label:'Active Addresses',       category: 'onchain',  description: 'Active senders per day (proxy: daily tx count via mempool.space — no free public active-addresses API).',                          unit: 'tx/day' },
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
  // ─── Macro suite (Phase 6b, 2026-08-19) ───────────────────────────────
  { id: 'macro.fed_assets',        label: 'Fed Total Assets (WALCL)', category: 'macro',  description: 'Federal Reserve balance sheet — weekly',          unit: 'M USD' },
  { id: 'macro.onrrp',             label: 'O/N Reverse Repo',         category: 'macro',  description: 'Overnight reverse repo facility usage — daily',   unit: 'B USD' },
  { id: 'macro.m1',                label: 'M1 Money Supply',          category: 'macro',  description: 'M1 money supply — weekly',                       unit: 'B USD' },
  { id: 'macro.ust_2s10s',         label: '2s10s Spread',             category: 'macro',  description: '10Y minus 2Y Treasury yield — daily',            unit: '%' },
  { id: 'macro.ust_3m10y',         label: '3m10y Spread',             category: 'macro',  description: '10Y minus 3M Treasury yield — daily',            unit: '%' },
  { id: 'macro.mortgage_30y',      label: '30Y Mortgage Rate',        category: 'macro',  description: '30-year fixed mortgage rate — weekly',           unit: '%' },
  { id: 'macro.breakeven_5y5y',    label: '5y5y Breakeven',           category: 'macro',  description: '5y5y forward breakeven inflation — daily',        unit: '%' },
  { id: 'macro.cpi_yoy',           label: 'CPI YoY',                  category: 'macro',  description: 'Headline CPI year-over-year % — monthly',        unit: '%' },
  { id: 'macro.cpi_core_yoy',      label: 'Core CPI YoY',             category: 'macro',  description: 'Core CPI year-over-year % — monthly',            unit: '%' },
  { id: 'macro.unemployment',      label: 'Unemployment Rate',        category: 'macro',  description: 'Civilian unemployment rate — monthly',           unit: '%' },
  { id: 'macro.initial_claims',    label: 'Initial Jobless Claims',   category: 'macro',  description: 'Initial unemployment claims — weekly',           unit: 'k' },
  { id: 'macro.nfci',              label: 'Chicago Fed NFCI',         category: 'macro',  description: 'National Financial Conditions Index — weekly',  unit: 'index' },
  // ─── Premium indicators (DeMark / Elliott / Wyckoff) ─────────────────
  { id: 'premium.demark_setup',    label: 'DeMark Setup Count',       category: 'premium',  description: 'Tom DeMark Sequential setup count. Positive = buy count, negative = sell count. 9 = completed setup.', unit: '±13' },
  { id: 'premium.elliott_wave',    label: 'Elliott Wave Position',    category: 'premium',  description: 'Simplified Elliott wave label from 5-bar zigzag pivots. Positive = impulse (1..5), negative = corrective (-1..-3), 0 = unclear.', unit: '±5' },
  { id: 'premium.wyckoff_phase',   label: 'Wyckoff Phase',            category: 'premium',  description: 'Detected Wyckoff accumulation/distribution phase from price + volume. 1–5 = Accum A→Markup; 10–14 = Distrib A→Markdown; 0 = unclear.', unit: 'phase' },
  { id: 'premium.whale_activity',  label: 'Mempool Whale Activity',   category: 'premium',  description: 'Total USD volume of BTC transactions ≥100 BTC currently in the mempool. Real-time snapshot of whale activity. Compose with F&G or risk.metric for divergence signals.', unit: 'USD' },
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