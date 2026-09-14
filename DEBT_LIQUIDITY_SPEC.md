# US Debt Liquidity Dashboard — Spec

**Target:** bitcoinhub.goodbotai.tech (Vercel deploy: bitcoinhub-site.vercel.app)
**Integration:** new section inside existing `/analytics` Trading Cockpit (`/analytics/cockpit` route → `client/src/components/TradingCockpit.tsx`)
**Stack:** React + Vite + Tailwind + shadcn/ui (unchanged). Reuses `lib/fred/` pipeline. Adds one new serverless endpoint `/api/treasury/auctions`.

## Purpose

Surface three signals that matter for the "marginal buyer of US debt" thesis (and by extension, the BTC narrative):

1. **Auction stress** — is the Treasury finding willing buyers at auction?
2. **Foreign demand** — are foreign central banks still rolling their holdings?
3. **Fed posture** — is the Fed itself a buyer or seller (SOMA)?

## Data sources (all free, no API keys for new feeds)

| Source | Series / endpoint | Refresh | Used for |
|---|---|---|---|
| Treasury Fiscal Data API | `/services/api/fiscal_service/v2/accounting/od/auctions` | weekly (post-auction) | bid-to-cover, indirect share, tail, offering amount |
| FRED `DGS10` | already wired | daily | 10Y yield |
| FRED `DGS30` | **new** | daily | 30Y yield, curve context |
| FRED `WTREGEN` | **new** | weekly (Thursday) | SOMA Treasury holdings (Fed demand) |
| FRED `TTEFI` | **new** | monthly (~6-wk lag) | Total foreign holdings (TIC proxy) |
| FRED `TB3MS` | **new** | daily | 3M T-bill yield (front-end demand proxy) |

## UI — `DebtLiquidityPanel.tsx`

Sits at the top of `TradingCockpit.tsx`, above the existing analytics grid. Layout: 4 cards in a 2×2 grid on desktop, single column on mobile.

### Card 1 — Latest Treasury Auction (Lead)
- Security term (10Y / 30Y)
- Bid-to-cover ratio (green > 2.4, yellow 2.2–2.4, red < 2.2)
- Indirect bidder share % (green > 70%, yellow 60–70%, red < 60%)
- Tail: high_yield − when_issued_yield (bps)
- Date stamp + days-ago

### Card 2 — Foreign Holdings (TIC)
- Total foreign holdings (TTEFI) latest + 1-month / 12-month delta
- Sparkline of 12-month trend
- Lag note: "as of YYYY-MM-DD (TIC lags ~6 weeks)"

### Card 3 — Fed SOMA Holdings
- WTREGEN latest + 4-week delta
- Color: green if delta is positive (Fed buying), red if shrinking (QT)
- Note: "Fed is buyer/seller" with explicit direction label

### Card 4 — Stress Score (composite)
Single number 0–100. Higher = more stress. Green / yellow / red.
- Components:
  - 40%: z-score of bid-to-cover ratio vs trailing 2-year baseline
  - 30%: z-score of indirect bidder share (negative = stress)
  - 20%: z-score of tail (positive = stress)
  - 10%: foreign holdings 3-month rolling change (negative = stress)
- Anomaly flag when any single component > 1.5σ from baseline

### Below the grid: yield curve context (one line)
- 3M / 10Y / 30Y spot yields
- 2s10s spread (already in FRED — `T10Y2Y`)
- "as of" timestamp

## Stress score formula

```
z(x) = (x − μ_2y) / σ_2y     where μ, σ are rolling 2-year stats per series
score = clip(0, 100,
   50
 + 0.40 × 10 × z(bid_to_cover)        // positive bid_to_cover = LESS stress → inverted
 + 0.30 × 10 × z(indirect_share) × -1 // positive indirect = LESS stress
 + 0.20 × 10 × z(tail)                // positive tail = MORE stress
 + 0.10 × 10 × z(foreign_3m_change) × -1
)
```

Compute server-side in `/api/treasury/auctions` endpoint. Cache the rolling baselines in memory (24h TTL).

## New code

- `lib/treasury/auctions.ts` — fetcher + stress score computation
- `lib/treasury/series.ts` — registry (parallels `lib/fred/series.ts`)
- `api/treasury/auctions.ts` — Vercel serverless handler (lazy-imported from `api/index.ts`)
- `client/src/components/analytics/DebtLiquidityPanel.tsx` — the UI panel
- Update `client/src/components/TradingCockpit.tsx` — render `<DebtLiquidityPanel />` at top
- Update `lib/fred/series.ts` — add DGS30, WTREGEN, TTEFI, TB3MS

## Caching & limits

- Auctions: fetch once per hour from Treasury API; auction results don't change after publication
- FRED series: already cached via existing FRED handler
- Rolling baselines: in-memory LRU, 24h TTL, recomputed on cache miss

## Deploy

- Commit on `feat/debt-liquidity-dashboard` branch
- Vercel auto-deploys on push to main; PR-preview URL available
- Verify: open `/analytics/cockpit` on preview, check all 4 cards render real numbers, confirm stress score color logic with known historical auction (e.g., Oct 2023 30Y tail event)
- Promote to main after Tyler signs off

## Out of scope (v1)

- TIC country-by-country breakdown (Japan, China, etc.) — v2
- Treasury refunding announcement scraper — v2
- Auction-by-auction history chart — v2 (only latest in v1)
- Bond ETF flow proxy (TLT/IEF/GOVT) — v2 (Yahoo Finance already wired)
- Notifications / alerts on anomaly flag — v2
