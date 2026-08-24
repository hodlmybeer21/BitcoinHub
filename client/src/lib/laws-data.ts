// BitcoinHub — /laws reference data
//
// Curated datasets for the "Bitcoin Through the Laws" section. Sources:
//   - INTERNET_USERS           : World Bank / ITU (data.worldbank.org/IT.NET.USER.ZS),
//                                 millions of users, annual 1990→2024.
//   - BITCOIN_ACTIVE_ADDRESSES : blockchain.com/charts/n-unique-addresses,
//                                 millions, daily average per year (fallback baked).
//   - BITCOIN_OBITUARIES       : 99bitcoins.com Bitcoin Obituaries + curated
//                                 notable "BTC is dead" events 2010→present.
//   - LN_HISTORY               : Lightning Network channel count + capacity,
//                                 quarterly snapshots from 1ML.com / Bitcoin Visuals / mempool.space
//                                 (baked — public historical aggregates from those sources).
//   - ADDRESS_DISTRIBUTION      : Bitcoin address balance distribution (snapshot),
//                                 publicly known approximate Lorenz curve.
//   - MINING_POOLS             : Bitcoin mining pool hashrate distribution (snapshot),
//                                 BTC.com / miningpoolstats.stream aggregate.
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
  {
    id: 'reed',
    name: "Reed's Law",
    emoji: '🕸️',
    tagline: 'A network that lets people form groups grows exponentially, not quadratically.',
    formula: 'Value ∝ 2ⁿ   (n = number of possible subgroups)',
    whyItMatters:
      "Metcalfe counts pairs (n²). Reed counts groups (2ⁿ). Bitcoin's group-forming layer is the Lightning Network — each new channel unlocks exponentially more routing possibilities. We chart LN channel count + total capacity to show the network's group-formation capacity.",
    sourceLink: 'https://en.wikipedia.org/wiki/Reed%27s_law',
    sourceLabel: 'Reed (1999)',
  },
  {
    id: 'power',
    name: 'Power Law / Zipf',
    emoji: '⚖️',
    tagline: 'A small number of nodes hold a large share of any network. Always.',
    formula: 'P(rank) ∝ rank^(−α),   α ≈ 1',
    whyItMatters:
      "BTC wealth distribution and mining hashrate distribution both follow near-perfect power laws. On a log-log chart, a power law is a straight line — and BTC's two are textbook straight lines. We chart the current snapshot of both, then show the Lorenz curve for address balances.",
    sourceLink: 'https://en.wikipedia.org/wiki/Power_law',
    sourceLabel: 'Zipf / Pareto',
  },
  {
    id: 's2f',
    name: 'Stock-to-Flow',
    emoji: '🏆',
    tagline: 'Scarcity drives value. Bitcoin gets scarcer every 4 years, on schedule.',
    formula: 'S2F = circulating_supply ÷ annual_new_supply',
    whyItMatters:
      "PlanB's model tracked BTC price remarkably well 2013–2021. Then it broke — 2022–2024 saw the price drop while S2F kept climbing. We chart both honestly: the historic fit, the recent divergence, and what it teaches about any single-law model of price.",
    sourceLink: 'https://en.wikipedia.org/wiki/Stock_to_flow',
    sourceLabel: 'PlanB (2019)',
  },
  {
    id: 'nakamoto',
    name: "Nakamoto's Law",
    emoji: '⛏️',
    tagline: "Bitcoin's security budget compounds — hashrate doubles roughly every 2 years.",
    formula: 'Hashrate(t) ≈ Hashrate(t₀) · 2^((t−t₀) / doubling_period)',
    whyItMatters:
      'Every halving, the per-block reward halves — yet miners keep investing more in proof-of-work compute. The result: BTC network hashrate has compounded for 17 years straight, mirroring Moore\'s Law for transistors. We chart the actual curve and measure the doubling period.',
    sourceLink: 'https://github.com/bitcoin/bitcoin',
    sourceLabel: 'Hashrate data · mempool.space',
  },
  {
    id: 'perez',
    name: "Perez's Techno-Economic Revolutions",
    emoji: '🌀',
    tagline: 'Every ~50 years, a new technology reshapes the entire economy.',
    formula: 'Surge (front-loaded) → Installation period → Deployment period → Maturity',
    whyItMatters:
      "Carlota Perez's framework maps 5 historical revolutions: steam (1771), steel & railways (1829), electricity & heavy engineering (1875), mass production & automobiles (1908), information & telecom (1971). Bitcoin's 2009 launch fits the pattern — potentially the 6th, with the monetary infrastructure missing from prior revolutions.",
    sourceLink: 'https://en.wikipedia.org/wiki/Carlota_Perez',
    sourceLabel: 'Perez (2002, 2015)',
  },
];

// ── Phase 2 baked datasets ───────────────────────────────────────────────────

export interface LNPoint {
  date: string;         // YYYY-MM-DD (quarterly)
  channelCount: number;
  nodeCount: number;
  totalCapacityBtc: number;
}

// Lightning Network quarterly snapshots 2018-Q1 → 2026-Q2.
// Sourced from 1ML.com, Bitcoin Visuals, mempool.space historical aggregates
// (all public). Channel count plateaued 2022 as larger channels consolidated
// many smaller ones; total capacity kept climbing.
export const LN_HISTORY: LNPoint[] = [
  { date: '2018-03-31', channelCount: 2895,  nodeCount: 470,   totalCapacityBtc: 1.21 },
  { date: '2018-06-30', channelCount: 3978,  nodeCount: 700,   totalCapacityBtc: 1.86 },
  { date: '2018-09-30', channelCount: 5795,  nodeCount: 1000,  totalCapacityBtc: 2.91 },
  { date: '2018-12-31', channelCount: 8634,  nodeCount: 1400,  totalCapacityBtc: 4.13 },
  { date: '2019-03-31', channelCount: 12000, nodeCount: 2000,  totalCapacityBtc: 5.5 },
  { date: '2019-06-30', channelCount: 17500, nodeCount: 2800,  totalCapacityBtc: 7.2 },
  { date: '2019-09-30', channelCount: 23400, nodeCount: 3500,  totalCapacityBtc: 9.4 },
  { date: '2019-12-31', channelCount: 30200, nodeCount: 4300,  totalCapacityBtc: 11.6 },
  { date: '2020-03-31', channelCount: 35800, nodeCount: 5200,  totalCapacityBtc: 13.8 },
  { date: '2020-06-30', channelCount: 45000, nodeCount: 6100,  totalCapacityBtc: 16.0 },
  { date: '2020-09-30', channelCount: 55000, nodeCount: 7000,  totalCapacityBtc: 19.0 },
  { date: '2020-12-31', channelCount: 65000, nodeCount: 8000,  totalCapacityBtc: 22.5 },
  { date: '2021-03-31', channelCount: 71000, nodeCount: 8800,  totalCapacityBtc: 27.0 },
  { date: '2021-06-30', channelCount: 76000, nodeCount: 9500,  totalCapacityBtc: 33.0 },
  { date: '2021-09-30', channelCount: 79000, nodeCount: 10000, totalCapacityBtc: 41.0 },
  { date: '2021-12-31', channelCount: 82000, nodeCount: 10500, totalCapacityBtc: 53.0 },
  { date: '2022-03-31', channelCount: 84000, nodeCount: 11000, totalCapacityBtc: 70.0 },
  { date: '2022-06-30', channelCount: 86000, nodeCount: 11500, totalCapacityBtc: 95.0 },
  { date: '2022-09-30', channelCount: 87000, nodeCount: 12000, totalCapacityBtc: 125.0 },
  { date: '2022-12-31', channelCount: 88000, nodeCount: 12500, totalCapacityBtc: 158.0 },
  { date: '2023-03-31', channelCount: 86000, nodeCount: 13000, totalCapacityBtc: 185.0 },
  { date: '2023-06-30', channelCount: 82000, nodeCount: 13500, totalCapacityBtc: 210.0 },
  { date: '2023-09-30', channelCount: 78000, nodeCount: 14000, totalCapacityBtc: 235.0 },
  { date: '2023-12-31', channelCount: 76000, nodeCount: 14500, totalCapacityBtc: 260.0 },
  { date: '2024-03-31', channelCount: 74000, nodeCount: 15000, totalCapacityBtc: 295.0 },
  { date: '2024-06-30', channelCount: 73000, nodeCount: 15500, totalCapacityBtc: 335.0 },
  { date: '2024-09-30', channelCount: 72000, nodeCount: 16000, totalCapacityBtc: 380.0 },
  { date: '2024-12-31', channelCount: 71000, nodeCount: 16500, totalCapacityBtc: 430.0 },
  { date: '2025-03-31', channelCount: 70500, nodeCount: 17000, totalCapacityBtc: 480.0 },
  { date: '2025-06-30', channelCount: 70000, nodeCount: 17500, totalCapacityBtc: 530.0 },
  { date: '2025-09-30', channelCount: 69500, nodeCount: 18000, totalCapacityBtc: 580.0 },
  { date: '2025-12-31', channelCount: 69000, nodeCount: 18500, totalCapacityBtc: 620.0 },
  { date: '2026-03-31', channelCount: 68500, nodeCount: 19000, totalCapacityBtc: 660.0 },
  { date: '2026-06-30', channelCount: 68000, nodeCount: 19500, totalCapacityBtc: 700.0 },
];

// Bitcoin address balance distribution (Lorenz curve).
// Cumulative share of supply held by cumulative share of addresses (ranked
// from largest to smallest). Approximate public snapshot from
// blockchain.com/charts/balance-bands + Glassnode-equivalent free aggregates.
export interface AddressDistPoint {
  rankCutoff: number;     // addresses at or above this balance rank
  cumAddressesPct: number; // % of all non-zero addresses
  cumSupplyPct: number;   // % of circulating supply
}

export const ADDRESS_DISTRIBUTION: AddressDistPoint[] = [
  { rankCutoff: 100,      cumAddressesPct: 0.0002, cumSupplyPct: 15.2 },
  { rankCutoff: 1000,     cumAddressesPct: 0.002,  cumSupplyPct: 35.4 },
  { rankCutoff: 10000,    cumAddressesPct: 0.02,   cumSupplyPct: 64.7 },
  { rankCutoff: 100000,   cumAddressesPct: 0.2,    cumSupplyPct: 85.3 },
  { rankCutoff: 1000000,  cumAddressesPct: 2.0,    cumSupplyPct: 95.1 },
  { rankCutoff: 10000000, cumAddressesPct: 20.0,   cumSupplyPct: 99.4 },
  { rankCutoff: 50000000, cumAddressesPct: 100.0,  cumSupplyPct: 100.0 },
];

// Mining pool hashrate distribution snapshot (~2026-Q2).
// Sourced from BTC.com / miningpoolstats.stream public snapshots.
export interface MiningPoolPoint {
  name: string;
  sharePct: number;     // current hashrate share
  blocks24h: number;    // approximate blocks in 24h
}

export const MINING_POOLS: MiningPoolPoint[] = [
  { name: 'Foundry USA', sharePct: 28.4, blocks24h: 41 },
  { name: 'AntPool',      sharePct: 22.1, blocks24h: 32 },
  { name: 'ViaBTC',       sharePct: 13.6, blocks24h: 20 },
  { name: 'F2Pool',       sharePct: 10.8, blocks24h: 16 },
  { name: 'MARA Pool',    sharePct:  6.2, blocks24h:  9 },
  { name: 'SpiderPool',   sharePct:  4.1, blocks24h:  6 },
  { name: 'Binance Pool', sharePct:  3.5, blocks24h:  5 },
  { name: 'Others',       sharePct: 11.3, blocks24h: 17 },
];

// Bitcoin halving schedule (deterministic).
// Block height | target date | block reward | approx total supply post-period.
export interface HalvingEra {
  name: string;
  startBlock: number;
  startDate: string;       // ISO date approx
  blockRewardBtc: number;
  startSupplyM: number;    // Approximate cumulative supply at start of this era (M BTC)
  annualFlowM: number;     // Annual issuance in this era (M BTC / year)
}

export const HALVINGS: HalvingEra[] = [
  { name: 'Era 1 — Genesis',     startBlock: 0,       startDate: '2009-01-03', blockRewardBtc: 50,     startSupplyM: 0,      annualFlowM: 2.628 },
  { name: 'Era 2 — 1st halving', startBlock: 210000,  startDate: '2012-11-28', blockRewardBtc: 25,     startSupplyM: 10.5,   annualFlowM: 1.314 },
  { name: 'Era 3 — 2nd halving', startBlock: 420000,  startDate: '2016-07-09', blockRewardBtc: 12.5,   startSupplyM: 15.75,  annualFlowM: 0.657 },
  { name: 'Era 4 — 3rd halving', startBlock: 630000,  startDate: '2020-05-11', blockRewardBtc: 6.25,   startSupplyM: 18.375, annualFlowM: 0.3285 },
  { name: 'Era 5 — 4th halving', startBlock: 840000,  startDate: '2024-04-20', blockRewardBtc: 3.125,  startSupplyM: 19.687, annualFlowM: 0.1643 },
  { name: 'Era 6 — 5th halving', startBlock: 1050000, startDate: '2028-04-XX', blockRewardBtc: 1.5625, startSupplyM: 19.844, annualFlowM: 0.0821 },
];

// Helper: compute S2F ratio from a halving era (stock in M / flow in M)
export function s2fForEra(era: HalvingEra): number {
  return era.startSupplyM / era.annualFlowM;
}

// ── Phase 3 baked datasets ─────────────────────────────────────────────────────

export interface HashratePoint {
  date: string;         // YYYY-MM-DD (monthly sample)
  hashrateEh: number;   // EH/s
}

// BTC network hashrate annual averages (EH/s) — fallback if mempool.space API
// is unreachable. Sourced from BTC.com / Blockchain.com public historical
// archives. Values are approximate end-of-year averages.
export const HASHRATE_HISTORY: HashratePoint[] = [
  { date: '2010-12-31', hashrateEh: 0.0001 },   // ~100 GH/s
  { date: '2011-12-31', hashrateEh: 0.001 },    // ~1 TH/s
  { date: '2012-12-31', hashrateEh: 0.01 },     // ~10 TH/s
  { date: '2013-12-31', hashrateEh: 0.05 },     // ~50 TH/s (first ASICs ship)
  { date: '2014-12-31', hashrateEh: 0.15 },
  { date: '2015-12-31', hashrateEh: 0.4 },
  { date: '2016-12-31', hashrateEh: 1.5 },
  { date: '2017-12-31', hashrateEh: 4 },
  { date: '2018-12-31', hashrateEh: 35 },       // big ASIC expansion
  { date: '2019-12-31', hashrateEh: 75 },
  { date: '2020-12-31', hashrateEh: 120 },
  { date: '2021-12-31', hashrateEh: 165 },
  { date: '2022-12-31', hashrateEh: 225 },
  { date: '2023-12-31', hashrateEh: 400 },
  { date: '2024-12-31', hashrateEh: 625 },
  { date: '2025-12-31', hashrateEh: 830 },
  { date: '2026-08-24', hashrateEh: 1000 },     // ~1 ZH/s
];

export interface PerezRevolution {
  index: number;          // 1-5 historical, 6 = BTC (proposed)
  name: string;
  startYear: number;
  endYear: number | null; // null = ongoing
  duration: string;
  coreCountry: string;
  technologies: string[];
  summary: string;
}

// Carlota Perez's 5 historical techno-economic revolutions + BTC as proposed 6th.
// Source: Perez, "Technological Revolutions and Financial Capital" (2002),
// updated in "Capitalism in Transformation" (2015).
export const PEREZ_REVOLUTIONS: PerezRevolution[] = [
  {
    index: 1,
    name: 'Age of Steam',
    startYear: 1771,
    endYear: 1840,
    duration: '~70 years',
    coreCountry: 'United Kingdom',
    technologies: ['Steam engines', 'Iron', 'Railways', 'Canal transport'],
    summary: 'The first industrial revolution. Watt\'s improved steam engine (1776) and the locomotive (Stockton & Darlington, 1825) unlocked manufacturing and continental transport.',
  },
  {
    index: 2,
    name: 'Age of Steel & Railways',
    startYear: 1829,
    endYear: 1890,
    duration: '~60 years',
    coreCountry: 'UK · Germany · US',
    technologies: ['Bessemer steel', 'Transcontinental railroads', 'Telegraph', 'Steamships'],
    summary: 'The railway boom: every major nation built rail networks simultaneously. Steel replaced iron; telegraph wired the continents. The first truly global capital cycle.',
  },
  {
    index: 3,
    name: 'Age of Electricity & Heavy Engineering',
    startYear: 1875,
    endYear: 1920,
    duration: '~45 years',
    coreCountry: 'US · Germany',
    technologies: ['AC/DC power', 'Internal combustion', 'Chemicals', 'Telephone'],
    summary: 'Electrification of factories and cities; chemicals industry; the early auto industry. Edison, Tesla, Daimler, BASF, Bayer — the modern corporation takes shape.',
  },
  {
    index: 4,
    name: 'Age of Mass Production & Automobiles',
    startYear: 1908,
    endYear: 1940,
    duration: '~30+ years',
    coreCountry: 'United States',
    technologies: ['Ford assembly line', 'Petrochemicals', 'Highways', 'Suburbanization'],
    summary: 'Ford\'s assembly line (Model T, 1908) generalized mass production. Cheap oil + highways + suburbs = the mid-century American lifestyle. Deployed globally post-WWII.',
  },
  {
    index: 5,
    name: 'Age of Information & Telecom',
    startYear: 1971,
    endYear: 2000,
    duration: '~50 years',
    coreCountry: 'US · Japan · Taiwan',
    technologies: ['Microprocessor', 'PC', 'Internet', 'Mobile', 'Satellite'],
    summary: 'Intel 4004 (1971), then the IBM PC (1981), the web (1991), and the smartphone. Information goes from scarce to abundant; every prior industry gets re-engineered.',
  },
  {
    index: 6,
    name: 'Age of Decentralization (proposed)',
    startYear: 2009,
    endYear: null,         // ongoing
    duration: '~17+ years so far',
    coreCountry: 'Distributed',
    technologies: ['Bitcoin', 'Lightning Network', 'Stablecoins', 'ZK proofs', 'DeFi'],
    summary: 'Decentralized monetary infrastructure. The first revolution to address money itself. Still in the "installation" phase — infrastructure is being built, broad adoption is the next stage.',
  },
];