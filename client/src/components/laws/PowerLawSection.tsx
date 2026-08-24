// BitcoinHub — /laws Power Law / Zipf deep dive.
//
// Two distributions that both follow power laws:
//   1. Address balance distribution — top X% of addresses hold Y% of supply
//   2. Mining pool hashrate distribution — top N pools control X% of hashrate
//
// Power law on log-log axes = straight line. The deeper the line is off the
// diagonal, the more concentrated the distribution.
//
// Plain LineChart + BarChart only (no ComposedChart) — Recharts 2.15.x bug.

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Wallet, Cpu, ChevronRight } from "lucide-react";
import { ADDRESS_DISTRIBUTION, MINING_POOLS } from "@/lib/laws-data";

interface PowerPayload {
  asOf: string;
  source: 'live' | 'fallback';
  addressBands: Array<{
    balanceBand: string;
    addresses: number;
    totalBtc: number;
  }> | null;
}

function usePower() {
  return useQuery<PowerPayload>({
    queryKey: ['/api/laws/power'],
    queryFn: async () => {
      const res = await fetch('/api/laws/power');
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    refetchInterval: 60 * 60 * 1000,
    staleTime: 30 * 60 * 1000,
  });
}

// Power-law palette (sorted cool→warm)
const PALETTE = ['#F7931A', '#fb923c', '#fbbf24', '#facc15', '#a3e635', '#4ade80', '#22d3ee', '#818cf8'];

// For the Lorenz curve: convert cumAddressesPct to a more useful display.
// On log axes, the power-law straight line emerges if we plot cum-supply (Y) vs cum-addresses (X, log).
function buildLorenzPoints() {
  // We want the data on log-log axes. ADDRESS_DISTRIBUTION uses
  // (cumAddressesPct, cumSupplyPct). cumAddressesPct has range 0.0002 → 100,
  // which spans 5.7 orders of magnitude — perfect for log X.
  return ADDRESS_DISTRIBUTION.map(d => ({
    label: `Top ${d.rankCutoff.toLocaleString()} addresses`,
    cumAddressesPct: d.cumAddressesPct,
    cumSupplyPct: d.cumSupplyPct,
    rankCutoff: d.rankCutoff,
  }));
}

// Reference line for "perfect equality" — every X% of addresses holds X% of supply.
function buildEqualityLine() {
  const pts: Array<{ cumAddressesPct: number; cumSupplyPct: number }> = [];
  for (let i = 0; i <= 100; i += 5) {
    pts.push({ cumAddressesPct: Math.max(i, 0.0001), cumSupplyPct: i });
  }
  return pts;
}

function LorenzTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { label: string; cumSupplyPct: number } }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="bg-card border border-muted/30 rounded-md p-2 text-xs shadow-lg">
      <div className="font-semibold mb-1">{p.label}</div>
      <div className="text-muted-foreground">Holds <span className="font-mono text-amber-500">{p.cumSupplyPct.toFixed(1)}%</span> of supply</div>
    </div>
  );
}

function PoolTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof MINING_POOLS[number] }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="bg-card border border-muted/30 rounded-md p-2 text-xs shadow-lg">
      <div className="font-semibold mb-1">{p.name}</div>
      <div className="text-muted-foreground">Hashrate: <span className="font-mono text-amber-500">{p.sharePct.toFixed(1)}%</span></div>
      <div className="text-muted-foreground text-[10px]">~{p.blocks24h} blocks/24h</div>
    </div>
  );
}

export default function PowerLawSection() {
  const query = usePower();
  const lorenzPoints = useMemo(buildLorenzPoints, []);
  const equalityLine = useMemo(buildEqualityLine, []);

  // Compute headline stats
  const top1kSupply = ADDRESS_DISTRIBUTION.find(d => d.rankCutoff === 1000)?.cumSupplyPct ?? null;
  const topPoolsConcentration = MINING_POOLS.slice(0, 4).reduce((sum, p) => sum + p.sharePct, 0);
  const top1Pool = MINING_POOLS[0];

  return (
    <section id="power" className="py-16 border-t border-muted/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 mb-3">
              Law #5
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center gap-3">
              <span className="text-3xl">⚖️</span>
              Power Law / Zipf
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              A small number of nodes hold a large share of any network. <em>Always.</em> BTC wealth
              distribution and mining hashrate distribution both follow near-perfect power laws — on a
              log-log chart, each is a textbook straight line.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Static snapshots · approximate public aggregates
          </div>
        </div>

        {/* Stat row */}
        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          <Card className="bg-card border-amber-500/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Top 1K addresses</span>
              </div>
              <div className="text-3xl font-bold font-mono text-amber-500">
                {top1kSupply !== null ? `${top1kSupply.toFixed(0)}%` : '—'}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                of total supply (≈0.002% of addresses)
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-cyan-500/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-cyan-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Top pool</span>
              </div>
              <div className="text-2xl font-bold font-mono text-cyan-500">
                {top1Pool.name}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {top1Pool.sharePct.toFixed(1)}% of hashrate
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-purple-500/30">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Top 4 pools</div>
              <div className="text-3xl font-bold font-mono text-purple-500">
                {topPoolsConcentration.toFixed(0)}%
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                of total hashrate
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lorenz curve */}
        <Card className="bg-card border-muted/20 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Address balance distribution — the Lorenz curve</CardTitle>
            <div className="text-xs text-muted-foreground">
              Log X axis (addresses ranked from largest). Dashed line = perfect equality.
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    type="number"
                    dataKey="cumAddressesPct"
                    scale="log"
                    domain={[0.0001, 100]}
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                    tickFormatter={(v) => v < 1 ? `${(v * 100).toFixed(2)}%` : `${v.toFixed(0)}%`}
                    label={{ value: '% of addresses (log scale)', position: 'insideBottom', offset: -5, style: { fontSize: 10, fill: 'rgba(255,255,255,0.4)' } }}
                  />
                  <YAxis
                    type="number"
                    dataKey="cumSupplyPct"
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                    tickFormatter={(v) => `${v}%`}
                    width={50}
                    label={{ value: '% of supply', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'rgba(255,255,255,0.4)' } }}
                  />
                  <Tooltip content={<LorenzTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)' }} />
                  {/* Reference: perfect equality */}
                  <Line
                    type="monotone"
                    data={equalityLine}
                    dataKey="cumSupplyPct"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    isAnimationActive={false}
                    name="Perfect equality"
                  />
                  {/* Actual distribution */}
                  <Line
                    type="monotone"
                    data={lorenzPoints}
                    dataKey="cumSupplyPct"
                    stroke="#F7931A"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#F7931A' }}
                    isAnimationActive={false}
                    name="BTC actual"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Mining pool distribution */}
        <Card className="bg-card border-muted/20 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mining pool hashrate distribution</CardTitle>
            <div className="text-xs text-muted-foreground">
              Current snapshot — top 8 pools + others. Sorted by share descending.
            </div>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : query.error ? (
              <div className="h-[260px] flex flex-col items-center justify-center text-xs text-muted-foreground gap-1">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span>Chart data unavailable</span>
              </div>
            ) : (
              <div className="h-[260px] -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={MINING_POOLS}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                  >
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 32]}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.7)' }}
                      width={100}
                    />
                    <Tooltip content={<PoolTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="sharePct" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                      {MINING_POOLS.map((_, idx) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-background/40 border-muted/20">
          <CardContent className="pt-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
            <p>
              <span className="text-foreground font-medium">The Lorenz curve.</span> The dashed diagonal is what
              "perfect equality" looks like — every X% of addresses holds X% of supply. BTC's actual curve sits
              <em> far below</em> the diagonal: the top 0.002% of addresses (the 1K largest) hold ~35% of supply.
              The deeper the bow under the diagonal, the more concentrated the wealth.
            </p>
            <p>
              <span className="text-foreground font-medium">Mining pools follow the same pattern.</span> Foundry
              alone mines ~28% of blocks; the top 4 pools together mine ~75%. Power laws emerge naturally in
              any winner-take-most system — and Bitcoin has two of them operating at once (mining for block rewards,
              accumulation for coin distribution).
            </p>
            <p className="text-xs italic pt-2 border-t border-muted/10">
              The shape is universal. The specific concentration numbers move slowly — quarter-to-quarter deltas
              in the top pool are typically <ChevronRight className="inline w-3 h-3" /> 1-3 percentage points.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}