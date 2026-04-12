import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface WhaleTransaction {
  hash: string;
  timestamp: number;
  amount: number;
  amountUSD: number;
  from: string;
  to: string;
  type: 'large_transfer' | 'exchange_inflow' | 'exchange_outflow' | 'unknown';
  significance: 'high' | 'medium' | 'low';
}

interface WhaleAlertResponse {
  transactions: WhaleTransaction[];
  currentPrice: number;
  totalVolume24h: number;
  largestTransaction: WhaleTransaction | null;
  timestamp: string;
}

function truncateAddress(address: string): string {
  if (address === 'Unknown') return address;
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function WhaleAlertsWidget() {
  const { data, isLoading } = useQuery<WhaleAlertResponse>({
    queryKey: ['/api/whale-alerts'],
    refetchInterval: 120000, // 2 minutes
  });

  if (isLoading) {
    return (
      <Card className="bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">WHALE ALERTS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.transactions.length === 0) {
    return (
      <Card className="bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">WHALE ALERTS</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No large transactions detected
          </p>
        </CardContent>
      </Card>
    );
  }

  const latestTxs = data.transactions.slice(0, 6);

  const getTypeIcon = (type: WhaleTransaction['type']) => {
    switch (type) {
      case 'exchange_inflow':
        return <ArrowDownRight className="w-3 h-3 text-red-500" />;
      case 'exchange_outflow':
        return <ArrowUpRight className="w-3 h-3 text-green-500" />;
      default:
        return <Activity className="w-3 h-3 text-blue-500" />;
    }
  };

  const getTypeColor = (type: WhaleTransaction['type']) => {
    switch (type) {
      case 'exchange_inflow': return 'text-red-500';
      case 'exchange_outflow': return 'text-green-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          WHALE ALERTS
          <span className="text-xs font-normal ml-2 text-muted-foreground/60">
            (≥100 BTC)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {latestTxs.map((tx, idx) => (
          <div 
            key={tx.hash + idx} 
            className="flex items-center justify-between py-1.5 border-b border-muted/10 last:border-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              {getTypeIcon(tx.type)}
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-mono font-medium ${getTypeColor(tx.type)}`}>
                    {tx.amount.toFixed(1)} BTC
                  </span>
                </div>
                <div className="text-xs text-muted-foreground truncate max-w-[100px]">
                  {truncateAddress(tx.from)} → {truncateAddress(tx.to)}
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <div className="text-xs font-mono text-muted-foreground">
                {formatCurrency(tx.amountUSD, 'USD', 0)}
              </div>
              <div className="text-xs text-muted-foreground/60">
                {formatRelativeTime(new Date(tx.timestamp).toISOString())}
              </div>
            </div>
          </div>
        ))}
        
        {data.transactions.length > 6 && (
          <p className="text-xs text-muted-foreground/60 text-center pt-2">
            +{data.transactions.length - 6} more transactions
          </p>
        )}
      </CardContent>
    </Card>
  );
}
