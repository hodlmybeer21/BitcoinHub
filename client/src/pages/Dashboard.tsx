/**
 * BitcoinHub Analytics Dashboard — Premium Component Grid
 * Dark terminal aesthetic · Amber BTC accent · Live data panels
 */

import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";

// ── Premium Components ───────────────────────────────────────────────────────
import FedWatchTool from "@/components/FedWatchTool";
import GlobalMarketIndicators from "@/components/GlobalMarketIndicators";
import TreasuryWidget from "@/components/TreasuryWidget";
import UST10YTreasury from "@/components/UST10YTreasury";
import LiquidityTracker from "@/components/LiquidityTracker";
import OptionsFlowWidget from "@/components/OptionsFlowWidget";
import AIAnalysis from "@/components/AIAnalysis";
import FearGreedWidget from "@/components/FearGreedWidget";
import WhaleAlertsWidget from "@/components/WhaleAlertsWidget";

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface AIPrediction {
  predictions?: Array<{
    timeframe: string;
    target: number;
    confidence: number;
    trend: string;
  }>;
}

interface AIAnalysisData {
  btcPrice?: number;
  rsi?: number;
  macd?: { signal: number; histogram: number; crossover: string };
  patterns?: Array<{ name: string; confidence: number; description: string }>;
  support?: number[];
  resistance?: number[];
  movingAverages?: { ma8: number; ma12: number; ma50: number; ma200: number; signal: number };
}

interface OptionsFlowData {
  putCallRatio?: number;
  totalOI?: number;
  sentiment?: string;
  totalVolume?: number;
  topContracts?: Array<{
    strike: number;
    type: string;
    openInterest: number;
    iv: number;
  }>;
}

interface WhaleAlertsData {
  transactions?: Array<{
    hash: string;
    amount: number;
    amountUSD: number;
    type: string;
    timestamp: number;
    significance: string;
  }>;
  totalVolume24h?: number;
}

interface LiquidityData {
  summary?: { overallSignal?: string; m2Growth?: string };
  indicators?: Record<string, { value: number; yoyChange?: number }>;
  derived?: { netLiq?: number; m2ToM0?: number; reservesToFed?: number };
}

interface TreasuryFiscal {
  totalDebt?: number;
  debtPerCitizen?: number;
  debtPerTaxpayer?: number;
  debtToGDP?: number;
  deficitYoY?: number;
}

interface Inflation {
  cpi?: { value: number; change: number };
  core?: { value: number };
  pce?: { value: number };
  breakeven?: string;
}

// ── BTC Chart (inline SVG) ────────────────────────────────────────────────────

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

  const W = 460, H = 140, P = 10;
  const toX = (i: number) => P + (i / Math.max(prices.length - 1, 1)) * (W - P * 2);
  const toY = (p: number) => P + (1 - (p - lo) / (hi - lo || 1)) * (H - P * 2);
  const pts = prices.map((p, i) => `${toX(i)},${toY(p)}`).join(" ");
  const area = `${P},${H - P} ${pts} ${W - P},${H - P}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] text-white/[0.3] tracking-widest uppercase font-semibold">BTC/USD Chart</span>
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
        <div className="w-full bg-white/[0.04] rounded animate-pulse" style={{ height: H }} />
      ) : (
        <div className="relative" style={{ height: H }}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(245,158,11)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="rgb(245,158,11)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={area} fill="url(#cg)" />
            <polyline points={pts} fill="none" stroke="rgb(245,158,11)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={toX(prices.length - 1)} cy={toY(latest)} r="3" fill="rgb(245,158,11)" stroke="rgb(10,10,15)" strokeWidth="1.5" />
            <text x={toX(prices.length - 1) - 4} y={toY(latest) - 6} textAnchor="end" fill="rgb(245,158,11)" fontSize="9" fontFamily="monospace" fontWeight="bold">
              {formatCurrency(latest)}
            </text>
          </svg>
        </div>
      )}
    </div>
  );
}

// ── Panel wrapper ─────────────────────────────────────────────────────────────

function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-full overflow-auto ${className}`}>
      {title && <p className="text-[9px] text-white/[0.3] tracking-widest uppercase font-semibold mb-3">{title}</p>}
      {children}
    </div>
  );
}

// ── Fed Holdings + Derived ────────────────────────────────────────────────────

function FedHoldingsPanel({ liquidity }: { liquidity?: LiquidityData }) {
  const d = liquidity?.derived;
  const items = [
    { label: "Fed MBS", value: "$2.00T" },
    { label: "Fed Treasuries", value: "$4.41T" },
    { label: "Net Liq", value: d?.netLiq != null ? `$${(d.netLiq / 1e9).toFixed(0)}B` : "—" },
    { label: "M2/M0", value: d?.m2ToM0 != null ? `${d.m2ToM0.toFixed(1)}x` : "—" },
    { label: "Rsv/Fed", value: d?.reservesToFed != null ? `${d.reservesToFed.toFixed(0)}%` : "—" },
  ];

  return (
    <Panel title="Fed Holdings + Derived">
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.label} className="flex justify-between items-center">
            <span className="text-[10px] text-white/[0.35]">{item.label}</span>
            <span className="text-xs font-mono font-semibold text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ── AI Predictions Panel ──────────────────────────────────────────────────────

function AIPredictionsPanel({ predictions }: { predictions?: AIPrediction }) {
  return (
    <Panel title="AI Price Predictions">
      {predictions?.predictions ? (
        <div className="grid grid-cols-4 gap-2">
          {predictions.predictions.map(p => (
            <div key={p.timeframe} className="bg-white/[0.04] rounded p-2 text-center">
              <p className="text-[8px] text-white/[0.3] uppercase">{p.timeframe}</p>
              <p className="text-[12px] font-mono font-bold text-amber-400">${(p.target / 1000).toFixed(0)}K</p>
              <p className={`text-[8px] ${p.trend === "bullish" ? "text-green-400" : p.trend === "bearish" ? "text-red-400" : "text-white/[0.4]"}`}>{p.trend}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-white/[0.3] text-xs py-6">Loading predictions...</div>
      )}
    </Panel>
  );
}

// ── Options Flow Panel ─────────────────────────────────────────────────────────

function OptionsPanel({ options }: { options?: OptionsFlowData }) {
  const btcOI = options?.totalOI ?? 0;
  const pct = options?.putCallRatio ?? 1;
  const sentiment = options?.sentiment || "neutral";

  return (
    <Panel title="Options Flow &amp; Whales">
      <div className="mb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <p className="text-[9px] text-white/[0.3]">P/C Ratio</p>
            <p className="text-sm font-mono font-bold text-white">{pct.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[9px] text-white/[0.3]">Open Int.</p>
            <p className="text-sm font-mono font-bold text-white">
              {btcOI >= 1e9 ? `$${(btcOI / 1e9).toFixed(1)}B` : btcOI >= 1e6 ? `$${(btcOI / 1e6).toFixed(0)}M` : btcOI.toFixed(0)}
            </p>
          </div>
          <div className={`px-2 py-1 rounded text-[10px] font-bold ${sentiment === "bullish" ? "bg-green-400/15 text-green-400" : sentiment === "bearish" ? "bg-red-400/15 text-red-400" : "bg-white/[0.08] text-white/[0.5]"}`}>
            {sentiment.toUpperCase()}
          </div>
        </div>
        {options?.topContracts?.slice(0, 4).map((c, i) => (
          <div key={i} className="flex items-center justify-between mt-1.5 text-[10px] font-mono">
            <span className="text-white/[0.5]">{c.strike.toLocaleString()}</span>
            <span className={c.type === "call" ? "text-green-400" : "text-red-400"}>{c.type.toUpperCase()}</span>
            <span className="text-white/[0.4]">{c.openInterest >= 1e6 ? `${(c.openInterest / 1e6).toFixed(1)}M` : c.openInterest}</span>
            <span className="text-white/[0.3]">{(c.iv * 100).toFixed(0)}% IV</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ── Treasury + Inflation Panel ───────────────────────────────────────────────

function TreasuryInflationPanel({ fiscal, inflation }: { fiscal?: TreasuryFiscal; inflation?: Inflation }) {
  return (
    <Panel title="US Treasury &amp; Inflation">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
        {[
          ["Debt", fiscal?.totalDebt ? `$${(fiscal.totalDebt / 1e12).toFixed(1)}T` : "—"],
          ["Per Citizen", fiscal?.debtPerCitizen ? `$${(fiscal.debtPerCitizen / 1e3).toFixed(0)}K` : "—"],
          ["Per Taxpayer", fiscal?.debtPerTaxpayer ? `$${(fiscal.debtPerTaxpayer / 1e3).toFixed(0)}K` : "—"],
          ["Debt/GDP", fiscal?.debtToGDP ? `${fiscal.debtToGDP.toFixed(0)}%` : "—"],
        ].map(([label, val]) => (
          <div key={label as string}>
            <p className="text-[9px] text-white/[0.3]">{label}</p>
            <p className="text-xs font-mono font-semibold text-white">{val}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-white/[0.06] pt-2 space-y-1">
        <p className="text-[9px] text-white/[0.3] tracking-widest uppercase mb-1">Inflation</p>
        {[
          ["CPI YoY", inflation?.cpi?.value, inflation?.cpi?.change],
          ["Core CPI", inflation?.core?.value, null],
          ["PCE YoY", inflation?.pce?.value, null],
          ["Breakeven", inflation?.breakeven ? `${inflation.breakeven}%` : null, null],
        ].map(([label, val, chg]) => (
          <div key={label as string} className="flex justify-between items-center">
            <span className="text-[10px] text-white/[0.35]">{label}</span>
            <span className="text-xs font-mono font-semibold text-white">
              {val != null ? `${val.toFixed(1)}%` : "—"}
              {chg != null && <span className={`text-[9px] ml-1 ${chg >= 0 ? "text-red-400" : "text-green-400"}`}>{chg >= 0 ? "+" : ""}{chg.toFixed(1)}%</span>}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ── 10Y + Liquidity Panel ─────────────────────────────────────────────────────

function TreasuryLiquidityPanel({ liquidity }: { liquidity?: LiquidityData }) {
  const signal = liquidity?.summary?.overallSignal || "neutral";
  const signalColor = signal === "expansionary" ? "text-green-400" : signal === "contractionary" ? "text-red-400" : "text-yellow-400";

  const liqItems = liquidity?.indicators
    ? Object.entries(liquidity.indicators).slice(0, 4)
    : [];

  return (
    <Panel title="10Y Treasury &amp; Liquidity">
      <div className="space-y-1.5">
        {liqItems.map(([key, item]) => {
          const yoy = item.yoyChange;
          return (
            <div key={key} className="flex items-center justify-between">
              <span className="text-[10px] text-white/[0.35] uppercase">{key}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-white">
                  {item.value >= 1e12 ? `$${(item.value / 1e12).toFixed(2)}T`
                    : item.value >= 1e9 ? `$${(item.value / 1e9).toFixed(0)}B`
                    : item.value >= 1e6 ? `$${(item.value / 1e6).toFixed(0)}M`
                    : `$${item.value.toFixed(0)}`}
                </span>
                {yoy != null && (
                  <span className={`text-[9px] font-mono ${yoy >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {yoy >= 0 ? "+" : ""}{yoy.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div className={`pt-1 text-[10px] font-bold uppercase tracking-wider ${signalColor}`}>
          {signal === "expansionary" ? "↑ Liquidity Expanding" : signal === "contractionary" ? "↓ Liquidity Contracting" : "→ Neutral"}
        </div>
      </div>
    </Panel>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  // ── Data Queries ────────────────────────────────────────────────────────────
  const btc = useQuery<BTC>({ queryKey: ["/api/bitcoin/market-data"], refetchInterval: 60000 });
  const fear = useQuery({ queryKey: ["/api/web-resources/fear-greed"], refetchInterval: 300000 });
  const whales = useQuery<WhaleAlertsData>({ queryKey: ["/api/whale-alerts"], refetchInterval: 60000 });
  const fiscal = useQuery<TreasuryFiscal>({ queryKey: ["/api/financial/treasury-fiscal"], refetchInterval: 60000 });
  const inflation = useQuery<Inflation>({ queryKey: ["/api/inflation"], refetchInterval: 300000 });
  const liquidity = useQuery<LiquidityData>({ queryKey: ["/api/liquidity"], refetchInterval: 60000 });
  const options = useQuery<OptionsFlowData>({ queryKey: ["/api/options-flow"], refetchInterval: 60000 });
  const aiAnalysis = useQuery<AIAnalysisData>({ queryKey: ["/api/ai/analysis"], refetchInterval: 60000 });
  const aiPredictions = useQuery<AIPrediction>({ queryKey: ["/api/ai/multi-timeframe-predictions"], refetchInterval: 60000 });

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

        {/* ── Row 1: Bitcoin Hero Strip ───────────────────────────────────── */}
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
              {/* Stats row */}
              <div className="flex gap-4 text-[10px] font-mono text-white/[0.4]">
                <span>MCap <span className="text-white">{m?.market_cap?.usd ? `$${(m.market_cap.usd / 1e12).toFixed(2)}T` : "—"}</span></span>
                <span>Volume <span className="text-white">{m?.total_volume?.usd ? `$${(m.total_volume.usd / 1e9).toFixed(1)}B` : "—"}</span></span>
                <span>BTC Dom <span className="text-white">{m?.btc_dominance?.toFixed(1) ?? "—"}%</span></span>
              </div>
            </div>

            {/* Center: BTC Chart */}
            <div className="lg:col-span-1">
              <BTCChart timeframe="1D" />
            </div>

            {/* Right: Fear & Greed */}
            <div>
              <div className="bg-white/[0.04] rounded-xl p-4 h-full flex items-center justify-center">
                <FearGreedWidget />
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 2: 4-column grid ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          {/* FedWatchTool */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 overflow-auto">
            <p className="text-[9px] text-white/[0.2] tracking-widest uppercase font-semibold mb-2">Fed Watch</p>
            <div className="[&_div]:bg-transparent [&_div]:border-0 [&_div]:p-0 [&_.card]:bg-transparent [&_.card]:border-0 [&_h3]:text-white [&_h3]:text-sm [&_.text-muted-foreground]:text-white/40">
              <FedWatchTool />
            </div>
          </div>

          {/* GlobalMarketIndicators */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 overflow-auto">
            <p className="text-[9px] text-white/[0.2] tracking-widest uppercase font-semibold mb-2">Global Markets</p>
            <div className="[&_div]:bg-transparent [&_div]:border-0 [&_div]:p-0 [&_.card]:bg-transparent [&_.card]:border-0 [&_.card-title]:text-white [&_.text-muted-foreground]:text-white/40">
              <GlobalMarketIndicators />
            </div>
          </div>

          {/* Treasury + Inflation */}
          <TreasuryInflationPanel fiscal={fiscal.data} inflation={inflation.data} />

          {/* 10Y Treasury + Liquidity */}
          <div className="grid grid-rows-2 gap-4">
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 overflow-auto">
              <UST10YTreasury />
            </div>
            <TreasuryLiquidityPanel liquidity={liquidity.data} />
          </div>
        </div>

        {/* ── Row 3: 3-column grid ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Fed Holdings + Derived */}
          <FedHoldingsPanel liquidity={liquidity.data} />

          {/* AI Predictions + Analysis */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 overflow-auto">
            <p className="text-[9px] text-white/[0.2] tracking-widest uppercase font-semibold mb-3">AI Analysis &amp; Predictions</p>
            <div className="[&_.card]:bg-transparent [&_.card]:border-0">
              <AIAnalysis marketData={null} isLoading={aiAnalysis.isLoading} timeframe="1D" />
            </div>
          </div>

          {/* Options Flow + Whales */}
          <OptionsPanel options={options.data} />
        </div>

        {/* ── Bottom: Whale Alerts + Liquidity Tracker ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 overflow-auto">
            <p className="text-[9px] text-white/[0.2] tracking-widest uppercase font-semibold mb-3">Whale Transactions</p>
            <WhaleAlertsWidget />
          </div>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 overflow-auto">
            <p className="text-[9px] text-white/[0.2] tracking-widest uppercase font-semibold mb-3">Liquidity Tracker</p>
            <div className="[&_.card]:bg-transparent [&_.card]:border-0 [&_.card-header]:p-0 [&_.card-content]:p-0">
              <LiquidityTracker />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}