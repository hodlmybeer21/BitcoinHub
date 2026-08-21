// BitcoinHub Analytics — full 🅐 rebuild (2026-08-21).
//
// Four tiers:
//   1. KPI pulse           — F&G, ETF flows, risk band status (3 cards)
//   2. Cycle position      — full apples-to-apples widget (1 card)
//   3. At a glance         — Mayer Z, Pi Cycle, 200-WMA band, OI-based
//                            liquidation zones (4 tiles, 2x2 on desktop)
//   4. Deep tools          — icon-card tile grid (5 deep tabs)
//
// What changed vs the prior 6-panel layout:
//   - Header renamed        "The Bitcoin Pulse" → "Live Bitcoin Analytics"
//   - BTC price card DROPPED (home hero owns "what is BTC" — /analytics owns
//     "what are the indicators telling me")
//   - 5 new at-a-glance tiles added using existing endpoints only
//   - <details> accordion REPLACED with icon-card grid
//
// Deferred (queued, need new endpoints / data sources):
//   - BTC monthly returns     → /api/btc/monthly
//   - M2 supply delta         → FRED M2SL needs to be added
//   - 10Y TNX                 → FRED DGS10 needs to be added
//   - CME FedWatch            → free source research needed
//   - Live liquidation VOLUME → Coinglass paid (currently using Deribit OI
//                                as proxy — annotated honestly in widget)

import React from 'react';
import { Link } from 'wouter';
import {
  ChevronRight,
  BarChart3,
  Activity,
  Repeat,
  Wrench,
  Wallet,
} from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';
import FearGreedWidget from '@/components/FearGreedWidget';
import ETFFlowsWidget from '@/components/ETFFlowsWidget';
import {
  CyclePulseStub,
  RiskOneLiner,
  MayerTile,
  PiCycleTopTile,
  BMSTile,
  LiquidationZonesTile,
} from '@/components/analytics/PulseStubs';
import {
  BtcMonthlyReturnsTile,
  M2SupplyTile,
  TnxTile,
  FedWatchTile,
  NuplProxyTile,
  RealLiquidationsTile,
} from '@/components/analytics/AtAGlanceTiles';

export default function Dashboard() {
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
              Live Bitcoin Analytics
            </h1>
            <p className="text-sm text-white/[0.55] mt-1 max-w-2xl">
              The signals that mattered in the prev cycle — visible at a
              glance. For deeper analysis, open a specialized dashboard
              below.
            </p>
          </header>

          {/* ── Tier 1: KPI pulse (3 cards) ── */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
              <p className="text-[9px] uppercase tracking-widest text-white/[0.3] mb-3">
                Fear & Greed
              </p>
              <FearGreedWidget />
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
              <p className="text-[9px] uppercase tracking-widest text-white/[0.3] mb-3">
                ETF flows (5d)
              </p>
              <ETFFlowsWidget />
            </div>
            <RiskOneLiner />
          </section>

          {/* ── Tier 2: Cycle position (apples-to-apples) ── */}
          <section>
            <CyclePulseStub />
          </section>

          {/* ── Tier 3: At a glance — 4 indicator tiles (cycle signals) ── */}
          <section>
            <h2 className="text-[10px] uppercase tracking-widest text-white/[0.35] mb-3">
              At a glance · Cycle signals
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MayerTile />
              <PiCycleTopTile />
              <BMSTile />
              <LiquidationZonesTile />
            </div>
          </section>

          {/* ── Tier 3.5: At a glance — Macro & derivatives (6 tiles) ── */}
          <section>
            <h2 className="text-[10px] uppercase tracking-widest text-white/[0.35] mb-3">
              At a glance · Macro & derivatives
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <BtcMonthlyReturnsTile />
              <M2SupplyTile />
              <TnxTile />
              <FedWatchTile />
              <NuplProxyTile />
              <RealLiquidationsTile />
            </div>
          </section>

          {/* ── Tier 4: Deep tools (icon-card tile grid) ── */}
          <section>
            <h2 className="text-[10px] uppercase tracking-widest text-white/[0.35] mb-3">
              Deep tools
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <DeepTabCard
                href="/macro"
                title="Macro dashboard"
                desc="FRED rates · M2 supply · FedWatch · treasury yields · inflation"
                Icon={BarChart3}
              />
              <DeepTabCard
                href="/risk"
                title="Risk bands"
                desc="Pi cycle · Mayer Multiple · NUPL · 200-WMA band · cycle position deep"
                Icon={Activity}
              />
              <DeepTabCard
                href="/cycle/compare"
                title="Cycle compare"
                desc="Halving→top, top→bottom overlays across all four cycles"
                Icon={Repeat}
              />
              <DeepTabCard
                href="/workbench"
                title="Workbench"
                desc="Build, backtest, share, and fork custom indicators"
                Icon={Wrench}
              />
              <DeepTabCard
                href="/portfolio/mpt"
                title="Portfolio optimizer"
                desc="MPT allocation · stress tests · DCA migration"
                Icon={Wallet}
              />
            </div>
          </section>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function DeepTabCard({
  href,
  title,
  desc,
  Icon,
}: {
  href: string;
  title: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 hover:bg-white/[0.06] hover:border-amber-400/30 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center group-hover:bg-amber-400/15 transition-colors">
          <Icon className="w-4 h-4 text-amber-400" />
        </div>
        <ChevronRight className="w-4 h-4 text-white/[0.25] group-hover:text-white/[0.6] group-hover:translate-x-0.5 transition-all" />
      </div>
      <p className="text-sm font-semibold text-white/95 mb-1">{title}</p>
      <p className="text-[11px] text-white/[0.5] leading-relaxed">{desc}</p>
    </Link>
  );
}
