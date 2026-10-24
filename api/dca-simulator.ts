
// DCA Simulator — Vercel serverless handler
// Self-contained: includes price data + calculation logic in one file
// for clean esbuild bundling (Vercel serverless functions).
import type { VercelRequest, VercelResponse } from '@vercel/node';

function ok(res: VercelResponse, data: unknown) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.json(data);
}

function err(res: VercelResponse, status: number, message: string) {
  res.status(status).json({ error: message });
}

// DCA Simulator — historical BTC price data + calculation function
// Used by both server/api/dca-simulator.ts (Express) and api/dca-simulator.ts (Vercel serverless).
// No framework dependencies — pure data + math.


// Hardcoded historical BTC monthly average prices (USD)
// Source: Historical market data averages
export const BTC_MONTHLY_PRICES: Record<string, number> = {
  // 2012
  "2012-01": 6.0,
  "2012-02": 4.5,
  "2012-03": 4.9,
  "2012-04": 5.1,
  "2012-05": 5.3,
  "2012-06": 6.6,
  "2012-07": 8.4,
  "2012-08": 10.0,
  "2012-09": 12.4,
  "2012-10": 11.0,
  "2012-11": 12.5,
  "2012-12": 13.4,

  // 2013
  "2013-01": 20.0,
  "2013-02": 28.0,
  "2013-03": 92.0,
  "2013-04": 135.0,
  "2013-05": 128.0,
  "2013-06": 97.0,
  "2013-07": 98.0,
  "2013-08": 128.0,
  "2013-09": 140.0,
  "2013-10": 198.0,
  "2013-11": 1075.0,
  "2013-12": 755.0,

  // 2014
  "2014-01": 810.0,
  "2014-02": 620.0,
  "2014-03": 453.0,
  "2014-04": 450.0,
  "2014-05": 630.0,
  "2014-06": 640.0,
  "2014-07": 585.0,
  "2014-08": 480.0,
  "2014-09": 390.0,
  "2014-10": 340.0,
  "2014-11": 375.0,
  "2014-12": 320.0,

  // 2015
  "2015-01": 217.0,
  "2015-02": 254.0,
  "2015-03": 244.0,
  "2015-04": 236.0,
  "2015-05": 229.0,
  "2015-06": 262.0,
  "2015-07": 284.0,
  "2015-08": 230.0,
  "2015-09": 237.0,
  "2015-10": 314.0,
  "2015-11": 376.0,
  "2015-12": 430.0,

  // 2016
  "2016-01": 379.0,
  "2016-02": 437.0,
  "2016-03": 416.0,
  "2016-04": 448.0,
  "2016-05": 530.0,
  "2016-06": 672.0,
  "2016-07": 629.0,
  "2016-08": 572.0,
  "2016-09": 609.0,
  "2016-10": 697.0,
  "2016-11": 742.0,
  "2016-12": 963.0,

  // 2017
  "2017-01": 966.0,
  "2017-02": 1190.0,
  "2017-03": 1080.0,
  "2017-04": 1348.0,
  "2017-05": 2280.0,
  "2017-06": 2490.0,
  "2017-07": 2875.0,
  "2017-08": 4760.0,
  "2017-09": 4330.0,
  "2017-10": 6120.0,
  "2017-11": 10950.0,
  "2017-12": 14900.0,

  // 2018
  "2018-01": 10200.0,
  "2018-02": 10300.0,
  "2018-03": 6920.0,
  "2018-04": 9240.0,
  "2018-05": 7480.0,
  "2018-06": 5870.0,
  "2018-07": 6480.0,
  "2018-08": 7040.0,
  "2018-09": 6620.0,
  "2018-10": 6380.0,
  "2018-11": 4010.0,
  "2018-12": 3710.0,

  // 2019
  "2019-01": 3450.0,
  "2019-02": 3780.0,
  "2019-03": 4090.0,
  "2019-04": 5350.0,
  "2019-05": 8570.0,
  "2019-06": 10800.0,
  "2019-07": 10080.0,
  "2019-08": 10640.0,
  "2019-09": 8290.0,
  "2019-10": 9190.0,
  "2019-11": 7560.0,
  "2019-12": 7190.0,

  // 2020
  "2020-01": 9350.0,
  "2020-02": 9900.0,
  "2020-03": 6420.0,
  "2020-04": 8590.0,
  "2020-05": 9450.0,
  "2020-06": 9130.0,
  "2020-07": 11350.0,
  "2020-08": 11650.0,
  "2020-09": 10780.0,
  "2020-10": 13800.0,
  "2020-11": 19700.0,
  "2020-12": 29000.0,

  // 2021
  "2021-01": 33100.0,
  "2021-02": 45200.0,
  "2021-03": 58800.0,
  "2021-04": 57700.0,
  "2021-05": 37300.0,
  "2021-06": 35000.0,
  "2021-07": 41400.0,
  "2021-08": 47200.0,
  "2021-09": 43790.0,
  "2021-10": 61300.0,
  "2021-11": 57000.0,
  "2021-12": 46300.0,

  // 2022
  "2022-01": 38400.0,
  "2022-02": 43200.0,
  "2022-03": 45500.0,
  "2022-04": 37700.0,
  "2022-05": 31800.0,
  "2022-06": 19700.0,
  "2022-07": 23300.0,
  "2022-08": 20000.0,
  "2022-09": 19400.0,
  "2022-10": 20500.0,
  "2022-11": 17100.0,
  "2022-12": 16500.0,

  // 2023
  "2023-01": 23100.0,
  "2023-02": 23100.0,
  "2023-03": 28500.0,
  "2023-04": 29400.0,
  "2023-05": 27200.0,
  "2023-06": 30400.0,
  "2023-07": 29200.0,
  "2023-08": 26000.0,
  "2023-09": 27000.0,
  "2023-10": 34500.0,
  "2023-11": 37600.0,
  "2023-12": 42200.0,

  // 2024
  "2024-01": 42500.0,
  "2024-02": 51800.0,
  "2024-03": 69500.0,
  "2024-04": 63500.0,
  "2024-05": 67800.0,
  "2024-06": 60500.0,
  "2024-07": 64500.0,
  "2024-08": 70000.0,
  "2024-09": 64000.0,
  "2024-10": 73500.0,
  "2024-11": 98000.0,
  "2024-12": 96000.0,

  // 2025 (partial - through March)
  "2025-01": 104000.0,
  "2025-02": 95000.0,
  "2025-03": 87000.0,
};

// ── Live extension (audit D5) ────────────────────────────────────────────────
// The hardcoded table above ends 2025-03. Months after that are filled with
// monthly AVERAGE closes computed from Yahoo daily BTC-USD (same semantics as the
// table), and "now" uses the live spot price. Nothing here invents a number: if a
// source fails, the month is skipped or the fallback is labelled in the response.

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; BitcoinHub/1.0)' };

/** Average daily close per YYYY-MM (UTC) from Yahoo-style arrays. Pure, exported for tests. */
export function monthlyAveragesFromDaily(timestampsSec: number[], closes: (number | null)[]): Record<string, number> {
  const sums: Record<string, { s: number; n: number }> = {};
  timestampsSec.forEach((t, i) => {
    const c = closes[i];
    if (typeof c !== 'number' || !Number.isFinite(c) || c <= 0) return;
    const k = new Date(t * 1000).toISOString().slice(0, 7);
    (sums[k] ??= { s: 0, n: 0 }).s += c;
    sums[k].n += 1;
  });
  const out: Record<string, number> = {};
  for (const [k, { s, n }] of Object.entries(sums)) out[k] = Math.round((s / n) * 100) / 100;
  return out;
}

/** Table + live months; table values win where both exist. Pure, exported for tests. */
export function mergeMonthly(table: Record<string, number>, live: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = { ...table };
  for (const [k, v] of Object.entries(live)) if (!(k in out)) out[k] = v;
  return out;
}

async function fetchLiveMonthlyAverages(fromISO: string): Promise<Record<string, number>> {
  try {
    const p1 = Math.floor(new Date(fromISO + 'T00:00:00Z').getTime() / 1000);
    const p2 = Math.floor(Date.now() / 1000);
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?period1=${p1}&period2=${p2}&interval=1d`, { headers: UA, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return {};
    const j: any = await r.json();
    const res = j?.chart?.result?.[0];
    return monthlyAveragesFromDaily(res?.timestamp ?? [], res?.indicators?.quote?.[0]?.close ?? []);
  } catch { return {}; }
}

async function fetchLiveSpot(): Promise<{ price: number; source: string } | null> {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', { headers: UA, signal: AbortSignal.timeout(6000) });
    if (r.ok) { const j: any = await r.json(); const v = Number(j?.bitcoin?.usd); if (v > 0) return { price: v, source: 'CoinGecko' }; }
  } catch { /* fall through */ }
  try {
    const r = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot', { headers: UA, signal: AbortSignal.timeout(6000) });
    if (r.ok) { const j: any = await r.json(); const v = Number(j?.data?.amount); if (v > 0) return { price: v, source: 'Coinbase' }; }
  } catch { /* fall through */ }
  return null;
}

interface DCAResult {
  totalInvested: number;
  btcAccumulated: number;
  currentValue: number;
  totalReturn: number;
  returnPercent: number;
  satsAccumulated: number;
  priceAtStart: number;
  priceNow: number;
  priceNowSource: string;
  pricesThrough: string;
  monthsInvested: number;
  dataPoints: Array<{
    date: string;
    btcHeld: number;
    usdValue: number;
  }>;
}

/** Pure DCA math over a monthly price map. Exported for tests. */
export function calculateDCA(
  monthlyAmount: number,
  startYear: number,
  prices: Record<string, number> = BTC_MONTHLY_PRICES,
  spot: { price: number; source: string } | null = null,
  now: Date = new Date()
): DCAResult {
  const keys = Object.keys(prices).sort();
  const lastKey = keys[keys.length - 1];
  const currentBTCPrice = spot?.price ?? prices[lastKey];
  const priceNowSource = spot ? `${spot.source} spot (live)` : `monthly average ${lastKey} (live price unavailable)`;
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;

  let totalInvested = 0;
  let btcAccumulated = 0;
  const dataPoints: Array<{ date: string; btcHeld: number; usdValue: number }> = [];
  let priceAtStart = 0;
  let monthsInvested = 0;

  for (let year = startYear; year <= currentYear; year++) {
    const endMonth = year === currentYear ? currentMonth : 12;
    for (let month = 1; month <= endMonth; month++) {
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;
      const price = prices[monthKey];
      if (!price) continue;
      if (priceAtStart === 0) priceAtStart = price;
      btcAccumulated += monthlyAmount / price;
      totalInvested += monthlyAmount;
      monthsInvested++;
      dataPoints.push({
        date: monthKey,
        btcHeld: parseFloat(btcAccumulated.toFixed(8)),
        usdValue: parseFloat((btcAccumulated * currentBTCPrice).toFixed(2)),
      });
    }
  }

  const currentValue = btcAccumulated * currentBTCPrice;
  const totalReturn = currentValue - totalInvested;
  const returnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  return {
    totalInvested: Math.round(totalInvested * 100) / 100,
    btcAccumulated: parseFloat(btcAccumulated.toFixed(8)),
    currentValue: Math.round(currentValue * 100) / 100,
    totalReturn: Math.round(totalReturn * 100) / 100,
    returnPercent: Math.round(returnPercent * 100) / 100,
    satsAccumulated: Math.floor(btcAccumulated * 100000000),
    priceAtStart: Math.round(priceAtStart * 100) / 100,
    priceNow: Math.round(currentBTCPrice * 100) / 100,
    priceNowSource,
    pricesThrough: dataPoints.length ? dataPoints[dataPoints.length - 1].date : lastKey,
    monthsInvested,
    dataPoints,
  };
}

// GET /api/dca-simulator



export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const monthly = parseInt((req.query.monthly as string) || '50', 10);
    const startYear = parseInt((req.query.startYear as string) || '2020', 10);

    if (monthly < 10 || monthly > 1000) {
      return err(res, 400, 'Monthly amount must be between $10 and $1000');
    }
    const thisYear = new Date().getUTCFullYear();
    if (startYear < 2012 || startYear > thisYear) {
      return err(res, 400, `Start year must be between 2012 and ${thisYear}`);
    }

    const [live, spot] = await Promise.all([fetchLiveMonthlyAverages('2025-04-01'), fetchLiveSpot()]);
    const result = calculateDCA(monthly, startYear, mergeMonthly(BTC_MONTHLY_PRICES, live), spot);
    return ok(res, result);
  } catch (e: any) {
    console.error('DCA simulator error:', e);
    return err(res, 500, 'Failed to calculate DCA results');
  }
}
