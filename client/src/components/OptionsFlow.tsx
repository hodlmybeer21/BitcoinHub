import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface OptionContract {
  instrumentName: string;
  strike: number;
  expiry: string;
  type: 'call' | 'put';
  openInterest: number;
  volume24h: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  impliedVolatility: number;
  markPrice: number;
}

interface OptionsFlowResponse {
  putCallRatio: number;
  totalCallOI: number;
  totalPutOI: number;
  totalCallVolume: number;
  totalPutVolume: number;
  netDelta: number;
  avgImpliedVolatility: number;
  topContracts: OptionContract[];
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
  flowAnalysis: string[];
  timestamp: string;
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const variants: Record<string, { icon: any; label: string; className: string }> = {
    bullish: { icon: TrendingUp, label: 'Bullish', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
    bearish: { icon: TrendingDown, label: 'Bearish', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
    neutral: { icon: Activity, label: 'Neutral', className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
    unavailable: { icon: Activity, label: 'No data', className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
  };
  const variant = variants[sentiment] ?? variants.neutral;
  const Icon = variant.icon;

  return (
    <Badge variant="outline" className={variant.className}>
      <Icon className="w-3 h-3 mr-1" />
      {variant.label}
    </Badge>
  );
}

export default function OptionsFlow() {
  const { data, isLoading, error } = useQuery<OptionsFlowResponse>({
    queryKey: ['/api/options-flow'],
    refetchInterval: 5 * 60 * 1000 // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <Card data-testid="card-options-flow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Bitcoin Options Flow Analysis
          </CardTitle>
          <CardDescription>Real-time options market sentiment from Deribit</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card data-testid="card-options-flow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Bitcoin Options Flow Analysis
          </CardTitle>
          <CardDescription>Real-time options market sentiment from Deribit</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-8">
            Unable to load options data. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  const putCallPercentage = (data.putCallRatio / 2) * 100; // Normalize for progress bar

  return (
    <Card data-testid="card-options-flow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📊 Bitcoin Options Flow Analysis
        </CardTitle>
        <CardDescription>
          Real-time options market sentiment from Deribit • Updates every 5 minutes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Market Sentiment */}
        <div className="flex items-center justify-between p-4 bg-accent/30 rounded-lg">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Market Sentiment</div>
            <div className="text-xl font-bold" data-testid="text-options-sentiment">
              <SentimentBadge sentiment={data.marketSentiment} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground mb-1">Put/Call Ratio</div>
            <div className="text-2xl font-bold text-orange-500" data-testid="text-put-call-ratio">
              {data.putCallRatio.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Put-Call Ratio Visualization */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Open Interest Distribution</span>
            <span className="text-xs text-muted-foreground">
              {data.putCallRatio < 0.7 ? 'Call Heavy' : data.putCallRatio > 1.3 ? 'Put Heavy' : 'Balanced'}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-green-500 w-12">Calls</span>
              <div className="flex-1">
                <Progress 
                  value={(data.totalCallOI / (data.totalCallOI + data.totalPutOI)) * 100} 
                  className="h-3"
                  data-testid="progress-call-oi"
                />
              </div>
              <span className="text-xs font-mono w-20 text-right" data-testid="text-call-oi">
                {data.totalCallOI.toLocaleString()} BTC
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-red-500 w-12">Puts</span>
              <div className="flex-1">
                <Progress 
                  value={(data.totalPutOI / (data.totalCallOI + data.totalPutOI)) * 100} 
                  className="h-3"
                  data-testid="progress-put-oi"
                />
              </div>
              <span className="text-xs font-mono w-20 text-right" data-testid="text-put-oi">
                {data.totalPutOI.toLocaleString()} BTC
              </span>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
            <div className="text-xs text-muted-foreground mb-1">Net Delta</div>
            <div className="text-lg font-bold" data-testid="text-net-delta">
              {data.netDelta > 0 ? '+' : ''}{data.netDelta.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {data.netDelta > 0 ? 'Bullish exposure' : 'Bearish exposure'}
            </div>
          </div>
          <div className="p-3 bg-purple-500/5 rounded-lg border border-purple-500/10">
            <div className="text-xs text-muted-foreground mb-1">Avg Implied Vol</div>
            <div className="text-lg font-bold" data-testid="text-avg-iv">
              {data.avgImpliedVolatility.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              {data.avgImpliedVolatility > 80 ? 'High volatility' : data.avgImpliedVolatility < 50 ? 'Low volatility' : 'Normal'}
            </div>
          </div>
        </div>

        {/* Flow Analysis Insights */}
        <div>
          <div className="text-sm font-medium mb-3">Flow Analysis Insights</div>
          <div className="space-y-2">
            {data.flowAnalysis.map((insight, index) => (
              <div
                key={index}
                data-testid={`insight-${index}`}
                className="text-sm p-3 bg-muted/50 rounded-lg border"
              >
                {insight}
              </div>
            ))}
          </div>
        </div>

        {/* Top Active Contracts */}
        {data.topContracts.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-3">Top Active Contracts (24h Volume)</div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {data.topContracts.slice(0, 5).map((contract, index) => (
                <div
                  key={contract.instrumentName}
                  data-testid={`contract-${index}`}
                  className="flex items-center justify-between p-2 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs font-mono" data-testid={`contract-name-${index}`}>
                        {contract.instrumentName}
                      </code>
                      <Badge 
                        variant="outline" 
                        className={contract.type === 'call' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}
                      >
                        {contract.type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Vol: {contract.volume24h.toFixed(2)}</span>
                      <span>OI: {contract.openInterest.toFixed(2)}</span>
                      <span>IV: {contract.impliedVolatility.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-center text-muted-foreground">
          Data from Deribit • Largest crypto options exchange
        </div>
      </CardContent>
    </Card>
  );
}
