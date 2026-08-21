// BitcoinHub — /analytics "macro & derivatives" tiles (Tier 3.5)
// 6 new tiles for the deferred items Tyler listed (2026-08-21 17:50 UTC):
//   1. BtcMonthlyReturnsTile     → /api/btc/monthly          (heatmap)
//   2. M2SupplyTile              → /api/fred/data?series_id=M2SL
//   3. TnxTile (10Y Treasury)    → /api/fred/data?series_id=DGS10
//   4. FedWatchTile (EFFR)       → /api/fedwatch-effr        (NY Fed public API)
//   5. NuplProxyTile             → /api/risk/indicator       (mmZ as NUPL proxy)
//   6. RealLiquidationsTile      → /api/btc/liquidations-recent (Deribit proxy)
//
// All using free sources. Real liquidation VOLUME is approximated via recent
// Deribit options trades bucketed by strike distance — CoinGlass/Coinalyze paid
// feeds are documented as the path to real liquidations later.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { IndicatorTile } from './PulseStubs';

// ── Shared sparkline (kept local to avoid coupling to PulseStubs internals) ─

function Sparkline({
  values,
  color = '#f7931a',
  height = 28,
  width = 100,
}: {
  values: (number | null | undefined)[];
  color?: string;
  height?: number;
  width?: number;
}) {
  const filtered = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (filtered.length < 2) return null;
  const min = Math.min(...filtered);
  const max = Math.max(...filtered);
  const range = max - min || 1;
  const points = filtered
    .map((v, i) => {
      const x = (i / (filtered.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="block w-full"
      style={{ height }}
    >
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

// ── 1. BTC monthly returns heatmap ─────────────────────────────────────────

interface MonthlyRow {
  year: number;
  month: number;
  returnPct: number;
  endPrice: number;
}
interface BtcMonthlyResp {
  asOf: string;
  ytd: { from: string; to: string; returnPct: number };
  monthly: MonthlyRow[];
}

function pctColor(pct: number): string {
  // SOLID green/red by sign — no dynamic alpha. Tailwind's JIT scanner can't
  // see dynamic class strings like `bg-green-500/[${n}]` at build time, so
  // the previous magnitude-scaling rule never shipped in production CSS.
  // Static classes are visible to the scanner and ship reliably.
  // (Magnitude scaling can come back later via a safelist or inline-style path.)
  if (pct > 0) return 'bg-green-600';
  if (pct < 0) return 'bg-red-600';
  return 'bg-white/[0.06]';
}

export function BtcMonthlyReturnsTile() {
  const { data, isLoading } = useQuery<BtcMonthlyResp>({
    queryKey: ['/api/btc/monthly'],
    refetchInterval: 10 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  const monthly = data?.monthly ?? [];
  // Show the full history; container scrolls vertically when needed.
  const recent = monthly;
  // Group by year, ascending
  const byYear = new Map<number, MonthlyRow[]>();
  for (const m of recent) {
    let arr = byYear.get(m.year);
    if (!arr) { arr = []; byYear.set(m.year, arr); }
    arr.push(m);
  }
  const years = Array.from(byYear.keys()).sort();
  // pad each year to 12 entries (Jan-Dec)
  const grid: (MonthlyRow | null)[][] = years.map((y) => {
    const arr = byYear.get(y)!;
    const row: (MonthlyRow | null)[] = Array(12).fill(null);
    for (const m of arr) row[m.month - 1] = m;
    return row;
  });
  const labels = ['J','F','M','A','M','J','J','A','S','O','N','D'];

  if (isLoading && !data) {
    return (
      <IndicatorTile label="BTC monthly returns" loading href="/cycle/compare" />
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 h-full flex flex-col">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-white/[0.45]">
            BTC monthly returns
          </p>
          {data?.ytd && (
            <p className="text-[10px] text-white/[0.4] font-mono mt-1">
              YTD {data.ytd.returnPct >= 0 ? '+' : ''}{data.ytd.returnPct.toFixed(1)}% ·{' '}
              <span className="text-white/[0.3]">
                {data.ytd.from} → {data.ytd.to}
              </span>
            </p>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 max-h-[460px] overflow-y-auto flex flex-col gap-1">
        {/* Month labels */}
        <div className="grid grid-cols-[28px_repeat(12,1fr)] gap-1 text-[9px] text-white/[0.35]">
          <div />
          {labels.map((l, i) => (
            <div key={i} className="text-center">{l}</div>
          ))}
        </div>
        {/* Year rows */}
        {grid.map((row, yi) => (
          <div key={yi} className="grid grid-cols-[28px_repeat(12,1fr)] gap-1 items-center text-[10px]">
            <div className="text-white/[0.5] font-mono">{years[yi]}</div>
            {row.map((cell, mi) => (
              <div
                key={mi}
                title={
                  cell
                    ? `${years[yi]}-${String(cell.month).padStart(2, '0')}: $${cell.endPrice.toFixed(0)} (${cell.returnPct >= 0 ? '+' : ''}${cell.returnPct.toFixed(1)}%)`
                    : ''
                }
                className={`h-5 rounded ${cell ? pctColor(cell.returnPct) : 'bg-white/[0.02]'} flex items-center justify-center text-[10px] font-mono font-semibold text-white`}
              >
                {cell ? (cell.returnPct >= 0 ? '+' : '') + Math.round(cell.returnPct) : ''}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 2. M2 supply ────────────────────────────────────────────────────────────

interface FredPoint { date: string; value: number; }
interface FredResp { seriesId: string; definition: { unit: string }; points: FredPoint[]; }

export function M2SupplyTile() {
  const { data, isLoading } = useQuery<FredResp>({
    queryKey: ['/api/fred/data', 'series_id=M2SL', 'limit=26'],
    queryFn: async () => {
      const r = await fetch('/api/fred/data?series_id=M2SL&limit=26');
      if (!r.ok) throw new Error('m2 fetch failed');
      return r.json();
    },
    refetchInterval: 60 * 60 * 1000,
    staleTime: 60 * 60 * 1000,
  });
  const points = (data?.points ?? [])
    .map((p) => p.value)
    .filter((v) => Number.isFinite(v));

  // FRED M2 is in MILLIONS of USD. Convert to $T for display.
  const lastM = points[points.length - 1];
  const prevM = points[points.length - 2];
  const lastT = lastM != null ? lastM / 1e6 : null;
  const momPct = lastM != null && prevM != null && prevM > 0 ? ((lastM - prevM) / prevM) * 100 : null;
  const spark = points.slice(-26);
  const value = lastT != null ? `$${lastT.toFixed(2)}T` : undefined;
  const sub = momPct != null ? `${momPct >= 0 ? '+' : ''}${momPct.toFixed(1)}% MoM` : undefined;

  return (
    <IndicatorTile
      label="M2 Money Supply"
      value={value}
      sub={sub}
      tone={momPct != null && momPct > 0 ? 'good' : 'warn'}
      loading={isLoading && !data}
      hint="FRED M2SL · weekly · +1.2% MoM ≈ BTC tailwind"
    >
      <Sparkline values={spark} color="#22c55e" />
    </IndicatorTile>
  );
}

// ── 3. 10Y Treasury (TNX) ─────────────────────────────────────────────────

export function TnxTile() {
  const { data, isLoading } = useQuery<FredResp>({
    queryKey: ['/api/fred/data', 'series_id=DGS10', 'limit=60'],
    queryFn: async () => {
      const r = await fetch('/api/fred/data?series_id=DGS10&limit=60');
      if (!r.ok) throw new Error('dgs10 fetch failed');
      return r.json();
    },
    refetchInterval: 60 * 60 * 1000,
    staleTime: 60 * 60 * 1000,
  });
  const points = (data?.points ?? []).filter((p) => Number.isFinite(p.value));
  const values = points.map((p) => p.value);

  const last = values[values.length - 1];
  const d30 = values[values.length - 30] ?? values[0];
  const d7 = values[values.length - 7] ?? values[0];
  const deltaBps30 = last != null && d30 != null ? Math.round((last - d30) * 100) : null;
  const deltaBps7 = last != null && d7 != null ? Math.round((last - d7) * 100) : null;

  const spark = values.slice(-30);
  const value = last != null ? `${last.toFixed(2)}%` : undefined;
  const sub =
    deltaBps7 != null && deltaBps30 != null
      ? `${deltaBps7 >= 0 ? '+' : ''}${deltaBps7}bp 7d · ${deltaBps30 >= 0 ? '+' : ''}${deltaBps30}bp 30d`
      : undefined;
  const tone =
    deltaBps30 == null
      ? 'neutral'
      : deltaBps30 > 25
      ? 'warn'
      : deltaBps30 < -25
      ? 'good'
      : 'neutral';

  return (
    <IndicatorTile
      label="10Y Treasury (TNX)"
      value={value}
      sub={sub}
      tone={tone}
      loading={isLoading && !data}
      hint="FRED DGS10 · daily · cost-of-capital for risk assets"
    >
      <Sparkline values={spark} color="#3b82f6" />
    </IndicatorTile>
  );
}

// ── 4. FedWatch (EFFR proxy) ──────────────────────────────────────────────

interface FedWatchResp {
  asOf: string;
  currentRate: number;
  targetRangeFrom: number | null;
  targetRangeTo: number | null;
  trajectory30d: { oldestRate: number; oldestDate: string; deltaBps: number };
  series: Array<{ date: string; rate: number; volumeBn: number | null }>;
  note: string;
}

export function FedWatchTile() {
  const { data, isLoading } = useQuery<FedWatchResp>({
    queryKey: ['/api/fedwatch-effr'],
    refetchInterval: 30 * 60 * 1000,
    staleTime: 30 * 60 * 1000,
  });

  const cur = data?.currentRate;
  const targetFrom = data?.targetRangeFrom ?? null;
  const targetTo = data?.targetRangeTo ?? null;
  const deltaBps = data?.trajectory30d.deltaBps ?? null;
  const series = data?.series ?? [];
  const sparkRates = series.map((s) => s.rate);

  const value = cur != null ? `${cur.toFixed(2)}%` : undefined;
  const sub =
    targetFrom != null && targetTo != null
      ? `target ${targetFrom.toFixed(2)}–${targetTo.toFixed(2)}% · ${
          deltaBps != null ? `${deltaBps >= 0 ? '+' : ''}${deltaBps}bp 30d` : ''
        }`
      : undefined;
  const tone =
    deltaBps == null
      ? 'neutral'
      : deltaBps > 0
      ? 'warn'
      : deltaBps < 0
      ? 'good'
      : 'neutral';

  return (
    <IndicatorTile
      label="FedWatch (EFFR)"
      value={value}
      sub={sub}
      tone={tone}
      loading={isLoading && !data}
      hint="NY Fed public API · real EFFR + 30d · not full CME probabilities"
    >
      <Sparkline values={sparkRates} color="#a78bfa" />
    </IndicatorTile>
  );
}

// ── 5. NUPL proxy (via MVRV-Z) ───────────────────────────────────────────

interface RiskIndicator {
  mmZ?: number;
  rsi?: number;
  d200w?: number;
  band?: { label: string; color: string };
  asOf?: string;
}

function nuplBandFromMmZ(mmZ: number): { label: string; tone: 'danger' | 'warn' | 'good' | 'neutral' } {
  // Approximate NUPL bands from MVRV-Z (closely correlated: NUPL > 0.75
  // sits near MVRV-Z > 1.5 historically). This is an honest proxy, not the
  // exact Glassnode NUPL formula (which needs realized-cap subtraction).
  if (mmZ > 1.5) return { label: 'in profit (peak)', tone: 'danger' };
  if (mmZ > 0.5) return { label: 'in profit', tone: 'good' };
  if (mmZ > -0.5) return { label: 'near 200-DMA', tone: 'neutral' };
  if (mmZ > -1.5) return { label: 'in loss', tone: 'warn' };
  return { label: 'in loss (capitulation)', tone: 'danger' };
}

export function NuplProxyTile() {
  const { data, isLoading } = useQuery<RiskIndicator>({
    queryKey: ['/api/risk/indicator'],
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });
  const mmZ = data?.mmZ;
  const band = mmZ != null ? nuplBandFromMmZ(mmZ) : null;
  const value = mmZ != null ? `${mmZ >= 0 ? '+' : ''}${mmZ.toFixed(2)}σ` : undefined;
  const sub = band?.label;

  return (
    <IndicatorTile
      label="NUPL (via MVRV-Z)"
      value={value}
      sub={sub}
      tone={band?.tone ?? 'neutral'}
      loading={isLoading && !data}
      href="/risk"
      hint="NUPL ≈ (Mcap − Realized Cap) / Mcap. We approximate via MVRV-Z (highly correlated)"
    />
  );
}

// ── 6. Real liquidation volume (Deribit proxy) ──────────────────────────

interface LiqBucket {
  label: string;
  mid: number;
  contractsBought: number;
  contractsSold: number;
  netContracts: number;
  notionalUsd: number;
  tradeCount: number;
}
interface LiquidationsResp {
  asOf: string;
  btcIndexPrice: number | null;
  totalTrades: number;
  totalNotionalUsd: number;
  totalContracts: number;
  buckets: LiqBucket[];
  note: string;
}

export function RealLiquidationsTile() {
  const { data, isLoading } = useQuery<LiquidationsResp>({
    queryKey: ['/api/btc/liquidations-recent'],
    refetchInterval: 2 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading && !data) {
    return (
      <IndicatorTile
        label="Recent options activity"
        loading
      />
    );
  }

  const buckets = data?.buckets ?? [];
  const totalNotional = data?.totalNotionalUsd ?? 0;
  const maxNotional = Math.max(...buckets.map((b) => b.notionalUsd), 1);
  // Show only the 5 buckets nearest ATM (compact)
  const atmIndex = buckets.findIndex((b) => Math.abs(b.mid) <= 1);
  const start = Math.max(0, (atmIndex ?? 0) - 2);
  const end = Math.min(buckets.length, start + 7);
  const window = buckets.slice(start, end);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 h-full flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[9px] uppercase tracking-widest text-white/[0.45]">
          Recent options activity
        </p>
      </div>
      <p className="text-[10px] text-white/[0.4] leading-tight mb-1">
        Deribit trades near BTC — proxy for liquidation zones
      </p>
      {totalNotional > 0 && (
        <p className="text-[10px] text-white/[0.5] font-mono">
          Total: ${(totalNotional / 1e6).toFixed(1)}M notional
        </p>
      )}
      <div className="flex-1 space-y-0.5 mt-1">
        {window.length === 0 && (
          <p className="text-[10px] text-white/[0.3] italic">no recent trades</p>
        )}
        {window.map((b) => {
          const widthPct = Math.max(8, Math.min(100, (b.notionalUsd / maxNotional) * 100));
          const isATM = Math.abs(b.mid) <= 1;
          return (
            <div key={b.label} className="flex items-center gap-1.5 text-[9px] font-mono leading-tight">
              <span className={`w-16 shrink-0 ${isATM ? 'text-amber-400' : 'text-white/[0.5]'}`}>
                {b.label}
              </span>
              <div className="flex-1 h-2 bg-white/[0.04] rounded overflow-hidden">
                <div
                  className={`h-full ${isATM ? 'bg-amber-400/60' : 'bg-white/[0.25]'}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span className="text-white/[0.45] w-12 shrink-0 text-right">
                ${(b.notionalUsd / 1e3).toFixed(0)}k
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
