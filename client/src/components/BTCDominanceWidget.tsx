/**
 * BTC Dominance widget — UPDATED 2026-07-31.
 * Now shows a 30-day sparkline alongside the current value.
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Sparkline from "@/components/Sparkline";

interface DominanceData {
  dominance: number;
  totalMarketCap: number;
  lastUpdated: string;
  source: string;
}

interface DominanceHistoryData {
  history: Array<{ date: string; dominance: number; marketCapUSD: number }>;
  asOf: string;
  source: string;
}

export default function BTCDominanceWidget() {
  const { data: dom, isLoading: l1 } = useQuery<DominanceData>({
    queryKey: ['/api/bitcoin/dominance'],
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: hist } = useQuery<DominanceHistoryData>({
    queryKey: ['/api/bitcoin/dominance/history?days=30'],
    refetchInterval: 60 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  if (l1) {
    return (
      <Card className="bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">BTC DOMINANCE</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const dominance = dom?.dominance ?? 0;
  const historyValues = hist?.history?.map(h => h.dominance) ?? [];
  const dominanceDelta = historyValues.length >= 2
    ? historyValues[historyValues.length - 1] - historyValues[0]
    : 0;

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center justify-between">
          <span>BTC DOMINANCE</span>
          <span className="text-xs text-muted-foreground/60">30d trend</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-foreground">
              {dominance.toFixed(2)}%
            </span>
            {historyValues.length >= 2 && (
              <span className={`text-xs font-mono ${dominanceDelta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {dominanceDelta >= 0 ? '+' : ''}{dominanceDelta.toFixed(2)}%
              </span>
            )}
          </div>
        </div>

        {historyValues.length >= 2 ? (
          <div className="mb-3">
            <Sparkline values={historyValues} width={240} height={48} />
          </div>
        ) : (
          <div className="h-12 mb-3 flex items-center justify-center text-xs text-muted-foreground/60">
            Loading 30-day history...
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Total Crypto MCap</p>
            <p className="font-mono font-medium text-foreground">
              ${dom?.totalMarketCap ? (dom.totalMarketCap / 1e12).toFixed(2) : '—'}T
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">30d change</p>
            <p className={`font-mono font-medium ${dominanceDelta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {dominanceDelta >= 0 ? '+' : ''}{dominanceDelta.toFixed(2)}pp
            </p>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/60 mt-3">Source: {dom?.source}</p>
      </CardContent>
    </Card>
  );
}
