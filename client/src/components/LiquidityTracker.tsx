import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, AlertTriangle, Activity, DollarSign, Building2, Wallet, Info, RefreshCw, Gauge, Percent, PiggyBank, Calculator, Bitcoin, Zap } from 'lucide-react';

interface LiquidityIndicator {
  seriesId: string;
  name: string;
  shortName: string;
  value: number;
  displayValue: string;
  previousValue: number;
  yoyChange: number;
  yoyChangePercent: number;
  momChange?: number;
  momChangePercent?: number;
  date: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';
  unit: string;
  rawUnit: 'billions' | 'millions' | 'percent' | 'index';
  description: string;
  isAnomaly: boolean;
  anomalyThreshold: number;
  category: 'core' | 'velocity' | 'policy' | 'fed_holdings';
  historicalPeak?: {
    value: number;
    displayValue: string;
    date: string;
    percentFromPeak: number;
  };
}

interface DerivedMetric {
  id: string;
  name: string;
  shortName: string;
  value: number;
  displayValue: string;
  description: string;
  isAnomaly: boolean;
  anomalyThreshold: number;
  formula: string;
  alertType?: 'stack_sats' | 'caution' | 'warning';
  alertMessage?: string;
}

interface BitcoinOverlay {
  btcPrice: number;
  btcPriceFormatted: string;
  btc24hChange: number;
  m2BtcRatio: number;
  m2BtcRatioFormatted: string;
  m2BtcHistoricalAvg: number;
  isDebasementSignal: boolean;
  debasementMessage: string;
}

interface LiquidityData {
  indicators: LiquidityIndicator[];
  derivedMetrics: DerivedMetric[];
  bitcoinOverlay: BitcoinOverlay | null;
  anomalies: LiquidityIndicator[];
  summary: {
    totalIndicators: number;
    anomalyCount: number;
    overallSignal: 'bullish' | 'bearish' | 'neutral';
    signalReasons: string[];
    stackSatsAlert: boolean;
    lastUpdated: string;
  };
}

function getIndicatorIcon(shortName: string, category: string) {
  switch (category) {
    case 'velocity':
      return <Gauge className="w-4 h-4" />;
    case 'policy':
      return <Percent className="w-4 h-4" />;
    case 'fed_holdings':
      return <PiggyBank className="w-4 h-4" />;
  }
  
  switch (shortName) {
    case 'M2':
    case 'M1':
    case 'M0':
    case 'Currency':
      return <DollarSign className="w-4 h-4" />;
    case 'Fed BS':
      return <Building2 className="w-4 h-4" />;
    case 'TGA':
    case 'Reserves':
      return <Wallet className="w-4 h-4" />;
    case 'RRP':
      return <RefreshCw className="w-4 h-4" />;
    default:
      return <Activity className="w-4 h-4" />;
  }
}

function getCategoryLabel(category: string): string {
  switch (category) {
    case 'core': return 'Core Liquidity';
    case 'velocity': return 'Money Velocity';
    case 'policy': return 'Policy Rates';
    case 'fed_holdings': return 'Fed Holdings';
    default: return category;
  }
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'core': return 'text-blue-500';
    case 'velocity': return 'text-purple-500';
    case 'policy': return 'text-amber-500';
    case 'fed_holdings': return 'text-emerald-500';
    default: return 'text-gray-500';
  }
}

function IndicatorCard({ indicator }: { indicator: LiquidityIndicator }) {
  const isPositive = indicator.yoyChangePercent >= 0;
  const isAnomaly = indicator.isAnomaly;
  
  return (
    <div 
      className={`p-3 sm:p-4 rounded-lg border transition-all ${
        isAnomaly 
          ? 'border-orange-500/50 bg-orange-500/5' 
          : 'border-border/50 bg-card/50 hover:bg-card/80'
      }`}
      data-testid={`liquidity-indicator-${indicator.seriesId}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${isAnomaly ? 'bg-orange-500/20' : 'bg-muted'}`}>
            {getIndicatorIcon(indicator.shortName, indicator.category)}
          </div>
          <div>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <span className="font-semibold text-xs sm:text-sm" data-testid={`indicator-name-${indicator.seriesId}`}>
                {indicator.shortName}
              </span>
              {isAnomaly && (
                <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[10px] sm:text-xs px-1 sm:px-2">
                  <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                  <span className="hidden sm:inline">Anomaly</span>
                  <span className="sm:hidden">!</span>
                </Badge>
              )}
            </div>
            <span className="text-[10px] sm:text-xs text-muted-foreground">{indicator.frequency}</span>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger>
            <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground hover:text-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs p-3">
            <p className="font-semibold mb-1">{indicator.name}</p>
            <p className="text-xs text-muted-foreground mb-2">{indicator.description}</p>
            {indicator.historicalPeak && (
              <div className="text-xs border-t border-border/50 pt-2 mt-2">
                <p className="font-medium text-amber-400">Historical Peak</p>
                <p className="text-muted-foreground">
                  {indicator.historicalPeak.displayValue} on {new Date(indicator.historicalPeak.date).toLocaleDateString()}
                </p>
                <p className={indicator.historicalPeak.percentFromPeak >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {indicator.historicalPeak.percentFromPeak >= 0 ? '+' : ''}{indicator.historicalPeak.percentFromPeak.toFixed(1)}% from peak
                </p>
              </div>
            )}
            {indicator.momChangePercent !== undefined && (
              <div className="text-xs border-t border-border/50 pt-2 mt-2">
                <p className="font-medium text-blue-400">Month-over-Month</p>
                <p className={indicator.momChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {indicator.momChangePercent >= 0 ? '+' : ''}{indicator.momChangePercent.toFixed(2)}% MoM
                </p>
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
      
      <div className="space-y-1">
        <div className="text-lg sm:text-xl font-bold font-mono" data-testid={`indicator-value-${indicator.seriesId}`}>
          {indicator.displayValue}
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <div className={`flex items-center gap-0.5 sm:gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span className="text-xs sm:text-sm font-medium" data-testid={`indicator-yoy-${indicator.seriesId}`}>
              {isPositive ? '+' : ''}{indicator.yoyChangePercent.toFixed(1)}%
            </span>
          </div>
          <span className="text-[10px] sm:text-xs text-muted-foreground">YoY</span>
          {indicator.momChangePercent !== undefined && (
            <>
              <span className="text-muted-foreground hidden sm:inline">|</span>
              <span className={`text-[10px] sm:text-xs hidden sm:inline ${indicator.momChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {indicator.momChangePercent >= 0 ? '+' : ''}{indicator.momChangePercent.toFixed(1)}% MoM
              </span>
            </>
          )}
        </div>
        
        <div className="text-[10px] sm:text-xs text-muted-foreground">
          {new Date(indicator.date).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}

function DerivedMetricCard({ metric }: { metric: DerivedMetric }) {
  const isStackSats = metric.alertType === 'stack_sats';
  
  return (
    <div 
      className={`p-3 sm:p-4 rounded-lg border transition-all ${
        isStackSats
          ? 'border-orange-500 bg-orange-500/10 animate-pulse'
          : metric.isAnomaly 
            ? 'border-orange-500/50 bg-orange-500/5' 
            : 'border-border/50 bg-card/50 hover:bg-card/80'
      }`}
      data-testid={`derived-metric-${metric.id}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${isStackSats ? 'bg-orange-500/30' : metric.isAnomaly ? 'bg-orange-500/20' : 'bg-cyan-500/20'}`}>
            {isStackSats ? <Bitcoin className="w-4 h-4 text-orange-500" /> : <Calculator className="w-4 h-4 text-cyan-500" />}
          </div>
          <div>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <span className="font-semibold text-xs sm:text-sm">{metric.shortName}</span>
              {isStackSats && (
                <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/40 text-[10px] sm:text-xs animate-bounce">
                  <Bitcoin className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                  Stack Sats!
                </Badge>
              )}
              {metric.isAnomaly && !isStackSats && (
                <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[10px] sm:text-xs">
                  <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                  Alert
                </Badge>
              )}
            </div>
            <span className="text-[10px] sm:text-xs text-muted-foreground">Derived</span>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger>
            <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground hover:text-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <p className="font-semibold mb-1">{metric.name}</p>
            <p className="text-xs text-muted-foreground mb-2">{metric.description}</p>
            <p className="text-xs font-mono text-cyan-400">Formula: {metric.formula}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      <div className="space-y-1">
        <div className={`text-lg sm:text-xl font-bold font-mono ${isStackSats ? 'text-orange-400' : 'text-cyan-400'}`}>
          {metric.displayValue}
        </div>
        {metric.alertMessage && (
          <div className="text-[10px] sm:text-xs text-orange-400 font-medium">
            {metric.alertMessage}
          </div>
        )}
        {!metric.alertMessage && (
          <div className="text-[10px] sm:text-xs text-muted-foreground">
            Threshold: {metric.anomalyThreshold > 100 ? `<$${(metric.anomalyThreshold / 1000).toFixed(1)}T` : 
                       metric.anomalyThreshold > 10 ? `>${metric.anomalyThreshold}` : 
                       `>${metric.anomalyThreshold}x`}
          </div>
        )}
      </div>
    </div>
  );
}

function BitcoinOverlayCard({ overlay }: { overlay: BitcoinOverlay }) {
  return (
    <div className={`p-4 rounded-lg border transition-all ${
      overlay.isDebasementSignal 
        ? 'border-orange-500/50 bg-gradient-to-r from-orange-500/10 to-yellow-500/10' 
        : 'border-border/50 bg-card/50'
    }`} data-testid="bitcoin-overlay">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${overlay.isDebasementSignal ? 'bg-orange-500/20' : 'bg-amber-500/20'}`}>
          <Bitcoin className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Bitcoin Debasement Overlay</h3>
          <p className="text-xs text-muted-foreground">M2 vs BTC price analysis</p>
        </div>
        {overlay.isDebasementSignal && (
          <Badge variant="outline" className="ml-auto bg-orange-500/10 text-orange-400 border-orange-500/30">
            <Zap className="w-3 h-3 mr-1" />
            Signal Active
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <div className="text-xs text-muted-foreground mb-1">BTC Price</div>
          <div className="text-lg font-bold font-mono text-orange-400">{overlay.btcPriceFormatted}</div>
          <div className={`text-xs ${overlay.btc24hChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {overlay.btc24hChange >= 0 ? '+' : ''}{overlay.btc24hChange.toFixed(2)}% 24h
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">M2/BTC Ratio</div>
          <div className="text-lg font-bold font-mono text-blue-400">{overlay.m2BtcRatioFormatted}</div>
          <div className="text-xs text-muted-foreground">USD per BTC in M2</div>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <div className="text-xs text-muted-foreground mb-1">Debasement Signal</div>
          <div className={`text-sm font-medium ${overlay.isDebasementSignal ? 'text-orange-400' : 'text-green-400'}`}>
            {overlay.isDebasementSignal ? 'ACCUMULATE' : 'NEUTRAL'}
          </div>
        </div>
      </div>
      
      <div className={`text-xs p-2 rounded ${overlay.isDebasementSignal ? 'bg-orange-500/10 text-orange-300' : 'bg-muted text-muted-foreground'}`}>
        {overlay.debasementMessage}
      </div>
    </div>
  );
}

function SignalBadge({ signal }: { signal: string }) {
  const config: Record<string, { label: string; className: string }> = {
    bullish: { label: 'Bullish', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
    bearish: { label: 'Bearish', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
    neutral: { label: 'Neutral', className: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
    expansionary: { label: 'Expansionary', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
    contractionary: { label: 'Contractionary', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
    unavailable: { label: 'Data Unavailable', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  };
  const entry = config[signal] ?? config.neutral;

  return (
    <Badge variant="outline" className={entry.className} data-testid="signal-badge">
      {entry.label}
    </Badge>
  );
}

function CategorySection({ category, indicators }: { category: string; indicators: LiquidityIndicator[] }) {
  if (indicators.length === 0) return null;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`text-xs sm:text-sm font-semibold ${getCategoryColor(category)}`}>
          {getCategoryLabel(category)}
        </span>
        <div className="flex-1 h-px bg-border/50" />
        <span className="text-[10px] sm:text-xs text-muted-foreground">{indicators.length}</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {indicators.map((indicator) => (
          <IndicatorCard key={indicator.seriesId} indicator={indicator} />
        ))}
      </div>
    </div>
  );
}

function StackSatsAlert() {
  return (
    <div className="p-4 rounded-lg bg-gradient-to-r from-orange-500/20 via-yellow-500/20 to-orange-500/20 border border-orange-500/50 animate-pulse" data-testid="stack-sats-alert">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-500/30 rounded-lg">
          <Bitcoin className="w-6 h-6 text-orange-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-orange-400 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Stack Sats Alert!
          </h3>
          <p className="text-sm text-orange-300/80">
            Net Liquidity below $3T threshold. Historically favorable BTC accumulation zone.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LiquidityTracker() {
  // The /api/liquidity endpoint returns a sparse payload:
  //   indicators: Record<string, { value, label, unit, change }>
  //   derivedMetrics: { moneySupplyGrowth, liquidityConditions, rrpNote }
  //   bitcoinOverlay: { m2ToBtcRatio }
  //   anomalies: []
  // The component below was written for a richer FRED-style payload
  // (full LiquidityIndicator objects with historicalPeak, momChangePercent,
  // bitcoinOverlay.btc24hChange, etc.). The select() below adapts the real
  // API response to that expected shape so the rendering code stays as-is
  // and doesn't throw "Cannot read properties of undefined (reading 'toFixed')".
  const { data, isLoading, error } = useQuery<any, Error, LiquidityData>({
    queryKey: ['/api/liquidity'],
    refetchInterval: 10 * 60 * 1000,
    select: (raw: any): LiquidityData => {
      const now = new Date().toISOString();
      const rawIndicators = (raw?.indicators && typeof raw.indicators === 'object' && !Array.isArray(raw.indicators))
        ? raw.indicators
        : {};
      const indicators: LiquidityIndicator[] = Object.entries(rawIndicators).map(([key, v]: [string, any]) => {
        const value = Number(v?.value ?? 0);
        const change = Number(v?.change ?? 0);
        const isCore = key === 'm2' || key === 'fedBalance';
        const category = isCore ? 'core' : (key === 'rrp' ? 'policy' : 'velocity');
        return {
          seriesId: key,
          name: v?.label || key.toUpperCase(),
          shortName: key.toUpperCase(),
          value,
          displayValue: String(value),
          previousValue: value,
          yoyChange: change,
          yoyChangePercent: change,
          date: raw?.lastUpdated || now,
          frequency: 'Daily',
          unit: v?.unit || '',
          rawUnit: 'billions',
          description: v?.label || key,
          isAnomaly: false,
          anomalyThreshold: 0,
          category: category as LiquidityIndicator['category'],
        };
      });
      const derivedMetrics: DerivedMetric[] = (() => {
        const list: DerivedMetric[] = [];
        if (raw?.derivedMetrics?.moneySupplyGrowth != null) {
          list.push({
            id: 'm2Growth',
            name: 'M2 Money Supply Growth',
            shortName: 'M2 Growth',
            value: Number(raw.derivedMetrics.moneySupplyGrowth),
            displayValue: `${Number(raw.derivedMetrics.moneySupplyGrowth).toFixed(2)}%`,
            description: 'Year-over-year change in M2 money supply.',
            isAnomaly: false,
            anomalyThreshold: 2,
            formula: 'M2 YoY %',
          });
        }
        return list;
      })();
      const overlay: BitcoinOverlay | null = (() => {
        if (raw?.bitcoinOverlay?.m2ToBtcRatio == null) return null;
        const ratio = Number(raw.bitcoinOverlay.m2ToBtcRatio);
        return {
          btcPrice: 0,
          btcPriceFormatted: '—',
          btc24hChange: 0,
          m2BtcRatio: ratio,
          m2BtcRatioFormatted: ratio.toExponential(2),
          m2BtcHistoricalAvg: ratio,
          isDebasementSignal: false,
          debasementMessage: '',
        };
      })();
      const anomalies: LiquidityIndicator[] = Array.isArray(raw?.anomalies) ? raw.anomalies : [];
      return {
        indicators,
        derivedMetrics,
        bitcoinOverlay: overlay,
        anomalies,
        summary: {
          totalIndicators: indicators.length,
          anomalyCount: anomalies.length,
          overallSignal: (raw?.summary?.overallSignal || 'neutral') as 'bullish' | 'bearish' | 'neutral',
          signalReasons: [],
          stackSatsAlert: false,
          lastUpdated: raw?.lastUpdated || now,
        },
      };
    },
  });

  if (isLoading) {
    return (
      <Card data-testid="card-liquidity-tracker">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            FRED Liquidity Tracker
          </CardTitle>
          <CardDescription>Money supply, velocity, and Fed balance sheet indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="p-4 border rounded-lg">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card data-testid="card-liquidity-tracker">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            FRED Liquidity Tracker
          </CardTitle>
          <CardDescription>Money supply, velocity, and Fed balance sheet indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-8">
            Unable to load liquidity data. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  const indicatorsArray: any[] = Array.isArray(data.indicators)
    ? data.indicators
    : Object.values(data.indicators ?? {});

  const coreIndicators = indicatorsArray.filter(i => i.category === 'core');
  const velocityIndicators = indicatorsArray.filter(i => i.category === 'velocity');
  const policyIndicators = indicatorsArray.filter(i => i.category === 'policy');
  const fedHoldingsIndicators = indicatorsArray.filter(i => i.category === 'fed_holdings');

  return (
    <Card data-testid="card-liquidity-tracker">
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              FRED Liquidity Tracker
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Real-time money supply, velocity, and Fed balance sheet with BTC overlay
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SignalBadge signal={data.summary.overallSignal} />
            {data.summary.anomalyCount > 0 && (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {data.summary.anomalyCount}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {data.summary.stackSatsAlert && <StackSatsAlert />}
        
        {data.bitcoinOverlay && (
          <BitcoinOverlayCard overlay={data.bitcoinOverlay} />
        )}

        {data.summary.signalReasons && data.summary.signalReasons.length > 0 && (
          <div className={`p-3 sm:p-4 rounded-lg border ${
            data.summary.overallSignal === 'bullish' ? 'bg-green-500/5 border-green-500/20' :
            data.summary.overallSignal === 'bearish' ? 'bg-red-500/5 border-red-500/20' :
            'bg-muted/50 border-border/50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {data.summary.overallSignal === 'bullish' ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : data.summary.overallSignal === 'bearish' ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : (
                <Activity className="w-4 h-4 text-gray-400" />
              )}
              <span className={`font-semibold text-xs sm:text-sm ${
                data.summary.overallSignal === 'bullish' ? 'text-green-500' :
                data.summary.overallSignal === 'bearish' ? 'text-red-500' :
                'text-gray-400'
              }`}>
                Signal Analysis
              </span>
            </div>
            <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
              {data.summary.signalReasons.map((reason, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-current flex-shrink-0" />
                  <span className="break-words">{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.anomalies.length > 0 && (
          <div className="p-3 sm:p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="font-semibold text-xs sm:text-sm text-orange-500">Anomaly Detection</span>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
              {data.anomalies.map((anomaly) => (
                <div key={anomaly.seriesId} className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{anomaly.name}:</span>
                  <span className={anomaly.yoyChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {anomaly.yoyChangePercent >= 0 ? '+' : ''}{anomaly.yoyChangePercent.toFixed(1)}% YoY
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                    (±{anomaly.anomalyThreshold}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <CategorySection category="core" indicators={coreIndicators} />
        
        {velocityIndicators.length > 0 && (
          <CategorySection category="velocity" indicators={velocityIndicators} />
        )}
        
        {policyIndicators.length > 0 && (
          <CategorySection category="policy" indicators={policyIndicators} />
        )}
        
        {fedHoldingsIndicators.length > 0 && (
          <CategorySection category="fed_holdings" indicators={fedHoldingsIndicators} />
        )}

        {data.derivedMetrics && data.derivedMetrics.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-cyan-500">Derived Metrics</span>
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">{data.derivedMetrics.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {data.derivedMetrics.map((metric) => (
                <DerivedMetricCard key={metric.id} metric={metric} />
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[10px] sm:text-xs text-muted-foreground pt-4 border-t border-border/50 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <span>Source: FRED</span>
            <span className="hidden sm:inline">•</span>
            <span>Updates: 10 min</span>
          </div>
          <span>
            {new Date(data.summary.lastUpdated).toLocaleTimeString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
