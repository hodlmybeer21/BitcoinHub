# BitcoinHub MPT — Modern Portfolio Theory for Crypto — SPEC

> **Locked decisions (2026-08-18):** 4-year cycle time ranges, no shorting in MVP (later), universe = **BTC + 6 BTC-correlated instruments** (IBIT, FBTC, MSTR, COIN, MARA, RIOT).

## Mental Model

A user holds a bag of crypto — maybe BTC, ETH, a few alts they picked off a tweet. They have two fears:
1. **"Am I taking too much risk for the return I'm getting?"**
2. **"Is there a better mix I should be holding?"**

Today they have no answer. CoinGecko shows price. Twitter shows opinion. Nobody shows them **the math**.

The MPT tool answers both questions with one screen: **here's your portfolio's risk/return profile, here's the efficient frontier, here's how far you are from optimal, and here's what to buy/sell to fix it.**

Everything on the page answers: **"what should my portfolio actually look like?"**

## Info Hierarchy

```
[INPUT — Portfolio + Time Range]   ← What they hold, over what window
[STATS — Per-asset metrics]       ← Volatility, return, drawdown, Sharpe
[CORRELATIONS — Heatmap]          ← How their assets move together
[EFFICIENT FRONTIER — Chart]      ← The curve; their portfolio plotted on it
[OPTIMAL — Allocation suggestion]  ← Concrete weight targets
[ACTIONS — Rebalance / Stress / Save] ← What to do next
```

## Mental Model (continued)

Three user personas:
1. **Curious holder** — plugs in their bag, sees the frontier, is shocked their portfolio is sub-optimal. (70%)
2. **Active allocator** — rebalances periodically, wants the math to back the call. (25%)
3. **Quant nerd** — already knows MPT, wants the engine exposed so they can build on it. (5%)

All three paths end at the same rebalance suggestion.

## Layout (ASCII Wireframe)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ZONE 1: PORTFOLIO INPUT (sticky top)                                      │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ [+ Add Asset]  Time range: [90D|180D|1Y|2Y|ALL]  RF rate: [4.5%]  [Save]││
│ │ ┌───────────────────────────────────────────────────────────────────┐  ││
│ │ │ Asset    Qty      Cost Basis   Weight    Actions                  │  ││
│ │ │ BTC      1.5      $42,000      58%       [edit] [remove]          │  ││
│ │ │ ETH      12       $1,800       22%       [edit] [remove]          │  ││
│ │ │ SOL      250      $98          15%       [edit] [remove]          │  ││
│ │ │ LINK     800      $14           5%       [edit] [remove]          │  ││
│ │ └───────────────────────────────────────────────────────────────────┘  ││
│ │ Total value: $138,450    Last refresh: 12:55 UTC  [↻]                ││
│ └─────────────────────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────────────────┤
│ ZONE 2: PER-ASSET STATS (5-col grid)                                      │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│ │ BTC        │ │ ETH        │ │ SOL        │ │ LINK       │ │ PORTFOLIO  │ │
│ │ Ret: +142% │ │ Ret: +87%  │ │ Ret: +340% │ │ Ret: -12%  │ │ Ret: +118% │ │
│ │ Vol: 58%   │ │ Vol: 72%   │ │ Vol: 124%  │ │ Vol: 95%   │ │ Vol: 51%   │ │
│ │ DD: -73%   │ │ DD: -78%   │ │ DD: -94%   │ │ DD: -82%   │ │ DD: -68%   │ │
│ │ Sharpe 2.1 │ │ Sharpe 1.0 │ │ Sharpe 2.4 │ │ Sharpe -0.3│ │ Sharpe 2.0 │ │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘ │
├────────────────────────────────────────────────────────────────────────────┤
│ ZONE 3: CORRELATION HEATMAP (full-width)                                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │      BTC   ETH   SOL   LINK                                              ││
│ │ BTC  1.00  .82   .71   .65                                              ││
│ │ ETH  .82   1.00  .78   .69                                              ││
│ │ SOL  .71   .78   1.00  .58                                              ││
│ │ LINK .65   .69   .58   1.00                                             ││
│ │  [-1.0]  [0]  [+1.0]   ← scale                                          ││
│ └─────────────────────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────────────────┤
│ ZONE 4: EFFICIENT FRONTIER (full-width, tall)                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ Return ▲                                                              ╱││
│ │   200%│                                                       ★Max   ╱││
│ │       │                                                  Sharpe    ╱  ││
│ │   150%│                                              ╱─────●───╱    ││
│ │       │                                          ╱       YOUR  ╱    ││
│ │   100%│                                     ╱──●───●─PORTFOLIO      ││
│ │       │                              ╱───●─                        ││
│ │    50%│                       ●─●─●─                                ││
│ │       │                ●─●─                                        ││
│ │     0%└──●──●──●───────────────────────────────────────────►         ││
│ │       0%   30%    60%    90%    120%   150%   180%                    ││
│ │                          Volatility (annualized)                     ││
│ │                                                                        ││
│ │  ●  random portfolios (Monte Carlo)    ●  optimal portfolios          ││
│ │  ★  max Sharpe                          ●  current portfolio          ││
│ │  ▼  min volatility                                                    ││
│ └─────────────────────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────────────────┤
│ ZONE 5: OPTIMAL ALLOCATION (2-col)                                       │
│ ┌─────────────────────────┐ ┌─────────────────────────────────────────┐  │
│ │ CURRENT WEIGHTS         │ │ OPTIMAL WEIGHTS (Max Sharpe)           │  │
│ │                         │ │                                         │  │
│ │ ████████ BTC 58%        │ │ ████████████████ BTC 71%                │  │
│ │ ████ ETH 22%            │ │ ████ ETH 14%                            │  │
│ │ ███ SOL 15%             │ │ ████ SOL 11%                            │  │
│ │ █ LINK 5%               │ │ █ LINK 4%                               │  │
│ │                         │ │                                         │  │
│ │ Expected Sharpe: 1.83   │ │ Expected Sharpe: 2.47 (+35%)          │  │
│ │ Distance from frontier: │ │ Distance from frontier: 0%            │  │
│ │     1.2%               │ │                                         │  │
│ └─────────────────────────┘ └─────────────────────────────────────────┘  │
│   [Show trades to rebalance →]   [Save as target]   [Run backtest]        │
├────────────────────────────────────────────────────────────────────────────┤
│ ZONE 6: ACTIONS (collapsible)                                            │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ ▸ Stress test  — what if BTC -30%? ETH -50%?                          ││
│ │ ▸ Rebalance trades — concrete buy/sell list to reach optimal          ││
│ │ ▸ DCA plan — N weekly buys to migrate to optimal allocation          ││
│ │ ▸ Historical comparison — your portfolio vs frontier over time       ││
│ └─────────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────────┘
```

## Component Inventory

| Component | Data Source | Key Display |
|-----------|-------------|-------------|
| `PortfolioInput` | User + CoinGecko | Editable table of holdings |
| `TimeRangeSelector` | — | 90D / 180D / 1Y / 2Y / ALL |
| `RiskFreeRateInput` | FRED 13-week T-bill default | Annualized % |
| `AssetStatsGrid` | Computed | Per-asset return/vol/drawdown/Sharpe |
| `CorrelationHeatmap` | Computed | NxN color-coded matrix |
| `EfficientFrontierChart` | Computed | Scatter with optimal markers |
| `AllocationCompare` | Computed | Current vs optimal side-by-side |
| `RebalancePlan` | Computed | Concrete buy/sell orders |
| `StressTestPanel` | User-defined shocks | Portfolio value under scenarios |
| `DCAPlanBuilder` | Computed | N-week migration path |

## Math (Server-Side)

### Inputs
- `P` = portfolio (symbol, quantity) — n assets
- `T` = time range (days back from today)
- `r_f` = risk-free rate (annualized)
- Method: log returns, annualized factor = 365

### Step 1 — Returns
For each asset `i`:
```
r_{i,t} = ln(P_{i,t} / P_{i,t-1})
```
Series: `R = [r_{i,1}, r_{i,2}, ..., r_{i,T}]` for each asset.

### Step 2 — Per-Asset Stats
```
μ_i    = mean(R_i) * 365                  # annualized expected return
σ_i    = std(R_i) * sqrt(365)             # annualized volatility
mdd_i  = max_drawdown(P_i)                # over the window
shp_i  = (μ_i - r_f) / σ_i                # Sharpe ratio
```

### Step 3 — Covariance + Correlation
```
Σ      = cov(R) * 365                    # annualized covariance matrix (NxN)
C      = corrcoef(R)                     # correlation matrix (NxN)
```

**Robust estimation:** use **Ledoit-Wolf shrinkage** on the covariance matrix. Crypto covariance estimates from raw daily returns are notoriously noisy; shrinkage stabilizes them and prevents extreme optimal weights.

### Step 4 — Portfolio Statistics
For weights `w = (w_1, ..., w_n)` with `sum(w) = 1`:
```
μ_p    = w' * μ                          # portfolio expected return
σ_p    = sqrt(w' * Σ * w)                # portfolio volatility
shp_p  = (μ_p - r_f) / σ_p                # portfolio Sharpe ratio
```

### Step 5 — Efficient Frontier (Monte Carlo + Solver)

**Two-track approach:**

1. **Monte Carlo cloud** — sample 10,000 random weight vectors (Dirichlet distribution), compute (σ_p, μ_p, shp_p) for each. Plot as scatter.
2. **Solver** — for each target return on a grid, solve the **QP**:
   ```
   min   w' Σ w
   s.t.  w' μ = μ_target
         sum(w) = 1
         w_i >= 0
   ```
   This produces the **true efficient frontier** curve, not just random points near it.

**Solver library:** `cvxpy` (Python) or `quadprog` / `clarabel` (Rust-backed JS). For server-side, recommend **cvxpy** in a small Python microservice — mature, fast, well-tested. Fall back to a TypeScript simplex implementation if the Python path is undesirable.

### Step 6 — Optimization Targets
Three named optima:
- **Max Sharpe** — `argmax_w shp_p(w)`
- **Min volatility** — `argmin_w σ_p(w) s.t. sum(w)=1`
- **Equal weight** — `w_i = 1/n` (baseline reference)

### Step 7 — User's Portfolio Position
Plot the user's current portfolio on the frontier. Compute:
- **Distance from frontier** — for the user's return level, what's the minimum achievable volatility? Difference = excess risk they're taking.
- **Distance from max Sharpe** — how much Sharpe they're leaving on the table.

### Step 8 — Rebalance Plan
Compute trades to migrate from current weights to optimal weights:
- For each asset: `delta_i = (w*_i - w_i) * total_value`
- Round to whole units (or fractional, with exchange-min caveats)
- Estimate slippage from 24h avg volume

## Stress Tests (Zone 6)

User defines shocks per asset (e.g. "BTC -30%, ETH -50%, alts -70%"). For each scenario:
```
P_new = sum(w_i * P_i * (1 + shock_i))
```
Display outcome table:
- Worst-case portfolio value
- % loss from current
- % of holdings underwater
- Recovery estimate (linear from history's avg rebound)

## DCA Migration Plan

If user can't rebalance in one trade, generate a DCA path:
- User inputs: target weeks (e.g. 8 weeks)
- Compute weekly buys/sells to reach optimal weights
- Each week: `w_week_k = w_current + (k/N) * (w_optimal - w_current)`
- Show weekly trade list with running allocation %

## Persistence (Postgres / Drizzle)

```typescript
mpt_portfolios
├── id              uuid PK
├── owner_id        uuid FK → users.id
├── name            text                // "My main bag", "Retirement"
├── description     text nullable
├── holdings        jsonb                // [{symbol, quantity, cost_basis}, ...]
├── time_range_days int
├── risk_free_rate  numeric
├── universe        text[]               // restrict optimization universe (optional)
├── visibility      enum('private','unlisted','public')
├── slug            text unique nullable
├── created_at      timestamptz
├── updated_at      timestamptz

mpt_optimization_runs
├── id              uuid PK
├── portfolio_id    uuid FK → mpt_portfolios.id
├── ran_at          timestamptz
├── inputs_hash     text                 // hash of inputs to dedupe
├── results         jsonb                 // {frontier[], max_sharpe, min_vol, allocations[]}
├── stats           jsonb                 // per-asset μ, σ, mdd, sharpe
├── correlations    jsonb                 // NxN matrix
└── expires_at      timestamptz            // cache invalidation

mpt_dca_plans
├── id              uuid PK
├── portfolio_id    uuid FK → mpt_portfolios.id
├── target_portfolio_id uuid FK → mpt_portfolios.id nullable
├── weeks           int
├── schedule        jsonb                 // [{week, trades[]}, ...]
├── created_at      timestamptz
```

## API Endpoints

```
GET    /api/mpt/assets/search?q=btc        — autocomplete asset universe
GET    /api/mpt/assets/:symbol/historical?days=N — price series
POST   /api/mpt/compute                    — body: portfolio + range → results
GET    /api/mpt/portfolios                 — user's saved portfolios
POST   /api/mpt/portfolios                 — create
PATCH  /api/mpt/portfolios/:id             — update
DELETE /api/mpt/portfolios/:id
GET    /api/mpt/portfolios/:slug           — public fetch (for share)
POST   /api/mpt/portfolios/:id/optimize    — kick off optimization (cached)
POST   /api/mpt/portfolios/:id/stress      — run stress test
POST   /api/mpt/portfolios/:id/dca-plan    — generate DCA migration
```

## Universe (Locked)

The optimization universe is fixed for MVP. Users choose weight *within* this universe, not *which* assets.

| Ticker | Asset | Source | Notes |
|--------|-------|--------|-------|
| BTC | Bitcoin | CoinGecko | Direct |
| IBIT | BlackRock iShares Bitcoin Trust | Yahoo Finance | Spot BTC ETF |
| FBTC | Fidelity Wise Origin Bitcoin Fund | Yahoo Finance | Spot BTC ETF |
| MSTR | MicroStrategy | Yahoo Finance | Leveraged BTC proxy (now ~2x BTC NAV) |
| COIN | Coinbase Global | Yahoo Finance | Exchange + custody exposure |
| MARA | Marathon Digital | Yahoo Finance | Bitcoin mining |
| RIOT | Riot Platforms | Yahoo Finance | Bitcoin mining |

**Rationale:** All highly BTC-correlated but with meaningful non-1.0 cross-correlations (miners have idiosyncratic risk, MSTR has leverage spread, ETFs have basis/burn rate). Real question real BTC holders ask: "should I hold BTC directly, an ETF, or MSTR?"

**History depth:** Coinbase (COIN) IPO'd Apr 2021, IBIT/FBTC launched Jan 2024, MSTR started buying BTC Aug 2020. Cycle-aware — oldest available history per asset is used; Ledoit-Wolf shrinkage handles gaps.

## Time Ranges (Locked)

Time ranges are **halving-to-halving cycles**, not arbitrary day counts. Default = most recent complete cycle. User can override.

| Cycle | Start | End | Days |
|-------|-------|-----|------|
| Cycle 1 (post-1st halving) | 2012-11-28 | 2016-07-09 | 1,350 |
| Cycle 2 (post-2nd halving) | 2016-07-09 | 2020-05-11 | 1,402 |
| Cycle 3 (post-3rd halving) | 2020-05-11 | 2024-04-20 | 1,440 |
| Cycle 4 (current, partial) | 2024-04-20 | today | live |

Pre-2020 history is only available for BTC (and MSTR from Aug 2020). For cycles where a stock/ETF doesn't have data, the asset is excluded with a clear UI note.

## Pages & Routing

| Route | Purpose |
|-------|---------|
| `/portfolio/mpt` | Main MPT tool |
| `/portfolio/mpt/:id` | Loaded saved portfolio |
| `/portfolio/mpt/gallery` | Public portfolios (optional, defer) |

## Pages vs Existing Portfolio

You already have `/portfolio` (current portfolio tracker). The MPT page is **distinct** — it's the *optimizer*, not the *tracker*. Link between them:

- From `/portfolio` → "Optimize this with MPT" button → opens MPT with holdings pre-loaded
- From `/portfolio/mpt` → "Save back to tracker" → updates tracker holdings

No conflicts. They serve different questions:
- Tracker: "what do I hold?"
- MPT: "what should I hold?"

## Technical Notes

### Architecture Decision: Python Microservice?

The optimization math is doable in TypeScript but cleaner in Python (`cvxpy`, `pandas`, `numpy`, `scipy`).

**Option A — Pure TypeScript**
- Pros: no new service, simpler deploy
- Cons: more code to write, fewer battle-tested libraries
- Recommendation: fine for MVP (random sampling + simple QP via `clarabel` or `quadprog` JS port)

**Option B — Python microservice**
- Pros: mature quant ecosystem (cvxpy, scipy, pandas)
- Cons: another deploy unit, language boundary
- Recommendation: pick this up if MPT grows to backtesting, factor models, Black-Litterman

**MVP recommendation: TypeScript**, using:
- `ml-matrix` for linear algebra
- `quadprog` (npm) for QP solver
- `simple-statistics` for descriptive stats
- 10k Monte Carlo samples + QP on grid → efficient frontier

### Numerical Stability
- **Log returns** (not simple) — additive over time, symmetric
- **Ledoit-Wolf shrinkage** on covariance — prevents singular matrices with correlated assets
- **Annualization factor = 365** (crypto trades 24/7)
- **Risk-free rate** default to current 13-week T-bill from FRED (you already have FRED integration)

### Caching
- Per-portfolio results cached for 1 hour (results change only when prices do)
- Invalidate on new `ran_at` if any input price moves >2%

### Edge Cases
- **Asset with insufficient history** (e.g. new token, <90 days): show warning, exclude from optimization or use shorter window for that asset
- **Singular correlation** (e.g. two pegged stablecoins): Ledoit-Wolf handles it
- **Negative weights** (shorting): disallowed by default; expose as advanced toggle
- **Survivorship bias**: filter delisted tokens; flag in UI when historical data is incomplete

## Phased Rollout

**Phase 1 — MVP (3 weeks)**
- Portfolio input (manual entry)
- Time range + risk-free rate
- Per-asset stats grid (return, vol, drawdown, Sharpe)
- Correlation heatmap
- Efficient frontier chart (Monte Carlo only, no QP yet)
- Max Sharpe + min vol optimization
- Current vs optimal side-by-side

**Phase 2 — Action Tools (1–2 weeks)**
- Rebalance trade list
- Stress test panel
- DCA migration plan

**Phase 3 — Polish (1 week)**
- Save/load portfolios (per user)
- Public sharing (light version)
- Export to CSV

**Phase 4 — Power Features (defer)**
- QP solver for true frontier curve (replace Monte Carlo cloud with the actual Pareto frontier)
- Ledoit-Wolf shrinkage (vs raw covariance)
- Black-Litterman with user views
- Backtest over historical window (run optimization at each point in history)

## Premium Gating Hook

Same model as Workbench:
| Feature | Free | Premium |
|---------|------|---------|
| Run optimization | 1 portfolio, 90D only | ✅ unlimited, all ranges |
| Save portfolios | 1 | ✅ unlimited |
| Stress tests | — | ✅ |
| DCA plan | — | ✅ |
| Public sharing | — | ✅ |
| Historical backtest | — | ✅ |

## Why This Wins

1. **Hard to find for crypto.** CoinGecko, Messari, TradingView — none of them do Markowitz optimization properly for crypto. Most "portfolio tools" in this space are just allocation pies.
2. **Uses data you already have.** CoinGecko + FRED are both integrated. The math is the only new piece.
3. **Conversions, not vanity.** The output is a concrete action: "sell X BTC, buy Y ETH." Users can act on it immediately — unlike most analytics dashboards.
4. **High-value anchor for a paid tier.** "Stress test your portfolio against historical shocks" is a no-brainer premium feature for someone with a meaningful bag.
5. **Composes with Workbench.** A user could build an MPT-optimized portfolio, then build a Workbench indicator around it (e.g., "alert me when my portfolio drifts >5% from optimal"). The two features strengthen each other.
6. **Trust signal.** Showing actual math (Sharpe, efficient frontier) puts BitcoinHub in the same conversation as Bloomberg Terminal and institutional tooling — separates it from the meme-coin Twitter vibe.