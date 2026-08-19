// BitcoinHub — /macro
// Macro Indicators dashboard. Phase 6b (2026-08-19).
//
// Reads /api/fred/series (list) + /api/fred/data (per-series time series)
// and renders a category-filtered grid of cards. Each card has:
//   - Title + category badge
//   - Current value (large)
//   - 1y sparkline (Recharts AreaChart)
//   - 1y change indicator (▲/▼ + %)

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, TrendingDown, Layers, AlertTriangle, RefreshCw, Filter,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, YAxis,
} from "recharts";

interface FredPoint {
  date: string;
  value: number;
}

interface FredSeriesDef {
  id: string;
  name: string;
  category: string;
  unit: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  transform: 'none' | 'yoy';
}

interface FredDataPayload {
  seriesId: string;
  definition: FredSeriesDef;
  count: number;
  originalCount: number;
  points: FredPoint[];
  meta: any;
}

interface FredListPayload {
  count: number;
  series: FredSeriesDef[];
  categories: Record<string, FredSeriesDef[]>;
}

const CATEGORY_LABELS: Record<string, string> = {
  liquidity: 'Liquidity',
  rates: 'Rates',
  inflation: 'Inflation',
  employment: 'Employment',
  sentiment: 'Sentiment',
  valuation: 'Valuation',
};

const CATEGORY_COLORS: Record<string, string> = {
  liquidity: '#3b82f6', // blue
  rates: '#8b5cf6',     // purple
  inflation: '#ef4444', // red
  employment: '#10b981',// green
  sentiment: '#06b6d4', // cyan
  valuation: '#ec4899', // pink
};

function useMacroSeries() {
  return useQuery<FredListPayload>({
    queryKey: ['/api/fred/series'],
    refetchInterval: 60 * 60 * 1000,   // 1h — series list rarely changes
    staleTime: 5 * 60 * 1000,
  });
}

function useMacroData(seriesId: string, days: number = 1825) {
  return useQuery<FredDataPayload>({
    queryKey: ['/api/fred/data', seriesId, days],
    queryFn: async () => {
      const res = await fetch(`/api/fred/data?series_id=${seriesId}&days=${days}&maxPoints=120`);
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`${res.status}: ${err}`);
      }
      return res.json();
    },
    refetchInterval: 60 * 60 * 1000,   // 1h refresh
    staleTime: 5 * 60 * 1000,
  });
}

function formatValue(value: number, unit: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (unit === 'M USD' && value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}T`;
  }
  if (unit === 'M USD') {
    return `$${(value / 1000).toFixed(0)}B`;
  }
  if (unit === 'B USD') {
    return `$${value.toFixed(0)}B`;
  }
  if (unit === '%') {
    return `${value.toFixed(2)}%`;
  }
  if (unit === 'k') {
    return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}k`;
  }
  if (unit === 'index') {
    return value.toFixed(2);
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function MacroCard({ series }: { series: FredSeriesDef }) {
  const q = useMacroData(series.id, 1825);
  const pts = q.data?.points ?? [];
  const last = pts[pts.length - 1];
  // 1y change: find a point ~365 days earlier
  const yearAgo = useMemo(() => {
    if (!last || pts.length === 0) return null;
    const target = new Date(last.date).getTime() - 365 * 86400 * 1000;
    let best = pts[0];
    let bestDelta = Math.abs(new Date(best.date).getTime() - target);
    for (const p of pts) {
      const d = Math.abs(new Date(p.date).getTime() - target);
      if (d < bestDelta) { best = p; bestDelta = d; }
    }
    return best;
  }, [pts, last]);

  const changePct = useMemo(() => {
    if (!last || !yearAgo || !yearAgo.value) return null;
    return ((last.value - yearAgo.value) / Math.abs(yearAgo.value)) * 100;
  }, [last, yearAgo]);

  const color = CATEGORY_COLORS[series.category];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardDescription className="text-xs">{series.id}</CardDescription>
            <CardTitle className="text-lg">{series.name}</CardTitle>
          </div>
          <Badge
            variant="outline"
            style={{ borderColor: `${color}66`, color, backgroundColor: `${color}11` }}
          >
            {CATEGORY_LABELS[series.category]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <Skeleton className="h-16 w-full mb-3" />
        ) : q.error ? (
          <div className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
            <AlertTriangle className="w-3 h-3 text-yellow-500" />
            {String((q.error as Error).message).slice(0, 80)}
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-3xl font-bold tabular-nums" style={{ color }}>
                {formatValue(last?.value, series.unit)}
              </span>
              {changePct !== null && (
                <span className={`flex items-center text-xs font-medium ${
                  changePct > 0 ? 'text-green-500' : changePct < 0 ? 'text-red-500' : 'text-muted-foreground'
                }`}>
                  {changePct > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> :
                   changePct < 0 ? <TrendingDown className="w-3 h-3 mr-0.5" /> : null}
                  {changePct > 0 ? '+' : ''}{changePct.toFixed(2)}% YoY
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3 min-h-[2.5rem]">
              {series.description}
            </p>
          </>
        )}
        {pts.length > 0 && (
          <div className="h-12 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pts} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`spark-${series.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={1.5}
                  fill={`url(#spark-${series.id})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-2 text-[10px] text-muted-foreground">
          {series.frequency} · {pts.length} pts · last: {last?.date ?? '—'}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Macro() {
  const list = useMacroSeries();
  const [category, setCategory] = useState<string>('all');

  const series = list.data?.series ?? [];
  const filtered = useMemo(() => {
    if (category === 'all') return series;
    return series.filter(s => s.category === category);
  }, [series, category]);

  // Categories with data
  const categories = useMemo(() => {
    const set = new Set<string>();
    series.forEach(s => set.add(s.category));
    return Array.from(set);
  }, [series]);

  const refreshAll = () => {
    list.refetch();
    // each card will refetch on its own via useMacroData's refetchInterval
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Layers className="w-7 h-7 text-primary" />
            Macro Indicators
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Federal Reserve, Treasury, BLS, and Chicago Fed data via the{' '}
            <a
              href="https://fred.stlouisfed.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              FRED API
            </a>
            . {series.length} series covering liquidity, rates, inflation, employment, and financial conditions.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshAll}
          disabled={list.isLoading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${list.isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Button
          variant={category === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategory('all')}
        >
          All ({series.length})
        </Button>
        {categories.map(c => (
          <Button
            key={c}
            variant={category === c ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategory(c)}
            style={category === c ? {
              backgroundColor: `${CATEGORY_COLORS[c]}22`,
              borderColor: `${CATEGORY_COLORS[c]}66`,
              color: CATEGORY_COLORS[c],
            } : {
              borderColor: `${CATEGORY_COLORS[c]}44`,
              color: `${CATEGORY_COLORS[c]}cc`,
            }}
          >
            {CATEGORY_LABELS[c]} ({series.filter(s => s.category === c).length})
          </Button>
        ))}
      </div>

      {/* Cards grid */}
      {list.error ? (
        <Card className="border-red-900/50">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Failed to load FRED series
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              {String((list.error as Error).message).slice(0, 200)}
            </p>
            <p className="text-xs text-muted-foreground">
              If the error mentions <code>FRED_API_KEY</code>, set it in your Vercel project environment
              variables (Project Settings → Environment Variables). Local dev reads from{' '}
              <code>BitcoinHub/.env.local</code>.
            </p>
            <Button onClick={refreshAll} className="mt-3">Retry</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => <MacroCard key={s.id} series={s} />)}
        </div>
      )}
    </div>
  );
}
