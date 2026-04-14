import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Clock, AlertTriangle } from "lucide-react";

interface TreasuryData {
  debtToPenny: {
    totalDebt: number;
    publicDebt: number;
    intergovernmentalHoldings: number;
    dateOfData: string;
    lastUpdated: string;
  };
  averageInterestRates: {
    totalInterestBearingDebt: number;
    weightedAverageRate: number;
    monthlyChange: number;
    yearOverYearChange: number;
    lastUpdated: string;
  };
  debtStatistics: {
    debtPerCitizen: number;
    debtPerTaxpayer: number;
    debtToGDP: number;
    dailyIncrease: number;
  };
}

const TreasuryFiscalWidget = () => {
  const { data, isLoading, error } = useQuery<TreasuryData>({
    queryKey: ['/api/financial/treasury-fiscal'],
    refetchInterval: 60 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-full">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-white/[0.06] rounded w-1/2" />
          <div className="h-16 bg-white/[0.04] rounded" />
          <div className="h-16 bg-white/[0.04] rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-full flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-6 w-6 text-red-400/40 mx-auto mb-1" />
          <p className="text-xs text-white/30">Data unavailable</p>
        </div>
      </div>
    );
  }

  const { debtToPenny, averageInterestRates, debtStatistics } = data;
  const debtT = (debtToPenny.totalDebt / 1e12).toFixed(2);
  const daily = (debtStatistics.dailyIncrease / 1e9).toFixed(0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="h-4 w-4 text-amber-400/70" />
        <span className="text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">US Treasury</span>
      </div>

      {/* Total Debt — Hero number */}
      <div className="bg-white/[0.04] rounded-lg p-3 mb-2">
        <p className="text-[9px] text-white/25 uppercase tracking-widest mb-0.5">Total Public Debt</p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-mono font-black text-white">${debtT}T</span>
        </div>
        <p className="text-[9px] text-white/30 mt-0.5">{debtStatistics.debtToGDP}% Debt-to-GDP</p>
      </div>

      {/* Key stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-white/[0.03] rounded-lg p-2">
          <p className="text-[8px] text-white/25 uppercase tracking-widest">Per Citizen</p>
          <p className="text-sm font-mono font-bold text-white/80">${debtStatistics.debtPerCitizen.toLocaleString()}</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2">
          <p className="text-[8px] text-white/25 uppercase tracking-widest">Per Taxpayer</p>
          <p className="text-sm font-mono font-bold text-white/80">${debtStatistics.debtPerTaxpayer.toLocaleString()}</p>
        </div>
      </div>

      {/* Interest cost */}
      <div className="bg-white/[0.03] rounded-lg p-2 mb-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-white/30">Avg Interest Rate</span>
          <span className="text-sm font-mono font-bold text-red-400/70">{averageInterestRates.weightedAverageRate.toFixed(2)}%</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[9px] text-white/30">+Annual Change</span>
          <span className="text-xs font-mono text-red-400/50">+{averageInterestRates.yearOverYearChange.toFixed(2)}%</span>
        </div>
      </div>

      {/* Daily accrual */}
      <div className="mt-auto flex items-center justify-between bg-amber-400/5 border border-amber-400/10 rounded-lg p-2">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-amber-400/50" />
          <span className="text-[9px] text-amber-400/50">Debt rising</span>
        </div>
        <span className="text-sm font-mono font-bold text-amber-400/70">+${daily}B/day</span>
      </div>

      <p className="text-[8px] text-white/20 mt-2 text-center">Source: treasury.gov · Updated {new Date(debtToPenny.lastUpdated).toLocaleDateString()}</p>
    </div>
  );
};

export default TreasuryFiscalWidget;