// BitcoinHub FRED — series.ts
// Registry of FRED series we expose + their metadata.
// One canonical place to add new macro indicators (Tier 2+ features).
//
// Each entry:
//   - id: FRED series_id (used in /api/fred/data?series_id=X)
//   - name: human label
//   - category: liquidity | rates | inflation | employment | housing | sentiment | valuation
//   - unit: '%', 'B', 'M', 'index', etc.
//   - description: 1-line blurb for the UI
//   - frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
//   - transform: 'none' | 'yoy' (turn level into YoY % change)

export type FredCategory =
  | 'liquidity'
  | 'rates'
  | 'inflation'
  | 'employment'
  | 'housing'
  | 'sentiment'
  | 'valuation';

export interface FredSeriesDef {
  id: string;
  name: string;
  category: FredCategory;
  unit: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  transform: 'none' | 'yoy';
  /** Optional override of default FRED start date (default: '1900-01-01') */
  startOverride?: string;
}

export const FRED_SERIES: FredSeriesDef[] = [
  // ─── Liquidity (the big ones for BTC) ───────────────────────────────
  {
    id: 'WALCL', name: 'Fed Total Assets',
    category: 'liquidity', unit: 'M USD',
    description: 'Federal Reserve balance sheet — weekly (Thursday). The headline liquidity number.',
    frequency: 'weekly', transform: 'none',
  },
  {
    id: 'RRPONTSYD', name: 'O/N Reverse Repo',
    category: 'liquidity', unit: 'B USD',
    description: 'Overnight reverse repo facility usage — daily. Drops as cash leaves RRP into T-bills/MMF.',
    frequency: 'daily', transform: 'none',
    startOverride: '2021-01-01',
  },
  {
    id: 'M1SL', name: 'M1 Money Supply',
    category: 'liquidity', unit: 'B USD',
    description: 'M1 money supply — weekly. The narrowest money aggregate.',
    frequency: 'weekly', transform: 'none',
  },

  // ─── Rates & yield curve ───────────────────────────────────────────
  {
    id: 'T10Y2Y', name: '2s10s Spread',
    category: 'rates', unit: '%',
    description: '10Y minus 2Y Treasury yield — daily. Negative = recession signal.',
    frequency: 'daily', transform: 'none',
    startOverride: '1976-01-01',
  },
  {
    id: 'T10Y3M', name: '3m10y Spread',
    category: 'rates', unit: '%',
    description: '10Y minus 3M Treasury yield — daily. Negative has preceded every recession since 1970.',
    frequency: 'daily', transform: 'none',
    startOverride: '1982-01-01',
  },
  {
    id: 'MORTGAGE30US', name: '30Y Mortgage Rate',
    category: 'rates', unit: '%',
    description: '30-year fixed mortgage rate — weekly. Housing affordability proxy.',
    frequency: 'weekly', transform: 'none',
  },
  {
    id: 'T5YIE', name: '5y5y Breakeven',
    category: 'rates', unit: '%',
    description: '5-year, 5-year-forward breakeven inflation — daily. Long-horizon inflation expectations.',
    frequency: 'daily', transform: 'none',
  },

  // ─── Inflation ─────────────────────────────────────────────────────
  {
    id: 'CPIAUCSL', name: 'CPI (YoY)',
    category: 'inflation', unit: '%',
    description: 'Consumer Price Index, transformed to year-over-year % change — monthly.',
    frequency: 'monthly', transform: 'yoy',
  },
  {
    id: 'CPILFESL', name: 'Core CPI (YoY)',
    category: 'inflation', unit: '%',
    description: 'Core CPI ex-food/energy — year-over-year % change — monthly.',
    frequency: 'monthly', transform: 'yoy',
  },

  // ─── Employment ────────────────────────────────────────────────────
  {
    id: 'UNRATE', name: 'Unemployment Rate',
    category: 'employment', unit: '%',
    description: 'Civilian unemployment rate — monthly. Sahm Rule trigger at 0.5% rise from 12m low.',
    frequency: 'monthly', transform: 'none',
  },
  {
    id: 'ICSA', name: 'Initial Jobless Claims',
    category: 'employment', unit: 'k',
    description: 'Initial unemployment claims — weekly. Leading labor-market indicator.',
    frequency: 'weekly', transform: 'none',
  },

  // ─── Financial conditions / sentiment ──────────────────────────────
  {
    id: 'NFCI', name: 'Chicago Fed NFCI',
    category: 'sentiment', unit: 'index',
    description: 'National Financial Conditions Index — weekly. 0 = neutral, positive = tighter.',
    frequency: 'weekly', transform: 'none',
  },
];

const SERIES_MAP: Record<string, FredSeriesDef> = Object.fromEntries(
  FRED_SERIES.map(s => [s.id, s]),
);

export function getSeriesDef(seriesId: string): FredSeriesDef | undefined {
  return SERIES_MAP[seriesId.toUpperCase()];
}

export function listSeriesByCategory(): Record<FredCategory, FredSeriesDef[]> {
  const out: Record<FredCategory, FredSeriesDef[]> = {
    liquidity: [], rates: [], inflation: [], employment: [], housing: [], sentiment: [], valuation: [],
  };
  for (const s of FRED_SERIES) out[s.category].push(s);
  return out;
}
