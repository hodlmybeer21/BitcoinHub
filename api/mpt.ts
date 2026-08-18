// MPT — Vercel serverless handler.
// Standalone lightweight Express app for /api/mpt/* routes.
// Avoids the heavy server/routes.ts import chain (no DB, no auth,
// no storage) so cold-start doesn't crash on Vercel's Node runtime.

import express from 'express';
import { listCycles, computeHandler, quoteHandler } from '../server/api/mpt';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/api/mpt/cycles', listCycles);
app.post('/api/mpt/compute', computeHandler);
app.post('/api/mpt/quote', quoteHandler);

export default function handler(req: any, res: any): void {
  app(req, res);
}