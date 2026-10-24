import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface FundingRateData {
  symbol: string;
  exchange: string;
  fundingRatePercent: number;
  nextFundingTime: string | null;
}

// Audit B9: the browser used to call api.bybit.com directly (blocked by CORS).
// Now it reads our own /api/funding-rates (OKX, Deribit backup), server-side.
export default function FundingRates() {
  const { data, isLoading } = useQuery<FundingRateData[]>({
    queryKey: ['/api/funding-rates'],
    queryFn: async () => {
      const res = await fetch('/api/funding-rates');
      if (!res.ok) return [];
      const j = await res.json();
      if (typeof j?.fundingRate !== 'number' || !Number.isFinite(j.fundingRate)) return [];
      return [{
        symbol: j.instrument ?? 'BTC perp',
        exchange: j.exchange ?? '',
        fundingRatePercent: j.fundingRate,
        nextFundingTime: j.nextFundingTime ?? null,
      }];
    },
    refetchInterval: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card className="bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">OPTIONS & FUTURES</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getFundingColor = (rate: number): string => {
    if (rate > 0.01) return 'text-red-500'; // high positive funding: longs paying shorts
    if (rate < -0.01) return 'text-green-500'; // negative: shorts paying longs
    return 'text-yellow-500';
  };

  const getFundingBg = (rate: number): string => {
    if (rate > 0.01) return 'bg-red-500/10';
    if (rate < -0.01) return 'bg-green-500/10';
    return 'bg-yellow-500/10';
  };

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          OPTIONS & FUTURES
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* BTC perp funding rate */}
          <div className="p-3 bg-card rounded-lg border" data-testid="funding-rate">
            <div className="text-xs text-muted-foreground mb-1">
              {data && data.length > 0 ? `${data[0].exchange} BTC Funding Rate` : 'BTC Funding Rate'}
            </div>
            {data && data.length > 0 ? (
              <>
                <div className={`text-xl font-mono font-bold ${getFundingColor(data[0].fundingRatePercent)}`}>
                  {data[0].fundingRatePercent >= 0 ? '+' : ''}{data[0].fundingRatePercent.toFixed(4)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Next: {data[0].nextFundingTime ? new Date(data[0].nextFundingTime).toLocaleTimeString() : '—'}
                </div>
              </>
            ) : (
              <div className="text-xl font-mono text-muted-foreground">—</div>
            )}
          </div>

          {/* Funding Rate Legend */}
          <div className="p-3 bg-card rounded-lg border">
            <div className="text-xs text-muted-foreground mb-2">Funding Rate Meaning</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30" />
                <span className="text-muted-foreground">Positive = longs pay shorts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30" />
                <span className="text-muted-foreground">Negative = shorts pay longs</span>
              </div>
            </div>
          </div>

          {/* Open Interest / Max Pain placeholder */}
          <div className="p-3 bg-card rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">Market Bias</div>
            {data && data.length > 0 ? (
              <div className={`text-lg font-mono font-bold ${getFundingColor(data[0].fundingRatePercent)}`}>
                {/* 0.01%/8h is the exchanges' standard baseline (interest-rate component), so only
                    funding beyond it signals crowding; same thresholds as the colour scale. */}
                {data[0].fundingRatePercent > 0.01 ? 'LONGS CROWDED' :
                 data[0].fundingRatePercent < -0.01 ? 'SHORTS CROWDED' : 'NEUTRAL'}
              </div>
            ) : (
              <div className="text-lg font-mono text-muted-foreground">—</div>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              Positioning read from funding direction
            </div>
          </div>
        </div>

        {/* Raw data for debugging */}
        {data && data.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground/60">
              Funding settles every 8 hours (00:00, 08:00, 16:00 UTC). Data from {data[0].exchange} public API.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
