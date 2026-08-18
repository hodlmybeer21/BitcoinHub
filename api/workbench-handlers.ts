// BitcoinHub Workbench — Vercel serverless handlers
//
// Wraps the math in ./api/_workbench/* and exposes the 4 Workbench endpoints.
// All math + data deps live inside ./api/ so Vercel's bundler includes
// everything in the serverless function output.
//
// Mirror of server/api/workbench.ts for the Express server — kept in sync
// manually. The Express version uses `Request, Response` from express;
// this version uses `VercelRequest, VercelResponse` from @vercel/node.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BLOCKS, TEMPLATES_LIST, evaluate, parse } from './_workbench';

function handleError(res: VercelResponse, e: unknown) {
  const msg = (e as Error)?.message ?? 'Unknown error';
  console.error('[workbench] error:', msg);
  res.status(400).json({ error: msg });
}

/**
 * GET /api/workbench/blocks
 * Returns the block registry metadata (no fetch functions).
 */
export function listBlocks(_req: VercelRequest, res: VercelResponse) {
  res.json({
    blocks: BLOCKS.map(({ fetch: _fetch, ...rest }) => rest),
  });
}

/**
 * GET /api/workbench/templates
 * Returns the built-in starter templates.
 */
export function listTemplates(_req: VercelRequest, res: VercelResponse) {
  res.json({ templates: TEMPLATES_LIST });
}

/**
 * POST /api/workbench/parse
 * Body: { formula: string }
 * Returns: { ast: ... } — debug-only AST view of the parsed formula.
 */
export function parseHandler(req: VercelRequest, res: VercelResponse) {
  try {
    const { formula } = req.body ?? {};
    if (typeof formula !== 'string' || formula.trim().length === 0) {
      return res.status(400).json({ error: '`formula` is required' });
    }
    const ast = parse(formula);
    res.json({ ast });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * POST /api/workbench/evaluate
 * Body: { formula: string, range: { start: string, end: string } }
 * Returns: { series: [...], sources: [...], errors: [...], evalMs }
 */
export async function evaluateHandler(req: VercelRequest, res: VercelResponse) {
  try {
    const { formula, range } = req.body ?? {};

    if (typeof formula !== 'string' || formula.trim().length === 0) {
      return res.status(400).json({ error: '`formula` is required' });
    }
    if (!range || typeof range.start !== 'string' || typeof range.end !== 'string') {
      return res.status(400).json({ error: '`range` with start/end is required' });
    }

    const result = await evaluate(formula, { start: range.start, end: range.end });
    res.json(result);
  } catch (e) {
    handleError(res, e);
  }
}
