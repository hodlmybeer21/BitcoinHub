// BitcoinHub FRED Macro Suite — smoke test
// Validates the lib/fred/ modules against the live FRED API.
// Requires FRED_API_KEY in /root/.openclaw/workspace/secrets.env or BitcoinHub/.env.local.
//
// Usage:  npx tsx scripts/test-fred.ts
//
// Verifies:
//   1. Series registry has the expected 12 entries
//   2. FRED API client fetches WALCL (Fed Total Assets) successfully
//   3. Multiple cadence series work (daily/weekly/monthly)
//   4. yoySeries() correctly transforms a level series into YoY %
//   5. downsampleObservations() reduces point count while preserving last
//   6. getSeriesDef() lookup works for known + unknown series

import { readFileSync } from 'fs';
import { join } from 'path';

// Load .env.local so process.env.FRED_API_KEY is set for this script.
function loadEnv() {
  const candidates = [
    '/root/.openclaw/workspace/secrets.env',
    join(process.cwd(), '.env.local'),
  ];
  for (const path of candidates) {
    try {
      const text = readFileSync(path, 'utf8');
      for (const line of text.split('\n')) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
        }
      }
      console.log(`📦 loaded env from ${path}`);
      return;
    } catch { /* try next */ }
  }
}
loadEnv();

import { fetchFredObservations, yoySeries, downsampleObservations } from '../lib/fred/quote.js';
import { FRED_SERIES, getSeriesDef, listSeriesByCategory } from '../lib/fred/series.js';

interface TestResult { name: string; pass: boolean; detail?: string; }
const results: TestResult[] = [];

function check(name: string, cond: boolean, detail?: string) {
  results.push({ name, pass: cond, detail });
  const tag = cond ? '✅' : '❌';
  console.log(`${tag} ${name}${detail ? ` — ${detail}` : ''}`);
}

console.log('📋 FRED Macro Suite — smoke test\n');

// ─── 1. Series registry ─────────────────────────────────────────────────────
{
  check('1a. FRED_SERIES has 12 entries',
    FRED_SERIES.length === 12,
    `got ${FRED_SERIES.length}`);
  const ids = FRED_SERIES.map(s => s.id);
  for (const required of ['WALCL', 'UNRATE', 'CPIAUCSL', 'T10Y2Y', 'NFCI', 'M1SL']) {
    check(`1b. registry includes ${required}`,
      ids.includes(required));
  }
  const categories = listSeriesByCategory();
  const catsWithData = Object.entries(categories).filter(([_, v]) => v.length > 0).map(([k]) => k);
  check('1c. at least 5 categories populated',
    catsWithData.length >= 5,
    catsWithData.join(', '));
  check('1d. getSeriesDef("WALCL") returns full def',
    typeof getSeriesDef('WALCL')?.id === 'string');
  check('1e. getSeriesDef("UNKNOWN") returns undefined',
    getSeriesDef('UNKNOWN') === undefined);
}

// ─── 2. yoySeries() transform (synthetic) ───────────────────────────────────
{
  // 24 monthly obs alternating 100, 110 → expected YoY = 10%
  const obs = [];
  for (let year = 0; year < 3; year++) {
    for (let month = 1; month <= 12; month++) {
      const date = `${2024 + year}-${String(month).padStart(2, '0')}-15`;
      const value = (year === 0 ? 100 : (year === 1 ? 110 : 121)); // +10% each year
      obs.push({ date, value });
    }
  }
  const yoy = yoySeries(obs);
  // 24 monthly obs over 3 years -> year 1 has no year-ago match, but years
  // 2 + 3 each have a year-ago match (12 entries each) -> 24 YoY entries.
  check('2a. yoySeries produces 24 entries from 24-obs (3y) input',
    yoy.length === 24,
    `got ${yoy.length}`);
  // First YoY entry (Jan 2025 vs Jan 2024) should be ~10%
  const first = yoy[0];
  check('2b. first YoY ≈ 10%',
    first && Math.abs(first.value - 10) < 0.01,
    first ? `${first.value.toFixed(3)}%` : 'no result');
  // Second YoY entry should be ~10% (Feb 2025 vs Feb 2024)
  const second = yoy[1];
  check('2c. second YoY ≈ 10%',
    second && Math.abs(second.value - 10) < 0.01,
    second ? `${second.value.toFixed(3)}%` : 'no result');
}

// ─── 3. downsampleObservations() ────────────────────────────────────────────
{
  const obs = Array.from({ length: 1000 }, (_, i) => ({ date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`, value: 100 + i }));
  const ds = downsampleObservations(obs, 100);
  check('3a. downsamples 1000 → ≤100 points',
    ds.length > 0 && ds.length <= 101,  // +1 for last-point append
    `got ${ds.length}`);
  check('3b. last point preserved',
    ds[ds.length - 1].date === obs[obs.length - 1].date);
  check('3c. no-op when already ≤maxPoints',
    downsampleObservations(obs.slice(0, 50), 100).length === 50);
}

// ─── 4. Live FRED API fetches (skip if no key) ──────────────────────────────
if (!process.env.FRED_API_KEY) {
  console.log('\n⏭️  Skipping live FRED fetches — FRED_API_KEY not set');
  check('4. live fetches', false, 'FRED_API_KEY not set');
} else {
  console.log('\n🌐 Live FRED fetches (each ≤25s)...');

  // 4a. WALCL (weekly, Fed Total Assets)
  try {
    const r = await fetchFredObservations('WALCL', { start: '2024-01-01' });
    check('4a. WALCL returns ≥50 weekly observations',
      r.observations.length >= 50,
      `got ${r.observations.length}`);
    check('4b. WALCL latest value is finite + > 1T',
      typeof r.observations[r.observations.length - 1].value === 'number' &&
      (r.observations[r.observations.length - 1].value as number) > 1_000_000,
      `latest=${r.observations[r.observations.length - 1].value} (${r.observations[r.observations.length - 1].date})`);
  } catch (e: any) {
    check('4a. WALCL', false, e?.message ?? 'unknown');
  }

  // 4b. UNRATE (monthly, Unemployment)
  try {
    const r = await fetchFredObservations('UNRATE', { start: '2020-01-01' });
    check('4c. UNRATE returns ≥50 monthly observations',
      r.observations.length >= 50,
      `got ${r.observations.length}`);
    check('4d. UNRATE latest value is 2-15 (sane unemployment)',
      typeof r.observations[r.observations.length - 1].value === 'number' &&
      (r.observations[r.observations.length - 1].value as number) >= 2 &&
      (r.observations[r.observations.length - 1].value as number) <= 15,
      `latest=${r.observations[r.observations.length - 1].value}%`);
  } catch (e: any) {
    check('4c. UNRATE', false, e?.message ?? 'unknown');
  }

  // 4c. T10Y2Y (daily, 2s10s spread — often negative)
  try {
    const r = await fetchFredObservations('T10Y2Y', { start: '2024-01-01' });
    check('4e. T10Y2Y returns ≥500 daily observations',
      r.observations.length >= 500,
      `got ${r.observations.length}`);
    check('4f. T10Y2Y latest value is -5 to +5 (sane spread)',
      typeof r.observations[r.observations.length - 1].value === 'number' &&
      Math.abs(r.observations[r.observations.length - 1].value as number) <= 5,
      `latest=${r.observations[r.observations.length - 1].value}%`);
  } catch (e: any) {
    check('4e. T10Y2Y', false, e?.message ?? 'unknown');
  }

  // 4d. CPIAUCSL (monthly, raw level — handler will transform to YoY)
  try {
    const r = await fetchFredObservations('CPIAUCSL', { start: '2020-01-01' });
    check('4g. CPIAUCSL returns ≥50 monthly observations',
      r.observations.length >= 50,
      `got ${r.observations.length}`);
    check('4h. CPIAUCSL level value is 250-400 (sane CPI)',
      typeof r.observations[r.observations.length - 1].value === 'number' &&
      (r.observations[r.observations.length - 1].value as number) >= 250 &&
      (r.observations[r.observations.length - 1].value as number) <= 400,
      `latest=${r.observations[r.observations.length - 1].value}`);
    // YoY transform on the level
    const yoy = yoySeries(r.observations);
    const lastYoy = yoy[yoy.length - 1]?.value;
    check('4i. CPIAUCSL YoY is 0-15% (sane inflation)',
      typeof lastYoy === 'number' && lastYoy >= 0 && lastYoy <= 15,
      `latest YoY=${lastYoy?.toFixed(2)}%`);
  } catch (e: any) {
    check('4g. CPIAUCSL', false, e?.message ?? 'unknown');
  }
}

// ─── Summary ────────────────────────────────────────────────────────────────
const passed = results.filter(r => r.pass).length;
const failed = results.length - passed;
console.log(`\n${'='.repeat(60)}`);
console.log(`${passed}/${results.length} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  console.log('\nFailed tests:');
  for (const r of results) if (!r.pass) console.log(`  ❌ ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  process.exit(1);
}
process.exit(0);
