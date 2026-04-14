import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LiquidityIndicator {
  seriesId: string;
  shortName: string;
  displayValue: string;
  yoyChangePercent: number;
  category: 'core' | 'velocity' | 'policy' | 'fed_holdings';
}

interface DerivedMetric {
  id: string;
  shortName: string;
  displayValue: string;
  isAnomaly: boolean;
  alertType?: 'stack_sats' | 'caution' | 'warning';
  alertMessage?: string;
}

interface LiquidityData {
  indicators: LiquidityIndicator[];
  derivedMetrics: DerivedMetric[];
  summary: {
    totalIndicators: number;
    anomalyCount: number;
    overallSignal: 'bullish' | 'bearish' | 'neutral';
    signalReasons: string[];
    stackSatsAlert: boolean;
    lastUpdated: string;
  };
}

export default function LiquidityWidget() {
  const { data, isLoading } = useQuery<LiquidityData>({
    queryKey: ['/api/liquidity'],
    refetchInterval: 300000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">LIQUIDITY & DEFI</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">LIQUIDITY & DEFI</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Unable to load liquidity data</p>
        </CardContent>
      </Card>
    );
  }

  const formatChange = (change: number): string => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const getChangeColor = (change: number): string => {
    if (change > 3) return 'text-green-500';
    if (change < -3) return 'text-red-500';
    return 'text-yellow-500';
  };

  // Core liquidity indicators to show
  const indicatorArr = Array.isArray(data.indicators)
    ? data.indicators
    : Object.values(data.indicators || {});
  const coreIndicators = indicatorArr
    .filter((i: any) => ['M2', 'M1', 'RRP', 'TGA', 'Fed BS', 'Reserves'].includes(i.shortName))
    .slice(0, 6);

  const dmArr = Array.isArray(data.derivedMetrics) ? data.derivedMetrics : Object.values(data.derivedMetrics || {});
  const netLiq = dmArr.find((d: any) => d.id === 'net_liquidity');
  const stackSatsAlert = data.summary?.stackSatsAlert;

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          LIQUIDITY & DEFI
          {stackSatsAlert && (
            <span className="ml-2 text-xs font-normal text-orange-500 animate-pulse">
              ⚠️ STACK SATS ALERT
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Core Money Supply Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {coreIndicators.map((indicator) => (
            <div 
              key={indicator.seriesId} 
              className={`p-3 rounded-lg border ${
                indicator.yoyChangePercent > 5 ? 'bg-green-500/5 border-green-500/20' :
                indicator.yoyChangePercent < -5 ? 'bg-red-500/5 border-red-500/20' :
                'bg-card border-muted/20'
              }`}
            >
              <div className="text-xs text-muted-foreground mb-1">{indicator.shortName}</div>
              <div className="text-lg font-mono font-bold">{indicator.displayValue}</div>
              <div className={`text-xs font-mono ${getChangeColor(indicator.yoyChangePercent)}`}>
                {formatChange(indicator.yoyChangePercent)} YoY
              </div>
            </div>
          ))}
        </div>

        {/* Net Liquidity / Stack Sats Signal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {netLiq && (
            <div className={`p-3 rounded-lg border ${
              netLiq.isAnomaly ? 'bg-orange-500/10 border-orange-500/20' : 'bg-card border-muted/20'
            }`}>
              <div className="text-xs text-muted-foreground mb-1">Net Liquidity Proxy</div>
              <div className="text-xl font-mono font-bold">
                {netLiq.displayValue}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Fed BS - TGA - RRP
              </div>
              {netLiq.alertMessage && (
                <div className="text-xs text-orange-500 mt-2">{netLiq.alertMessage}</div>
              )}
            </div>
          )}

          {/* Signal Reasons */}
          {data.summary?.signalReasons && data.summary.signalReasons.length > 0 && (
            <div className="p-3 rounded-lg border bg-card border-muted/20">
              <div className="text-xs text-muted-foreground mb-2">Key Drivers</div>
              <div className="space-y-1">
                {data.summary.signalReasons.slice(0, 3).map((reason, i) => (
                  <div key={i} className="text-xs text-muted-foreground">
                    • {reason}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Overall Signal Badge */}
        {data.summary && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Macro Signal:</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                data.summary.overallSignal === 'bullish' ? 'bg-green-500/10 text-green-500' :
                data.summary.overallSignal === 'bearish' ? 'bg-red-500/10 text-red-500' :
                'bg-yellow-500/10 text-yellow-500'
              }`}>
                {data.summary.overallSignal.toUpperCase()}
              </span>
            </div>
            {data.summary.anomalyCount > 0 && (
              <span className="text-xs text-orange-500">
                {data.summary.anomalyCount} anomalies
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
