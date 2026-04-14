/**
 * BitcoinHub Trading Terminal — Premium Macro Grid
 * Dark terminal aesthetic · Amber BTC accent · Dense data panels
 * Layout: BTC Hero → AI Analysis (focal) → Macro Grid → Context Grid
 */

import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Premium components
import FedWatchTool from "@/components/FedWatchTool";
import GlobalMarketIndicators from "@/components/GlobalMarketIndicators";
import TreasuryFiscalWidget from "@/components/TreasuryFiscalWidget";
import UST10YTreasury from "@/components/UST10YTreasury";
import LiquidityWidget from "@/components/LiquidityWidget";
import FearGreedWidget from "@/components/FearGreedWidget";
import AIAnalysis from "@/components/AIAnalysis";
import AITrendPrediction from "@/components/AITrendPrediction";
import WhaleAlertsWidget from "@/components/WhaleAlertsWidget";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BTC {
  current_price?: { usd: number };
  market_cap?: { usd: number };
  total_volume?: { usd: number };
  price_change_percentage_24h?: number;
  high_24h?: { usd: number };
  low_24h?: { usd: number };
  btc_dominance?: number;
}

interface ChartPoint { timestamp: string; price: number }

interface BitcoinMarketData {
  current_price?: { usd: number };
  price_change_percentage_24h?: number;
  high_24h?: { usd: number };
  low_24h?: { usd: number };
  total_volume?: { usd: number };
  market_cap?: { usd: number };
}

// ─── BTC Chart Component ──────────────────────────────────────────────────────

function BTCChart() {
  const [tf, setTf] = useState("1D");
  const TFS = ["15m", "1h", "4h", "1D", "1W", "1M"] as const;

  const { data: chartData, isLoading } = useQuery<ChartPoint[]>({
    queryKey: ["/api/bitcoin/chart", tf],
    queryFn: async () => {
      const r = await fetch(`/api/bitcoin/chart?timeframe=${tf}`);
      return r.json();
    },
    refetchInterval: 60000,
  });

  const prices = chartData?.map((d: ChartPoint) => d.price) || [];
  const lo = prices.length ? Math.min(...prices) : 0;
  const hi = prices.length ? Math.max(...prices) : 0;
  const latest = prices[prices.length - 1] || 0;

  const W = 920, H = 220, P = 10;
  const toX = (i: number) => P + (i / Math.max(prices.length - 1, 1)) * (W - P * 2);
  const toY = (p: number) => P + (1 - (p - lo) / (hi - lo || 1)) * (H - P * 2);
  const pts = prices.map((p: number, i: number) => `${toX(i)},${toY(p)}`).join(" ");
  const area = `${P},${H - P} ${pts} ${W - P},${H - P}`;

  const sorted = [...prices].sort((a: number, b: number) => a - b);
  const sup5 = sorted[Math.floor(sorted.length * 0.05)] || lo;
  const res95 = sorted[Math.floor(sorted.length * 0.95)] || hi;
  const supY = toY(sup5);
  const resY = toY(res95);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] text-white/[0.3] tracking-widest uppercase font-semibold">Price Chart</span>
        <div className="flex gap-1">
          {TFS.map(f => (
            <button
              key={f}
              onClick={() => setTf(f)}
              className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded transition-colors ${
                tf === f
                  ? "bg-amber-400/20 text-amber-400 border border-amber-400/30"
                  : "text-white/[0.35] hover:text-white/[0.6] border border-transparent"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !prices.length ? (
        <Skeleton className="w-full" style={{ height: H }} />
      ) : (
        <div className="relative" style={{ height: H }}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(245,158,11)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="rgb(245,158,11)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1={P} y1={supY} x2={W - P} y2={supY} stroke="rgb(34,197,94)" strokeWidth="1" strokeDasharray="4,4" opacity="0.6" />
            <line x1={P} y1={resY} x2={W - P} y2={resY} stroke="rgb(239,68,68)" strokeWidth="1" strokeDasharray="4,4" opacity="0.6" />
            <polygon points={area} fill="url(#chartFill)" />
            <polyline points={pts} fill="none" stroke="rgb(245,158,11)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={toX(prices.length - 1)} cy={toY(latest)} r="4" fill="rgb(245,158,11)" stroke="rgb(10,10,15)" strokeWidth="2" />
            <text x={W - P} y={resY - 4} textAnchor="end" fill="rgb(239,68,68)" fontSize="9" fontFamily="monospace" opacity="0.8">{formatCurrency(res95)}</text>
            <text x={W - P} y={supY + 12} textAnchor="end" fill="rgb(34,197,94)" fontSize="9" fontFamily="monospace" opacity="0.8">{formatCurrency(sup5)}</text>
            <text x={toX(prices.length - 1) - 6} y={toY(latest) - 8} textAnchor="end" fill="rgb(245,158,11)" fontSize="10" fontFamily="monospace" fontWeight="bold">{formatCurrency(latest)}</text>
          </svg>
        </div>
      )}

      {prices.length > 0 && (
        <div className="flex justify-between mt-1 text-[9px] text-white/[0.3] font-mono">
          <span>{formatCurrency(lo)}</span>
          <span className="text-amber-400/60">{tf}</span>
          <span>{formatCurrency(hi)}</span>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmtM(n: number) {
  if (!n) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(2)}`;
}

const DarkCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 ${className}`}>
    {children}
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const btc = useQuery<BTC>({
    queryKey: ["/api/bitcoin/market-data"],
    refetchInterval: 60000,
  });

  const marketData: BitcoinMarketData | null = btc.data ? {
    current_price: btc.data.current_price,
    price_change_percentage_24h: btc.data.price_change_percentage_24h,
    high_24h: btc.data.high_24h,
    low_24h: btc.data.low_24h,
    total_volume: btc.data.total_volume,
    market_cap: btc.data.market_cap,
  } : null;

  const m = btc.data;
  const price = m?.current_price?.usd || 0;
  const chg = m?.price_change_percentage_24h || 0;
  const pos = chg >= 0;
  const lo = m?.low_24h?.usd || 0;
  const hi = m?.high_24h?.usd || 0;
  const range = hi - lo || 1;
  const posInRange = ((price - lo) / range) * 100;

  if (btc.isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-black font-mono text-amber-400 mb-2">Loading...</div>
          <p className="text-white/40 text-sm">Fetching live Bitcoin data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-[1800px] mx-auto px-4 pt-6 pb-4">

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ROW 1: Bitcoin Hero — Compact 3-Col                             */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">

            {/* Left: BTC price + stats */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black tracking-[0.2em] text-amber-400 uppercase">Bitcoin</span>
                <span className="text-[9px] text-white/[0.25] tracking-widest uppercase">BTC/USD</span>
              </div>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-4xl font-mono font-black text-amber-400 tracking-tight">
                  {formatCurrency(price)}
                </span>
                <div className={`flex items-center gap-0.5 mb-1 ${pos ? "text-green-400" : "text-red-400"}`}>
                  {pos ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  <span className="text-base font-mono font-bold">{formatPercentage(chg)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-white/[0.35] font-mono">{formatCurrency(lo)}</span>
                <div className="w-44 h-1 bg-white/[0.08] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(Math.max(posInRange, 2), 98)}%`, background: pos ? "rgb(34,197,94)" : "rgb(239,68,68)" }} />
                </div>
                <span className="text-[10px] text-white/[0.35] font-mono">{formatCurrency(hi)}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[9px] text-white/[0.25] uppercase tracking-widest">Volume 24h</p>
                  <p className="text-sm font-mono font-bold text-white">{fmtM(m?.total_volume?.usd || 0)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-white/[0.25] uppercase tracking-widest">Market Cap</p>
                  <p className="text-sm font-mono font-bold text-white">{fmtM(m?.market_cap?.usd || 0)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-white/[0.25] uppercase tracking-widest">Dominance</p>
                  <p className="text-sm font-mono font-bold text-amber-400">{m?.btc_dominance?.toFixed(1) || "—"}%</p>
                </div>
              </div>
            </div>

            {/* Center: Fear & Greed gauge */}
            <div className="flex justify-center">
              <FearGreedWidget />
            </div>

            {/* Right: BTC chart */}
            <div>
              <BTCChart />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ROW 2: AI Analysis — Primary Focus (full width)                  */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <DarkCard className="mb-4">
          <AIAnalysis marketData={marketData} />
        </DarkCard>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ROW 3: 4-Col Macro Grid                                          */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">

          {/* Col 1: FedWatchTool */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-full overflow-auto">
            <FedWatchTool />
          </div>

          {/* Col 2: GlobalMarketIndicators */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-full overflow-auto">
            <GlobalMarketIndicators />
          </div>

          {/* Col 3: LiquidityWidget */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-full overflow-auto">
            <LiquidityWidget />
          </div>

          {/* Col 4: TreasuryFiscalWidget */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-full overflow-auto">
            <TreasuryFiscalWidget />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ROW 4: 3-Col Context Grid                                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          {/* Col 1: Whale Alerts */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-full overflow-auto">
            <WhaleAlertsWidget />
          </div>

          {/* Col 2: AI Trend Prediction */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-full overflow-auto">
            <AITrendPrediction />
          </div>

          {/* Col 3: UST 10Y Treasury */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-full overflow-auto">
            <UST10YTreasury />
          </div>
        </div>

      </div>
    </div>
  );
}
