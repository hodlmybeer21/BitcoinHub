// BitcoinHub Workbench — Live Indicator Overlay
// /workbench/overlay — BTC price chart with green/red markers showing
// when a saved Workbench formula would have been "in" or "out".
// Phase 9, item C (2026-08-19). Reads saved formulas from localStorage
// (same key as Workbench), fetches the signal series via
// /api/workbench/evaluate, and overlays on a BTC-USD daily closes line.

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip, Scatter, ComposedChart, ReferenceLine,
} from 'recharts';
import {
  Activity, ArrowLeft, Hammer, BookOpen, BarChart3, Sparkles,
} from 'lucide-react';
import { getUserId } from '@/lib/persistence/client';

interface SavedIndicator {
  id: string;
  name: string;
  formula: string;
  range: { start: string; end: string };
  savedAt: string;
}

interface SeriesPoint { date: string; value: number; }
interface EvalResult {
  formula: string;
  series: SeriesPoint[];
  sources: { id: string; points: number }[];
  errors: string[];
  evalMs: number;
}

const STORAGE_KEY = 'bitcoinhub_workbench_indicators_v1';

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split('T')[0];
}
function todayISO(): string { return new Date().toISOString().split('T')[0]; }

function fmtPct(v: number): string {
  if (!Number.isFinite(v)) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}

// Coinbase Exchange public candles — primary BTC-USD daily source (free, no
// key, 2015+ history). Falls back to CoinGecko for short windows.
async function fetchBTCDaily(start: string, end: string): Promise<SeriesPoint[]> {
  // 1d candles via Coinbase Exchange API (most reliable for daily history)
  const startSec = Math.floor(new Date(start).getTime() / 1000);
  const endSec = Math.floor(new Date(end).getTime() / 1000) + 86400;
  const url = `https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=86400&start=${startSec}&end=${endSec}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Coinbase ${res.status}`);
  const arr: Array<[number, number, number, number, number, number]> = await res.json();
  // Coinbase candles: [time, low, high, open, close, volume]; ascending sort
  return arr
    .map(([t, _l, _h, _o, close]) => ({
      date: new Date(t * 1000).toISOString().split('T')[0],
      value: close,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default function WorkbenchOverlay() {
  const [, navigate] = useLocation();
  const [saved, setSaved] = useState<SavedIndicator[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [rangeStart, setRangeStart] = useState<string>(daysAgoISO(730));
  const [rangeEnd, setRangeEnd] = useState<string>(todayISO());
  const [btcSeries, setBtcSeries] = useState<SeriesPoint[]>([]);
  const [signalSeries, setSignalSeries] = useState<SeriesPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evalMs, setEvalMs] = useState<number | null>(null);
  const [evalSources, setEvalSources] = useState<{ id: string; points: number }[]>([]);

  // Load saved indicators from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedIndicator[];
      if (Array.isArray(parsed)) {
        setSaved(parsed);
        if (parsed.length > 0 && !selectedId) {
          setSelectedId(parsed[0].id);
          // Use saved formula's range as the default range
          setRangeStart(parsed[0].range.start);
          setRangeEnd(parsed[0].range.end);
        }
      }
    } catch (_) { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(
    () => saved.find(s => s.id === selectedId),
    [saved, selectedId],
  );

  async function loadOverlay() {
    if (!selected) {
      setError('Pick a saved formula first.');
      return;
    }
    setLoading(true);
    setError(null);
    setBtcSeries([]);
    setSignalSeries([]);
    try {
      const [btc, evalRes] = await Promise.all([
        fetchBTCDaily(rangeStart, rangeEnd),
        fetch('/api/workbench/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formula: selected.formula,
            range: { start: rangeStart, end: rangeEnd },
          }),
        }).then(r => r.json() as Promise<EvalResult>),
      ]);
      setBtcSeries(btc);
      setSignalSeries(evalRes.series || []);
      setEvalMs(evalRes.evalMs ?? null);
      setEvalSources(evalRes.sources || []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load overlay');
    } finally {
      setLoading(false);
    }
  }

  // Combine BTC + signals into a single chart dataset
  const chartData = useMemo(() => {
    if (btcSeries.length === 0 && signalSeries.length === 0) return [];
    // Index BTC by date for O(1) lookup
    const btcByDate = new Map(btcSeries.map(p => [p.date, p.value]));
    // Union of dates
    const dateSet = new Set<string>();
    btcSeries.forEach(p => dateSet.add(p.date));
    signalSeries.forEach(p => dateSet.add(p.date));
    const dates = Array.from(dateSet).sort();
    return dates.map(d => {
      const sig = signalSeries.find(s => s.date === d);
      const sigVal = sig?.value ?? null;
      return {
        date: d,
        price: btcByDate.get(d) ?? null,
        // For scatter: only set the marker fields when the value is binary 0/1
        signal: sigVal === 1 ? 1 : sigVal === 0 ? 0 : null,
        // Marker Y coordinates: only set when signal is 1 (green) or 0 (red)
        signalUp: sigVal === 1 ? btcByDate.get(d) ?? null : null,
        signalDown: sigVal === 0 ? btcByDate.get(d) ?? null : null,
      };
    });
  }, [btcSeries, signalSeries]);

  // Stats from signal series
  const stats = useMemo(() => {
    if (signalSeries.length === 0) return null;
    let up = 0, down = 0;
    for (const p of signalSeries) {
      if (p.value === 1) up++;
      else if (p.value === 0) down++;
    }
    return { up, down, total: signalSeries.length };
  }, [signalSeries]);

  // Lightweight annotation: downsample to ~500 points for chart performance
  const chartView = useMemo(() => {
    if (chartData.length <= 600) return chartData;
    const step = Math.ceil(chartData.length / 600);
    return chartData.filter((_, i) => i % step === 0 || i === chartData.length - 1);
  }, [chartData]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Button asChild variant="ghost" size="sm" className="mb-3 -ml-3">
              <Link href="/workbench">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Workbench
              </Link>
            </Button>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-6 w-6 text-orange-500" />
              <h1 className="text-3xl font-bold">Live Indicator Overlay</h1>
            </div>
            <p className="text-muted-foreground max-w-3xl">
              Visualize any saved Workbench formula as green / red markers on the BTC
              price chart. Green = signal in (formula evaluates to1), red = signal out
              (evaluates to0). Pick a formula, set a date range, click Overlay.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/workbench/gallery">
                <BookOpen className="h-4 w-4 mr-2" /> Gallery
              </Link>
            </Button>
          </div>
        </div>

        {/* Empty state — no saved formulas */}
        {!loading && saved.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <Sparkles className="h-8 w-8 mx-auto text-orange-500" />
              <div>
                <p className="font-semibold text-foreground">No saved indicators yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Build a formula in the Workbench and click Save. Saved formulas show
                  up here for overlay.
                </p>
              </div>
              <Button asChild>
                <Link href="/workbench">
                  <Hammer className="h-4 w-4 mr-2" /> Open Workbench
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        {saved.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pick a saved formula</CardTitle>
              <CardDescription>
                Select from your localStorage library. Formula values come from
                <code className="font-mono text-xs">/api/workbench/evaluate</code>; BTC
                closes come from Coinbase Exchange.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Formula</label>
                  <select
                    className="w-full bg-muted/30 border border-border/40 rounded px-2 py-1.5 text-sm mt-1"
                    value={selectedId}
                    onChange={(e) => {
                      setSelectedId(e.target.value);
                      const s = saved.find(x => x.id === e.target.value);
                      if (s) {
                        setRangeStart(s.range.start);
                        setRangeEnd(s.range.end);
                      }
                    }}
                  >
                    {saved.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {selected && (
                    <div className="mt-1 text-[10px] font-mono break-all text-muted-foreground bg-muted/20 p-2 rounded">
                      {selected.formula}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Start</label>
                  <input
                    type="date"
                    className="w-full bg-muted/30 border border-border/40 rounded px-2 py-1.5 text-sm mt-1"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">End</label>
                  <input
                    type="date"
                    className="w-full bg-muted/30 border border-border/40 rounded px-2 py-1.5 text-sm mt-1"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={loadOverlay} disabled={loading || !selected}>
                  {loading ? 'Loading…' : 'Overlay'}
                </Button>
                {stats && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground ml-auto">
                    <Badge variant="outline" className="text-xs">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1" />
                      {stats.up} in
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1" />
                      {stats.down} out
                    </Badge>
                    <span>{stats.total} signal days</span>
                    {evalMs !== null && <span>· {evalMs}ms eval</span>}
                  </div>
                )}
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/40 rounded p-2 text-xs text-red-300">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Chart */}
        {(btcSeries.length > 0 || loading) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">BTC price with overlay markers</CardTitle>
              <CardDescription>
                {selected && <span>Formula: <span className="font-mono text-xs">{selected.formula}</span></span>}
                {evalSources.length > 0 && (
                  <span className="ml-3 text-xs">
                    {evalSources.length} source{evalSources.length === 1 ? '' : 's'}:
                    {' '}{evalSources.map(s => `${s.id} (${s.points})`).join(', ')}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[340px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={340}>
                  <ComposedChart data={chartView} margin={{ top: 8, right: 16, left: 8, bottom: 5 }}>
                    <CartesianGrid stroke="#333" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: '#888' }}
                      tickFormatter={(d) => d.slice(0, 7)}
                      minTickGap={50}
                    />
                    <YAxis
                      yAxisId="price"
                      orientation="left"
                      tick={{ fontSize: 10, fill: '#888' }}
                      tickFormatter={(v) => `$${v.toLocaleString()}`}
                      domain={['auto', 'auto']}
                    />
                    <RTooltip
                      contentStyle={{ background: '#1a1a1a', border: '1px solid #444', fontSize: 12 }}
                      labelStyle={{ color: '#fb923c' }}
                      formatter={(v: number, n: string) => {
                        if (n === 'price') return [`$${v.toLocaleString()}`, 'BTC'];
                        return [v, n];
                      }}
                    />
                    <Line yAxisId="price" type="monotone" dataKey="price" stroke="#fb923c" strokeWidth={2} dot={false} name="BTC" />
                    <Scatter yAxisId="price" dataKey="signalUp" fill="#22c55e" shape="circle" name="Signal in" />
                    <Scatter yAxisId="price" dataKey="signalDown" fill="#ef4444" shape="circle" name="Signal out" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
              <div className="flex items-center gap-4 text-[10px] mt-2 text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#fb923c] inline-block"></span> BTC-USD</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span> Signal in (formula =1)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full inline-block"></span> Signal out (formula =0)</span>
                <span className="ml-auto">{chartData.length.toLocaleString()} daily points</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border/30">
          <p>
            Signals come from your saved Workbench formula evaluated daily. BTC closes
            come from <a href="https://docs.cloud.coinbase.com/exchange/reference/exchangerest-getproductcandles" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Coinbase Exchange public candles</a>{' '}
            (free, no API key). Build new formulas in the{' '}
            <Link href="/workbench" className="text-orange-400 hover:underline inline-flex items-center gap-1">
              <Hammer className="h-3 w-3" /> Workbench
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
}