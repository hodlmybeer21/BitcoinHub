import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface FinancialMarketData {
  dxy: { value: number; change: number };
  gold: { value: number; change: number };
  spx: { value: number; change: number };
  vix: { value: number; change: number };
  lastUpdated: string;
}

interface LiquidityData {
  summary: {
    overallSignal: 'bullish' | 'bearish' | 'neutral';
    signalReasons: string[];
    lastUpdated: string;
  };
  indicators?: Array<{
    shortName: string;
    displayValue: string;
    yoyChangePercent: number;
  }>;
}

export default function MacroIndicators() {
  const { data: marketData, isLoading: loadingMarket } = useQuery<FinancialMarketData>({
    queryKey: ['/api/financial/markets'],
    refetchInterval: 60000,
  });

  const { data: liquidityData, isLoading: loadingLiquidity } = useQuery<LiquidityData>({
    queryKey: ['/api/liquidity'],
    refetchInterval: 120000,
  });

  const isLoading = loadingMarket || loadingLiquidity;

  if (isLoading) {
    return (
      <Card className="bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">MACRO INDICATORS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatChange = (change: number): string => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  const getChangeColor = (change: number): string => {
    if (change > 0) return 'text-[hsl(var(--positive))]';
    if (change < 0) return 'text-[hsl(var(--negative))]';
    return 'text-muted-foreground';
  };

  // Get M2 from liquidity data
  const m2Indicator = liquidityData?.indicators?.find(i => i.shortName === 'M2');
  const netLiqIndicator = liquidityData?.indicators?.find(i => i.shortName === 'Net Liq');

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">MACRO INDICATORS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* DXY */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">DXY Index</span>
          <div className="text-right">
            <span className="font-mono font-medium">
              {marketData ? marketData.dxy.value.toFixed(2) : '—'}
            </span>
            {marketData && (
              <span className={`font-mono text-xs ml-2 ${getChangeColor(marketData.dxy.change)}`}>
                {formatChange(marketData.dxy.change)}
              </span>
            )}
          </div>
        </div>

        {/* Gold */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Gold</span>
          <div className="text-right">
            <span className="font-mono font-medium">
              {marketData ? formatCurrency(marketData.gold.value, 'USD', 0) : '—'}
            </span>
            {marketData && (
              <span className={`font-mono text-xs ml-2 ${getChangeColor(marketData.gold.change)}`}>
                {formatChange(marketData.gold.change)}
              </span>
            )}
          </div>
        </div>

        {/* S&P 500 */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">S&P 500</span>
          <div className="text-right">
            <span className="font-mono font-medium">
              {marketData ? marketData.spx.value.toLocaleString() : '—'}
            </span>
            {marketData && (
              <span className={`font-mono text-xs ml-2 ${getChangeColor(marketData.spx.change)}`}>
                {formatChange(marketData.spx.change)}
              </span>
            )}
          </div>
        </div>

        {/* VIX */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">VIX (Fear)</span>
          <div className="text-right">
            <span className="font-mono font-medium">
              {marketData ? marketData.vix.value.toFixed(2) : '—'}
            </span>
            {marketData && (
              <span className={`font-mono text-xs ml-2 ${marketData.vix.change < 0 ? 'text-[hsl(var(--positive))]' : 'text-[hsl(var(--negative))]'}`}>
                {formatChange(marketData.vix.change)}
              </span>
            )}
          </div>
        </div>

        {/* M2 Money Supply */}
        {m2Indicator && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">M2 Money</span>
            <div className="text-right">
              <span className="font-mono font-medium">{m2Indicator.displayValue}</span>
              <span className={`font-mono text-xs ml-2 ${getChangeColor(m2Indicator.yoyChangePercent)}`}>
                {formatChange(m2Indicator.yoyChangePercent)}
              </span>
            </div>
          </div>
        )}

        {/* Net Liquidity */}
        {netLiqIndicator && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Net Liquidity</span>
            <span className="font-mono font-medium">{netLiqIndicator.displayValue}</span>
          </div>
        )}

        {/* Overall Signal */}
        {liquidityData?.summary && (
          <div className="pt-2 border-t mt-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Macro Signal</span>
              <span className={`font-mono text-xs font-medium px-2 py-0.5 rounded ${
                liquidityData.summary.overallSignal === 'bullish' ? 'bg-green-500/10 text-green-500' :
                liquidityData.summary.overallSignal === 'bearish' ? 'bg-red-500/10 text-red-500' :
                'bg-yellow-500/10 text-yellow-500'
              }`}>
                {liquidityData.summary.overallSignal.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
