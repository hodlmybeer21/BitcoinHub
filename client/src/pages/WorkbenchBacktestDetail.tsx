// BitcoinHub Workbench — Single Published Backtest View
// /workbench/backtests/:id — full backtest result + equity curve.
// Phase 9, 2026-08-19. Reuses the same charts as Workbench.tsx modal.

'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useRoute } from 'wouter';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip,
} from 'recharts';
import {
  BookOpen, Hammer, Eye, GitFork, ArrowLeft, Copy,
  TrendingUp, TrendingDown, AlertCircle,
} from 'lucide-react';
import { getUserId } from '@/lib/persistence/client';

interface BacktestDetail {
  id: number;
  authorUuidPrefix: string;
  title: string;
  description: string;
  viewCount: number;
  forkCount: number;
  publishedAt: string;
  backtestResult: {
    formula: string;
    mode: 'single_asset' | 'portfolio';
    weights?: Record<string, number>;
    range: { start: string; end: string; actualStart: string; actualEnd: string };
    strategy: string;
    stats: {
      totalReturnPct: number;
      annualizedReturnPct: number;
      alphaPct: number;
      sharpeRatio: number;
      maxDrawdownPct: number;
      winRatePct: number;
      exposurePct: number;
      numTrades: number;
      signalDays: number;
      totalDays: number;
      benchmarkReturnPct: number;
    };
    equityCurve: Array<{ date: string; strategy: number; benchmark: number }>;
  } | null;
}

function fmtPct(v: number): string {
  if (!Number.isFinite(v)) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}

function downsampleEquity(curve: Array<{ date: string; strategy: number; benchmark: number }>, max = 200): typeof curve {
  if (curve.length <= max) return curve;
  const step = Math.max(1, Math.floor(curve.length / max));
  const sampled: typeof curve = [];
  for (let i = 0; i < curve.length; i += step) sampled.push(curve[i]);
  if (sampled[sampled.length - 1] !== curve[curve.length - 1]) sampled.push(curve[curve.length - 1]);
  return sampled;
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: 'green' | 'red' | 'neutral' }) {
  const valueColor = accent === 'green' ? 'text-green-400' : accent === 'red' ? 'text-red-400' : 'text-foreground';
  return (
    <div className="bg-muted/30 border border-border/40 rounded p-3">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-mono font-bold mt-0.5 ${valueColor}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export default function WorkbenchBacktestDetail() {
  const [, params] = useRoute<{ id: string }>('/workbench/backtests/:id');
  const id = params?.id;

  const { data, isLoading, error } = useQuery<BacktestDetail>({
    queryKey: ['/api/workbench/backtest', id],
    queryFn: () => fetch(`/api/workbench/backtest/${id}`).then(r => r.json()),
    enabled: !!id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Fork = copy formula + weights + range to the user's localStorage and
  // navigate to /workbench with those values pre-filled. Uses the same
  // STORAGE_KEY ('workbench_pending_fork') pattern as WorkbenchGallery.
  const forkedKey = 'workbench_pending_fork';
  const forkedJson = useMemo(() => {
    if (!data?.backtestResult) return null;
    return JSON.stringify({
      formula: data.backtestResult.formula,
      weights: data.backtestResult.weights,
      range: data.backtestResult.range,
      mode: data.backtestResult.mode,
    });
  }, [data]);

  function forkToWorkbench() {
    if (!forkedJson) return;
    try {
      const userId = getUserId();
      const stored = JSON.parse(localStorage.getItem(forkedKey) || '{}');
      stored[userId] = JSON.parse(forkedJson);
      localStorage.setItem(forkedKey, JSON.stringify(stored));
      window.location.href = '/workbench';
    } catch (e) {
      console.error('[backtest-fork] failed:', e);
    }
  }

  function copyLink() {
    if (typeof window === 'undefined') return;
    navigator.clipboard?.writeText(window.location.href);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background max-w-6xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <AlertCircle className="h-8 w-8 mx-auto text-red-400" />
            <div className="font-semibold text-foreground">
              {data === undefined ? 'Backtest not found or not public.' : 'Failed to load backtest.'}
            </div>
            <Button asChild variant="outline">
              <Link href="/workbench/backtests">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to gallery
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Server returns 404 as { error: '...' }; show the same not-found UI.
  if ((data as any).error) {
    return (
      <div className="min-h-screen bg-background max-w-6xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <AlertCircle className="h-8 w-8 mx-auto text-red-400" />
            <div className="font-semibold text-foreground">{(data as any).error}</div>
            <Button asChild variant="outline">
              <Link href="/workbench/backtests">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to gallery
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const r = data.backtestResult;
  if (!r) {
    return (
      <div className="min-h-screen bg-background max-w-6xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Backtest data is empty or corrupted.
          </CardContent>
        </Card>
      </div>
    );
  }

  const weightsList = r.weights
    ? Object.entries(r.weights).map(([k, v]) => `${k} ${Math.round((v as number) * 100)}%`).join(', ')
    : null;
  const years = Math.round(
    (new Date(r.range.actualEnd).getTime() - new Date(r.range.actualStart).getTime()) / (365.25 * 86400000),
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Button asChild variant="ghost" size="sm" className="mb-3 -ml-3">
              <Link href="/workbench/backtests">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to gallery
              </Link>
            </Button>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-6 w-6 text-orange-500" />
              <h1 className="text-3xl font-bold">{data.title}</h1>
              <Badge variant="outline" className="text-[10px] font-mono">{data.authorUuidPrefix}</Badge>
              {r.mode === 'portfolio' && <Badge variant="secondary" className="text-[10px]">Portfolio</Badge>}
            </div>
            {data.description && (
              <p className="text-muted-foreground max-w-3xl">{data.description}</p>
            )}
            <div className="text-[11px] text-muted-foreground font-mono mt-2 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{data.viewCount} views</span>
              <span className="flex items-center gap-1"><GitFork className="h-3 w-3" />{data.forkCount} forks</span>
              <span>{new Date(data.publishedAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={copyLink} variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-1" /> Copy link
            </Button>
            <Button onClick={forkToWorkbench} disabled={!forkedJson}>
              <GitFork className="h-4 w-4 mr-1" /> Fork to Workbench
            </Button>
          </div>
        </div>

        {/* Formula + range + weights summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Formula</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/30 border border-border/40 rounded p-3 font-mono text-xs break-all text-foreground/90">
              {r.formula}
            </div>
            <div className="text-xs text-muted-foreground font-mono grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-wide">Range</div>
                <div className="text-foreground">{r.range.actualStart} → {r.range.actualEnd}</div>
                {r.range.actualStart !== r.range.start && (
                  <div className="text-[10px] text-amber-400">(requested {r.range.start})</div>
                )}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide">Duration</div>
                <div className="text-foreground">{years}y · {r.stats.totalDays.toLocaleString()} days</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide">Mode</div>
                <div className="text-foreground">{r.mode === 'portfolio' ? 'Portfolio' : 'Single-asset (BTC)'}</div>
              </div>
              {weightsList && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide">Weights</div>
                  <div className="text-foreground">{weightsList}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stats</CardTitle>
            <CardDescription>Strategy returns vs benchmark (BTC buy-and-hold or equal-weight portfolio).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Strategy Return" value={fmtPct(r.stats.totalReturnPct)} accent={r.stats.alphaPct >= 0 ? 'green' : 'red'} sub={`Buy & Hold: ${fmtPct(r.stats.benchmarkReturnPct)}`} />
              <StatCard label="Alpha" value={fmtPct(r.stats.alphaPct)} accent={r.stats.alphaPct >= 0 ? 'green' : 'red'} sub="vs buy & hold" />
              <StatCard label="Annualized (CAGR)" value={fmtPct(r.stats.annualizedReturnPct)} accent="neutral" />
              <StatCard label="Sharpe Ratio" value={r.stats.sharpeRatio.toFixed(2)} accent={r.stats.sharpeRatio >= 1 ? 'green' : r.stats.sharpeRatio >= 0 ? 'neutral' : 'red'} sub="annualized, 0 rf" />
              <StatCard label="Max Drawdown" value={fmtPct(r.stats.maxDrawdownPct)} accent="red" />
              <StatCard label="Win Rate" value={fmtPct(r.stats.winRatePct)} accent="neutral" sub={`in-position days (${r.stats.totalDays} total)`} />
              <StatCard label="Exposure" value={fmtPct(r.stats.exposurePct)} accent="neutral" sub={`${r.stats.numTrades} trades`} />
              <StatCard label="Days" value={r.stats.totalDays.toLocaleString()} accent="neutral" sub={`${r.stats.signalDays} in position`} />
            </div>
          </CardContent>
        </Card>

        {/* Equity curve */}
        {r.equityCurve && r.equityCurve.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Equity curve ($1 normalized)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={downsampleEquity(r.equityCurve)} margin={{ top: 5, right: 16, left: 8, bottom: 5 }}>
                  <CartesianGrid stroke="#333" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#888' }}
                    tickFormatter={(d) => d.slice(0, 7)}
                    minTickGap={50}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#888' }}
                    tickFormatter={(v) => `${v.toFixed(1)}x`}
                    domain={['auto', 'auto']}
                  />
                  <RTooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #444', fontSize: 12 }}
                    labelStyle={{ color: '#fb923c' }}
                    formatter={(v: number) => [`${v.toFixed(3)}x`, '']}
                  />
                  <Line type="monotone" dataKey="benchmark" stroke="#888" strokeWidth={1.5} dot={false} name="Buy & Hold" />
                  <Line type="monotone" dataKey="strategy" stroke="#fb923c" strokeWidth={2} dot={false} name="Strategy" />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 text-[10px] mt-2 text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#fb923c] inline-block"></span> Strategy</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#888] inline-block"></span> Buy &amp; Hold</span>
                <span className="ml-auto">{r.equityCurve.length.toLocaleString()} daily points</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bottom CTA */}
        <Card>
          <CardContent className="py-6 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold">Want to tweak this strategy?</div>
              <div className="text-sm text-muted-foreground">Fork it into your Workbench and adjust the formula, range, or portfolio weights.</div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/workbench/backtests">
                  <BookOpen className="h-4 w-4 mr-2" /> More backtests
                </Link>
              </Button>
              <Button onClick={forkToWorkbench} disabled={!forkedJson}>
                <GitFork className="h-4 w-4 mr-2" /> Fork to Workbench
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border/30">
          <p>
            Run your own from the{' '}
            <Link href="/workbench" className="text-orange-400 hover:underline inline-flex items-center gap-1">
              <Hammer className="h-3 w-3" /> Workbench
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
}