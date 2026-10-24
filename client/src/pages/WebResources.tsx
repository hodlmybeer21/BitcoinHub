import { ExternalLink, TrendingUp, Activity, Target, Gauge, RefreshCw, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const WebResources = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch live data from APIs. Audit B11/D8: the old /api/web-resources/m2-chart and
  // /liquidation routes never existed (404), so the cards showed hardcoded 2025 numbers.
  // Now: M2 from /api/liquidity (FRED), BTC + trade buckets from /api/btc/liquidations-recent
  // (Deribit public). Missing data renders "—", never a stale constant.
  const { data: m2Data, isLoading: m2Loading } = useQuery<any>({
    queryKey: ['/api/liquidity', refreshKey],
    refetchInterval: 60 * 60 * 1000,
  });

  const { data: liquidationData, isLoading: liquidationLoading } = useQuery<any>({
    queryKey: ['/api/btc/liquidations-recent', refreshKey],
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });
  const m2Value: number | undefined = m2Data?.indicators?.m2?.value;
  const m2Yoy: number | null | undefined = m2Data?.indicators?.m2?.change;
  const btcIndex: number | undefined = liquidationData?.btcIndexPrice;
  const busiest = Array.isArray(liquidationData?.buckets)
    ? [...liquidationData.buckets].sort((a: any, b: any) => (b.notionalUsd ?? 0) - (a.notionalUsd ?? 0))[0]
    : undefined;
  const usd0 = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

  const { data: piCycleData, isLoading: piCycleLoading } = useQuery<any>({
    queryKey: ['/api/web-resources/pi-cycle', refreshKey],
    refetchInterval: 60 * 60 * 1000, // Refresh every hour
  });

  const { data: fearGreedData, isLoading: fearGreedLoading } = useQuery<any>({
    queryKey: ['/api/web-resources/fear-greed', refreshKey],
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
  });

  const { data: bullMarketData, isLoading: bullMarketLoading } = useQuery<any>({
    queryKey: ['/api/indicators/bull-market-signals', refreshKey],
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const handleRefreshAll = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background p-6">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Web Resources</h1>
            <p className="text-muted-foreground">Live data from essential Bitcoin analysis websites</p>
          </div>
          <Button onClick={handleRefreshAll} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bitcoin and M2 Growth Global */}
        <Card className="bg-card border-border dark:bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Bitcoin and M2 Growth Global
                </CardTitle>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-foreground border-border hover:bg-muted"
                onClick={() => window.open('https://charts.bgeometrics.com/m2_global.html?utm_source=chatgpt.com', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View Chart
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-foreground">M2 Money Supply vs BTC Price</h4>
                <Badge variant="secondary" className="text-xs">
                  {m2Loading ? 'Loading...' : 'Live'}
                </Badge>
              </div>
              {m2Loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">M2 (FRED M2SL):</span>
                    <span className="font-medium text-foreground" data-testid="wr-m2">
                      {typeof m2Value === 'number' && m2Value > 0 ? `$${(m2Value / 1e3).toFixed(2)}T` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">BTC Price:</span>
                    <span className="font-medium text-foreground" data-testid="wr-btc">
                      {typeof btcIndex === 'number' && btcIndex > 0 ? usd0(btcIndex) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">M2 Growth YoY:</span>
                    <span className="font-medium text-foreground" data-testid="wr-m2-yoy">
                      {typeof m2Yoy === 'number' ? `${m2Yoy >= 0 ? '+' : ''}${m2Yoy.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Timeframe:</span>
                    <span className="font-medium text-foreground">Nov 2013 - Apr 2025</span>
                  </div>
                </div>
              )}
            </div>
            <div className="text-xs text-center text-muted-foreground pt-2 border-t border-border">
              Chart: BGEometrics.com • Figures: FRED M2SL, Deribit BTC index
            </div>
          </CardContent>
        </Card>

        {/* Binance BTC/USDT Liquidation Heatmap */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold text-foreground">
                  BTC/USDT Liquidation Heatmap
                </CardTitle>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-foreground border-border hover:bg-muted"
                onClick={() => window.open('https://www.coinglass.com/pro/futures/LiquidationHeatMap', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View Heatmap
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-foreground">Liquidation Analysis</h4>
                <Badge variant="secondary" className="text-xs">
                  {liquidationLoading ? 'Loading...' : liquidationData?.totalTrades ? `Last ${liquidationData.totalTrades} trades` : '—'}
                </Badge>
              </div>
              {liquidationLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">BTC index (Deribit):</span>
                    <span className="font-medium text-foreground">
                      {typeof btcIndex === 'number' && btcIndex > 0 ? usd0(btcIndex) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recent options notional:</span>
                    <span className="font-medium text-foreground">
                      {typeof liquidationData?.totalNotionalUsd === 'number' ? usd0(liquidationData.totalNotionalUsd) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Most active strike zone:</span>
                    <span className="font-medium text-foreground" data-testid="wr-busiest">
                      {busiest ? `${busiest.label} vs spot` : '—'}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="text-xs text-center text-muted-foreground pt-2 border-t border-border">
              Proxy from Deribit public options trades • Full heatmap on Coinglass
            </div>
          </CardContent>
        </Card>

        {/* Bitcoin Pi Cycle Top Indicator */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-600 rounded-lg">
                  <Target className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Pi Cycle Top Indicator
                </CardTitle>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-foreground border-border hover:bg-muted"
                onClick={() => window.open('https://www.bitcoinmagazinepro.com/charts/pi-cycle-top-indicator/', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View Indicator
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-foreground">Cycle Analysis</h4>
                <Badge variant="secondary" className="text-xs">
                  {piCycleLoading ? 'Loading...' : '24h Resolution'}
                </Badge>
              </div>
              {piCycleLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">111DMA Position:</span>
                    <span className="font-medium text-foreground">
                      {piCycleData?.crossStatus ?? '—'} 350DMA x 2
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cycle Status:</span>
                    <span className={`font-medium ${piCycleData?.cyclePhase === 'Bullish' ? 'text-green-500' : 'text-orange-500'}`}>
                      {piCycleData?.cyclePhase ? `${piCycleData.cyclePhase} Phase` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">111DMA Price:</span>
                    <span className="font-medium text-foreground">
                      {typeof piCycleData?.price111DMA === 'number' ? `$${piCycleData.price111DMA.toLocaleString()}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">350DMA x 2:</span>
                    <span className="font-medium text-foreground" data-testid="wr-350x2">
                      {typeof piCycleData?.price350DMAx2 === 'number' ? `$${piCycleData.price350DMAx2.toLocaleString()}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Cross:</span>
                    <span className="font-medium text-foreground">
                      {piCycleData?.lastCrossDate ?? '—'}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="text-xs text-center text-muted-foreground pt-2 border-t border-border">
              Bitcoin Magazine Pro • Historical cycle analysis since 2012
            </div>
          </CardContent>
        </Card>

        {/* CMC Crypto Fear and Greed Index */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <Gauge className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Fear and Greed Index
                </CardTitle>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-foreground border-border hover:bg-muted"
                onClick={() => window.open('https://alternative.me/crypto/fear-and-greed-index/', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View Index
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-foreground">Market Sentiment</h4>
                <Badge variant="secondary" className="text-xs">
                  {fearGreedLoading ? 'Loading...' : 'Real-time'}
                </Badge>
              </div>
              {fearGreedLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : (
                <>
                  <div className="text-center mb-4">
                    <div className="text-6xl font-bold text-orange-500 mb-2">
                      {fearGreedData?.currentValue ?? '—'}
                    </div>
                    <div className="text-lg font-medium text-foreground">
                      {fearGreedData?.classification ?? '—'}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Yesterday:</span>
                      <span className="font-medium text-foreground">
                        {fearGreedData?.yesterday ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Week:</span>
                      <span className="font-medium text-foreground">
                        {fearGreedData?.lastWeek ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Yearly High:</span>
                      <span className="font-medium text-green-500">
                        {fearGreedData?.yearlyHigh ? `${fearGreedData.yearlyHigh.value} (${fearGreedData.yearlyHigh.date})` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Yearly Low:</span>
                      <span className="font-medium text-red-500">
                        {fearGreedData?.yearlyLow ? `${fearGreedData.yearlyLow.value} (${fearGreedData.yearlyLow.date})` : '—'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="text-xs text-center text-muted-foreground pt-2 border-t border-border">
              Alternative.me • Real-time market sentiment analysis
            </div>
          </CardContent>
        </Card>

        {/* Bitcoin White Paper */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500 rounded-lg">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Bitcoin White Paper
                </CardTitle>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-foreground border-border hover:bg-muted"
                onClick={() => window.open('https://bitcoin.org/bitcoin.pdf', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Read PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-foreground">Original Bitcoin Paper</h4>
                <Badge variant="secondary" className="text-xs">
                  Historical
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Title:</span>
                  <span className="font-medium text-foreground">
                    Bitcoin: A Peer-to-Peer Electronic Cash System
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Author:</span>
                  <span className="font-medium text-foreground">
                    Satoshi Nakamoto
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Published:</span>
                  <span className="font-medium text-foreground">October 31, 2008</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pages:</span>
                  <span className="font-medium text-foreground">9 pages</span>
                </div>
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The foundational document that introduced Bitcoin to the world. A revolutionary peer-to-peer electronic cash system that eliminates the need for trusted third parties.
                  </p>
                </div>
              </div>
            </div>
            <div className="text-xs text-center text-muted-foreground pt-2 border-t border-border">
              Bitcoin.org • Original source document
            </div>
          </CardContent>
        </Card>

        {/* Bull Market Indicators */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600 rounded-lg">
                  <Gauge className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Bull Market Indicators
                </CardTitle>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-foreground border-border hover:bg-muted"
                onClick={() => window.open('https://www.coinglass.com/bull-market-peak-signals', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View Indicators
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-foreground">Market Peak Analysis</h4>
                <Badge variant="secondary" className="text-xs">
                  {bullMarketLoading ? 'Loading...' : bullMarketData?.totalIndicators ? `${bullMarketData.totalIndicators} Indicators` : 'Indicators'}
                </Badge>
              </div>
              {bullMarketLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Indicators:</span>
                    <span className="font-medium text-foreground">
                      {bullMarketData?.totalIndicators || 30} Bull Market Signals
                    </span>
                  </div>
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Comprehensive analysis of {bullMarketData?.totalIndicators || 30}+ technical indicators to identify potential bull market peaks and optimal exit points based on historical patterns.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="text-xs text-center text-muted-foreground pt-2 border-t border-border">
              Powered by CoinGlass • Professional trading indicators
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WebResources;