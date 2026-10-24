/**
 * ETF Flows widget — ADDED 2026-07-31 as part of analytics upgrade.
 *
 * Backend (`/api/etf-flows`) currently returns an honest empty response with
 * a clear message that free public sources are Cloudflare-blocked. This
 * widget collapses that state to one line, with the reason behind a toggle.
 *
 * When a key is wired (`COINGLASS_API_KEY` env var), the backend will return
 * real daily flows and this widget will render them automatically — no UI
 * changes needed.
 */
import { useQuery } from "@tanstack/react-query";
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

  // Rendered inside the /analytics KPI tile, which supplies the title.
  if (isLoading) {
    return <div className="h-5 bg-muted/40 rounded animate-pulse w-2/3" />;
  }
  return data?.available && data.flows.length > 0 ? (
    <FlowsDisplay data={data} />
  ) : (
    <UnavailableState message={data?.message || 'No response from /api/etf-flows.'} />
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

// Collapsed to one line (UX review #29); the full reason is one click away.
function UnavailableState({ message }: { message: string }) {
  return (
    <details className="group text-xs text-muted-foreground" data-testid="etf-flows-unavailable">
      <summary className="cursor-pointer list-none flex items-center gap-1.5 [&::-webkit-details-marker]:hidden">
        <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
        <span>Not available on free sources.</span>
        <span className="text-primary group-open:hidden">Why?</span>
      </summary>
      <p className="mt-2 leading-relaxed text-muted-foreground/80">{message}</p>
    </details>
  );
}
