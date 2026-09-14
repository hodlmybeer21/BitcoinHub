// BitcoinHub Treasury — auctions.ts
// Fetches US Treasury auction results from the Treasury Fiscal Data API
// and computes a simple "stress score" vs a trailing 2-year rolling baseline.
//
// Source: https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query
// No API key required. Reasonable use — cache 6h.
//
// Returns: per-security latest auction + a 2-year history of bid_to_cover
// and indirect_share for that term, plus a computed stress score (0–100).

import type { VercelRequest, VercelResponse } from '@vercel/node';

const AUCTIONS_URL =
  'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query';

// 30Y + 10Y only for v1 (the headline long-end).
const TERMS = ['30-Year', '10-Year'] as const;
type Term = (typeof TERMS)[number];

export interface AuctionRow {
  record_date: string;
  auction_date: string;
  security_term: Term | string;
  bid_to_cover_ratio: number | null;
  offering_amt: number | null;
  accepted_amt: number | null;
  high_yield: number | null;
  when_issued_yield: number | null;
  indirect_bidder_accepted: number | null;
  primary_dealer_accepted: number | null;
  direct_bidder_accepted: number | null;
  total_accepted: number | null;
}

export interface AuctionTermLatest {
  term: Term;
  latest: AuctionRow;
  history: AuctionRow[];           // last 2y
  baseline: { mean: number; stdev: number };  // bid_to_cover
  baselineIndirect: { mean: number; stdev: number };
  stressScore: number;             // 0–100, higher = more stress
  flags: string[];
}

export interface AuctionsSnapshot {
  fetchedAt: string;
  terms: AuctionTermLatest[];
  // Combined stress score across both terms (50/50 weighted).
  combinedStressScore: number;
  notes: string;
}

const CACHE_MS = 6 * 60 * 60 * 1000; // 6h — auctions are point-in-time
let cache: { ts: number; data: AuctionsSnapshot } | null = null;

async function fetchJson(url: string, timeoutMs = 12000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'BitcoinHub/1.0 (treasury-auctions)' },
    });
    if (!res.ok) throw new Error(`treasury -> HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function asNum(v: any): number | null {
  if (v === null || v === undefined || v === '' || v === 'null') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseRows(raw: any[]): AuctionRow[] {
  return raw
    .map(r => ({
      record_date: r.record_date,
      auction_date: r.auction_date ?? r.record_date,
      security_term: r.security_term,
      bid_to_cover_ratio: asNum(r.bid_to_cover_ratio),
      offering_amt: asNum(r.offering_amt),
      accepted_amt: asNum(r.accepted_amt ?? r.total_accepted),
      high_yield: asNum(r.high_yield),
      when_issued_yield: asNum(r.when_issued_yield),
      indirect_bidder_accepted: asNum(r.indirect_bidder_accepted),
      primary_dealer_accepted: asNum(r.primary_dealer_accepted),
      direct_bidder_accepted: asNum(r.direct_bidder_accepted),
      total_accepted: asNum(r.total_accepted),
    }))
    .filter(r => TERMS.includes(r.security_term as Term))
    .sort((a, b) => b.record_date.localeCompare(a.record_date));
}

function indirectShare(r: AuctionRow): number | null {
  if (!r.indirect_bidder_accepted || !r.total_accepted) return null;
  return r.indirect_bidder_accepted / r.total_accepted;
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const sq = values.reduce((s, v) => s + (v - mean) ** 2, 0);
  return Math.sqrt(sq / (values.length - 1));
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function computeStress(
  latest: AuctionRow,
  baseline: { mean: number; stdev: number },
  baselineIndirect: { mean: number; stdev: number },
): { score: number; flags: string[] } {
  const flags: string[] = [];
  let zSum = 0;
  let weightSum = 0;

  // bid-to-cover: LOWER = MORE stress. weight 0.5
  if (latest.bid_to_cover_ratio !== null && baseline.stdev > 0) {
    const z = (baseline.mean - latest.bid_to_cover_ratio) / baseline.stdev;
    zSum += z * 0.5;
    weightSum += 0.5;
    if (latest.bid_to_cover_ratio < 2.2) flags.push('bid-to-cover < 2.2 (very soft demand)');
    else if (latest.bid_to_cover_ratio < 2.4) flags.push('bid-to-cover < 2.4');
  } else if (latest.bid_to_cover_ratio !== null) {
    if (latest.bid_to_cover_ratio < 2.2) flags.push('bid-to-cover < 2.2');
  }

  // indirect share: LOWER = MORE stress. weight 0.4
  const indShare = indirectShare(latest);
  if (indShare !== null && baselineIndirect.stdev > 0) {
    const z = (baselineIndirect.mean - indShare) / baselineIndirect.stdev;
    zSum += z * 0.4;
    weightSum += 0.4;
    if (indShare < 0.60) flags.push('indirect share < 60%');
    else if (indShare < 0.68) flags.push('indirect share < 68%');
  }

  // tail: positive = stress. weight 0.1 (when when_issued_yield available)
  if (latest.high_yield !== null && latest.when_issued_yield !== null) {
    const tailBps = (latest.high_yield - latest.when_issued_yield) * 100;
    if (tailBps > 1) flags.push(`auction tail ${tailBps.toFixed(1)} bps`);
  }

  // Map combined z to 0-100. baseline z=0 -> 50, +1σ -> 65, +2σ -> 80, +3σ -> 95
  const zCombined = weightSum > 0 ? zSum / weightSum : 0;
  const score = clamp(Math.round(50 + zCombined * 15), 0, 100);
  return { score, flags };
}

async function fetchTerm(term: Term): Promise<AuctionRow[]> {
  // Pull ~2y of data for the term (weekly 30Y auctions => ~104 rows, 10Y ~104).
  // Use a wide date window to be safe; the response is small.
  const start = new Date();
  start.setFullYear(start.getFullYear() - 2);
  const startStr = start.toISOString().slice(0, 10);

  const params = new URLSearchParams({
    'filter': `record_date:gte:${startStr},security_term:eq:${term}`,
    'page[size]': '200',
    'sort': '-record_date',
  });
  const url = `${AUCTIONS_URL}?${params.toString()}`;
  const json = await fetchJson(url);
  const data: any[] = json?.data ?? [];
  return parseRows(data);
}

export async function getAuctionsSnapshot(opts?: { force?: boolean }): Promise<AuctionsSnapshot> {
  if (!opts?.force && cache && Date.now() - cache.ts < CACHE_MS) {
    return cache.data;
  }

  const termResults = await Promise.all(TERMS.map(t => fetchTerm(t).then(rows => ({ term: t, rows }))));

  const terms: AuctionTermLatest[] = termResults.map(({ term, rows }) => {
    if (rows.length === 0) {
      return {
        term,
        latest: null as any,
        history: [],
        baseline: { mean: 0, stdev: 0 },
        baselineIndirect: { mean: 0, stdev: 0 },
        stressScore: 50,
        flags: [`No data for ${term}`],
      };
    }
    const latest = rows[0];
    const btcHistory = rows.map(r => r.bid_to_cover_ratio).filter((v): v is number => v !== null);
    const indHistory = rows.map(r => indirectShare(r)).filter((v): v is number => v !== null);
    const baseline = {
      mean: btcHistory.length ? btcHistory.reduce((s, v) => s + v, 0) / btcHistory.length : 0,
      stdev: stdev(btcHistory),
    };
    const baselineIndirect = {
      mean: indHistory.length ? indHistory.reduce((s, v) => s + v, 0) / indHistory.length : 0,
      stdev: stdev(indHistory),
    };
    const { score, flags } = computeStress(latest, baseline, baselineIndirect);
    return {
      term,
      latest,
      history: rows.slice(0, 50),
      baseline,
      baselineIndirect,
      stressScore: score,
      flags,
    };
  });

  // Combined score: simple average of available term scores
  const combinedStressScore = Math.round(
    terms.reduce((s, t) => s + t.stressScore, 0) / terms.length,
  );

  const snap: AuctionsSnapshot = {
    fetchedAt: new Date().toISOString(),
    terms,
    combinedStressScore,
    notes: 'Source: Treasury Fiscal Data API (auctions_query). 30Y + 10Y only. Stress score = 0–100, higher = softer demand. Indirect share = indirect_bidder_accepted / total_accepted (real-time proxy for foreign + bank demand — no monthly TIC lag).',
  };

  cache = { ts: Date.now(), data: snap };
  return snap;
}

// ── Default dispatcher (matches lib/fred/handler.ts pattern) ────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = (req.url ?? '').split('?')[0];
  try {
    if (path.endsWith('/snapshot') || path.endsWith('/snapshot/')) {
      const force = req.query?.force === '1';
      const snap = await getAuctionsSnapshot({ force });
      return res.status(200).json(snap);
    }
    return res.status(400).json({ error: 'unknown endpoint — try /api/treasury/auctions/snapshot' });
  } catch (e: any) {
    console.error('[treasury-auctions] error:', e);
    return res.status(500).json({ error: e?.message ?? 'failed' });
  }
}
