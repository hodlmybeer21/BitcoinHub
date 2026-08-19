// BitcoinHub — /risk
// Risk Indicator dashboard. Headline feature for the IntoTheCryptoverse gap.
//
// Reads 4 endpoints from /api/risk/* (React Query) and renders:
//   - 3 stat cards (Risk Now, Band, Confidence)
//   - 4-year risk time series (Recharts AreaChart with band-color fill)
//   - BMSB panel (20w SMA + 21w EMA + price-above-bands)
//   - Pi Cycle panel (350d×2 MA + 111d MA + ratio + cross distance)
//   - Cycle position strip (halving progress)
//   - Workbench template links (4 buttons that fork the formula)

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, Gauge, Shield, TrendingUp, TrendingDown, Layers,
  BarChart3, Hammer, ArrowRight, Clock, AlertTriangle, CheckCircle2,
} from "lucide-react";
import {
  ComposedChart, Area, Bar, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip, ReferenceLine, ReferenceDot,
  LineChart, Line,
} from "recharts";
import { Link } from "wouter";
import ErrorBoundary from "@/components/ErrorBoundary";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CycleState {
  currentCycleIndex: number;
  lastHalvingDate: string;
  nextHalvingEstimate: string;
  daysSinceHalving: number;
  daysToNextHalving: number;
  cyclePosition: number;
  cyclePositionPct: number;
}

interface RiskSnapshot {
  risk: number;
  band: { band: string; label: string; color: string; min: number; max: number };
  confidence: 'very_low' | 'low' | 'medium' | 'high';
  yearsOfHistory: number;
  mmZ: number | null;
  rsi: number | null;
  cyclePos: number;
  d200w: number | null;
  asOf: string;
  meta: { symbol: string; name: string; days: number; fetchedAt: string };
}

interface RiskPoint {
  date: string;
  risk: number;
  band: string;
  bandColor: string;
  price: number;
}

interface RiskTimeSeries {
  symbol: string;
  points: RiskPoint[];
  halvings: { date: string; cycleIndex: number }[];
  count: number;
  meta: { symbol: string; name: string; days: number; fetchedAt: string };
}

interface Bmsb {
  bmsbLower: number;
  bmsbUpper: number;
  price: number;
  aboveLower: boolean;
  aboveUpper: boolean;
  aboveLowerPct: number;
  aboveUpperPct: number;
  asOf: string;
}

interface PiCycle {
  piLong: number;
  piShort: number;
  ratio: number;
  distanceToTopPct: number;
  piCrossAboveTriggered: boolean;
  asOf: string;
}

interface IndicatorsPayload {
  bmsb: Bmsb | null;
  piCycle: PiCycle | null;
  cyclePos: CycleState;
  meta: { symbol: string; name: string; days: number; fetchedAt: string };
}

interface BandStatEntry {
  band: string;
  label: string;
  color: string;
  days: number;
  pct: number;
  firstSeen?: string;
  lastSeen?: string;
}

interface BandStatsPayload {
  symbol: string;
  windowDays: number;
  totalDays: number;
  warmupDays: number;
  distribution: BandStatEntry[];
  currentStreak: { band: string; label: string; color: string; days: number; startedOn: string };
  lastTransition?: { fromBand: string; toBand: string; on: string };
  asOf: string;
}

// ─── Data fetching ──────────────────────────────────────────────────────────

function useRiskSnapshot(symbol: string = 'BTC') {
  return useQuery<RiskSnapshot>({
    queryKey: ['/api/risk/indicator', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/risk/indicator?symbol=${symbol}&days=3650`);
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,   // refresh every 5m
    staleTime: 60 * 1000,
  });
}

function useRiskTimeseries(symbol: string = 'BTC', days: number = 1460) {
  return useQuery<RiskTimeSeries>({
    queryKey: ['/api/risk/timeseries', symbol, days],
    queryFn: async () => {
      const res = await fetch(`/api/risk/timeseries?symbol=${symbol}&days=${days}&maxPoints=365`);
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });
}

function useRiskIndicators(symbol: string = 'BTC') {
  return useQuery<IndicatorsPayload>({
    queryKey: ['/api/risk/indicators', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/risk/indicators?symbol=${symbol}&days=3650`);
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });
}

function useRiskCycles() {
  return useQuery<{ current: CycleState; halvings: any[]; cycleLengthDays: number }>({
    queryKey: ['/api/risk/cycles'],
    queryFn: async () => {
      const res = await fetch('/api/risk/cycles');
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    refetchInterval: 60 * 60 * 1000,  // 1h — cycle state changes daily
    staleTime: 5 * 60 * 1000,
  });
}

function useBandStats(symbol: string = 'BTC', days: number = 1460) {
  return useQuery<BandStatsPayload>({
    queryKey: ['/api/risk/bands-stats', symbol, days],
    queryFn: async () => {
      const res = await fetch(`/api/risk/bands-stats?symbol=${symbol}&days=${days}`);
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function pct(x: number, digits: number = 1): string {
  return `${(x * 100).toFixed(digits)}%`;
}

function pctOf(value: number, total: number): string {
  return `${((value / total) * 100).toFixed(1)}%`;
}

function RiskBadge({ snapshot }: { snapshot: RiskSnapshot }) {
  const color = snapshot.band.color;
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium"
      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      {snapshot.band.label}
    </div>
  );
}

function ConfidenceBadge({ level }: { level: 'very_low' | 'low' | 'medium' | 'high' }) {
  const map = {
    very_low: { color: '#a3a3a3', label: 'Very Low' },
    low:      { color: '#fbbf24', label: 'Low' },
    medium:   { color: '#60a5fa', label: 'Medium' },
    high:     { color: '#34d399', label: 'High' },
  };
  const c = map[level];
  return (
    <div
      className="inline-flex items-center gap-1 text-xs"
      style={{ color: c.color }}
    >
      <Shield className="w-3 h-3" />
      {c.label}
    </div>
  );
}

function RiskTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  // Recharts 2.15.x pre-invokes the content component during the chart's
  // initial layout pass with a synthetic payload where payload.length > 0
  // but payload[0].payload is undefined. Guarding here prevents
  // 'Invariant failed' from a downstream .toFixed/.toLocaleString on
  // undefined (Tyler's #37001 black-screen root cause, 2026-08-19).
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="bg-card border border-muted rounded-md p-2 text-xs shadow-md">
      <div className="font-mono mb-1">{p.date}</div>
      <div style={{ color: p.bandColor }}>Risk: {p.risk.toFixed(3)} ({p.band})</div>
      <div className="text-muted-foreground">Price: ${p.price.toLocaleString()}</div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RiskMetric() {
  const snapshot = useRiskSnapshot();
  const ts = useRiskTimeseries();
  const ind = useRiskIndicators();
  const cycles = useRiskCycles();
  const bands = useBandStats();

  const isLoading = snapshot.isLoading || ts.isLoading || ind.isLoading || cycles.isLoading || bands.isLoading;
  const hasError = snapshot.error || ts.error || ind.error || cycles.error || bands.error;

  // Halving markers for the time series chart.
  const halvingMarkers = useMemo(() => {
    if (!ts.data) return [];
    return ts.data.halvings.map(h => ({
      x: h.date,
      label: `Halving ${h.cycleIndex}`,
    }));
  }, [ts.data]);

  if (hasError) {
    const err = (snapshot.error || ts.error || ind.error || cycles.error) as Error;
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Risk Indicator</h1>
        <Card className="border-red-900/50">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Failed to load risk data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">{err.message}</p>
            <Button onClick={() => { snapshot.refetch(); ts.refetch(); ind.refetch(); cycles.refetch(); }}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const s = snapshot.data;
  const i = ind.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Gauge className="w-7 h-7 text-primary" />
            BTC Risk Indicator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            0–1 cycle-position score combining Mayer Multiple z-score, RSI(14),
            halving-cycle position, and 200-week MA distance.
          </p>
        </div>
        {s && (
          <div className="text-xs text-muted-foreground">
            As of {new Date(s.asOf).toUTCString()}
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Risk Now</CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.isLoading ? (
              <Skeleton className="h-12 w-32" />
            ) : s ? (
              <>
                <div className="text-4xl font-bold tabular-nums" style={{ color: s.band.color }}>
                  {s.risk.toFixed(2)}
                </div>
                <div className="mt-2">
                  <RiskBadge snapshot={s} />
                </div>
                {/* mini progress bar */}
                <div className="mt-3 h-2 rounded-full overflow-hidden bg-muted/30">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${s.risk * 100}%`,
                      backgroundColor: s.band.color,
                    }}
                  />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  MM z = {s.mmZ?.toFixed(2) ?? '—'} · RSI = {s.rsi?.toFixed(0) ?? '—'} · Cycle = {pct(s.cyclePos, 0)}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Band</CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.isLoading ? (
              <Skeleton className="h-12 w-32" />
            ) : s ? (
              <>
                <div className="text-3xl font-bold" style={{ color: s.band.color }}>
                  {s.band.label}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Range {s.band.min.toFixed(2)}–{s.band.max.toFixed(2)}
                </div>
                <div className="mt-3 grid grid-cols-6 gap-0.5">
                  {[
                    { c: '#16a34a', l: 'EF' },
                    { c: '#65a30d', l: 'F' },
                    { c: '#ca8a04', l: 'C' },
                    { c: '#eab308', l: 'N' },
                    { c: '#ea580c', l: 'G' },
                    { c: '#dc2626', l: 'EG' },
                  ].map((b, idx) => (
                    <div
                      key={idx}
                      className="h-3 rounded-sm flex items-center justify-center text-[8px] font-bold"
                      style={{
                        backgroundColor: b.c,
                        color: 'white',
                        opacity: s.band.color === b.c ? 1 : 0.25,
                      }}
                    >
                      {b.l}
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Confidence</CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.isLoading ? (
              <Skeleton className="h-12 w-32" />
            ) : s ? (
              <>
                <div className="text-3xl font-bold">
                  <ConfidenceBadge level={s.confidence} />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {s.yearsOfHistory.toFixed(1)} years of price history
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  {s.confidence === 'high' || s.confidence === 'medium' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  )}
                  <span className="text-muted-foreground">
                    {s.confidence === 'high' || s.confidence === 'medium'
                      ? 'Z-score window is well-supported'
                      : 'Short history — interpret with caution'}
                  </span>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Time series */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            4-Year Risk History
          </CardTitle>
          <CardDescription>
            Daily risk score with halving markers. Color = current band at that date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ts.isLoading ? (
            <Skeleton className="h-80 w-full" />
          ) : ts.data && ts.data.points.length > 0 ? (
            <div className="h-80">
              <ErrorBoundary label="Risk time series chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ts.data.points} margin={{ top: 5, right: 16, left: 8, bottom: 5 }}>
                  <defs>
                    <linearGradient id="riskGradientV2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ea580c" stopOpacity={0.5} />
                      <stop offset="50%" stopColor="#eab308" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="date"
                    stroke="#888"
                    fontSize={11}
                    tickFormatter={(v: string) => v.slice(0, 7)}
                    interval={Math.floor(ts.data.points.length / 8)}
                  />
                  <YAxis domain={[0, 1]} stroke="#888" fontSize={11} />
                  <RTooltip content={<RiskTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="risk"
                    stroke="#ea580c"
                    fill="url(#riskGradientV2)"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
                </ResponsiveContainer>
              </ErrorBoundary>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Time in Risk Bands */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Time in Risk Bands
          </CardTitle>
          <CardDescription>
            How long BTC has spent in each band over the last {bands.data?.windowDays ?? 1460} days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bands.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : bands.data ? (
            <>
              {/* Current streak banner */}
              <div
                className="rounded-lg p-3 mb-4 flex items-center justify-between"
                style={{ backgroundColor: `${bands.data.currentStreak.color}22`, border: `1px solid ${bands.data.currentStreak.color}44` }}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: bands.data.currentStreak.color }} />
                  <span className="text-sm">
                    <span className="font-bold text-base" style={{ color: bands.data.currentStreak.color }}>
                      {bands.data.currentStreak.days} days
                    </span>{' '}
                    in <strong>{bands.data.currentStreak.label}</strong>
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  since {bands.data.currentStreak.startedOn}
                </span>
              </div>

              {/* Stacked distribution bar */}
              <div className="flex h-8 rounded-md overflow-hidden mb-3 border border-muted/30">
                {bands.data.distribution.map(d => (
                  <div
                    key={d.band}
                    className="flex items-center justify-center text-[10px] font-bold transition-all hover:opacity-80"
                    style={{
                      width: `${d.pct * 100}%`,
                      backgroundColor: d.color,
                      color: 'white',
                      opacity: d.pct > 0.02 ? 1 : 0,
                    }}
                    title={`${d.label}: ${(d.pct * 100).toFixed(1)}% (${d.days} days)`}
                  >
                    {d.pct > 0.05 ? `${(d.pct * 100).toFixed(0)}%` : ''}
                  </div>
                ))}
              </div>

              {/* Per-band stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
                {bands.data.distribution.map(d => (
                  <div
                    key={d.band}
                    className="rounded-md p-2 border"
                    style={{ borderColor: `${d.color}44`, backgroundColor: `${d.color}10` }}
                  >
                    <div className="font-bold" style={{ color: d.color }}>{d.label}</div>
                    <div className="text-muted-foreground mt-1">
                      {(d.pct * 100).toFixed(1)}% · {d.days}d
                    </div>
                    {d.lastSeen && (
                      <div className="text-muted-foreground text-[10px] mt-0.5">
                        last: {d.lastSeen}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {bands.data.lastTransition && (
                <div className="mt-3 text-xs text-muted-foreground">
                  Last transition: {bands.data.lastTransition.fromBand} → {bands.data.lastTransition.toBand} on{' '}
                  <span className="font-mono">{bands.data.lastTransition.on}</span>
                </div>
              )}

              <div className="mt-3 text-xs text-muted-foreground">
                {bands.data.warmupDays > 0 && (
                  <>Excluded {bands.data.warmupDays} warmup days (z-score needs ~4y history). </>
                )}
                Total analyzed: {bands.data.totalDays} days.
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* BMSB + Pi Cycle + Cycle position */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              Bull Market Support Band
            </CardDescription>
            <CardTitle className="text-lg">BMSB</CardTitle>
          </CardHeader>
          <CardContent>
            {ind.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : i?.bmsb ? (
              <>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lower (20w SMA):</span>
                    <span className="font-mono">${i.bmsb.bmsbLower.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Upper (21w EMA):</span>
                    <span className="font-mono">${i.bmsb.bmsbUpper.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-muted/30 pt-1 mt-1">
                    <span className="text-muted-foreground">BTC Price:</span>
                    <span className="font-mono font-bold">${i.bmsb.price.toLocaleString()}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  {i.bmsb.aboveLower ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-muted-foreground">
                    {i.bmsb.aboveLower ? `Above lower by ${i.bmsb.aboveLowerPct.toFixed(1)}%` : `Below lower by ${Math.abs(i.bmsb.aboveLowerPct).toFixed(1)}%`}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground">Not available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              Pi Cycle Top Indicator
            </CardDescription>
            <CardTitle className="text-lg">Pi Cycle</CardTitle>
          </CardHeader>
          <CardContent>
            {ind.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : i?.piCycle ? (
              <>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">350d MA × 2:</span>
                    <span className="font-mono">${i.piCycle.piLong.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">111d MA:</span>
                    <span className="font-mono">${i.piCycle.piShort.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-muted/30 pt-1 mt-1">
                    <span className="text-muted-foreground">Ratio:</span>
                    <span className="font-mono font-bold">{i.piCycle.ratio.toFixed(3)}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  {i.piCycle.piCrossAboveTriggered ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-red-400">Top signal TRIGGERED</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-yellow-500" />
                      <span className="text-muted-foreground">
                        {i.piCycle.distanceToTopPct.toFixed(1)}% to cross
                      </span>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground">Not available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Halving Cycle
            </CardDescription>
            <CardTitle className="text-lg">Position</CardTitle>
          </CardHeader>
          <CardContent>
            {cycles.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : cycles.data ? (
              <>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cycle:</span>
                    <span className="font-mono">#{cycles.data.current.currentCycleIndex}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Days since halving:</span>
                    <span className="font-mono">{cycles.data.current.daysSinceHalving}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Days to next:</span>
                    <span className="font-mono">{cycles.data.current.daysToNextHalving}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${cycles.data.current.cyclePositionPct}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {cycles.data.current.cyclePositionPct.toFixed(1)}% through cycle
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Workbench template links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hammer className="w-5 h-5" />
            Risk blocks in the Workbench
          </CardTitle>
          <CardDescription>
            These blocks expose the same risk math to the no-code builder.
            Click to fork a template.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: 'risk_metric_snapshot',   label: 'Risk Metric',       desc: 'Current 0–1 cycle-position score' },
              { id: 'risk_bmsb_lower',        label: 'BMSB Lower',        desc: '20-week SMA (buy zone)' },
              { id: 'risk_bmsb_upper',        label: 'BMSB Upper',        desc: '21-week EMA' },
              { id: 'risk_pi_cycle_ratio',    label: 'Pi Cycle Ratio',    desc: '111d MA / (350d MA × 2)' },
              { id: 'risk_cycle_position_pct', label: 'Cycle Position',   desc: 'Days through current halving cycle' },
              { id: 'risk_band_stats',        label: 'Time in Bands',     desc: '% of days spent in each risk band' },
            ].map(t => (
              <Link key={t.id} href={`/workbench?import=${encodeURIComponent(t.id)}`}>
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                  <div className="flex flex-col items-start gap-0.5">
                    <div className="flex items-center gap-2 font-medium">
                      {t.label}
                      <ArrowRight className="w-3 h-3" />
                    </div>
                    <span className="text-xs text-muted-foreground">{t.desc}</span>
                  </div>
                </Button>
              </Link>
            ))}
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            <Badge variant="outline" className="mr-2">Phase 6 + 6a</Badge>
            Composite math lives in <code className="text-xs">lib/risk/composite.ts</code>.
            Workbench integration added 7 risk.* blocks to{' '}
            <code className="text-xs">lib/workbench/blocks.ts</code>.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
