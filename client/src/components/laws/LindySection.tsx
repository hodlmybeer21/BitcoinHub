// BitcoinHub — /laws Lindy Effect deep dive.
//
// The Lindy Effect says: for things that don't have a fixed expiration (ideas,
// technologies, institutions), the expected remaining life expectancy is
// proportional to their current age. Bitcoin has been "declared dead" ~480+
// times. We chart two things:
//   1. BTC price over time (log scale) — the "still alive" proof
//   2. Cumulative obituary count over time (monotone step) — the resistance evidence
//
// Plain LineChart only (no ComposedChart) — see PROJECT.md commit bb31a6f.

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Skull, Heart } from "lucide-react";
import { BITCOIN_OBITUARIES } from "@/lib/laws-data";

interface LindyPayload {
  asOf: string;
  source: 'live' | 'fallback';
  btcPrice: Array<{ date: string; priceUsd: number }>;
}

function useLindy() {
  return useQuery<LindyPayload>({
    queryKey: ['/api/laws/lindy'],
    queryFn: async () => {
      const res = await fetch('/api/laws/lindy');
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    refetchInterval: 15 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });
}

function fmtUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(4)}`;
}

function fmtNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString();
}

// Build cumulative-step series aligned to price series.
function buildObitStepSeries(priceSeries: Array<{ date: string }>) {
  // For each price date, find the latest obituary that happened on or before it.
  // If no obituaries yet, the cumulative is 0.
  const result: Array<{ date: string; cumulative: number }> = [];
  let obIdx = 0;
  for (const p of priceSeries) {
    while (obIdx < BITCOIN_OBITUARIES.length && BITCOIN_OBITUARIES[obIdx].date <= p.date) {
      obIdx++;
    }
    const cum = obIdx > 0 ? BITCOIN_OBITUARIES[obIdx - 1].cumulative : 0;
    result.push({ date: p.date, cumulative: cum });
  }
  return result;
}

function PriceTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { date: string; priceUsd: number } }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  // Find obituaries in this month
  const month = p.date.slice(0, 7);
  const events = BITCOIN_OBITUARIES.filter(o => o.date.startsWith(month));
  return (
    <div className="bg-card border border-muted/30 rounded-md p-2 text-xs shadow-lg max-w-[260px]">
      <div className="font-semibold mb-1">{p.date}</div>
      <div className="text-muted-foreground">Price:</div>
      <div className="font-mono text-amber-500">{fmtUsd(p.priceUsd)}</div>
      {events.length > 0 && (
        <>
          <div className="text-muted-foreground mt-1">Obituaries this month:</div>
          {events.map((e, idx) => (
            <div key={idx} className="text-red-400 text-[10px] leading-tight">• {e.label}</div>
          ))}
        </>
      )}
    </div>
  );
}

function ObitTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { date: string; cumulative: number } }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  // Find the obituary at or near this date
  const event = BITCOIN_OBITUARIES.filter(o => o.date <= p.date).slice(-1)[0];
  return (
    <div className="bg-card border border-muted/30 rounded-md p-2 text-xs shadow-lg max-w-[260px]">
      <div className="font-semibold mb-1">{p.date}</div>
      <div className="text-red-400">Cumulative obituaries: <span className="font-mono">{p.cumulative}</span></div>
      {event && (
        <div className="text-muted-foreground text-[10px] mt-1 italic">{event.label}</div>
      )}
    </div>
  );
}

export default function LindySection() {
  const query = useLindy();
  const price = query.data?.btcPrice ?? [];
  const obitSeries = useMemo(() => buildObitStepSeries(price), [price]);

  const latestPrice = price[price.length - 1]?.priceUsd ?? null;
  const totalObituaries = BITCOIN_OBITUARIES[BITCOIN_OBITUARIES.length - 1]?.cumulative ?? 0;
  const lastObituary = BITCOIN_OBITUARIES[BITCOIN_OBITUARIES.length - 1];

  // Pick a few notable obituaries to display in the timeline card
  const notableObituaries = useMemo(() => {
    return [...BITCOIN_OBITUARIES]
      .filter(o => [16, 32, 52, 86, 110, 168, 222, 268, 328, 388, 460, 482].includes(o.cumulative))
      .sort((a, b) => a.cumulative - b.cumulative);
  }, []);

  return (
    <section id="lindy" className="py-16 border-t border-muted/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 mb-3">
              Law #3
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center gap-3">
              <span className="text-3xl">🪨</span>
              The Lindy Effect
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              For things that can't decay (books, ideas, technologies), the longer they've survived,
              the longer they're expected to keep surviving. Applied to Bitcoin: every failed obituary
              <em> extends</em> its expected life.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Live BTC price · curated obituary milestones
          </div>
        </div>

        {/* Stat row */}
        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          <Card className="bg-card border-red-500/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Skull className="w-4 h-4 text-red-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Total obituaries</span>
              </div>
              <div className="text-3xl font-bold font-mono text-red-500">
                {fmtNumber(totalObituaries)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Curated milestone list (see 99bitcoins for live count)
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-amber-500/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Latest price</span>
              </div>
              <div className="text-3xl font-bold font-mono text-amber-500">
                {latestPrice !== null ? fmtUsd(latestPrice) : '—'}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Despite everything — still here
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-emerald-500/30">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Years alive</div>
              <div className="text-3xl font-bold font-mono text-emerald-500">
                {Math.floor((Date.now() - new Date('2009-01-03').getTime()) / (365.25 * 24 * 3600 * 1000))}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Since genesis block · Jan 3 2009
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Price chart */}
        <Card className="bg-card border-muted/20 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">BTC price over the obituaries (log scale)</CardTitle>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : price.length === 0 ? (
              <div className="h-[280px] flex flex-col items-center justify-center text-xs text-muted-foreground gap-1">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span>Price data unavailable</span>
              </div>
            ) : (
              <div className="h-[280px] -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={price} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
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

        {/* Cumulative obituaries chart */}
        <Card className="bg-card border-muted/20 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cumulative "Bitcoin is dead" count</CardTitle>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <Skeleton className="h-[180px] w-full" />
            ) : obitSeries.length === 0 ? (
              <div className="h-[180px] flex flex-col items-center justify-center text-xs text-muted-foreground gap-1">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span>Obituary chart unavailable</span>
              </div>
            ) : (
              <div className="h-[180px] -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={obitSeries} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
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
                    <Tooltip content={<ObitTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)' }} />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#ef4444"
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

        {/* Notable obituaries timeline */}
        <Card className="bg-background/40 border-muted/20 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notable obituaries — the resistance log</CardTitle>
            <div className="text-xs text-muted-foreground">
              A sampling of the {totalObituaries} "Bitcoin is dead" claims in our curated dataset.
            </div>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2.5">
              {notableObituaries.map(o => (
                <li key={o.cumulative} className="flex items-start gap-3 text-sm">
                  <span className="font-mono text-red-400 font-semibold min-w-[3.5rem] tabular-nums">
                    #{o.cumulative}
                  </span>
                  <span className="text-muted-foreground font-mono min-w-[5.5rem] text-xs pt-0.5">
                    {o.date}
                  </span>
                  <span className="text-foreground/90 leading-snug flex-1">{o.label}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="bg-background/40 border-muted/20">
          <CardContent className="pt-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
            <p>
              <span className="text-foreground font-medium">What this shows.</span> The price chart is the obvious
              part — BTC at all-time highs. The real story is the <em>red line</em>: a perfectly monotone curve
              that hasn't decreased since January 2010. Every time the price has crashed, the obituary count
              has <em>accelerated</em>, not stopped. Death is the fertilizer.
            </p>
            <p>
              <span className="text-foreground font-medium">Why Lindy applies.</span> Bitcoin is non-perishable
              (the protocol keeps running), so each year it survives adds to its expected remaining life.
              At 17 years alive with no actual death event, the implied probability of survival over
              the next decade is — mathematically — the highest it's ever been. The Lindy bet keeps paying.
            </p>
            {lastObituary && (
              <p className="text-xs italic pt-2 border-t border-muted/10">
                Latest entry in our curated dataset: <span className="text-foreground">{lastObituary.label}</span>
                <span className="text-muted-foreground"> ({lastObituary.date})</span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}