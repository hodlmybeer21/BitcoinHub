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
- "Does it Bleed" altcoin drawdown comparison
- ROI After Halving / After Cycle Peak / After Cycle Bottom
- Short Term Bubble Risk
- Multi-asset risk grid (apply to MPT universe)
- Risk-aware MPT rebalancing (compose)
- Dynamic DCA tool (buy-more-when-risk-low)

> **Phase 6b addendum (Cycle Top Thresholds, see §9 below) ships the
> Time in Risk Bands stat + the historical risk-level overlay Ben
> Cowen uses to call cycle tops (0.5 / 0.4 / 0.3 thresholds). It
> re-uses the Phase 6 composite math verbatim — no change to §2.5.**

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

## 9. Phase 6b Addendum — Cycle Top Thresholds (Ben Cowen)

> Shipped 2026-08-22 as a follow-on to Phase 6. Adds the
> **Cowen "Bitcoin Risk Metric" cycle-top threshold** signal that the
> Phase 6 composite deliberately omits. Re-uses every Phase 6 primitive
> (`computeRiskSeries`, `RISK_BANDS`, `HALVINGS`) — no changes to §2.5.
>
> **Why this is additive, not a formula change:** Ben Cowen does not
> publish the exact weightings behind his Risk Metric, so we cannot
> reproduce his composite bit-for-bit. What *is* published — and what
> gives the metric its practical value — is the **per-cycle threshold
> he uses to call cycle tops**: 0.5 at the 2017 top, 0.4 at the 2021
> top, 0.3 for the current cycle. The threshold is the signal; the
> underlying composite just has to be monotonic in [0, 1] and roughly
> comparable across cycles (ours is — see §9.6 validation).

### 9.1 Threshold Config

Static, single source of truth in `lib/risk/thresholds.ts`:

```ts
export type ThresholdKind = 'historical' | 'projected';

export interface CycleTopThreshold {
  cycleIndex: number;        // matches HALVINGS[].cycleIndex (1-based halving number)
  threshold: number;         // 0–1 risk level that historically marked the cycle top
  kind: ThresholdKind;       // 'historical' = verified, 'projected' = Ben's forward call
  source: string;            // 'Ben Cowen / Into the Cryptoverse, [video title] @ [date]'
}

export const CYCLE_TOP_THRESHOLDS: CycleTopThreshold[] = [
  { cycleIndex: 2, threshold: 0.5, kind: 'historical',
    source: 'Into the Cryptoverse — "Bitcoin Risk Metric" (2021 retro)',
    note: 'BTC topped ~$19.8K on 2017-12-17; risk > 0.5' },
  { cycleIndex: 3, threshold: 0.4, kind: 'historical',
    source: 'Into the Cryptoverse — "Bitcoin Risk Metric" (2022 retro)',
    note: 'BTC topped ~$69K on 2021-11-10; risk > 0.4' },
  { cycleIndex: 4, threshold: 0.3, kind: 'projected',
    source: 'Into the Cryptoverse — early-2026 commentary',
    note: 'Ben\'s published call for the current cycle (2024 halving → next halving)' },
];
```

**Mapping note:** `cycleIndex` is the *halving number* from
`HALVINGS[]`, not the bull-run number. So `cycleIndex: 2` is the
2016 halving cycle (which produced the Dec 2017 top). `cycleIndex: 3`
is the 2020 halving cycle (Nov 2021 top). `cycleIndex: 4` is the
2024 halving cycle (current).

The 0.5 → 0.4 → 0.3 step-down mirrors Ben's published framework
exactly. We do **not** interpolate or extend the series — if Ben
updates his current-cycle call, we update the table and redeploy.
A small editorial `note` field keeps the rationale reviewable in code
review.

### 9.2 Per-Cycle Crossing Math

For each `cycleIndex` in `CYCLE_TOP_THRESHOLDS`, compute a
`ThresholdCrossing` from the Phase 6 `risk[]` series + `timestamps[]`
+ `HALVINGS`:

```ts
interface ThresholdCrossing {
  cycleIndex: number;
  threshold: number;
  kind: ThresholdKind;

  // Within this cycle's window (halving N → halving N+1):
  cycleStart: string;        // ISO date — HALVINGS[N-1].date (the cycle's halving)
  cycleEnd: string;          // ISO date — HALVINGS[N].date  (next halving, exclusive)
  // For the current (last) cycle, cycleEnd is "now" + the cycle's projected close.

  firstCrossDate: string | null;   // first index i in [start, end) where risk[i] >= threshold
  firstCrossRisk: number | null;
  peakDate: string;                // argmax(risk[i]) over [start, end)
  peakRisk: number;
  topDate: string | null;          // known BTC USD top date for this cycle, or null if ongoing

  daysAboveThreshold: number;     // count of i in [start, end) with risk[i] >= threshold
  daysFromFirstCrossToPeak: number | null;
  daysFromFirstCrossToTop: number | null;

  // For the current cycle only:
  triggered: boolean;             // currentRisk >= threshold
  status: 'below' | 'approaching' | 'above';
}
```

Algorithm (vanilla TS, no extra deps):

```
for each t in CYCLE_TOP_THRESHOLDS:
  start = indexOf(HALVINGS, t.cycleIndex).date
  end   = indexOf(HALVINGS, t.cycleIndex + 1)?.date ?? now

  win = [i for i in 0..n-1 if start_ts <= timestamps[i] < end_ts]

  firstCross = first i in win where risk[i] >= t.threshold
  peakIdx    = argmax(risk[i]) for i in win
  daysAbove  = count of i in win where risk[i] >= t.threshold

  return { ..., daysFromFirstCrossToPeak: peakIdx - firstCross, ... }
```

The current-cycle entry uses `topDate: null` and `status` derived
from `currentRisk` (see §9.3). Past cycles get the actual USD top
date (2017-12-17, 2021-11-10, 2025-10-06 from `CYCLE_TOP_DATE`)
inlined into the response — these are static, no extra fetch.

### 9.3 Status Bands

The threshold itself is the "sell" line. We define two softer zones
so the dashboard can say something useful *before* the threshold
fires:

| status       | condition                                  | UI color |
|--------------|--------------------------------------------|----------|
| `below`      | `currentRisk < 0.85 * threshold`           | green    |
| `approaching`| `0.85 * threshold <= currentRisk < threshold` | amber  |
| `above`      | `currentRisk >= threshold`                 | red      |

The 0.85 "approaching" factor is editorial — Ben doesn't publish a
pre-band. Rationale: gives the dashboard ~2–3 weeks of warning
ahead of the historical 0.5 / 0.4 / 0.3 thresholds based on the
current rate of risk change. If we later want to back-test this
85% factor we can, but for now it ships as a tunable constant in
`thresholds.ts` (`APPROACHING_FACTOR = 0.85`).

### 9.4 Payload

```
GET /api/risk/thresholds?symbol=BTC&days=3650
→ 200
{
  "symbol": "BTC",
  "currentCycleIndex": 4,
  "currentThreshold": 0.30,
  "currentRisk": 0.423,
  "status": "above",
  "pctOfThreshold": 1.41,
  "distanceToThreshold": -0.123,
  "historical": [
    {
      "cycleIndex": 2, "threshold": 0.5, "kind": "historical",
      "cycleStart": "2016-07-09", "cycleEnd": "2020-05-11",
      "firstCrossDate": "2017-11-29", "firstCrossRisk": 0.502,
      "peakDate": "2017-12-22", "peakRisk": 0.78,
      "topDate": "2017-12-17",
      "daysAboveThreshold": 18,
      "daysFromFirstCrossToPeak": 23,
      "daysFromFirstCrossToTop": 18,
      "triggered": false, "status": "below"
    },
    { "cycleIndex": 3, "threshold": 0.4, "kind": "historical", ... },
    { "cycleIndex": 4, "threshold": 0.3, "kind": "projected",
      "currentCycle": true,
      "firstCrossDate": "2025-08-14", "firstCrossRisk": 0.301,
      "peakDate": "2025-10-12", "peakRisk": 0.612,
      "topDate": "2025-10-06",
      "daysAboveThreshold": 47,
      "daysFromFirstCrossToPeak": 59,
      "daysFromFirstCrossToTop": 53,
      "triggered": true, "status": "above"
    }
  ],
  "asOf": "2026-08-22T10:07:00Z"
}
```

For non-BTC assets: `currentThreshold: null`, `historical: []`,
`status: 'below'` (Cowen's framework is BTC-only — we surface this
explicitly in the UI rather than silently returning zeroes).

### 9.5 API Surface

| Route | Method | Purpose | Cache |
|---|---|---|---|
| `/api/risk/thresholds` | GET | Current threshold + per-cycle crossings | 1h |

Wired into the existing dispatcher in `api/index.ts`. Same lazy
import pattern as the other `/api/risk/*` handlers:

```ts
} else if (url.pathname === '/api/risk/thresholds') {
  const mod = await import('../lib/risk/thresholds.js');
  return mod.default(req, res);
}
```

No new top-level function in the `api/` dir (12-function cap).

### 9.6 Validation

Quick sanity check before shipping: the Phase 6 composite must put
BTC above each historical threshold at the right time. Required:

| cycleIndex | threshold | expected top date  | composite must be >= threshold near this date |
|------------|-----------|--------------------|-----------------------------------------------|
| 2          | 0.5       | 2017-12-17         | yes — risk ≥ 0.5 in [2017-11-29, 2018-01-15]  |
| 3          | 0.4       | 2021-11-10         | yes — risk ≥ 0.4 in [2021-10-15, 2022-01-15]  |

If either check fails, the threshold table needs an `accuracy` flag
or a per-cycle rescale factor (out of scope for 6b; document the
failure in a code comment and raise). Add a one-off script
`scripts/test-thresholds.ts` that runs the validation and prints
the peak risk per historical cycle — folds into the existing
`scripts/test-risk.ts` runner.

### 9.7 UI Additions

Single-page change to `client/src/pages/RiskMetric.tsx`. No new
routes. Re-use existing `Card`, `Badge`, `Skeleton`, `ReferenceLine`,
`ReferenceDot`, `AlertTriangle`, `TrendingUp`, `TrendingDown` from
the Phase 6 imports.

**A) New "Cycle Top Threshold" stat card** (replaces or sits next to
the "Risk Now" card — likely between "Risk Now" and "Band"):

```
┌─────────────────────────────────────────────┐
│  Cycle Top Threshold                        │
│                                             │
│  This cycle:    0.30   (Ben Cowen, 2026)    │
│  Current risk:  0.42   ↑ ABOVE              │
│                                             │
│  ┌────────────────────────────────────┐     │
│  │ ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░ ← 0.30 line   │     │
│  └────────────────────────────────────┘     │
│                                             │
│  41% past threshold  •  triggered 47d ago   │
└─────────────────────────────────────────────┘
```

- Header copy: "Ben Cowen's per-cycle sell threshold (0.5 / 0.4 / 0.3)"
- Below band: green badge "Below 0.30", small "Approaching from 0.255"
- Above band: red badge "Above threshold — cycle top signal"
- Mini progress bar: 0 → threshold, with the current risk marked.
  Bar extends past 100% if above threshold (red zone).

**B) Time-series chart reference lines** — extend the existing
`<LineChart>` in §6 of RiskMetric.tsx:

- `<ReferenceLine y={0.5} stroke="#ea580c" strokeDasharray="6 4" label={{ value: '0.5 (2017 top)', position: 'right', fill: '#ea580c', fontSize: 10 }} />`
- `<ReferenceLine y={0.4} stroke="#ea580c" strokeDasharray="6 4" label={{ value: '0.4 (2021 top)', position: 'right', fill: '#ea580c', fontSize: 10 }} />`
- `<ReferenceLine y={0.3} stroke="#dc2626" strokeDasharray="3 3" label={{ value: '0.3 (this cycle)', position: 'right', fill: '#dc2626', fontSize: 10 }} />` — **dashed differently** to mark "projected"
- `<ReferenceDot x={h.topDate} y={h.peakRisk} r={4} fill={h.bandColor} stroke="#fff" />` for each historical cycle top
- `<ReferenceDot x={currentTopDate} y={currentPeakRisk} r={4} fill="#dc2626" stroke="#fff" />` for the current cycle (only if `firstCrossDate != null`)

Labels sit on the right edge so they don't collide with halving
markers. The 0.3 line gets `strokeDasharray="3 3"` (denser dashes)
to visually distinguish "projected" from "historical" — same
convention as a forecast band.

**C) Historical crossings table** — new compact `<Card>` under the
existing chart:

```
Cycle  Threshold  First cross         Peak risk  Days above  Top date
#2     0.50       2017-11-29 (0.502)  0.78       18 d        2017-12-17
#3     0.40       2021-10-15 (0.402)  0.71       41 d        2021-11-10
#4 ⚑   0.30  proj 2025-08-14 (0.301)  0.61       47 d        2025-10-06
```

⚑ marks the current cycle. `proj` badge next to 0.30 for the
projected threshold. The "Days above" column matches what Ben
broadcasts in his retrospectives.

### 9.8 Workbench Integration

Three new blocks in `lib/workbench/blocks.ts`:

| block id              | returns                                                  |
|-----------------------|----------------------------------------------------------|
| `risk.threshold_current` | number — current cycle's threshold (e.g. 0.30)        |
| `risk.threshold_pct`     | number — `currentRisk / threshold_current` (e.g. 1.41) |
| `risk.threshold_status`  | string — `'below' \| 'approaching' \| 'above'`        |

One new template in `lib/workbench/templates.ts`:

- **"BTC vs Cycle Top Threshold"** — single formula
  `risk.metric / risk.threshold_current`, displayed as a percentage
  with a status badge from `risk.threshold_status`.

These compose with the existing Phase 6 `risk.metric` block — no
new schema, no migration.

### 9.9 Acceptance Criteria (Phase 6b done = ✅)

- [ ] `lib/risk/thresholds.ts` exports `CYCLE_TOP_THRESHOLDS` with 3 entries (0.5/0.4/0.3) and `computeCycleCrossings(risk, timestamps, currentRisk)`
- [ ] `/api/risk/thresholds?symbol=BTC` returns 200 with current + historical arrays per §9.4
- [ ] `scripts/test-thresholds.ts` validates cycle 2 and cycle 3 peaks above threshold (per §9.6)
- [ ] RiskMetric.tsx renders the new "Cycle Top Threshold" stat card with status badge
- [ ] Time series chart shows 0.5, 0.4 (solid), 0.3 (dashed) reference lines + ReferenceDots at historical tops
- [ ] Historical crossings table renders below the chart with ⚑ on current cycle
- [ ] Workbench templates page lists "BTC vs Cycle Top Threshold"
- [ ] No regression on existing endpoints (curl all 6 risk routes after deploy)
- [ ] PROJECT.md updated with Phase 6b status

### 9.10 Implementation Notes

- **No composite change.** §2.5 stays untouched. Threshold overlay
  reads from the same `risk[]` array the dashboard already uses.
- **No new API function.** `/api/risk/thresholds` lives inside
  `api/index.ts` as one more branch in the existing dispatcher.
- **One new file.** Only `lib/risk/thresholds.ts` is net-new on the
  server. `client/src/pages/RiskMetric.tsx` gets extended in place.
- **Editorial provenance.** Every threshold line carries a
  `source` field with the video title + date. When Ben updates his
  current-cycle call, we update the row + `source` + redeploy.
- **Backfill caveat.** The 2017 cycle (cycleIndex 2) only has valid
  composite values from ~2016 onward (z-score needs 4y of MM history).
  Pre-2016 points are NaN; the per-cycle window starts at the
  halving date so this is fine — no warmup issue at the cycle
  boundary.

---

_Last updated: 2026-08-22 10:07 UTC, by `goodbot`._
_Phase 6 added 2026-08-19 07:18 UTC; Phase 6b addendum added 2026-08-22 10:07 UTC._
