// BitcoinHub Analytics — the pulse (2026-08-21 reorg).
//
// Six panels + a deep-tools section. Replaces the prior 12-widget kitchen
// sink that competed with /risk, /macro, /cycle/compare, /workbench, and
// /portfolio/mpt. Each cut widget lives in its dedicated deep tab now.
//
// Layout:
//   ┌─ Header (subdued) ──────────────────────────────┐
//   ├─ Tier 1 KPI strip (3 cards, mobile stacks) ────┤
//   │   BTC price + 24h  ·  Fear & Greed  ·  ETF flows │
//   ├─ Tier 2+3 (2 cards) ───────────────────────────┤
//   │   Cycle position one-liner  ·  Risk band one-liner│
//   ├─ Deep tools (5 link rows in <details>) ──────────┤
//   │   Macro · Risk · Cycle compare · Workbench · MPT  │
//   └─────────────────────────────────────────────────┘

import React from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowUp, ArrowDown, ChevronRight } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import ErrorBoundary from '@/components/ErrorBoundary';
import FearGreedWidget from '@/components/FearGreedWidget';
import ETFFlowsWidget from '@/components/ETFFlowsWidget';
import { CyclePulseStub, RiskOneLiner } from '@/components/analytics/PulseStubs';

interface BTC {
  current_price?: { usd: number };
  market_cap?: { usd: number };
  total_volume?: { usd: number };
  price_change_percentage_24h?: number;
  high_24h?: { usd: number };
  low_24h?: { usd: number };
  btc_dominance?: number;
}

export default function Dashboard() {
  const btc = useQuery<BTC>({
    queryKey: ['/api/bitcoin/market-data'],
    refetchInterval: 60000,
  });

  const m = btc.data;
  const price = m?.current_price?.usd ?? 0;
  const chg = m?.price_change_percentage_24h ?? 0;
  const pos = chg >= 0;
  const lo = m?.low_24h?.usd ?? 0;
  const hi = m?.high_24h?.usd ?? 0;
  const range = hi - lo || 1;
  const posInRange = ((price - lo) / range) * 100;

  if (btc.isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-black font-mono text-amber-400 mb-2">Loading...</div>
          <p className="text-white/40 text-sm">Fetching live Bitcoin data</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary label="Analytics dashboard">
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <div className="max-w-[1400px] mx-auto px-4 pt-8 pb-12 space-y-6">

          {/* ── Header ── */}
          <header>
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400 mb-1">
              Analytics · Live
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              The Bitcoin Pulse
            </h1>
            <p className="text-sm text-white/[0.55] mt-1 max-w-2xl">
              Six signals across price, sentiment, and cycle position. For
              deeper analysis, open a specialized dashboard below.
            </p>
          </header>

          {/* ── Tier 1: KPI strip (3 cards) ── */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: BTC price + 24h + market stats */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
              <p className="text-[9px] uppercase tracking-widest text-white/[0.3] mb-2">
                Bitcoin
              </p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-mono font-bold text-amber-400 tracking-tight">
                  {formatCurrency(price)}
                </span>
                <div
                  className={`flex items-center gap-0.5 ${
                    pos ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {pos ? (
                    <ArrowUp size={12} />
                  ) : (
                    <ArrowDown size={12} />
                  )}
                  <span className="text-xs font-mono font-bold">
                    {formatPercentage(chg)}
                  </span>
                </div>
              </div>
              {range > 1 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] text-white/[0.4] font-mono">
                    {formatCurrency(lo)}
                  </span>
                  <div className="flex-1 h-1 bg-white/[0.08] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(Math.max(posInRange, 4), 96)}%`,
                        background: pos
                          ? 'rgb(34,197,94)'
                          : 'rgb(239,68,68)',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-white/[0.4] font-mono">
                    {formatCurrency(hi)}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-white/[0.45]">
                <span>
                  MCap{' '}
                  <span className="text-white/[0.75]">
                    {m?.market_cap?.usd
                      ? `$${(m.market_cap.usd / 1e12).toFixed(2)}T`
                      : '—'}
                  </span>
                </span>
                <span>
                  Vol{' '}
                  <span className="text-white/[0.75]">
                    {m?.total_volume?.usd
                      ? `$${(m.total_volume.usd / 1e9).toFixed(1)}B`
                      : '—'}
                  </span>
                </span>
                <span>
                  Dom{' '}
                  <span className="text-white/[0.75]">
                    {m?.btc_dominance?.toFixed(1) ?? '—'}%
                  </span>
                </span>
              </div>
            </div>

            {/* Card 2: Fear & Greed */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
              <p className="text-[9px] uppercase tracking-widest text-white/[0.3] mb-3">
                Fear & Greed
              </p>
              <FearGreedWidget />
            </div>

            {/* Card 3: ETF flows */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
              <p className="text-[9px] uppercase tracking-widest text-white/[0.3] mb-3">
                ETF flows (5d)
              </p>
              <ETFFlowsWidget />
            </div>
          </section>

          {/* ── Tier 2: Cycle position + Risk band one-liners ── */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CyclePulseStub />
            <RiskOneLiner />
          </section>

          {/* ── Deep tools — link rows to dedicated tabs ── */}
          <section>
            <p className="text-[9px] uppercase tracking-widest text-white/[0.3] mb-3">
              Deep tools
            </p>
            <details
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden"
              open
            >
              <summary className="px-4 py-3 cursor-pointer text-sm text-white/[0.7] hover:text-white hover:bg-white/[0.02] select-none">
                Open a specialized dashboard ↓
              </summary>
              <ul className="border-t border-white/[0.06] divide-y divide-white/[0.04]">
                <DeepLink
                  href="/macro"
                  title="Macro dashboard"
                  desc="FRED rates · M2 supply · FedWatch · treasury yields"
                />
                <DeepLink
                  href="/risk"
                  title="Risk bands"
                  desc="Pi cycle · Mayer Multiple · NUPL · liquidation heatmap"
                />
                <DeepLink
                  href="/cycle/compare"
                  title="Cycle compare"
                  desc="Halving→top, top→bottom overlays across all cycles"
                />
                <DeepLink
                  href="/workbench"
                  title="Workbench"
                  desc="Build, backtest, and share custom indicators"
                />
                <DeepLink
                  href="/portfolio/mpt"
                  title="Portfolio optimizer"
                  desc="MPT allocation · stress tests · DCA migration"
                />
              </ul>
            </details>
          </section>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function DeepLink({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between gap-3 px-4 py-3 text-white/[0.85] hover:bg-white/[0.04] transition-colors"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-white/[0.45] mt-0.5">{desc}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-white/[0.3] shrink-0" />
      </Link>
    </li>
  );
}
