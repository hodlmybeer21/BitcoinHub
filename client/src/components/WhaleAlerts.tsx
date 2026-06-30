import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpRight, ArrowDownRight, Activity, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

function TransactionTypeIcon({ type }: { type: WhaleTransaction['type'] }) {
  switch (type) {
    case 'exchange_inflow':
      return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    case 'exchange_outflow':
      return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    case 'large_transfer':
      return <Activity className="w-4 h-4 text-blue-500" />;
    default:
      return <TrendingUp className="w-4 h-4 text-gray-500" />;
  }
}

function TransactionTypeBadge({ type }: { type: WhaleTransaction['type'] }) {
  const variants: Record<WhaleTransaction['type'], { label: string; className: string }> = {
    exchange_inflow: { label: 'Exchange Inflow', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
    exchange_outflow: { label: 'Exchange Outflow', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
    large_transfer: { label: 'Large Transfer', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    unknown: { label: 'Transfer', className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' }
  };

  const variant = variants[type];
  
  return (
    <Badge variant="outline" className={variant.className}>
      {variant.label}
    </Badge>
  );
}

function SignificanceBadge({ significance }: { significance: string }) {
  const variants: Record<string, { className: string }> = {
    high: { className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
    medium: { className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    low: { className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
  };
  const variant = variants[significance] ?? variants.low;

  return (
    <Badge variant="outline" className={variant.className}>
      {(significance || 'unknown').toUpperCase()}
    </Badge>
  );
}

function truncateAddress(address: string): string {
  if (address === 'Unknown') return address;
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

export default function WhaleAlerts() {
  const { data, isLoading, error } = useQuery<WhaleAlertResponse>({
    queryKey: ['/api/whale-alerts'],
    refetchInterval: 2 * 60 * 1000 // Refresh every 2 minutes
  });

  if (isLoading) {
    return (
      <Card data-testid="card-whale-alerts">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🐋 Whale Movement Alerts
          </CardTitle>
          <CardDescription>Large Bitcoin transactions in real-time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card data-testid="card-whale-alerts">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🐋 Whale Movement Alerts
          </CardTitle>
          <CardDescription>Large Bitcoin transactions in real-time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-8">
            Unable to load whale alerts. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasTransactions = data.transactions && data.transactions.length > 0;

  return (
    <Card data-testid="card-whale-alerts">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🐋 Whale Movement Alerts
        </CardTitle>
        <CardDescription>
          Tracking Bitcoin transactions ≥ 100 BTC (${(data.currentPrice * 100).toLocaleString()})
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasTransactions ? (
          <>
            <div className="text-sm text-muted-foreground text-center py-8">
              No large transactions detected in the last few minutes. Monitoring continues...
            </div>
            <div className="mt-4 text-xs text-center text-muted-foreground">
              Updates every 2 minutes • Data from Blockchain.com
            </div>
          </>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-orange-500/5 rounded-lg border border-orange-500/10">
                <div className="text-xs text-muted-foreground mb-1">Total Volume Tracked</div>
                <div className="text-lg font-bold text-orange-500" data-testid="text-whale-volume">
                  ${(data.totalVolume24h / 1000000).toFixed(1)}M
                </div>
              </div>
              <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
                <div className="text-xs text-muted-foreground mb-1">Largest Transaction</div>
                <div className="text-lg font-bold text-blue-500" data-testid="text-whale-largest">
                  {data.largestTransaction ? `${data.largestTransaction.amount.toFixed(0)} BTC` : 'N/A'}
                </div>
              </div>
            </div>

            {/* Last 20 Whale Transactions */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-orange-500" />
                  Last 20 Whale Transactions
                </h3>
                <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                  {data.transactions.length} of 20
                </Badge>
              </div>
              
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2" data-testid="whale-transactions-list">
                {data.transactions.map((tx, index) => (
                  <div
                    key={tx.hash}
                    data-testid={`whale-tx-${index}`}
                    className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <TransactionTypeIcon type={tx.type} />
                        <TransactionTypeBadge type={tx.type} />
                        <SignificanceBadge significance={tx.significance} />
                      </div>
                      <div className="text-xs text-muted-foreground" data-testid={`whale-time-${index}`}>
                        {formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true })}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold" data-testid={`whale-amount-${index}`}>
                          {tx.amount.toFixed(2)} BTC
                        </span>
                        <span className="text-sm text-muted-foreground" data-testid={`whale-usd-${index}`}>
                          ${tx.amountUSD.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">From:</span>
                          <code className="bg-muted px-1 rounded" data-testid={`whale-from-${index}`}>
                            {truncateAddress(tx.from)}
                          </code>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">To:</span>
                          <code className="bg-muted px-1 rounded" data-testid={`whale-to-${index}`}>
                            {truncateAddress(tx.to)}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 text-xs text-center text-muted-foreground">
              Updates every 2 minutes • Data from Blockchain.com
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
