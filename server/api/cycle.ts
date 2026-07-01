/**
 * Live state for the 4-Year Cycle page.
 *
 * Source-of-truth numbers:
 *   - Cycle top: $126,080.00 on 2025-10-06 (CoinGecko all-time-high tick).
 *   - Target cycle low: $25,216 – $31,520 (–75% to –80% from peak).
 *   - Window open: Aug 1, 2026 (cycle bottom typically Aug-Oct in midterm
 *     election years; Aug 1 is the early edge of the window).
 *   - Editorial score: read-only from data/cycle-score.json (no HTTP write
 *     endpoint by design — see safety contract below).
 *
 * Editorial score update path:
 *   1. Edit data/cycle-score.json directly. The writer must have file access
 *      to the repo (i.e. the owner, or me on the owner's behalf).
 *   2. Bump the `updatedAt` ISO timestamp.
 *   3. Commit + deploy. /api/cycle/state picks up the new value on the next
 *      mtime check after restart.
 *
 * This aligns editorial trust with code-deployment trust: the same people who
 * can ship a change to the website can update the score. There is no public
 * write endpoint, no shared-secret token, no user account, no admin password.
 *
 * SAFETY CONTRACT for `notes`:
 *   The `notes` field must NOT contain your own positions, entry/cost/target
 *   prices, P&L, portfolio sizing, fills, or any trade-specific info. Use it
 *   for thesis commentary grounded in public data: analyst counts, on-chain
 *   readings, macro context, time-to-window. If you need to express a private
 *   trade-related view, do it in our chat, not in the score file — the file
 *   is public.
 */

import axios from 'axios';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const COINGECKO_SIMPLE = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true';

const CYCLE_TOP_USD = 126080.00;
const CYCLE_TOP_DATE = '2025-10-06';
const CYCLE_LOW_TARGET_MIN_USD = 25216;   // -80%
const CYCLE_LOW_TARGET_MAX_USD = 31520;   // -75%
const WINDOW_OPEN_ISO = '2026-08-01T00:00:00Z';

export interface CycleScore {
  score: number;            // 0..10, conviction composite
  label: string;            // human-readable phase label
  notes: string;            // 1-3 sentence rationale
  updatedAt: string;        // ISO timestamp of last edit
  updatedBy: string;        // 'owner'
}

export interface CycleState {
  price: number;
  change24h: number;
  change7d: number | null;
  change30d: number | null;
  drawdownPctFromTop: number;
  weeksToWindow: number;
  cycleTop: { price: number; date: string };
  cycleLowTarget: { min: number; max: number };
  windowOpen: string;
  ma200w: number;           // live 200-week moving average (BTC's historical floor line)
  asOf: string;
  source: 'live' | 'fallback';
  score: CycleScore;
}

interface SimplePriceResp {
  bitcoin?: { usd?: number; usd_24h_change?: number };
}

// ── Score loader ────────────────────────────────────────────────────────────

let scoreCache: { data: CycleScore; mtime: number } | null = null;

async function loadCycleScore(): Promise<CycleScore> {
  // Resolve data/cycle-score.json relative to either the source file
  // (local dev / Express) or the process working directory (Vercel serverless,
  // where the data/ dir is shipped alongside the api/ bundle).
  const candidates = [
    (() => {
      try {
        const dir = path.dirname(fileURLToPath(import.meta.url));
        return path.resolve(dir, '..', '..', 'data', 'cycle-score.json');
      } catch { return ''; }
    })(),
    path.resolve(process.cwd(), 'data', 'cycle-score.json'),
    path.resolve(process.cwd(), '..', 'data', 'cycle-score.json'),
  ].filter(Boolean);
  let filePath: string | null = null;
  for (const c of candidates) {
    try { await fs.stat(c); filePath = c; break; } catch { /* try next */ }
  }
  try {
    const stat = await fs.stat(filePath);
    if (scoreCache && scoreCache.mtime === stat.mtimeMs && scoreCache.data) {
      return scoreCache.data;
    }
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const score: CycleScore = {
      score: typeof parsed.score === 'number' ? parsed.score : 0,
      label: typeof parsed.label === 'string' ? parsed.label : '',
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
      updatedBy: typeof parsed.updatedBy === 'string' ? parsed.updatedBy : 'owner',
    };
    scoreCache = { data: score, mtime: stat.mtimeMs };
    return score;
  } catch (err) {
    console.warn('[cycle] could not read data/cycle-score.json:', (err as Error).message);
    return { score: 0, label: '', notes: '', updatedAt: '', updatedBy: 'owner' };
  }
}

export async function getCycleScore(): Promise<CycleScore> {
  return loadCycleScore();
}

// ── Live market data ────────────────────────────────────────────────────────

let longWindowCache: { fetchedAt: number; change7d: number | null; change30d: number | null } | null = null;
const LONG_WINDOW_CACHE_MS = 5 * 60 * 1000;

// 200-week MA is computed from CoinEx weekly klines (no API key required,
// lenient rate limit). 200 weeks = ~3.8 years and is the historical floor
// line BTC has tagged at every cycle bottom.
let ma200wCache: { fetchedAt: number; ma200w: number } | null = null;
const MA200W_CACHE_MS = 30 * 60 * 1000;  // 30 min — MA200 shifts slowly

async function get200wMA(): Promise<number> {
  if (ma200wCache && Date.now() - ma200wCache.fetchedAt < MA200W_CACHE_MS) {
    return ma200wCache.ma200w;
  }
  try {
    const r = await axios.get('https://api.coinex.com/v1/market/kline?market=BTCUSDT&type=1week&limit=200', {
      timeout: 8000,
      headers: { 'User-Agent': 'BitcoinHub/1.0' },
    });
    const data: number[][] = r.data?.data || [];
    if (data.length < 200) throw new Error(`only ${data.length} weeks of data`);
    // kline format per CoinEx: [ts, open, high, low, close, vol, ...]
    const closes = data.map(row => Number(row[4]));
    const last200 = closes.slice(-200);
    const ma = last200.reduce((s, c) => s + c, 0) / last200.length;
    ma200wCache = { fetchedAt: Date.now(), ma200w: ma };
    return ma;
  } catch (err) {
    console.warn('[cycle] 200-WMA fetch failed:', (err as Error).message);
    // Return the last cached value if available so the page degrades softly.
    return ma200wCache?.ma200w ?? 0;
  }
}

async function getLongWindowChanges(): Promise<{ change7d: number | null; change30d: number | null }> {
  if (longWindowCache && Date.now() - longWindowCache.fetchedAt < LONG_WINDOW_CACHE_MS) {
    return { change7d: longWindowCache.change7d, change30d: longWindowCache.change30d };
  }
  try {
    const r = await axios.get('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=31&interval=daily', {
      timeout: 8000,
      headers: { 'User-Agent': 'BitcoinHub/1.0' },
    });
    const prices: [number, number][] = r.data?.prices || [];
    if (prices.length < 2) {
      longWindowCache = { fetchedAt: Date.now(), change7d: null, change30d: null };
      return { change7d: null, change30d: null };
    }
    const latest = prices[prices.length - 1][1];
    const day7 = prices[Math.max(0, prices.length - 8)][1];
    const day30 = prices[Math.max(0, prices.length - 31)][1] || day7;
    const change7d = ((latest - day7) / day7) * 100;
    const change30d = day30 ? ((latest - day30) / day30) * 100 : null;
    longWindowCache = { fetchedAt: Date.now(), change7d, change30d };
    return { change7d, change30d };
  } catch (err) {
    console.warn('[cycle] long-window fetch failed:', (err as Error).message);
    return { change7d: null, change30d: null };
  }
}

let priceCache: { fetchedAt: number; price: number; change24h: number } | null = null;
const PRICE_CACHE_MS = 60 * 1000;

async function getCurrentPrice(): Promise<{ price: number; change24h: number }> {
  if (priceCache && Date.now() - priceCache.fetchedAt < PRICE_CACHE_MS) {
    return { price: priceCache.price, change24h: priceCache.change24h };
  }
  const r = await axios.get<SimplePriceResp>(COINGECKO_SIMPLE, {
    timeout: 5000,
    headers: { 'User-Agent': 'BitcoinHub/1.0' },
  });
  const price = Number(r.data?.bitcoin?.usd || 0);
  const change24h = Number(r.data?.bitcoin?.usd_24h_change || 0);
  if (price <= 0) throw new Error('invalid price response');
  priceCache = { fetchedAt: Date.now(), price, change24h };
  return { price, change24h };
}

function computeWeeksToWindow(): number {
  const ms = new Date(WINDOW_OPEN_ISO).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / (7 * 24 * 60 * 60 * 1000)));
}

// ── Public state ────────────────────────────────────────────────────────────

export async function getCycleState(): Promise<CycleState> {
  const asOf = new Date().toISOString();
  const scorePromise = loadCycleScore();

  try {
    const [{ price, change24h }, longWindow, score, ma200w] = await Promise.all([
      getCurrentPrice(),
      getLongWindowChanges(),
      scorePromise,
      get200wMA(),
    ]);
    const drawdown = ((CYCLE_TOP_USD - price) / CYCLE_TOP_USD) * 100;
    return {
      price,
      change24h,
      change7d: longWindow.change7d,
      change30d: longWindow.change30d,
      drawdownPctFromTop: Math.max(0, drawdown),
      weeksToWindow: computeWeeksToWindow(),
      cycleTop: { price: CYCLE_TOP_USD, date: CYCLE_TOP_DATE },
      cycleLowTarget: { min: CYCLE_LOW_TARGET_MIN_USD, max: CYCLE_LOW_TARGET_MAX_USD },
      windowOpen: WINDOW_OPEN_ISO,
      ma200w,
      asOf,
      source: 'live',
      score,
    };
  } catch (err) {
    console.warn('[cycle] live fetch failed, returning fallback payload:', (err as Error).message);
    const score = await scorePromise;
    const ma200w = await get200wMA().catch(() => 0);
    return {
      price: 0,
      change24h: 0,
      change7d: null,
      change30d: null,
      drawdownPctFromTop: 0,
      weeksToWindow: computeWeeksToWindow(),
      cycleTop: { price: CYCLE_TOP_USD, date: CYCLE_TOP_DATE },
      cycleLowTarget: { min: CYCLE_LOW_TARGET_MIN_USD, max: CYCLE_LOW_TARGET_MAX_USD },
      windowOpen: WINDOW_OPEN_ISO,
      ma200w,
      asOf,
      source: 'fallback',
      score,
    };
  }
}
