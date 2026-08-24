// BitcoinHub — /laws Bass Diffusion / S-Curve deep dive.
//
// Overlay of two normalized adoption curves:
//   1. Internet users (World Bank / ITU), 1991 WWW launch → 2024
//   2. Bitcoin active addresses, 2009 genesis → 2025
// Both normalized so that year-15-since-launch = 100, then plotted against
// years since launch on the X-axis. The point: the S-curves track closely,
// and the slope tells us where BTC is in its adoption cycle.

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import {
  INTERNET_USERS,
  BITCOIN_ACTIVE_ADDRESSES as BTC_ADDRESSES_FALLBACK,
  type InternetUserPoint,
  type BitcoinAddressPoint,
} from "@/lib/laws-data";

const INTERNET_LAUNCH_YEAR = 1991;  // public WWW release
const BITCOIN_LAUNCH_YEAR = 2009;   // genesis block

interface BassPayload {
  asOf: string;
  source: 'live' | 'fallback';
  bitcoin: Array<{ year: number; addresses: number }>;
}

function useBass() {
  return useQuery<BassPayload>({
    queryKey: ['/api/laws/bass'],
    queryFn: async () => {
      const res = await fetch('/api/laws/bass');
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    refetchInterval: 6 * 60 * 60 * 1000,
    staleTime: 60 * 60 * 1000,
  });
}

interface SPoint {
  yearOffset: number;
  internet: number | null;     // normalized 0-100 (relative to T+15)
  bitcoin: number | null;
  internetRaw: number | null;  // actual millions
  bitcoinRaw: number | null;
  internetYear: number;
  bitcoinYear: number;
}

function buildOverlay(
  internet: InternetUserPoint[],
  bitcoin: Array<{ year: number; addresses: number }>,
): SPoint[] {
  const internetT15 = INTERNET_LAUNCH_YEAR + 15;     // 2006
  const bitcoinT15 = BITCOIN_LAUNCH_YEAR + 15;        // 2024

  const internetT15Value = internet.find(p => p.year === internetT15)?.users
    ?? internet.reduce((max, p) => p.year <= internetT15 && p.users > max.users ? p : max, internet[0]).users;

  const bitcoinT15Value = bitcoin.find(p => p.year === bitcoinT15)?.addresses
    ?? BTC_ADDRESSES_FALLBACK.find(p => p.year === bitcoinT15)?.addresses
    ?? bitcoin[bitcoin.length - 1]?.addresses
    ?? 1.5;

  const maxOffset = 26;  // 0..25 covers both curves well
  const result: SPoint[] = [];
  for (let offset = 0; offset <= maxOffset; offset++) {
    const internetYear = INTERNET_LAUNCH_YEAR + offset;
    const bitcoinYear = BITCOIN_LAUNCH_YEAR + offset;
    // Closest year within range
    const internetPoint = internet
      .filter(p => p.year >= INTERNET_LAUNCH_YEAR)
      .reduce<InternetUserPoint | null>((best, p) =>
        !best || Math.abs(p.year - internetYear) < Math.abs(best.year - internetYear) ? p : best,
        null);
    const bitcoinPoint = (bitcoin.length > 0 ? bitcoin : BTC_ADDRESSES_FALLBACK)
      .reduce<{ year: number; addresses: number } | null>((best, p) =>
        !best || Math.abs(p.year - bitcoinYear) < Math.abs(best.year - bitcoinYear) ? p : best,
        null);

    result.push({
      yearOffset: offset,
      internet: internetPoint ? Math.round((internetPoint.users / internetT15Value) * 1000) / 10 : null,
      bitcoin: bitcoinPoint ? Math.round((bitcoinPoint.addresses / bitcoinT15Value) * 1000) / 10 : null,
      internetRaw: internetPoint?.users ?? null,
      bitcoinRaw: bitcoinPoint?.addresses ?? null,
      internetYear,
      bitcoinYear,
    });
  }
  return result;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: SPoint }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="bg-card border border-muted/30 rounded-md p-2 text-xs shadow-lg">
      <div className="font-semibold mb-1">Year {p.yearOffset} since launch</div>
      <div className="text-muted-foreground mb-1">
        Internet {p.internetYear} · BTC {p.bitcoinYear}
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
        <span className="text-muted-foreground">Internet:</span>
        <span className="font-mono">
          {p.internet !== null ? `${p.internet} (${p.internetRaw?.toFixed(0)}M users)` : 'n/a'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
        <span className="text-muted-foreground">BTC:</span>
        <span className="font-mono">
          {p.bitcoin !== null ? `${p.bitcoin} (${p.bitcoinRaw?.toFixed(2)}M addrs)` : 'n/a'}
        </span>
      </div>
    </div>
  );
}

export default function BassSection() {
  const query = useBass();

  const overlay = useMemo(() => {
    const bitcoin = query.data?.bitcoin ?? [];
    return buildOverlay(INTERNET_USERS, bitcoin);
  }, [query.data?.bitcoin]);

  const live = query.data?.source === 'live';

  // Current adoption "phase" — based on the Bass model framing
  const latestBtc = overlay[overlay.length - 1];
  const currentPhase = useMemo(() => {
    if (!latestBtc || latestBtc.bitcoin === null) return null;
    const b = latestBtc.bitcoin;
    if (b < 5) return { label: 'Innovators', pct: Math.round(b / 5 * 100) };
    if (b < 20) return { label: 'Early adopters', pct: Math.round((b - 5) / 15 * 100) };
    if (b < 50) return { label: 'Early majority', pct: Math.round((b - 20) / 30 * 100) };
    if (b < 85) return { label: 'Late majority', pct: Math.round((b - 50) / 35 * 100) };
    return { label: 'Laggards', pct: 100 };
  }, [latestBtc]);

  return (
    <section id="bass" className="py-16 border-t border-muted/10 bg-background/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 mb-3">
              Law #2
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center gap-3">
              <span className="text-3xl">📈</span>
              Bass Diffusion / S-Curve
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Every adopted technology traces an S-curve: <em>innovators</em> → <em>early adopters</em> → <em>early majority</em> →
              <em> late majority</em> → <em>laggards</em>. Bass (1969) gave us the math; here we use it to compare
              Bitcoin's adoption to the internet's.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {live ? 'Live BTC data · static internet dataset' : 'Fallback data'}
          </div>
        </div>

        <Card className="bg-card border-muted/20 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Normalized adoption — both networks set to 100 at year 15
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              Internet (WWW 1991 → 2006 baseline) vs BTC (2009 → 2024 baseline)
            </div>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <Skeleton className="h-[360px] w-full" />
            ) : query.error ? (
              <div className="h-[360px] flex flex-col items-center justify-center text-xs text-muted-foreground gap-1">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span>Chart data unavailable</span>
                <span className="text-[10px]">{(query.error as Error)?.message ?? 'no data'}</span>
              </div>
            ) : (
              <div className="h-[360px] -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overlay} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="yearOffset"
                      type="number"
                      domain={[0, 26]}
                      tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                      tickFormatter={(v) => `${v}y`}
                      ticks={[0, 5, 10, 15, 20, 25]}
                    />
                    <YAxis
                      domain={[0, 110]}
                      tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                      tickFormatter={(v) => `${v}`}
                      width={50}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)' }} />
                    <Line
                      type="monotone"
                      dataKey="internet"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      dot={false}
                      connectNulls
                      name="Internet"
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="bitcoin"
                      stroke="#F7931A"
                      strokeWidth={2.5}
                      dot={false}
                      connectNulls
                      name="Bitcoin"
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          <Card className="bg-card border-muted/20">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Internet launch</div>
              <div className="text-xl font-bold font-mono text-purple-500">1991 (WWW)</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-muted/20">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">BTC launch</div>
              <div className="text-xl font-bold font-mono text-amber-500">2009 (genesis)</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-muted/20">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">BTC adoption phase</div>
              <div className="text-xl font-bold font-mono text-foreground">
                {currentPhase?.label ?? '—'}
              </div>
              {currentPhase && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Year {latestBtc?.yearOffset} on the curve
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-background/40 border-muted/20">
          <CardContent className="pt-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
            <p>
              <span className="text-foreground font-medium">The trick.</span> Both curves get pinned to
              <span className="font-mono mx-1 text-foreground">100</span> at year 15 since launch (1991+15 = 2006 for the web,
              2009+15 = 2024 for BTC). What you see is <em>shape</em>, not absolute scale — and the shape is
              strikingly similar. Internet users and BTC active addresses grew on nearly identical S-curves
              when placed on equal footing.
            </p>
            <p>
              <span className="text-foreground font-medium">Where BTC is now.</span> The internet's T+15 was 2006 —
              the early MySpace/Facebook era. BTC's T+15 was 2024 — the ETF approval era. If the curves keep tracking,
              the next decade looks more like 2007–2017 (smartphones, social media, ecommerce explosion) than
              1997–2007 (web 1.0 stagnation). That's where the "internet of money" narrative gets its teeth.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}