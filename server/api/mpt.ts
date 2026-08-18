// BitcoinHub MPT — Express API handlers
import type { Request, Response } from 'express';
import {
  computeMPT,
  CYCLES,
  UNIVERSE,
  DEFAULT_RISK_FREE_RATE,
  type Holding,
} from '../mpt';

// Per-process cache: key = hash(holdings + cycle + rF), value = result + ts.
// 5-minute TTL — coin prices update faster than cycle stats shift.
const cache = new Map<string, { ts: number; result: any }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function hashInputs(holdings: Holding[], cycleId: string, rF: number): string {
  const sorted = [...holdings]
    .map(h => `${h.symbol.toUpperCase()}:${Number(h.quantity).toFixed(8)}`)
    .sort()
    .join('|');
  return `${sorted}::${cycleId}::${rF.toFixed(4)}`;
}

function handleError(res: Response, e: unknown) {
  const msg = (e as Error)?.message ?? 'Unknown error';
  console.error('[mpt] error:', msg);
  res.status(400).json({ error: msg });
}

/**
 * GET /api/mpt/cycles — list available halving cycles.
 */
export function listCycles(_req: Request, res: Response) {
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
export async function computeHandler(req: Request, res: Response) {
  try {
    const { holdings, cycleId, riskFreeRate } = req.body ?? {};

    if (!Array.isArray(holdings) || holdings.length === 0) {
      return res.status(400).json({ error: '`holdings` must be a non-empty array' });
    }
    if (typeof cycleId !== 'string') {
      return res.status(400).json({ error: '`cycleId` is required' });
    }

    const normalized: Holding[] = holdings.map((h: any) => ({
      symbol: String(h.symbol ?? '').toUpperCase().trim(),
      quantity: Number(h.quantity),
    })).filter(h => h.symbol && Number.isFinite(h.quantity) && h.quantity > 0);

    if (normalized.length === 0) {
      return res.status(400).json({ error: 'No valid holdings after normalization' });
    }

    const rF = typeof riskFreeRate === 'number' && Number.isFinite(riskFreeRate) && riskFreeRate >= 0 && riskFreeRate < 1
      ? riskFreeRate
      : DEFAULT_RISK_FREE_RATE;

    const cacheKey = hashInputs(normalized, cycleId, rF);
    const hit = cache.get(cacheKey);
    if (hit && (Date.now() - hit.ts) < CACHE_TTL_MS) {
      res.set('X-Cache', 'HIT');
      return res.json(hit.result);
    }

    const result = await computeMPT(normalized, cycleId, rF);
    cache.set(cacheKey, { ts: Date.now(), result });
    res.set('X-Cache', 'MISS');
    res.json(result);
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * POST /api/mpt/quote
 * Convenience: compute current portfolio value + per-asset mark without full optimization.
 * Body: { holdings: [{symbol, quantity}] }
 */
export async function quoteHandler(req: Request, res: Response) {
  try {
    const { holdings } = req.body ?? {};
    if (!Array.isArray(holdings) || holdings.length === 0) {
      return res.status(400).json({ error: '`holdings` must be a non-empty array' });
    }
    // For MVP: just include in the regular compute with cycle = current.
    // The compute also returns last prices via currentPortfolio.totalValue.
    const result = await computeMPT(
      holdings.map((h: any) => ({ symbol: String(h.symbol).toUpperCase(), quantity: Number(h.quantity) })),
      'cycle4',
      DEFAULT_RISK_FREE_RATE
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