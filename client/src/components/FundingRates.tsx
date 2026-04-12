import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface FundingRateData {
  symbol: string;
  fundingRate: number;
  fundingRatePercent: number;
  nextFundingTime: string;
  price: number;
}

export default function FundingRates() {
  const { data, isLoading } = useQuery<FundingRateData[]>({
    queryKey: ['funding-rates'],
    queryFn: async () => {
      try {
        const res = await fetch('https://api.bybit.com/v5/market/funding/inner-index-price?category=linear&symbol=BTCUSD');
        if (!res.ok) throw new Error('Failed');
        const json = await res.json();
        
        if (json.ret_code === 0 && json.result?.list) {
          const item = json.result.list[0];
          const fundingRatePercent = parseFloat(item.funding_rate || '0') * 100;
          
          return [{
            symbol: 'BTCUSD',
            fundingRate: parseFloat(item.funding_rate || '0'),
            fundingRatePercent,
            nextFundingTime: item.next_funding_time || '',
            price: parseFloat(item.index_price || '0'),
          }];
        }
        return [];
      } catch (e) {
        console.error('Funding rate fetch failed:', e);
        return [];
      }
    },
    refetchInterval: 60000,
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
    if (rate > 0.01) return 'text-red-500'; // High funding = bears paying bulls
    if (rate < -0.01) return 'text-green-500'; // Negative = bulls paying bears
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
          {/* Bybit Funding Rate */}
          <div className="p-3 bg-card rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">Bybit Funding Rate</div>
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
                <span className="text-muted-foreground">Positive = Bears pay bulls</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30" />
                <span className="text-muted-foreground">Negative = Bulls pay bears</span>
              </div>
            </div>
          </div>

          {/* Open Interest / Max Pain placeholder */}
          <div className="p-3 bg-card rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">Market Bias</div>
            {data && data.length > 0 ? (
              <div className={`text-lg font-mono font-bold ${getFundingColor(data[0].fundingRatePercent)}`}>
                {data[0].fundingRatePercent > 0.005 ? 'BEARISH' : 
                 data[0].fundingRatePercent < -0.005 ? 'BULLISH' : 'NEUTRAL'}
              </div>
            ) : (
              <div className="text-lg font-mono text-muted-foreground">—</div>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              Based on funding rate direction
            </div>
          </div>
        </div>

        {/* Raw data for debugging */}
        {data && data.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground/60">
              Funding rate updates every 8 hours at 00:00, 08:00, 16:00 UTC. Data from Bybit.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
