// BitcoinHub — /api/fedwatch-effr
// Current Effective Federal Funds Rate + recent trajectory via the New York Fed's
// public, no-key REST API. Returns the actual EFFR + target range + 30d series.
//
// What this is NOT: a full CME FedWatch-style implied probability matrix for the
// next FOMC meeting. That requires Fed Funds futures (ZQ contracts) which live
// behind CME's data feed (paid). For a free alternative we lean on the EFFR + the
// 30d trajectory as a coarse directional signal ("rate is high and stable for 30d"
// vs "rate just cut 25bp in two weeks").

import type { VercelRequest, VercelResponse } from '@vercel/node';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min — daily rate, no value in re-fetching more
let cache: { at: number; data: unknown } | null = null;

interface NyFedRefRate {
  effectiveDate: string;
  type: string;
  percentRate: number;
  targetRateFrom?: number;
  targetRateTo?: number;
  volumeInBillions?: number;
}

interface NyFedResp {
  refRates: NyFedRefRate[];
}

function json(res: VercelResponse, status: number, body: unknown, cacheHeader = 'HIT') {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Cache', cacheHeader);
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  return res.status(status).json(body);
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return json(res, 200, cache.data, 'HIT');
    }

    // NY Fed free public API — last 30 days of effective fed funds rate
    const upstream = await fetch(
      'https://markets.newyorkfed.org/api/rates/unsecured/effr/last/30.json',
      { signal: AbortSignal.timeout(15_000) }
    );
    if (!upstream.ok) {
      return json(res, 502, { error: `NY Fed EFFR upstream returned ${upstream.status}` }, 'MISS');
    }
    const payload = (await upstream.json()) as NyFedResp;
    const rates = payload.refRates || [];
    if (rates.length === 0) {
      return json(res, 502, { error: 'NY Fed EFFR returned empty refRates' }, 'MISS');
    }

    const sorted = [...rates].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
    const latest = sorted[sorted.length - 1];
    const oldest = sorted[0];
    const series = sorted.map((r) => ({
      date: r.effectiveDate,
      rate: r.percentRate,
      volumeBn: r.volumeInBillions ?? null,
    }));

    const data = {
      asOf: latest.effectiveDate,
      source: 'newyorkfed.org',
      currentRate: latest.percentRate,
      targetRangeFrom: latest.targetRateFrom ?? null,
      targetRangeTo: latest.targetRateTo ?? null,
      volumeBillions: latest.volumeInBillions ?? null,
      trajectory30d: {
        oldestRate: oldest.percentRate,
        oldestDate: oldest.effectiveDate,
        deltaBps: Math.round((latest.percentRate - oldest.percentRate) * 100),
      },
      series,
      note:
        'Implied probability matrix (CME FedWatch-style) requires Fed Funds futures quotes (paid CME feed). ' +
        'This view shows the actual EFFR + recent trajectory instead — honest about the proxy.',
    };

    cache = { at: Date.now(), data };
    return json(res, 200, data, 'MISS');
  } catch (e: any) {
    return json(res, 500, { error: e?.message ?? 'unknown error' }, 'MISS');
  }
}
