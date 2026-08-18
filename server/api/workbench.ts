// BitcoinHub Workbench — Express API handlers

import type { Request, Response } from 'express';
import {
  BLOCKS, TEMPLATES_LIST, evaluate, parse,
} from '../workbench';

function handleError(res: Response, e: unknown) {
  const msg = (e as Error)?.message ?? 'Unknown error';
  console.error('[workbench] error:', msg);
  res.status(400).json({ error: msg });
}

/**
 * GET /api/workbench/blocks
 * Returns the block registry metadata (no fetch functions).
 */
export function listBlocks(_req: Request, res: Response) {
  res.json({
    blocks: BLOCKS.map(({ fetch, ...rest }) => rest),
  });
}

/**
 * GET /api/workbench/templates
 * Returns the built-in starter templates.
 */
export function listTemplates(_req: Request, res: Response) {
  res.json({ templates: TEMPLATES_LIST });
}

/**
 * POST /api/workbench/parse
 * Body: { formula: string }
 * Returns: { ast: ... } — debug-only AST view of the parsed formula.
 */
export function parseHandler(req: Request, res: Response) {
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
export async function evaluateHandler(req: Request, res: Response) {
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