// BitcoinHub — /laws Nakamoto's Law deep dive.
//
// BTC network hashrate has compounded for 17 years straight — roughly
// doubling every ~2 years, mirroring Moore's Law for transistors. This is
// the "security budget grows exponentially" lens.
//
// Plain LineChart only (no ComposedChart) — Recharts 2.15.x bug avoidance.

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Cpu, TrendingUp, Calendar } from "lucide-react";
import { HASHRATE_HISTORY } from "@/lib/laws-data";

interface NakamotoPoint {
  date: string;
  hashrateEh: number;
}

interface NakamotoPayload {
  asOf: string;
  source: 'live' | 'fallback';
  count: number;
  points: NakamotoPoint[];
}

function useNakamoto() {
  return useQuery<NakamotoPayload>({
    queryKey: ['/api/laws/nakamoto'],
    queryFn: async () => {
      const res = await fetch('/api/laws/nakamoto');
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    refetchInterval: 30 * 60 * 1000,
    staleTime: 15 * 60 * 1000,
  });
}

function fmtEh(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '—';
  if (v >= 1000) return `${(v / 1000).toFixed(2)} ZH/s`;
  if (v >= 1) return `${v.toFixed(0)} EH/s`;
  if (v >= 0.001) return `${(v * 1000).toFixed(0)} PH/s`;
  return `${(v * 1_000_000).toFixed(0)} TH/s`;
}

function fmtYears(y: number): string {
  if (y < 1) return `${(y * 12).toFixed(0)} months`;
  return `${y.toFixed(1)} years`;
}

// Compute median doubling period from the series.
// For each point, look back to find the date when hashrate was half the value,
// then compute (currentDate − halfDate) and take the median across points.
function computeDoublingPeriod(points: NakamotoPoint[]): number | null {
  if (points.length < 4) return null;
  const doublings: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const cur = points[i].hashrateEh;
    const half = cur / 2;
    // Find earliest point at or above half (going backwards from i)
    let halfIdx = -1;
    for (let j = i - 1; j >= 0; j--) {
      if (points[j].hashrateEh <= half) {
        halfIdx = j;
        break;
      }
    }
    if (halfIdx === -1) continue;
    const tCur = new Date(points[i].date).getTime();
    const tHalf = new Date(points[halfIdx].date).getTime();
    const days = (tCur - tHalf) / (86400 * 1000);
    if (days > 0 && days < 3650) doublings.push(days / 365.25);
  }
  if (doublings.length === 0) return null;
  doublings.sort((a, b) => a - b);
  return doublings[Math.floor(doublings.length / 2)];
}

function HashrateTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: NakamotoPoint }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="bg-card border border-muted/30 rounded-md p-2 text-xs shadow-lg">
      <div className="font-semibold mb-1">{p.date}</div>
      <div className="text-cyan-400 font-mono">{fmtEh(p.hashrateEh)}</div>
    </div>
  );
}

export default function NakamotoSection() {
  const query = useNakamoto();
  const livePoints = query.data?.points ?? [];
  // If live fetch failed, fall back to baked data for the chart
  const points = livePoints.length > 0 ? livePoints : HASHRATE_HISTORY;

  const latest = points[points.length - 1];
  const first = points[0];

  const doublingPeriod = useMemo(() => computeDoublingPeriod(points), [points]);
  const years = first && latest
    ? (new Date(latest.date).getTime() - new Date(first.date).getTime()) / (365.25 * 86400 * 1000)
    : null;
  const growthFactor = first && latest && first.hashrateEh > 0
    ? latest.hashrateEh / first.hashrateEh
    : null;

  return (
    <section id="nakamoto" className="py-16 border-t border-muted/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 mb-3">
              Law #7
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center gap-3">
              <span className="text-3xl">⛏️</span>
              Nakamoto's Law
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Every halving, the per-block reward halves — yet miners keep investing <em>more</em> in
              proof-of-work compute. The result: BTC network hashrate has compounded for 17 years
              straight, mirroring Moore's Law for transistors.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {query.data?.source === 'live' ? 'Live hashrate · mempool.space' : 'Baked fallback'}
          </div>
        </div>

        {/* Stat row */}
        <div className="grid sm:grid-cols-4 gap-3 mb-6">
          <Card className="bg-card border-cyan-500/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-cyan-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Current hashrate</span>
              </div>
              <div className="text-2xl font-bold font-mono text-cyan-500">
                {latest ? fmtEh(latest.hashrateEh) : '—'}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{latest?.date}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-orange-500/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Doubling period</span>
              </div>
              <div className="text-2xl font-bold font-mono text-orange-500">
                {doublingPeriod !== null ? fmtYears(doublingPeriod) : '—'}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                median across full series
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-purple-500/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Years compounding</span>
              </div>
              <div className="text-2xl font-bold font-mono text-purple-500">
                {years !== null ? `${years.toFixed(1)}y` : '—'}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                since {first?.date}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-emerald-500/30">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Growth factor</div>
              <div className="text-2xl font-bold font-mono text-emerald-500">
                {growthFactor !== null ? `${formatBigNumber(growthFactor)}×` : '—'}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                hashrate vs 2010
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="bg-card border-muted/20 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">BTC network hashrate — log scale, 2010→today</CardTitle>
            <div className="text-xs text-muted-foreground">
              On a log axis, exponential growth is a straight line. This line is ~17 years of straight up.
            </div>
          </CardHeader>
          <CardContent>
            {query.isLoading && livePoints.length === 0 ? (
              <Skeleton className="h-[320px] w-full" />
            ) : points.length === 0 ? (
              <div className="h-[320px] flex flex-col items-center justify-center text-xs text-muted-foreground gap-1">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span>Hashrate data unavailable</span>
              </div>
            ) : (
              <div className="h-[320px] -mx-2">
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
                      tickFormatter={fmtEh}
                      width={70}
                    />
                    <Tooltip content={<HashrateTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)' }} />
                    <Line
                      type="monotone"
                      dataKey="hashrateEh"
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
              <span className="text-foreground font-medium">Why it compounds despite halvings.</span> Every
              ~4 years the block reward halves — from 50 BTC (2009) to 3.125 BTC (2024) and on to
              1.5625 BTC (2028). Yet the network's total proof-of-work compute keeps multiplying. That's
              because the price of BTC has outpaced the halving reductions, so miners collectively
              spend more on hash power, not less.
            </p>
            <p>
              <span className="text-foreground font-medium">The security implication.</span> More hashrate means
              a 51% attack costs more — exponentially so. The 2010 hashrate (~100 GH/s) could have been
              overtaken by a single well-funded attacker. The 2026 hashrate (~1 ZH/s) would take the
              entire global electricity grid to displace. That's the network getting <em>harder to kill</em>
              over time, not softer.
            </p>
            <p className="text-xs italic pt-2 border-t border-muted/10">
              Compare with Moore's Law (transistor density doubling every ~2 years). Nakamoto's Law is the
              monetary-network analog: the security budget doubles on roughly the same cadence.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function formatBigNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  if (n >= 100) return n.toFixed(0);
  return n.toFixed(1);
}