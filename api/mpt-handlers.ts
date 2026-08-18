// BitcoinHub MPT — Vercel serverless handlers
//
// Wraps the math in ./api/_mpt/* and exposes the 3 MPT endpoints.
//
// IMPORTANT: the math module is LAZY-IMPORTED inside each handler body
// (await import('./_mpt')) rather than via a static top-level import.
// Static imports trigger module-level evaluation (ml-matrix + axios +
// seedrandom + the dep tree) which crashes Vercel's Node cold start with
// FUNCTION_INVOCATION_FAILED and takes down the entire serverless function
// bundle — including legacy routes that don't touch this code. Lazy
// import isolates the load from cold start: the wrapper module loads
// cleanly (just function declarations), and the math only loads on the
// first actual request, after the Node runtime is alive.
//
// Mirror of server/api/mpt.ts for the Express server — kept in sync
// manually. The Express version uses `Request, Response` from express;
// this version uses `VercelRequest, VercelResponse` from @vercel/node.

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Per-process cache: key = hash(holdings + cycle + rF), value = result + ts.
// 5-minute TTL — coin prices update faster than cycle stats shift.
const cache = new Map<string, { ts: number; result: any }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getMpt() {
  return await import('./_mpt');
}

function hashInputs(holdings: { symbol: string; quantity: number }[], cycleId: string, rF: number): string {
  const sorted = [...holdings]
    .map(h => `${h.symbol.toUpperCase()}:${Number(h.quantity).toFixed(8)}`)
    .sort()
    .join('|');
  return `${sorted}::${cycleId}::${rF.toFixed(4)}`;
}

function handleError(res: VercelResponse, e: unknown) {
  const msg = (e as Error)?.message ?? 'Unknown error';
  console.error('[mpt] error:', msg);
  res.status(400).json({ error: msg });
}

/**
 * GET /api/mpt/cycles — list available halving cycles.
 */
export async function listCycles(_req: VercelRequest, res: VercelResponse) {
  const { CYCLES, UNIVERSE, DEFAULT_RISK_FREE_RATE } = await getMpt();
  res.json({
    cycles: CYCLES,
    universe: UNIVERSE,
    defaultRiskFreeRate: DEFAULT_RISK_FREE_RATE,
    minAssets: 2,
    maxAssets: UNIVERSE.length,
  });
}

/**
 * POST /api/mpt/compute
 * Body: { holdings: [{symbol, quantity}], cycleId: string, riskFreeRate?: number }
 * Returns: full MPTResult
 */
export async function computeHandler(req: VercelRequest, res: VercelResponse) {
  try {
    const { holdings, cycleId, riskFreeRate } = req.body ?? {};

    if (!Array.isArray(holdings) || holdings.length === 0) {
      return res.status(400).json({ error: '`holdings` must be a non-empty array' });
    }
    if (typeof cycleId !== 'string') {
      return res.status(400).json({ error: '`cycleId` is required' });
    }

    const { computeMPT, DEFAULT_RISK_FREE_RATE } = await getMpt();

    const normalized = holdings
      .map((h: any) => ({
        symbol: String(h.symbol ?? '').toUpperCase().trim(),
        quantity: Number(h.quantity),
      }))
      .filter(h => h.symbol && Number.isFinite(h.quantity) && h.quantity > 0);

    if (normalized.length === 0) {
      return res.status(400).json({ error: 'No valid holdings after normalization' });
    }

    const rF =
      typeof riskFreeRate === 'number' &&
      Number.isFinite(riskFreeRate) &&
      riskFreeRate >= 0 &&
      riskFreeRate < 1
        ? riskFreeRate
        : DEFAULT_RISK_FREE_RATE;

    const cacheKey = hashInputs(normalized, cycleId, rF);
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(hit.result);
    }

    const result = await computeMPT(normalized, cycleId, rF);
    cache.set(cacheKey, { ts: Date.now(), result });
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * POST /api/mpt/quote
 * Convenience: current portfolio value + per-asset mark without full optimization.
 * Body: { holdings: [{symbol, quantity}] }
 */
export async function quoteHandler(req: VercelRequest, res: VercelResponse) {
  try {
    const { holdings } = req.body ?? {};
    if (!Array.isArray(holdings) || holdings.length === 0) {
      return res.status(400).json({ error: '`holdings` must be a non-empty array' });
    }
    const { computeMPT, DEFAULT_RISK_FREE_RATE } = await getMpt();
    // For MVP: just include in the regular compute with cycle = current.
    // The compute also returns last prices via currentPortfolio.totalValue.
    const result = await computeMPT(
      holdings.map((h: any) => ({
        symbol: String(h.symbol).toUpperCase(),
        quantity: Number(h.quantity),
      })),
      'cycle4',
      DEFAULT_RISK_FREE_RATE,
    );
    res.json({
      totalValue: result.currentPortfolio.totalValue,
      symbols: result.symbols,
      excludedAssets: result.excludedAssets,
    });
  } catch (e) {
    handleError(res, e);
  }
}
