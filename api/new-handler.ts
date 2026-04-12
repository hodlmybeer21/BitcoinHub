import express from "express";
import type { Request, Response } from "express";

const app = express();
app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", ts: Date.now() });
});

// Bitcoin market data
app.get("/api/bitcoin/market-data", async (_req: Request, res: Response) => {
  try {
    const { getBitcoinMarketData } = await import("../server/api/coingecko.js");
    const data = await getBitcoinMarketData();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bitcoin chart
app.get("/api/bitcoin/chart", async (req: Request, res: Response) => {
  try {
    const { getBitcoinChart } = await import("../server/api/coingecko.js");
    const timeframe = req.query.timeframe as string || "1D";
    const data = await getBitcoinChart(timeframe);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bitcoin dominance
app.get("/api/bitcoin/dominance", async (_req: Request, res: Response) => {
  try {
    const { getBitcoinDominance } = await import("../server/api/dominance.js");
    const data = await getBitcoinDominance();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Network stats
app.get("/api/bitcoin/network-stats", async (_req: Request, res: Response) => {
  try {
    const { getBitcoinNetworkStats } = await import("../server/api/blockchain.js");
    const data = await getBitcoinNetworkStats();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fear & Greed
app.get("/api/web-resources/fear-greed", async (_req: Request, res: Response) => {
  try {
    const { getFearGreedData } = await import("../server/api/webResources.js");
    const data = await getFearGreedData();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Financial markets (S&P 500, DXY, Gold, VIX)
app.get("/api/financial/markets", async (_req: Request, res: Response) => {
  try {
    const { getFinancialMarketData } = await import("../server/api/financial.js");
    const data = await getFinancialMarketData();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Global crypto metrics
app.get("/api/crypto/global-metrics", async (_req: Request, res: Response) => {
  try {
    const { getGlobalCryptoMetrics } = await import("../server/api/dominance.js");
    const data = await getGlobalCryptoMetrics();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Liquidity
app.get("/api/liquidity", async (_req: Request, res: Response) => {
  try {
    const { getLiquidityData } = await import("../server/api/liquidity.js");
    const data = await getLiquidityData();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Whale alerts — inline fetch to avoid module path issues
app.get("/api/whale-alerts", async (_req: Request, res: Response) => {
  try {
    // Fetch BTC price
    const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const priceData = await priceRes.json();
    const btcPrice = priceData.bitcoin?.usd || 70000;

    // Fetch unconfirmed transactions
    const txRes = await fetch('https://blockchain.info/unconfirmed-transactions?format=json');
    if (!txRes.ok) throw new Error('Blockchain API error');
    const txData = await txRes.json();
    const allTransactions = txData.txs || [];

    const KNOWN_EXCHANGES = new Set([
      '1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s',
      '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo',
      '3D2oetdNuZUqQHPJmcMDDHYoqkyNVsFk9r',
      'bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97',
      'bc1qa5wkgaew2dkv56kfvj49j0av5nml45x9ek9hz6'
    ]);

    const classifyTransaction = (from: string, to: string) => {
      const fromEx = KNOWN_EXCHANGES.has(from);
      const toEx = KNOWN_EXCHANGES.has(to);
      if (fromEx && toEx) return 'large_transfer';
      if (toEx) return 'exchange_inflow';
      if (fromEx) return 'exchange_outflow';
      return 'unknown';
    };

    const calculateSignificance = (amountBTC: number) => {
      if (amountBTC >= 500) return 'high';
      if (amountBTC >= 200) return 'medium';
      return 'low';
    };

    const whales = [];
    for (const tx of allTransactions) {
      const totalOutput = tx.out.reduce((sum: number, o: any) => sum + o.value, 0);
      const amountBTC = totalOutput / 100000000;
      if (amountBTC >= 100) {
        const from = tx.inputs?.[0]?.prev_out?.addr || 'Unknown';
        const to = tx.out?.[0]?.addr || 'Unknown';
        whales.push({
          hash: tx.hash,
          timestamp: tx.time * 1000,
          amount: amountBTC,
          amountUSD: amountBTC * btcPrice,
          from,
          to,
          type: classifyTransaction(from, to),
          significance: calculateSignificance(amountBTC)
        });
      }
      if (whales.length >= 20) break;
    }

    whales.sort((a: any, b: any) => b.timestamp - a.timestamp);

    res.json({
      transactions: whales.slice(0, 20),
      currentPrice: btcPrice,
      totalVolume24h: whales.reduce((s: number, w: any) => s + w.amountUSD, 0),
      largestTransaction: whales[0] || null,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, transactions: [] });
  }
});

// Options flow — inline from Deribit
app.get("/api/options-flow", async (_req: Request, res: Response) => {
  try {
    const [btcRes, ethRes] = await Promise.all([
      fetch('https://www.deribit.com/api/v6/public/get_book_summary_by_currency?currency=BTC&kind=option'),
      fetch('https://www.deribit.com/api/v6/public/get_book_summary_by_currency?currency=ETH&kind=option')
    ]);

    const btcData = await btcRes.json();
    const ethData = await ethRes.json();

    const btcOptions = btcData.result || [];
    const ethOptions = ethData.result || [];

    const aggregateOptions = (options: any[]) => {
      const puts = options.filter((o: any) => o.underlying.includes('put'));
      const calls = options.filter((o: any) => o.underlying.includes('call'));
      const putOI = puts.reduce((s: number, o: any) => s + (o.open_interest || 0), 0);
      const callOI = calls.reduce((s: number, o: any) => s + (o.open_interest || 0), 0);
      const putVol = puts.reduce((s: number, o: any) => s + (o.volume || 0), 0);
      const callVol = calls.reduce((s: number, o: any) => s + (o.volume || 0), 0);
      return {
        putCallRatio: callOI > 0 ? putOI / callOI : 0,
        totalOI: putOI + callOI,
        totalVolume: putVol + callVol,
        putCallVolumeRatio: callVol > 0 ? putVol / callVol : 0,
        netDelta: callOI - putOI,
        sentiment: callOI > putOI ? 'bullish' : callOI < putOI ? 'bearish' : 'neutral'
      };
    };

    const btcAgg = aggregateOptions(btcOptions);
    const ethAgg = aggregateOptions(ethOptions);

    // Top strikes by open interest
    const topStrikes = [...btcOptions]
      .sort((a: any, b: any) => (b.open_interest || 0) - (a.open_interest || 0))
      .slice(0, 8)
      .map((o: any) => ({
        symbol: o.underlying.replace('BTC-', '').replace('ETH-', ''),
        strike: o.strike || 0,
        type: o.underlying?.includes('put') ? 'put' : 'call',
        openInterest: o.open_interest || 0,
        volume: o.volume || 0,
        iv: o.implied_volatility || 0,
        markPrice: o.mark_price || 0
      }));

    res.json({
      btc: btcAgg,
      eth: ethAgg,
      topStrikes,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Funding rates from Bybit
app.get("/api/funding-rates", async (_req: Request, res: Response) => {
  try {
    const response = await fetch(
      'https://api.bybit.com/v5/market/institutes-data?category=linear&limit=5',
      { headers: { 'X-BAPI-API-KEY': '', 'X-BAPI-SIGN': '', 'X-BAPI-SIGN-TYPE': '2' } }
    );
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    // Fall back to Deribit for funding
    try {
      const deribitRes = await fetch('https://www.deribit.com/api/v6/public/get_funding_rate_history?currency=BTC&hours=24');
      const deribitData = await deribitRes.json();
      const rates = deribitData.result || [];
      const latestRate = rates[0]?.rate || 0;
      const avgFunding = rates.reduce((s: number, r: any) => s + r.rate, 0) / (rates.length || 1);
      res.json({
        latestRate: latestRate * 100,
        avg24h: avgFunding * 100,
        nextFundingTime: rates[0]?.predicted_time || null,
        fundingRate: latestRate * 100,
        basisRate: rates[0]?.basis || 0
      });
    } catch (e2: any) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Fallback 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "not found" });
});

export default async function handler(req: any, res: any): Promise<void> {
  return new Promise((resolve) => {
    res.on("finish", () => resolve());
    res.on("error", () => resolve());
    setTimeout(() => resolve(), 25000);
    app(req, res);
  });
}
