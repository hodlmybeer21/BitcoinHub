// BitcoinHub — /laws Stock-to-Flow (S2F) deep dive.
//
// S2F = circulating supply / annual issuance. Higher = scarcer = (per PlanB)
// more valuable. The relationship tracked BTC price well from 2013→2021, then
// broke down 2022→2024 as price dropped while S2F kept climbing. We chart both
// honestly — the historical fit and the recent divergence.
//
// Two stacked charts (price + S2F) — never mix scales on one chart. Each chart
// is a plain LineChart (no ComposedChart) — Recharts 2.15.x dual-YAxis bug.

import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, TrendingUp, AlertCircle } from "lucide-react";

interface S2FPoint {
  date: string;
  priceUsd: number;
  s2fRatio: number;
  eraName: string;
}

interface S2FPayload {
  asOf: string;
  source: 'live' | 'fallback';
  count: number;
  points: S2FPoint[];
}

function useS2F() {
  return useQuery<S2FPayload>({
    queryKey: ['/api/laws/s2f'],
    queryFn: async () => {
      const res = await fetch('/api/laws/s2f');
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    refetchInterval: 30 * 60 * 1000,
    staleTime: 15 * 60 * 1000,
  });
}

function fmtUsd(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '—';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(4)}`;
}

function PriceTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: S2FPoint }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="bg-card border border-muted/30 rounded-md p-2 text-xs shadow-lg">
      <div className="font-semibold mb-1">{p.date}</div>
      <div className="text-muted-foreground text-[10px] mb-1">{p.eraName}</div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
        <span className="text-muted-foreground">Price:</span>
        <span className="font-mono">{fmtUsd(p.priceUsd)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />
        <span className="text-muted-foreground">S2F:</span>
        <span className="font-mono">{p.s2fRatio.toFixed(1)}</span>
      </div>
    </div>
  );
}

function S2FTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: S2FPoint }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="bg-card border border-muted/30 rounded-md p-2 text-xs shadow-lg">
      <div className="font-semibold mb-1">{p.date}</div>
      <div className="text-muted-foreground text-[10px] mb-1">{p.eraName}</div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />
        <span className="text-muted-foreground">S2F ratio:</span>
        <span className="font-mono">{p.s2fRatio.toFixed(1)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
        <span className="text-muted-foreground">Price:</span>
        <span className="font-mono">{fmtUsd(p.priceUsd)}</span>
      </div>
    </div>
  );
}

// Halving dates for ReferenceLine annotations
const HALVINGS_DATES = [
  '2012-11-28',
  '2016-07-09',
  '2020-05-11',
  '2024-04-20',
];

export default function S2FSection() {
  const query = useS2F();
  const points = query.data?.points ?? [];

  const latest = points[points.length - 1];
  const era2021 = points.find(p => p.date.startsWith('2021-11')) ?? points.find(p => p.date.startsWith('2021-10'));
  const era2024 = points.find(p => p.date.startsWith('2024-12')) ?? points.find(p => p.date.startsWith('2025-01'));

  const fitScore = latest && era2021 && era2024
    ? `${latest.s2fRatio > era2021.s2fRatio ? 'up' : 'down'} ${Math.abs(((latest.s2fRatio - era2021.s2fRatio) / era2021.s2fRatio) * 100).toFixed(0)}% since 2021 high; price ${era2021.priceUsd > 0 ? ((latest.priceUsd / era2021.priceUsd) * 100 - 100).toFixed(0) : '0'}% vs then`
    : null;

  return (
    <section id="s2f" className="py-16 border-t border-muted/10 bg-background/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 mb-3">
              Law #6
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center gap-3">
              <span className="text-3xl">🏆</span>
              Stock-to-Flow
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              The simplest scarcity story: <em>stock</em> divided by <em>flow</em>. Gold sits around 60;
              BTC was 8 in 2013, 24 in 2017, 56 in 2021, 120+ after the 2024 halving. PlanB's
              model tracked price remarkably well — until it didn't.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Live price · halving-driven S2F
          </div>
        </div>

        {/* Stat row */}
        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          <Card className="bg-card border-cyan-500/30">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current S2F</div>
              <div className="text-3xl font-bold font-mono text-cyan-500">
                {latest ? latest.s2fRatio.toFixed(1) : '—'}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Stock ≈ 19.85M BTC ÷ annual flow 0.164M
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-amber-500/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Latest price</span>
              </div>
              <div className="text-3xl font-bold font-mono text-amber-500">
                {latest ? fmtUsd(latest.priceUsd) : '—'}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {latest?.eraName || '—'}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-orange-500/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Model fit</span>
              </div>
              <div className="text-sm font-mono text-orange-400">
                {fitScore ?? '—'}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Honest read of where the model breaks
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Price chart */}
        <Card className="bg-card border-muted/20 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">BTC price (log scale) over halvings</CardTitle>
            <div className="text-xs text-muted-foreground">
              Vertical lines mark halving dates. PlanB's model: S2F up → price up. Reality: more complicated.
            </div>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : points.length === 0 ? (
              <div className="h-[280px] flex flex-col items-center justify-center text-xs text-muted-foreground gap-1">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span>Price data unavailable</span>
              </div>
            ) : (
              <div className="h-[280px] -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={points} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
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
                      tickFormatter={fmtUsd}
                      width={70}
                    />
                    <Tooltip content={<PriceTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)' }} />
                    {HALVINGS_DATES.map(h => (
                      <ReferenceLine
                        key={h}
                        x={h}
                        stroke="rgba(245, 158, 11, 0.5)"
                        strokeDasharray="3 3"
                        label={{ value: 'halving', position: 'top', fontSize: 9, fill: 'rgba(245, 158, 11, 0.7)' }}
                      />
                    ))}
                    <Line
                      type="monotone"
                      dataKey="priceUsd"
                      stroke="#F7931A"
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

        {/* S2F ratio chart */}
        <Card className="bg-card border-muted/20 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Stock-to-Flow ratio — stepped by halving</CardTitle>
            <div className="text-xs text-muted-foreground">
              Each halving halves the flow → S2F doubles. The jumps at halving lines are the model's "scarcity events".
            </div>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : points.length === 0 ? (
              <div className="h-[220px] flex flex-col items-center justify-center text-xs text-muted-foreground gap-1">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span>S2F data unavailable</span>
              </div>
            ) : (
              <div className="h-[220px] -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={points} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                      tickFormatter={(d) => d.slice(0, 4)}
                      minTickGap={50}
                    />
                    <YAxis
                      domain={[0, 'dataMax']}
                      tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                      tickFormatter={(v) => v.toFixed(0)}
                      width={50}
                    />
                    <Tooltip content={<S2FTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)' }} />
                    {HALVINGS_DATES.map(h => (
                      <ReferenceLine
                        key={h}
                        x={h}
                        stroke="rgba(6, 182, 212, 0.5)"
                        strokeDasharray="3 3"
                      />
                    ))}
                    <Line
                      type="monotone"
                      dataKey="s2fRatio"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-background/40 border-muted/20">
          <CardContent className="pt-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
            <p>
              <span className="text-foreground font-medium">What the model got right.</span> From 2013 through
              late 2021, S2F and price moved in lockstep. The 2020 halving pushed S2F from ~24 to ~56; price
              hit a new ATH within 18 months. Pattern: scarcity event → revaluation. PlanB formalized this with
              a regression that held remarkably well across four years.
            </p>
            <p>
              <span className="text-foreground font-medium">What the model got wrong.</span> Through 2022–2024,
              S2F kept marching up (the 2024 halving pushed it to ~120) while price spent most of that period
              consolidating or dropping. The 2025–2026 recovery happened, but not because of S2F — it tracked
              macro liquidity, ETF flows, and the 4-year cycle thesis instead. Single-variable models of price
              almost always break; S2F is no exception.
            </p>
            <p className="text-xs italic pt-2 border-t border-muted/10">
              The honest framing: S2F is a useful <em>floor</em> (scarcity is real) but a poor
              <em> ceiling predictor</em>. Combine it with cycle position, liquidity, and on-chain signals
              for the full picture — see <a href="/risk" className="text-primary hover:underline">/risk</a>{' '}
              for the cycle-position view.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}