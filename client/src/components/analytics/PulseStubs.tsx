// BitcoinHub — /analytics pulse stubs
//
// Compact one-liners used on the /analytics hero page that link into the
// deep dashboard tabs (/risk, /cycle/compare, …). Keeps the analytics page
// uncluttered while making the deep tabs discoverable.
//
// Pattern: hit a small JSON endpoint, render one paragraph + a "→ Open {tool}"
// link. No charts, no duplicate widgets. Source-of-truth lives in the deep tab.

import React from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';

// ── Cycle pulse stub ────────────────────────────────────────────────────────
// Reuses /api/cycle/position (5-min server cache). The full widget lives on
// the home hero; this is the /analytics teaser.

interface CyclePosition {
  asOf: string;
  daysSinceHalving4: number;
  priceSinceHalvingPct: number;
  drawdownPctFromTop: number;
  cycle4PctThroughHalvingToBottom: number;
  estimatedC4BottomDate: string;
  daysBeforeEstimatedC4Bottom: number;
}

export function CyclePulseStub() {
  const { data, isLoading } = useQuery<CyclePosition>({
    queryKey: ['/api/cycle/position'],
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 h-full flex flex-col">
      <p className="text-[9px] uppercase tracking-widest text-white/[0.3] mb-2">Cycle position</p>
      {isLoading || !data ? (
        <p className="text-sm text-white/[0.3]">Loading…</p>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mb-2">
            <span
              className="text-4xl font-mono font-bold text-amber-400 tracking-tight"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {data.daysSinceHalving4}
            </span>
            <span className="text-xs text-white/[0.4]">days into cycle 4</span>
          </div>
          <p className="text-sm text-white/[0.6] leading-relaxed mb-4 flex-1">
            ~{data.cycle4PctThroughHalvingToBottom}% through halving-to-bottom phase.
            {data.daysBeforeEstimatedC4Bottom > 0 ? (
              <> ~{data.daysBeforeEstimatedC4Bottom}d to projected bottom (~{data.estimatedC4BottomDate}).</>
            ) : (
              <> ~{Math.abs(data.daysBeforeEstimatedC4Bottom)}d past projected bottom (~{data.estimatedC4BottomDate}).</>
            )}
            {' '}From cycle top:{' '}
            <span className={data.drawdownPctFromTop < 0 ? 'text-amber-400' : 'text-green-400'}>
              {data.drawdownPctFromTop >= 0 ? '+' : ''}{data.drawdownPctFromTop.toFixed(1)}%
            </span>
            . Since halving:{' '}
            <span className={data.priceSinceHalvingPct >= 0 ? 'text-green-400' : 'text-amber-400'}>
              {data.priceSinceHalvingPct >= 0 ? '+' : ''}{data.priceSinceHalvingPct.toFixed(1)}%
            </span>
            .
          </p>
          <Link
            href="/cycle/compare"
            className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            Cycle comparison <ChevronRight className="w-3 h-3" />
          </Link>
        </>
      )}
    </div>
  );
}

// ── Risk band one-liner ─────────────────────────────────────────────────────
// Reuses /api/risk/bands-stats. Full risk analysis lives at /risk (Pi cycle,
// Mayer Multiple, NUPL, liquidation heatmap).

interface RiskBand {
  band: string;
  label: string;
  color: string;
  min: number;
  max: number;
}

interface RiskBandsStats {
  asOf: string;
  bands: RiskBand[];
  currentStreak: { band: string; label: string; color: string; days: number };
  lastTransition: { from: string; to: string; date: string };
  totalDays: number;
}

export function RiskOneLiner() {
  const { data, isLoading } = useQuery<RiskBandsStats>({
    queryKey: ['/api/risk/bands-stats'],
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 h-full flex flex-col">
      <p className="text-[9px] uppercase tracking-widest text-white/[0.3] mb-2">Risk band</p>
      {isLoading || !data ? (
        <p className="text-sm text-white/[0.3]">Loading…</p>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mb-2">
            <span
              className="text-2xl font-mono font-bold tracking-tight"
              style={{ color: data.currentStreak.color }}
            >
              {data.currentStreak.label}
            </span>
          </div>
          <p className="text-sm text-white/[0.6] leading-relaxed mb-4 flex-1">
            <span className="font-mono font-medium text-white">
              {data.currentStreak.days}d
            </span>{' '}
            in current band. Last transition:{' '}
            <span className="font-mono text-white/[0.8]">{data.lastTransition.date}</span>{' '}
            <span className="text-white/[0.4]">({data.lastTransition.from} → {data.lastTransition.to})</span>.
          </p>
          <Link
            href="/risk"
            className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            Risk analysis (Pi cycle, Mayer, NUPL) <ChevronRight className="w-3 h-3" />
          </Link>
        </>
      )}
    </div>
  );
}
