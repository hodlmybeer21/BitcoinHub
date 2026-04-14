import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Calendar, TrendingUp, RefreshCw, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";

interface FedWatchData {
  currentRate: string;
  currentRateBps: number;
  currentRatePct: string;
  nextMeeting: string;
  probabilities: Array<{
    rate: string;
    probability: number;
    label: string;
  }>;
  futureOutlook: {
    oneWeek: { noChange: number; cut: number; hike: number };
    oneMonth: { noChange: number; cut: number; hike: number };
  };
  lastUpdated: string;
}

const FedWatchTool = () => {
  const queryClient = useQueryClient();

  const { data: fedData, isLoading, error } = useQuery<FedWatchData>({
    queryKey: ['/api/financial/fedwatch'],
    refetchInterval: 5 * 60 * 1000,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/financial/fedwatch');
      if (!response.ok) throw new Error('Failed');
      return response.json();
    },
    onSuccess: (data) => queryClient.setQueryData(['/api/financial/fedwatch'], data),
  });

  if (isLoading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-full">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-white/[0.06] rounded w-3/4" />
          <div className="h-20 bg-white/[0.06] rounded" />
          <div className="h-32 bg-white/[0.06] rounded" />
        </div>
      </div>
    );
  }

  if (error || !fedData) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-400/60 mx-auto mb-2" />
          <p className="text-sm text-white/[0.4]">Data unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-400" />
          <span className="text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">Fed Watch</span>
        </div>
        <button onClick={() => refreshMutation.mutate()} className="p-1 hover:bg-white/[0.06] rounded transition-colors">
          <RefreshCw className={`h-3 w-3 text-white/30 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Current Target Rate */}
      <div className="bg-white/[0.04] rounded-lg p-3 mb-3">
        <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1">Current Target Rate</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-mono font-black text-blue-400">{fedData.currentRatePct}%</span>
          <span className="text-xs text-white/30">({fedData.currentRateBps} bps)</span>
        </div>
        <p className="text-[9px] text-white/25 mt-0.5">Next meeting: {fedData.nextMeeting}</p>
      </div>

      {/* Probability bars */}
      <div className="mb-3">
        <p className="text-[9px] text-white/25 uppercase tracking-widest mb-2">Next Meeting Probabilities</p>
        <div className="space-y-1.5">
          {fedData.probabilities.map((item, i) => {
            const color = item.label === 'No change' ? 'bg-blue-500' : item.label.includes('cut') ? 'bg-green-500/80' : 'bg-red-500/80';
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-white/40 w-14">{item.rate}</span>
                <div className="flex-1 bg-white/[0.06] rounded-full h-2.5 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${item.probability}%` }} />
                </div>
                <span className="text-[10px] font-mono text-white/50 w-8 text-right">{item.probability}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Outlook grid */}
      <div className="grid grid-cols-2 gap-2 mt-auto">
        <div className="bg-white/[0.04] rounded-lg p-2">
          <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1">1-Week Outlook</p>
          <div className="space-y-0.5">
            <div className="flex justify-between"><span className="text-[10px] text-white/40">Hold</span><span className="text-[10px] font-mono text-white/70">{fedData.futureOutlook.oneWeek.noChange}%</span></div>
            <div className="flex justify-between"><span className="text-[10px] text-green-400/60">Cut</span><span className="text-[10px] font-mono text-green-400/60">{fedData.futureOutlook.oneWeek.cut}%</span></div>
          </div>
        </div>
        <div className="bg-white/[0.04] rounded-lg p-2">
          <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1">1-Month Outlook</p>
          <div className="space-y-0.5">
            <div className="flex justify-between"><span className="text-[10px] text-white/40">Hold</span><span className="text-[10px] font-mono text-white/70">{fedData.futureOutlook.oneMonth.noChange}%</span></div>
            <div className="flex justify-between"><span className="text-[10px] text-green-400/60">Cut</span><span className="text-[10px] font-mono text-green-400/60">{fedData.futureOutlook.oneMonth.cut}%</span></div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-[8px] text-white/20 mt-2 text-center">Fed rate changes drive BTC liquidity & risk sentiment</p>
    </div>
  );
};

export default FedWatchTool;