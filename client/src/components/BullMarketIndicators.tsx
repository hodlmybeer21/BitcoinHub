import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Search, RefreshCw, AlertTriangle, Target, ExternalLink } from "lucide-react";

interface BullMarketIndicator {
  id: number;
  name: string;
  current: string | number;
  reference: string;
  hitOrNot: boolean;
  distanceToHit: string | number;
  progress: string;
}

interface CoinglassIndicatorsData {
  updateTime: string;
  totalHit: number;
  totalIndicators: number;
  overallSignal: 'Hold' | 'Sell';
  sellPercentage: number;
  indicators: BullMarketIndicator[];
}

export function BullMarketIndicators() {
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  // Fetch bull market indicators data every 5 minutes
  const { data: indicatorsData, isLoading: isLoadingIndicators, error } = useQuery<CoinglassIndicatorsData>({
    queryKey: ['/api/indicators/bull-market-signals'],
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 3
  });

  // Auto-refresh timer display
  const [nextRefresh, setNextRefresh] = useState(300); // 5 minutes in seconds
  
  useEffect(() => {
    const timer = setInterval(() => {
      setNextRefresh(prev => prev > 0 ? prev - 1 : 300);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleForceRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/indicators/bull-market-signals'] });
    setNextRefresh(300);
  };

  // Filter indicators based on search term
  const indicatorsArr: any[] = Array.isArray(indicatorsData?.indicators)
    ? indicatorsData!.indicators
    : Object.values(indicatorsData?.indicators ?? {});
  const filteredIndicators = indicatorsArr.filter(indicator =>
    indicator.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressColor = (progress: string) => {
    const value = parseFloat(progress.replace('%', ''));
    if (value < 25) return 'bg-red-500';
    if (value <= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getSignalColor = (signal: 'Hold' | 'Sell') => {
    return signal === 'Sell' ? 'bg-red-500 text-white' : 'bg-green-500 text-white';
  };

  if (error) {
    return (
      <Card className="bg-card border-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <AlertTriangle className="mr-2 h-6 w-6 text-red-500" />
            Error Loading Bull Market Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Unable to fetch bull market peak indicators. Please check your connection and try again.
          </p>
          <Button onClick={handleForceRefresh} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card className="bg-card border-muted/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center text-2xl mb-2">
                <Target className="mr-3 h-7 w-7 text-orange-500" />
                Bull Market Peak Indicators
              </CardTitle>
              <p className="text-muted-foreground">
                Key indicators to help identify Bitcoin bull market peaks.
              </p>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Button onClick={handleForceRefresh} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <p className="text-xs text-muted-foreground">
                Next update: {formatTime(nextRefresh)}
              </p>
            </div>
          </div>
          
          {indicatorsData && (
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-4">
                <Badge className={getSignalColor(indicatorsData.overallSignal)} variant="secondary">
                  {indicatorsData.overallSignal} 100%
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Hit: {indicatorsData.totalHit}/{indicatorsData.totalIndicators}
                </span>
                <span className="text-sm text-muted-foreground">
                  {indicatorsData.sellPercentage.toFixed(1)}% Sell Signal
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Last Updated: {new Date(indicatorsData.updateTime).toLocaleString()}
              </p>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Search and Filters */}
      <Card className="bg-card border-muted/20">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search indicators..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="https://www.coinglass.com/bull-market-peak-signals" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                View on CoinGlass
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Indicators Grid */}
      {isLoadingIndicators ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-card border-muted/20">
              <CardContent className="pt-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-2 bg-muted rounded w-full mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIndicators.map((indicator) => (
            <Card key={indicator.id} className="bg-card border-muted/20 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1 leading-tight">
                      {indicator.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      #{indicator.id}
                    </p>
                  </div>
                  {indicator.hitOrNot ? (
                    <Badge className="bg-red-500 text-white ml-2" variant="secondary">
                      HIT
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="ml-2">
                      {parseFloat(indicator.progress.replace('%', '')).toFixed(0)}%
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Current:</span>
                    <span className="font-mono font-semibold">
                      {indicator.current}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Target:</span>
                    <span className="font-mono text-xs">
                      {indicator.reference}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-muted-foreground">Progress</span>
                      <span className="text-xs font-medium">{indicator.progress}</span>
                    </div>
                    <div className="relative">
                      <Progress 
                        value={parseFloat(indicator.progress.replace('%', ''))} 
                        className="h-2"
                      />
                      <div 
                        className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(indicator.progress)}`}
                        style={{ width: `${parseFloat(indicator.progress.replace('%', ''))}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-muted-foreground">Distance:</span>
                    <span className="font-mono">
                      {indicator.distanceToHit}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Information Footer */}
      <Card className="bg-card border-muted/20">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Disclaimer:</strong> This list was first proposed by Twitter blogger 43A6 @_43A6. 
              These indicators help judge whether Bitcoin has reached the top in multiple dimensions.
            </p>
            <p className="text-xs text-muted-foreground">
              This is not investment advice. Consider your financial situation, goals, and risk tolerance before making decisions.
            </p>
            <div className="flex items-center justify-center space-x-4 mt-4">
              <a 
                href="https://www.coinglass.com/bull-market-peak-signals" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm flex items-center"
              >
                <ExternalLink className="mr-1 h-3 w-3" />
                View Original on CoinGlass
              </a>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                Auto-refreshes every 5 minutes
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}