import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  usd: number;
  usd_24h_change: number;
}

interface TopCoin {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
}

export default function MarketMovers() {
  const { data, isLoading } = useQuery<CoinData[]>({
    queryKey: ['market-movers'],
    queryFn: async () => {
      const ids = 'bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,avalanche-2,chainlink,polkadot';
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
      );
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      return Object.entries(data).map(([id, values]: [string, any]) => ({
        id,
        symbol: id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        usd: values.usd,
        usd_24h_change: values.usd_24h_change || 0,
      }));
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <Card className="bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">MARKET MOVERS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">MARKET MOVERS</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Unable to load market data</p>
        </CardContent>
      </Card>
    );
  }

  const nameMap: Record<string, string> = {
    bitcoin: 'Bitcoin',
    ethereum: 'Ethereum',
    solana: 'Solana',
    binancecoin: 'BNB',
    ripple: 'XRP',
    cardano: 'Cardano',
    dogecoin: 'Dogecoin',
    'avalanche-2': 'Avalanche',
    chainlink: 'Chainlink',
    polkadot: 'Polkadot',
  };

  const symbolMap: Record<string, string> = {
    bitcoin: 'BTC',
    ethereum: 'ETH',
    solana: 'SOL',
    binancecoin: 'BNB',
    ripple: 'XRP',
    cardano: 'ADA',
    dogecoin: 'DOGE',
    'avalanche-2': 'AVAX',
    chainlink: 'LINK',
    polkadot: 'DOT',
  };

  const coins: TopCoin[] = data
    .filter(c => c.usd > 0)
    .map(c => ({
      rank: 0,
      symbol: symbolMap[c.id] || c.symbol.toUpperCase(),
      name: nameMap[c.id] || c.name,
      price: c.usd,
      change24h: c.usd_24h_change,
      marketCap: 0,
    }))
    .sort((a, b) => b.change24h - a.change24h);

  const gainers = [...coins].sort((a, b) => b.change24h - a.change24h).slice(0, 5);
  const losers = [...coins].sort((a, b) => a.change24h - b.change24h).slice(0, 5);
  const topCoins = coins.slice(0, 6);

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">MARKET MOVERS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top Cryptos */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-semibold">TOP COINS</p>
          <div className="space-y-1">
            {topCoins.map((coin) => (
              <div key={coin.symbol} className="flex items-center justify-between py-1 border-b border-muted/10 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground w-10">{coin.symbol}</span>
                  <span className="text-xs text-foreground truncate max-w-[80px]">{coin.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-medium">{formatCurrency(coin.price, 'USD', coin.price < 1 ? 4 : 2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gainers */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-semibold flex items-center gap-1">
            <ArrowUp className="w-3 h-3 text-[hsl(var(--positive))]" />
            TOP GAINERS (24h)
          </p>
          <div className="space-y-1">
            {gainers.map((coin) => (
              <div key={coin.symbol} className="flex items-center justify-between py-1">
                <span className="text-xs font-mono">{coin.symbol}</span>
                <span className="text-xs font-mono text-[hsl(var(--positive))]">
                  +{coin.change24h.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Losers */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-semibold flex items-center gap-1">
            <ArrowDown className="w-3 h-3 text-[hsl(var(--negative))]" />
            TOP LOSERS (24h)
          </p>
          <div className="space-y-1">
            {losers.map((coin) => (
              <div key={coin.symbol} className="flex items-center justify-between py-1">
                <span className="text-xs font-mono">{coin.symbol}</span>
                <span className="text-xs font-mono text-[hsl(var(--negative))]">
                  {coin.change24h.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
