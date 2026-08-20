/**
 * BitcoinHub — Cycle Compare
 * /cycle/compare
 *
 * Two tabs:
 *   1. Annotated Chart — full BTC price history with vertical markers at
 *      halvings (blue), new-ATH events (green), cycle tops (orange), and
 *      cycle bottoms (red). Matches Tyler's TradingView screenshot.
 *   2. Cycle Overlay — pick any "section" (from event → to event) and
 *      overlay that section from multiple cycles on a single chart, all
 *      normalized to start at 0% return so the shape + duration of each
 *      cycle's section lines up day-for-day.
 *
 * Backed by:
 *   GET /api/cycle/markers  → static events + computed ATH breaks + daily closes
 *   GET /api/cycle/overlay  → normalized section data per cycle
 *
 * Why a separate page: the /cycle narrative page teaches the 4-year
 * thesis; this page is the interactive workbench for testing it.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip, ReferenceLine, ComposedChart, Legend, ReferenceDot,
} from 'recharts';
import {
  ArrowLeft, GitCompareArrows, ChartLine, Layers, AlertTriangle, Loader2,
  Calendar, ArrowRight, CheckCircle2, XCircle, BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

// ── Marker color palette (matches Tyler's TradingView screenshot) ─────────
const MARKER_COLORS = {
  halving: '#3b82f6',  // blue
  ath:     '#22c55e',  // green
  top:     '#f97316',  // orange
  bottom:  '#ef4444',  // red
} as const;

// Cycle colors (for overlay tab — distinguishable on dark background)
const CYCLE_COLORS = {
  c1: '#a78bfa',  // violet
  c2: '#fb923c',  // orange (matches Bitcoin orange)
  c3: '#34d399',  // emerald
  c4: '#60a5fa',  // sky
} as const;

// Asset colors (for the Multi-Asset tab — chosen to be distinguishable
// from the cycle colors so users could later mix both views).
const ASSET_COLORS: Record<string, string> = {
  BTC:  '#f7931a',  // Bitcoin orange
  IBIT: '#60a5fa',  // sky (BlackRock-ish)
  COIN: '#a78bfa',  // violet (Coinbase-ish)
  MSTR: '#f472b6',  // pink (MicroStrategy-ish)
  FBTC: '#22d3ee',  // cyan (Fidelity)
  MARA: '#fbbf24',  // amber (Marathon)
  RIOT: '#f87171',  // rose (Riot)
};

const ASSET_CATALOG: Array<{ symbol: string; label: string }> = [
  { symbol: 'BTC',  label: 'Bitcoin' },
  { symbol: 'IBIT', label: 'iShares Bitcoin Trust (IBIT)' },
  { symbol: 'COIN', label: 'Coinbase (COIN)' },
  { symbol: 'MSTR', label: 'MicroStrategy (MSTR)' },
  { symbol: 'MARA', label: 'Marathon Digital (MARA)' },
  { symbol: 'RIOT', label: 'Riot Platforms (RIOT)' },
];

// ── Types matching the API responses ──────────────────────────────────────
interface CycleEvent {
  kind: 'halving' | 'top' | 'bottom' | 'ath';
  cycle: 'c1' | 'c2' | 'c3' | 'c4';
  date: string;
  price?: number;
  label?: string;
  note?: string;
  projected?: boolean;
}

interface ATHBreak {
  date: string;
  price: number;
  priorTop: number;
}

interface MarkersResp {
  events: CycleEvent[];
  athBreaks: ATHBreak[];
  btcDaily: Array<{ date: string; price: number }>;
  asOf: string;
  source: 'live' | 'fallback';
}

interface OverlayPoint {
  day: number;
  date: string;
  price: number;
  retPct: number;
}

interface OverlayCycle {
  cycleId: 'c1' | 'c2' | 'c3' | 'c4';
  cycleLabel: string;
  fromKind: string;
  fromDate: string;
  toKind: string;
  toDate: string;
  days: number;
  startPrice: number;
  endPrice: number;
  changePct: number;
  inProgress?: boolean;
  points: OverlayPoint[];
}

interface OverlayResp {
  section: {
    from: { kind: string; cycle: string; date: string } | null;
    to:   { kind: string; cycle: string; date: string } | null;
    days: number | null;
  };
  series: OverlayCycle[];
  skipped: Array<{ cycleId: string; reason: string }>;
  eventCatalog: CycleEvent[];
  asOf: string;
}

// ── Formatters ────────────────────────────────────────────────────────────
const fmtUSD = (n: number) =>
  Number.isFinite(n)
    ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n < 1 ? 2 : 0 })
    : '—';
const fmtPct = (n: number) => {
  if (!Number.isFinite(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
};
const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

// ── Section definitions (the chips above the overlay chart) ───────────────
const SECTION_PRESETS: Array<{
  label: string;
  from: 'halving' | 'top' | 'bottom' | 'prevBottom';
  to:   'top' | 'bottom' | 'halving' | 'nextTop';
  description: string;
}> = [
  { label: 'Halving → Top',        from: 'halving',   to: 'top',     description: 'How long from supply shock to euphoria' },
  { label: 'Top → Bottom',          from: 'top',       to: 'bottom',  description: 'The bear phase — how deep, how long' },
  { label: 'Bottom → Next Halving', from: 'bottom',    to: 'halving', description: 'The accumulation phase before next cycle' },
  { label: 'Halving → Next Halving', from: 'halving',  to: 'halving', description: 'Full 4-year cycle from supply shock to supply shock' },
  { label: 'Prev Bottom → Top',     from: 'prevBottom', to: 'top',    description: 'Red to orange across cycle boundaries — the rise from previous bear bottom to current cycle peak' },
];

const ALL_CYCLES: Array<{ id: 'c1' | 'c2' | 'c3' | 'c4'; label: string; range: string }> = [
  { id: 'c1', label: 'Cycle 1',  range: 'Nov 2012 halving' },
  { id: 'c2', label: 'Cycle 2',  range: 'Jul 2016 halving' },
  { id: 'c3', label: 'Cycle 3',  range: 'May 2020 halving' },
  { id: 'c4', label: 'Cycle 4',  range: 'Apr 2024 halving' },
];

// ============================================================================
// Component
// ============================================================================

export default function CycleCompare() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-6">
        {/* Header */}
        <motion.div initial="initial" animate="animate" variants={fadeInUp} className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link href="/cycle">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to cycle overview
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <GitCompareArrows className="h-7 w-7 text-[#F7931A]" />
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Cycle Compare</h1>
            <Badge variant="outline" className="border-[#F7931A]/40 text-[#F7931A] bg-[#F7931A]/5">
              new
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-3xl">
            Overlay Bitcoin's cycles on top of each other to compare the length and shape of
            each phase — halving to top, top to bottom, bottom to next halving, or the full
            4-year cycle. The chart below shows each cycle normalized to start at the same
            point so the shape lines up day-for-day.
          </p>
        </motion.div>

        <Tabs defaultValue="overlay" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="overlay" className="flex items-center gap-2">
              <Layers className="h-4 w-4" /> Cycle Overlay
            </TabsTrigger>
            <TabsTrigger value="asset" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Multi-Asset
            </TabsTrigger>
            <TabsTrigger value="annotated" className="flex items-center gap-2">
              <ChartLine className="h-4 w-4" /> Annotated Chart
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overlay" className="space-y-6">
            <OverlayTab />
          </TabsContent>
          <TabsContent value="asset" className="space-y-6">
            <AssetOverlayTab />
          </TabsContent>
          <TabsContent value="annotated" className="space-y-6">
            <AnnotatedTab />
          </TabsContent>
        </Tabs>

        {/* Legend card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Legend</CardTitle>
            <CardDescription>What each marker means on the annotated chart</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-1 h-6 rounded" style={{ backgroundColor: MARKER_COLORS.halving }} />
                <div>
                  <div className="font-semibold">Halving</div>
                  <div className="text-xs text-muted-foreground">Block reward cut in half (~every 1,460 days)</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-6 rounded" style={{ backgroundColor: MARKER_COLORS.ath }} />
                <div>
                  <div className="font-semibold">New ATH</div>
                  <div className="text-xs text-muted-foreground">First close above all prior closes</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-6 rounded" style={{ backgroundColor: MARKER_COLORS.top }} />
                <div>
                  <div className="font-semibold">Cycle Top</div>
                  <div className="text-xs text-muted-foreground">Highest close between this halving and the next</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-6 rounded" style={{ backgroundColor: MARKER_COLORS.bottom }} />
                <div>
                  <div className="font-semibold">Cycle Bottom</div>
                  <div className="text-xs text-muted-foreground">Lowest close between this halving and the next</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Tab 1 — Annotated Chart
// ============================================================================

function AnnotatedTab() {
  const { data, isLoading, error } = useQuery<MarkersResp>({
    queryKey: ['/api/cycle/markers'],
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000,
  });

  const [logScale, setLogScale] = useState(true);
  const [showMarkers, setShowMarkers] = useState({
    halving: true, ath: true, top: true, bottom: true,
  });

  // Downsample BTC daily series to ~800 points so Recharts stays snappy.
  // Strategy: keep first + last + evenly-spaced samples in between. We add
  // a `ts` field (unix ms) so the X axis can be time-scaled — without it,
  // Recharts treats dates as categories and ReferenceLine with x={date}
  // silently fails for event dates that aren't in the downsampled set.
  const chartData = useMemo(() => {
    if (!data?.btcDaily?.length) return [];
    const series = data.btcDaily;
    const targetPoints = 800;
    let sampled: typeof series;
    if (series.length <= targetPoints) {
      sampled = series;
    } else {
      const step = Math.ceil(series.length / targetPoints);
      sampled = [];
      for (let i = 0; i < series.length; i += step) {
        sampled.push(series[i]);
      }
      if (sampled[sampled.length - 1].date !== series[series.length - 1].date) {
        sampled.push(series[series.length - 1]);
      }
    }
    return sampled.map(p => ({
      date: p.date,
      price: p.price,
      ts: Date.parse(p.date + 'T00:00:00Z'),
    }));
  }, [data]);

  // Build reference-dot data for each event kind so we can render them
  // as small dots on the chart (more legible than vertical lines alone).
  // ts is added so ReferenceDot can position on the time-scaled X axis.
  const eventDots = useMemo(() => {
    if (!data || !chartData.length) return [];
    const byDate = new Map(chartData.map(p => [p.date, p.price]));
    const allEvents: Array<{ kind: string; date: string; ts: number; price: number; label: string; cycle: string }> = [];

    const priceAt = (isoDay: string): number | null => {
      let px = byDate.get(isoDay);
      if (px !== undefined) return px;
      for (let i = chartData.length - 1; i >= 0; i--) {
        if (chartData[i].date <= isoDay) return chartData[i].price;
      }
      return null;
    };

    for (const ev of data.events) {
      if (!showMarkers[ev.kind as keyof typeof showMarkers]) continue;
      const px = priceAt(ev.date);
      if (px === null) continue;
      allEvents.push({
        kind: ev.kind,
        date: ev.date,
        ts: Date.parse(ev.date + 'T00:00:00Z'),
        price: px,
        label: ev.label ?? `${ev.kind} ${ev.cycle}`,
        cycle: ev.cycle,
      });
    }
    for (const ab of data.athBreaks) {
      if (!showMarkers.ath) continue;
      const px = priceAt(ab.date);
      if (px === null) continue;
      allEvents.push({
        kind: 'ath',
        date: ab.date,
        ts: Date.parse(ab.date + 'T00:00:00Z'),
        price: px,
        label: `New ATH $${Math.round(ab.price).toLocaleString()}`,
        cycle: 'c4', // visual only; the cycle this ATH belongs to
      });
    }
    return allEvents;
  }, [data, chartData, showMarkers]);

  const firstPrice = chartData[0]?.price;
  const lastPrice = chartData[chartData.length - 1]?.price;
  const totalReturn = firstPrice && lastPrice
    ? ((lastPrice - firstPrice) / firstPrice) * 100
    : 0;

  return (
    <>
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Display options</CardTitle>
          <CardDescription>
            Toggle markers and chart scale. Data: 2014-09-17 → today, from Yahoo Finance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={logScale} onCheckedChange={(v) => setLogScale(v === true)} />
              <span>Log scale (recommended for full history)</span>
            </label>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">Markers:</span>
              {(['halving', 'ath', 'top', 'bottom'] as const).map(k => (
                <label key={k} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={showMarkers[k]}
                    onCheckedChange={(v) => setShowMarkers(prev => ({ ...prev, [k]: v === true }))}
                  />
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MARKER_COLORS[k] }} />
                    {k === 'ath' ? 'New ATH' : k.charAt(0).toUpperCase() + k.slice(1)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">BTC-USD with cycle markers</CardTitle>
          <CardDescription>
            {data ? (
              <>
                {data.btcDaily.length.toLocaleString()} daily closes ·{' '}
                <span className="text-muted-foreground">first</span> {fmtUSD(firstPrice ?? 0)} →{' '}
                <span className="text-muted-foreground">last</span> {fmtUSD(lastPrice ?? 0)}
                {' '}(<span className={totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}>{fmtPct(totalReturn)}</span>)
              </>
            ) : 'Loading…'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="bg-red-500/10 border border-red-500/40 rounded p-3 text-sm text-red-300">
              <AlertTriangle className="inline h-4 w-4 mr-1" /> Failed to load: {(error as Error).message}
            </div>
          ) : isLoading || !data ? (
            <Skeleton className="h-[420px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={420}>
              <ComposedChart data={chartData} margin={{ top: 16, right: 24, left: 8, bottom: 5 }}>
                <CartesianGrid stroke="#333" strokeDasharray="3 3" />
                <XAxis
                  dataKey="ts"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tick={{ fontSize: 10, fill: '#888' }}
                  tickFormatter={(ts) => new Date(ts).toISOString().slice(0, 7)}
                  minTickGap={60}
                />
                <YAxis
                  scale={logScale ? 'log' : 'linear'}
                  domain={logScale ? ['auto', 'auto'] : ['auto', 'auto']}
                  tick={{ fontSize: 10, fill: '#888' }}
                  tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v.toFixed(0)}`}
                  allowDataOverflow
                />
                <RTooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #444', fontSize: 12 }}
                  labelStyle={{ color: '#fb923c' }}
                  labelFormatter={(label) => typeof label === 'number' ? new Date(label).toISOString().slice(0, 10) : String(label)}
                  formatter={(v: number) => [`$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'BTC']}
                />

                {/* Vertical marker lines — all SOLID matching Tyler's TradingView reference.
                    x uses unix-ms timestamps so they line up on the time-scaled axis
                    even when the exact event date isn't in the downsampled data. */}
                {data.events.filter(e => showMarkers[e.kind as keyof typeof showMarkers]).map((e, i) => (
                  <ReferenceLine
                    key={`v-${e.kind}-${e.cycle}-${i}`}
                    x={Date.parse(e.date + 'T00:00:00Z')}
                    stroke={MARKER_COLORS[e.kind as keyof typeof MARKER_COLORS]}
                    strokeWidth={1.5}
                  />
                ))}
                {showMarkers.ath && data.athBreaks.slice(0, 30).map((ab, i) => (
                  <ReferenceLine
                    key={`ath-${i}`}
                    x={Date.parse(ab.date + 'T00:00:00Z')}
                    stroke={MARKER_COLORS.ath}
                    strokeWidth={1.5}
                  />
                ))}

                <Line type="monotone" dataKey="price" stroke="#fb923c" strokeWidth={2} dot={false} name="BTC-USD" />

                {/* Marker dots — one ReferenceDot per event for hover labels */}
                {eventDots.map((d, i) => (
                  <ReferenceDot
                    key={`dot-${i}`}
                    x={d.ts}
                    y={d.price}
                    r={4}
                    fill={MARKER_COLORS[d.kind as keyof typeof MARKER_COLORS]}
                    stroke="#1a1a1a"
                    strokeWidth={1}
                    ifOverflow="extendDomain"
                    isFront
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Cycle stats summary */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cycle markers — quick reference</CardTitle>
            <CardDescription>Dates and prices used for the overlay tool</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40">
                    <th className="text-left py-2 px-2 font-medium">Cycle</th>
                    <th className="text-left py-2 px-2 font-medium">Halving</th>
                    <th className="text-left py-2 px-2 font-medium">Cycle Top</th>
                    <th className="text-left py-2 px-2 font-medium">Cycle Bottom</th>
                    <th className="text-right py-2 px-2 font-medium">Top ROI</th>
                    <th className="text-right py-2 px-2 font-medium">Drawdown</th>
                  </tr>
                </thead>
                <tbody>
                  {(['c1', 'c2', 'c3', 'c4'] as const).map(cid => {
                    const halving = data.events.find(e => e.cycle === cid && e.kind === 'halving');
                    const top = data.events.find(e => e.cycle === cid && e.kind === 'top');
                    const bottom = data.events.find(e => e.cycle === cid && e.kind === 'bottom');
                    const topROI = halving?.price && top?.price
                      ? ((top.price - halving.price) / halving.price) * 100
                      : null;
                    const drawdown = top?.price && bottom?.price
                      ? ((bottom.price - top.price) / top.price) * 100
                      : null;
                    return (
                      <tr key={cid} className="border-b border-border/20">
                        <td className="py-2 px-2 font-semibold">Cycle {cid.slice(1)}</td>
                        <td className="py-2 px-2">
                          {halving ? (
                            <>
                              <div>{fmtDate(halving.date)}</div>
                              <div className="text-xs text-muted-foreground font-mono">{fmtUSD(halving.price ?? 0)}</div>
                            </>
                          ) : '—'}
                        </td>
                        <td className="py-2 px-2">
                          {top ? (
                            <>
                              <div>{fmtDate(top.date)}</div>
                              <div className="text-xs text-orange-400 font-mono">{fmtUSD(top.price ?? 0)}</div>
                            </>
                          ) : '—'}
                        </td>
                        <td className="py-2 px-2">
                          {bottom ? (
                            <>
                              <div>{fmtDate(bottom.date)}</div>
                              <div className="text-xs text-red-400 font-mono">{fmtUSD(bottom.price ?? 0)}</div>
                            </>
                          ) : (
                            <span className="text-muted-foreground">— projected Q4 2026</span>
                          )}
                        </td>
                        <td className={`py-2 px-2 text-right font-mono ${topROI != null && topROI >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {topROI != null ? fmtPct(topROI) : '—'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-red-400">
                          {drawdown != null ? fmtPct(drawdown) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// ============================================================================
// Tab 2 — Cycle Section Overlay
// ============================================================================

function OverlayTab() {
  const [presetIdx, setPresetIdx] = useState(0); // start with "Halving → Top"
  const [selectedCycles, setSelectedCycles] = useState<Array<'c1' | 'c2' | 'c3' | 'c4'>>(['c2', 'c3', 'c4']);

  const preset = SECTION_PRESETS[presetIdx];

  const { data, isLoading, error, refetch, isFetching } = useQuery<OverlayResp>({
    queryKey: ['/api/cycle/overlay', preset.from, preset.to, selectedCycles.join(',')],
    queryFn: async ({ queryKey }) => {
      const [url, from, to, cycles] = queryKey as [string, string, string, string];
      const u = new URL(url, window.location.origin);
      u.searchParams.set('from', from);
      u.searchParams.set('to', to);
      u.searchParams.set('cycles', cycles);
      const r = await fetch(u.toString());
      if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
      return r.json();
    },
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000,
  });

  // Combine all cycle series into one dataset keyed by day, so the chart
  // shows each cycle as a separate line. Recharts wants one y-axis key
  // per series, so we pivot to { day, c2: retPct, c3: retPct, c4: retPct }.
  const chartData = useMemo(() => {
    if (!data?.series?.length) return [];
    const dayMap = new Map<number, any>();
    for (const s of data.series) {
      for (const p of s.points) {
        const row = dayMap.get(p.day) ?? { day: p.day };
        row[s.cycleId] = +p.retPct.toFixed(2);
        // Stash the price too for tooltip
        row[`${s.cycleId}_price`] = p.price;
        row[`${s.cycleId}_date`] = p.date;
        dayMap.set(p.day, row);
      }
    }
    return Array.from(dayMap.values()).sort((a, b) => a.day - b.day);
  }, [data]);

  // For the chart, x-axis range = max days across selected cycles
  const maxDay = useMemo(() => {
    if (!data?.series?.length) return 0;
    return Math.max(...data.series.map(s => s.days));
  }, [data]);

  function toggleCycle(id: 'c1' | 'c2' | 'c3' | 'c4') {
    setSelectedCycles(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // must have at least 1
        return prev.filter(c => c !== id);
      }
      return [...prev, id].sort();
    });
  }

  return (
    <>
      {/* Section + cycle controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pick a section</CardTitle>
          <CardDescription>
            Choose which slice of each cycle you want to overlay. All selected cycles are
            normalized so day 0 = section start and 0% = starting price.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Preset chips */}
          <div className="flex flex-wrap gap-2">
            {SECTION_PRESETS.map((p, i) => (
              <Button
                key={p.label}
                variant={i === presetIdx ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPresetIdx(i)}
                className={i === presetIdx ? 'bg-[#F7931A] hover:bg-[#E67500] text-black' : ''}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground -mt-3">
            {preset.description}
          </div>

          {/* Manual from/to override */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">From</label>
              <Select
                value={preset.from}
                onValueChange={(v) => {
                  const idx = SECTION_PRESETS.findIndex(p => p.from === v && p.to === preset.to);
                  if (idx >= 0) setPresetIdx(idx);
                  // If no matching preset, use the first preset that starts with this `from`
                  else {
                    const fallback = SECTION_PRESETS.findIndex(p => p.from === v);
                    setPresetIdx(fallback >= 0 ? fallback : 0);
                  }
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="halving">Halving</SelectItem>
                  <SelectItem value="top">Cycle Top</SelectItem>
                  <SelectItem value="bottom">Cycle Bottom</SelectItem>
                  <SelectItem value="prevBottom">Prev Cycle Bottom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end justify-center pb-1.5">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">To</label>
              <Select
                value={preset.to}
                onValueChange={(v) => {
                  const idx = SECTION_PRESETS.findIndex(p => p.from === preset.from && p.to === v);
                  if (idx >= 0) setPresetIdx(idx);
                  else {
                    const fallback = SECTION_PRESETS.findIndex(p => p.to === v);
                    setPresetIdx(fallback >= 0 ? fallback : 0);
                  }
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Cycle Top</SelectItem>
                  <SelectItem value="bottom">Cycle Bottom</SelectItem>
                  <SelectItem value="halving">Next Halving</SelectItem>
                  <SelectItem value="nextTop">Next Cycle Top</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cycle multi-select */}
          <div>
            <div className="text-xs text-muted-foreground mb-2">Cycles to overlay</div>
            <div className="flex flex-wrap gap-2">
              {ALL_CYCLES.map(c => {
                const checked = selectedCycles.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors ${
                      checked
                        ? 'border-[#F7931A]/50 bg-[#F7931A]/10'
                        : 'border-border/40 bg-muted/20 hover:bg-muted/40'
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleCycle(c.id)}
                    />
                    <span
                      className="w-3 h-3 rounded-full inline-block"
                      style={{ backgroundColor: CYCLE_COLORS[c.id] }}
                    />
                    <div>
                      <div className="text-sm font-semibold leading-tight">{c.label}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight">{c.range}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Reloading…</> : 'Reload data'}
          </Button>
        </CardContent>
      </Card>

      {/* Skipped notice */}
      {data?.skipped && data.skipped.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-amber-400">
                <AlertTriangle className="inline h-3 w-3 mr-1" />
                {data.skipped.length} cycle{data.skipped.length === 1 ? '' : 's'} skipped:
              </span>{' '}
              {data.skipped.map(s => `${s.cycleId} (${s.reason})`).join(' · ')}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section summary chips */}
      {data?.series && data.series.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.series.map(s => (
            <Card key={s.cycleId} className={s.inProgress ? 'border-amber-500/40 bg-amber-500/[0.03]' : ''}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CYCLE_COLORS[s.cycleId] }}
                  />
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {s.cycleLabel}
                  </div>
                  {s.inProgress && (
                    <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10 text-[10px] uppercase tracking-wider font-semibold">
                      live · day {s.days}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1.5 text-sm">
                  <Row label="From" value={`${fmtDate(s.fromDate)} (${preset.from})`} />
                  <Row label="To" value={
                    s.inProgress
                      ? <span className="text-amber-400">today <span className="text-muted-foreground">(in progress — {s.toKind} not yet)</span></span>
                      : `${fmtDate(s.toDate)} (${s.toKind})`
                  } />
                  <Row label="Duration" value={
                    <span className="font-mono">
                      {s.days} days <span className="text-muted-foreground">({(s.days / 30.44).toFixed(1)} mo)</span>
                      {s.inProgress && <span className="text-amber-400 ml-1">· live</span>}
                    </span>
                  } />
                  <Row label="Price change" value={
                    <span className={`font-mono font-semibold ${s.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmtPct(s.changePct)}
                      {s.inProgress && <span className="text-amber-400 ml-1 text-xs font-normal">(so far)</span>}
                    </span>
                  } />
                  <Row label={s.inProgress ? 'Peak → now' : 'Peak'} value={
                    <span className="font-mono">
                      {fmtUSD(s.startPrice)} → {fmtUSD(s.endPrice)}
                    </span>
                  } />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Overlay chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {preset.label} — overlay
          </CardTitle>
          <CardDescription>
            X-axis: days from section start (day 0). Y-axis: % return from section start.
            Each colored line is one cycle's section. Longer sections stretch further right.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="bg-red-500/10 border border-red-500/40 rounded p-3 text-sm text-red-300">
              <AlertTriangle className="inline h-4 w-4 mr-1" /> Failed to load: {(error as Error).message}
            </div>
          ) : isLoading || !data ? (
            <Skeleton className="h-[440px] w-full" />
          ) : data.series.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No cycles available for this section. Try a different combination.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={440}>
                <LineChart data={chartData} margin={{ top: 16, right: 24, left: 8, bottom: 5 }}>
                  <CartesianGrid stroke="#333" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="day"
                    type="number"
                    domain={[0, maxDay]}
                    tick={{ fontSize: 10, fill: '#888' }}
                    tickFormatter={(d) => `${d}d`}
                    label={{ value: 'days from section start', position: 'insideBottom', offset: -2, fill: '#888', fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#888' }}
                    tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
                    label={{ value: '% return', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 11 }}
                  />
                  <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                  <RTooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #444', fontSize: 12 }}
                    labelStyle={{ color: '#fb923c' }}
                    labelFormatter={(day: number) => `Day ${day}`}
                    formatter={(value: number, name: string) => {
                      if (name.endsWith('_price') || name.endsWith('_date')) return [null, null];
                      const cycleId = name as 'c1' | 'c2' | 'c3' | 'c4';
                      const series = data.series.find(s => s.cycleId === cycleId);
                      if (!series) return [null, null];
                      return [
                        <div key={cycleId} className="space-y-0.5">
                          <div className="font-mono text-emerald-300">
                            {value >= 0 ? '+' : ''}{value.toFixed(2)}%
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {series.cycleLabel}
                          </div>
                        </div>,
                        null,
                      ];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(value) => {
                      const cycleId = value as 'c1' | 'c2' | 'c3' | 'c4';
                      const series = data.series.find(s => s.cycleId === cycleId);
                      if (!series) return value;
                      return series.inProgress
                        ? `${series.cycleLabel} · live`
                        : series.cycleLabel;
                    }}
                  />
                  {data.series.map(s => (
                    <Line
                      key={s.cycleId}
                      type="monotone"
                      dataKey={s.cycleId}
                      stroke={CYCLE_COLORS[s.cycleId]}
                      strokeWidth={2}
                      strokeDasharray={s.inProgress ? '6 3' : undefined}
                      dot={false}
                      name={s.cycleId}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div className="text-[10px] text-muted-foreground mt-2 flex flex-wrap gap-4">
                <span><CheckCircle2 className="inline h-3 w-3 mr-0.5 text-emerald-400" /> Positive return</span>
                <span><XCircle className="inline h-3 w-3 mr-0.5 text-red-400" /> Negative return</span>
                <span className="ml-auto">{chartData.length.toLocaleString()} daily points across {data.series.length} cycle{data.series.length === 1 ? '' : 's'}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted-foreground text-xs uppercase tracking-wider">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

// ============================================================================
// Tab 3 — Multi-Asset Overlay
// ============================================================================
//
// Anchors on a single BTC cycle (c2/c3/c4) and overlays the requested assets
// (BTC + IBIT + COIN + MSTR by default). Each asset's price during the
// section is normalized to 0% at section start so all lines start at the
// same point on the same x-axis. Useful for asking questions like:
// "During BTC's halving→top (cycle 4), did COIN outperform BTC?"
//
// Backend: GET /api/cycle/asset-overlay?assets=...&cycle=...&from=...&to=...

interface AssetOverlayPoint {
  day: number;
  date: string;
  price: number;
  retPct: number;
}

interface AssetOverlayResp {
  cycle: 'c2' | 'c3' | 'c4';
  cycleLabel: string;
  section: {
    from: { kind: string; cycle: string; date: string };
    to:   { kind: string; cycle: string; date: string };
    days: number;
  };
  assets: Array<{
    symbol: string;
    label: string;
    firstAvailable: string;
    fromDate: string;
    toDate: string;
    days: number;
    startPrice: number;
    endPrice: number;
    changePct: number;
    inProgress?: boolean;
    points: AssetOverlayPoint[];
  }>;
  skipped: Array<{ symbol: string; reason: string }>;
  assetCatalog: Array<{ symbol: string; label: string; firstAvailable: string }>;
  eventCatalog: CycleEvent[];
  today: string;
  asOf: string;
}

function AssetOverlayTab() {
  const [presetIdx, setPresetIdx] = useState(0); // start with Halving → Top
  const [cycleId, setCycleId] = useState<'c2' | 'c3' | 'c4'>('c4');
  const [selectedAssets, setSelectedAssets] = useState<string[]>(['BTC', 'IBIT', 'COIN', 'MSTR', 'MARA', 'RIOT']);

  const preset = SECTION_PRESETS[presetIdx];

  const { data, isLoading, error, refetch, isFetching } = useQuery<AssetOverlayResp>({
    queryKey: ['/api/cycle/asset-overlay', preset.from, preset.to, cycleId, selectedAssets.join(',')],
    queryFn: async ({ queryKey }) => {
      const [url, from, to, cycle, assets] = queryKey as [string, string, string, string, string];
      const u = new URL(url, window.location.origin);
      u.searchParams.set('from', from);
      u.searchParams.set('to', to);
      u.searchParams.set('cycle', cycle);
      u.searchParams.set('assets', assets);
      const r = await fetch(u.toString());
      if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
      return r.json();
    },
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000,
  });

  // Combine asset series into one chart dataset keyed by day, similar to
  // the existing overlay tab.
  const chartData = useMemo(() => {
    if (!data?.assets?.length) return [];
    const dayMap = new Map<number, any>();
    for (const s of data.assets) {
      for (const p of s.points) {
        const row = dayMap.get(p.day) ?? { day: p.day };
        row[s.symbol] = +p.retPct.toFixed(2);
        row[`${s.symbol}_price`] = p.price;
        row[`${s.symbol}_date`] = p.date;
        dayMap.set(p.day, row);
      }
    }
    return Array.from(dayMap.values()).sort((a, b) => a.day - b.day);
  }, [data]);

  const maxDay = useMemo(() => {
    if (!data?.assets?.length) return 0;
    return Math.max(...data.assets.map(s => s.days));
  }, [data]);

  function toggleAsset(symbol: string) {
    setSelectedAssets(prev => {
      if (prev.includes(symbol)) {
        if (prev.length === 1) return prev;
        return prev.filter(s => s !== symbol);
      }
      return [...prev, symbol].sort();
    });
  }

  return (
    <>
      {/* Section + cycle + asset controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pick a section + cycle + assets</CardTitle>
          <CardDescription>
            Section dates are anchored to BTC's cycle events. Each selected asset's price
            during that window is normalized to 0% at section start so the shape lines up
            day-for-day across all assets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Section preset chips */}
          <div>
            <div className="text-xs text-muted-foreground mb-2">Section</div>
            <div className="flex flex-wrap gap-2">
              {SECTION_PRESETS.map((p, i) => (
                <Button
                  key={p.label}
                  variant={i === presetIdx ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPresetIdx(i)}
                  className={i === presetIdx ? 'bg-[#F7931A] hover:bg-[#E67500] text-black' : ''}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-2">{preset.description}</div>
          </div>

          {/* Cycle dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">BTC cycle anchor</label>
              <Select value={cycleId} onValueChange={(v) => setCycleId(v as 'c2' | 'c3' | 'c4')}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="c2">Cycle 2 (2016 halving)</SelectItem>
                  <SelectItem value="c3">Cycle 3 (2020 halving)</SelectItem>
                  <SelectItem value="c4">Cycle 4 (2024 halving)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">From → To</label>
              <div className="mt-1 px-3 py-2 rounded border border-border/40 bg-muted/20 text-sm font-mono flex items-center gap-2">
                <span className="text-muted-foreground">{preset.from}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">{preset.to}</span>
              </div>
            </div>
          </div>

          {/* Asset multi-select */}
          <div>
            <div className="text-xs text-muted-foreground mb-2">Assets to overlay</div>
            <div className="flex flex-wrap gap-2">
              {ASSET_CATALOG.map(a => {
                const checked = selectedAssets.includes(a.symbol);
                return (
                  <label
                    key={a.symbol}
                    className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors ${
                      checked
                        ? 'border-[#F7931A]/50 bg-[#F7931A]/10'
                        : 'border-border/40 bg-muted/20 hover:bg-muted/40'
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleAsset(a.symbol)}
                    />
                    <span
                      className="w-3 h-3 rounded-full inline-block"
                      style={{ backgroundColor: ASSET_COLORS[a.symbol] }}
                    />
                    <div>
                      <div className="text-sm font-semibold leading-tight">{a.symbol}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight">{a.label}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Reloading…</> : 'Reload data'}
          </Button>
        </CardContent>
      </Card>

      {/* Skipped notice */}
      {data?.skipped && data.skipped.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-amber-400">
                <AlertTriangle className="inline h-3 w-3 mr-1" />
                {data.skipped.length} asset{data.skipped.length === 1 ? '' : 's'} skipped:
              </span>{' '}
              {data.skipped.map(s => `${s.symbol} (${s.reason})`).join(' · ')}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Asset summary cards */}
      {data?.assets && data.assets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.assets.map(s => (
            <Card
              key={s.symbol}
              className={s.inProgress ? 'border-amber-500/40 bg-amber-500/[0.03]' : ''}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: ASSET_COLORS[s.symbol] || '#888' }}
                  />
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {s.symbol}
                  </div>
                  {s.inProgress && (
                    <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10 text-[10px] uppercase tracking-wider font-semibold">
                      live · day {s.days}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mb-2">{s.label}</div>
                <div className="space-y-1.5 text-sm">
                  <Row label="Section" value={
                    <span className="font-mono text-xs">
                      {fmtDate(s.fromDate)} → {s.inProgress ? <span className="text-amber-400">today</span> : fmtDate(s.toDate)}
                    </span>
                  } />
                  <Row label="Duration" value={
                    <span className="font-mono">
                      {s.days}d
                      {s.inProgress && <span className="text-amber-400 ml-1 text-xs">· live</span>}
                    </span>
                  } />
                  <Row label="Price change" value={
                    <span className={`font-mono font-semibold ${s.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmtPct(s.changePct)}
                      {s.inProgress && <span className="text-amber-400 ml-1 text-xs font-normal">(so far)</span>}
                    </span>
                  } />
                  <Row label={s.inProgress ? 'Start → now' : 'Start → end'} value={
                    <span className="font-mono text-xs">
                      {fmtUSD(s.startPrice)} → {fmtUSD(s.endPrice)}
                    </span>
                  } />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Asset overlay chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {data ? `${data.cycleLabel} · ${preset.label}` : preset.label} — asset overlay
          </CardTitle>
          <CardDescription>
            X-axis: days from BTC's section start (day 0). Y-axis: % return from each
            asset's section-start price. Each colored line is one asset during the same
            BTC-anchored window.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="bg-red-500/10 border border-red-500/40 rounded p-3 text-sm text-red-300">
              <AlertTriangle className="inline h-4 w-4 mr-1" /> Failed to load: {(error as Error).message}
            </div>
          ) : isLoading || !data ? (
            <Skeleton className="h-[440px] w-full" />
          ) : data.assets.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No assets available for this section. Try a different combination.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={440}>
                <LineChart data={chartData} margin={{ top: 16, right: 24, left: 8, bottom: 5 }}>
                  <CartesianGrid stroke="#333" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="day"
                    type="number"
                    domain={[0, maxDay]}
                    tick={{ fontSize: 10, fill: '#888' }}
                    tickFormatter={(d) => `${d}d`}
                    label={{ value: 'days from section start', position: 'insideBottom', offset: -2, fill: '#888', fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#888' }}
                    tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
                    label={{ value: '% return', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 11 }}
                  />
                  <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                  <RTooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #444', fontSize: 12 }}
                    labelStyle={{ color: '#fb923c' }}
                    labelFormatter={(day: number) => `Day ${day}`}
                    formatter={(value: number, name: string) => {
                      if (name.endsWith('_price') || name.endsWith('_date')) return [null, null];
                      const asset = data.assets.find(s => s.symbol === name);
                      if (!asset) return [null, null];
                      return [
                        <div key={name} className="space-y-0.5">
                          <div className="font-mono text-emerald-300">
                            {value >= 0 ? '+' : ''}{value.toFixed(2)}%
                          </div>
                          <div className="text-[10px] text-muted-foreground">{asset.symbol} · {asset.label}</div>
                        </div>,
                        null,
                      ];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(value) => {
                      const asset = data.assets.find(s => s.symbol === value);
                      if (!asset) return value;
                      return asset.inProgress ? `${asset.symbol} · live` : asset.symbol;
                    }}
                  />
                  {data.assets.map(s => (
                    <Line
                      key={s.symbol}
                      type="monotone"
                      dataKey={s.symbol}
                      stroke={ASSET_COLORS[s.symbol] || '#888'}
                      strokeWidth={2}
                      strokeDasharray={s.inProgress ? '6 3' : undefined}
                      dot={false}
                      name={s.symbol}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div className="text-[10px] text-muted-foreground mt-2 flex flex-wrap gap-4">
                <span><CheckCircle2 className="inline h-3 w-3 mr-0.5 text-emerald-400" /> Outperforming start</span>
                <span><XCircle className="inline h-3 w-3 mr-0.5 text-red-400" /> Underperforming start</span>
                <span className="ml-auto">{chartData.length.toLocaleString()} daily points across {data.assets.length} asset{data.assets.length === 1 ? '' : 's'}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}