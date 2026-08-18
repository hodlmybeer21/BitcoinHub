// BitcoinHub MPT — Modern Portfolio Theory for Crypto
// /portfolio/mpt — main MPT page

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  ReferenceDot, ReferenceLine, Tooltip as RTooltip, ZAxis,
} from "recharts";
import {
  AlertCircle, TrendingUp, TrendingDown, Plus, Trash2, RefreshCw,
  Wallet, Target, Activity, BarChart3, Sparkles, ArrowRight,
  Save, FolderOpen,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { useEffect } from "react";

// --- Types (mirrors server/mpt/index.ts) ---

interface MPTAsset {
  symbol: string;
  name: string;
  source: 'coingecko' | 'yahoo';
  firstAvailable: string;
}

interface MPTCycle {
  id: string;
  label: string;
  start: string;
  end: string | null;
  isLive?: boolean;
}

interface MPTConfig {
  cycles: MPTCycle[];
  universe: MPTAsset[];
  defaultRiskFreeRate: number;
}

interface AssetStats {
  symbol: string;
  meanReturn: number;
  volatility: number;
  sharpe: number;
  maxDrawdown: number;
  totalReturn: number;
  dataPoints: number;
}

interface OptimizationResult {
  weights: Record<string, number>;
  expectedReturn: number;
  volatility: number;
  sharpe: number;
  totalValue?: number;
}

interface FrontierPoint {
  return: number;
  volatility: number;
  sharpe: number;
}

interface RebalanceTrade {
  symbol: string;
  currentWeight: number;
  targetWeight: number;
  deltaWeight: number;
  deltaValue: number;
}

interface MPTResult {
  cycle: { id: string; label: string; start: string; end: string };
  riskFreeRate: number;
  symbols: string[];
  excludedAssets: { symbol: string; reason: string }[];
  perAsset: Record<string, AssetStats>;
  correlation: number[][];
  currentPortfolio: OptimizationResult;
  maxSharpe: OptimizationResult;
  minVol: OptimizationResult;
  frontier: {
    cloud: FrontierPoint[];
    maxSharpePoint: FrontierPoint;
    minVolPoint: FrontierPoint;
    userPoint: FrontierPoint;
  };
  distanceFromFrontier: number;
  improvementPotential: number;
  rebalanceTrades: RebalanceTrade[];
  metadata: {
    evalMs: number;
    commonDates: number;
    fetchMs: number;
    computeMs: number;
  };
}

// --- Saved portfolios (anonymous localStorage, MPT Phase 2 B1) ---

interface SavedPortfolio {
  id: string;
  name: string;
  holdings: Holding[];
  cycleId: string;
  riskFreeRate: number;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'bitcoinhub_mpt_portfolios_v1';

function loadSavedPortfolios(): SavedPortfolio[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

function persistSavedPortfolios(items: SavedPortfolio[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
  catch (e) { console.warn('[mpt] localStorage write failed:', e); }
}

// --- Helpers ---

const DEFAULT_PORTFOLIO = [
  { symbol: 'BTC', quantity: 0.5 },
  { symbol: 'IBIT', quantity: 100 },
  { symbol: 'MSTR', quantity: 5 },
];

function pctColor(pct: number): string {
  if (pct > 0) return 'text-green-400';
  if (pct < 0) return 'text-red-400';
  return 'text-muted-foreground';
}

function correlationColor(c: number): string {
  // Map [-1, 1] to color: blue (low) → white (mid) → red (high)
  const clamped = Math.max(-1, Math.min(1, c));
  if (clamped >= 0) {
    const intensity = Math.round(clamped * 180);
    return `rgb(${intensity}, ${30}, ${40})`;
  } else {
    const intensity = Math.round(-clamped * 180);
    return `rgb(${30}, ${30}, ${80 + intensity / 2})`;
  }
}

function correlationLabel(c: number): string {
  const a = Math.abs(c);
  if (a < 0.2) return 'Weak';
  if (a < 0.5) return 'Moderate';
  if (a < 0.7) return 'Strong';
  return 'Very Strong';
}

// --- Sub-components ---

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: 'pos' | 'neg' | 'neutral' }) {
  const colorClass = accent === 'pos' ? 'text-green-400' : accent === 'neg' ? 'text-red-400' : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
        <div className={`text-2xl font-mono font-bold ${colorClass}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function CorrelationHeatmap({ symbols, corr }: { symbols: string[]; corr: number[][] }) {
  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <table className="text-sm border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-xs text-muted-foreground"></th>
              {symbols.map(s => (
                <th key={s} className="p-2 text-xs font-mono font-semibold">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {symbols.map((s, i) => (
              <tr key={s}>
                <td className="p-2 text-xs font-mono font-semibold">{s}</td>
                {symbols.map((_, j) => {
                  const c = corr[i][j];
                  return (
                    <td key={j} className="p-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="w-16 h-12 flex items-center justify-center font-mono text-xs cursor-help border border-border/30"
                            style={{ backgroundColor: correlationColor(c), color: Math.abs(c) > 0.55 ? 'white' : 'black' }}
                          >
                            {c.toFixed(2)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="font-mono">{s} ↔ {symbols[j]}</div>
                          <div>r = {c.toFixed(3)} ({correlationLabel(c)})</div>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}

function EfficientFrontierChart({ result }: { result: MPTResult }) {
  // Subsample cloud to 2000 points for render perf; the math ran 10k.
  const subsample = useMemo(() => {
    const cloud = result.frontier.cloud;
    if (cloud.length <= 2000) return cloud;
    const step = Math.floor(cloud.length / 2000);
    const out: FrontierPoint[] = [];
    for (let i = 0; i < cloud.length; i += step) out.push(cloud[i]);
    return out;
  }, [result]);

  const cloudData = subsample.map(p => ({ x: p.volatility * 100, y: p.return * 100, sharpe: p.sharpe }));
  const maxSharpePt = { x: result.frontier.maxSharpePoint.volatility * 100, y: result.frontier.maxSharpePoint.return * 100 };
  const minVolPt = { x: result.frontier.minVolPoint.volatility * 100, y: result.frontier.minVolPoint.return * 100 };
  const userPt = { x: result.frontier.userPoint.volatility * 100, y: result.frontier.userPoint.return * 100 };

  return (
    <div className="w-full h-96">
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            type="number" dataKey="x" name="Volatility"
            unit="%" domain={['auto', 'auto']}
            label={{ value: 'Annualized Volatility (%)', position: 'insideBottom', offset: -10, fill: '#888', fontSize: 12 }}
            tick={{ fill: '#888', fontSize: 11 }}
          />
          <YAxis
            type="number" dataKey="y" name="Return"
            unit="%" domain={['auto', 'auto']}
            label={{ value: 'Annualized Return (%)', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 12 }}
            tick={{ fill: '#888', fontSize: 11 }}
          />
          <ZAxis type="number" dataKey="sharpe" range={[10, 80]} />
          <RTooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-popover border border-border rounded p-2 text-xs font-mono">
                  <div>Vol: {d.x.toFixed(1)}%</div>
                  <div>Return: {d.y.toFixed(1)}%</div>
                  <div>Sharpe: {d.sharpe.toFixed(2)}</div>
                </div>
              );
            }}
          />
          <Scatter name="Portfolios" data={cloudData} fill="rgba(120, 120, 140, 0.4)" />
          <ReferenceDot x={maxSharpePt.x} y={maxSharpePt.y} r={7} fill="#22c55e" stroke="white" />
          <ReferenceDot x={minVolPt.x} y={minVolPt.y} r={7} fill="#3b82f6" stroke="white" />
          <ReferenceDot x={userPt.x} y={userPt.y} r={9} fill="#f59e0b" stroke="white" strokeWidth={2} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function AllocationBar({ symbol, weight, maxWeight }: { symbol: string; weight: number; maxWeight: number }) {
  const pct = (weight / maxWeight) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 font-mono text-xs">{symbol}</div>
      <div className="flex-1 h-6 bg-muted/40 rounded relative overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-500/70 to-orange-400 rounded transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-16 text-right font-mono text-xs">{(weight * 100).toFixed(1)}%</div>
    </div>
  );
}

// --- Main page ---

export default function PortfolioMPT() {
  const [holdings, setHoldings] = useState(DEFAULT_PORTFOLIO);
  const [cycleId, setCycleId] = useState('cycle3');
  const [riskFreeRate, setRiskFreeRate] = useState(0.045);
  const [saved, setSaved] = useState<SavedPortfolio[]>([]);
  const [saveDialog, setSaveDialog] = useState<{ open: boolean; name: string }>({ open: false, name: '' });

  useEffect(() => { setSaved(loadSavedPortfolios()); }, []);

  // Fetch config (cycles + universe)
  const configQuery = useQuery<MPTConfig>({
    queryKey: ['/api/mpt/cycles'],
    queryFn: () => fetch('/api/mpt/cycles').then(r => r.json()),
    staleTime: 24 * 60 * 60 * 1000,
  });

  // Compute mutation
  const computeMutation = useMutation<MPTResult, Error, void>({
    mutationFn: async () => {
      const valid = holdings.filter(h => h.symbol && h.quantity > 0);
      if (valid.length < 2) throw new Error('Need at least 2 valid holdings');
      const res = await apiRequest('POST', '/api/mpt/compute', {
        holdings: valid,
        cycleId,
        riskFreeRate,
      });
      return res.json();
    },
  });

  // Auto-run on first load
  if (!computeMutation.data && !computeMutation.isPending && !computeMutation.error && configQuery.data) {
    queueMicrotask(() => computeMutation.mutate());
  }

  const result = computeMutation.data;
  const config = configQuery.data;

  const addHolding = () => setHoldings([...holdings, { symbol: '', quantity: 0 }]);
  const removeHolding = (i: number) => setHoldings(holdings.filter((_, idx) => idx !== i));
  const updateHolding = (i: number, patch: Partial<{ symbol: string; quantity: number }>) => {
    const next = [...holdings];
    next[i] = { ...next[i], ...patch };
    setHoldings(next);
  };

  // --- Saved portfolios (MPT Phase 2 B1) ---

  function savePortfolio() {
    if (!saveDialog.name.trim()) return;
    const valid = holdings.filter(h => h.symbol && h.quantity > 0);
    if (valid.length < 2) return;
    const now = new Date().toISOString();
    const item: SavedPortfolio = {
      id: `pf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: saveDialog.name.trim(),
      holdings: valid,
      cycleId,
      riskFreeRate,
      createdAt: now,
      updatedAt: now,
    };
    const next = [...saved, item].slice(-50); // cap at 50
    setSaved(next);
    persistSavedPortfolios(next);
    setSaveDialog({ open: false, name: '' });
  }

  function loadPortfolio(p: SavedPortfolio) {
    setHoldings(p.holdings);
    setCycleId(p.cycleId);
    setRiskFreeRate(p.riskFreeRate);
  }

  function deletePortfolio(id: string) {
    const next = saved.filter(s => s.id !== id);
    setSaved(next);
    persistSavedPortfolios(next);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-6 w-6 text-orange-500" />
            <h1 className="text-3xl font-bold">Modern Portfolio Theory</h1>
          </div>
          <p className="text-muted-foreground">
            Compose your crypto portfolio across halving cycles. See the efficient frontier,
            your distance from optimal, and what to buy or sell to fix it.
          </p>
        </div>

        {/* Saved portfolios (MPT Phase 2 B1) */}
        {saved.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Saved Portfolios ({saved.length})
              </CardTitle>
              <CardDescription>
                Stored locally in your browser. Cap at 50.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {saved.map(p => {
                const total = p.holdings.reduce((s, h) => s + h.quantity, 0);
                return (
                  <div key={p.id} className="flex items-start gap-1 p-2 rounded bg-muted/30 border border-border/30">
                    <button onClick={() => loadPortfolio(p)} className="flex-1 text-left">
                      <div className="font-semibold text-xs">{p.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {p.holdings.length} assets · cycle {p.cycleId.replace('cycle', '')} · rF {(p.riskFreeRate * 100).toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(p.updatedAt).toLocaleDateString()}
                      </div>
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => deletePortfolio(p.id)} className="h-6 w-6 p-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Input panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Portfolio
            </CardTitle>
            <CardDescription>
              Pick a 4-year cycle window. Add your holdings. Compute.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Cycle</label>
                <Select value={cycleId} onValueChange={setCycleId}>
                  <SelectTrigger className="w-72">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config?.cycles.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                        {c.isLive && <Badge variant="outline" className="ml-2 text-orange-400 border-orange-400/40">live</Badge>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Risk-Free Rate (annualized)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" step="0.001" min="0" max="0.20"
                    value={riskFreeRate}
                    onChange={e => setRiskFreeRate(parseFloat(e.target.value) || 0)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">{(riskFreeRate * 100).toFixed(2)}%</span>
                </div>
              </div>

              <Button onClick={() => computeMutation.mutate()} disabled={computeMutation.isPending}>
                {computeMutation.isPending ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Computing…</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Compute</>
                )}
              </Button>

              <Button
                variant="outline"
                disabled={holdings.filter(h => h.symbol && h.quantity > 0).length < 2}
                onClick={() => setSaveDialog({ open: true, name: '' })}
              >
                <Save className="h-4 w-4 mr-2" /> Save Portfolio
              </Button>
            </div>

            {/* Holdings table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((h, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Select value={h.symbol} onValueChange={v => updateHolding(i, { symbol: v })}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Pick asset" />
                        </SelectTrigger>
                        <SelectContent>
                          {config?.universe.map(a => (
                            <SelectItem key={a.symbol} value={a.symbol}>
                              <span className="font-mono font-semibold">{a.symbol}</span>
                              <span className="text-muted-foreground ml-2 text-xs">{a.name}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number" step="0.0001" min="0"
                        value={h.quantity || ''}
                        onChange={e => updateHolding(i, { quantity: parseFloat(e.target.value) || 0 })}
                        className="w-32 font-mono"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => removeHolding(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="outline" size="sm" onClick={addHolding}>
              <Plus className="h-4 w-4 mr-2" /> Add Asset
            </Button>

            {result?.excludedAssets && result.excludedAssets.length > 0 && (
              <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded p-2">
                Excluded from optimization (insufficient data):{' '}
                {result.excludedAssets.map(a => `${a.symbol} (${a.reason})`).join('; ')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading */}
        {computeMutation.isPending && (
          <Card><CardContent className="p-6 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </CardContent></Card>
        )}

        {/* Error */}
        {computeMutation.error && (
          <Card className="border-red-500/50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
              <div>
                <div className="font-semibold text-red-400">Compute failed</div>
                <div className="text-sm text-muted-foreground">{computeMutation.error.message}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Headline stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Your Portfolio Sharpe"
                value={result.currentPortfolio.sharpe.toFixed(2)}
                accent={result.currentPortfolio.sharpe > 1 ? 'pos' : 'neutral'}
                sub={`${(result.currentPortfolio.expectedReturn * 100).toFixed(1)}% ret / ${(result.currentPortfolio.volatility * 100).toFixed(1)}% vol`}
              />
              <StatCard
                label="Max Sharpe (Optimal)"
                value={result.maxSharpe.sharpe.toFixed(2)}
                accent="pos"
                sub={`${(result.maxSharpe.expectedReturn * 100).toFixed(1)}% ret / ${(result.maxSharpe.volatility * 100).toFixed(1)}% vol`}
              />
              <StatCard
                label="Distance from Frontier"
                value={`${(result.distanceFromFrontier * 100).toFixed(1)}%`}
                sub="excess vol at your return"
                accent={result.distanceFromFrontier < 0.02 ? 'pos' : 'neutral'}
              />
              <StatCard
                label="Improvement Potential"
                value={isFinite(result.improvementPotential) ? `${(result.improvementPotential * 100).toFixed(0)}%` : '∞'}
                sub="Sharpe gain if rebalanced"
                accent="pos"
              />
            </div>

            {/* Per-asset stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Per-Asset Stats ({result.cycle.label})
                </CardTitle>
                <CardDescription>
                  Annualized figures. Sharpe uses your risk-free rate of {(result.riskFreeRate * 100).toFixed(2)}%.
                  Meta: {result.metadata.commonDates} overlapping days · eval {result.metadata.evalMs}ms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-right">Return</TableHead>
                      <TableHead className="text-right">Volatility</TableHead>
                      <TableHead className="text-right">Max DD</TableHead>
                      <TableHead className="text-right">Total Ret</TableHead>
                      <TableHead className="text-right">Sharpe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.symbols.map(s => {
                      const a = result.perAsset[s];
                      return (
                        <TableRow key={s}>
                          <TableCell className="font-mono font-semibold">{s}</TableCell>
                          <TableCell className={`text-right font-mono ${pctColor(a.meanReturn)}`}>
                            {(a.meanReturn * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right font-mono">{(a.volatility * 100).toFixed(1)}%</TableCell>
                          <TableCell className="text-right font-mono text-red-400">-{(a.maxDrawdown * 100).toFixed(0)}%</TableCell>
                          <TableCell className={`text-right font-mono ${pctColor(a.totalReturn)}`}>
                            {a.totalReturn >= 0 ? '+' : ''}{(a.totalReturn * 100).toFixed(0)}%
                          </TableCell>
                          <TableCell className={`text-right font-mono font-semibold ${pctColor(a.sharpe)}`}>
                            {a.sharpe.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Frontier */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Efficient Frontier
                </CardTitle>
                <CardDescription>
                  10,000 simulated portfolios (subsampled to 2,000 for display).{' '}
                  <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>Max Sharpe</span>{' · '}
                  <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>Min Vol</span>{' · '}
                  <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-amber-500"></span>Your portfolio</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EfficientFrontierChart result={result} />
              </CardContent>
            </Card>

            {/* Correlation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Correlation Matrix
                </CardTitle>
                <CardDescription>
                  How your assets move together. High correlations reduce diversification benefit.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CorrelationHeatmap symbols={result.symbols} corr={result.correlation} />
              </CardContent>
            </Card>

            {/* Allocation compare */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wallet className="h-4 w-4" />
                    Current Weights
                  </CardTitle>
                  {result.currentPortfolio.totalValue && (
                    <CardDescription className="font-mono">
                      Total: {formatCurrency(result.currentPortfolio.totalValue)}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.symbols.map(s => (
                    <AllocationBar key={s} symbol={s} weight={result.currentPortfolio.weights[s]} maxWeight={1} />
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4 text-green-400" />
                    Optimal (Max Sharpe)
                  </CardTitle>
                  <CardDescription>
                    Sharpe {result.maxSharpe.sharpe.toFixed(2)} · {(result.maxSharpe.expectedReturn * 100).toFixed(1)}% / {(result.maxSharpe.volatility * 100).toFixed(1)}%
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.symbols.map(s => (
                    <AllocationBar key={s} symbol={s} weight={result.maxSharpe.weights[s]} maxWeight={1} />
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Rebalance trades */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5" />
                  Rebalance Trades
                </CardTitle>
                <CardDescription>
                  Buys (positive $) and sells (negative $) to migrate from current to Max-Sharpe.
                  Shown in USD relative to current portfolio total.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">Target</TableHead>
                      <TableHead className="text-right">Δ Weight</TableHead>
                      <TableHead className="text-right">Δ USD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rebalanceTrades.map(t => (
                      <TableRow key={t.symbol}>
                        <TableCell className="font-mono font-semibold">{t.symbol}</TableCell>
                        <TableCell className="text-right font-mono">{(t.currentWeight * 100).toFixed(1)}%</TableCell>
                        <TableCell className="text-right font-mono">{(t.targetWeight * 100).toFixed(1)}%</TableCell>
                        <TableCell className={`text-right font-mono ${pctColor(t.deltaWeight)}`}>
                          {t.deltaWeight >= 0 ? '+' : ''}{(t.deltaWeight * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className={`text-right font-mono font-semibold ${pctColor(t.deltaValue)}`}>
                          {t.deltaValue >= 0 ? '+' : ''}{formatCurrency(t.deltaValue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-3 text-xs text-muted-foreground">
                  Note: these are USD targets, not exchange orders. Phase 2 will generate actual
                  trade lists rounded to whole units and slippage-aware.
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Empty state when config still loading */}
        {configQuery.isLoading && !result && (
          <Skeleton className="h-96 w-full" />
        )}

        {/* Save portfolio dialog (MPT Phase 2 B1) */}
        {saveDialog.open && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSaveDialog({ open: false, name: '' })}>
            <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
              <div className="text-lg font-bold mb-3">Save portfolio</div>
              <Input
                value={saveDialog.name}
                onChange={e => setSaveDialog(d => ({ ...d, name: e.target.value }))}
                placeholder="Portfolio name (e.g. Retirement BTC-heavy)"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') savePortfolio(); }}
              />
              <div className="text-xs text-muted-foreground mt-2">
                Saves {holdings.filter(h => h.symbol && h.quantity > 0).length} assets · cycle {cycleId} · rF {(riskFreeRate * 100).toFixed(1)}%
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setSaveDialog({ open: false, name: '' })}>Cancel</Button>
                <Button onClick={savePortfolio} disabled={!saveDialog.name.trim()}>Save</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}