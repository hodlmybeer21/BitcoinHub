# BitcoinHub — Risk Metric Spec (Phase 6)

> Design doc for the Risk Indicator ecosystem. Read alongside
> `PROJECT.md`, `WORKBENCH_SPEC.md`, `MPT_SPEC.md`. Updated as scope ships.

**Goal**: ship a Cowen-style Risk Indicator dashboard + Workbench-template
building blocks that compose with MPT, DCA, and the no-code Workbench.
This is the headline IntoTheCryptoverse moat — the per-asset cycle-position
score with historical bands and visual color-coding.

---

## 1. Scope (Phase 6, MVP)

**In scope** (this phase):
- **Risk Metric composite** (0–1 normalized cycle-position score)
- **Halving cycle position** helper
- **Historical risk time series** (per-asset, daily, 4y default span)
- **Bull Market Support Band (BMSB)** — 20w SMA + 21w EMA, Ben's signature
- **Pi Cycle Top** — 350d MA × 2 vs 111d MA, Ben's other signature
- **Workbench templates** for each (instant no-code demo content)
- **Risk dashboard page** at `/risk`
- **Risk band color scale** (6 bands from extreme fear → extreme greed)

**Deferred** to Phase 7+:
- Historical Risk Levels chart with price color-coded (visual overlay)
- Time in Risk Bands stat
- "Does it Bleed" altcoin drawdown comparison
- ROI After Halving / After Cycle Peak / After Cycle Bottom
- Short Term Bubble Risk
- Multi-asset risk grid (apply to MPT universe)
- Risk-aware MPT rebalancing (compose)
- Dynamic DCA tool (buy-more-when-risk-low)

---

## 2. Math (pure TypeScript, no external math libs)

### 2.1 Mayer Multiple Z-Score (dominant signal, 55% weight)

```
MM_t       = price_t / SMA(price, 200, daily)        // Mayer Multiple today
MM_history = MM series over last N years (default 4y)
μ_MM       = mean(MM_history)
σ_MM       = stdev(MM_history)
z_MM       = (MM_t − μ_MM) / σ_MM
risk_z     = clamp((z_MM + 3) / 6, 0, 1)             // z ∈ [-3,+3] → [0,1]
```

Rationale: when MM is many stddevs above its own historical mean, the
market is in extreme territory; below is accumulation. Cowen's published
Risk Metric uses a similar approach (he cites Mayer + realized price
+ cycle position).

### 2.2 RSI(14), normalized (20% weight)

Standard Wilder's RSI on daily closes. RSI ∈ [0, 100]; normalize to [0, 1].

### 2.3 Cycle Position (15% weight, BTC-only)

```
days_since_halving = now − last_halving_date
cycle_pos          = clamp(days_since_halving / 1460, 0, 1)
```

Halving dates: 2012-11-28, 2016-07-09, 2020-05-11, 2024-04-20.
1460 = 4 years (next halving 2028-04-XX).

For non-BTC assets: cycle_pos = 0.5 (no cycle signal).

### 2.4 Distance from 200-week MA (10% weight, BTC-only)

```
d200w = (price − MA(price, 200, weekly)) / MA(price, 200, weekly)
d_norm = clamp((d200w + 1) / 2, 0, 1)               // [-100%, +100%] → [0,1]
```

For non-BTC assets without 4y+ history: d_norm = 0.5.

### 2.5 Composite

```
risk = 0.55 * risk_z + 0.20 * (RSI / 100) + 0.15 * cycle_pos + 0.10 * d_norm
```

Output: `risk ∈ [0, 1]`, monotonic. Same formula works for any asset
(cycle_pos + d_norm fall back to neutral for non-BTC).

### 2.6 Risk Bands

| Band | Range | Color | Label |
|---|---|---|---|
| 1 | 0.00–0.15 | #16a34a (deep green) | Extreme Fear |
| 2 | 0.15–0.35 | #65a30d (green)      | Fear |
| 3 | 0.35–0.50 | #ca8a04 (yellow-green)| Cautious |
| 4 | 0.50–0.65 | #eab308 (yellow)     | Neutral |
| 5 | 0.65–0.80 | #ea580c (orange)     | Greed |
| 6 | 0.80–1.00 | #dc2626 (red)        | Extreme Greed |

### 2.7 Confidence

ITC-Vesre's "risk confidence" is based on history depth + the
analyst's confidence in the metric. Our analogue:

```
years_of_history = (last_close − first_close) / 365.25
confidence =
    years_of_history >= 8  → 'high'
    years_of_history >= 4  → 'medium'
    years_of_history >= 2  → 'low'
    else                   → 'very_low'
```

Per-asset, surfaced alongside the risk value.

### 2.8 Bull Market Support Band (BMSB)

```
BMSB_lower = SMA(close, 20, weekly)
BMSB_upper = EMA(close, 21, weekly)
```

Source: Ben Cowen's published methodology. BTC-only (needs ≥2y weekly history).

### 2.9 Pi Cycle Top Indicator

```
PC_long  = MA(close, 350, daily) × 2     // 350d MA doubled
PC_short = MA(close, 111, daily)         // 111d MA
```

Top signal fires when `PC_short` crosses UP through `PC_long`.
Visualized as the ratio `PC_short / PC_long` — historically tops when
this ratio reaches ~1.0 from below (the two lines converge then cross).

---

## 3. Data Sources (all free, no keys)

- **BTC daily closes (10y)**: `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=3650&interval=daily`
- **ETH, SOL, etc.**: same endpoint, swap `coins/bitcoin` → `coins/ethereum`, etc.
- Cached on Vercel edge: `Cache-Control: s-maxage=3600, stale-while-revalidate=7200`
  (we re-compute from cached prices; only the price fetch is the network hit)

Free data means no Glassnode/CryptoQuant paywall for the core metric.

---

## 4. Architecture (must respect PROJECT.md invariants)

1. **Single serverless function** — new code lives in `api/index.ts` dispatcher
   + `lib/risk/` helpers. **No new `api/risk.ts` standalone files** (12-function cap).
2. **Dynamic imports MUST include `.js` suffix** —
   `await import('../lib/risk/composite.js')`.
3. **Lazy-import axios inside each fetcher function** (not at module top).
4. **Helper modules live in `lib/risk/`** — `cycles.ts`, `mayer.ts`,
   `composite.ts`, `indicators.ts`, `quote.ts`, `templates.ts`.
5. **No `ml-matrix` / `seedrandom` / `mathjs`** — vanilla TS math.
   SMA/EMA/stddev are tiny nested loops. Mulberry32-style PRNG not needed here.

---

## 5. API Surface

| Route | Method | Purpose | Cache |
|---|---|---|---|
| `/api/risk/cycles` | GET | Current halving cycle state + days-to-next | 1h |
| `/api/risk/indicator` | GET | Current risk metric + band + confidence for one asset | 1h |
| `/api/risk/timeseries` | GET | Historical daily risk time series (chart data) | 1h |
| `/api/risk/indicators` | GET | BMSB + Pi Cycle + cycle position values | 1h |
| `/api/risk/templates` | GET | Workbench-template IDs that compose risk blocks | 1h |

All return JSON. All gated to BTC for Phase 6 MVP (ETH + others gated to
Phase 7 once confidence is proven). CoinGecko `bitcoin` ID is hardcoded.

---

## 6. UI (RiskMetric.tsx dashboard)

Single-page React dashboard at `/risk`. Layout:

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER: BTC Risk Indicator    as-of 2026-08-19 07:00 UTC       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  RISK NOW    │  │  BAND        │  │  CONFIDENCE  │           │
│  │   0.42       │  │  Cautious    │  │   High       │           │
│  │   [�▓▓░░]    │  │  ● Yellow    │  │  10y history │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  4-YEAR RISK TIME SERIES (line chart, color-banded)      │   │
│  │  Halving markers (vertical lines) + cycle position strip │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │  BMSB (20w SMA+21w   │  │  PI CYCLE TOP        │             │
│  │  EMA)  $65,200 /     │  │  ratio 0.78          │             │
│  │  $64,850             │  │  distance to cross   │             │
│  │  price above band ✓  │  │  ~12% above long     │             │
│  └──────────────────────┘  └──────────────────────┘             │
├─────────────────────────────────────────────────────────────────┤
│  Workbench templates that use risk blocks:                      │
│  [Risk Metric] [BMSB] [Pi Cycle] [Cycle Position]  [+ fork]     │
└─────────────────────────────────────────────────────────────────┘
```

Recharts for the time series. Card components reused from existing
`components/ui/card.tsx`. Dark theme consistent with rest of site.

---

## 7. Workbench Templates (Phase 6 bonus)

New blocks in `lib/workbench/blocks.ts`:
- `risk.metric` → fetches current BTC risk (0–1)
- `risk.bmsb_lower` → 20w SMA value
- `risk.bmsb_upper` → 21w EMA value
- `risk.pi_long` → 350d × 2 MA value
- `risk.pi_short` → 111d MA value
- `risk.cycle_pos` → cycle position (0–1)

New formulas in `lib/workbench/templates.ts`:
- **Risk Now** — `risk.metric`
- **Bull Market Support Band** — `min(risk.bmsb_lower, risk.bmsb_upper)` (lower band)
- **Pi Cycle Cross Watch** — `risk.pi_short / risk.pi_long` (ratio that fires the top signal)
- **Cycle Position %** — `risk.cycle_pos * 100`

These compose with existing price blocks for full no-code demo content.

---

## 8. Acceptance Criteria (Phase 6 done = ✅)

- [ ] `/api/risk/cycles` returns 200 with halving list + current cycle state
- [ ] `/api/risk/indicator?symbol=BTC` returns `{risk, band, bandLabel, confidence, asOf}`
- [ ] `/api/risk/timeseries?symbol=BTC&span=4year` returns `{points: [{date, risk, band}, ...]}`
- [ ] `/api/risk/indicators?symbol=BTC` returns `{bmsbLower, bmsbUpper, piLong, piShort, piRatio, cyclePosDays, cyclePosPct}`
- [ ] `/risk` page renders dashboard with 3 stat cards + time series + BMSB/PiCycle panels + Workbench template links
- [ ] Workbench templates page (`/workbench/templates`) shows the 4 new risk templates
- [ ] Smoke test (`scripts/test-risk.ts`) passes
- [ ] Vercel deploy succeeds, prod curl verifies all 5 endpoints
- [ ] PROJECT.md updated with Phase 6 status

---

_Last updated: 2026-08-19 07:18 UTC, by `goodbot`._
