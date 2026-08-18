// BitcoinHub Workbench — Vercel serverless handlers
//
// Wraps the math in ./api/_workbench/* and exposes the 4 Workbench endpoints.
//
// IMPORTANT: the math module is LAZY-IMPORTED inside each handler body
// (await import('./_workbench')) rather than via a static top-level import.
// See api/mpt-handlers.ts for the full rationale — module-level import of
// axios + the workbench blocks registry crashes Vercel Node cold start
// with FUNCTION_INVOCATION_FAILED and takes down the whole bundle.
//
// Mirror of server/api/workbench.ts for the Express server — kept in sync
// manually. The Express version uses `Request, Response` from express;
// this version uses `VercelRequest, VercelResponse` from @vercel/node.

import type { VercelRequest, VercelResponse } from '@vercel/node';

async function getWorkbench() {
  return await import('./_workbench');
}

function handleError(res: VercelResponse, e: unknown) {
  const msg = (e as Error)?.message ?? 'Unknown error';
  console.error('[workbench] error:', msg);
  res.status(400).json({ error: msg });
}

/**
 * GET /api/workbench/blocks
 * Returns the block registry metadata (no fetch functions).
 */
export async function listBlocks(_req: VercelRequest, res: VercelResponse) {
  try {
    const { BLOCKS } = await getWorkbench();
    res.json({
      blocks: BLOCKS.map(({ fetch: _fetch, ...rest }) => rest),
    });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * GET /api/workbench/templates
 * Returns the built-in starter templates.
 */
export async function listTemplates(_req: VercelRequest, res: VercelResponse) {
  try {
    const { TEMPLATES_LIST } = await getWorkbench();
    res.json({ templates: TEMPLATES_LIST });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * POST /api/workbench/parse
 * Body: { formula: string }
 * Returns: { ast: ... } — debug-only AST view of the parsed formula.
 */
export async function parseHandler(req: VercelRequest, res: VercelResponse) {
  try {
    const { formula } = req.body ?? {};
    if (typeof formula !== 'string' || formula.trim().length === 0) {
      return res.status(400).json({ error: '`formula` is required' });
    }
    const { parse } = await getWorkbench();
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

    const { evaluate } = await getWorkbench();
    const result = await evaluate(formula, { start: range.start, end: range.end });
    res.json(result);
  } catch (e) {
    handleError(res, e);
  }
}
