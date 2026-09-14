// BitcoinHub — Debt Liquidity Panel
// 4-card panel for /analytics/cockpit. Live data from:
//   /api/treasury/auctions/snapshot  (Treasury Fiscal Data API)
//   /api/fred/data                  (already wired)

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Minus, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { safeFetch, TreasuryAuctionsSchema } from "@shared/safe-api";

interface AuctionRow {
  record_date: string;
  auction_date: string;
  security_term: string;
  bid_to_cover_ratio: number | null;
  offering_amt: number | null;
  accepted_amt: number | null;
  high_yield: number | null;
  when_issued_yield: number | null;
  indirect_bidder_accepted: number | null;
  primary_dealer_accepted: number | null;
  total_accepted: number | null;
}

interface AuctionTermLatest {
  term: string;
  latest: AuctionRow;
  history: AuctionRow[];
  baseline: { mean: number; stdev: number };
  baselineIndirect: { mean: number; stdev: number };
  stressScore: number;
  flags: string[];
}

interface AuctionsSnapshot {
  fetchedAt: string;
  terms: AuctionTermLatest[];
  combinedStressScore: number;
  notes: string;
}

interface FredPoint { date: string; value: number | null; }

function fmtUsdMillions(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}T`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}B`;
  return `$${n.toFixed(0)}M`;
}

function fmtPct(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined) return '—';
  return `${n.toFixed(digits)}%`;
}

function fmtBps(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return `${n.toFixed(1)} bps`;
}

function daysAgo(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

function stressColor(score: number): { bg: string; text: string; label: string } {
  if (score >= 75) return { bg: 'bg-red-950/40 border-red-900', text: 'text-red-400', label: 'High stress' };
  if (score >= 60) return { bg: 'bg-amber-950/40 border-amber-900', text: 'text-amber-400', label: 'Elevated' };
  if (score >= 40) return { bg: 'bg-yellow-950/30 border-yellow-900', text: 'text-yellow-400', label: 'Watch' };
  return { bg: 'bg-emerald-950/40 border-emerald-900', text: 'text-emerald-400', label: 'Calm' };
}

function stressBadgeColor(score: number): string {
  if (score >= 75) return 'bg-red-900/40 text-red-300 border-red-800';
  if (score >= 60) return 'bg-amber-900/40 text-amber-300 border-amber-800';
  if (score >= 40) return 'bg-yellow-900/40 text-yellow-300 border-yellow-800';
  return 'bg-emerald-900/40 text-emerald-300 border-emerald-800';
}

function indirectShare(r: AuctionRow): number | null {
  if (!r.indirect_bidder_accepted || !r.total_accepted) return null;
  return (r.indirect_bidder_accepted / r.total_accepted) * 100;
}

function tailBps(r: AuctionRow): number | null {
  if (r.high_yield === null || r.when_issued_yield === null) return null;
  return (r.high_yield - r.when_issued_yield) * 100;
}

function AuctionCard({ term, data }: { term: string; data?: AuctionTermLatest }) {
  if (!data || !data.latest) {
    return (
      <Card className="border-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">{term} Auction</CardTitle>
        </CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">No data</p></CardContent>
      </Card>
    );
  }
  const r = data.latest;
  const ind = indirectShare(r);
  const tail = tailBps(r);
  const btc = r.bid_to_cover_ratio;
  const ago = daysAgo(r.record_date);

  const btcColor = btc === null ? '' : btc < 2.2 ? 'text-red-400' : btc < 2.4 ? 'text-amber-400' : 'text-emerald-400';
  const indColor = ind === null ? '' : ind < 60 ? 'text-red-400' : ind < 68 ? 'text-amber-400' : 'text-emerald-400';
  const tailColor = tail === null ? '' : tail > 2 ? 'text-red-400' : tail > 0.5 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <Card className="border-muted/30 bg-card/60">
      <CardHeader className="pb-2 flex flex-row justify-between items-start">
        <div>
          <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">{term} Auction</CardTitle>
          <p className="text-[10px] text-muted-foreground mt-0.5">{r.record_date} ({ago}d ago)</p>
        </div>
        {data.flags.length > 0 && (
          <Badge variant="outline" className="bg-amber-900/30 text-amber-300 border-amber-800 text-[10px]">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {data.flags[0]}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground">Bid-to-cover</p>
            <p className={`text-xl font-mono font-bold ${btcColor}`}>
              {btc === null ? '—' : btc.toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground">μ {data.baseline.mean.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Indirect %</p>
            <p className={`text-xl font-mono font-bold ${indColor}`}>
              {ind === null ? '—' : `${ind.toFixed(1)}%`}
            </p>
            <p className="text-[10px] text-muted-foreground">μ {data.baselineIndirect.mean.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Tail</p>
            <p className={`text-xl font-mono font-bold ${tailColor}`}>
              {tail === null ? 'n/a' : `${tail > 0 ? '+' : ''}${tail.toFixed(1)}`}
            </p>
            <p className="text-[10px] text-muted-foreground">bps vs WI</p>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground pt-1 border-t border-muted/20">
          High yield: <span className="font-mono">{r.high_yield !== null ? `${r.high_yield.toFixed(3)}%` : '—'}</span>
          {r.offering_amt ? <> · Offering: <span className="font-mono">${(r.offering_amt / 1000).toFixed(0)}B</span></> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function StressScoreCard({ score, flags }: { score: number; flags: string[] }) {
  const c = stressColor(score);
  return (
    <Card className={`${c.bg} border`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider flex items-center justify-between">
          <span>Stress Score (composite)</span>
          <Badge variant="outline" className={stressBadgeColor(score)}>{c.label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          <p className={`text-5xl font-mono font-bold ${c.text}`}>{score}</p>
          <p className="text-sm text-muted-foreground mb-1">/ 100</p>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          40% bid-to-cover · 30% indirect share · 20% tail · 10% foreign-holdings delta (v2)
        </p>
        {flags.length > 0 && (
          <ul className="mt-2 space-y-1">
            {flags.slice(0, 3).map((f, i) => (
              <li key={i} className="text-[10px] text-amber-300 flex items-start gap-1">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function FredCard({
  seriesId,
  title,
  unit = '%',
  format,
  invertColor = false,
}: {
  seriesId: string;
  title: string;
  unit?: string;
  format?: (v: number) => string;
  invertColor?: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/fred/data', seriesId],
    queryFn: async () => {
      const res = await fetch(`/api/fred/data?series_id=${seriesId}&maxPoints=20`);
      if (!res.ok) throw new Error(`FRED ${seriesId} failed`);
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const points: FredPoint[] = data?.points ?? [];
  const valid = points.filter((p): p is { date: string; value: number } => p.value !== null && typeof p.value === 'number');
  const latest = valid[valid.length - 1];
  const prev = valid.length > 1 ? valid[valid.length - 2] : null;
  const delta = latest && prev ? latest.value - prev.value : null;

  let trendIcon = <Minus className="h-3 w-3 text-muted-foreground" />;
  let trendColor = 'text-muted-foreground';
  if (delta !== null) {
    const positive = invertColor ? delta < 0 : delta > 0;
    if (Math.abs(delta) < 0.001) {
      trendIcon = <Minus className="h-3 w-3 text-muted-foreground" />;
    } else if (delta > 0) {
      trendIcon = <TrendingUp className={`h-3 w-3 ${positive ? 'text-emerald-400' : 'text-red-400'}`} />;
      trendColor = positive ? 'text-emerald-400' : 'text-red-400';
    } else {
      trendIcon = <TrendingDown className={`h-3 w-3 ${positive ? 'text-emerald-400' : 'text-red-400'}`} />;
      trendColor = positive ? 'text-emerald-400' : 'text-red-400';
    }
  }

  const valStr = latest
    ? (format ? format(latest.value) : `${latest.value.toFixed(2)}${unit}`)
    : '—';
  const deltaStr = delta !== null && prev
    ? `${delta > 0 ? '+' : ''}${format ? format(delta) : delta.toFixed(2)}${unit}`
    : '—';

  // Mini sparkline (10 last points)
  const sparkPoints = valid.slice(-10);
  const sparkMax = Math.max(...sparkPoints.map(p => p.value), 0);
  const sparkMin = Math.min(...sparkPoints.map(p => p.value), 0);
  const sparkRange = sparkMax - sparkMin || 1;

  return (
    <Card className="border-muted/30 bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-mono font-bold text-foreground">{valStr}</p>
              <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
                {trendIcon}
                <span className="font-mono">{deltaStr}</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {latest?.date ?? '—'}
            </p>
            {/* Sparkline */}
            <svg viewBox="0 0 100 20" className="w-full h-8 mt-2" preserveAspectRatio="none">
              <polyline
                points={sparkPoints.map((p, i) => {
                  const x = (i / Math.max(sparkPoints.length - 1, 1)) * 100;
                  const y = 20 - ((p.value - sparkMin) / sparkRange) * 18 - 1;
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-primary/70"
              />
            </svg>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function DebtLiquidityPanel() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['/api/treasury/auctions/snapshot'],
    queryFn: () => safeFetch<AuctionsSnapshot>('/api/treasury/auctions/snapshot', TreasuryAuctionsSchema),
    refetchInterval: 30 * 60 * 1000, // 30 min
  });

  const term30 = data?.terms?.find(t => t.term === '30-Year');
  const term10 = data?.terms?.find(t => t.term === '10-Year');
  const allFlags = data?.terms?.flatMap(t => t.flags) ?? [];

  return (
    <div className="border border-muted/30 rounded-lg p-4 bg-gradient-to-b from-background to-muted/10 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            🇺🇸 US Debt Liquidity
            <Badge variant="outline" className="text-[10px] font-normal">NEW</Badge>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Who's buying (and not buying) US debt. Real-time auction tape + Fed balance sheet.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-muted-foreground"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error ? (
        <Card className="border-red-900 bg-red-950/20">
          <CardContent className="pt-4">
            <p className="text-sm text-red-300">
              Failed to load auction data: {(error as Error).message}
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => (
            <Card key={i} className="border-muted/30 bg-card/60">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Loading…</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Row 1: Auctions + Stress */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <AuctionCard term="30-Year" data={term30} />
            <AuctionCard term="10-Year" data={term10} />
            <StressScoreCard
              score={data?.combinedStressScore ?? 50}
              flags={allFlags}
            />
            <div className="grid grid-rows-2 gap-3">
              <FredCard seriesId="WTREGEN" title="Fed SOMA (Treasuries)" format={fmtUsdMillions} />
              <FredCard seriesId="DGS30" title="30Y Treasury Yield" />
            </div>
          </div>
          {/* Row 2: Yield curve context */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FredCard seriesId="DGS10" title="10Y Treasury Yield" />
            <FredCard seriesId="TB3MS" title="3M T-Bill Yield" />
            <FredCard seriesId="T10Y2Y" title="2s10s Spread" />
            <div className="hidden md:flex items-end justify-end">
              <a
                href="https://home.treasury.gov/data/treasury-international-capital-tic-system-home-page"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                Source: Treasury Fiscal Data + FRED <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          {data?.notes && (
            <p className="text-[10px] text-muted-foreground mt-3 italic">{data.notes}</p>
          )}
        </>
      )}
    </div>
  );
}
