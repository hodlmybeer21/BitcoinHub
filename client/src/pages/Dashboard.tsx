/**
 * BitcoinHub Trading Terminal — Premium Macro Grid
 * Dark terminal aesthetic · Amber BTC accent · Dense data panels
 * Built with premium components: FedWatchTool, GlobalMarketIndicators,
 * TreasuryFiscalWidget, UST10YTreasury, LiquidityWidget, FearGreedWidget,
 * AIAnalysis, AITrendPrediction, OptionsFlowWidget, WhaleAlertsWidget
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
import OptionsFlowWidget from "@/components/OptionsFlowWidget";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtM(val: number) {
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  return `$${val.toFixed(0)}`;
}

// ─── BTC Chart (inline SVG) ───────────────────────────────────────────────────

function BTCChart({ timeframe }: { timeframe?: string }) {
  const [tf, setTf] = useState(timeframe || "1D");
  const TFS = ["15m", "1h", "4h", "1D", "1W", "1M"] as const;

  const { data, isLoading } = useQuery<ChartPoint[]>({
    queryKey: ["/api/bitcoin/chart", tf],
    queryFn: async () => {
      const r = await fetch(`/api/bitcoin/chart?timeframe=${tf}`);
      return r.json();
    },
    refetchInterval: 60000,
  });

  const prices = data?.map(d => d.price) || [];
  const lo = prices.length ? Math.min(...prices) : 0;
  const hi = prices.length ? Math.max(...prices) : 0;
  const latest = prices[prices.length - 1] || 0;

  const W = 420, H = 130, P = 8;
  const toX = (i: number) => P + (i / Math.max(prices.length - 1, 1)) * (W - P * 2);
  const toY = (p: number) => P + (1 - (p - lo) / (hi - lo || 1)) * (H - P * 2);
  const pts = prices.map((p, i) => `${toX(i)},${toY(p)}`).join(" ");
  const area = `${P},${H - P} ${pts} ${W - P},${H - P}`;

  const sorted = [...prices].sort((a, b) => a - b);
  const sup5 = sorted[Math.floor(sorted.length * 0.05)] || lo;
  const res95 = sorted[Math.floor(sorted.length * 0.95)] || hi;
  const supY = toY(sup5);
  const resY = toY(res95);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] text-white/[0.3] tracking-widest uppercase font-semibold">BTC Chart</span>
        <div className="flex gap-0.5">
          {TFS.map(f => (
            <button
              key={f}
              onClick={() => setTf(f)}
              className={`px-1.5 py-0.5 text-[9px] font-mono rounded transition-colors ${
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
              <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(245,158,11)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="rgb(245,158,11)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1={P} y1={supY} x2={W - P} y2={supY} stroke="rgb(34,197,94)" strokeWidth="0.75" strokeDasharray="3,3" opacity="0.5" />
            <line x1={P} y1={resY} x2={W - P} y2={resY} stroke="rgb(239,68,68)" strokeWidth="0.75" strokeDasharray="3,3" opacity="0.5" />
            <polygon points={area} fill="url(#cg)" />
            <polyline points={pts} fill="none" stroke="rgb(245,158,11)" strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={toX(prices.length - 1)} cy={toY(latest)} r="3" fill="rgb(245,158,11)" stroke="rgb(10,10,15)" strokeWidth="1.5" />
            <text x={toX(prices.length - 1) - 4} y={toY(latest) - 6} textAnchor="end" fill="rgb(245,158,11)" fontSize="8" fontFamily="monospace" fontWeight="bold">
              {formatCurrency(latest)}
            </text>
          </svg>
        </div>
      )}
    </div>
  );
}

// ─── Dark container wrapper ────────────────────────────────────────────────────

function DarkCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-full overflow-auto ${className}`}>
      {children}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  // BTC market data query (shared with AIAnalysis)
  const btc = useQuery<BTC>({
    queryKey: ["/api/bitcoin/market-data"],
    refetchInterval: 60000,
  });

  // BTC chart query
  const btcChart = useQuery<ChartPoint[]>({
    queryKey: ["/api/bitcoin/chart", "1D"],
    queryFn: async () => {
      const r = await fetch("/api/bitcoin/chart?timeframe=1D");
      return r.json();
    },
    refetchInterval: 60000,
  });

  // Build BitcoinMarketData for AIAnalysis from the same BTC query
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
        {/* ROW 1: Bitcoin Hero — Full Width                                  */}
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
              {/* Day range bar */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-white/[0.35] font-mono">{formatCurrency(lo)}</span>
                <div className="w-44 h-1 bg-white/[0.08] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(Math.max(posInRange, 2), 98)}%`, background: pos ? "rgb(34,197,94)" : "rgb(239,68,68)" }} />
                </div>
                <span className="text-[10px] text-white/[0.35] font-mono">{formatCurrency(hi)}</span>
              </div>
              {/* Key stats row */}
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
              <BTCChart timeframe="1D" />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ROW 2: 4-Col Macro Grid                                           */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">

          {/* Col 1: FedWatchTool */}
          <DarkCard>
            <FedWatchTool />
          </DarkCard>

          {/* Col 2: GlobalMarketIndicators */}
          <DarkCard>
            <GlobalMarketIndicators />
          </DarkCard>

          {/* Col 3: TreasuryFiscalWidget + Inflation */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-full overflow-auto">
            <TreasuryFiscalWidget />
          </div>

          {/* Col 4: UST10YTreasury + LiquidityWidget stacked */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-full overflow-auto space-y-4">
            <UST10YTreasury />
            <div className="border-t border-white/[0.06]" />
            <LiquidityWidget />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ROW 3: 3-Col Analytics Grid                                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          {/* Col 1: Fed Holdings + Derived Metrics (inline) */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-full overflow-auto">
            <p className="text-[9px] text-white/[0.3] tracking-widest uppercase font-semibold mb-3">Fed Holdings + Derived</p>
            <div className="space-y-2">
              {[
                { label: "Fed MBS", value: "$2.00T" },
                { label: "Fed Treasuries", value: "$4.41T" },
                { label: "Total Fed BS", value: "$6.72T" },
                { label: "Net Liquidity", value: "—" },
                { label: "M2 / M0 Ratio", value: "—" },
                { label: "Reserves / Fed", value: "—" },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-[10px] text-white/[0.35]">{item.label}</span>
                  <span className="text-xs font-mono font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2: AIAnalysis + AITrendPrediction */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-full overflow-auto space-y-4">
            {/* AI Analysis section — pass BTC market data */}
            <AIAnalysis marketData={marketData} isLoading={btc.isLoading} timeframe="1D" />
            <div className="border-t border-white/[0.06]" />
            {/* AI Trend Predictions */}
            <AITrendPrediction />
          </div>

          {/* Col 3: OptionsFlowWidget + WhaleAlertsWidget */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-full overflow-auto space-y-4">
            <OptionsFlowWidget />
            <div className="border-t border-white/[0.06]" />
            <WhaleAlertsWidget />
          </div>
        </div>

      </div>
    </div>
  );
}
