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
  // Actual /api/options-flow shape (Deribit proxy): nested per-asset + topStrikes list.
  // (The old flat shape {putCallRatio, totalCallOI, ...} never matched the API —
  // reading those top-level fields threw 'Cannot read properties of undefined'
  // and unmounted the whole Trading Cockpit.)
  btc?: {
    putCallRatio?: number;
    totalOI?: number;
    totalVolume?: number;
    putCallVolumeRatio?: number;
    netDelta?: number;
    sentiment?: 'bullish' | 'bearish' | 'neutral';
  };
  eth?: {
    putCallRatio?: number;
    totalOI?: number;
    totalVolume?: number;
    sentiment?: 'bullish' | 'bearish' | 'neutral';
  };
  topStrikes?: Array<{
    symbol?: string;
    strike?: number;
    type?: 'call' | 'put';
    openInterest?: number;
    volume?: number;
    iv?: number;
    markPrice?: number;
  }>;
  lastUpdated?: string;
  source?: string;
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

  // Derive values from actual API shape (data.btc / data.eth / data.topStrikes).
  const btcPcr = data.btc?.putCallRatio;
  const btcOI = data.btc?.totalOI;
  const btcVol = data.btc?.totalVolume;
  const sentiment = data.btc?.sentiment ?? 'neutral';
  const strikes = Array.isArray(data.topStrikes) ? data.topStrikes : [];
  // Approximate avg IV from topStrikes (API doesn't expose a single avg field).
  const avgIv = strikes.length
    ? strikes.reduce((s, c) => s + (c.iv ?? 0), 0) / strikes.length
    : null;

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          OPTIONS FLOW (DERIBIT)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {/* Put/Call Ratio (BTC) */}
          <div className="p-3 bg-card rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">Put/Call Ratio (BTC)</div>
            <div className={`text-xl font-mono font-bold ${
              btcPcr === undefined ? 'text-muted-foreground' :
              btcPcr > 1.2 ? 'text-red-500' :
              btcPcr < 0.8 ? 'text-green-500' : 'text-yellow-500'
            }`}>
              {btcPcr !== undefined ? btcPcr.toFixed(2) : '—'}
            </div>
          </div>

          {/* Total OI (BTC) */}
          <div className="p-3 bg-card rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">Total Open Interest</div>
            <div className="text-xl font-mono font-bold">
              {btcOI !== undefined ? `${formatOI(btcOI)} BTC` : '—'}
            </div>
          </div>

          {/* Avg IV (from topStrikes) */}
          <div className="p-3 bg-card rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">Avg Implied Vol</div>
            <div className="text-xl font-mono font-bold">
              {avgIv !== null ? `${(avgIv * 100).toFixed(1)}%` : '—'}
            </div>
          </div>

          {/* Sentiment */}
          <div className="p-3 bg-card rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">Sentiment</div>
            <div className={`inline-flex px-2 py-1 rounded text-sm font-bold ${
              sentimentColor[sentiment] ?? sentimentColor.neutral
            }`}>
              {sentiment.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Volume summary (BTC only — API doesn't split calls vs puts in this proxy) */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/20">
            <div className="text-xs text-muted-foreground mb-1">BTC 24h Volume</div>
            <div className="text-sm font-mono text-green-500">
              {btcVol !== undefined ? formatOI(btcVol) : '—'}
            </div>
          </div>
          <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
            <div className="text-xs text-muted-foreground mb-1">BTC Net Delta</div>
            <div className="text-sm font-mono text-blue-500">
              {data.btc?.netDelta !== undefined ? formatOI(data.btc.netDelta) : '—'}
            </div>
          </div>
        </div>

        {/* Top Strikes */}
        {strikes.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-semibold">TOP STRIKES BY VOLUME</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="text-left py-1 pr-4">Symbol</th>
                    <th className="text-left py-1 pr-4">Type</th>
                    <th className="text-right py-1 pr-4">OI</th>
                    <th className="text-right py-1 pr-4">Volume</th>
                    <th className="text-right py-1">IV</th>
                  </tr>
                </thead>
                <tbody>
                  {strikes.slice(0, 5).map((c, i) => (
                    <tr key={(c.symbol ?? 'strike') + i} className="border-b border-muted/10">
                      <td className="py-1 pr-4 font-mono">{c.symbol ?? '—'}</td>
                      <td className={`py-1 pr-4 font-mono ${c.type === 'call' ? 'text-green-500' : c.type === 'put' ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {(c.type ?? '—').toUpperCase()}
                      </td>
                      <td className="py-1 pr-4 font-mono text-right">{c.openInterest !== undefined ? formatOI(c.openInterest) : '—'}</td>
                      <td className="py-1 pr-4 font-mono text-right">{c.volume !== undefined ? formatOI(c.volume) : '—'}</td>
                      <td className="py-1 font-mono text-right">{c.iv !== undefined ? `${(c.iv * 100).toFixed(1)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Last updated footer */}
        {data.lastUpdated && (
          <div className="mt-3 pt-3 border-t text-[10px] text-muted-foreground">
            Last updated: {new Date(data.lastUpdated).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
