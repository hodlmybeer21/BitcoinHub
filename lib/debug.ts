// BitcoinHub — /api/debug-env
// Diagnostic endpoint. Lists which env vars are visible to the function
// runtime (with sensitive values masked). Used to debug Vercel serverless
// env var propagation issues.
//
// NOT a public endpoint — remove or gate behind admin auth before
// exposing to users.

import type { VercelRequest, VercelResponse } from '@vercel/node';

function mask(key: string, value: string | undefined): string {
  if (value === undefined) return '(undefined)';
  if (key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN') || key.includes('PASSWORD') || key.includes('URL')) {
    if (value.length <= 8) return '<REDACTED-short>';
    return `${value.slice(0, 4)}…${value.slice(-4)} (len=${value.length})`;
  }
  return value;
}

async function handler(_req: VercelRequest, res: VercelResponse) {
  const keys = Object.keys(process.env).sort();
  const entries = keys.map(k => ({ key: k, value: mask(k, process.env[k]) }));

  // Highlight the critical ones at the top
  const critical = ['FRED_API_KEY', 'DATABASE_URL', 'VERCEL_ENV', 'VERCEL_GIT_COMMIT_REF', 'VERCEL_TARGET_ENV', 'NODE_ENV'];
  const criticalEntries = critical.map(k => ({ key: k, value: mask(k, process.env[k]) }));
  const otherKeys = keys.filter(k => !critical.includes(k));

  return res.status(200).json({
    env: process.env.VERCEL_ENV ?? 'unknown',
    count: keys.length,
    critical: criticalEntries,
    others: otherKeys,
    allEntries: entries,
    timestamp: new Date().toISOString(),
  });
}

export default handler;