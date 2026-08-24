// BitcoinHub — /laws Reed's Law deep dive.
//
// Reed's Law: value of a network grows exponentially with the number of
// possible subgroups (2^n). For Bitcoin, the group-forming layer is the
// Lightning Network — each channel is a 2-person subgroup; multi-hop routes
// enable arbitrary-sized groups.
//
// Plain LineCharts only (no ComposedChart) — Recharts 2.15.x dual-YAxis bug.

import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Network, Zap, Users } from "lucide-react";
import { LN_HISTORY } from "@/lib/laws-data";

interface ReedPayload {
  asOf: string;
  source: 'live' | 'fallback';
  liveSnapshot: {
    channelCount: number | null;
    nodeCount: number | null;
    totalCapacityBtc: number | null;
    fetchedAt: string;
  } | null;
}

function useReed() {
  return useQuery<ReedPayload>({
    queryKey: ['/api/laws/reed'],
    queryFn: async () => {
      const res = await fetch('/api/laws/reed');
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });
}

function fmtNumber(v: number): string {
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString();
}

function fmtBtc(v: number): string {
  if (!Number.isFinite(v)) return '—';
  if (v >= 100) return `${v.toFixed(0)} BTC`;
  if (v >= 1) return `${v.toFixed(1)} BTC`;
  return `${v.toFixed(2)} BTC`;
}

function ChannelsTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof LN_HISTORY[number] }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="bg-card border border-muted/30 rounded-md p-2 text-xs shadow-lg">
      <div className="font-semibold mb-1">{p.date}</div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-fuchsia-500 inline-block" />
        <span className="text-muted-foreground">Channels:</span>
        <span className="font-mono">{fmtNumber(p.channelCount)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
        <span className="text-muted-foreground">Capacity:</span>
        <span className="font-mono">{fmtBtc(p.totalCapacityBtc)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />
        <span className="text-muted-foreground">Nodes:</span>
        <span className="font-mono">{fmtNumber(p.nodeCount)}</span>
      </div>
    </div>
  );
}

export default function ReedSection() {
  const query = useReed();
  const live = query.data?.liveSnapshot;
  const last = LN_HISTORY[LN_HISTORY.length - 1];

  // Use live values when available, otherwise fall back to last baked point
  const latest = {
    channels: live?.channelCount ?? last.channelCount,
    capacity: live?.totalCapacityBtc ?? last.totalCapacityBtc,
    nodes: live?.nodeCount ?? last.nodeCount,
  };

  const first = LN_HISTORY[0];
  const channelsGrowthRatio = first ? latest.channels / first.channelCount : null;
  const capacityGrowthRatio = first ? latest.capacity / first.totalCapacityBtc : null;

  return (
    <section id="reed" className="py-16 border-t border-muted/10 bg-background/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 mb-3">
              Law #4
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center gap-3">
              <span className="text-3xl">🕸️</span>
              Reed's Law
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Metcalfe counts pairs (<span className="font-mono">n²</span>). Reed counts groups (<span className="font-mono">2ⁿ</span>) — and
              that's an exponential difference. Bitcoin's group-forming layer is the Lightning Network.
              Each new channel unlocks exponentially more routing possibilities.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {live ? 'Live LN snapshot · quarterly history' : 'Fallback data'}
          </div>
        </div>

        {/* Stat row */}
        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          <Card className="bg-card border-fuchsia-500/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Network className="w-4 h-4 text-fuchsia-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Channels (latest)</span>
              </div>
              <div className="text-3xl font-bold font-mono text-fuchsia-500">
                {fmtNumber(latest.channels)}
              </div>
              {channelsGrowthRatio !== null && (
                <div className="text-[10px] text-muted-foreground mt-1">
                  {channelsGrowthRatio.toFixed(0)}× since {first.date.slice(0, 4)}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-card border-amber-500/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Total capacity</span>
              </div>
              <div className="text-3xl font-bold font-mono text-amber-500">
                {fmtBtc(latest.capacity)}
              </div>
              {capacityGrowthRatio !== null && (
                <div className="text-[10px] text-muted-foreground mt-1">
                  {capacityGrowthRatio.toFixed(0)}× since {first.date.slice(0, 4)}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-card border-cyan-500/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-cyan-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Nodes (latest)</span>
              </div>
              <div className="text-3xl font-bold font-mono text-cyan-500">
                {fmtNumber(latest.nodes)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Live snapshot · {query.data?.source ?? '—'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Channel count chart */}
        <Card className="bg-card border-muted/20 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lightning channels — quarterly growth 2018→2026</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={LN_HISTORY} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                    tickFormatter={(d) => d.slice(0, 7)}
                    minTickGap={50}
                  />
                  <YAxis
                    domain={[0, 'dataMax']}
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                    width={50}
                  />
                  <Tooltip content={<ChannelsTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)' }} />
                  <Line
                    type="monotone"
                    dataKey="channelCount"
                    stroke="#d946ef"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Capacity chart */}
        <Card className="bg-card border-muted/20 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lightning capacity — total BTC locked in channels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={LN_HISTORY} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                    tickFormatter={(d) => d.slice(0, 7)}
                    minTickGap={50}
                  />
                  <YAxis
                    scale="log"
                    domain={['dataMin', 'dataMax']}
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                    tickFormatter={fmtBtc}
                    width={70}
                  />
                  <Tooltip content={<ChannelsTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)' }} />
                  <Line
                    type="monotone"
                    dataKey="totalCapacityBtc"
                    stroke="#F7931A"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/40 border-muted/20">
          <CardContent className="pt-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
            <p>
              <span className="text-foreground font-medium">Two different curves.</span> The channel count chart shows the network
              <em> peaked</em> around 2022 at ~88K channels, then consolidated as larger channels replaced many small ones.
              The capacity chart shows the opposite — capacity kept climbing, because each consolidation moves more BTC into
              fewer, fatter channels. Both behaviors are healthy; they show the network maturing.
            </p>
            <p>
              <span className="text-foreground font-medium">Why this matters for Reed.</span> Group-forming isn't just
              channel count — it's the <em>reachable subgroups</em>. With 70K channels among 19K nodes, the
              routing graph can form an astronomical number of subgroups. That's the exponential payoff Reed
              described — and it's why Lightning quietly keeps scaling while the headline number plateaus.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}