import { useState } from "react";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface MarketData {
  dxy: { value: number; change: number };
  gold: { value: number; change: number };
  spx: { value: number; change: number };
  vix: { value: number; change: number };
  lastUpdated: string;
}

const GlobalMarketIndicators = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'macro' | 'crypto'>('macro');

  const { data, isLoading, error } = useQuery<MarketData>({
    queryKey: ['/api/financial/markets'],
    refetchInterval: 5 * 60 * 1000,
  });

  const refresh = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/financial/markets');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    onSuccess: (d) => queryClient.setQueryData(['/api/financial/markets'], d),
  });

  if (isLoading || error || !data) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-full">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-white/[0.06] rounded w-1/2" />
          {[1,2,3,4].map(i => <div key={i} className="h-12 bg-white/[0.04] rounded" />)}
        </div>
      </div>
    );
  }

  const indicators = [
    { label: 'DXY', value: data.dxy.value.toFixed(2), change: data.dxy.change, unit: '', desc: 'US Dollar Index' },
    { label: 'Gold', value: `$${(data.gold.value / 1000).toFixed(1)}K`, change: data.gold.change, unit: '', desc: 'XAU/USD' },
    { label: 'SPX', value: data.spx.value.toFixed(0), change: data.spx.change, unit: '', desc: 'S&P 500' },
    { label: 'VIX', value: data.vix.value.toFixed(1), change: data.vix.change, unit: '', desc: 'Fear Index' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">Global Markets</span>
        <button onClick={() => refresh.mutate()} className="p-1 hover:bg-white/[0.06] rounded transition-colors">
          <RefreshCw className={`h-3 w-3 text-white/30 ${refresh.isPending ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Indicators */}
      <div className="space-y-1.5">
        {indicators.map((ind) => {
          const pos = ind.change >= 0;
          return (
            <div key={ind.label} className="flex items-center gap-2 p-2 bg-white/[0.03] rounded-lg hover:bg-white/[0.06] transition-colors">
              <div className="w-12">
                <span className="text-[10px] font-black tracking-widest text-white/40">{ind.label}</span>
              </div>
              <div className="flex-1">
                <span className="text-sm font-mono font-bold text-white">{ind.value}</span>
                <span className="text-[9px] text-white/30 ml-1">{ind.desc}</span>
              </div>
              <div className={`flex items-center gap-0.5 text-[11px] font-mono font-bold ${pos ? 'text-green-400/70' : 'text-red-400/70'}`}>
                {pos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {Math.abs(ind.change).toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>

      {/* BTC Dominance inline */}
      <div className="mt-3 pt-2 border-t border-white/[0.06]">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-white/25 uppercase tracking-widest">BTC Dom.</span>
          <span className="text-sm font-mono font-bold text-amber-400/80">—</span>
        </div>
      </div>

      <p className="text-[8px] text-white/20 mt-2 text-center">Updates every 5 min</p>
    </div>
  );
};

export default GlobalMarketIndicators;