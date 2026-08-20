// BitcoinHub — Cycle Events Dataset
// Static, curated set of BTC halving dates, cycle tops, and cycle bottoms.
// Used by /api/cycle/markers (annotated chart) and /api/cycle/overlay
// (section comparison).
//
// Sources (verified 2026-08-20):
//   - Halvings: well-known protocol events (block heights 210000, 420000,
//     630000, 840000).
//   - Cycle tops / bottoms: well-documented cycle highs/lows (CoinGecko,
//     TradingView, multi-analyst consensus).
//   - ATH events: derived from the daily price series at request time, not
//     hardcoded here (so they stay accurate as new ATHs print).

export type CycleId = 'c1' | 'c2' | 'c3' | 'c4';
export type EventKind = 'halving' | 'top' | 'bottom' | 'ath' | 'prevBottom' | 'nextTop';

export interface CycleEvent {
  kind: EventKind;
  cycle: CycleId;
  date: string;        // YYYY-MM-DD
  price?: number;      // USD (when known)
  label?: string;      // short label for UI
  note?: string;       // longer note for UI
  projected?: boolean; // true = forecast / not yet confirmed
}

// ── Halvings (protocol-level, never change) ────────────────────────────────
const HALVINGS: CycleEvent[] = [
  { kind: 'halving', cycle: 'c1', date: '2012-11-28', price: 12.35,  label: 'Cycle 1 halving', note: 'First halving. BTC ≈ $12. Block reward 25 → 12.5 BTC.' },
  { kind: 'halving', cycle: 'c2', date: '2016-07-09', price: 657.61, label: 'Cycle 2 halving', note: 'Second halving. BTC ≈ $658. Block reward 12.5 → 6.25 BTC.' },
  { kind: 'halving', cycle: 'c3', date: '2020-05-11', price: 8601.97, label: 'Cycle 3 halving', note: 'Third halving. BTC ≈ $8,602. Block reward 6.25 → 3.125 BTC.' },
  { kind: 'halving', cycle: 'c4', date: '2024-04-20', price: 63817.30, label: 'Cycle 4 halving', note: 'Fourth halving. BTC ≈ $63,817. Block reward 3.125 → 1.5625 BTC.' },
];

// ── Cycle Tops (confirmed ATHs between halvings) ───────────────────────────
const TOPS: CycleEvent[] = [
  { kind: 'top', cycle: 'c1', date: '2013-12-04', price: 1147.25, label: 'Cycle 1 top',  note: 'First BTC bubble peak. ~$1,150.' },
  { kind: 'top', cycle: 'c2', date: '2017-12-17', price: 19783.06, label: 'Cycle 2 top',  note: '~$19,800. ICO bubble peak.' },
  { kind: 'top', cycle: 'c3', date: '2021-11-10', price: 69044.77, label: 'Cycle 3 top', note: '~$69,000. First ETF futures approved.' },
  { kind: 'top', cycle: 'c4', date: '2025-10-06', price: 126080.00, label: 'Cycle 4 top', note: '~$126,080. Spot ETF era peak.' },
];

// ── Cycle Bottoms (post-peak troughs before the next halving) ─────────────
const BOTTOMS: CycleEvent[] = [
  { kind: 'bottom', cycle: 'c1', date: '2015-01-14', price: 152.40,   label: 'Cycle 1 bottom', note: '~$152. Capitulation low after MT. Gox collapse.' },
  { kind: 'bottom', cycle: 'c2', date: '2018-12-15', price: 3194.93,  label: 'Cycle 2 bottom', note: '~$3,200. -84% from peak.' },
  { kind: 'bottom', cycle: 'c3', date: '2022-11-21', price: 15787.28, label: 'Cycle 3 bottom', note: '~$15,800. FTX collapse low. -77% from peak.' },
  // Cycle 4 bottom is in the future (projected Q4 2026).
];

// ── Public event table (concat for one-pass lookup) ────────────────────────
export const ALL_EVENTS: CycleEvent[] = [
  ...HALVINGS,
  ...TOPS,
  ...BOTTOMS,
];

export const HALVINGS_ONLY: CycleEvent[] = HALVINGS;
export const TOPS_ONLY: CycleEvent[] = TOPS;
export const BOTTOMS_ONLY: CycleEvent[] = BOTTOMS;

// ── Cycles metadata (overlap with lib/mpt/cycles.ts but kept self-contained
// so this file can be lazy-imported without touching MPT's axios import chain)
export interface CycleMeta {
  id: CycleId;
  label: string;
  halvingDate: string;        // first halving of this cycle
  nextHalvingDate: string;    // next cycle's halving = end of this one
  topDate: string | null;     // null if cycle hasn't topped yet
  bottomDate: string | null;  // null if cycle hasn't bottomed yet
  projectedBottomDate?: string;
}

export const CYCLES: CycleMeta[] = [
  {
    id: 'c1',
    label: 'Cycle 1 (2012 halving)',
    halvingDate: '2012-11-28',
    nextHalvingDate: '2016-07-09',
    topDate: '2013-12-04',
    bottomDate: '2015-01-14',
  },
  {
    id: 'c2',
    label: 'Cycle 2 (2016 halving)',
    halvingDate: '2016-07-09',
    nextHalvingDate: '2020-05-11',
    topDate: '2017-12-17',
    bottomDate: '2018-12-15',
  },
  {
    id: 'c3',
    label: 'Cycle 3 (2020 halving)',
    halvingDate: '2020-05-11',
    nextHalvingDate: '2024-04-20',
    topDate: '2021-11-10',
    bottomDate: '2022-11-21',
  },
  {
    id: 'c4',
    label: 'Cycle 4 (2024 halving)',
    halvingDate: '2024-04-20',
    nextHalvingDate: '2028-04-01', // estimated, ~4y after halving
    topDate: '2025-10-06',
    bottomDate: null,                 // not yet
    projectedBottomDate: '2026-08-31',
  },
];

// ── Event lookup helpers ──────────────────────────────────────────────────

export function findEvent(kind: EventKind, cycle: CycleId): CycleEvent | null {
  return ALL_EVENTS.find(e => e.kind === kind && e.cycle === cycle) ?? null;
}

export function nextEvent(cycle: CycleId): { kind: 'halving'; date: string } | null {
  const order: CycleId[] = ['c1', 'c2', 'c3', 'c4'];
  const idx = order.indexOf(cycle);
  if (idx === -1 || idx === order.length - 1) return null;
  const nextCycle = order[idx + 1];
  const halving = HALVINGS.find(h => h.cycle === nextCycle);
  return halving ? { kind: 'halving', date: halving.date } : null;
}

// Cycle N-1's bottom (the "previous cycle bottom" used for cross-cycle sections
// like "red → orange" = prev cycle bottom → this cycle top).
export function findPrevBottom(cycle: CycleId): CycleEvent | null {
  const order: CycleId[] = ['c1', 'c2', 'c3', 'c4'];
  const idx = order.indexOf(cycle);
  if (idx <= 0) return null; // no previous cycle
  const prevCycle = order[idx - 1];
  return BOTTOMS.find(b => b.cycle === prevCycle) ?? null;
}

// Cycle N+1's top (the "next cycle top" — symmetric counterpart).
export function findNextTop(cycle: CycleId): CycleEvent | null {
  const order: CycleId[] = ['c1', 'c2', 'c3', 'c4'];
  const idx = order.indexOf(cycle);
  if (idx === -1 || idx === order.length - 1) return null; // no next cycle
  const nextCycle = order[idx + 1];
  return TOPS.find(t => t.cycle === nextCycle) ?? null;
}

// ── "ATH events" are derived from the price series, but we expose a helper
// for tests + for the /api/cycle/markers handler to annotate which daily
// closes broke the prior cycle's top.
export function isATHBreak(price: number, priorTop: number): boolean {
  return Number.isFinite(price) && priorTop > 0 && price > priorTop;
}