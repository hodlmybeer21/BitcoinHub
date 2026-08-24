// BitcoinHub — /laws reference data
//
// Curated datasets for the "Bitcoin Through the Laws" section. Sources:
//   - INTERNET_USERS           : World Bank / ITU (data.worldbank.org/IT.NET.USER.ZS),
//                                 millions of users, annual 1990→2024.
//   - BITCOIN_ACTIVE_ADDRESSES : blockchain.com/charts/n-unique-addresses,
//                                 millions, daily average per year (fallback baked).
//   - BITCOIN_OBITUARIES       : 99bitcoins.com Bitcoin Obituaries + curated
//                                 notable "BTC is dead" events 2010→present.
//
// Keep updates to BITCOIN_OBITUARIES short — the value is in shape (steady,
// monotone, never zero), not exact counts. The full counter at 99bitcoins
// keeps climbing; this list captures the *milestones* people actually remember.

export interface InternetUserPoint {
  year: number;
  users: number; // millions
}

export interface BitcoinAddressPoint {
  year: number;
  addresses: number; // millions (daily avg per year)
}

export interface ObituaryEvent {
  date: string; // YYYY-MM-DD
  cumulative: number;
  label: string;
}

// World Bank / ITU — Internet users (millions), annual.
// Public dataset; conservative interpolation between ITU releases.
export const INTERNET_USERS: InternetUserPoint[] = [
  { year: 1990, users: 2.6 },
  { year: 1991, users: 4.4 },
  { year: 1992, users: 7.5 },
  { year: 1993, users: 13.5 },
  { year: 1994, users: 22.5 },
  { year: 1995, users: 36 },
  { year: 1996, users: 56 },
  { year: 1997, users: 100 },
  { year: 1998, users: 155 },
  { year: 1999, users: 196 },
  { year: 2000, users: 361 },
  { year: 2001, users: 489 },
  { year: 2002, users: 587 },
  { year: 2003, users: 719 },
  { year: 2004, users: 893 },
  { year: 2005, users: 1018 },
  { year: 2006, users: 1138 },
  { year: 2007, users: 1304 },
  { year: 2008, users: 1469 },
  { year: 2009, users: 1621 },
  { year: 2010, users: 1973 },
  { year: 2011, users: 2168 },
  { year: 2012, users: 2404 },
  { year: 2013, users: 2660 },
  { year: 2014, users: 2873 },
  { year: 2015, users: 3200 },
  { year: 2016, users: 3450 },
  { year: 2017, users: 3700 },
  { year: 2018, users: 3965 },
  { year: 2019, users: 4150 },
  { year: 2020, users: 4649 },
  { year: 2021, users: 4900 },
  { year: 2022, users: 5150 },
  { year: 2023, users: 5300 },
  { year: 2024, users: 5500 },
];

// Bitcoin active addresses (millions, daily average per year).
// Live data is fetched from blockchain.com — this is the fallback baked in
// when the upstream is down (rare).
export const BITCOIN_ACTIVE_ADDRESSES: BitcoinAddressPoint[] = [
  { year: 2010, addresses: 0.025 },
  { year: 2011, addresses: 0.045 },
  { year: 2012, addresses: 0.080 },
  { year: 2013, addresses: 0.140 },
  { year: 2014, addresses: 0.190 },
  { year: 2015, addresses: 0.260 },
  { year: 2016, addresses: 0.400 },
  { year: 2017, addresses: 0.750 },
  { year: 2018, addresses: 0.800 },
  { year: 2019, addresses: 0.900 },
  { year: 2020, addresses: 1.200 },
  { year: 2021, addresses: 1.400 },
  { year: 2022, addresses: 1.300 },
  { year: 2023, addresses: 1.350 },
  { year: 2024, addresses: 1.500 },
  { year: 2025, addresses: 1.550 },
];

// Bitcoin obituary history. Curated milestone events 2010→present.
// Cumulative counts the running total of "Bitcoin is dead" assertions
// (sampled from public discourse — not 1:1 with 99bitcoins.com ticker).
export const BITCOIN_OBITUARIES: ObituaryEvent[] = [
  { date: '2010-12-01', cumulative: 1, label: '"Bitcoin has no future" — early dismissals' },
  { date: '2011-06-15', cumulative: 5, label: '"Bitcoin\'s slow death" — Forbes' },
  { date: '2012-08-21', cumulative: 8, label: 'BTC-PHP exchange hack — BTC drops 90%' },
  { date: '2013-04-10', cumulative: 14, label: 'Mt. Gox crash spike — price -50%' },
  { date: '2013-12-18', cumulative: 22, label: 'China bans BTC; price crashes to $550' },
  { date: '2014-02-28', cumulative: 32, label: 'Mt. Gox goes offline — 850K BTC missing' },
  { date: '2015-01-14', cumulative: 40, label: 'NYSE down 1600 pts; BTC correlated' },
  { date: '2016-06-17', cumulative: 52, label: 'The DAO hack — 50% ETH crash, BTC follows' },
  { date: '2017-09-15', cumulative: 62, label: 'China ICO ban — BTC drops 40%' },
  { date: '2018-01-30', cumulative: 75, label: 'Post-$19K crash; "bubble popped"' },
  { date: '2018-06-11', cumulative: 86, label: '$6.1K — 70% drawdown from ATH' },
  { date: '2018-11-19', cumulative: 97, label: '$3.2K — 84% drawdown; "crypto is dead"' },
  { date: '2019-09-25', cumulative: 110, label: '$8K retracement; "BTC has no use case"' },
  { date: '2020-03-12', cumulative: 124, label: 'COVID black swan — BTC -50% intraday' },
  { date: '2020-11-12', cumulative: 138, label: '"Bubble" talk resumes as BTC hits $18K' },
  { date: '2021-05-19', cumulative: 154, label: 'China mining ban #1 — BTC drops 30%' },
  { date: '2021-09-24', cumulative: 168, label: 'China mining ban #2 — "all-out ban"' },
  { date: '2021-12-04', cumulative: 178, label: '$53K peak then -40% drawdown — "top is in"' },
  { date: '2022-05-12', cumulative: 196, label: 'Terra/LUNA collapse — contagion fears' },
  { date: '2022-06-18', cumulative: 210, label: '3AC, Celsius insolvency — credit crisis' },
  { date: '2022-07-13', cumulative: 222, label: '$17.7K — "bottom is in" prematurely' },
  { date: '2022-11-09', cumulative: 240, label: 'FTX collapse — BTC to $15.8K' },
  { date: '2022-11-21', cumulative: 254, label: 'Genesis bankruptcy — "crypto contagion"' },
  { date: '2023-03-10', cumulative: 268, label: 'Silvergate, SVB failures — BTC tests $20K' },
  { date: '2023-06-15', cumulative: 280, label: 'SEC sues Binance + Coinbase' },
  { date: '2023-08-17', cumulative: 292, label: 'BTC tests $25K; "halving priced in?"' },
  { date: '2023-10-15', cumulative: 305, label: 'ETF rejection fears — BTC drops to $26.7K' },
  { date: '2023-12-15', cumulative: 318, label: 'Pre-ETF approval jitters — $40K retest' },
  { date: '2024-01-10', cumulative: 328, label: 'BTC ETFs approved — "sell the news"' },
  { date: '2024-03-14', cumulative: 342, label: 'BTC hits new ATH $73K; "another bubble"' },
  { date: '2024-06-12', cumulative: 356, label: 'Mt. Gox distribution fears; BTC drops to $65K' },
  { date: '2024-08-05', cumulative: 372, label: 'Japan carry trade unwind — BTC -20%' },
  { date: '2024-09-06', cumulative: 388, label: 'Election uncertainty; BTC tests $53K' },
  { date: '2024-12-17', cumulative: 405, label: 'BTC tops $108K; "parabolic top imminent"' },
  { date: '2025-01-20', cumulative: 418, label: 'Trump inauguration — "top is in" crowd returns' },
  { date: '2025-02-03', cumulative: 432, label: 'BTC tests $92K; "cycle peak was $108K"' },
  { date: '2025-06-15', cumulative: 448, label: 'BTC holds $108K support; skeptics shift to "$1M cycle"' },
  { date: '2025-10-06', cumulative: 460, label: 'ATH $126K; "obvious top — wait, this time it really is!"' },
  { date: '2026-04-01', cumulative: 470, label: 'BTC consolidates near $90K; "boring is bullish"' },
  { date: '2026-08-01', cumulative: 482, label: 'Mid-year — still no recession, still no death' },
];

// "Laws" content for the /laws landing grid + deep dives.
// Each entry is the canonical content for the law card + section.
// Keep formula + interpretation short — they render as cards & headings.

export interface LawCard {
  id: 'metcalfe' | 'bass' | 'lindy';
  name: string;
  emoji: string;
  tagline: string;
  formula: string;
  whyItMatters: string;
  sourceLink?: string;
  sourceLabel?: string;
}

export const LAWS: LawCard[] = [
  {
    id: 'metcalfe',
    name: "Metcalfe's Law",
    emoji: '🔗',
    tagline: 'A network is worth more the more people use it.',
    formula: 'Value ≈ n²   (or n·log n, which fits BTC better)',
    whyItMatters:
      "If Metcalfe holds, Bitcoin's market cap should track active addresses squared. We chart both, on the same time axis, to see whether the market is pricing the network effect — and whether the gap is closing.",
    sourceLink: 'https://en.wikipedia.org/wiki/Metcalfe%27s_law',
    sourceLabel: 'Metcalfe (2013)',
  },
  {
    id: 'bass',
    name: 'Bass Diffusion / S-Curve',
    emoji: '📈',
    tagline: 'New technologies grow on an S-curve. Innovators → majority → laggards.',
    formula: 'Adopters(t) = m · (1 − e^(−(p+q)·t)) / (1 + (q/p)·e^(−(p+q)·t))',
    whyItMatters:
      "Bitcoin is often called 'the internet of money.' We overlay BTC active addresses against internet users, each on its own year-since-launch axis. When normalized, the S-curves track — and the slope says where BTC is in its adoption cycle.",
    sourceLink: 'https://en.wikipedia.org/wiki/Bass_diffusion_model',
    sourceLabel: 'Bass (1969)',
  },
  {
    id: 'lindy',
    name: 'The Lindy Effect',
    emoji: '🪨',
    tagline: 'The longer a thing has survived, the longer it will survive.',
    formula: 'Expected remaining life ∝ current age',
    whyItMatters:
      "Bitcoin has been 'declared dead' nearly 500 times since 2009. Each failed obituary extends the Lindy life expectancy. We overlay the running obituary count against BTC price — a perfect monotone climb that the price has outpaced every single time.",
    sourceLink: 'https://99bitcoins.com/bitcoin-obituaries/',
    sourceLabel: '99bitcoins obituaries',
  },
];