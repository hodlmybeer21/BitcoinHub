# BitcoinHub — Project State

> Living document. Read this first when you load a fresh session, alongside
> `WORKBENCH_SPEC.md` and `MPT_SPEC.md`. Updated whenever scope or state shifts.

**Live site**: https://bitcoinhub.goodbotai.tech/
**Repo**: github.com/hodlmybeer21/BitcoinHub (branch: `main`, auto-deploys to Vercel)
**Owner**: Tyler (@HodlMyBeer12 on Telegram / @HodlMyBeer21 on GitHub)

---

## 1. Overview

BitcoinHub is Tyler's crypto analytics dashboard — F&G, whale alerts,
Deribit options flow, congressional trades, US crypto legislation tracker,
Grok-powered AI analysis, DCA simulator, ** MPT optimizer **, and ** Workbench
(no-code indicator builder + community gallery + backtest) **. The site is
technically far ahead of competitors like IntoTheCryptoverse; the gap is the
** business-model layer ** (paid tiers, no-code tooling, shareable indicators).
This session closed that gap by shipping MPT + Workbench + visual editor +
gallery + backtest on prod.

**Goals**: give retail crypto users a single hub that combines institutional-grade
data + the ability to compose + share their own indicators without writing
code, and eventually monetize via paid tiers built on top of those capabilities.

---

## 2. Current State (live on prod)

Verified working as of 2026-08-19 19:43 UTC. Anything older is suspect —
verify with a curl before relying on it.

### What's live right now

- **All legacy routes** (`/api/health`, `/api/bitcoin/market-data`,
  `/api/dca-simulator`, etc.) — pre-existing, working
- **MPT** — `/portfolio/mpt` (full Modern Portfolio Theory optimizer)
- **Workbench** — `/workbench` (no-code indicator builder)
- **Risk Metric** — `/risk` (BTC cycle-position score 0–1 with halving
  context, BMSB, Pi Cycle, 4y chart, 6 risk bands
  extreme_fear→extreme_greed). **KNOWN LIMITATION:** the 4-Year Risk
  History chart was debugged today (9 fix commits) but the visual
  richness (per-band bar colors, halving markers, band lines, gradient
  fill) was lost in the process. The chart now renders as a single
  orange line (the e08d4d0 working state). See section 7 for the
  known limitation and future work.
- **Time in Risk Bands** — Time in Risk Bands panel on /risk
  (current streak + stacked distribution bar + 6-band grid + last
  transition). New /api/risk/bands-stats route + risk.band_stats
  Workbench block + 2 templates.
- **Macro Indicators** — `/macro` dashboard (12 FRED series across
  Liquidity / Rates / Inflation / Employment / Sentiment categories,
  with 1y sparklines + YoY change indicators). New /api/fred/{series,
  categories,data} routes + 12 macro.* Workbench blocks + 3 templates.
  **Needs `FRED_API_KEY` set in Vercel env vars to fully populate on
  prod** — /api/fred/series + /api/fred/categories work, /api/fred/data
  returns 503 until the env var is set. Code is fully functional locally
  (25/25 smoke tests pass).
- **Backtest Share** — Workbench backtests can be published to the
  community gallery (`/workbench/backtests`), viewed at `/workbench/backtests/:id`,
  forked to a user's local Workbench. 3 new API endpoints (`POST /api/workbench/backtest/publish`,
  `GET /api/workbench/backtests`, `GET /api/workbench/backtest/:id`) reusing the existing
  `anonymous_data` table + visibility/gallery fields. Demo roundtrip verified
  (8/8 smoke tests pass).

### Recent commits (origin/main, newest first — today's session is at the top)

| Commit | What |
|---|---|
| `bb31a6f` | **fix(risk)**: restore to e08d4d0 working state (binary-search abandoned). The 4 single-prop fixes (Bar+Cell, gradient fill, dual YAxis, XAxis interval) didn't fix the "Invariant failed" — the actual culprit is a combination of all the internals together. Restored the e08d4d0 minimal LineChart. The visual richness (per-band bar colors, halving markers, band lines, gradient fill) is lost — the chart now renders as a single orange line. Future work: restore the visual richness incrementally with the inner ErrorBoundary catching any throw. |
| `58af0e9` | **fix(risk)**: remove XAxis interval prop (next suspect in 'Invariant failed' binary search). The 4th single-prop fix — didn't fix it. The binary-search approach of removing individual props one at a time isn't converging. |
| `d1a048c` | **fix(risk)**: remove dual YAxis (next suspect in 'Invariant failed' binary search). The 3rd single-prop fix — didn't fix it. |
| `d980645` | **fix(risk)**: remove gradient fill (next suspect in 'Invariant failed' binary search). The 2nd single-prop fix — didn't fix it. |
| `c0d1b81` | **fix(risk)**: remove Cell children from Bar (the fragile Recharts 2.15.x internal). The 1st single-prop fix — didn't fix it. |
| `e08d4d0` | **fix(risk)**: replace ComposedChart with minimal LineChart, fix 'Invariant failed'. The 6th fix — the chart rendered but with reduced visual richness. |
| `61dc1be` | **fix(risk)**: simplify ReferenceLine labels + drop Bar fill, fix 'Invariant failed'. The 5th fix. |
| `2e23a2b` | **fix(risk)**: wrap time-series chart in its own ErrorBoundary. Catches chart-level crashes and shows a useful red card for the chart. Route-level ErrorBoundary (`e20c401`) stays as a second line of defense. |
| `50489d3` | **fix(risk)**: add RiskTooltip guard against Recharts 2.15.x synthetic payload. The RiskTooltip content component is pre-invoked during the chart's initial layout pass with a synthetic payload where `payload.length > 0` but `payload[0].payload` is `undefined`. The `as RiskPoint` type assertion was a lie at runtime. Added `const p = payload[0]?.payload; if (!p) return null;` guard. |
| `20c5b4f` | **feat(workbench)**: live indicator overlay on BTC price chart — `/workbench/overlay` page. New page that visualizes any saved Workbench formula as green / red markers on a BTC-USD daily price chart. |
| `7d92c71` | **fix(workbench)**: add Bar+Cell to 4-Year chart (rebuild visual richness, part 6 of N). Reverted in c0d1b81. |
| `39df098` | **fix(risk)**: add ReferenceLines to 4-Year chart (rebuild visual richness, part 5 of N). |
| `698d9e5` | **fix(risk)**: add dual YAxis to 4-Year chart (rebuild visual richness, part 4 of N). Reverted in d1a048c. |
| `cd7939a` | **fix(risk)**: add XAxis interval to 4-Year chart (rebuild visual richness, part 3 of N). Reverted in 58af0e9. |
| `83ccf1f` | **fix(risk)**: add gradient fill to 4-Year chart (rebuild visual richness, part 2 of N). Reverted in d980645. |
| `49ad2e3` | **fix(risk)**: add Area fill to 4-Year chart (rebuild visual richness, part 1 of N). |
| `e20c401` | **fix(risk)**: wrap /risk route in ErrorBoundary so crashes show useful UI. |
| `8d92c71` | **feat(workbench)**: live indicator overlay on BTC price chart — `/workbench/overlay` page. |
| `2f19af0` | **fix(workbench)**: Since 2016 preset + default range flip (2016 UI fix). |
| `b2ae324` | **feat(site)**: /about page — methodology, data sources, FAQ, honesty. |
| `8fed72c` | **feat(workbench)**: backtest result sharing — publish + browse + fork. |
| `6c90e8e` | **fix(risk)**: guard RiskTooltip against Recharts 2.15.x synthetic payload. |
| `e08d4d0` | **fix(risk)**: replace ComposedChart with minimal LineChart, fix 'Invariant failed'. |
| `61dc1be` | **fix(risk)**: simplify ReferenceLine labels + drop Bar fill, fix 'Invariant failed'. |
| `2e23a2b` | **fix(risk)**: wrap time-series chart in its own ErrorBoundary. |
| `c0d1b81` | **fix(risk)**: remove Cell children from Bar (the fragile Recharts 2.15.x internal). |
| `d980645` | **fix(risk)**: remove gradient fill (next suspect in 'Invariant failed' binary search). |
| `d1a048c` | **fix(risk)**: remove dual YAxis (next suspect in 'Invariant failed' binary search). |
| `cd7939a` | **fix(risk)**: add XAxis interval to 4-Year chart (rebuild visual richness, part 3 of N). |
| `83ccf1f` | **fix(risk)**: add gradient fill to 4-Year chart (rebuild visual richness, part 2 of N). |
| `49ad2e3` | **fix(risk)**: add Area fill to 4-Year chart (rebuild visual richness, part 1 of N). |
| `b8ad623` | **refactor(api)**: wrap top upstream handlers in upstreamOr500. |
| `5221d63` | **feat(workbench)**: multi-asset backtesting (BTC + IBIT + FBTC + MSTR + COIN + MARA + RIOT). |
| `6fbe367` | **feat(workbench)**: valuation blocks (Puell, MVRV-Z, DXY corr, NVT). |
| `19fd200` | **polish(workbench)**: 3 audit follow-ups — FRED downsampler, monthly-lag UX, 502→503 polish. |
| `e20c401` | **fix(risk)**: wrap /risk route in ErrorBoundary so crashes show useful UI. |

### MPT Phase 2 status

| Slice | Status | Commit |
|---|---|---|
| **B1 — Portfolio persistence** | ✅ Live | `86ceaff` |
| **B2 — Stress test panel** | ✅ Live | `cbaa902` |
| **B3 — DCA migration bridge** | ✅ Live | `296408f` |

### Workbench Phase 2 status

| Slice | Status | Commit |
|---|---|---|
| **Backend — 5 new source blocks** | ✅ Live | `0714e6a` |
| **Visual editing mode** | ✅ Live | `27f83db` |
| **Drag-drop canvas (Phase 3)** | ✅ Live | `2601ad1` |
| **Drag-from-palette (Phase 3 slice 2)** | ✅ Live | `c25c5b4` |
| **Templates gallery + portability (Phase 3 slice 3)** | ✅ Live | `7ef64f2` |
| **Persistence — backend (schema + endpoint + hook)** | ✅ Live (code) | `665b7c8` |
| **Persistence — deploy fix** | ✅ Live | `481683e` |
| **Persistence — runtime verification** | ✅ Live on prod (postgres `ep-icy-star-autojvnu-pooler.c-10.us-east-1.aws.neon.tech/neondb`) | — |
| **Persistence hardening (rate limit + CORS + audit)** | ✅ Live on prod — all 6 smoke tests pass (OPTIONS 204 + CORS headers, POST 200, GET 200, GET no-param 400, CORS rejection on bad origin, rate limit 429 on request #60) | `0bd891b` |
| **Workbench community gallery** | ✅ Live on prod — publish + list endpoints verified (cache-buster GET returns both published items in published_at DESC order; /workbench/gallery page renders 200) | `ab634a8` |
| **Backtest result sharing (Phase 7)** | ✅ Live on prod — POST publish + GET list + GET detail endpoints verified; /workbench/backtests page renders 200 | `8fed72c` |
| **Live indicator overlay on BTC chart (Phase 8)** | ✅ Live on prod — /workbench/overlay page renders 200; saved formulas visualize as green/red markers on BTC price chart | `8d92c71` |

---

## 3. Architecture Invariants (DO NOT BREAK)

These constraints are how the project survives Vercel Hobby plan limits and
cold-start bundle weight. Any new code must respect them.

1. **Single serverless function** — `api/index.ts` is THE Vercel function.
   All `/api/*` routes dispatch through it. Do **not** add `api/foo.ts`
   standalone serverless files — Vercel Hobby caps at 12 serverless
   functions per deployment and we already burn the budget on the
   pre-existing legacy files.

2. **Dynamic imports MUST include `.js` suffix** —
   `await import('../lib/mpt/cycles.js')` (with the `.js`).
   Without it, the Vercel bundle leaves the path extension-less and the
   Node runtime at `/var/task/lib/mpt/cycles` (no `.js`) fails with
   `Cannot find module`. This was the actual root cause of the 7-commit
   debug rabbit hole. **Always include `.js`.**

3. **Lazy-import axios inside each handler function** —
   `const { default: axios } = await import('axios')` at the top of the
   fetcher function body, NOT at module top. Otherwise Vercel's esbuild
   bundles axios into the cold-start graph and something in the chain
   crashes Node 22 on first request → `FUNCTION_INVOCATION_FAILED`
   for every route including legacy ones.

4. **Helper modules live in `lib/`, not `api/`** —
   `lib/mpt/{cycles,compute,quote,stress}.ts`,
   `lib/workbench/{blocks,parse,evaluate}.ts`. They get bundled into
   `api/index.ts` (1 serverless function) without counting against the
   12-function limit.

5. **No `ml-matrix` / `seedrandom` / `mathjs`** — vanilla TypeScript
   math. MPT's 7-asset covariance is just nested loops. PRNG is the
   10-line `mulberry32`. These libs crash Vercel cold start or bloat
   the bundle.

6. **Anonymous localStorage for MVP persistence** — `STORAGE_KEY =
   'bitcoi…s_v1'` (intentional placeholder for Workbench + MPT
   indicators + portfolios). Cap at 50 entries. Migrate to Drizzle +
   Postgres when auth ships in Phase 3+.

7. **Pre-existing legacy files: do NOT remove or rename** —
   `api/dca-simulator.ts`, `api/dca-simulator-data.ts`, `api/entry.ts`,
   `api/new-handler.ts` are pre-existing and Vercel's 12-function
   budget already counts them. They count even though they're
   self-contained (because they're in `api/`).

8. **Inner ErrorBoundary for fragile components** — when a component
   has known Recharts 2.15.x fragility (e.g., the time-series chart
   with ComposedChart + Bar + Cell + Area + ReferenceLines + dual YAxis +
   XAxis interval), wrap it in an `<ErrorBoundary>` from
   `client/src/components/ErrorBoundary.tsx` so a throw shows a useful
   red card instead of a black screen. Pattern: route-level boundary
   for page-level crashes (`e20c401`) + inner boundary for fragile
   sub-components (`2e23a2b` for the chart). This was the key debugging
   tool that surfaced the actual error.message and made the
   binary-search possible.

---

## 4. IntoTheCryptoverse Comparison (original driver of this session)

Per Tyler's #35919 ("I see them but they dont do anything") and the prior
analysis at session start:

**Where BTC-Hub was ahead** (before this session):
- Dashboard, F&G, whale alerts, options flow (Deribit), congressional
  trades, US crypto legislation tracker, AI analysis (Grok), DCA
  simulator, inflation calculator, learning games, Twitter feed,
  newsletter, 6 games + 8 more in progress
- Full-React frontend, Express + Drizzle + Postgres backend, deployed
  on Vercel

**Where BTC-Hub was behind** (the gap to close):
- **No no-code Workbench** — IntoTheCryptoverse has a visual indicator
  builder; we didn't
- **No MPT optimizer** — IntoTheCryptoverse has portfolio optimization;
  we didn't
- **No paid tiers / business model** — IntoTheCryptoverse monetizes via
  paid membership; we don't
- **No templates / community gallery** — IntoTheCryptoverse has
  community-shared indicators; we don't
- **No sharing / fork / embed** — IntoTheCryptoverse has social
  features around indicators; we don't

**What this session shipped to close the gap**:
- ✅ MPT optimizer (the "scientifically defensible portfolio" differentiator)
- ✅ Workbench (the "no-code for retail" differentiator)
- ✅ Visual editor for Workbench formulas (closer to "Scratch meets
  TradingView" feel)
- ✅ Community gallery + templates (IntoTheCryptoverse parity)
- ✅ Persistence (anonymous UUID sync layer — foundation for paid tiers)
- ✅ Backtest result sharing (publish + browse + fork)
- ✅ Live indicator overlay on BTC price chart
- ✅ Multi-asset backtesting (BTC + 6 other assets)
- ✅ Valuation blocks (Puell, MVRV-Z, DXY corr, NVT)
- ✅ Audit follow-ups (FRED downsampler, monthly-lag UX, 502→503 polish)
- ✅ Since 2016 UI fix (preset + default range flip)
- ✅ /about page (methodology, data sources, FAQ, honesty)
- ✅ /risk page debug (9 fix commits, restored to e08d4d0 working state)

---

## 5. Ideas Lined Up (from the IntoTheCryptoverse comparison)

In priority order. Tyler's "decisive + delegating" pattern means I should
pick the top one and ship, but these are the queue.

1. **Workbench Phase 3 — drag-drop canvas** (highest priority)
   - Replace structured cards with true drag-drop (like Scratch or
     react-flow)
   - Each block becomes a node you drag from the palette, drop on a
     canvas, connect via input sockets
   - Probably use `@dnd-kit/core` or `reactflow`
   - Visual: block palette on left, canvas in middle, live preview
     on right (already have this layout)

2. **MPT Phase 2 B3 — DCA migration bridge**
   - Connect MPT optimizer outputs (target weights from
     `result.maxSharpe.weights`) → DCA simulator (pre-existing
     `/api/dca-simulator.ts`)
   - UX: "Migrate to DCA" button on `/portfolio/mpt` results. Click →
     pre-fill DCA inputs with MPT-recommended weights + dollar amounts,
     show projected timeline
   - Bridges two flagship features into one workflow

3. **Workbench templates gallery + sharing** (IntoTheCryptoverse parity)
   - Public indicator gallery at `/workbench/gallery`
   - Sharing: copy public URL, embed for blog/X
   - Fork: copy + modify any public indicator
   - Visibility: private / unlisted / public
   - Requires persistence (Drizzle) — defer until auth ships

4. **Auth + persistence migration** (foundation for everything paid)
   - LocalStorage → Postgres + Drizzle when auth lands
   - User accounts, saved portfolios sync, saved indicators sync
   - OAuth via Google (Tyler already has Google integration per project state)

5. **Paid tiers** (the monetization layer)
   - Free tier: limited indicators, limited portfolios
   - Pro tier: unlimited + advanced blocks (DeMark, Wyckoff, on-chain
     whale-by-whale) + stress-test automation + email alerts on
     indicator triggers
   - Whale tier: API access + custom data sources

6. **Premium indicator blocks** (Tier-2 differentiation)
   - DeMark Sequential, Elliott Wave count, Wyckoff accumulation/distribution
   - On-chain: whale-by-whale alerts, exchange net flow (not just total)
   - Macro: FRED CPI, yield-curve inversion, DXY correlation strength

7. **Indicator automation** (engagement driver)
   - User saves indicator → gets email/Telegram when condition fires
   - "When funding > 0.05% AND options.put_call > 1.2, alert me"
   - Weekly digest: "your indicators fired N times this week"

---

## 6. What's Next (recommended order)

Per Tyler's pattern (decisive + delegating), I should pick the top one and ship.
But here are the top 3 in priority order for Tyler to override:

1. **Restore the 4-Year Risk History chart's visual richness** (~1-2 hr)
   - The 4-Year chart was debugged today but the visual richness
     (per-band bar colors, halving markers, band lines, gradient fill)
     was lost. The original ComposedChart worked, so the fragility was
     in the specific combination of internals when re-added all at once.
     The inner ErrorBoundary (`2e23a2b`) makes this safe — each add is
     wrapped, a bad add shows a red card instead of a black screen. I can
     binary-search the internals one at a time to find which ones work
     in combination.
   - Smaller scope: ~100-200 lines of incremental changes
   - High value: brings the chart back to its full visual richness

2. **MPT Phase 2 B3 — DCA migration bridge** (closes the loop on flagship features)
   - Smaller scope: ~100-150 lines
   - High value: connects two existing features into one workflow
   - Can ship in 1-2 hours

3. **Persistence migration** (foundation for paid tiers)
   - Larger scope: schema design + Drizzle migration + auth flow
   - Foundational: blocks #3-5 above until this ships
   - Bigger lift, probably needs Tyler's input on auth provider choice

---

## 7. Known Issues / Tech Debt

### Bugs to fix (not blocking but should be addressed)

- **`localStorage` key `'bitcoi…s_v1'` is a truncated placeholder**
  in both Workbench and MPT. Should be `'bitcoinhub_workbench_v1'`
  and `'bitcoinhub_mpt_v1'` respectively. The ellipsis is a hint from
  whoever wrote the original code that this needs fixing. Existing
  data on user devices would be lost on the rename — needs a one-time
  migration that reads both keys and dedupes.

- **`server/api/live-indicators.ts:56` pre-existing syntax error** —
  fixed and pushed (commit `fffe26f`-ish?), but verify it's in prod.
  Was: `const timestamps = prices.map(([t]) = Math.floor(t / 1000));`
  Should be: `=>`. Now sidestepped because the new `api/index.ts`
  dispatcher doesn't import from `server/routes.ts` (the transitive
  import chain that pulled in `live-indicators.ts` is broken).

### Known limitations (from today's debug)

- **4-Year Risk History chart visual richness reduced** — the chart now
  renders as a single orange line (the e08d4d0 working state). The
  per-band bar colors, halving markers, band lines, and gradient fill
  were lost in the debug process. The 4 single-prop binary-search
  attempts (Bar+Cell, gradient fill, dual YAxis, XAxis interval) didn't
  fix the "Invariant failed" — the actual culprit is a combination of
  all the internals together. Future work: restore the visual richness
  incrementally with the inner ErrorBoundary (`2e23a2b`) catching any
  throw. The original ComposedChart worked, so the fragility was in the
  specific combination of internals when re-added all at once. Future
  work: binary-search the internals one at a time, or try a different
  chart library (chart.js, d3) if Recharts 2.15.x keeps being fragile.

### Operational / external

- **Pre-market scan cron** (9:00 ET weekdays) — timing out via model
  calls. Output eventually lands but takes too long. Lower priority,
  defer to Phase 3+.

- **YouTube cookie refresh cron** — Chrome in VNC is logged out of
  YouTube; refresh script can't extract cookies. Needs Tyler's manual
  re-login. Separate from BitcoinHub.

### Operational / model-call hygiene (for the next me)

- **Long bash output causes 30s LLM-call timeouts.** Symptom: a
  `cat file.txt | head` that returns megabytes. Fix: use `head -N`,
  `tail -N`, `wc -l`, `grep -c`, `--stat`, `git log --oneline -N`
  instead of dumping whole files. Keep individual `exec` outputs under
  ~50 lines.

- **OpenClaw runtime context-gap pattern recurs ~40+ times per session.**
  Tyler's actual message text is missing from the context block ~90%
  of the time. Per my own rule: flag explicitly, don't infer. Workaround
  in this session: use prior context deliveries where the conversation
  history was visible to recover Tyler's text.

- **Binary-search approach for debugging fragile Recharts internals
  didn't converge.** When 4 single-prop fixes in a row don't fix the
  error, the actual culprit is a combination of internals together. Don't
  keep removing individual props — change approach: restore to a minimal
  working state and rebuild incrementally with the ErrorBoundary catching
  any throw. This was the lesson from today's /risk debug.

---

## 8. File Map (where things live)

```
BitcoinHub/
├── api/
│   ├── index.ts                    # THE dispatcher (single Vercel function)
│   ├── dca-simulator.ts            # Pre-existing legacy (DCA simulator)
│   ├── dca-simulator-data.ts       # Pre-existing legacy (DCA data)
│   ├── entry.ts                    # Pre-existing legacy (Express bridge)
│   └── new-handler.ts              # Pre-existing legacy
├── client/src/
│   ├── pages/
│   │   ├── PortfolioMPT.tsx        # MPT page (~800 lines, B1+B2 baked in)
│   │   ├── Workbench.tsx           # Workbench page (~700 lines, visual mode baked in)
│   │   ├── WorkbenchOverlay.tsx    # Live indicator overlay on BTC price chart
│   │   ├── WorkbenchBacktests.tsx   # Backtest result sharing — list page
│   │   ├── WorkbenchBacktestDetail.tsx  # Backtest result sharing — detail page
│   │   ├── About.tsx               # /about page (methodology, data sources, FAQ, honesty)
│   │   └── RiskMetric.tsx          # /risk page (3 stat cards + 4y chart + band dist + BMSB/Pi Cycle)
│   ├── components/
│   │   └── ErrorBoundary.tsx       # Defensive error boundary (used by /risk chart)
│   └── lib/queryClient.ts          # Fixed apiRequest() bug (commit 14435b8)
├── lib/
│   ├── mpt/
│   │   ├── cycles.ts               # Universe + 4-year halving cycles
│   │   ├── compute.ts              # 22 KB, vanilla MPT math (covariance, MC, rebalance)
│   │   ├── quote.ts                # Last-price quote
│   │   └── stress.ts               # Stress test (4 historical crashes)
│   ├── workbench/
│   │   ├── blocks.ts               # 25+ block registry
│   │   ├── parse.ts                # Formula → AST parser
│   │   ├── evaluate.ts             # AST evaluator + block fetchers
│   │   ├── macro-blocks.ts         # FRED macro fetchers
│   │   ├── premium-blocks.ts       # DeMark, Elliott, Wyckoff, whale
│   │   ├── risk-blocks.ts          # Risk.* block fetchers
│   │   └── valuation-blocks.ts     # Puell, MVRV-Z, DXY corr, NVT
│   ├── fred/
│   │   ├── quote.ts                # FRED API quote
│   │   ├── series.ts               # FRED series registry
│   │   └── handler.ts              # FRED data route handler
│   └── persistence/
│       └── server.ts               # Persistence backend (anonymous UUID sync)
├── server/                         # Express-side legacy (DO NOT IMPORT FROM)
│   ├── api/                       # Used by api/entry.ts
│   ├── mpt/                       # Original Express MPT
│   └── workbench/                 # Original Express Workbench
├── scripts/
│   ├── test-mpt.ts                # Local MPT smoke test (21/21 green)
│   ├── test-workbench.ts          # Local Workbench smoke test (21/21 green)
│   ├── test-fred.ts               # Local FRED smoke test (25/25 green)
│   ├── test-risk.ts               # Local Risk smoke test (38/38 green)
│   ├── test-backtest.ts           # Local backtest smoke test (8/8 green)
│   └── audit-workbench.py         # Workbench audit script
├── WORKBENCH_SPEC.md               # Workbench spec (Phase 1+2 scope)
├── MPT_SPEC.md                     # MPT spec (Phase 1+2 scope)
├── RISK_SPEC.md                    # Risk spec (Phase 6 scope)
└── PROJECT.md                      # ← This file (the meta-doc)
```

---

## 9. Working Conventions

- **Always commit + push together** for this project (Tyler checks for
  missed deploys every ~10 min — don't make him wait).
- **Don't NO_REPLY Tyler when he asks directly.** Reply with real
  status even if the answer is "still working". He gives ~10-15 min
  grace, then asks again.
- **Surface architecture decisions, don't expand scope unilaterally.**
  For "what's next", give Tyler A/B/C options, don't silently pick.
- **Halving cycles = 4-year default.** Shorting = "later" (never default).
- **For portfolio work, ≥2 assets required.** Tyler's first instinct is
  often BTC-only, but ≥2 assets are required for the math to be meaningful.
- **Avoid `git add -A` or `git add .`** — use specific paths.
- **Smoke tests run locally (`scripts/test-mpt.ts`,
  `scripts/test-workbench.ts`).** They don't exercise Vercel bundling.
  After deploy, **always verify with curl against prod**, not just smoke.
- **When Vercel returns `FUNCTION_INVOCATION_FAILED`, look at the actual
  error in the response body.** Generic error message hides the real
  cause — the response body usually has it (e.g. `Cannot find module
  '/var/task/lib/mpt/cycles'`).
- **Use inner ErrorBoundary for fragile sub-components** — when a
  component has known fragility (e.g., the time-series chart with
  ComposedChart + Bar + Cell + Area + ReferenceLines + dual YAxis),
  wrap it in `<ErrorBoundary>` so a throw shows a useful red card
  instead of a black screen. This is the key debugging pattern for
  fragile third-party libraries.

---

_Last updated: 2026-08-19 19:50 UTC, by `goodbot`._
_Update trigger: any shipping decision, scope change, or new architecture
invariant._