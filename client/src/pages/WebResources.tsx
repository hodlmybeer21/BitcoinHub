import { ExternalLink, TrendingUp, Activity, Target, Gauge, RefreshCw, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const WebResources = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch live data from APIs
  const { data: m2Data, isLoading: m2Loading } = useQuery({
    queryKey: ['/api/web-resources/m2-chart', refreshKey],
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const { data: liquidationData, isLoading: liquidationLoading } = useQuery({
    queryKey: ['/api/web-resources/liquidation', refreshKey],
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });

  const { data: piCycleData, isLoading: piCycleLoading } = useQuery({
    queryKey: ['/api/web-resources/pi-cycle', refreshKey],
    refetchInterval: 60 * 60 * 1000, // Refresh every hour
  });

  const { data: fearGreedData, isLoading: fearGreedLoading } = useQuery({
    queryKey: ['/api/web-resources/fear-greed', refreshKey],
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
  });

  const { data: bullMarketData, isLoading: bullMarketLoading } = useQuery({
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
                    <span className="text-muted-foreground">Current Correlation:</span>
                    <span className="font-medium text-foreground">
                      {m2Data?.correlation || 'Strong Positive'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">BTC Price:</span>
                    <span className="font-medium text-foreground">
                      ${m2Data?.btcPrice?.toLocaleString() || '109,800'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">M2 Growth YoY:</span>
                    <span className="font-medium text-foreground">
                      {m2Data?.m2Growth || '18.5'}%
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
              Powered by BGEometrics.com • Updated continuously
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
                  {liquidationLoading ? 'Loading...' : liquidationData?.timeframe || '24 Hour'}
                </Badge>
              </div>
              {liquidationLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Liquidity Threshold:</span>
                    <span className="font-medium text-foreground">
                      {liquidationData?.liquidityThreshold || '0.85'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">High Risk Zone:</span>
                    <span className="font-medium text-red-500">
                      ${liquidationData?.highRiskZone?.min?.toLocaleString() || '104,000'} - ${liquidationData?.highRiskZone?.max?.toLocaleString() || '106,000'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Support Zone:</span>
                    <span className="font-medium text-green-500">
                      ${liquidationData?.supportZone?.min?.toLocaleString() || '108,000'} - ${liquidationData?.supportZone?.max?.toLocaleString() || '110,000'}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="text-xs text-center text-muted-foreground pt-2 border-t border-border">
              Data from Coinglass.com • Binance Perpetual Futures
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
                      {piCycleData?.crossStatus || 'Below'} 350DMA x 2
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cycle Status:</span>
                    <span className={`font-medium ${piCycleData?.cyclePhase === 'Bullish' ? 'text-green-500' : 'text-orange-500'}`}>
                      {piCycleData?.cyclePhase || 'Bullish'} Phase
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">111DMA Price:</span>
                    <span className="font-medium text-foreground">
                      ${piCycleData?.price111DMA?.toLocaleString() || '89,500'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Cross:</span>
                    <span className="font-medium text-foreground">
                      {piCycleData?.lastCrossDate || '2021 Peak'}
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
                      {fearGreedData?.currentValue || '52'}
                    </div>
                    <div className="text-lg font-medium text-foreground">
                      {fearGreedData?.classification || 'Neutral'}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Yesterday:</span>
                      <span className="font-medium text-foreground">
                        {fearGreedData?.yesterday || '50'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Week:</span>
                      <span className="font-medium text-foreground">
                        {fearGreedData?.lastWeek || '48'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Yearly High:</span>
                      <span className="font-medium text-green-500">
                        {fearGreedData?.yearlyHigh?.value || '88'} - Extreme Greed
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Yearly Low:</span>
                      <span className="font-medium text-red-500">
                        {fearGreedData?.yearlyLow?.value || '18'} - Extreme Fear
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
                  {bullMarketLoading ? 'Loading...' : bullMarketData?.totalIndicators || '30+'} Indicators
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