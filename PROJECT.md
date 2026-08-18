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
(no-code indicator builder) **. The site is technically far ahead of
competitors like IntoTheCryptoverse; the gap is the ** business-model layer **
(paid tiers, no-code tooling, shareable indicators). This session closed that
gap by shipping MPT + Workbench on prod.

**Goals**: give retail crypto users a single hub that combines institutional-grade
data + the ability to compose + share their own indicators without writing
code, and eventually monetize via paid tiers built on top of those capabilities.

---

## 2. Current State (live on prod)

Verified working as of 2026-08-18 18:24 UTC. Anything older is suspect —
verify with a curl before relying on it.

### What's live right now

- **All legacy routes** (`/api/health`, `/api/bitcoin/market-data`,
  `/api/dca-simulator`, etc.) — pre-existing, working
- **MPT** — `/portfolio/mpt` (full Modern Portfolio Theory optimizer)
- **Workbench** — `/workbench` (no-code indicator builder)

### Recent commits (origin/main, newest first)

| Commit | What |
|---|---|
| `665b7c8` | **feat(persistence)**: anonymous UUID sync layer (foundation for paid tiers + public gallery). Backend: `anonymous_data` table with composite unique index, `lib/persistence/server.ts` (self-healing CREATE TABLE + lazy-imported Neon pool + upsert/get helpers), `api/index.ts` `handlePersistenceSync` handler (POST upsert / GET single key / GET all keys, 1MB per key cap), `lib/persistence/client.ts` later moved to `client/src/lib/persistence/client.ts`. Frontend: `useSyncedStorage<T>(dataKey, initialValue, localKey)` hook (local first-paint + debounced server sync + offline fallback) + `getUserId` UUID helper. Page integrations: Workbench.tsx (`workbench_indicators` + `workbench_canvas_positions`), PortfolioMPT.tsx (`mpt_portfolios` + `mpt_dca_plan`), DCASimulator.tsx (`mpt_dca_plan`). |
| `481683e` | **fix(persistence)**: dedupe Workbench STORAGE_KEY + move client.ts to client/src/. Two deploy bugs found: Workbench.tsx had duplicate const STORAGE_KEY / const CANVAS_POS_KEY + dead loadCanvasPositions / persistCanvasPositions helpers (esbuild rejected at parse → silently dropped the whole module). Also: `@/lib/persistence/client` import resolved to `client/src/...` but file was at project root (Vite looked for client/src/lib/persistence/client, didn't find it → build failed for any page importing useSyncedStorage). Moved file to `client/src/lib/persistence/client.ts` with consolidated React imports. |
| `7ef64f2` | **feat(workbench)**: templates gallery + portability MVP (Phase 3 slice 3). New `/workbench/templates` page lists all 8 built-in templates with category filter (Sentiment/Price/Funding/Macro/Other — derived client-side). Each card has 'Use this template' button that navigates to `/workbench?formula=<encoded>`. Workbench.tsx reads `?formula=` (pre-fills formula) and `?import=` (opens fork dialog with base64-decoded indicator) on mount, clearing the query string after consume. Each saved indicator gets Share button (copies base64-encoded `?import=` URL to clipboard) and Export button (downloads `<name>.workbench.json`). '+ Import' button in Saved card opens paste-JSON dialog. Import dialog has two modes: fork-from-shared-URL (preview + Fork & Save) and paste-JSON (textarea + Import). Fixed bottom-right toast for feedback. No new deps. |
| `c25c5b4` | **feat(workbench)**: drag-from-palette onto canvas (Phase 3 slice 2). BlockChip is HTML5-draggable with `application/bitcoinhub-block` mime; canvas wrapper has onDragOver/onDrop; on drop, `rfInstance.screenToFlowPosition` converts cursor coords to flow coords and pushes the position onto a dropQueue. `astToGraph` consumes one queue position per DataNode in DFS order so the dropped block appears exactly where the user dropped it. `useEffect` clears the queue after consumption so re-parses without new drops fall back to auto-layout + saved positions. |
| `2601ad1` | **feat(workbench)**: drag-drop canvas editor (Workbench Phase 3 slice). New 'Canvas' tab alongside Formula / Visual. Renders parsed AST as a @xyflow/react node graph — each AST node becomes a styled ReactFlow node (color-coded by block category + AST kind) with input/output handles showing how the formula composes. Custom BlockNode component handles 1-input (neg/not/series), 2-input (add/sub/mul/div/cmp/cross), 3-input (between), and N-input (and/or) shapes. Node positions persist to localStorage (`bitcoinhub_workbench_canvas_v1`) and survive reloads + formula edits. Formula string remains source of truth; canvas is the visualization. Future slices: drag-from-palette-onto-canvas, manual edge creation, graph→formula bidirectional editing. |
| `296408f` | **feat(mpt)**: migrate-to-DCA bridge (MPT Phase 2 B3). MPT results → modal captures monthly/duration/MinVol-vs-MaxSharpe → plan persisted to localStorage + location.state → DCA page hydrates, pre-fills BTC portion (monthly = total × BTC weight, startYear = plan.startYear), renders 'MPT Migration Plan' card above the existing 2-col grid with per-asset weight/monthly/period-total + source attribution + dismiss button. localStorage key: `bitcoinhub_dca_mpt_plan_v1`. |
| `cbaa902` | **feat(mpt)**: stress test panel (4 historical crashes: COVID, China ban, Luna/UST, FTX). Per-event portfolio drawdown + recovery. |
| `86ceaff` | **feat(mpt)**: portfolio persistence (localStorage save/load for named portfolios). Save button + Saved Portfolios card + save dialog modal. |
| `27f83db` | **feat(workbench)**: visual editing mode (Visual ⇆ Formula toggle, structured AST cards with color-coded chips). |
| `0714e6a` | **feat(workbench)**: 5 new source blocks (btc.dominance, etf.volume, stablecoin.total_supply, onchain.active_addresses, real Deribit put/call). 11 → 16 blocks. |
| `c388a98` | **fix(deploy)**: add `.js` extension to dynamic imports of `lib/*` handlers — THE FIX that made everything work. |
| `a86b76f` | **fix(deploy)**: lazy-import axios inside each handler (not at module top) to avoid Vercel cold-start crash. |
| `1e93736` | **fix(deploy)**: inline MPT + Workbench routes via `lib/` helpers (under Hobby 12-function limit). |
| `2228776` | **fix(deploy)**: self-contained serverless files (FAILED — hit Vercel 12-function limit). |
| `2960f81` | **feat(workbench)**: no-code indicator builder MVP (parser + 11 source blocks + 8 templates + localStorage). |
| `adfe59e` | **feat(portfolio)**: MPT optimizer MVP (7-asset universe, 4-year halving cycles, Ledoit-Wolf shrinkage, 10k Monte Carlo Dirichlet, max-Sharpe + min-vol, rebalance trades). |

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

1. **MPT Phase 2 B3 — DCA migration bridge** (closes the loop on flagship features)
   - Smaller scope: ~100-150 lines
   - High value: connects two existing features into one workflow
   - Can ship in 1-2 hours

2. **Workbench Phase 3 — drag-drop canvas** (visual upgrade)
   - Larger scope: 2-4 hours, requires `@dnd-kit` or `reactflow` install
   - High value: brings the "no-code" UX to parity with IntoTheCryptoverse
   - Multiple sub-tasks: drag-drop, sockets, undo/redo, save-as-template

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
│   │   └── Workbench.tsx           # Workbench page (~700 lines, visual mode baked in)
│   ├── components/                 # UI primitives (Card, Button, etc.)
│   └── lib/queryClient.ts          # Fixed apiRequest() bug (commit 14435b8)
├── lib/
│   ├── mpt/
│   │   ├── cycles.ts               # Universe + 4-year halving cycles
│   │   ├── compute.ts              # 22 KB, vanilla MPT math (covariance, MC, rebalance)
│   │   ├── quote.ts                # Last-price quote
│   │   └── stress.ts               # Stress test (4 historical crashes)
│   └── workbench/
│       ├── blocks.ts               # 16-block registry
│       ├── parse.ts                # Formula → AST parser
│       └── evaluate.ts             # AST evaluator + block fetchers
├── server/                         # Express-side legacy (DO NOT IMPORT FROM)
│   ├── api/                       # Used by api/entry.ts
│   ├── mpt/                       # Original Express MPT
│   └── workbench/                 # Original Express Workbench
├── scripts/
│   ├── test-mpt.ts                # Local MPT smoke test (21/21 green)
│   └── test-workbench.ts          # Local Workbench smoke test (21/21 green)
├── WORKBENCH_SPEC.md               # Workbench spec (Phase 1+2 scope)
├── MPT_SPEC.md                     # MPT spec (Phase 1+2 scope)
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

---

_Last updated: 2026-08-18 23:44 UTC, by `goodbot`._
_Update trigger: any shipping decision, scope change, or new architecture
invariant._