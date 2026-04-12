import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface NetworkStats {
  hashRate: number;
  hashRateEH: number;
  difficulty: number;
  avgBlockTime: number;
  lastUpdated: string;
}

interface BitcoinMarketData {
  current_price: { usd: number };
  market_cap: { usd: number };
  total_volume: { usd: number };
  price_change_percentage_24h: number;
  circulating_supply: number;
  ath: { usd: number };
  high_24h: { usd: number };
  low_24h: { usd: number };
}

export default function OnChainMetrics() {
  const { data: networkStats, isLoading: loadingStats } = useQuery<NetworkStats>({
    queryKey: ['/api/bitcoin/network-stats'],
    refetchInterval: 60000,
  });

  const { data: marketData, isLoading: loadingMarket } = useQuery<BitcoinMarketData>({
    queryKey: ['/api/bitcoin/market-data'],
    refetchInterval: 60000,
  });

  const isLoading = loadingStats || loadingMarket;

  if (isLoading) {
    return (
      <Card className="bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">ON-CHAIN METRICS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatHashRate = (eh: number): string => {
    if (eh >= 1000) return `${(eh / 1000).toFixed(1)} ZE/s`;
    if (eh >= 1) return `${eh.toFixed(1)} EH/s`;
    return `${(eh * 1000).toFixed(0)} PH/s`;
  };

  const formatDifficulty = (d: number): string => {
    if (d >= 1e12) return `${(d / 1e12).toFixed(2)}T`;
    if (d >= 1e9) return `${(d / 1e9).toFixed(2)}B`;
    return `${(d / 1e6).toFixed(2)}M`;
  };

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">ON-CHAIN METRICS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Hash Rate</span>
          <span className="font-mono font-medium">
            {networkStats ? formatHashRate(networkStats.hashRateEH) : '—'}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Difficulty</span>
          <span className="font-mono font-medium">
            {networkStats ? formatDifficulty(networkStats.difficulty) : '—'}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Avg Block Time</span>
          <span className="font-mono font-medium">
            {networkStats ? `${networkStats.avgBlockTime.toFixed(1)} min` : '—'}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">24h Volume</span>
          <span className="font-mono font-medium">
            {marketData ? `${formatNumber(marketData.total_volume.usd / 1e9, 1)}B` : '—'}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Dominance</span>
          <span className="font-mono font-medium">
            {marketData ? '—' : '—'}
          </span>
        </div>

        {networkStats?.lastUpdated && (
          <p className="text-xs text-muted-foreground/60 pt-2 border-t">
            Updated: {new Date(networkStats.lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
