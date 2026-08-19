// BitcoinHub FRED — handler.ts
// Two routes:
//   GET /api/fred/series           — list all supported series + metadata
//   GET /api/fred/data?series_id=X — fetch observations (with YoY transform if needed)
// Plus:
//   GET /api/fred/categories       — series grouped by category (for /macro UI)

import {
  fetchFredObservations, downsampleObservations, yoySeries,
} from './quote.js';
import { FRED_SERIES, getSeriesDef, listSeriesByCategory } from './series.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

async function seriesListHandler(_req: VercelRequest, res: VercelResponse) {
  try {
    return res.status(200).json({
      count: FRED_SERIES.length,
      series: FRED_SERIES,
      categories: listSeriesByCategory(),
    });
  } catch (e: any) {
    console.error('[fred-series] error:', e);
    return res.status(500).json({ error: e?.message ?? 'Failed to list series' });
  }
}

async function categoriesHandler(_req: VercelRequest, res: VercelResponse) {
  try {
    return res.status(200).json(listSeriesByCategory());
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Failed to list categories' });
  }
}

async function dataHandler(req: VercelRequest, res: VercelResponse) {
  try {
    const seriesId = String(req.query?.series_id ?? '').toUpperCase();
    if (!seriesId) return res.status(400).json({ error: 'series_id query param required' });

    const def = getSeriesDef(seriesId);
    if (!def) {
      return res.status(400).json({
        error: `Unknown series_id: ${seriesId}`,
        supported: FRED_SERIES.map(s => s.id),
      });
    }

    const start = String(req.query?.start ?? def.startOverride ?? '1900-01-01');
    const end = String(req.query?.end ?? new Date().toISOString().slice(0, 10));
    const maxPoints = Number(req.query?.maxPoints ?? 500);

    const { observations, meta } = await fetchFredObservations(seriesId, { start, end });

    // Apply transform (e.g. CPI YoY).
    let transformed = observations;
    if (def.transform === 'yoy') {
      const yoy = yoySeries(observations);
      transformed = yoy.map(y => ({ date: y.date, value: y.value }));
    }

    const downsampled = downsampleObservations(transformed, maxPoints);

    // Monthly-lag UX (Phase 9 audit polish, 2026-08-19): surface how stale the
    // latest observation is so the UI can show "as of YYYY-MM" instead of
    // misleading "today" data. Daily/weekly series report ~0 lag; monthly
    // series are typically 30–60 days behind. Computed against the last
    // observation's date (not NOW()) so FRED's publication-lag semantics
    // surface honestly.
    const lastObs = downsampled[downsampled.length - 1];
    const todayMs = Date.now();
    const lastMs = lastObs ? new Date(lastObs.date).getTime() : todayMs;
    const dataLagDays = Math.max(0, Math.round((todayMs - lastMs) / 86400000));

    return res.status(200).json({
      seriesId,
      definition: def,
      count: downsampled.length,
      originalCount: observations.length,
      points: downsampled,
      meta,
      dataLagDays,
    });
  } catch (e: any) {
    console.error('[fred-data] error:', e);
    const status = e?.message?.includes('FRED_API_KEY') ? 503 : 500;
    return res.status(status).json({ error: e?.message ?? 'Failed to fetch FRED data' });
  }
}

// ─── Default dispatcher: inspect the URL path and route internally. ────────
// Vercel's serverless function for /api/fred/* (single file) calls this.
async function defaultHandler(req: VercelRequest, res: VercelResponse) {
  const path = (req.url ?? '').split('?')[0];
  if (path.endsWith('/series') || path.endsWith('/series/')) {
    return seriesListHandler(req, res);
  }
  if (path.endsWith('/categories') || path.endsWith('/categories/')) {
    return categoriesHandler(req, res);
  }
  return dataHandler(req, res);
}

export default defaultHandler;
