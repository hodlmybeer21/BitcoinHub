/**
 * Live state for the 4-Year Cycle page.
 *
 * Source-of-truth numbers:
 *   - Cycle top: $126,080.00 on 2025-10-06 (CoinGecko all-time-high tick).
 *   - Target cycle low: $25,216 – $31,520 (–75% to –80% from peak).
 *   - Window open: Aug 1, 2026 (cycle bottom typically Aug-Oct in midterm
 *     election years; Aug 1 is the early edge of the window).
 *   - Editorial score: inlined below (see EDITORIAL_SCORE constant).
 *
 * Editorial score update path:
 *   1. Edit EDITORIAL_SCORE in this file. The writer must have code-deploy
 *      access (i.e. the owner, or me on the owner's behalf).
 *   2. Bump the `updatedAt` ISO timestamp.
 *   3. Commit + deploy. The new value goes live with the next Lambda cold
 *      start (Vercel warm instances may keep the old value until evicted).
 *
 * Why inlined (vs. data/cycle-score.json read at runtime):
 *   Vercel's serverless Lambda has no filesystem access to the repo's
 *   data/ dir, and inline imports of node:fs/path/url were empirically
 *   failing at module-load time (FUNCTION_INVOCATION_FAILED on /api/cycle/*).
 *   Inlining keeps the bundle zero-dependency: it runs on Vercel, in
 *   Express local dev, and in any future container without surprises.
 *
 * SAFETY CONTRACT for `EDITORIAL_SCORE.notes`:
 *   Must NOT contain your own positions, entry/cost/target prices, P&L,
 *   portfolio sizing, fills, or any trade-specific info. Use it for thesis
 *   commentary grounded in public data: analyst counts, on-chain readings,
 *   macro context, time-to-window. Private trade views go in our chat, not
 *   in the score — the score is public.
 */

const COINGECKO_SIMPLE = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true';
const COINGECKO_HISTORY = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=31&interval=daily';
const COINEX_KLINES = 'https://api.coinex.com/v1/market/kline?market=BTCUSDT&type=1week&limit=200';

const CYCLE_TOP_USD = 126080.00;
const CYCLE_TOP_DATE = '2025-10-06';
const CYCLE_LOW_TARGET_MIN_USD = 25216;   // -80%
const CYCLE_LOW_TARGET_MAX_USD = 31520;   // -75%
const WINDOW_OPEN_ISO = '2026-08-01T00:00:00Z';

const EDITORIAL_SCORE = {
  score: 6.4,
  label: 'LATE BEAR — Q4 window opening soon',
  notes:
    'Three of four analysts actively call the cycle bottom. Cycle pattern intact: 2025 top confirmed, 2026 midterm low thesis holding. Macro structure (200-WMA, Pi Cycle) consistent with prior cycle bottoms.',
  updatedAt: '2026-06-30T11:15:00Z',
  updatedBy: 'owner',
} as const;

export interface CycleScore {
  score: number;
  label: string;
  notes: string;
  updatedAt: string;
  updatedBy: string;
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
  ma200w: number;
  asOf: string;
  source: 'live' | 'fallback';
  score: CycleScore;
}

interface SimplePriceResp {
  bitcoin?: { usd?: number; usd_24h_change?: number };
}

// ── Score ───────────────────────────────────────────────────────────────────

export async function getCycleScore(): Promise<CycleScore> {
  return { ...EDITORIAL_SCORE };
}

// ── Live market data ────────────────────────────────────────────────────────

async function fetchJson(url: string, timeoutMs = 8000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'BitcoinHub/1.0' },
    });
    if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

let priceCache: { fetchedAt: number; price: number; change24h: number } | null = null;
const PRICE_CACHE_MS = 60 * 1000;

async function getCurrentPrice(): Promise<{ price: number; change24h: number }> {
  if (priceCache && Date.now() - priceCache.fetchedAt < PRICE_CACHE_MS) {
    return { price: priceCache.price, change24h: priceCache.change24h };
  }
  const json = await fetchJson(COINGECKO_SIMPLE, 5000) as SimplePriceResp;
  const price = Number(json?.bitcoin?.usd || 0);
  const change24h = Number(json?.bitcoin?.usd_24h_change || 0);
  if (price <= 0) throw new Error('invalid price response');
  priceCache = { fetchedAt: Date.now(), price, change24h };
  return { price, change24h };
}

let longWindowCache: { fetchedAt: number; change7d: number | null; change30d: number | null } | null = null;
const LONG_WINDOW_CACHE_MS = 5 * 60 * 1000;

async function getLongWindowChanges(): Promise<{ change7d: number | null; change30d: number | null }> {
  if (longWindowCache && Date.now() - longWindowCache.fetchedAt < LONG_WINDOW_CACHE_MS) {
    return { change7d: longWindowCache.change7d, change30d: longWindowCache.change30d };
  }
  const json = await fetchJson(COINGECKO_HISTORY) as { prices?: [number, number][] };
  const prices = json?.prices || [];
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
}

let ma200wCache: { fetchedAt: number; ma200w: number } | null = null;
const MA200W_CACHE_MS = 30 * 60 * 1000;

async function get200wMA(): Promise<number> {
  if (ma200wCache && Date.now() - ma200wCache.fetchedAt < MA200W_CACHE_MS) {
    return ma200wCache.ma200w;
  }
  const json = await fetchJson(COINEX_KLINES) as { data?: number[][] };
  const data = json?.data || [];
  if (data.length < 200) throw new Error(`only ${data.length} weeks of data`);
  // kline format per CoinEx: [ts, open, high, low, close, vol, ...]
  const closes = data.map(row => Number(row[4]));
  const last200 = closes.slice(-200);
  const ma = last200.reduce((s, c) => s + c, 0) / last200.length;
  ma200wCache = { fetchedAt: Date.now(), ma200w: ma };
  return ma;
}

function computeWeeksToWindow(): number {
  const ms = new Date(WINDOW_OPEN_ISO).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / (7 * 24 * 60 * 60 * 1000)));
}

// ── Public state ────────────────────────────────────────────────────────────

export async function getCycleState(): Promise<CycleState> {
  const asOf = new Date().toISOString();
  const score = await getCycleScore();
  try {
    const [{ price, change24h }, longWindow, ma200w] = await Promise.all([
      getCurrentPrice(),
      getLongWindowChanges(),
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
    const ma200w = await get200wMA().catch(() => ma200wCache?.ma200w ?? 0);
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