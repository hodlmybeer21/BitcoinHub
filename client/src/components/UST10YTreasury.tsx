import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

const UST10YTreasury = () => {
  const { data, isLoading, error } = useQuery<{
    rate: number; yieldChange: number; trend: string; date: string;
  }>({
    queryKey: ['/api/financial/yields'],
    refetchInterval: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-full">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-white/[0.06] rounded w-1/2" />
          <div className="h-14 bg-white/[0.04] rounded" />
          <div className="h-8 bg-white/[0.04] rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-6 w-6 text-white/20 mx-auto mb-1" />
          <p className="text-xs text-white/30">Yield data unavailable</p>
        </div>
      </div>
    );
  }

  const pos = data.yieldChange >= 0;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">10Y Treasury</span>
        <span className="text-[9px] text-white/20">{data.date}</span>
      </div>

      <div className="bg-white/[0.04] rounded-lg p-3 mb-3">
        <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1">Yield</p>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-mono font-black ${data.rate > 4.5 ? 'text-red-400' : data.rate > 4.0 ? 'text-yellow-400' : 'text-green-400'}`}>
            {data.rate.toFixed(2)}%
          </span>
          <div className={`flex items-center gap-0.5 text-xs font-mono ${pos ? 'text-red-400' : 'text-green-400'}`}>
            {pos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(data.yieldChange).toFixed(3)}%
          </div>
        </div>
      </div>

      {/* Real yield context */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px]">
          <span className="text-white/30">Real Yield (approx)</span>
          <span className="text-white/60 font-mono">{(data.rate - 2.9).toFixed(2)}%</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-white/30">BTC context</span>
          <span className="text-white/60 font-mono">{data.rate > 4.5 ? 'Headwind' : 'Tailwind'}</span>
        </div>
      </div>

      <p className="text-[8px] text-white/20 mt-auto pt-2 text-center">Yield &gt; 4.5% = risk-off pressure on BTC</p>
    </div>
  );
};

export default UST10YTreasury;