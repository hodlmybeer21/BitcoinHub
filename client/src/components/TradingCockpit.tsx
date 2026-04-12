import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BitcoinMarketData } from "@/lib/types";
import MarketMovers from "@/components/MarketMovers";
import FearGreedWidget from "@/components/FearGreedWidget";
import OnChainMetrics from "@/components/OnChainMetrics";
import MacroIndicators from "@/components/MacroIndicators";
import WhaleAlertsWidget from "@/components/WhaleAlertsWidget";
import FundingRates from "@/components/FundingRates";
import OptionsFlowWidget from "@/components/OptionsFlowWidget";
import LiquidityWidget from "@/components/LiquidityWidget";

const TIMEFRAMES = ['1m', '5m', '1h', '1D', '1W', '1M', '3M', '1Y', 'ALL'] as const;
type Timeframe = typeof TIMEFRAMES[number];

const TradingCockpit = () => {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const { data: bitcoinData, isLoading: isLoadingBitcoinData } = useQuery({
    queryKey: ["/api/bitcoin/market-data"],
    refetchInterval: 60000,
  });

  const { data: chartData } = useQuery({
    queryKey: ["/api/bitcoin/chart", timeframe],
    queryFn: async () => {
      const res = await fetch(`/api/bitcoin/chart?timeframe=${timeframe}`);
      return res.json();
    },
    refetchInterval: 60000,
  });

  const handleRefresh = () => {
    window.location.reload();
  };

  if (isLoadingBitcoinData) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Loading trading cockpit...</p>
        </div>
      </div>
    );
  }

  const marketData = bitcoinData as BitcoinMarketData;
  const currentPrice = marketData?.current_price?.usd || 0;
  const priceChangePercentage = marketData?.price_change_percentage_24h || 0;
  const isPositiveChange = priceChangePercentage >= 0;

  // Calculate chart position for the progress bar
  const chartPrices = chartData?.map((d: { price: number }) => d.price) || [];
  const minPrice = chartPrices.length ? Math.min(...chartPrices) : currentPrice * 0.98;
  const maxPrice = chartPrices.length ? Math.max(...chartPrices) : currentPrice * 1.02;
  const priceRange = maxPrice - minPrice;
  const chartPosition = priceRange > 0 ? ((currentPrice - minPrice) / priceRange) * 100 : 50;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header: BTC Price + Chart */}
      <header className="border-b border-muted/20 pb-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-sm font-semibold text-muted-foreground tracking-wider">BTC/USD · BITCOIN</h1>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8" 
              onClick={handleRefresh}
            >
              <RefreshCw size={16} />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-baseline gap-4">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold text-foreground">
              {formatCurrency(currentPrice)}
            </h2>
            <div className="flex items-center gap-2">
              {isPositiveChange ? (
                <ArrowUp className="text-[hsl(var(--positive))] h-6 w-6" />
              ) : (
                <ArrowDown className="text-[hsl(var(--negative))] h-6 w-6" />
              )}
              <span className={`text-xl font-mono font-medium ${isPositiveChange ? 'text-[hsl(var(--positive))]' : 'text-[hsl(var(--negative))]'}`}>
                {formatPercentage(priceChangePercentage)}
              </span>
              <span className="text-sm text-muted-foreground">(24h)</span>
            </div>
          </div>
          
          <div className="hidden sm:flex gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">24h High</p>
              <p className="text-sm font-mono font-medium text-[hsl(var(--positive))]">
                {formatCurrency(marketData?.high_24h?.usd || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">24h Low</p>
              <p className="text-sm font-mono font-medium text-[hsl(var(--negative))]">
                {formatCurrency(marketData?.low_24h?.usd || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Market Cap</p>
              <p className="text-sm font-mono font-medium text-foreground">
                {formatCurrency((marketData?.market_cap?.usd || 0) / 1e12, 'USD', 2)}T
              </p>
            </div>
          </div>
        </div>

        {/* Mini Price Chart */}
        {chartPrices.length > 0 && (
          <div className="mt-4">
            <div className="h-16 w-full bg-muted/20 rounded-md overflow-hidden relative">
              <svg viewBox={`0 0 ${chartPrices.length} 100`} preserveAspectRatio="none" className="w-full h-full">
                <polyline
                  fill="none"
                  stroke={isPositiveChange ? "hsl(var(--positive))" : "hsl(var(--negative))"}
                  strokeWidth="1.5"
                  points={chartPrices.map((p: number, i: number) => {
                    const x = (i / (chartPrices.length - 1)) * 100;
                    const y = 100 - ((p - minPrice) / priceRange) * 100;
                    return `${x},${y}`;
                  }).join(" ")}
                />
              </svg>
              {/* Current price indicator */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary"
                style={{ left: `${chartPosition}%` }}
              />
            </div>
          </div>
        )}

        {/* Timeframe Selector */}
        <div className="flex gap-1 mt-4 flex-wrap">
          {TIMEFRAMES.map((tf) => (
            <Button
              key={tf}
              variant={timeframe === tf ? "default" : "ghost"}
              size="sm"
              className={`h-7 px-2 text-xs font-mono ${timeframe === tf ? '' : 'text-muted-foreground'}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </Button>
          ))}
        </div>
      </header>
      
      {/* Main Grid: 3 columns on desktop, 1 on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Column 1: BTC Dashboard */}
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">BTC DASHBOARD</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Market Cap</span>
              <span className="font-mono font-medium">
                {formatCurrency((marketData?.market_cap?.usd || 0) / 1e12, 'USD', 2)}T
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">24h Volume</span>
              <span className="font-mono font-medium">
                {formatCurrency((marketData?.total_volume?.usd || 0) / 1e9, 'USD', 2)}B
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Circulating Supply</span>
              <span className="font-mono font-medium">
                {(marketData?.circulating_supply || 0).toLocaleString()} BTC
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">24h Change</span>
              <span className={`font-mono font-medium ${isPositiveChange ? 'text-[hsl(var(--positive))]' : 'text-[hsl(var(--negative))]'}`}>
                {formatPercentage(priceChangePercentage)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">All-Time High</span>
              <span className="font-mono font-medium text-amber-500">
                {formatCurrency(marketData?.ath?.usd || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Market Movers */}
        <MarketMovers />

        {/* Column 3: Fear & Greed */}
        <FearGreedWidget />
      </div>

      {/* Second Row: 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* On-Chain Metrics */}
        <OnChainMetrics />

        {/* Macro Indicators */}
        <MacroIndicators />

        {/* Whale Alerts */}
        <WhaleAlertsWidget />
      </div>

      {/* Third Row: Options & Futures */}
      <div className="mb-4">
        <FundingRates />
      </div>

      {/* Fourth Row: Liquidity & DeFi */}
      <div className="mb-4">
        <LiquidityWidget />
      </div>

      {/* Fifth Row: Options Flow */}
      <div className="mb-4">
        <OptionsFlowWidget />
      </div>
    </div>
  );
};

export default TradingCockpit;
