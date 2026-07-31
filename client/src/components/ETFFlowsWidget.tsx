/**
 * ETF Flows widget — ADDED 2026-07-31 as part of analytics upgrade.
 *
 * Backend (`/api/etf-flows`) currently returns an honest empty response with
 * a clear message that free public sources are Cloudflare-blocked. This
 * widget renders that state cleanly with a CTA to wire a CoinGlass Pro key.
 *
 * When a key is wired (`COINGLASS_API_KEY` env var), the backend will return
 * real daily flows and this widget will render them automatically — no UI
 * changes needed.
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

interface ETFFlowData {
  available: boolean;
  source: string;
  asOf: string;
  flows: Array<{
    date: string;
    totalNetFlowUSD: number;
  }>;
  summary: {
    totalInflowUSD: number;
    totalOutflowUSD: number;
    netFlowUSD: number;
    daysCovered: number;
  };
  message: string;
}

function formatUSD(n: number): string {
  if (!n) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${n < 0 ? '-' : ''}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${n < 0 ? '-' : ''}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${n < 0 ? '-' : ''}$${(abs / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export default function ETFFlowsWidget() {
  const { data, isLoading } = useQuery<ETFFlowData>({
    queryKey: ['/api/etf-flows'],
    refetchInterval: 5 * 60 * 1000, // 5 min
    staleTime: 60 * 1000,
  });

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center justify-between">
          <span>BTC SPOT ETF FLOWS</span>
          {data?.flows?.length ? (
            <span className="text-xs text-muted-foreground/60">{data.flows.length}d</span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-12 bg-muted/40 rounded animate-pulse" />
            <div className="h-4 bg-muted/40 rounded animate-pulse w-2/3" />
          </div>
        ) : data?.available && data.flows.length > 0 ? (
          <FlowsDisplay data={data} />
        ) : (
          <UnavailableState message={data?.message || 'Loading...'} />
        )}
      </CardContent>
    </Card>
  );
}

function FlowsDisplay({ data }: { data: ETFFlowData }) {
  const isPositive = data.summary.netFlowUSD >= 0;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-baseline gap-2">
          {isPositive ? (
            <TrendingUp className="text-emerald-500 h-5 w-5" />
          ) : (
            <TrendingDown className="text-red-500 h-5 w-5" />
          )}
          <span className={`text-3xl font-mono font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {formatUSD(data.summary.netFlowUSD)}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{data.summary.daysCovered}d net</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Inflow</span>
          <p className="font-mono text-emerald-500">{formatUSD(data.summary.totalInflowUSD)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Outflow</span>
          <p className="font-mono text-red-500">-{formatUSD(data.summary.totalOutflowUSD)}</p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-3">Source: {data.source}</p>
    </div>
  );
}

function UnavailableState({ message }: { message: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-amber-200/90 leading-relaxed">
          <p className="font-medium mb-1">Live ETF flow data unavailable</p>
          <p className="text-amber-200/70">{message}</p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground/60">
        Enable: add <code className="px-1 py-0.5 bg-muted rounded text-[10px]">COINGLASS_API_KEY</code> to env vars
      </p>
    </div>
  );
}
