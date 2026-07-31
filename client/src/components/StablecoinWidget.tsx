/**
 * Stablecoin Market Cap widget — ADDED 2026-07-31.
 *
 * Live data from CoinGecko category=stablecoins. Shows total stablecoin
 * market cap (liquidity proxy / dry-powder gauge), 24h volume, and the top
 * 6 stablecoins by market cap.
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StablecoinData {
  totalMarketCapUSD: number;
  total24hVolumeUSD: number;
  coinCount: number;
  topCoins: Array<{
    symbol: string;
    name: string;
    marketCapUSD: number;
    priceUSD: number;
    change24h: number;
    image?: string;
  }>;
  asOf: string;
  source: string;
}

function formatCompact(n: number): string {
  if (!n) return '$0';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
}

function formatPct(n: number): string {
  if (typeof n !== 'number') return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export default function StablecoinWidget() {
  const { data, isLoading } = useQuery<StablecoinData>({
    queryKey: ['/api/stablecoin'],
    refetchInterval: 10 * 60 * 1000, // 10 min
    staleTime: 60 * 1000,
  });

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center justify-between">
          <span>STABLECOIN MARKET CAP</span>
          <span className="text-xs text-muted-foreground/60">dry powder</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-10 bg-muted/40 rounded animate-pulse" />
            <div className="h-4 bg-muted/40 rounded animate-pulse w-1/2" />
          </div>
        ) : data ? (
          <>
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-3xl font-mono font-bold text-foreground">
                {formatCompact(data.totalMarketCapUSD)}
              </span>
              <span className="text-xs text-muted-foreground">
                {data.coinCount} coins
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              24h vol: <span className="font-mono text-foreground">{formatCompact(data.total24hVolumeUSD)}</span>
            </p>
            <div className="space-y-1.5">
              {data.topCoins.slice(0, 6).map((c) => (
                <div
                  key={c.symbol}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-foreground">{c.symbol}</span>
                    <span className="text-muted-foreground truncate max-w-[80px]" title={c.name}>
                      {c.name}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-foreground">{formatCompact(c.marketCapUSD)}</span>
                    <span className={`text-[10px] ${c.change24h >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {formatPct(c.change24h)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground/60 mt-3">Source: {data.source}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Unable to load data</p>
        )}
      </CardContent>
    </Card>
  );
}
