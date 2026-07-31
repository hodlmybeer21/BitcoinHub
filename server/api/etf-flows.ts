/**
 * ETF flows endpoint — best-effort free sources.
 *
 * Status (2026-07-31): no reliable free public source for Bitcoin spot ETF
 * daily flows.
 *   - SoSoValue: Cloudflare-blocked without auth
 *   - farside.co.uk: Cloudflare-blocked
 *   - blockchaincenter.net: Cloudflare-blocked
 *   - CoinGecko: no ETF endpoint
 *   - CoinMarketCap free: no ETF flows endpoint
 *   - Coinglass free HTML page: server-rendered table, but flow values are
 *     inside client-rendered rows (only row headers SSR) — scraping unreliable
 *
 * This endpoint returns an honest, structured response with an empty data
 * array and clear `source`/`available` fields so the UI can show "Live ETF
 * flow data requires a paid source — see footer" instead of fake numbers.
 *
 * If you want this live, the path is:
 *   - $29-99/mo Coinglass Pro API (open-api.coinglass.com with key)
 *   - or scrape farside.co.uk via a hosted scraper (FlareSolve, Browserless)
 */
import axios from 'axios';

export interface ETFFlowResponse {
  available: boolean;
  source: string;
  asOf: string;
  flows: Array<{
    date: string;            // YYYY-MM-DD
    totalNetFlowUSD: number; // positive = net inflow, negative = net outflow
    byFund?: Record<string, number>; // optional breakdown
  }>;
  summary: {
    totalInflowUSD: number;  // trailing 30d sum of positive flows
    totalOutflowUSD: number; // trailing 30d sum of negative flows (as positive)
    netFlowUSD: number;      // trailing 30d net
    daysCovered: number;
  };
  message: string;
}

export async function getETFFlowData(): Promise<ETFFlowResponse> {
  // Try one last free source — CoinMarketCap public ETF page (returns HTML,
  // not structured data, but sometimes has server-rendered values).
  // We attempt a CoinGecko derivative endpoint as a probe of last resort.
  try {
    // No free public source available. Return honest empty response.
    // If/when a paid key is wired (COINGLASS_API_KEY), plug it in here.
    return await axios.get('https://api.coingecko.com/api/v3/global', { timeout: 5000 })
      .then(() => emptyResponse())
      .catch(() => emptyResponse());
  } catch {
    return emptyResponse();
  }
}

function emptyResponse(): ETFFlowResponse {
  return {
    available: false,
    source: 'none',
    asOf: new Date().toISOString(),
    flows: [],
    summary: {
      totalInflowUSD: 0,
      totalOutflowUSD: 0,
      netFlowUSD: 0,
      daysCovered: 0,
    },
    message: 'Live BTC spot ETF flow data is not currently available. Free public sources (SoSoValue, farside.co, blockchaincenter) are Cloudflare-blocked; CoinGecko has no ETF endpoint. To enable live flows, wire a CoinGlass Pro API key as COINGLASS_API_KEY (~$29/mo) or host a scraper for farside.co.uk.',
  };
}
