// BitcoinHub — /api/cycle/asset-overlay
// Overlays multiple assets (BTC + BTC-correlated equities/ETFs) on a single
// cycle section, anchored to BTC's event dates.
//
// Query params:
//   assets=BTC,IBIT,COIN,MSTR   (default: BTC,IBIT,COIN,MSTR)
//   cycle=c2|c3|c4              (default: c4)
//   from=halving|top|bottom|prevBottom (default: halving)
//   to=top|bottom|halving|nextTop       (default: top)
//
// Response:
//   {
//     cycle: 'c4',
//     section: { from, to, days },
//     assets: Array<{ symbol, label, points, changePct, ... }>,
//     skipped: Array<{ symbol, reason }>,
//     assetCatalog: [...],
//     today: ISO,
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
  fetchAssetDailyHistory,
  getAssetMeta,
  sliceSeries,
  ASSET_REGISTRY,
  okJson,
  errJson,
} from './btc-history.js';

const VALID_CYCLES: CycleId[] = ['c2', 'c3', 'c4'];
const VALID_KINDS_API = ['halving', 'top', 'bottom', 'ath', 'prevbottom', 'nexttop'] as const;
const API_TO_INTERNAL: Record<string, EventKind> = {
  halving: 'halving',
  top: 'top',
  bottom: 'bottom',
  ath: 'ath',
  prevbottom: 'prevBottom',
  nexttop: 'nextTop',
};

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.parse(fromISO + 'T00:00:00Z');
  const b = Date.parse(toISO + 'T00:00:00Z');
  return Math.max(0, Math.round((b - a) / 86400000));
}

// ── Section-date resolution (mirrors lib/cycle/overlay.ts) ────────────────
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
      if (e.date <= today) return { date: e.date, resolvedKind: fromKind, inProgress: false };
      return { date: today, resolvedKind: fromKind, inProgress: true };
    }
    return { date: todayISO(), resolvedKind: fromKind, inProgress: true };
  }
  if (fromKind === 'prevBottom') {
    const e = findPrevBottom(cycle);
    if (!e) return null;
    return { date: e.date, resolvedKind: 'prevBottom', inProgress: false };
  }
  return { date: todayISO(), resolvedKind: fromKind, inProgress: true };
}

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
    const e = findNextTop(cycle);
    if (!e) return null;
    return { date: e.date, resolvedKind: 'nextTop', inProgress: false };
  }
  const e = findEvent(toKind, cycle);
  if (e) {
    const today = todayISO();
    if (e.date <= today) return { date: e.date, resolvedKind: toKind, inProgress: false };
    return { date: today, resolvedKind: toKind, inProgress: true };
  }
  return { date: todayISO(), resolvedKind: toKind, inProgress: true };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const fromKindAPI = String(req.query.from ?? 'halving').toLowerCase();
    const toKindAPI   = String(req.query.to   ?? 'top').toLowerCase();
    const cycleRaw    = String(req.query.cycle ?? 'c4').toLowerCase() as CycleId;

    if (!VALID_CYCLES.includes(cycleRaw)) {
      return errJson(res, 400, `cycle must be one of: ${VALID_CYCLES.join(', ')}`);
    }
    if (!(VALID_KINDS_API as readonly string[]).includes(fromKindAPI)) {
      return errJson(res, 400, `from must be one of: ${VALID_KINDS_API.join(', ')} (case-insensitive)`);
    }
    if (!(VALID_KINDS_API as readonly string[]).includes(toKindAPI)) {
      return errJson(res, 400, `to must be one of: ${VALID_KINDS_API.join(', ')} (case-insensitive)`);
    }

    const fromKind = API_TO_INTERNAL[fromKindAPI];
    const toKind   = API_TO_INTERNAL[toKindAPI];

    // Parse asset list (default: BTC, IBIT, COIN, MSTR)
    const allSymbols = Object.keys(ASSET_REGISTRY);
    const rawAssets  = typeof req.query.assets === 'string' && req.query.assets.length > 0
      ? req.query.assets.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
      : ['BTC', 'IBIT', 'COIN', 'MSTR'];
    const validSymbols = rawAssets.filter(s => allSymbols.includes(s));
    if (validSymbols.length === 0) {
      return errJson(res, 400, `assets must be a non-empty comma-separated list from: ${allSymbols.join(', ')}`);
    }

    // Resolve BTC's section dates for the requested cycle
    const fromRes = resolveStartDate(cycleRaw, fromKind);
    const toRes   = resolveEndDate(cycleRaw, toKind);
    if (!fromRes || !toRes) {
      return errJson(res, 400, `${fromKind}→${toKind} not resolvable for cycle ${cycleRaw}`);
    }
    if (fromRes.date >= toRes.date) {
      return errJson(res, 400, 'from date must be before to date');
    }

    const cycleMeta = CYCLES.find(c => c.id === cycleRaw);
    const out: any[] = [];
    const skipped: Array<{ symbol: string; reason: string }> = [];

    // Fetch each asset's history in parallel, then slice+normalize per asset
    const results = await Promise.allSettled(
      validSymbols.map(async (symbol) => {
        const meta = getAssetMeta(symbol);
        if (!meta) throw new Error(`Unknown asset: ${symbol}`);
        const history = await fetchAssetDailyHistory(symbol);
        return { symbol, meta, history };
      })
    );

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const symbol = validSymbols[i];
      if (r.status === 'rejected') {
        skipped.push({ symbol, reason: (r.reason as Error)?.message ?? 'fetch failed' });
        continue;
      }
      const { meta, history } = r.value;
      const section = sliceSeries(history, fromRes.date, toRes.date);
      if (section.length < 2) {
        skipped.push({
          symbol,
          reason: `no price data between ${fromRes.date} and ${toRes.date} (${meta.symbol} data starts ${meta.firstAvailable})`,
        });
        continue;
      }
      const startPrice = section[0].price;
      if (startPrice <= 0 || !Number.isFinite(startPrice)) {
        skipped.push({ symbol, reason: 'invalid start price' });
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
        symbol: meta.symbol,
        label: meta.label,
        firstAvailable: meta.firstAvailable,
        fromDate: fromRes.date,
        toDate: toRes.date,
        days: daysBetween(fromRes.date, toRes.date),
        startPrice: +startPrice.toFixed(2),
        endPrice: +section[section.length - 1].price.toFixed(2),
        changePct: +(((section[section.length - 1].price - startPrice) / startPrice) * 100).toFixed(2),
        inProgress: toRes.inProgress,
        points,
      });
    }

    return okJson(res, {
      cycle: cycleRaw,
      cycleLabel: cycleMeta?.label ?? cycleRaw,
      section: {
        from: { kind: fromKind, cycle: cycleRaw, date: fromRes.date },
        to:   { kind: toRes.resolvedKind, cycle: cycleRaw, date: toRes.date },
        days: daysBetween(fromRes.date, toRes.date),
      },
      assets: out,
      skipped,
      assetCatalog: Object.values(ASSET_REGISTRY),
      eventCatalog: ALL_EVENTS,
      today: todayISO(),
      asOf: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[cycle/asset-overlay] error:', e);
    return errJson(res, 500, e?.message ?? 'Failed to build asset overlay');
  }
}