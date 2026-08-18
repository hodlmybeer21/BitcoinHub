# BitcoinHub Workbench — No-Code Indicator Builder — SPEC

## Mental Model

A power user lands on this page. They've seen the dashboard, played with the F&G gauge, the funding rate, the whale alerts. They have a *theory* — "BTC tops when funding is high AND options put/call flips AND DXY breaks up" — but no place to test it. Today they'd need Python, a Jupyter notebook, and five API keys.

The Workbench lets them **compose any indicator from BitcoinHub's existing data sources, visually, with no code**, and see the result as a live chart in seconds.

Everything on the page answers one question: **"does my indicator actually do what I think it does?"**

## Info Hierarchy

```
[TOOLBAR — Save / Share / Templates / Settings]   ← Persistence + access
[BUILDER — Composable formula canvas]             ← The user's idea, made tangible
[PALETTE — Metric blocks, organized by category]  ← What they have to work with
[PREVIEW — Live chart with thresholds/overlays]   ← Verdict: does it work?
[STATUS — Last evaluated, errors, data freshness] ← Trust signal
```

## Mental Model (continued)

The Workbench should feel like **Scratch meets TradingView**. Not a spreadsheet, not code — a visual canvas where blocks snap together. Users see the formula take shape; the chart is the immediate feedback loop.

Three levels of user:
1. **Beginner** — picks a template, tweaks one number, hits save. (~80% of users)
2. **Intermediate** — drags blocks together, no formulas. (~15% of users)
3. **Power** — switches to formula view for full control. (~5% of users)

All three paths lead to the same preview panel.

## Layout (ASCII Wireframe)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ZONE 1: TOOLBAR (sticky top)                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ [≡] BitcoinHub Workbench  │ Untitled Indicator* │ [Templates▾] [Share] ││
│ │                                                [Save] [⤓Export JSON]  ││
│ └─────────────────────────────────────────────────────────────────────────┘│
├──────────────┬──────────────────────────────────────────┬──────────────────┤
│ ZONE 2:      │ ZONE 3: BUILDER CANVAS                   │ ZONE 4: PREVIEW  │
│ METRIC       │ ┌──────────────────────────────────────┐ │ ┌──────────────┐ │
│ PALETTE      │ │                                      │ │ │ BTC Composite│ │
│              │ │  ┌──────────┐    ┌──────────────┐    │ │ │ Risk Score   │ │
│ ▾ Price      │ │  │ Funding  │───►│  >  0.0001   │──┐ │ │ ┌──────────┐ │ │
│   BTC close  │ │  │  Rate    │    │              │  │ │ │ │  ╱╲      │ │ │
│   BTC SMA    │ │  └──────────┘    └──────────────┘  │ │ │ │ ╱  ╲___  │ │ │
│   BTC RSI    │ │                                     │ │ │ ├──────────┤ │ │
│   ...        │ │  ┌──────────┐    ┌──────────────┐   │ │ │ │Last: 0.73│ │ │
│              │ │  │   F&G   │───►│  <  30       │─┐ │ │ │ │Status: 🟡│ │ │
│ ▸ Sentiment  │ │  │  Index  │    │              │ │ │ │ │ └──────────┘ │ │
│   F&G        │ │  └──────────┘    └──────────────┘ │ │ │ │  Threshold  │ │
│   ...        │ │                                     │ │ │ │  ▔▔▔ 0.50  │ │
│ ▸ Whales     │ │            ┌──────────────┐         │ │ │ │  ▁▁ 0.30  │ │
│   Net flow   │ │            │     AND      │◀────────┘ │ │              │ │
│   Tx count   │ │            └──────┬───────┘         │ │ │ [1D][7D][30D]│ │
│   ...        │ │                   │                 │ │ │ [90D][1Y][ALL]│ │
│ ▸ Funding    │ │            ┌──────▼───────┐         │ │ └──────────────┘ │
│   Bybit rate │ │            │ 0/1  Boolean │         │ │                  │
│   ...        │ │            └──────────────┘         │ │ ZONE 5: STATUS    │
│ ▸ Options    │ │                                      │ │ ┌──────────────┐ │
│ ▸ On-chain   │ │ [Toggle: Visual ⇆ Formula]          │ │ │Eval: 2.3s    │ │
│ ▸ Macro      │ │                                      │ │ │Data: 12/12 🟢│ │
│ ▸ Liquidity  │ │                                      │ │ │Last: 06:24  │ │
│ ▸ Catalysts  │ └──────────────────────────────────────┘ │ └──────────────┘ │
│ ▸ Time       │                                          │                  │
└──────────────┴──────────────────────────────────────────┴──────────────────┘
```

## Component Inventory

| Component | Data Source | Key Display |
|-----------|-------------|-------------|
| `WorkbenchToolbar` | local + DB | Title (inline edit), save state, share button, export JSON |
| `MetricPalette` | Static registry | Categorized, searchable, draggable blocks |
| `BuilderCanvas` | Formula tree | Visual blocks or formula text view; supports nesting |
| `FormulaNode` | Single op/data block | Block with input sockets, output port, parameters |
| `PreviewPanel` | Eval result | Line/area chart, threshold overlay, current value, color |
| `TimeRangeSelector` | — | 1D / 7D / 30D / 90D / 1Y / ALL |
| `StatusBar` | Eval metadata | Eval time, data freshness per source, errors |
| `TemplateGallery` | DB / static | Curated starters + community indicators |
| `ShareDialog` | DB | Public URL, copy link, embed code |

## Composable Block Registry

### Source Blocks (inputs)

| Block | Source | Granularity | Notes |
|-------|--------|-------------|-------|
| `btc.price.close` | CoinGecko/CryptoCompare | 1m–1d | BTC spot price |
| `btc.price.ohlc` | CoinGecko | 1m–1d | Full OHLCV |
| `eth.price.close` | CoinGecko | 1m–1d | ETH spot price |
| `btc.dominance` | CoinGecko | 1h–1d | BTC % of total cap |
| `fear_greed.value` | alternative.me | daily | 0–100 |
| `fear_greed.classification` | alternative.me | daily | "Extreme Fear" etc. |
| `whale.net_flow` | blockchain.com | 1h–1d | Net BTC exchange flow |
| `whale.tx_count` | blockchain.com | 1h–1d | Large-tx count (≥100 BTC) |
| `whale.largest_tx` | blockchain.com | 1h–1d | Single largest tx in window |
| `funding.bybit.btc` | Bybit | 8h | Current funding rate |
| `funding.aggregated` | Deribit/Bybit/OKX | 8h | Cross-exchange mean |
| `options.put_call_ratio` | Deribit | 1h–1d | Volume-weighted |
| `options.open_interest` | Deribit | 1h–1d | Total OI in BTC |
| `options.implied_vol` | Deribit | 1d | ATM 30d IV |
| `options.max_pain` | Deribit | 1d | Strike with max OI |
| `onchain.hashrate` | blockchain.com | 1d | TH/s |
| `onchain.difficulty` | blockchain.com | 1d | Current epoch |
| `onchain.active_addresses` | blockchain.com | 1d | Unique senders |
| `onchain.mempool_size` | blockchain.com | 1m–1d | Bytes pending |
| `macro.sp500` | Yahoo Finance | 1d | S&P 500 close |
| `macro.dxy` | Yahoo Finance | 1d | Dollar index |
| `macro.gold` | Yahoo Finance | 1d | Gold spot |
| `macro.vix` | Yahoo Finance | 1d | Volatility index |
| `macro.ust10y` | FRED | 1d | 10Y Treasury yield |
| `macro.inflation_cpi` | FRED / Truflation | monthly | CPI YoY |
| `liquidity.m2_us` | FRED | weekly | M2 money supply |
| `liquidity.wb_composite` | World Bank | weekly | BTC liquidity composite |
| `etf.net_flow` | CoinShares/SoSoValue | 1d | Spot ETF net inflow |
| `stablecoin.total_supply` | CoinGecko | 1d | USDT+USDC+DAI |
| `congress.net_buys` | Senate/House Watcher | weekly | Net crypto-related buys |
| `legislation.active_count` | Internal DB | 1h | Active bills in tracker |
| `time.hour_of_day` | computed | — | 0–23 |
| `time.day_of_week` | computed | — | 0–6 |

### Operator Blocks (transforms)

**Math**
`+`, `-`, `*`, `/`, `%`, `^`, `abs`, `log`, `ln`, `sqrt`, `min`, `max`

**Comparison**
`>`, `<`, `>=`, `<=`, `=`, `!=`

**Logic**
`AND`, `OR`, `NOT`, `XOR` (returns 0/1 boolean → coerces to numeric for charting)

**Time-series transforms** (auto-windowed)
`sma(period)`, `ema(period)`, `rsi(period)`, `stddev(period)`, `percentile(period, p)`, `change(period)`, `roc(period)`, `zscore(period)`, `min(period)`, `max(period)`, `slope(period)`

**Threshold helpers**
`above(value, threshold)` → 1 if `value > threshold` else 0
`below(value, threshold)` → 1/0
`crosses_above(a, b)` → 1 on the bar `a` crosses above `b`
`crosses_below(a, b)` → 1 on the bar `a` crosses below `b`
`between(value, lo, hi)` → 1/0

### Output Block

`out(value, viz?, thresholds?)` — terminal node. Defaults to line chart. Optional viz: `area`, `histogram`, `gauge`. Optional thresholds: highlight bands.

## Formula Tree (JSON Serialization)

```json
{
  "version": 1,
  "id": "uuid",
  "name": "BTC Composite Risk Score",
  "description": "Buy-when conditions, 0-1 normalized",
  "createdAt": "2026-08-18T12:00:00Z",
  "updatedAt": "2026-08-18T12:00:00Z",
  "authorId": "user_123",
  "visibility": "private",
  "tree": {
    "type": "out",
    "viz": "line",
    "thresholds": [{ "value": 0.7, "color": "#22c55e", "label": "Bullish" }],
    "input": {
      "type": "AND",
      "inputs": [
        {
          "type": ">",
          "left":  { "type": "data", "id": "fear_greed.value" },
          "right": { "type": "const", "value": 70 }
        },
        {
          "type": ">",
          "left": {
            "type": "data",
            "id": "funding.aggregated",
            "transform": { "type": "sma", "period": 3 }
          },
          "right": { "type": "const", "value": 0.0001 }
        }
      ]
    }
  },
  "meta": {
    "tags": ["sentiment", "funding", "composite"],
    "template": null
  }
}
```

This JSON is what gets:
- Saved to user account (Postgres)
- Exported / imported (file or clipboard)
- Shared via public URL
- Evaluated server-side

## Evaluation Engine

Two execution paths, same tree:

### Server-side (authoritative)
1. Resolve all source blocks → fetch time-series from upstream APIs (with caching layer)
2. Align all series on a common time index (forward-fill within tolerance)
3. Walk tree bottom-up: compute each node on its aligned series
4. Return `{ series: [{t, v}], meta: {evalMs, sources, errors} }`

### Client-side (preview, lightweight)
- Same tree, subset of operations
- For preview, use cached recent data from `/api/workbench/preview?tree=...`
- Renders immediately while server re-evals

### Caching Strategy
- Per-source block, per-interval: Redis (or in-memory) cache
- TTL aligned to source refresh rate
- Cache key: hash(tree + range + interval)
- Invalidation: source data updates → invalidate dependent trees

## Templates (Built-in Starters)

1. **"Buy When Fear"** — `fear_greed.value < 30 AND btc.price.roc(7d) < -10%`
2. **"Funding Squeeze"** — `funding.aggregated > 0.05% AND options.open_interest.roc(1d) > 10%`
3. **"Whale Accumulation"** — `whale.net_flow < -2000` (BTC/day, negative = outflow = accumulation)
4. **"Risk-Off Macro"** — `macro.dxy > 105 AND macro.vix > 20`
5. **"Cycle Top Warning"** — `btc.dominance < 45 AND etf.net_flow.roc(7d) > 50%`
6. **"Liquidity Expansion"** — `liquidity.m2_us.roc(YoY) > 5% AND macro.ust10y < 4%`
7. **"Congressional Conviction"** — `congress.net_buys.roc(30d) > 0`
8. **"Stablecoin Surge"** — `stablecoin.total_supply.roc(7d) > 2%`
9. **"Hashrate Health"** — `onchain.hashrate.sma(30d) > onchain.hashrate` (current below avg = pressure)
10. **"Composite Risk Score"** — 5-condition weighted average → 0–1

## Sharing & Discovery

- **Private** — only owner sees (default)
- **Unlisted** — anyone with the link
- **Public** — appears in `/workbench/gallery`, discoverable, attributed
- **Fork** — copy + modify any public indicator (preserves attribution chain)
- **Embed** — iframe snippet for blogs/X (chart-only, not the builder)

## Pages & Routing

| Route | Purpose |
|-------|---------|
| `/workbench` | Builder (default — empty canvas with palette + templates prompt) |
| `/workbench/:id` | Builder, loaded with saved indicator |
| `/workbench/templates` | Template gallery |
| `/workbench/gallery` | Public community indicators |
| `/workbench/:id/preview` | Embed-only chart (no builder UI) |

## Permissions & Tiers (Future Monetization Hook)

| Feature | Free | Premium |
|---------|------|---------|
| Build from templates | ✅ | ✅ |
| Save up to 3 indicators | ✅ | ✅ |
| Unlimited saved indicators | — | ✅ |
| Public sharing | — | ✅ |
| Embed code | — | ✅ |
| Custom block parameters (advanced formula view) | — | ✅ |
| Backtest over historical data (run indicator on 5y history) | — | ✅ |
| Alert triggers (notify when condition fires) | — | ✅ |

The **Premium** column is the natural anchor for a future "BitcoinHub Pro" tier.

## Data Flow Diagram

```
┌──────────────┐    ┌───────────────┐    ┌──────────────────┐
│ User drags   │    │ Builder       │    │ Formula Tree     │
│ blocks in    │───►│ Canvas        │───►│ (JSON)           │
│ canvas       │    │ (React state) │    │                  │
└──────────────┘    └───────────────┘    └────────┬─────────┘
                                                  │
                              ┌───────────────────┴──────────────┐
                              ▼                                  ▼
              ┌────────────────────────────┐      ┌─────────────────────────┐
              │ Client preview eval       │      │ POST /api/workbench/eval│
              │ (subset of ops, cached)   │      │ (full server eval)      │
              └────────────────┬───────────┘      └────────────┬────────────┘
                               │                                │
                               ▼                                ▼
              ┌────────────────────────────────────────────────────────────┐
              │   Evaluator service:                                       │
              │   1. Resolve data sources                                  │
              │   2. Align series                                          │
              │   3. Walk tree, compute                                    │
              │   4. Return series + meta                                  │
              └────────────────────────┬───────────────────────────────────┘
                                       ▼
              ┌────────────────────────────────────────────────────────────┐
              │   Caching layer (Redis) — keyed on tree + range + interval │
              └────────────────────────┬───────────────────────────────────┘
                                       ▼
              ┌────────────────────────────────────────────────────────────┐
              │   Upstream APIs (already integrated):                       │
              │   • CoinGecko, CryptoCompare, CoinPaprika                   │
              │   • alternative.me (F&G)                                    │
              │   • blockchain.com (whales + on-chain)                      │
              │   • Bybit, Deribit (funding + options)                      │
              │   • Yahoo Finance, FRED (macro)                             │
              │   • World Bank, Truflation (liquidity + inflation)          │
              │   • Senate/House Watcher (congressional)                    │
              │   • Internal DB (legislation)                               │
              └────────────────────────────────────────────────────────────┘
```

## Persistence Schema (Postgres / Drizzle)

```typescript
// already using drizzle per package.json — fit this into existing schema

workbench_indicators
├── id            uuid PK
├── owner_id      uuid FK → users.id
├── name          text
├── description   text nullable
├── tree          jsonb           // the formula tree
├── visibility    enum('private','unlisted','public')
├── slug          text unique      // for shareable URLs
├── forked_from   uuid FK → workbench_indicators.id nullable
├── tags          text[]
├── created_at    timestamptz
├── updated_at    timestamptz

workbench_forks
├── parent_id     uuid FK → workbench_indicators.id
├── child_id      uuid FK → workbench_indicators.id
├── PRIMARY KEY (parent_id, child_id)

workbench_template_starts
├── template_id   text PK         // 'buy_when_fear', 'funding_squeeze', ...
├── name          text
├── description   text
├── tree          jsonb           // starter tree
├── category      text
```

## Technical Notes

### Frontend
- **Builder canvas**: SVG-based block graph (no heavy library). Drag, drop, snap, connect.
- **State**: Zustand or local React Context (not Redux — overkill). Tree is the single source of truth.
- **Persistence**: debounced auto-save (every 5s if dirty) to `/api/workbench/indicators/:id`
- **Palette**: virtualized list (react-window) for fast scroll over 40+ blocks
- **Live preview**: requestAnimationFrame-driven chart (Recharts already in use)

### Backend
- **Evaluator**: TypeScript module, pure functions, deterministic. Easy to test.
- **API endpoints**:
  - `GET /api/workbench/blocks` — registry of available source/operator blocks
  - `POST /api/workbench/evaluate` — body: `{tree, range, interval}` → `{series, meta}`
  - `GET /api/workbench/indicators` — list user's indicators
  - `POST /api/workbench/indicators` — create
  - `PATCH /api/workbench/indicators/:id` — update
  - `DELETE /api/workbench/indicators/:id`
  - `POST /api/workbench/indicators/:id/fork`
  - `GET /api/workbench/indicators/:slug` — public fetch (for share/embed)
  - `GET /api/workbench/templates` — built-in starters

### Performance Targets
- Tree evaluation: <2s for 1Y daily, <500ms for 30D daily
- Cache hit ratio: >70% after warmup
- Live preview latency (cached): <100ms

### Security
- Tree validation on every server call (whitelist of block types)
- Per-user rate limit on evaluate endpoint (e.g. 60/min)
- Public indicators: no PII in serialized tree (strip `authorId` for share responses)
- Embed endpoint: signed URL with expiry (24h) for live data, or static snapshot

### Out of Scope (v1)
- Real-time alert notifications (defer to v2 — needs user notification infra)
- Pine Script export to TradingView
- Collaborative editing
- AI-assisted indicator generation (could be a v2 hook using the Grok integration)
- Backtesting with P&L simulation (defer to v2)

## Phased Rollout

**Phase 1 — MVP (3–4 weeks)**
- Block palette with ~15 most-used sources (price, F&G, whale, funding, options, on-chain)
- Visual builder canvas
- Live preview with line chart
- Save/load private indicators (per user)
- 5 built-in templates

**Phase 2 — Public + Sharing (1–2 weeks)**
- Public/unlisted visibility
- Share dialog + URLs
- Forking
- Public gallery page
- Embed iframe

**Phase 3 — Power Features (2–3 weeks)**
- Formula text view (for advanced users)
- Backtest over historical range (1Y → 5Y)
- Premium-gating (3+ indicators, public sharing, backtest)

**Phase 4 — Monetization & Alerts (future)**
- Alert triggers (email/push/webhook when condition fires)
- AI-assisted indicator generation via Grok
- Pine Script export

## Why This Wins

1. **Lowest build cost, highest differentiation.** You already have the data layer. The Workbench is mostly UI + an evaluator + a small persistence layer — no new API integrations.
2. **Anchors a paid tier.** "Unlimited saved indicators + public sharing + backtest" is a clean Premium feature set.
3. **User-generated content loop.** Public indicators become a discovery surface — users come to BitcoinHub for the community-built tools, not just Ben-style hand-curated ones.
4. **Compatible with the rest of the site.** Indicators built here can be referenced from Dashboard widgets, alert systems, newsletter content — grows the whole ecosystem.
5. **Hard to copy without a data layer this deep.** ITC has the data, but their UI is a WordPress form. Your React + dark-mode + live data infra is the right substrate.