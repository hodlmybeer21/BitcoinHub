// BitcoinHub — /api/cycle/overlay
// Returns normalized price series for the selected "section" of each cycle
// so the frontend can overlay them on a single chart.
//
// Section = pair of event kinds (from, to) within a single cycle, e.g.:
//   "halving → top" of cycle 2 = Jul 9, 2016 → Dec 17, 2017
//   "halving → top" of cycle 3 = May 11, 2020 → Nov 10, 2021
//   "top → bottom" of cycle 2 = Dec 17, 2017 → Dec 15, 2018
//
// Each returned series is normalized to start at 1.000x (i.e. 0% return)
// and indexed by "days since section start" so cycles line up at day 0.
//
// Response shape:
//   {
//     section: { from: {kind, cycle, date}, to: {kind, cycle, date}, days: number },
//     series: Array<{
//       cycleId, fromDate, toDate, days,
//       points: Array<{ day, date, price, retPct }>
//     }>,
//     skipped: Array<{ cycleId, reason }>,
//     asOf: ISO
//   }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  ALL_EVENTS,
  CYCLES,
  findEvent,
  nextEvent,
  findPrevBottom,
  findNextTop,
  type CycleId,
  type EventKind,
} from './events.js';
import {
  fetchBTCDailyHistory,
  sliceSeries,
  okJson,
  errJson,
} from './btc-history.js';

const VALID_KINDS_API = ['halving', 'top', 'bottom', 'ath', 'prevbottom', 'nexttop'] as const;
const VALID_CYCLES: CycleId[] = ['c1', 'c2', 'c3', 'c4'];

// Map lowercase query-param form to canonical internal EventKind (camelCase).
// The internal resolvers use camelCase; the API surface is all-lowercase so
// the URL contract stays simple regardless of how many multi-word kinds
// we add later.
const API_TO_INTERNAL: Record<string, EventKind> = {
  halving: 'halving',
  top: 'top',
  bottom: 'bottom',
  ath: 'ath',
  prevbottom: 'prevBottom',
  nexttop: 'nextTop',
};

function parseList<T extends string>(raw: unknown, allowed: readonly T[]): T[] | null {
  if (raw === undefined || raw === null) return null;
  const arr = String(raw).split(',').map(s => s.trim()).filter(Boolean);
  const out: T[] = [];
  for (const s of arr) {
    if (!(allowed as readonly string[]).includes(s)) return null;
    out.push(s as T);
  }
  return out;
}

function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.parse(fromISO + 'T00:00:00Z');
  const b = Date.parse(toISO + 'T00:00:00Z');
  return Math.max(0, Math.round((b - a) / 86400000));
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// For "to=halving of next cycle" semantics, we don't accept "halving" as a
// generic to-kind; instead we derive the next-cycle halving from the cycle's
// own metadata. This is so "halving → next-halving" just means "full cycle".
//
// In-progress semantics for concrete events (top, bottom):
//   If the requested "to" event hasn't happened yet (cycle still in progress),
//   we fall back to today's date and set inProgress=true. This lets users
//   see e.g. cycle 4 top→today alongside cycles 2 & 3 top→bottom.
//   For "to=halving", the next halving is always treated as a forecast (even
//   if it's years away) since the user explicitly asked for that point.
function resolveEndDate(
  cycle: CycleId,
  toKind: EventKind,
): { date: string; resolvedKind: EventKind; inProgress: boolean } | null {
  if (toKind === 'halving') {
    const nxt = nextEvent(cycle);
    if (!nxt) return null;
    return { date: nxt.date, resolvedKind: 'halving', inProgress: false };
  }
  if (toKind === 'nextTop') {
    // Cross-cycle: cycle N+1's top.
    const e = findNextTop(cycle);
    if (!e) return null; // cycle 4 has no next cycle
    return { date: e.date, resolvedKind: 'nextTop', inProgress: false };
  }
  const e = findEvent(toKind, cycle);
  if (e) {
    const today = todayISO();
    if (e.date <= today) {
      return { date: e.date, resolvedKind: toKind, inProgress: false };
    }
    // Event exists in the dataset but is in the future (shouldn't happen
    // for top/bottom since we only record confirmed events, but be defensive)
    return { date: today, resolvedKind: toKind, inProgress: true };
  }
  // Event never happened for this cycle (e.g. cycle 4 bottom) → use today.
  return { date: todayISO(), resolvedKind: toKind, inProgress: true };
}

function resolveStartDate(
  cycle: CycleId,
  fromKind: EventKind,
): { date: string; resolvedKind: EventKind; inProgress: boolean } | null {
  if (fromKind === 'halving') {
    const e = findEvent('halving', cycle);
    return e ? { date: e.date, resolvedKind: 'halving', inProgress: false } : null;
  }
  if (fromKind === 'top' || fromKind === 'bottom') {
    const e = findEvent(fromKind, cycle);
    if (e) {
      const today = todayISO();
      if (e.date <= today) {
        return { date: e.date, resolvedKind: fromKind, inProgress: false };
      }
      return { date: today, resolvedKind: fromKind, inProgress: true };
    }
    return { date: todayISO(), resolvedKind: fromKind, inProgress: true };
  }
  if (fromKind === 'prevBottom') {
    // Cross-cycle: cycle N-1's bottom.
    const e = findPrevBottom(cycle);
    if (!e) return null; // cycle 1 has no previous
    return { date: e.date, resolvedKind: 'prevBottom', inProgress: false };
  }
  // ath: start of an "ATH break" run — fall back to today's date if missing
  return { date: todayISO(), resolvedKind: fromKind, inProgress: true };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const fromKindAPI = String(req.query.from ?? 'halving').toLowerCase();
    const toKindAPI = String(req.query.to ?? 'top').toLowerCase();
    const cycles = parseList<CycleId>(req.query.cycles, VALID_CYCLES) ?? ['c2', 'c3', 'c4'];

    if (!(VALID_KINDS_API as readonly string[]).includes(fromKindAPI)) {
      return errJson(res, 400, `from must be one of: ${VALID_KINDS_API.join(', ')} (case-insensitive)`);
    }
    if (!(VALID_KINDS_API as readonly string[]).includes(toKindAPI)) {
      return errJson(res, 400, `to must be one of: ${VALID_KINDS_API.join(', ')} (case-insensitive)`);
    }

    const fromKind = API_TO_INTERNAL[fromKindAPI];
    const toKind = API_TO_INTERNAL[toKindAPI];
    if (cycles.length === 0) {
      return errJson(res, 400, 'cycles must be a non-empty comma-separated list');
    }
    if (cycles.length > 4) {
      return errJson(res, 400, 'cycles must be at most 4 entries');
    }

    // Fetch the long BTC price history once
    let series: Awaited<ReturnType<typeof fetchBTCDailyHistory>>;
    try {
      series = await fetchBTCDailyHistory();
    } catch (e: any) {
      console.error('[cycle/overlay] history fetch failed:', e?.message);
      return errJson(res, 503, `BTC history fetch failed: ${e?.message ?? 'unknown'}`);
    }

    const out: any[] = [];
    const skipped: Array<{ cycleId: CycleId; reason: string }> = [];

    for (const cid of cycles) {
      const meta = CYCLES.find(c => c.id === cid);
      if (!meta) {
        skipped.push({ cycleId: cid, reason: 'unknown cycle' });
        continue;
      }

      const fromRes = resolveStartDate(cid, fromKind);
      const toRes = resolveEndDate(cid, toKind);
      if (!fromRes || !toRes) {
        skipped.push({ cycleId: cid, reason: `${fromKind}→${toKind} not available for ${meta.label}` });
        continue;
      }
      if (fromRes.date >= toRes.date) {
        skipped.push({ cycleId: cid, reason: 'from date is after to date' });
        continue;
      }

      const section = sliceSeries(series, fromRes.date, toRes.date);
      if (section.length < 2) {
        // Probably because the section starts before Yahoo's earliest date (2014-09-17)
        skipped.push({
          cycleId: cid,
          reason: `no price data between ${fromRes.date} and ${toRes.date} (BTC daily history starts 2014-09-17)`,
        });
        continue;
      }

      const startPrice = section[0].price;
      if (startPrice <= 0 || !Number.isFinite(startPrice)) {
        skipped.push({ cycleId: cid, reason: 'invalid start price' });
        continue;
      }

      const baseTime = Date.parse(section[0].date + 'T00:00:00Z');
      const points = section.map(p => {
        const t = Date.parse(p.date + 'T00:00:00Z');
        const retPct = ((p.price - startPrice) / startPrice) * 100;
        return {
          day: Math.round((t - baseTime) / 86400000),
          date: p.date,
          price: +p.price.toFixed(2),
          retPct: +retPct.toFixed(2),
        };
      });

      out.push({
        cycleId: cid,
        cycleLabel: meta.label,
        fromKind,
        fromDate: fromRes.date,
        toKind: toRes.resolvedKind,
        toDate: toRes.date,
        days: daysBetween(fromRes.date, toRes.date),
        startPrice: +startPrice.toFixed(2),
        endPrice: +section[section.length - 1].price.toFixed(2),
        changePct: +(((section[section.length - 1].price - startPrice) / startPrice) * 100).toFixed(2),
        inProgress: toRes.inProgress,
        points,
      });
    }

    // Resolve "from" / "to" event objects for header display
    const firstCycleId = cycles[0];
    const headerFrom = firstCycleId
      ? (fromKind === 'prevBottom'
          ? findPrevBottom(firstCycleId)
          : (findEvent(fromKind, firstCycleId) ?? (fromKind === 'halving' ? findEvent('halving', firstCycleId) : null)))
      : null;
    const headerTo = firstCycleId
      ? (toKind === 'halving'
          ? (() => {
              const nxt = nextEvent(firstCycleId);
              return nxt ? { kind: 'halving' as EventKind, cycle: firstCycleId, date: nxt.date } : null;
            })()
          : toKind === 'nextTop'
          ? findNextTop(firstCycleId)
          : findEvent(toKind, firstCycleId))
      : null;

    return okJson(res, {
      section: {
        from: headerFrom ? { kind: headerFrom.kind, cycle: headerFrom.cycle, date: headerFrom.date } : null,
        to: headerTo ? { kind: headerTo.kind, cycle: headerTo.cycle, date: headerTo.date } : null,
        days: headerFrom && headerTo ? daysBetween(headerFrom.date, headerTo.date) : null,
      },
      series: out,
      skipped,
      eventCatalog: ALL_EVENTS, // echo for the UI to render selectors
      today: todayISO(),
      asOf: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[cycle/overlay] unexpected error:', e);
    return errJson(res, 500, e?.message ?? 'Failed to build cycle overlay');
  }
}