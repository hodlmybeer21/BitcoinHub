import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "../server/routes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let initialized = false;

async function init() {
  if (!initialized) {
    await registerRoutes(app);
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err?.status || err?.statusCode || 500;
      res.status(status).json({ message: err.message });
    });
    initialized = true;
  }
}

export default async function handler(req: any, res: any): Promise<void> {
  try {
    await init();
  } catch (err) {
    console.error('Init error:', err);
    res.status(500).json({ error: 'Init failed' });
    return;
  }
  
  return new Promise((resolve) => {
    res.on('finish', () => resolve());
    res.on('error', () => resolve());
    setTimeout(() => resolve(), 25000);
    app(req, res);
  });
}
