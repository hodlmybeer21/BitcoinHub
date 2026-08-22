// BitcoinHub — /sources
// Free public data sources that power every number on BitcoinHub.
// We do not use paid feeds, do not sell your data, and do not run third-party trackers.
// Every endpoint below is either fully public (no key) or has a generous free tier.

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { Database, ExternalLink, ArrowLeft } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';

type SourceCategory = 'macro' | 'price' | 'onchain' | 'derivatives' | 'sentiment';

interface SourceItem {
  name: string;
  url: string;
  powers: string;
  frequency: string;
  coverage: string;
  category: SourceCategory;
}

const SOURCES: SourceItem[] = [
  // Macro / rates
  {
    name: 'FRED — St. Louis Fed (CSV API)',
    url: 'https://fred.stlouisfed.org/',
    powers: 'US macro series — Fed balance sheet (WALCL), reverse repo (RRPONTSYD), M1/M2 money supply (M1SL, M2SL), 2s10s spread (T10Y2Y), 3m10y spread (T10Y3M), 30Y mortgage (MORTGAGE30US), 5y5y breakeven (T5YIE), CPI/CPILFESL, unemployment (UNRATE), initial jobless claims (ICSA), NFCI. Drives the /macro dashboard and the M2 / 10Y TNX tiles on /analytics.',
    frequency: 'daily / weekly / monthly (per series)',
    coverage: '1948 → present (varies by series)',
    category: 'macro',
  },
  {
    name: 'NY Fed Markets — Effective Fed Funds Rate',
    url: 'https://markets.newyorkfed.org/api/rates/unsecured/effr/last/30.json',
    powers: 'Current EFFR + target range + 30-day trajectory. Drives the FedWatch tile on /analytics.',
    frequency: 'daily (cached 30 min)',
    coverage: 'last 30 days',
    category: 'macro',
  },

  // BTC price & market data
  {
    name: 'Coinbase Exchange — public candles',
    url: 'https://docs.cdp.coinbase.com/exchange/reference/exchangerestapi_getproductcandles',
    powers: 'Primary BTC-USD daily-close source. Drives /api/bitcoin/market-data, the cycle-position widget, the /cycle page, and /api/btc/history. Coverage 2015 → present.',
    frequency: 'on-demand (1h cache)',
    coverage: '2015 → present',
    category: 'price',
  },
  {
    name: 'Yahoo Finance — BTC-USD + proxies',
    url: 'https://finance.yahoo.com/quote/BTC-USD/',
    powers: 'BTC-USD daily closes (full 2014-09 → present history for cycle backfill), S&P 500, DXY, Gold, VIX, 10Y Treasury, plus ETF proxies IBIT / FBTC and equities MSTR / COIN / MARA / RIOT for the multi-asset backtest in /workbench.',
    frequency: 'on-demand (1h cache)',
    coverage: '2014-09 → present (BTC); varies by symbol',
    category: 'price',
  },
  {
    name: 'Bitstamp public OHLC (backfill)',
    url: 'https://www.bitstamp.net/api/v2/ohlc/btcusd/',
    powers: 'BTC-USD daily closes for the pre-Yahoo era (Jan 1 2014 → Sep 16 2014). Merged with Yahoo in /api/btc/monthly so the monthly heatmap can show the full back-to-2014 history.',
    frequency: 'on-demand (10min cache)',
    coverage: '2013-11 → 2014-09 (gap-filler only)',
    category: 'price',
  },
  {
    name: 'CoinGecko',
    url: 'https://www.coingecko.com/api/documentation',
    powers: 'BTC market cap, dominance, 24h volume. Drives /api/bitcoin/market-data. Free tier, no API key for the calls we make.',
    frequency: 'on-demand (5min cache)',
    coverage: '2013 → present',
    category: 'price',
  },

  // On-chain
  {
    name: 'mempool.space',
    url: 'https://mempool.space/docs/api',
    powers: 'Real-time mempool txs ≥ 100 BTC (whale alerts), block iteration (hashrate + active-addresses proxy). Drives /api/whale-alerts and on-chain metrics on the analytics dashboard.',
    frequency: 'on-demand',
    coverage: 'live',
    category: 'onchain',
  },

  // Derivatives & options
  {
    name: 'Deribit — public options',
    url: 'https://docs.deribit.com/',
    powers: 'BTC options put/call ratio, top strikes, recent trades near current price. Drives /api/options-flow and the OI-based liquidation zones widget on /analytics.',
    frequency: 'on-demand',
    coverage: 'live',
    category: 'derivatives',
  },
  {
    name: 'OKX public funding',
    url: 'https://www.okx.com/docs-v5/en/#public-data-rest-api',
    powers: 'BTC perp funding rate. Replaces Bybit (403 on serverless) and Binance (geo-blocked). Drives /api/funding-rates.',
    frequency: '8h funding cycle',
    coverage: 'live',
    category: 'derivatives',
  },

  // Sentiment
  {
    name: 'alternative.me — Crypto Fear & Greed Index',
    url: 'https://alternative.me/crypto/fear-and-greed-index/',
    powers: 'Crypto Fear & Greed Index — sentiment composite from volatility, momentum, social media, surveys, dominance, trends. Drives the F&G tile on the home hero and /analytics tier 1.',
    frequency: 'daily',
    coverage: '2018-02-01 → present',
    category: 'sentiment',
  },
];

const CATEGORY_META: Record<SourceCategory, { label: string; cls: string }> = {
  macro:       { label: 'Macro / rates',            cls: 'bg-blue-500/10   text-blue-400   border-blue-500/30' },
  price:       { label: 'BTC price & market',       cls: 'bg-amber-500/10  text-amber-400  border-amber-500/30' },
  onchain:     { label: 'On-chain',                 cls: 'bg-green-500/10  text-green-400  border-green-500/30' },
  derivatives: { label: 'Derivatives & options',    cls: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  sentiment:   { label: 'Sentiment',                cls: 'bg-rose-500/10   text-rose-400   border-rose-500/30' },
};
const CATEGORY_ORDER: SourceCategory[] = ['macro', 'price', 'onchain', 'derivatives', 'sentiment'];

export default function Sources() {
  const byCat = SOURCES.reduce<Record<SourceCategory, SourceItem[]>>(
    (acc, s) => {
      (acc[s.category] = acc[s.category] || []).push(s);
      return acc;
    },
    { macro: [], price: [], onchain: [], derivatives: [], sentiment: [] } as Record<SourceCategory, SourceItem[]>,
  );

  return (
    <ErrorBoundary label="Sources page">
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <header className="mb-10">
            <Badge variant="outline" className="mb-4 border-primary/40 text-primary">
              <Database className="inline w-3 h-3 mr-1" />
              Our sources
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-4">
              Every number traces to a public endpoint.
            </h1>
            <p className="text-base text-muted-foreground max-w-3xl leading-relaxed">
              BitcoinHub does not use paid feeds. We do not sell your data. We do not run
              third-party trackers on the site. Every chart, KPI, and risk number on
              BitcoinHub is computed from one of the free public APIs below — most
              require no API key, all are documented, and every entry links to the
              original source.
            </p>
          </header>

          {CATEGORY_ORDER.map((cat) => {
            const items = byCat[cat];
            if (items.length === 0) return null;
            const meta = CATEGORY_META[cat];
            return (
              <section key={cat} className="mb-8">
                <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">
                  {meta.label}
                </h2>
                <div className="space-y-3">
                  {items.map((s) => (
                    <Card key={s.name} className="bg-card border-muted/20">
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-base">{s.name}</CardTitle>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-orange-400 hover:underline inline-flex items-center gap-0.5"
                          >
                            docs <ExternalLink className="w-3 h-3" />
                          </a>
                          <Badge variant="outline" className={`text-[10px] ${meta.cls}`}>
                            {meta.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 pt-0">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {s.powers}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[10px]">
                          <Badge variant="outline" className="text-[10px]">
                            freq: {s.frequency}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            coverage: {s.coverage}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}

          <footer className="mt-12 pt-8 border-t border-muted/20 text-sm text-muted-foreground/80 space-y-3">
            <p>
              BitcoinHub does not run Google Analytics, Meta Pixel, or any other third-party
              tracker on this site. The only tracking is first-party (Vercel analytics) and
              we are happy to discuss the methodology in our{' '}
              <Link href="/about">
                <span className="underline text-primary hover:text-primary/80 cursor-pointer">
                  /about page
                </span>
              </Link>{' '}
              or in our{' '}
              <Link href="/about#privacy">
                <span className="underline text-primary hover:text-primary/80 cursor-pointer">
                  privacy section
                </span>
              </Link>
              .
            </p>
            <p className="text-xs">
              Last verified 2026-08-21. If a source is unreachable, the relevant tile
              shows the last cached value with a "stale" indicator rather than a blank screen.
            </p>
            <Link href="/thesis">
              <span className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 cursor-pointer mt-2">
                <ArrowLeft className="w-3 h-3" /> The white paper breakdown (10 sections)
              </span>
            </Link>
          </footer>
        </div>
      </div>
    </ErrorBoundary>
  );
}
