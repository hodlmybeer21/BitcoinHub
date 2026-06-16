// DCA Simulator — Vercel serverless handler
// Ported from server/api/dca-simulator.ts (Express router) to Vercel handler
// because the Vercel deployment uses api/index.ts (serverless), not Express.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BTC_MONTHLY_PRICES, calculateDCA } from './dca-simulator-data';

function ok(res: VercelResponse, data: unknown) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.json(data);
}

function err(res: VercelResponse, status: number, message: string) {
  res.status(status).json({ error: message });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const monthly = parseInt((req.query.monthly as string) || '50', 10);
    const startYear = parseInt((req.query.startYear as string) || '2020', 10);

    if (monthly < 10 || monthly > 1000) {
      return err(res, 400, 'Monthly amount must be between $10 and $1000');
    }
    if (startYear < 2012 || startYear > 2025) {
      return err(res, 400, 'Start year must be between 2012 and 2025');
    }

    const result = await calculateDCA(monthly, startYear);
    return ok(res, result);
  } catch (e: any) {
    console.error('DCA simulator error:', e);
    return err(res, 500, 'Failed to calculate DCA results');
  }
}
