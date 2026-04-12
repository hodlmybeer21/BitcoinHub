import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface FearGreedData {
  currentValue: number;
  classification: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
  yesterday: number;
  lastWeek: number;
  yearlyHigh: { value: number; date: string };
  yearlyLow: { value: number; date: string };
}

export default function FearGreedWidget() {
  const { data, isLoading } = useQuery<FearGreedData>({
    queryKey: ['/api/web-resources/fear-greed'],
    refetchInterval: 300000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">FEAR & GREED INDEX</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">FEAR & GREED INDEX</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Unable to load data</p>
        </CardContent>
      </Card>
    );
  }

  const value = data.currentValue || 50;
  
  // Determine color based on value
  const getColor = (val: number): string => {
    if (val <= 24) return 'text-red-600';
    if (val <= 49) return 'text-orange-500';
    if (val <= 54) return 'text-yellow-500';
    if (val <= 74) return 'text-lime-500';
    return 'text-green-500';
  };

  const getBgColor = (val: number): string => {
    if (val <= 24) return 'bg-red-500/10 border-red-500/20';
    if (val <= 49) return 'bg-orange-500/10 border-orange-500/20';
    if (val <= 54) return 'bg-yellow-500/10 border-yellow-500/20';
    if (val <= 74) return 'bg-lime-500/10 border-lime-500/20';
    return 'bg-green-500/10 border-green-500/20';
  };

  const color = getColor(value);
  const bgClass = getBgColor(value);

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">FEAR & GREED INDEX</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Gauge */}
        <div className={`p-4 rounded-lg border ${bgClass} mb-4`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-4xl font-mono font-bold ${color}`}>{value}</span>
            <span className={`text-sm font-medium ${color}`}>{data.classification}</span>
          </div>
          
          {/* Simple gauge bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full ${value > 50 ? 'bg-green-500' : value > 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${value}%` }}
            />
          </div>
          
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>Extreme Fear</span>
            <span>Extreme Greed</span>
          </div>
        </div>

        {/* History */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Yesterday</span>
            <span className={`font-mono font-medium ${getColor(data.yesterday)}`}>{data.yesterday}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Week</span>
            <span className={`font-mono font-medium ${getColor(data.lastWeek)}`}>{data.lastWeek}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Yearly High</span>
            <span className="font-mono font-medium text-green-500">{data.yearlyHigh?.value}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Yearly Low</span>
            <span className="font-mono font-medium text-red-500">{data.yearlyLow?.value}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
