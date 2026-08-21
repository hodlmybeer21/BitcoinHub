// BitcoinHub — "Where Are We In The Cycle?" hero widget
// Renders a compact cycle-position card under the home hero. Pulls
// /api/cycle/position (5-min server cache; refetchInterval 5m).
//
// Layout (desktop 2-col, mobile stacked):
//   ┌──────────── Left ────────────┐  ┌─── Right: mini-strip ──┐
//   │ DAY 858 (huge number)        │  │ BTC at day 858 in      │
//   │ phase + since-halving line   │  │ Cycle 2 / 3 / 4        │
//   │ 3 stat tiles                 │  │ "Explore the cycle →"  │
//   │ past-cycles-topped context   │  └─────────────────────────┘
//   └──────────────────────────────────────────────────────────┘
// Header: live dot + share button.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { Share2, ChevronRight } from 'lucide-react';

interface MiniStripRow {
  cycleId: string;
  cycleLabel: string;
  daysFromHalving: number;
  date: string;
  price: number | null;
  fromHalvingPct: number | null;
  current?: boolean;
  phasePct?: number;          // % through each cycle's halving-to-bottom phase
}

interface CyclePosition {
  asOf: string;
  source: string;
  currentPrice: number;
  change24h: number;
  halving4Date: string;
  halving4Price: number;
  daysSinceHalving4: number;
  priceSinceHalvingPct: number;
  nextHalvingDate: string;
  daysUntilNextHalving: number;
  lastAthPrice: number;
  lastAthDate: string;
  daysSinceLastAth: number;
  drawdownPctFromTop: number;
  historicalTopDays: Array<{ cycleId: string; days: number }>;
  cycle4PctThroughHalvingToBottom: number;
  estimatedC4HalvingToBottomDays: number;
  estimatedC4BottomDate: string;
  daysBeforeEstimatedC4Bottom: number;
  miniStrip: MiniStripRow[];
}

function fmtCurrency(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0, style: 'currency', currency: 'USD' });
}

function fmtSignedPct(p: number | null, digits = 1): string {
  if (p == null) return '—';
  const sign = p >= 0 ? '+' : '';
  return `${sign}${p.toFixed(digits)}%`;
}

const fadeIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

function StatTile({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'good' | 'warn' | 'neutral';
}) {
  const valueColor =
    tone === 'good' ? 'text-green-400' : tone === 'warn' ? 'text-amber-400' : 'text-foreground';
  return (
    <div className="bg-background/40 rounded-xl border border-muted/10 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className={`font-mono font-bold text-lg ${valueColor}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export function CyclePositionWidget() {
  const { data, isLoading, error } = useQuery<CyclePosition>({
    queryKey: ['/api/cycle/position'],
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || error || !data) {
    return (
      <div className="bg-card/60 border border-muted/20 rounded-2xl p-6 text-center text-muted-foreground text-sm">
        {isLoading ? 'Loading cycle position…' : 'Cycle data unavailable.'}
      </div>
    );
  }

  const pastTopWindowMax = Math.max(...data.historicalTopDays.map((d) => d.days));
  const pastTopWindowMin = Math.min(...data.historicalTopDays.map((d) => d.days));
  const daysPastTopWindow = data.daysSinceHalving4 - pastTopWindowMax;

  const shareText = [
    `Bitcoin is on day ${data.daysSinceHalving4} of the 4-year cycle.`,
    '',
    `BTC ${fmtCurrency(data.currentPrice)} (${data.change24h >= 0 ? '+' : ''}${data.change24h.toFixed(1)}% 24h)`,
    `Since halving: ${fmtSignedPct(data.priceSinceHalvingPct)}`,
    `From cycle top: ${fmtSignedPct(data.drawdownPctFromTop)}`,
    '',
    'Where are YOU in the cycle?',
    'bitcoinhub.goodbotai.tech',
  ].join('\n');
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  return (
    <motion.div
      {...fadeIn}
      className="bg-card/60 border border-muted/20 rounded-2xl p-6 md:p-8 backdrop-blur-sm relative overflow-hidden"
      data-testid="cycle-position-widget"
    >
      {/* Subtle amber accent corner */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />

      {/* ── Header ── */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span>Cycle Position</span>
          <span className="text-foreground/40">·</span>
          <span className="text-foreground/60">Live · {data.asOf}</span>
        </div>
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground/5 hover:bg-foreground/10 text-sm text-foreground transition-colors"
          aria-label="Share cycle position on X"
        >
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </a>
      </div>

      <div className="relative grid md:grid-cols-2 gap-8">
        {/* ── Left: big counter + stat tiles + context line ── */}
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Day of cycle 4 (since the {data.halving4Date} halving)
          </p>
          <div className="flex items-baseline gap-3 mb-2">
            <span
              className="text-7xl md:text-8xl font-bold font-mono text-primary tracking-tight leading-none"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {data.daysSinceHalving4}
            </span>
            <span className="text-muted-foreground text-xl">days</span>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Halving 4 closed at {fmtCurrency(data.halving4Price)}. BTC now at{' '}
            <span className="text-foreground font-medium font-mono">
              {fmtCurrency(data.currentPrice)}
            </span>{' '}
            ({fmtSignedPct(data.priceSinceHalvingPct)} from halving).
          </p>

          <div className="grid grid-cols-3 gap-3">
            <StatTile
              label="To next halving"
              value={`${data.daysUntilNextHalving}d`}
              sub={`~ ${data.nextHalvingDate}`}
            />
            <StatTile
              label="From cycle top"
              value={fmtSignedPct(data.drawdownPctFromTop)}
              sub={`ATH ${fmtCurrency(data.lastAthPrice)}`}
              tone={data.drawdownPctFromTop < 0 ? 'warn' : 'good'}
            />
            <StatTile
              label="Since halving"
              value={fmtSignedPct(data.priceSinceHalvingPct)}
              tone={data.priceSinceHalvingPct >= 0 ? 'good' : 'warn'}
            />
          </div>

          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            {daysPastTopWindow > 0 ? (
              <>
                Past cycles topped between{' '}
                <strong className="text-foreground">
                  {pastTopWindowMin}–{pastTopWindowMax} days
                </strong>{' '}
                post-halving. We're{' '}
                <strong className="text-foreground">{daysPastTopWindow} days past</strong> that
                window — a {data.daysSinceLastAth}-day-old ATH sits {fmtSignedPct(data.drawdownPctFromTop)} above current price.
              </>
            ) : (
              <>
                Past cycles topped between{' '}
                <strong className="text-foreground">
                  {pastTopWindowMin}–{pastTopWindowMax} days
                </strong>{' '}
                post-halving — we're{' '}
                <strong className="text-foreground">inside</strong> the historical top window.
              </>
            )}
          </p>
        </div>

        {/* ── Right: mini-strip + CTA ── */}
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
            BTC at ~{data.cycle4PctThroughHalvingToBottom}% through halving-to-bottom
          </div>
          <div className="text-[11px] text-muted-foreground/70 mb-3">
            Same point in each cycle's halving-to-bottom phase — apples to apples.
          </div>
          <div className="space-y-2 mb-5">
            {data.miniStrip.map((row) => (
              <div
                key={row.cycleId}
                className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                  row.current
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-card/40 border-muted/10'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium truncate ${
                      row.current ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {row.cycleLabel}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{row.date}</div>
                </div>
                {row.price != null && (
                  <div className="text-right font-mono shrink-0">
                    <div
                      className={`text-sm font-semibold ${
                        row.current ? 'text-primary' : 'text-foreground'
                      }`}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {fmtCurrency(row.price)}
                    </div>
                    {row.fromHalvingPct != null && (
                      <div
                        className={`text-xs ${
                          row.fromHalvingPct >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {fmtSignedPct(row.fromHalvingPct, 0)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <Link href="/cycle/compare">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 cursor-pointer transition-colors group">
              <span>Explore the full cycle comparison</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default CyclePositionWidget;
