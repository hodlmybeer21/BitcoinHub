// BitcoinHub — /laws Metcalfe deep dive.
//
// Two LineCharts side-by-side (stacked on mobile):
//   1. BTC market cap over time (log Y-axis)
//   2. BTC active addresses over time (log Y-axis)
// If Metcalfe holds, the slope of these two curves should track each other.
// Visually that's "both lines tilt up at the same angle on the log chart".
//
// IMPORTANT: Uses plain LineChart (not ComposedChart) + single YAxis per chart.
// Recharts 2.15.x has a known "Invariant failed" bug with ComposedChart +
// dual YAxis + Cell children — see PROJECT.md commit bb31a6f. Keep it simple.

import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";

interface MetcalfePoint {
  date: string;
  activeAddresses: number;
  marketCapUsd: number;
}

interface MetcalfePayload {
  asOf: string;
  source: 'live' | 'fallback';
  count: number;
  points: MetcalfePoint[];
  error?: string;
}

function useMetcalfe() {
  return useQuery<MetcalfePayload>({
    queryKey: ['/api/laws/metcalfe'],
    queryFn: async () => {
      const res = await fetch('/api/laws/metcalfe');
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    refetchInterval: 60 * 60 * 1000,
    staleTime: 15 * 60 * 1000,
  });
}

// Compact number formatter: $1.23T, $456B, $7.89M, etc.
function fmtCompact(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function fmtCount(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toFixed(0);
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: MetcalfePoint }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="bg-card border border-muted/30 rounded-md p-2 text-xs shadow-lg">
      <div className="font-semibold mb-1">{p.date}</div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
        <span className="text-muted-foreground">Market cap:</span>
        <span className="font-mono">{fmtCompact(p.marketCapUsd)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />
        <span className="text-muted-foreground">Active addrs:</span>
        <span className="font-mono">{fmtCount(p.activeAddresses)}</span>
      </div>
    </div>
  );
}

function ChartPanel({ title, color, dataKey, formatter, query }: {
  title: string;
  color: string;
  dataKey: 'marketCapUsd' | 'activeAddresses';
  formatter: (v: number) => string;
  query: ReturnType<typeof useMetcalfe>;
}) {
  const points = query.data?.points ?? [];

  return (
    <Card className="bg-card border-muted/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : query.error || points.length === 0 ? (
          <div className="h-[260px] flex flex-col items-center justify-center text-xs text-muted-foreground gap-1">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span>Chart data unavailable</span>
            <span className="text-[10px]">{(query.error as Error)?.message ?? 'no data'}</span>
          </div>
        ) : (
          <div className="h-[260px] -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                  tickFormatter={(d) => d.slice(0, 4)}
                  minTickGap={50}
                />
                <YAxis
                  scale="log"
                  domain={['dataMin', 'dataMax']}
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                  tickFormatter={formatter}
                  width={70}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)' }} />
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MetcalfeSection() {
  const query = useMetcalfe();
  const points = query.data?.points ?? [];
  const live = query.data?.source === 'live' && points.length > 0;

  // Latest data for the headline stats
  const latest = points[points.length - 1];
  const earliest = points[0];
  const nSquaredRatio = latest && earliest
    ? (latest.activeAddresses * latest.activeAddresses) / (earliest.activeAddresses * earliest.activeAddresses)
    : null;
  const capRatio = latest && earliest
    ? latest.marketCapUsd / earliest.marketCapUsd
    : null;

  return (
    <section id="metcalfe" className="py-16 border-t border-muted/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 mb-3">
              Law #1
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center gap-3">
              <span className="text-3xl">🔗</span>
              Metcalfe's Law
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              A network's value grows with its <em>connected users</em>. The original formulation is
              <span className="font-mono mx-1 text-foreground">V ≈ n²</span> — though empirical work
              (O'Donoghue 2015, Wheatley/Sornette 2019) shows
              <span className="font-mono mx-1 text-foreground">n·log n</span> fits real networks better.
            </p>
          </div>
          {live && (
            <div className="text-xs text-muted-foreground">
              Live data · {points.length} monthly points
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <ChartPanel
            title="BTC market cap (log scale)"
            color="#F7931A"
            dataKey="marketCapUsd"
            formatter={fmtCompact}
            query={query}
          />
          <ChartPanel
            title="BTC active addresses (log scale)"
            color="#06b6d4"
            dataKey="activeAddresses"
            formatter={fmtCount}
            query={query}
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          <Card className="bg-card border-muted/20">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Latest market cap</div>
              <div className="text-xl font-bold font-mono text-amber-500">
                {latest ? fmtCompact(latest.marketCapUsd) : '—'}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-muted/20">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Latest active addrs</div>
              <div className="text-xl font-bold font-mono text-cyan-500">
                {latest ? fmtCount(latest.activeAddresses) : '—'}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-muted/20">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Growth since {earliest?.date.slice(0, 4)}</div>
              <div className="text-sm font-mono">
                <span className="text-cyan-400">n² grew {nSquaredRatio?.toFixed(1)}×</span>
                <span className="text-muted-foreground"> vs </span>
                <span className="text-amber-400">cap grew {capRatio?.toFixed(1)}×</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-background/40 border-muted/20">
          <CardContent className="pt-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
            <p>
              <span className="text-foreground font-medium">What this chart shows.</span> The two lines are drawn on
              log axes — straight-ish lines on a log chart mean exponential growth. If Metcalfe holds exactly, the slope of
              <em> market cap</em> should be roughly 2× the slope of <em>active addresses</em> (because n² vs n).
              In practice n·log n fits best, so the slopes are closer to 1:1 — both grow together.
            </p>
            <p>
              <span className="text-foreground font-medium">The interesting part.</span> Even when BTC price crashes 80%
              (Nov 2018, May 2022, Aug 2024), active addresses barely flinch. The <em>user base</em> is stickier than
              the <em>price</em>. That's the network effect at work — and the structural reason the long-term trend
              keeps reclaiming the all-time high.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}