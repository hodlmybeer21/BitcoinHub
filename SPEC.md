# BitcoinHub Trading Terminal — SPEC

## Mental Model

A trader lands on this page. They have 30 seconds. One question: **"what are the conditions right now — buy, sell, or sit out?"**

Everything on the page answers that question directly. The information hierarchy is:

1. **Signal** (top priority — the verdict)
2. **Price** (the number that drives everything)
3. **Short-term movers** (what's pushing price right now)
4. **Context** (macro, funding, options — why is it moving)

## Info Hierarchy

```
[VERDICT — Signal Bar]          ← Did sentiment shift? Bullish/bearish score?
[PRICE — Scoreboard]            ← Where is BTC right now?
[CHART — Hero Element]          ← What's the trend? Support/resistance?
[SHORT-TERM] F&G | Movers | Whales | OnChain  ← What's driving it?
[MACRO] S&P | DXY | Gold        ← Risk-on or risk-off?
[FUNDING + LIQUIDITY]           ← Smart money positioning?
[OPTIONS FLOW]                  ← Where are the big players?
[DEEP METRICS]                  ← Everything else (collapsible)
```

## Layout (ASCII Wireframe)

```
┌────────────────────────────────────────────────────────────────────┐
│ ZONE 1: SCOREBOARD (sticky top)                                   │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ BTC $87,234.56  +2.34% ▲    [day range bar]    Vol: $28.4B    ││
│ │ Last updated: 06:20:45 UTC         [↻] auto-refresh 60s     ││
│ └─────────────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────────┤
│ ZONE 2: SIGNAL LIGHT                                              │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ 🟢 BUY CONDITIONS BUILDING │ 4/6 bullish │ REFRESH           ││
│ └─────────────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────────┤
│ ZONE 3: CHART (hero, full-width, tall)                            │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ [1m] [5m] [15m] [1h] [4h] [1D] timeframes                       ││
│ │ ████████████████████████████████████ polyline chart             ││
│ │ ─ ─ ─ resistance (95th pctl)                                   ││
│ │ ─ ─ ─ support (5th pctl)                                       ││
│ │ ● current price dot                                            ││
│ └─────────────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────────┤
│ ZONE 4: SHORT-TERM SIGNAL CARDS (4-col grid)                     │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐       │
│ │FEAR&GREED  │ │MARKET      │ │WHALE PULSE │ │ON-CHAIN    │       │
│ │ Gauge 0-100│ │MOVERS      │ │ Last 3 tx  │ │SNAP        │       │
│ │ classification│ │BTC DOM+CAP│ │ amount+dir │ │hashrate,diff│       │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘       │
├────────────────────────────────────────────────────────────────────┤
│ ZONE 5: MACRO CORRELATION (3-col)                                 │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐                     │
│ │ S&P 500    │ │ DXY Index  │ │ Gold       │                     │
│ │ 5,234 +0.5%│ │ 104.2 -0.2% │ │ $2,341 +0.1│                     │
│ │ correlates │ │ inversely  │ │ safe haven │                     │
│ └────────────┘ └────────────┘ └────────────┘                     │
├────────────────────────────────────────────────────────────────────┤
│ ZONE 6: FUNDING + LIQUIDITY (2-col)                              │
│ ┌─────────────────────┐ ┌─────────────────────┐                   │
│ │ FUNDING RATES       │ │ LIQUIDITY           │                   │
│ │ Bybit: +0.0123%/8h  │ │ Key levels          │                   │
│ │ ⚠️ HIGH if >0.01%/hr│ │ anomalies highlighted│                   │
│ └─────────────────────┘ └─────────────────────┘                   │
├────────────────────────────────────────────────────────────────────┤
│ ZONE 7: OPTIONS FLOW (full-width table)                          │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Put/Call: 1.23 │ OI: 12.4K │ IV: 54.2% │ SENTIMENT: BULLISH   ││
│ │ TOP STRIKES: [table of top 5 contracts with strike, OI, vol]   ││
│ └─────────────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────────┤
│ ZONE 8: DEEP METRICS (collapsible footer)                        │
│ Global Cap | ETH price | DeFi TVL | Difficulty | 10Y Yield | ... │
└────────────────────────────────────────────────────────────────────┘
```

## Component Inventory

| Component | Data Source | Key Display |
|-----------|-------------|-------------|
| `Scoreboard` | `/api/bitcoin/market-data` | Large price, 24h%, day range bar, volume, market cap |
| `SignalLight` | Computed client-side from all data | X/6 bullish score, colored bar |
| `PriceChart` | `/api/bitcoin/chart?timeframe=X` | SVG polyline, support/resistance, timeframe selector |
| `FearGreedCard` | `/api/web-resources/fear-greed` | Gauge 0-100, classification, history |
| `MarketMoversCard` | CoinGecko API | BTC dominance, total cap, top coins |
| `WhalePulseCard` | `/api/whale-alerts` | Last 3 whale txs, amount + direction |
| `OnChainSnapCard` | `/api/bitcoin/network-stats` | Hashrate, difficulty, block time |
| `MacroCorrCard` | `/api/financial/markets` | S&P 500, DXY, Gold with % change + correlation |
| `FundingCard` | Bybit API direct | Funding rate %, color-coded, warning if extreme |
| `LiquidityCard` | `/api/liquidity` | Key levels, anomalies, overall signal |
| `OptionsFlowCard` | `/api/options-flow` | Put/call ratio, OI, IV, top strikes table |
| `DeepMetrics` | Various | Global cap, ETH price, DeFi TVL, difficulty, yields, inflation |

## Signal Computation (Client-Side Rules)

The 6 signals that feed the SignalLight:

| Signal | Bullish Condition | Bearish Condition |
|--------|-------------------|-------------------|
| Fear & Greed | < 30 (extreme fear = buy opportunity) | > 70 (extreme greed = caution) |
| 24h Price Direction | Positive change % | Negative change % |
| Whale Pressure | Net exchange outflows (accumulation) | Net exchange inflows (distribution) |
| S&P 500 Correlation | S&P 500 positive (risk-on) | S&P 500 negative |
| Funding Rate | Negative (shorts paying longs) | > 0.01%/hr positive (longs paying shorts = top signal) |
| BTC 24h Performance | > 1% | < -1% |

Score: Count bullish signals. 0-2 = RED/SELL, 3-4 = YELLOW/SIT, 5-6 = GREEN/BUY

## Technical Notes

- All data via React Query `useQuery` with 60s refetch interval
- Chart: raw SVG polyline (no chart library), computed support/resistance from 95th/5th percentile of price data
- Auto-refresh: 60 seconds via `setInterval`
- Dark theme preserved
- Sticky scoreboard at top
- No shadcn/ui chart components — raw SVG only