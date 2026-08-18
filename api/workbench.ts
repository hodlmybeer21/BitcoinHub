// Workbench — Vercel serverless handler.
// Standalone lightweight Express app for /api/workbench/* routes.
// No import from server/routes.ts → no DB/storage/auth initialization,
// so cold-start is fast and doesn't crash on Vercel's Node runtime.

import express from 'express';
import {
  listBlocks,
  listTemplates,
  parseHandler,
  evaluateHandler,
} from '../server/api/workbench';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/api/workbench/blocks', listBlocks);
app.get('/api/workbench/templates', listTemplates);
app.post('/api/workbench/parse', parseHandler);
app.post('/api/workbench/evaluate', evaluateHandler);

export default function handler(req: any, res: any): void {
  app(req, res);
}