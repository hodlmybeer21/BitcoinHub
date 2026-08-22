// BitcoinHub — About / Docs / Methodology / FAQ
// Single-page reference covering what BitcoinHub is, how the data and
// blocks are computed, where the data comes from, and answers to the
// questions retail users actually ask. Phase 9, 2026-08-19 (item B).

'use client';

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import {
  BookOpen, Database, Sparkles, AlertCircle, Hammer,
  TrendingUp, BarChart3, Layers, Shield,
} from 'lucide-react';

interface DataSource {
  name: string;
  what: string;
  url?: string;
  updateFreq: string;
  coverage: string;
}

const DATA_SOURCES: DataSource[] = [
  {
    name: 'FRED (St. Louis Fed)',
    what: 'US macro series — Fed balance sheet, reverse repo, Treasury yields, mortgage rates, CPI, unemployment, breakevens, M1 money supply.',
    url: 'https://fred.stlouisfed.org/',
    updateFreq: 'daily / weekly / monthly',
    coverage: '1948 → present (varies by series)',
  },
  {
    name: 'CoinGecko',
    what: 'BTC spot price, market cap, dominance, 24h volume. Free tier, no API key needed for the calls we make.',
    url: 'https://www.coingecko.com/api/documentation',
    updateFreq: 'on-demand (5min cache)',
    coverage: '2013 → present',
  },
  {
    name: 'Yahoo Finance',
    what: 'BTC-USD daily closes (full 2014+ history), S&P 500, DXY, Gold, VIX, Treasury 10Y, plus ETF proxies IBIT / FBTC and equities MSTR / COIN / MARA / RIOT for the multi-asset backtest.',
    url: 'https://finance.yahoo.com/',
    updateFreq: 'on-demand (1h OHLC cache)',
    coverage: 'varies by symbol',
  },
  {
    name: 'alternative.me',
    what: 'Crypto Fear & Greed Index — sentiment composite from volatility, momentum, social media, surveys, dominance, trends.',
    url: 'https://alternative.me/crypto/fear-and-greed-index/',
    updateFreq: 'daily',
    coverage: '2018-02-01 → present',
  },
  {
    name: 'mempool.space',
    what: 'Real-time mempool txs ≥ 100 BTC (whale alerts), block iteration (hashrate + active-addresses proxy).',
    url: 'https://mempool.space/docs/api',
    updateFreq: 'on-demand',
    coverage: 'live',
  },
  {
    name: 'OKX public funding',
    what: 'BTC perp funding rate. Replaces Bybit (403 on serverless) and Binance (geo-blocked).',
    updateFreq: '8h funding cycle',
    coverage: 'live',
  },
  {
    name: 'Deribit',
    what: 'BTC options put/call ratio.',
    updateFreq: 'on-demand',
    coverage: 'live',
  },
  {
    name: 'Coinbase Exchange public candles',
    what: 'BTC-USD daily closes primary source (CryptoCompare retired free tier ~2024; CoinGecko tightened free historical range to ≤365d).',
    updateFreq: 'on-demand (1h cache)',
    coverage: '2015 → present',
  },
];

interface MethodologyItem {
  family: string;
  what: string;
  source: string;
  notes: string;
}

const METHODOLOGY: MethodologyItem[] = [
  {
    family: 'Price (btc.price, btc.dominance)',
    what: 'BTC-USD daily closes from Coinbase Exchange; dominance from CoinGecko global market cap.',
    source: 'Coinbase Exchange public candles / CoinGecko',
    notes: '1h in-memory cache; cold-start fetches ~1–2s.',
  },
  {
    family: 'Risk (risk.metric, risk.bmsb, risk.pi-cycle, risk.cycle-pos)',
    what: 'Composite risk = 0.55·z + 0.20·rsi + 0.15·cycle + 0.10·d200w_norm. BMSB = 20w SMA + 21w EMA on ~100d/105d windows. Pi Cycle = 350d MA × 2 vs 111d MA.',
    source: 'BTC daily closes (Coinbase / CoinGecko)',
    notes: 'Asset scope: BTC only (10y history → stable 4y z-score window). 6 risk bands (extreme_fear → extreme_greed).',
  },
  {
    family: 'Sentiment (fear_greed.value)',
    what: 'Crypto Fear & Greed Index.',
    source: 'alternative.me',
    notes: 'Daily update; 2018-02-01 → present.',
  },
  {
    family: 'Funding / Options (funding.bybit, options.put_call)',
    what: 'BTC perp funding rate; BTC options put/call ratio.',
    source: 'OKX public funding / Deribit',
    notes: 'Replaces Bybit (403 on serverless) + Binance (geo-blocked).',
  },
  {
    family: 'Macro (macro.cpi_yoy, macro.unemployment, macro.dxy, …)',
    what: 'US macro series via FRED. CPIAUCSL / CPILFESL auto-applied YoY transform.',
    source: 'FRED API (api.stlouisfed.org)',
    notes: '1h in-memory cache. Monthly series have 1–2 month FRED publication lag — surfaced as `dataLagDays` in API response so UI shows "as of YYYY-MM".',
  },
  {
    family: 'On-chain (onchain.hashrate, onchain.active_addresses)',
    what: 'BTC hashrate from mempool.space mining API; active-addresses is a daily tx-count proxy (blockchain.info/charts/active-addresses was deprecated upstream).',
    source: 'mempool.space',
    notes: 'active-addresses is honestly a proxy (not true unique-address count) — description updated to reflect this.',
  },
  {
    family: 'Premium (premium.demark, premium.elliott, premium.wyckoff, premium.whale_activity)',
    what: 'DeMark Setup count, Elliott Wave position, Wyckoff phase — all derived from BTC OHLCV via Yahoo Finance (shared 1h OHLC cache). Whale activity self-calls /api/whale-alerts for mempool txs ≥ 100 BTC.',
    source: 'Yahoo Finance + mempool.space',
    notes: 'Phase 7 / 2026-08-19. Whale value is real-time snapshot (fluctuates with mempool state).',
  },
  {
    family: 'Valuation (valuation.puell, valuation.mvrv_z, valuation.dxy_corr, valuation.nvt)',
    what: 'Puell Multiple (daily issuance / 365d MA issuance in USD); MVRV Z-score; DXY rolling 30d Pearson correlation vs BTC; NVT (network value / tx value).',
    source: 'Coinbase BTC closes + DXY (Yahoo)',
    notes: 'Phase A / 2026-08-19. Shared BTC/DXY Yahoo cache (1h TTL).',
  },
];

interface FAQ {
  q: string;
  a: string;
}

const FAQS: FAQ[] = [
  {
    q: 'What is BitcoinHub?',
    a: 'A comprehensive Bitcoin analytics hub for retail users. Live data, custom indicators via the Workbench (no code), backtesting, and a community gallery — all in one place.',
  },
  {
    q: 'Is this financial advice?',
    a: 'No. BitcoinHub is an analytics and education tool. Nothing here is a recommendation to buy, sell, or hold. Indicators can be wrong, lag, or break. Always do your own research.',
  },
  {
    q: 'Where does the data come from?',
    a: 'Free, public, no-key-required APIs: FRED (US macro), CoinGecko (BTC market data), Yahoo Finance (price + ETF proxies + equities), alternative.me (Fear & Greed), mempool.space (on-chain), OKX (funding), Deribit (options). See the Data Sources table above for the full list.',
  },
  {
    q: 'How is the Risk Indicator computed?',
    a: 'Composite risk (0–1) = 0.55·z + 0.20·rsi + 0.15·cycle + 0.10·d200w_norm. Mayer z-score is the dominant signal (0.55). 6 bands (extreme_fear → extreme_greed). Asset scope is BTC only because the 4y z-score window needs ≥10y of history. ETH and others are Phase 7+ work.',
  },
  {
    q: 'Why does the Workbench show a flat zero line for some blocks?',
    a: 'Shouldn\'t anymore — as of 2026-08-19 the Workbench evaluator pads missing data with NaN (renders as a gap), not 0 (misleading zero line). If you still see a flat zero, the block fetcher probably returned empty — check the Workbench\'s error panel for the exact reason.',
  },
  {
    q: 'How does backtesting work?',
    a: 'Replays your Workbench formula as a daily long/cash strategy over BTC daily closes (or a multi-asset portfolio). signal_t > 0 → hold target asset for return t→t+1; signal_t = 0 → cash. No look-ahead bias (signal at end of day t is applied to next day\'s return). Default range: 2016-01-01 → today (~10.6y of BTC history).',
  },
  {
    q: 'Why is CPI 1–2 months behind?',
    a: 'FRED publication lag. CPI for June is published in mid-July. The /api/fred/data response now includes a `dataLagDays` field so the UI can show "as of Jul 2026" instead of misleading "today" data.',
  },
  {
    q: 'Do I need an account?',
    a: 'No — most of the site works without one. Saved formulas and backtests live in your browser localStorage. Publishing to the community gallery uses an anonymous UUID (no PII). Account system is in the queue but not enabled.',
  },
  {
    q: 'How do I report a bug or request a feature?',
    a: 'Telegram @HodlMyBeer12 (Tyler) is the owner; he\'s responsive. For data issues, the API responses include enough metadata (sources, errors, dataLagDays, view counts) to triage most things.',
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-6 w-6 text-orange-500" />
            <h1 className="text-3xl font-bold">About BitcoinHub</h1>
          </div>
          <p className="text-muted-foreground max-w-3xl">
            A comprehensive Bitcoin analytics hub for retail users. Live data,
            custom indicators via the Workbench (no code), backtesting, and a
            community gallery — all in one place.
          </p>
        </div>

        {/* Mission */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              Mission
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Bitcoin is the most important monetary asset of the 21st century, but
              the tools retail users get are either locked behind paywalls, opaque
              about methodology, or require a Bloomberg terminal. BitcoinHub is
              the opposite: open, methodology-honest, free, no account needed.
            </p>
            <p>
              Every block documents its data source and computation. Every chart
              respects the publication lag of its source (FRED monthly series, for
              example, are 1–2 months behind). When a fetcher fails, charts show a
              gap — never a misleading zero line.
            </p>
          </CardContent>
        </Card>

        {/* What's here */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hammer className="h-5 w-5 text-orange-500" />
              What\'s here
            </CardTitle>
            <CardDescription>
              Quick links to the main features. Click any to jump in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              <Button asChild variant="outline" className="justify-start h-auto py-3">
                <Link href="/analytics">
                  <div className="text-left">
                    <div className="flex items-center gap-2 font-semibold">
                      <BarChart3 className="h-4 w-4" /> Live BTC Analytics
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Real-time price, dominance, mempool stats, network data
                    </div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-3">
                <Link href="/risk">
                  <div className="text-left">
                    <div className="flex items-center gap-2 font-semibold">
                      <TrendingUp className="h-4 w-4" /> Risk Indicator
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Cycle-position score (0–1) with BMSB + Pi Cycle overlays
                    </div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-3">
                <Link href="/macro">
                  <div className="text-left">
                    <div className="flex items-center gap-2 font-semibold">
                      <Layers className="h-4 w-4" /> Macro Indicators
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Fed, Treasury, CPI, unemployment + 12 FRED series
                    </div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-3">
                <Link href="/workbench">
                  <div className="text-left">
                    <div className="flex items-center gap-2 font-semibold">
                      <Hammer className="h-4 w-4" /> Workbench
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Build custom indicators + backtest — no code
                    </div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-3">
                <Link href="/dca-simulator">
                  <div className="text-left">
                    <div className="flex items-center gap-2 font-semibold">
                      <BarChart3 className="h-4 w-4" /> DCA Simulator
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Compare dollar-cost averaging strategies
                    </div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-3">
                <Link href="/cycle">
                  <div className="text-left">
                    <div className="flex items-center gap-2 font-semibold">
                      <TrendingUp className="h-4 w-4" /> Cycle Position
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Where are we in the 4-year halving cycle?
                    </div>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Methodology */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-orange-500" />
              Methodology — how each block family is computed
            </CardTitle>
            <CardDescription>
              Every Workbench block documents its source + computation. This is the
              canonical reference.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {METHODOLOGY.map((m) => (
                <AccordionItem key={m.family} value={m.family}>
                  <AccordionTrigger className="text-sm font-medium">{m.family}</AccordionTrigger>
                  <AccordionContent className="text-sm space-y-2 text-muted-foreground">
                    <p><span className="font-semibold text-foreground">What:</span> {m.what}</p>
                    <p><span className="font-semibold text-foreground">Source:</span> {m.source}</p>
                    <p><span className="font-semibold text-foreground">Notes:</span> {m.notes}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Data Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-orange-500" />
              Data sources
            </CardTitle>
            <CardDescription>
              All sources are free, public, no-API-key-required (where possible).
              BitcoinHub doesn\'t sell your data and doesn\'t run ads.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DATA_SOURCES.map((s) => (
                <div key={s.name} className="border-b border-border/30 pb-3 last:border-b-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{s.name}</span>
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noopener noreferrer"
                         className="text-xs text-orange-400 hover:underline">
                        docs ↗
                      </a>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.what}</div>
                  <div className="flex items-center gap-3 mt-1 text-[10px]">
                    <Badge variant="outline" className="text-[10px]">freq: {s.updateFreq}</Badge>
                    <Badge variant="outline" className="text-[10px]">coverage: {s.coverage}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Privacy (§9 of the white paper) */}
        <Card id="privacy">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-500" />
              Privacy
            </CardTitle>
            <CardDescription>
              BitcoinHub's privacy stance, grounded in §9 of the white paper.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <blockquote className="border-l-2 border-primary/40 pl-4 italic text-muted-foreground/90">
              "The traditional banking model achieves a level of privacy by limiting
              access to information to the parties involved and the trusted third party.
              The necessity to announce all transactions publicly precludes this method,
              but privacy can still be maintained by breaking the flow of information
              in another place: by keeping public keys anonymous. The public can see
              that someone is sending an amount to someone else, but without information
              linking the transaction to anyone. A new key pair should be used for each
              transaction to keep them from being linked to a common owner."
              <footer className="text-xs not-italic mt-2 text-muted-foreground/70">
                — Satoshi Nakamoto, <em>Bitcoin: A Peer-to-Peer Electronic Cash System</em>, 2008, §9
              </footer>
            </blockquote>
            <p>
              Bitcoin is <strong className="text-foreground">pseudonymous, not anonymous</strong> —
              addresses are public, identities are not. BitcoinHub itself is even
              simpler: we run no third-party trackers, no advertising pixels, and no
              analytics cookies. The only tracking on this site is first-party (Vercel
              analytics) and we are happy to discuss the methodology or disable it
              on request.
            </p>
            <p>
              See <Link href="/sources"><span className="underline text-primary hover:text-primary/80 cursor-pointer">/sources</span></Link>{' '}
              for a full audit of every public API endpoint that powers a number on
              this site.
            </p>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently asked questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {FAQS.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-sm font-medium">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Limitations / honesty */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Limitations & honesty
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong className="text-foreground">Indicators can be wrong.</strong>{' '}
              Every block, every chart, every signal is a heuristic. None of them
              predict the future. Backtests show how a strategy would have
              performed historically — they tell you nothing about future
              performance. Past results ≠ future returns.
            </p>
            <p>
              <strong className="text-foreground">Data has lag.</strong> FRED macro
              series are 1–2 months behind. Whale alerts reflect mempool state at
              the moment of the request — they\'re not historical. Free public
              APIs have rate limits; if you hammer BitcoinHub, the upstream may
              throttle or 503 (the API correctly returns 503 in that case so you
              know to retry).
            </p>
            <p>
              <strong className="text-foreground">On-chain proxies.</strong>{' '}
              <code className="font-mono text-xs">onchain.active_addresses</code>{' '}
              is a tx-count proxy (blockchain.info deprecated their true
              active-addresses endpoint). The description in the Workbench says so
              honestly — it\'s not hidden.
            </p>
            <p>
              <strong className="text-foreground">No financial advice.</strong>{' '}
              BitcoinHub is an analytics and education tool. Nothing here is a
              recommendation to buy, sell, or hold.
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border/30">
          <p>
            BitcoinHub is built and maintained by <a href="https://t.me/HodlMyBeer12" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">@HodlMyBeer12</a> on Telegram.
            Last updated August 2026.
          </p>
        </div>
      </div>
    </div>
  );
}