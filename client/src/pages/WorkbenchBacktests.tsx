// BitcoinHub Workbench — Published Backtests Gallery
// /workbench/backtests — public backtest runs shared by the community.
// Phase 9, 2026-08-19. Mirrors WorkbenchGallery.tsx pattern but scoped to
// backtest publishes (dataKey LIKE 'workbench_backtest_%').

'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, Hammer, Eye, GitFork, BookOpen, Sparkles, TrendingUp, TrendingDown,
} from 'lucide-react';

interface PublicBacktest {
  id: number;
  authorUuidPrefix: string;
  dataKey: string;
  title: string;
  description: string;
  excerpt: string;
  viewCount: number;
  forkCount: number;
  publishedAt: string;
  // Summary parsed from data_value (best-effort; may be null if excerpt was
  // truncated mid-JSON).
  summary: {
    formula?: string;
    mode?: 'single_asset' | 'portfolio';
    range?: { actualStart: string; actualEnd: string };
    stats?: {
      totalReturnPct: number;
      alphaPct: number;
      sharpeRatio: number;
      maxDrawdownPct: number;
      exposurePct: number;
      numTrades: number;
      totalDays: number;
    };
    weights?: Record<string, number>;
  } | null;
}

interface BacktestsResponse {
  items: PublicBacktest[];
  limit: number;
  offset: number;
  count: number;
}

function fmtPct(v: number): string {
  if (!Number.isFinite(v)) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

export default function WorkbenchBacktests() {
  const queryClient = useQueryClient();
  const [toast] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<BacktestsResponse>({
    queryKey: ['/api/workbench/backtests'],
    queryFn: () => fetch('/api/workbench/backtests').then(r => r.json()),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Optional: a refresh button to manually refetch.
  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['/api/workbench/backtests'] });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-6 w-6 text-orange-500" />
              <h1 className="text-3xl font-bold">Backtest Gallery</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl">
              Public backtest runs shared by the BitcoinHub community. Open any to see the full
              strategy results, equity curve, and stats. Run your own from the{' '}
              <Link href="/workbench" className="text-orange-400 hover:underline">Workbench</Link>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={refresh} variant="outline" size="sm">
              Refresh
            </Button>
            <Button asChild>
              <Link href="/workbench">
                <Hammer className="h-4 w-4 mr-2" />
                Open Workbench
              </Link>
            </Button>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center text-red-500">
              Failed to load backtest gallery. Please try again.
            </CardContent>
          </Card>
        ) : !data?.items?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground space-y-3">
              <Sparkles className="h-8 w-8 mx-auto" />
              <div>
                <p className="font-semibold text-foreground">No published backtests yet</p>
                <p className="text-sm mt-1">
                  Run a backtest in the Workbench, then click "Share to gallery" to publish it here.
                </p>
              </div>
              <Button asChild>
                <Link href="/workbench">Build Your First Backtest</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.items.map((item) => {
              const s = item.summary;
              const stats = s?.stats;
              const range = s?.range;
              const years = range ? Math.round(
                (new Date(range.actualEnd).getTime() - new Date(range.actualStart).getTime()) / (365.25 * 86400000),
              ) : 0;
              return (
                <Card key={item.id} className="flex flex-col hover:border-orange-500/40 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight">{item.title}</CardTitle>
                      <Badge variant="outline" className="shrink-0 text-[10px] font-mono">
                        {item.authorUuidPrefix}
                      </Badge>
                    </div>
                    {item.description && (
                      <CardDescription className="text-xs">{item.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col space-y-3">
                    {/* Formula excerpt */}
                    {s?.formula && (
                      <div className="bg-muted/30 border border-border/40 rounded p-2 font-mono text-[10px] break-all text-foreground/90">
                        {s.formula}
                      </div>
                    )}

                    {/* Key stats */}
                    {stats && (
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-muted/20 rounded p-2">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Strategy</div>
                          <div className={`font-mono font-semibold ${stats.totalReturnPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {fmtPct(stats.totalReturnPct)}
                          </div>
                        </div>
                        <div className="bg-muted/20 rounded p-2">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Alpha</div>
                          <div className={`font-mono font-semibold flex items-center gap-1 ${stats.alphaPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stats.alphaPct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {fmtPct(stats.alphaPct)}
                          </div>
                        </div>
                        <div className="bg-muted/20 rounded p-2">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Sharpe</div>
                          <div className={`font-mono font-semibold ${stats.sharpeRatio >= 1 ? 'text-green-400' : stats.sharpeRatio >= 0 ? 'text-foreground' : 'text-red-400'}`}>
                            {stats.sharpeRatio.toFixed(2)}
                          </div>
                        </div>
                        <div className="bg-muted/20 rounded p-2">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Max DD</div>
                          <div className="font-mono font-semibold text-red-400">
                            {fmtPct(stats.maxDrawdownPct)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Range + mode */}
                    {range && (
                      <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-2 flex-wrap">
                        <span>{range.actualStart} → {range.actualEnd}</span>
                        <span>·</span>
                        <span>{years}y</span>
                        {s?.mode === 'portfolio' && (
                          <>
                            <span>·</span>
                            <Badge variant="secondary" className="text-[9px]">Portfolio</Badge>
                          </>
                        )}
                        {stats && (
                          <>
                            <span>·</span>
                            <span>{stats.totalDays.toLocaleString()} days</span>
                            <span>·</span>
                            <span>{stats.numTrades} trades</span>
                          </>
                        )}
                      </div>
                    )}

                    <div className="text-[10px] text-muted-foreground flex items-center gap-3 font-mono mt-auto">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />{item.viewCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="h-3 w-3" />{item.forkCount}
                      </span>
                      <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                    </div>
                    <Button asChild size="sm" className="w-full">
                      <Link href={`/workbench/backtests/${encodeURIComponent(item.dataKey)}`}>
                        View details
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border/30">
          {data && data.items && data.items.length > 0 && (
            <p>
              Showing {data.items.length} published backtest{data.items.length === 1 ? '' : 's'}.
            </p>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-4 right-4 bg-card border border-orange-500/50 rounded-lg px-4 py-2 shadow-lg text-sm font-medium z-50 max-w-sm">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}