/**
 * BitcoinHub Trading Terminal
 * Professional Bitcoin + Macro dashboard — IntoTheCryptoverse level
 * Dark terminal aesthetic · Amber BTC accent · Dense data · No decoration
 */

import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BTC {
  current_price?: { usd: number };
  market_cap?: { usd: number };
  total_volume?: { usd: number };
  price_change_percentage_24h?: number;
  circulating_supply?: number;
  ath?: { usd: number };
  high_24h?: { usd: number };
  low_24h?: { usd: number };
}

interface ChartPoint { timestamp: string; price: number }

interface FearGreed {
  currentValue: number;
  classification: string;
  yesterday: number;
}

interface WhaleAlerts {
  transactions: Array<{
    hash: string;
    amount: number;
    amountUSD: number;
    type: string;
    timestamp: number;
  }>;
}

interface Macro {
  spx?: { value: number; change: number };
  dxy?: { value: number; change: number };
  gold?: { value: number; change: number };
  vix?: { value: number; change: number };
}

interface NetworkStats {
  hashRateEH?: number;
  difficulty?: number;
  avgBlockTime?: number;
}

interface GlobalMetrics {
  totalMarketCap?: number;
  btcDominance?: number;
  ethDominance?: number;
  total24hVolume?: number;
}

interface Liquidity {
  summary?: { overallSignal?: string; m2Growth?: string };
  indicators?: {
    m2?: { value: number; change: number };
    rrp?: { value: number };
    tga?: { value: number };
    fedBalance?: { value: number };
  };
}

interface FundingRates {
  latestRate?: number;
  avg24h?: number;
  nextFundingTime?: string;
}

interface OptionsFlow {
  btc?: {
    putCallRatio: number;
    totalOI: number;
    sentiment: string;
    totalVolume: number;
    netDelta: number;
    putCallVolumeRatio: number;
  };
  eth?: {
    putCallRatio: number;
    totalOI: number;
    sentiment: string;
    totalVolume: number;
    netDelta: number;
  };
  topStrikes?: Array<{
    symbol: string;
    strike: number;
    type: string;
    openInterest: number;
    volume: number;
    iv: number;
  }>;
}

interface Treasury {
  yield?: number;
  change?: number;
  keyLevels?: { low52Week: number; current: number; high52Week: number };
}

interface Inflation {
  cpi?: { value: number; change: number };
  pce?: { value: number };
  core?: { value: number };
  breakeven?: string;
}

// ─── Signal Engine ────────────────────────────────────────────────────────────

interface Signal {
  key: string;
  label: string;
  bullish: boolean;
  value: string;
}

function useSignal(
  market?: BTC,
  fear?: FearGreed,
  whales?: WhaleAlerts,
  macro?: Macro,
  funding?: FundingRates
): { score: number; max: number; verdict: string; color: string; bg: string; pct: number; signals: Signal[] } {
  return useMemo(() => {
    const signals: Signal[] = [];

    // 1. Fear & Greed — extreme fear (<30) = bullish
    if (fear) {
      signals.push({
        key: "F&G",
        label: "Fear & Greed",
        bullish: fear.currentValue < 30,
        value: `${fear.currentValue} — ${fear.classification}`,
      });
    }

    // 2. 24h Price positive
    if (market) {
      const chg = market.price_change_percentage_24h || 0;
      signals.push({
        key: "MOMO",
        label: "Momentum",
        bullish: chg >= 0,
        value: formatPercentage(chg),
      });
    }

    // 3. BTC Momentum >1% = extra bullish signal
    if (market) {
      const chg = market.price_change_percentage_24h || 0;
      if (chg > 1) {
        signals.push({ key: "STRONG", label: "Strong Momentum", bullish: true, value: "+Strong" });
      }
    }

    // 4. Whale outflows vs inflows
    if (whales?.transactions?.length) {
      const out = whales.transactions.filter(t => t.type === "exchange_outflow").length;
      const inn = whales.transactions.filter(t => t.type === "exchange_inflow").length;
      signals.push({
        key: "WHALE",
        label: "Whale Pressure",
        bullish: out > inn,
        value: `${out}↑ / ${inn}↓`,
      });
    }

    // 5. S&P 500 positive = risk-on
    if (macro?.spx) {
      signals.push({
        key: "SPX",
        label: "S&P 500",
        bullish: macro.spx.change >= 0,
        value: `${macro.spx.change >= 0 ? "+" : ""}${macro.spx.change.toFixed(2)}%`,
      });
    }

    // 6. Funding Rate negative = shorts paying longs = bullish
    if (funding) {
      signals.push({
        key: "FUND",
        label: "Funding Rate",
        bullish: (funding.latestRate ?? 0) < 0,
        value: `${(funding.latestRate ?? 0) >= 0 ? "+" : ""}${((funding.latestRate ?? 0) * 100).toFixed(2)}%/8h`,
      });
    }

    const score = signals.filter(s => s.bullish).length;
    const max = signals.length;
    const pct = Math.round((score / Math.max(max, 1)) * 100);

    let verdict: string, color: string, bg: string;
    if (score >= Math.floor(max * 0.7)) {
      verdict = "BUY";
      color = "text-green-400";
      bg = "bg-green-500";
    } else if (score >= Math.floor(max * 0.4)) {
      verdict = "SIT";
      color = "text-yellow-400";
      bg = "bg-yellow-500";
    } else {
      verdict = "SELL";
      color = "text-red-400";
      bg = "bg-red-500";
    }

    return { score, max, verdict, color, bg, pct, signals };
  }, [market, fear, whales, macro, funding]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtM(val: number) {
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  return `$${val.toFixed(0)}`;
}

function fmtBps(v: number) {
  const bps = v * 10000;
  return `${bps >= 0 ? "+" : ""}${bps.toFixed(1)}bps`;
}

// ─── Scoreboard ────────────────────────────────────────────────────────────────

function Scoreboard({ data, lastUpdate, onRefresh }: {
  data?: BTC;
  lastUpdate: Date;
  onRefresh: () => void;
}) {
  const price = data?.current_price?.usd || 0;
  const chg = data?.price_change_percentage_24h || 0;
  const pos = chg >= 0;
  const lo = data?.low_24h?.usd || 0;
  const hi = data?.high_24h?.usd || 0;
  const range = hi - lo || 1;
  const posInRange = ((price - lo) / range) * 100;

  return (
    <div className="border-b border-white/[0.07] pb-4 mb-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-black tracking-[0.2em] text-amber-400 uppercase">BitcoinHub</span>
          <span className="text-[9px] text-white/[0.25] tracking-widest uppercase">Trading Terminal</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/[0.3] font-mono">
            {lastUpdate.toUTCString().slice(17, 25)} UTC
          </span>
          <button
            onClick={onRefresh}
            className="text-white/[0.3] hover:text-white/[0.6] transition-colors"
          >
            <RefreshCw size={11} />
          </button>
        </div>
      </div>

      <div className="flex items-end gap-5 flex-wrap">
        {/* Price */}
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-mono font-black text-amber-400 tracking-tight">
              {formatCurrency(price)}
            </span>
            <div className={`flex items-center gap-0.5 mb-1 ${pos ? "text-green-400" : "text-red-400"}`}>
              {pos ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              <span className="text-base font-mono font-bold">{formatPercentage(chg)}</span>
            </div>
          </div>
          {/* Day range bar */}
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[10px] text-white/[0.35] font-mono">{formatCurrency(lo)}</span>
            <div className="w-48 h-1 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(Math.max(posInRange, 2), 98)}%`,
                  background: pos ? "rgb(34,197,94)" : "rgb(239,68,68)",
                }}
              />
            </div>
            <span className="text-[10px] text-white/[0.35] font-mono">{formatCurrency(hi)}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-5 flex-wrap">
          {[
            ["24h High", formatCurrency(hi), "text-green-400"],
            ["24h Low", formatCurrency(lo), "text-red-400"],
            ["Volume", fmtM(data?.total_volume?.usd || 0), "text-white/[0.6]"],
            ["MCap", fmtM(data?.market_cap?.usd || 0), "text-white/[0.6]"],
          ].map(([label, value, color]) => (
            <div key={label as string}>
              <p className="text-[9px] text-white/[0.3] tracking-widest uppercase">{label}</p>
              <p className={`text-sm font-mono font-semibold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Signal Bar ───────────────────────────────────────────────────────────────

function SignalBar({ market, fear, whales, macro, funding }: {
  market?: BTC;
  fear?: FearGreed;
  whales?: WhaleAlerts;
  macro?: Macro;
  funding?: FundingRates;
}) {
  const { score, max, verdict, color, bg, pct, signals } = useSignal(market, fear, whales, macro, funding);

  return (
    <div className="py-3 border-b border-white/[0.07] mb-4">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Verdict pill */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${bg}/15 border ${bg}/30`}>
          <span className={`text-lg font-black font-mono ${color}`}>{verdict}</span>
          <span className="text-[10px] text-white/[0.4] font-mono">{score}/{max}</span>
        </div>

        {/* Progress bar */}
        <div className="flex-1 min-w-32">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-white/[0.3] tracking-widest uppercase">Signal Strength</span>
            <span className={`text-[10px] font-mono font-bold ${color}`}>{pct}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${bg}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Signal badges */}
        <div className="flex gap-2 flex-wrap">
          {signals.map(s => (
            <div
              key={s.key}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                s.bullish
                  ? "bg-green-400/10 border-green-400/20 text-green-400"
                  : "bg-red-400/10 border-red-400/20 text-red-400"
              }`}
            >
              <span>{s.bullish ? "↑" : "↓"}</span>
              <span>{s.key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── BTC Chart ───────────────────────────────────────────────────────────────

function BTCChart() {
  const [tf, setTf] = useState("1D");
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

  const W = 920, H = 220, P = 10;
  const toX = (i: number) => P + (i / Math.max(prices.length - 1, 1)) * (W - P * 2);
  const toY = (p: number) => P + (1 - (p - lo) / (hi - lo || 1)) * (H - P * 2);
  const pts = prices.map((p, i) => `${toX(i)},${toY(p)}`).join(" ");
  const area = `${P},${H - P} ${pts} ${W - P},${H - P}`;

  // Support = 5th pct, Resistance = 95th pct
  const sorted = [...prices].sort((a, b) => a - b);
  const sup5 = sorted[Math.floor(sorted.length * 0.05)] || lo;
  const res95 = sorted[Math.floor(sorted.length * 0.95)] || hi;
  const supY = toY(sup5);
  const resY = toY(res95);

  return (
    <div>
      {/* Header */}
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

      {/* Chart */}
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

            {/* Support line */}
            <line
              x1={P} y1={supY} x2={W - P} y2={supY}
              stroke="rgb(34,197,94)" strokeWidth="1" strokeDasharray="4,4" opacity="0.6"
            />
            {/* Resistance line */}
            <line
              x1={P} y1={resY} x2={W - P} y2={resY}
              stroke="rgb(239,68,68)" strokeWidth="1" strokeDasharray="4,4" opacity="0.6"
            />

            {/* Area fill */}
            <polygon points={area} fill="url(#chartFill)" />

            {/* Line */}
            <polyline
              points={pts}
              fill="none"
              stroke="rgb(245,158,11)"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Current price dot */}
            <circle
              cx={toX(prices.length - 1)}
              cy={toY(latest)}
              r="4"
              fill="rgb(245,158,11)"
              stroke="rgb(10,10,15)"
              strokeWidth="2"
            />

            {/* High label */}
            <text x={W - P} y={resY - 4} textAnchor="end" fill="rgb(239,68,68)" fontSize="9" fontFamily="monospace" opacity="0.8">
              {formatCurrency(res95)}
            </text>
            {/* Low label */}
            <text x={W - P} y={supY + 12} textAnchor="end" fill="rgb(34,197,94)" fontSize="9" fontFamily="monospace" opacity="0.8">
              {formatCurrency(sup5)}
            </text>
            {/* Latest price label */}
            <text
              x={toX(prices.length - 1) - 6}
              y={toY(latest) - 8}
              textAnchor="end"
              fill="rgb(245,158,11)"
              fontSize="10"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {formatCurrency(latest)}
            </text>
          </svg>
        </div>
      )}

      {/* Price range labels */}
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

// ─── Fear & Greed Gauge ───────────────────────────────────────────────────────

function FearGreedGauge({ data }: { data?: FearGreed }) {
  const v = data?.currentValue ?? 50;
  const gaugeColor = v < 30 ? "#22c55e" : v < 45 ? "#eab308" : v < 55 ? "#f97316" : v < 70 ? "#ef4444" : "#dc2626";
  const label = data?.classification || "—";
  const diff = (data?.currentValue ?? 50) - (data?.yesterday ?? 50);
  const diffPos = diff >= 0;

  return (
    <div>
      <p className="text-[9px] text-white/[0.3] tracking-widest uppercase font-semibold mb-2">Fear & Greed</p>
      <div className="flex items-center gap-3">
        {/* SVG Gauge */}
        <div className="relative w-16 h-16 shrink-0">
          <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
            <circle cx="32" cy="32" r="26" fill="none" stroke="white" strokeWidth="5" opacity="0.08" />
            <circle
              cx="32" cy="32" r="26" fill="none"
              stroke={gaugeColor}
              strokeWidth="5"
              strokeDasharray={`${v * 1.63} 163`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-black font-mono" style={{ color: gaugeColor }}>{v}</span>
          </div>
        </div>

        {/* Labels */}
        <div>
          <p className="text-sm font-bold" style={{ color: gaugeColor }}>{label}</p>
          <p className="text-[10px] text-white/[0.4] mt-0.5">
            Yest.{" "}
            <span className="text-white/[0.6] font-mono">{data?.yesterday ?? "—"}</span>
          </p>
          <p className={`text-[10px] font-mono mt-0.5 ${diffPos ? "text-green-400" : "text-red-400"}`}>
            {diffPos ? "+" : ""}{diff.toFixed(0)} pts
          </p>
        </div>
      </div>

      {/* Scale labels */}
      <div className="mt-2 flex justify-between text-[8px] text-white/[0.2] font-mono">
        <span>Fear</span>
        <span>Neut.</span>
        <span>Greed</span>
      </div>
    </div>
  );
}

// ─── Funding Rate ─────────────────────────────────────────────────────────────

function FundingCard({ data }: { data?: FundingRates }) {
  const r = data?.latestRate ?? 0;
  const r8h = r * 100;
  const isHigh = r > 0.01;
  const isNeg = r < 0;
  const color = isNeg ? "text-green-400" : isHigh ? "text-red-400" : "text-white/[0.6]";

  return (
    <div>
      <p className="text-[9px] text-white/[0.3] tracking-widest uppercase font-semibold mb-2">
        Funding Rate (8h)
      </p>
      <div className="flex items-end gap-2">
        <span className={`text-2xl font-mono font-black ${color}`}>
          {r >= 0 ? "+" : ""}{r8h.toFixed(2)}%
        </span>
        {isHigh && (
          <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-semibold mb-0.5">⚠ HIGH</span>
        )}
        {isNeg && (
          <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-semibold mb-0.5">SHORTS PAY</span>
        )}
      </div>
      <div className="mt-1.5 text-[10px] text-white/[0.4]">
        Avg 24h:{" "}
        <span className="text-white/[0.6] font-mono">{((data?.avg24h ?? 0) * 100).toFixed(2)}%</span>
      </div>
      <div className="mt-0.5 text-[9px] text-white/[0.25]">
        Binance · Next:{" "}
        {data?.nextFundingTime
          ? new Date(data.nextFundingTime).toLocaleTimeString()
          : "—"}
      </div>
    </div>
  );
}

// ─── Options Flow ─────────────────────────────────────────────────────────────

function OptionsCard({ data }: { data?: OptionsFlow }) {
  const btc = data?.btc;
  if (!btc) return <Skeleton className="h-full w-full" />;

  const sentimentColor = btc.sentiment === "bullish" ? "text-green-400" : "text-red-400";
  const strikes = data?.topStrikes?.slice(0, 5) || [];

  return (
    <div>
      <p className="text-[9px] text-white/[0.3] tracking-widest uppercase font-semibold mb-2">Options Flow · Deribit</p>

      {/* Summary row */}
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <div>
          <p className="text-[9px] text-white/[0.3]">P/C Ratio</p>
          <p className="text-sm font-mono font-bold text-white">{btc.putCallRatio.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[9px] text-white/[0.3]">Open Int.</p>
          <p className="text-sm font-mono font-bold text-white">{fmtM(btc.totalOI)}</p>
        </div>
        <div>
          <p className="text-[9px] text-white/[0.3]">Volume</p>
          <p className="text-sm font-mono font-bold text-white">{fmtM(btc.totalVolume)}</p>
        </div>
        <div className={`px-2 py-1 rounded text-[10px] font-bold ${btc.sentiment === "bullish" ? "bg-green-400/15 text-green-400" : "bg-red-400/15 text-red-400"}`}>
          {btc.sentiment.toUpperCase()}
        </div>
      </div>

      {/* Top Strikes table */}
      {strikes.length > 0 && (
        <div className="space-y-0.5">
          <div className="flex text-[8px] text-white/[0.25] font-mono uppercase tracking-wider">
            <span className="flex-1">Strike</span>
            <span className="w-10 text-center">Type</span>
            <span className="w-14 text-right">OI</span>
            <span className="w-12 text-right">IV</span>
          </div>
          {strikes.map((s, i) => (
            <div key={i} className="flex items-center text-[10px] font-mono">
              <span className="flex-1 text-white/[0.7]">{s.strike.toLocaleString()}</span>
              <span className={`w-10 text-center text-[9px] font-bold ${s.type === "call" ? "text-green-400" : "text-red-400"}`}>
                {s.type.toUpperCase()}
              </span>
              <span className="w-14 text-right text-white/[0.6]">{fmtM(s.openInterest)}</span>
              <span className="w-12 text-right text-white/[0.4]">{(s.iv * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Whale Pulse ─────────────────────────────────────────────────────────────

function WhalePulse({ data }: { data?: WhaleAlerts }) {
  const txs = data?.transactions?.slice(0, 5) || [];
  const out = txs.filter(t => t.type === "exchange_outflow").length;
  const inn = txs.filter(t => t.type === "exchange_inflow").length;
  const net = out - inn;

  return (
    <div>
      <p className="text-[9px] text-white/[0.3] tracking-widest uppercase font-semibold mb-2">Whale Transactions</p>
      <div className="flex gap-3 text-[10px] font-mono mb-2">
        <span className="text-green-400">↑ {out} outflows</span>
        <span className="text-red-400">↓ {inn} inflows</span>
        <span className={net > 0 ? "text-green-400" : net < 0 ? "text-red-400" : "text-white/[0.4]"}>
          Net {net > 0 ? "+" : ""}{net}
        </span>
      </div>
      <div className="space-y-0.5">
        {txs.map(tx => (
          <div key={tx.hash} className="flex items-center gap-2 text-[10px] font-mono">
            <span className="text-white/[0.25] w-8 truncate">{tx.hash.slice(0, 6)}…</span>
            <span className={tx.type === "exchange_outflow" ? "text-green-400" : "text-red-400"}>
              {tx.type === "exchange_outflow" ? "↑" : "↓"}
            </span>
            <span className="text-white/[0.7] w-16">{tx.amount.toFixed(3)} BTC</span>
            <span className="text-white/[0.35]">${(tx.amountUSD / 1000).toFixed(0)}K</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── On-Chain Snapshot ────────────────────────────────────────────────────────

function OnChainCard({ data }: { data?: NetworkStats }) {
  if (!data) return <Skeleton className="h-full w-full" />;

  return (
    <div>
      <p className="text-[9px] text-white/[0.3] tracking-widest uppercase font-semibold mb-2">On-Chain Snapshot</p>
      <div className="space-y-1.5">
        {[
          ["Hash Rate", data.hashRateEH ? `${data.hashRateEH.toFixed(1)} EH/s` : "—", "text-white/[0.7]"],
          ["Difficulty", data.difficulty ? `${(data.difficulty / 1e12).toFixed(1)}T` : "—", "text-white/[0.7]"],
          ["Block Time", data.avgBlockTime ? `${data.avgBlockTime.toFixed(1)}m` : "—", "text-white/[0.7]"],
        ].map(([label, value, color]) => (
          <div key={label as string} className="flex justify-between items-center">
            <span className="text-[10px] text-white/[0.35]">{label}</span>
            <span className={`text-xs font-mono font-semibold ${color}`}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Macro Tile ────────────────────────────────────────────────────────────────

function MacroTile({ label, value, change, inverse = false }: {
  label: string;
  value: number;
  change: number;
  inverse?: boolean;
}) {
  const isPos = change >= 0;
  // For risk assets: positive = green. For DXY: negative = green (USD weakening = risk-on)
  const isGood = inverse ? !isPos : isPos;
  const color = isGood ? "text-green-400" : "text-red-400";

  return (
    <div>
      <p className="text-[9px] text-white/[0.3] tracking-widest uppercase mb-1">{label}</p>
      <p className="text-base font-mono font-black text-white">{value.toLocaleString()}</p>
      <p className={`text-[11px] font-mono font-semibold ${color}`}>
        {isPos ? "+" : ""}{change.toFixed(2)}%
      </p>
    </div>
  );
}

// ─── Global Metrics ───────────────────────────────────────────────────────────

function GlobalMetricsStrip({ data }: { data?: GlobalMetrics }) {
  if (!data) return <Skeleton className="h-20 w-full" />;
  const altDom = (data.btcDominance && data.ethDominance) ? (100 - data.btcDominance - data.ethDominance).toFixed(0) : "—";
  return (
    <div>
      <p className="text-[9px] text-white/[0.3] tracking-widest uppercase font-semibold mb-2">Global Metrics</p>
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-white/[0.35]">BTC Dom.</span>
          <span className="text-[11px] font-mono font-semibold text-white/[0.7]">{data.btcDominance ? `${data.btcDominance.toFixed(1)}%` : "—"}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-white/[0.35]">ETH Dom.</span>
          <span className="text-[11px] font-mono font-semibold text-white/[0.7]">{data.ethDominance ? `${data.ethDominance.toFixed(1)}%` : "—"}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-white/[0.35]">Total Cap</span>
          <span className="text-[11px] font-mono font-semibold text-white/[0.7]">{data.totalMarketCap ? fmtM(data.totalMarketCap) : "—"}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-white/[0.35]">24h Vol</span>
          <span className="text-[11px] font-mono font-semibold text-white/[0.7]">{data.total24hVolume ? fmtM(data.total24hVolume) : "—"}</span>
        </div>
      </div>
      {data.btcDominance ? (
        <div className="mt-2">
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${data.btcDominance}%` }} />
          </div>
          <div className="flex justify-between text-[8px] text-white/[0.2] mt-0.5">
            <span>BTC {data.btcDominance.toFixed(0)}%</span>
            <span>ETH {data.ethDominance ? data.ethDominance.toFixed(0) : "—"}%</span>
            <span>Alt {altDom}%</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
// ─── Treasury & Inflation ───────────────────────────────────────────────────────

  function TreasuryCard({ treasury, inflation }: { treasury?: Treasury; inflation?: Inflation }) {
    if (!treasury) return <Skeleton className="h-20 w-full" />;
    const y = treasury.yield ?? 0;
    const chg = treasury.change ?? 0;
    const low = treasury.keyLevels?.low52Week ?? 0;
    const high = treasury.keyLevels?.high52Week ?? 5;
    const yPos = ((y - low) / (high - low || 1)) * 100;
    const realYield = y - (inflation?.cpi?.value ?? 0);

    return (
      <div>
        <p className="text-[9px] text-white/[0.3] tracking-widest uppercase font-semibold mb-2">Treasury &amp; Inflation</p>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <p className="text-[9px] text-white/[0.3]">10Y Yield</p>
            <div className="flex items-end gap-1">
              <span className="text-xl font-mono font-black text-white">{y.toFixed(2)}%</span>
              <span className={`text-[11px] font-mono mb-0.5 ${chg >= 0 ? "text-green-400" : "text-red-400"}`}>{fmtBps(chg)}</span>
            </div>
          </div>
          {inflation?.cpi && <div><p className="text-[9px] text-white/[0.3]">CPI YoY</p><p className="text-sm font-mono font-bold text-white">{inflation.cpi.value.toFixed(1)}%</p></div>}
          {inflation?.core && <div><p className="text-[9px] text-white/[0.3]">Core CPI</p><p className="text-sm font-mono font-bold text-white">{inflation.core.value.toFixed(1)}%</p></div>}
          {inflation?.pce && <div><p className="text-[9px] text-white/[0.3]">PCE YoY</p><p className="text-sm font-mono font-bold text-white">{inflation.pce.value.toFixed(1)}%</p></div>}
          <div><p className="text-[9px] text-white/[0.3]">Real Yield</p><p className={`text-sm font-mono font-bold ${realYield >= 0 ? "text-green-400" : "text-red-400"}`}>{realYield.toFixed(2)}%</p></div>
        </div>
        {/* 52W yield range */}
        <div className="mt-2">
          <div className="relative h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="absolute left-0 top-0 h-full bg-white/[0.04] rounded-full" style={{ width: "100%" }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full" style={{ left: `${Math.min(Math.max(yPos, 2), 98)}%`, transform: "translateX(-50%)" }} />
          </div>
          <div className="flex justify-between text-[8px] text-white/[0.25] font-mono mt-0.5">
            <span>{low.toFixed(2)}%</span>
            <span className="text-amber-400/60">52W Range</span>
            <span>{high.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── Liquidity Card ─────────────────────────────────────────────────────────────

  function LiquidityCard({ data }: { data?: Liquidity }) {
    if (!data) return <Skeleton className="h-20 w-full" />;
    const m2 = data.indicators?.m2;
    const signal = data.summary?.overallSignal || "neutral";

    return (
      <div>
        <p className="text-[9px] text-white/[0.3] tracking-widest uppercase font-semibold mb-2">Liquidity Signal</p>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-white/[0.35]">M2 Growth</span>
            <span className={`text-xs font-mono font-semibold ${signal === "expansionary" ? "text-green-400" : signal === "contractionary" ? "text-red-400" : "text-yellow-400"}`}>
              {data.summary?.m2Growth || "0.0"}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-white/[0.35]">Fed Balance</span>
            <span className="text-xs font-mono font-semibold text-white/[0.7]">
              {data.indicators?.fedBalance?.value ? `$${(data.indicators.fedBalance.value / 1e9).toFixed(0)}B` : "—"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-white/[0.35]">RRP</span>
            <span className="text-xs font-mono font-semibold text-white/[0.7]">
              {data.indicators?.rrp?.value ? `$${(data.indicators.rrp.value / 1e9).toFixed(0)}B` : "—"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-white/[0.35]">TGA</span>
            <span className="text-xs font-mono font-semibold text-white/[0.7]">
              {data.indicators?.tga?.value ? `$${(data.indicators.tga.value / 1e9).toFixed(0)}B` : "—"}
            </span>
          </div>
          <div className="mt-1 pt-1 border-t border-white/[0.06]">
            <div className={`text-[10px] font-bold uppercase tracking-wider ${
              signal === "expansionary" ? "text-green-400" : signal === "contractionary" ? "text-red-400" : "text-yellow-400"
            }`}>
              {signal === "expansionary" ? "↑ Liquidity Expanding" : signal === "contractionary" ? "↓ Liquidity Contracting" : "→ Neutral"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Dashboard ───────────────────────────────────────────────────────────

  
// ─── Row 2, Col 1: Fed Watch Panel ───────────────────────────────────────────

function FedWatchPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/financial/fedwatch"],
    queryFn: async () => { const r = await fetch("/api/financial/fedwatch"); return r.json(); },
    refetchInterval: 300000,
  });
  if (isLoading || !data) return <Panel title="Fed Watch Tool"><Skeleton className="h-32 w-full" /></Panel>;
  const mo = data.futureOutlook?.oneMonth;
  return (
    <Panel title="Fed Watch Tool" badge={[{ text: "Next: " + (data.nextMeeting || "—"), color: "bg-blue-500/20 text-blue-400" }]}>
      <div className="mb-3">
        <p className="text-[9px] text-white/[0.3] uppercase mb-0.5">Current Target Rate</p>
        <p className="text-2xl font-mono font-black text-white">{data.currentRate || "—"} <span className="text-sm text-white/[0.4]">bps</span></p>
      </div>
      {data.probabilities && data.probabilities.length > 0 && (
        <div className="mb-3">
          <p className="text-[9px] text-white/[0.3] uppercase mb-2">Meeting Probabilities</p>
          <div className="space-y-1.5">{data.probabilities.map((p: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-white/[0.5] w-14 font-mono">{p.rate}</span>
              <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: p.probability + "%", background: i === 0 ? "rgb(59,130,246)" : "rgb(96,165,250)" }} />
              </div>
              <span className="text-[10px] font-mono font-semibold text-white w-10 text-right">{p.probability}%</span>
            </div>
          ))}</div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/[0.04] rounded-lg p-2">
          <p className="text-[9px] text-white/[0.3] uppercase mb-1">1W Outlook</p>
          <div className="space-y-0.5">
            <div className="flex justify-between"><span className="text-[10px] text-white/[0.5]">No Change</span><span className="text-[10px] font-mono font-semibold text-white">{(data.futureOutlook?.oneWeek?.noChange ?? 0) + "%"}</span></div>
            <div className="flex justify-between"><span className="text-green-400 text-[10px]">Cut</span><span className="text-green-400 text-[10px] font-mono">{(data.futureOutlook?.oneWeek?.cut ?? 0) + "%"}</span></div>
          </div>
        </div>
        <div className="bg-white/[0.04] rounded-lg p-2">
          <p className="text-[9px] text-white/[0.3] uppercase mb-1">1M Outlook</p>
          <div className="space-y-0.5">
            <div className="flex justify-between"><span className="text-[10px] text-white/[0.5]">No Change</span><span className="text-[10px] font-mono font-semibold text-white">{(mo?.noChange ?? 0) + "%"}</span></div>
            <div className="flex justify-between"><span className="text-green-400 text-[10px]">Cut</span><span className="text-green-400 text-[10px] font-mono">{(mo?.cut ?? 0) + "%"}</span></div>
            <div className="flex justify-between"><span className="text-red-400 text-[10px]">Hike</span><span className="text-red-400 text-[10px] font-mono">{(mo?.hike ?? 0) + "%"}</span></div>
          </div>
        </div>
      </div>
      <p className="text-[8px] text-white/[0.2] mt-2">Fed rate changes impact Bitcoin through liquidity and risk appetite.</p>
    </Panel>
  );
}

// ─── Row 2, Col 2: Global Markets Panel ───────────────────────────────────────

function GlobalMarketsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/financial/markets"],
    queryFn: async () => { const r = await fetch("/api/financial/markets"); return r.json(); },
    refetchInterval: 60000,
  });
  const tiles = [
    { l: "DXY Index", k: "dxy" },
    { l: "Gold", k: "gold" },
    { l: "S&P 500", k: "spx" },
    { l: "VIX", k: "vix" },
  ];
  return (
    <Panel title="Global Markets">
      {isLoading || !data ? <Skeleton className="h-24 w-full" /> : (
        <div className="space-y-2.5">{tiles.map((t: any) => {
          const item = (data as any)[t.k];
          if (!item) return null;
          const ip = item.change >= 0;
          return (
            <div key={t.k} className="flex items-center justify-between">
              <span className="text-[10px] text-white/[0.5]">{t.l}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-semibold text-white">
                  {t.k === "gold" ? "$" + item.value.toLocaleString() : item.value.toFixed(item.value > 100 ? 0 : 2)}
                </span>
                <span className={"text-[10px] font-mono font-semibold " + (ip ? "text-green-400" : "text-red-400")}>
                  {(ip ? "▲" : "▼") + Math.abs(item.change).toFixed(2) + "%"}
                </span>
              </div>
            </div>
          );
        })}</div>
      )}
    </Panel>
  );
}

// ─── Row 2, Col 3: Treasury & Inflation Panel ─────────────────────────────────

function TreasuryInflationPanel() {
  const fiscal = useQuery({ queryKey: ["/api/financial/treasury-fiscal"], refetchInterval: 300000 });
  const infl = useQuery({ queryKey: ["/api/financial/inflation"], refetchInterval: 300000 });
  const sects = (infl.data as any)?.sectors || [];
  const td = (fiscal.data as any)?.debtToPenny?.totalDebt ?? 38.4e12;
  const d2g = (fiscal.data as any)?.debtStatistics?.debtToGDP ?? 142.2;
  return (
    <Panel title="US Treasury &amp; Inflation">
      <div className="space-y-3">
        <div className="border-b border-white/[0.06] pb-2">
          <p className="text-[10px] text-red-400 font-mono font-bold">
            {fmtDebt(td)}<span className="text-white/[0.3] text-[9px] ml-1">Total US Debt</span>
          </p>
          <div className="grid grid-cols-3 gap-1 mt-1">
            <div><p className="text-[8px] text-white/[0.25]">Public Debt</p><p className="text-[10px] font-mono text-white/70">{fmtDebt((fiscal.data as any)?.debtToPenny?.publicDebt ?? 28.5e12)}</p></div>
            <div><p className="text-[8px] text-white/[0.25]">Intragov</p><p className="text-[10px] font-mono text-white/70">{fmtDebt((fiscal.data as any)?.debtToPenny?.intergovernmentalHoldings ?? 9.6e12)}</p></div>
            <div><p className="text-[8px] text-white/[0.25]">Debt/GDP</p><p className="text-[10px] font-mono text-orange-400">{d2g}%</p></div>
          </div>
          <div className="grid grid-cols-2 gap-1 mt-1">
            <div><p className="text-[8px] text-white/[0.25]">Per Citizen</p><p className="text-[10px] font-mono text-white/70">${((fiscal.data as any)?.debtStatistics?.debtPerCitizen || 114627).toLocaleString()}</p></div>
            <div><p className="text-[8px] text-white/[0.25]">Per Taxpayer</p><p className="text-[10px] font-mono text-white/70">${((fiscal.data as any)?.debtStatistics?.debtPerTaxpayer || 240000).toLocaleString()}</p></div>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[9px] text-white/[0.3] uppercase">CPI YoY</p>
            <span className={"text-[11px] font-mono font-bold " + (((infl.data as any)?.overall?.rate ?? 3.2) > 3 ? "text-red-400" : "text-green-400")}>
              {((infl.data as any)?.overall?.rate ?? 3.2).toFixed(2)}%
            </span>
          </div>
          <div className="space-y-1">{sects.slice(0, 5).map((s: any, i: number) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-[9px] text-white/[0.45]">{s.name}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-semibold text-white/70">{s.rate.toFixed(1)}%</span>
                <span className={"text-[9px] font-mono " + (s.change >= 0 ? "text-red-400" : "text-green-400")}>
                  {(s.change >= 0 ? "+" : "") + s.change.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}</div>
        </div>
      </div>
    </Panel>
  );
}

// ─── Row 2, Col 4: Treasury + Liquidity Panel ─────────────────────────────────

function TreasuryLiqPanel() {
  const treasury = useQuery({ queryKey: ["/api/financial/treasury"], refetchInterval: 60000 });
  const liq = useQuery({ queryKey: ["/api/liquidity"], refetchInterval: 60000 });
  const y = (treasury.data as any)?.yield ?? 0;
  const chg = (treasury.data as any)?.change ?? 0;
  const low = (treasury.data as any)?.keyLevels?.low52Week ?? 3.15;
  const high = (treasury.data as any)?.keyLevels?.high52Week ?? 5.02;
  const yPos = ((y - low) / (high - low || 1)) * 100;
  const sig = (liq.data as any)?.summary?.overallSignal || "neutral";
  const lm = [
    { l: "M2", v: (liq.data as any)?.indicators?.m2?.value ?? 0, c: (liq.data as any)?.indicators?.m2?.change ?? null },
    { l: "RRP", v: (liq.data as any)?.indicators?.rrp?.value ?? 0, c: null },
    { l: "TGA", v: (liq.data as any)?.indicators?.tga?.value ?? 0, c: null },
    { l: "Fed BS", v: (liq.data as any)?.indicators?.fedBalance?.value ?? 0, c: null },
  ];
  return (
    <Panel title="Treasury &amp; Liquidity">
      <div className="space-y-3">
        <div className="border-b border-white/[0.06] pb-2">
          <div className="flex items-end justify-between mb-1">
            <div>
              <p className="text-[9px] text-white/[0.3] uppercase">10Y Treasury</p>
              <p className="text-xl font-mono font-black text-white">{y.toFixed(3)}%</p>
            </div>
            <span className={"text-[11px] font-mono font-semibold " + (chg >= 0 ? "text-green-400" : "text-red-400")}>{fmtBps(chg)}</span>
          </div>
          <div className="relative h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full" style={{ left: Math.min(Math.max(yPos, 2), 98) + "%", transform: "translateX(-50%)" }} />
          </div>
          <div className="flex justify-between text-[8px] text-white/[0.25] font-mono mt-0.5">
            <span>{low.toFixed(2)}%</span><span className="text-amber-400/50">52W Range</span><span>{high.toFixed(2)}%</span>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[9px] text-white/[0.3] uppercase">FRED Liquidity</p>
            <span className={"text-[9px] px-1.5 py-0.5 rounded font-bold " + (sig === "expansionary" ? "bg-green-500/20 text-green-400" : sig === "contractionary" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400")}>
              {sig === "expansionary" ? "↑ Expanding" : sig === "contractionary" ? "↓ Contracting" : "→ Neutral"}
            </span>
          </div>
          <div className="space-y-1">{lm.map(({ l, v, c }: any) => (
            <div key={l} className="flex items-center justify-between">
              <span className="text-[9px] text-white/[0.35]">{l}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-semibold text-white/70">{v > 0 ? fmtM(v) : "—"}</span>
                {c !== null && (
                  <span className={"text-[9px] font-mono " + (c >= 0 ? "text-green-400" : "text-red-400")}>
                    {(c >= 0 ? "+" : "") + c.toFixed(1) + "%"}
                  </span>
                )}
              </div>
            </div>
          ))}</div>
        </div>
      </div>
    </Panel>
  );
}

// ─── Row 3, Col 1: Fed Holdings Panel ────────────────────────────────────────

function FedHoldingsPanel() {
  const liq = useQuery({ queryKey: ["/api/liquidity"], refetchInterval: 60000 });
  const nl = (liq.data as any)?.derivedMetrics?.netLiq ?? 5.94e12;
  const mm = (liq.data as any)?.derivedMetrics?.m2M0 ?? 4.21;
  const rf = (liq.data as any)?.derivedMetrics?.rsvFed ?? 46.6;
  const fh = [
    { l: "Fed MBS", v: 2.0e12, c: -8.1 },
    { l: "Fed Treasuries", v: 4.41e12, c: 4.5 },
  ];
  const dm = [
    { l: "Net Liq", v: (nl / 1e12).toFixed(2) + "T", n: "<$3T warning" },
    { l: "M2/M0", v: mm.toFixed(2) + "x", n: ">4.5x warning" },
    { l: "Rsv/Fed", v: rf.toFixed(1) + "%", n: ">30% safe" },
  ];
  return (
    <Panel title="Fed Holdings">
      <div className="space-y-3">
        <div className="space-y-1.5">{fh.map(({ l, v, c }: any) => (
          <div key={l} className="bg-white/[0.04] rounded-lg p-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/[0.5]">{l}</span>
              <span className="text-[11px] font-mono font-semibold text-white">{fmtM(v)}</span>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[8px] text-white/[0.25]">YoY</span>
              <span className={"text-[9px] font-mono " + (c >= 0 ? "text-green-400" : "text-red-400")}>
                {(c >= 0 ? "+" : "") + c.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}</div>
        <div className="border-t border-white/[0.06] pt-2">
          <p className="text-[9px] text-white/[0.3] uppercase mb-1.5">Derived Metrics</p>
          <div className="space-y-1">{dm.map(({ l, v, n }: any) => (
            <div key={l} className="flex items-center justify-between">
              <span className="text-[9px] text-white/[0.35]">{l}</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono font-semibold text-cyan-400">{v}</span>
                <span className="text-[8px] text-white/[0.2]">{n}</span>
              </div>
            </div>
          ))}</div>
        </div>
      </div>
    </Panel>
  );
}

// ─── Row 3, Col 2: AI Analysis + Predictions Panel ────────────────────────────

function AIAnalysisPanel() {
  const ai = useQuery({ queryKey: ["/api/ai/analysis"], refetchInterval: 60000 });
  const pred = useQuery({ queryKey: ["/api/ai/multi-timeframe-predictions"], refetchInterval: 300000 });
  const a = ai.data as any;
  const p = pred.data as any;
  const preds = p?.predictions;
  const frames = [
    { k: "1M", d: preds?.oneMonth },
    { k: "3M", d: preds?.threeMonth },
    { k: "6M", d: preds?.sixMonth },
    { k: "1Y", d: preds?.oneYear },
  ];
  return (
    <Panel title="AI Analysis" badge={[{ text: (p?.overallSentiment || "NEUTRAL").toUpperCase(), color: p?.overallSentiment === "bullish" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400" }]}>
      <div className="space-y-3">
        {a && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/[0.04] rounded-lg p-2 text-center"><p className="text-[8px] text-white/[0.3] uppercase">RSI(14)</p><p className="text-[13px] font-mono font-black text-white">{a.rsi?.toFixed(1) ?? "—"}</p></div>
            <div className="bg-white/[0.04] rounded-lg p-2 text-center"><p className="text-[8px] text-white/[0.3] uppercase">MACD</p><p className="text-[11px] font-mono font-semibold" style={{ color: a.movingAverages?.signal > 0 ? "rgb(34,197,94)" : "rgb(239,68,68)" }}>{a.movingAverages?.signal ? "CROSS" : "—"}</p></div>
            <div className="bg-white/[0.04] rounded-lg p-2 text-center"><p className="text-[8px] text-white/[0.3] uppercase">MA200</p><p className="text-[11px] font-mono font-semibold text-white">{a.movingAverages?.ma200 ? formatCurrency(a.movingAverages.ma200) : "—"}</p></div>
          </div>
        )}
        {preds && (
          <div className="space-y-1.5">
            {frames.map(({ k, d }: any) => {
              if (!d) return null;
              const ip = d.targetPrice > (p?.currentPrice || 0);
              return (
                <div key={k} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-1.5">
                  <span className="text-[10px] font-mono font-bold text-white/60 w-6">{k}</span>
                  <span className="text-[11px] font-mono font-semibold text-white">{formatCurrency(d.targetPrice)}</span>
                  <span className={"text-[10px] font-mono " + (ip ? "text-green-400" : "text-red-400")}>
                    {(ip ? "▲" : "▼") + Math.abs(((d.targetPrice - (p?.currentPrice || 0)) / (p?.currentPrice || 1)) * 100).toFixed(1) + "%"}
                  </span>
                  <span className="text-[9px] text-white/[0.3]">{d.probability}% prob</span>
                </div>
              );
            })}
          </div>
        )}
        {(!a && !preds) && <Skeleton className="h-24 w-full" />}
      </div>
    </Panel>
  );
}

// ─── Row 3, Col 3: Options Flow + Whales Panel ───────────────────────────────

function OptionsFlowWhalesPanel() {
  const opt = useQuery({ queryKey: ["/api/options-flow"], refetchInterval: 60000 });
  const whales = useQuery({ queryKey: ["/api/whale-alerts"], refetchInterval: 60000 });
  const o = opt.data as any;
  const txs = (whales.data as any)?.transactions || [];
  return (
    <Panel title="Options &amp; Whales">
      <div className="space-y-3">
        {o?.btc && (
          <div className="border-b border-white/[0.06] pb-2">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[9px] text-white/[0.3] uppercase">Deribit Options</p>
              <span className={"text-[9px] px-1.5 py-0.5 rounded font-bold " + (o.btc.sentiment === "bullish" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>
                {o.btc.sentiment?.toUpperCase() || "NEUTRAL"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/[0.04] rounded-lg p-2"><p className="text-[8px] text-white/[0.25]">P/C Ratio</p><p className="text-[12px] font-mono font-semibold text-white">{o.btc.putCallRatio?.toFixed(2) ?? "—"}</p></div>
              <div className="bg-white/[0.04] rounded-lg p-2"><p className="text-[8px] text-white/[0.25]">Open Interest</p><p className="text-[12px] font-mono font-semibold text-white">{fmtM(o.btc.totalOI ?? 0)}</p></div>
              <div className="bg-white/[0.04] rounded-lg p-2"><p className="text-[8px] text-white/[0.25]">Net Delta</p><p className={"text-[12px] font-mono font-semibold " + ((o.btc.netDelta ?? 0) >= 0 ? "text-green-400" : "text-red-400")}>{(o.btc.netDelta ?? 0) >= 0 ? "+" : ""}{(o.btc.netDelta ?? 0).toFixed(2)}</p></div>
              <div className="bg-white/[0.04] rounded-lg p-2"><p className="text-[8px] text-white/[0.25]">Volume</p><p className="text-[12px] font-mono font-semibold text-white">{fmtM(o.btc.totalVolume ?? 0)}</p></div>
            </div>
          </div>
        )}
        <div>
          <p className="text-[9px] text-white/[0.3] uppercase mb-1.5">Whale Transactions</p>
          {txs.length === 0 ? (
            <p className="text-[10px] text-white/[0.3] text-center py-2">No recent whale alerts</p>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {txs.slice(0, 5).map((tx: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-[9px]">
                  <span className={"font-mono font-semibold w-8 " + (tx.type === " inflow" ? "text-green-400" : "text-red-400")}>
                    {tx.type === "inflow" ? "IN" : "OUT"}
                  </span>
                  <span className="font-mono text-white/70 flex-1 ml-1">{fmtM(tx.amountUSD)}</span>
                  <span className="text-white/[0.3] font-mono">{Math.abs(tx.amount).toFixed(4)} BTC</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}


export default function Dashboard() {
  const [lastUpdate, setLastUpdate] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setLastUpdate(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const { data: btcData, refetch: refetchBTC } = useQuery({
    queryKey: ["/api/bitcoin"],
    queryFn: async () => { const r = await fetch("/api/bitcoin"); return r.json(); },
    refetchInterval: 60000,
  });

  const { data: fearData } = useQuery({
    queryKey: ["/api/fear-greed"],
    queryFn: async () => { const r = await fetch("/api/fear-greed"); return r.json(); },
    refetchInterval: 300000,
  });

  const handleRefresh = () => { refetchBTC(); setLastUpdate(new Date()); };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 font-mono">
      <div className="max-w-[1800px] mx-auto space-y-4">

        {/* ─── Row 1: Bitcoin Hero Strip ─── */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
          <Scoreboard data={btcData as BTC} lastUpdate={lastUpdate} onRefresh={handleRefresh} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            <div className="lg:col-span-1">
              <FearGreedGauge data={fearData as FearGreed} />
            </div>
            <div className="lg:col-span-2">
              <BTCChart />
            </div>
          </div>
        </div>

        {/* ─── Row 2: Macro Grid (4 columns) ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <FedWatchPanel />
          <GlobalMarketsPanel />
          <TreasuryInflationPanel />
          <TreasuryLiqPanel />
        </div>

        {/* ─── Row 3: Analytics Grid (3 columns) ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FedHoldingsPanel />
          <AIAnalysisPanel />
          <OptionsFlowWhalesPanel />
        </div>

      </div>
    </div>
  );
};
