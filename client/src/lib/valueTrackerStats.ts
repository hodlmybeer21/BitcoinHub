// "The Numbers Don't Lie" bar on the home page.
// Every input below is a published figure with its source; the percentages are
// computed from them (never typed in by hand). Data pulled Oct 24, 2026.
// Basis: gold and item prices are annual averages; Bitcoin is a Dec 31 close.

export interface SourceRef {
  label: string;
  url: string;
}

const WORLD_BANK_GOLD: SourceRef = {
  label: "World Bank Pink Sheet (gold, annual average)",
  url: "https://www.worldbank.org/en/research/commodity-markets",
};

/** Annual average gold price, USD/troy oz (World Bank Pink Sheet). */
export const GOLD_AVG = { 1970: 35.9, 1980: 607.9, 1995: 384.2, 2025: 3441.5 } as const;

export const INPUTS = {
  home: {
    // FRED MSPUS (Census/HUD), annual average of quarterly median sales price
    from: { year: 1995, usd: 133475 },
    to: { year: 2025, usd: 415400 },
    sources: [{ label: "Census/HUD via FRED (MSPUS)", url: "https://fred.stlouisfed.org/series/MSPUS" }, WORLD_BANK_GOLD],
  },
  bread: {
    // BLS average price, white bread per lb, annual mean (series starts 1980; 2025 = 11 months, Oct 2025 not published)
    from: { year: 1980, usd: 0.51 },
    to: { year: 2025, usd: 1.87 },
    sources: [{ label: "BLS via FRED (APU0000702111)", url: "https://fred.stlouisfed.org/series/APU0000702111" }, WORLD_BANK_GOLD],
  },
  gold: {
    from: { year: 1970, usd: GOLD_AVG[1970] },
    to: { year: 2025, usd: GOLD_AVG[2025] },
    sources: [WORLD_BANK_GOLD],
  },
  bitcoin: {
    // Dec 31 closes. Bitcoin had no market price before Jul 2010.
    from: { year: 2010, usd: 0.3 },
    to: { year: 2025, usd: 87508.83 },
    sources: [{ label: "StatMuse Money (BTC Dec 31 close)", url: "https://www.statmuse.com/money/ask/bitcoin-price-history-yearly" }],
  },
} as const;

export const pctChange = (from: number, to: number) => ((to - from) / from) * 100;

/** "+211%", "−65%", "+29.2M%". */
export function formatPct(p: number): string {
  const sign = p > 0 ? "+" : p < 0 ? "−" : "";
  const a = Math.abs(p);
  const body = a >= 1_000_000 ? `${(a / 1_000_000).toFixed(1)}M` : Math.round(a).toLocaleString("en-US");
  return `${sign}${body}%`;
}

const inGold = (usd: number, year: keyof typeof GOLD_AVG) => usd / GOLD_AVG[year];

export interface ValueStatRow {
  key: string;
  label: string;
  usd: string;
  gold: string;
  note: string;
  sources: readonly SourceRef[];
}

export function buildValueStats(): ValueStatRow[] {
  const h = INPUTS.home;
  const b = INPUTS.bread;
  const g = INPUTS.gold;
  const c = INPUTS.bitcoin;
  return [
    {
      key: "home",
      label: `Median US Home (${h.from.year}→${h.to.year})`,
      usd: formatPct(pctChange(h.from.usd, h.to.usd)),
      gold: `${formatPct(pctChange(inGold(h.from.usd, 1995), inGold(h.to.usd, 2025)))} in gold`,
      note: `$${h.from.usd.toLocaleString("en-US")} → $${h.to.usd.toLocaleString("en-US")} (annual avg)`,
      sources: h.sources,
    },
    {
      key: "bread",
      label: `Bread, 1 lb (${b.from.year}→${b.to.year})`,
      usd: formatPct(pctChange(b.from.usd, b.to.usd)),
      gold: `${formatPct(pctChange(inGold(b.from.usd, 1980), inGold(b.to.usd, 2025)))} in gold`,
      note: `$${b.from.usd.toFixed(2)} → $${b.to.usd.toFixed(2)} (annual avg)`,
      sources: b.sources,
    },
    {
      key: "gold",
      label: `Gold vs USD (${g.from.year}→${g.to.year})`,
      usd: formatPct(pctChange(g.from.usd, g.to.usd)),
      gold: "Baseline",
      note: `$${g.from.usd}/oz → $${g.to.usd.toLocaleString("en-US")}/oz (annual avg)`,
      sources: g.sources,
    },
    {
      key: "bitcoin",
      label: `Bitcoin vs USD (${c.from.year}→${c.to.year})`,
      usd: formatPct(pctChange(c.from.usd, c.to.usd)),
      gold: "",
      note: `$${c.from.usd.toFixed(2)} → $${c.to.usd.toLocaleString("en-US")} (Dec 31 closes; no market before Jul 2010)`,
      sources: c.sources,
    },
  ];
}
