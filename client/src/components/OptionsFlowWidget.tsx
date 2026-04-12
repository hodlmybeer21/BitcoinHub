import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface OptionContract {
  instrumentName: string;
  strike: number;
  expiry: string;
  type: 'call' | 'put';
  openInterest: number;
  volume24h: number;
  delta: number;
  impliedVolatility: number;
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

export default function OptionsFlowWidget() {
  const { data, isLoading } = useQuery<OptionsFlowResponse>({
    queryKey: ['/api/options-flow'],
    refetchInterval: 300000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">OPTIONS FLOW</CardTitle>
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
          <CardTitle className="text-sm font-semibold text-muted-foreground">OPTIONS FLOW</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Unable to load options data</p>
        </CardContent>
      </Card>
    );
  }

  const formatOI = (oi: number): string => {
    if (oi >= 1000) return `${(oi / 1000).toFixed(1)}K`;
    return oi.toFixed(0);
  };

  const sentimentColor = {
    bullish: 'text-green-500 bg-green-500/10',
    bearish: 'text-red-500 bg-red-500/10',
    neutral: 'text-yellow-500 bg-yellow-500/10',
  };

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          OPTIONS FLOW (DERIBIT)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {/* Put/Call Ratio */}
          <div className="p-3 bg-card rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">Put/Call Ratio</div>
            <div className={`text-xl font-mono font-bold ${
              data.putCallRatio > 1.2 ? 'text-red-500' : 
              data.putCallRatio < 0.8 ? 'text-green-500' : 'text-yellow-500'
            }`}>
              {data.putCallRatio.toFixed(2)}
            </div>
          </div>

          {/* Total OI */}
          <div className="p-3 bg-card rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">Total Open Interest</div>
            <div className="text-xl font-mono font-bold">
              {formatOI(data.totalCallOI + data.totalPutOI)} BTC
            </div>
          </div>

          {/* IV */}
          <div className="p-3 bg-card rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">Avg Implied Vol</div>
            <div className="text-xl font-mono font-bold">
              {data.avgImpliedVolatility.toFixed(1)}%
            </div>
          </div>

          {/* Sentiment */}
          <div className="p-3 bg-card rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">Sentiment</div>
            <div className={`inline-flex px-2 py-1 rounded text-sm font-bold ${
              sentimentColor[data.marketSentiment]
            }`}>
              {data.marketSentiment.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Call/Put breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/20">
            <div className="text-xs text-muted-foreground mb-1">Call OI / Volume</div>
            <div className="flex justify-between">
              <span className="text-sm font-mono text-green-500">OI: {formatOI(data.totalCallOI)}</span>
              <span className="text-sm font-mono text-green-500">Vol: {formatOI(data.totalCallVolume)}</span>
            </div>
          </div>
          <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/20">
            <div className="text-xs text-muted-foreground mb-1">Put OI / Volume</div>
            <div className="flex justify-between">
              <span className="text-sm font-mono text-red-500">OI: {formatOI(data.totalPutOI)}</span>
              <span className="text-sm font-mono text-red-500">Vol: {formatOI(data.totalPutVolume)}</span>
            </div>
          </div>
        </div>

        {/* Top Contracts */}
        {data.topContracts.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-semibold">TOP CONTRACTS BY VOLUME</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="text-left py-1 pr-4">Strike</th>
                    <th className="text-left py-1 pr-4">Type</th>
                    <th className="text-right py-1 pr-4">OI</th>
                    <th className="text-right py-1 pr-4">Volume</th>
                    <th className="text-right py-1">IV</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topContracts.slice(0, 5).map((c, i) => (
                    <tr key={c.instrumentName + i} className="border-b border-muted/10">
                      <td className="py-1 pr-4 font-mono">{c.strike.toLocaleString()}</td>
                      <td className={`py-1 pr-4 font-mono ${c.type === 'call' ? 'text-green-500' : 'text-red-500'}`}>
                        {c.type.toUpperCase()}
                      </td>
                      <td className="py-1 pr-4 font-mono text-right">{formatOI(c.openInterest)}</td>
                      <td className="py-1 pr-4 font-mono text-right">{formatOI(c.volume24h)}</td>
                      <td className="py-1 font-mono text-right">{c.impliedVolatility.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analysis */}
        {data.flowAnalysis.length > 0 && (
          <div className="mt-4 pt-4 border-t space-y-1">
            {data.flowAnalysis.slice(0, 2).map((analysis, i) => (
              <p key={i} className="text-xs text-muted-foreground">{analysis}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
