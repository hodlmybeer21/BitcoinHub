// BitcoinHub — /analytics at-a-glance indicator tiles + pulse stubs
//
// Each tile is a small focused widget that hits an existing endpoint and
// renders one number + a sparkline + a footer link to the deep tab. The
// shared shell (IndicatorTile + Sparkline) keeps the visual rhythm tight.
//
// Indicators wired here:
//   - CyclePulseStub     → /api/cycle/position  (apples-to-apples)
//   - RiskOneLiner       → /api/risk/bands-stats (current band streak)
//   - MayerTile          → /api/risk/indicator   (mmZ)
//   - PiCycleTopTile     → /api/risk/indicators (piCycle.distanceToTopPct)
//   - BMSTile            → /api/risk/indicators (bmsb, 200-WMA band)
//   - LiquidationZonesTile → /api/options-flow  (Deribit OI distribution)
//                           FREE-FIRST: uses OI clusters as natural
//                           liquidation magnets. Real-time liquidations
//                           require CoinGlass/Coinalyze (paid).
//
// Deferred to next pass (need new endpoints / FRED series additions):
//   - BTC monthly returns     → needs /api/btc/monthly
//   - M2 supply delta         → needs M2SL added to FRED supported list
//   - 10Y TNX                 → needs DGS10 added to FRED supported list
//   - CME FedWatch            → needs free source research
//
// All data is 5-min server-cached where possible; sparklines use the
// /api/risk/timeseries for indicator history.

import React from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';

// ── Shared shell ────────────────────────────────────────────────────────────

function Sparkline({
  values,
  color = '#f7931a',
  height = 28,
  width = 100,
}: {
  values: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  if (values.length < 2) {
    return <div className="h-7 opacity-30 text-[10px]">no history</div>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="block w-full"
      style={{ height }}
    >
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

export function IndicatorTile({
  label,
  value,
  sub,
  tone,
  href,
  loading,
  children,
  hint,
}: {
  label: string;
  value?: string;
  sub?: string;
  tone?: 'good' | 'warn' | 'neutral' | 'danger';
  href?: string;
  loading?: boolean;
  children?: React.ReactNode;
  hint?: string;
}) {
  const valueColor =
    tone === 'good'
      ? 'text-green-400'
      : tone === 'warn'
      ? 'text-amber-400'
      : tone === 'danger'
      ? 'text-red-400'
      : 'text-white';
  const body = (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 h-full flex flex-col gap-1 hover:bg-white/[0.05] transition-colors">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[9px] uppercase tracking-widest text-white/[0.45]">
          {label}
        </p>
        {href && (
          <ChevronRight className="w-3 h-3 text-white/[0.25] shrink-0" />
        )}
      </div>
      {loading ? (
        <p className="text-sm text-white/[0.3]">Loading…</p>
      ) : value !== undefined ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-mono font-bold tracking-tight ${valueColor}`}>
              {value}
            </span>
            {sub && (
              <span className="text-[11px] text-white/[0.5] font-mono">
                {sub}
              </span>
            )}
          </div>
          {children}
          {hint && (
            <p className="text-[10px] text-white/[0.4] mt-auto pt-1 leading-snug">
              {hint}
            </p>
          )}
        </>
      ) : (
        children
      )}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

const fmtUsd = (n: number | null | undefined) =>
  n == null
    ? '—'
    : '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });

// ── Cycle pulse stub ────────────────────────────────────────────────────────

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
      <p className="text-[9px] uppercase tracking-widest text-white/[0.3] mb-2">
        Cycle position
      </p>
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
      <p className="text-[9px] uppercase tracking-widest text-white/[0.3] mb-2">
        Risk band
      </p>
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
            <span className="font-mono text-white/[0.8]">
              {data.lastTransition.date}
            </span>{' '}
            <span className="text-white/[0.4]">
              ({data.lastTransition.from} → {data.lastTransition.to})
            </span>
            .
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

// ── Mayer Multiple Z (at-a-glance) ─────────────────────────────────────────
// mmZ = (BTC price − 200-DMA) / stdev(200-DMA). Positive = above 200-DMA,
// negative = below. Use /api/risk/indicator (single-shot) for current value,
// /api/risk/timeseries (already cached) for sparkline history.

interface RiskIndicator {
  mmZ?: number;
  rsi?: number;
  d200w?: number;
  cyclePos?: number;
  asOf?: string;
}

interface RiskPoint {
  timestamp?: string;
  risk?: number;
  mmZ?: number;
}

interface RiskTimeseries {
  points?: RiskPoint[];
}

export function MayerTile() {
  const ind = useQuery<RiskIndicator>({
    queryKey: ['/api/risk/indicator'],
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });
  const series = useQuery<RiskTimeseries>({
    queryKey: ['/api/risk/timeseries', 'mmZ'],
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  const mmZ = ind.data?.mmZ;
  const tone =
    mmZ == null
      ? 'neutral'
      : mmZ > 1
      ? 'danger'
      : mmZ > 0
      ? 'good'
      : mmZ < -1
      ? 'warn'
      : 'neutral';
  const sub =
    mmZ == null
      ? undefined
      : mmZ > 1
      ? 'above 200-DMA · overheated'
      : mmZ > 0
      ? 'above 200-DMA'
      : mmZ < -1
      ? 'below 200-DMA'
      : 'near 200-DMA';

  // Sparkline: pull mmZ from timeseries if present (graceful degrade).
  const spark: number[] = (series.data?.points ?? [])
    .map((p) => p.mmZ)
    .filter((v): v is number => typeof v === 'number');

  const value = mmZ == null ? undefined : (mmZ >= 0 ? '+' : '') + mmZ.toFixed(2) + 'σ';

  return (
    <IndicatorTile
      label="Mayer Multiple Z"
      value={value}
      sub={sub}
      tone={tone}
      href="/risk"
      loading={ind.isLoading && !ind.data}
    >
      <Sparkline values={spark} color="#f7931a" />
    </IndicatorTile>
  );
}

// ── Pi Cycle top indicator ─────────────────────────────────────────────────
// distanceToTopPct = % distance from current price to the Pi Cycle "top
// crossover" trigger line. Lower = closer to top. < 5% historically heralds
// cycle tops (Willy Woo indicator).

interface PiCycle {
  piLong?: number;
  piShort?: number;
  ratio?: number;
  distanceToTopPct?: number;
  piCrossAboveTriggered?: boolean;
  asOf?: string;
}

interface RiskIndicators {
  piCycle?: PiCycle;
  cyclePos?: { cyclePositionPct?: number };
}

export function PiCycleTopTile() {
  const { data, isLoading } = useQuery<RiskIndicators>({
    queryKey: ['/api/risk/indicators'],
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  const d = data?.piCycle?.distanceToTopPct;
  const triggered = data?.piCycle?.piCrossAboveTriggered;
  const value = d == null ? undefined : d.toFixed(1) + '%';
  const sub = triggered
    ? 'cross above — top signal triggered'
    : d != null
    ? `to top crossover line`
    : undefined;
  const tone =
    triggered
      ? 'danger'
      : d == null
      ? 'neutral'
      : d < 5
      ? 'warn'
      : d < 20
      ? 'neutral'
      : 'good';

  return (
    <IndicatorTile
      label="Pi Cycle top"
      value={value}
      sub={sub}
      tone={tone}
      href="/risk"
      loading={isLoading && !data}
    />
  );
}

// ── 200-WMA / BMSB band (at-a-glance) ──────────────────────────────────────
// /api/risk/indicators.bmsb gives the 200-Week Moving Average "bands".
// aboveUpperPct / aboveLowerPct = where price sits relative to the bands.

interface BMSB {
  bmsbLower?: number;
  bmsbUpper?: number;
  price?: number;
  aboveLower?: boolean;
  aboveUpper?: boolean;
  aboveLowerPct?: number;
  aboveUpperPct?: number;
  asOf?: string;
}

export function BMSTile() {
  const { data, isLoading } = useQuery<{ bmsb?: BMSB }>({
    queryKey: ['/api/risk/indicators'],
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });
  const b = data?.bmsb;
  const value =
    b?.aboveUpperPct == null ? undefined : b.aboveUpperPct.toFixed(1) + '%';
  const sub = b?.aboveUpper
    ? 'price above upper band'
    : b?.aboveLower
    ? 'price between bands'
    : 'price below lower band';
  const tone = b?.aboveUpper ? 'good' : b?.aboveLower ? 'neutral' : 'warn';

  return (
    <IndicatorTile
      label="200-WMA band"
      value={value}
      sub={sub}
      tone={tone}
      href="/risk"
      loading={isLoading && !data}
    />
  );
}

// ── Liquidation zones (free-first: Deribit options OI) ──────────────────────
// NOTE: real-time liquidation VOLUME needs Coinglass/Coinalyze (paid).
// This widget uses options open-interest distribution as a PROXY — strikes
// with high OI act as natural liquidation magnets because market makers
// gamma-hedge there. Honest label: "OI-based zones (estimates)".

interface OptionStrike {
  symbol?: string;
  strike?: number;
  type?: 'call' | 'put' | string;
  openInterest?: number;
  volume?: number;
  iv?: number;
  markPrice?: number;
}

interface OptionsFlow {
  lastUpdated?: string;
  source?: string;
  topStrikes?: OptionStrike[];
  btc?: { totalOI?: number; totalVolume?: number; putCallRatio?: number };
}

export function LiquidationZonesTile() {
  const { data, isLoading } = useQuery<OptionsFlow>({
    queryKey: ['/api/options-flow'],
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  const strikes = data?.topStrikes ?? [];
  // split into above + below relative to mid strike
  const sorted = [...strikes].sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
  const mid = sorted[Math.floor(sorted.length / 2)];
  const midStrike = mid?.strike ?? 0;
  const above = sorted.filter((s) => (s.strike ?? 0) > midStrike).slice(0, 5);
  const below = sorted
    .filter((s) => (s.strike ?? 0) <= midStrike)
    .reverse()
    .slice(0, 5);
  // Total OI shown for "size"
  const totalOI = data?.btc?.totalOI ?? 0;

  if (isLoading && !data) {
    return (
      <IndicatorTile label="Liquidation zones" loading href="/risk" />
    );
  }

  // Normalize bar widths to max OI in window
  const allOI = [...above, ...below].map((s) => s.openInterest ?? 0);
  const maxOI = Math.max(...allOI, 1);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 h-full flex flex-col gap-1 hover:bg-white/[0.05] transition-colors">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[9px] uppercase tracking-widest text-white/[0.45]">
          OI-based liquidation zones
        </p>
        <Link href="/risk" className="text-[10px] text-white/[0.4] hover:text-white/[0.7]">
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <p className="text-[10px] text-white/[0.4] mb-1">
        Deribit top strikes — estimated liquidation magnets
      </p>
      <div className="flex-1 space-y-0.5 overflow-hidden">
        {above.length === 0 && below.length === 0 ? (
          <p className="text-[10px] text-white/[0.3] italic">no OI data</p>
        ) : (
          <>
            {[...above].reverse().map((s) => (
              <StrikeBar
                key={`a-${s.strike}-${s.type}`}
                strike={s.strike}
                type={s.type}
                oi={s.openInterest}
                maxOI={maxOI}
                above
              />
            ))}
            <div className="border-t border-white/[0.06] my-1" />
            {below.map((s) => (
              <StrikeBar
                key={`b-${s.strike}-${s.type}`}
                strike={s.strike}
                type={s.type}
                oi={s.openInterest}
                maxOI={maxOI}
              />
            ))}
          </>
        )}
      </div>
      {totalOI > 0 && (
        <p className="text-[10px] text-white/[0.4] font-mono mt-1 pt-1 border-t border-white/[0.06]">
          Total BTC OI: ${(totalOI / 1e9).toFixed(2)}B
        </p>
      )}
    </div>
  );
}

function StrikeBar({
  strike,
  type,
  oi,
  maxOI,
  above,
}: {
  strike?: number;
  type?: string;
  oi?: number;
  maxOI: number;
  above?: boolean;
}) {
  const w = Math.max(8, Math.min(100, ((oi ?? 0) / maxOI) * 100));
  const t = type === 'call' ? 'text-green-300' : 'text-red-300';
  const bgAbove = above ? 'bg-green-500/20' : 'bg-red-500/20';
  const bg = above ? 'bg-green-500/30' : 'bg-red-500/30';
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono leading-tight">
      <span className={t + ' w-8 shrink-0'}>{type === 'call' ? 'C' : 'P'}</span>
      <span className="text-white/70 w-14 shrink-0">
        {strike ? `$${(strike / 1000).toFixed(1)}k` : '—'}
      </span>
      <div className="flex-1 h-2.5 bg-white/[0.04] rounded overflow-hidden">
        <div className={`h-full ${bgAbove}`}>
          <div className={`h-full ${bg}`} style={{ width: `${w}%` }} />
        </div>
      </div>
      <span className="text-white/[0.45] w-12 shrink-0 text-right">
        {oi != null ? `${(oi / 1000).toFixed(0)}k` : '—'}
      </span>
    </div>
  );
}
