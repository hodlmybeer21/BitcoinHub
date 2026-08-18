// BitcoinHub Workbench — No-Code Indicator Builder
// /workbench — main page

import { useState, useEffect, useMemo } from "react";
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
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  ReferenceLine, Tooltip as RTooltip,
} from "recharts";
import {
  AlertCircle, Hammer, Sparkles, Save, FolderOpen, Trash2, Play,
  RefreshCw, Copy, BookOpen,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// --- Types ---

interface BlockMeta {
  id: string;
  label: string;
  category: string;
  description: string;
  unit?: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  formula: string;
}

interface SeriesPoint { date: string; value: number; }

interface EvalResult {
  formula: string;
  range: { start: string; end: string };
  series: SeriesPoint[];
  sources: { id: string; points: number }[];
  errors: string[];
  evalMs: number;
}

interface SavedIndicator {
  id: string;
  name: string;
  formula: string;
  range: { start: string; end: string };
  savedAt: string;
}

// --- Local persistence (anonymous, MVP) ---

const STORAGE_KEY = 'bitcoinhub_workbench_indicators_v1';

function loadSaved(): SavedIndicator[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

function persistSaved(items: SavedIndicator[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
  catch (e) { console.warn('[workbench] localStorage write failed:', e); }
}

// --- Helpers ---

function todayISO(): string { return new Date().toISOString().split('T')[0]; }
function daysAgoISO(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split('T')[0];
}

// --- Components ---

function BlockChip({ block, onClick }: { block: BlockMeta; onClick?: () => void }) {
  const categoryColors: Record<string, string> = {
    price: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    sentiment: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    funding: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    whales: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    options: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    onchain: 'bg-green-500/15 text-green-300 border-green-500/30',
    macro: 'bg-red-500/15 text-red-300 border-red-500/30',
    liquidity: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    time: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-2 rounded border font-mono text-xs hover:opacity-80 transition ${categoryColors[block.category] || 'bg-muted'}`}
      title={block.description}
    >
      <div className="font-semibold">{block.id}</div>
      <div className="text-[10px] opacity-70 mt-0.5">{block.unit || block.category}</div>
    </button>
  );
}

function PreviewChart({ series, range }: { series: SeriesPoint[]; range: { start: string; end: string } }) {
  const chartData = useMemo(
    () => series.map(p => ({ date: p.date, value: p.value })),
    [series]
  );

  if (series.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-muted-foreground text-sm">
        Run the formula to see the chart
      </div>
    );
  }

  const values = series.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const isBoolean = values.every(v => v === 0 || v === 1);

  return (
    <div className="w-full h-80">
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 10, right: 30, bottom: 30, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#888', fontSize: 10 }}
            minTickGap={50}
          />
          <YAxis
            tick={{ fill: '#888', fontSize: 10 }}
            domain={isBoolean ? [-0.05, 1.05] : ['auto', 'auto']}
          />
          <RTooltip
            contentStyle={{
              backgroundColor: 'rgba(0,0,0,0.85)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: '#aaa' }}
            formatter={(value: any) => [typeof value === 'number' ? value.toFixed(4) : value, 'Value']}
          />
          {isBoolean && <ReferenceLine y={0.5} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="text-[10px] text-muted-foreground mt-1 text-center font-mono">
        range: [{min.toFixed(3)}, {max.toFixed(3)}] · {series.length} points · {range.start} → {range.end}
      </div>
    </div>
  );
}

// --- Main page ---

const RANGE_PRESETS: { label: string; days: number }[] = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '180 days', days: 180 },
  { label: '1 year', days: 365 },
  { label: '2 years', days: 730 },
];

export default function Workbench() {
  const [formula, setFormula] = useState('fear_greed.value < 30');
  const [rangeDays, setRangeDays] = useState(365);
  const [range, setRange] = useState<{ start: string; end: string }>({
    start: daysAgoISO(365),
    end: todayISO(),
  });
  const [saved, setSaved] = useState<SavedIndicator[]>([]);
  const [saveDialog, setSaveDialog] = useState<{ open: boolean; name: string }>({ open: false, name: '' });
  const [showBlocks, setShowBlocks] = useState(true);

  useEffect(() => { setSaved(loadSaved()); }, []);

  const blocksQuery = useQuery<BlockMeta[]>({
    queryKey: ['/api/workbench/blocks'],
    queryFn: () => apiRequest('GET', '/api/workbench/blocks').then(d => d.blocks),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const templatesQuery = useQuery<Template[]>({
    queryKey: ['/api/workbench/templates'],
    queryFn: () => apiRequest('GET', '/api/workbench/templates').then(d => d.templates),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const evaluateMutation = useMutation<EvalResult, Error, void>({
    mutationFn: async () => {
      return apiRequest('POST', '/api/workbench/evaluate', { formula, range });
    },
  });

  function applyRange(days: number) {
    setRangeDays(days);
    setRange({ start: daysAgoISO(days), end: todayISO() });
  }

  function loadIndicator(ind: SavedIndicator) {
    setFormula(ind.formula);
    setRange(ind.range);
    setRangeDays(Math.round((new Date(ind.range.end).getTime() - new Date(ind.range.start).getTime()) / 86400000));
  }

  function saveIndicator() {
    if (!saveDialog.name.trim()) return;
    const item: SavedIndicator = {
      id: `ind_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: saveDialog.name.trim(),
      formula,
      range,
      savedAt: new Date().toISOString(),
    };
    const next = [...saved, item].slice(-50); // cap at 50
    setSaved(next);
    persistSaved(next);
    setSaveDialog({ open: false, name: '' });
  }

  function deleteIndicator(id: string) {
    const next = saved.filter(s => s.id !== id);
    setSaved(next);
    persistSaved(next);
  }

  function applyTemplate(t: Template) {
    setFormula(t.formula);
  }

  function insertBlock(blockId: string) {
    setFormula(prev => prev ? `${prev} ${blockId}` : blockId);
  }

  const blocks = blocksQuery.data || [];
  const templates = templatesQuery.data || [];
  const result = evaluateMutation.data;

  const blocksByCategory = useMemo(() => {
    const map: Record<string, BlockMeta[]> = {};
    for (const b of blocks) {
      if (!map[b.category]) map[b.category] = [];
      map[b.category].push(b);
    }
    return map;
  }, [blocks]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Hammer className="h-6 w-6 text-orange-500" />
              <h1 className="text-3xl font-bold">Workbench</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl">
              Build custom indicators from BitcoinHub's data sources — no code.
              Compose formulas from blocks like <code className="text-orange-400 font-mono">fear_greed.value</code>,
              apply series operators like <code className="text-orange-400 font-mono">sma(X, 30)</code>, combine with logic.
            </p>
          </div>
          <Button onClick={() => setSaveDialog({ open: true, name: formula.slice(0, 40) })} variant="outline" disabled={!formula}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-4">
          {/* Sidebar */}
          <div className="space-y-4">
            {/* Templates */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Templates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {templatesQuery.isLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      className="w-full text-left p-2 rounded bg-muted/30 hover:bg-muted/60 transition border border-border/30"
                    >
                      <div className="font-semibold text-xs">{t.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{t.description}</div>
                      <div className="text-[10px] font-mono text-orange-400 mt-1">{t.formula.slice(0, 30)}{t.formula.length > 30 ? '…' : ''}</div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Saved indicators */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Saved ({saved.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {saved.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-2">No saved indicators yet</div>
                ) : (
                  saved.map(ind => (
                    <div key={ind.id} className="flex items-start gap-1 p-2 rounded bg-muted/30 border border-border/30">
                      <button onClick={() => loadIndicator(ind)} className="flex-1 text-left">
                        <div className="font-semibold text-xs">{ind.name}</div>
                        <div className="text-[10px] font-mono text-muted-foreground line-clamp-1">{ind.formula}</div>
                      </button>
                      <Button variant="ghost" size="sm" onClick={() => deleteIndicator(ind.id)} className="h-6 w-6 p-0">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Block palette (collapsible) */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Blocks ({blocks.length})
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowBlocks(s => !s)} className="h-6 px-2">
                    {showBlocks ? '−' : '+'}
                  </Button>
                </div>
              </CardHeader>
              {showBlocks && (
                <CardContent className="space-y-3">
                  {blocksQuery.isLoading ? (
                    <Skeleton className="h-12 w-full" />
                  ) : (
                    Object.entries(blocksByCategory).map(([cat, list]) => (
                      <div key={cat}>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{cat}</div>
                        <div className="grid grid-cols-2 gap-1">
                          {list.map(b => (
                            <BlockChip key={b.id} block={b} onClick={() => insertBlock(b.id)} />
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              )}
            </Card>
          </div>

          {/* Main */}
          <div className="space-y-4">
            {/* Formula input */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Formula</CardTitle>
                <CardDescription>
                  Operators: <code className="font-mono text-xs">+ - * /</code> · comparisons <code className="font-mono text-xs">{`> < >= <= == !=`}</code> · logic <code className="font-mono text-xs">AND OR NOT</code> · series <code className="font-mono text-xs">sma(X,n) ema(X,n) change(X,n) stddev(X,n)</code> · cross <code className="font-mono text-xs">crosses_above(a,b)</code> · range <code className="font-mono text-xs">between(x,lo,hi)</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea
                  value={formula}
                  onChange={e => setFormula(e.target.value)}
                  rows={3}
                  spellCheck={false}
                  className="w-full font-mono text-sm p-3 rounded bg-muted/40 border border-border/50 focus:outline-none focus:border-orange-500/50"
                  placeholder="e.g. fear_greed.value < 30 AND btc.price.change(7) < -10"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <Select value={String(rangeDays)} onValueChange={v => applyRange(parseInt(v))}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RANGE_PRESETS.map(r => (
                        <SelectItem key={r.days} value={String(r.days)}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="text-xs text-muted-foreground font-mono">
                    {range.start} → {range.end}
                  </div>

                  <Button onClick={() => evaluateMutation.mutate()} disabled={evaluateMutation.isPending || !formula.trim()}>
                    {evaluateMutation.isPending ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Evaluating…</>
                    ) : (
                      <><Play className="h-4 w-4 mr-2" /> Run</>
                    )}
                  </Button>

                  <Button onClick={() => navigator.clipboard?.writeText(formula)} variant="outline" size="sm">
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Preview chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Preview</span>
                  {result && (
                    <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                      <span>{result.series.length} points</span>
                      <span>·</span>
                      <span>{result.evalMs}ms</span>
                      <span>·</span>
                      <span>{result.sources.length} sources</span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {evaluateMutation.isPending ? (
                  <Skeleton className="h-80 w-full" />
                ) : (
                  <PreviewChart series={result?.series || []} range={result?.range || range} />
                )}
              </CardContent>
            </Card>

            {/* Errors / sources */}
            {result && (result.errors.length > 0 || result.sources.length > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Diagnostics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.sources.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Resolved sources:</div>
                      <div className="flex flex-wrap gap-1">
                        {result.sources.map(s => (
                          <Badge key={s.id} variant="outline" className="font-mono">
                            {s.id} <span className="ml-1 text-muted-foreground">{s.points}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.errors.length > 0 && (
                    <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded p-2">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      {result.errors.join(' · ')}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {evaluateMutation.error && (
              <Card className="border-red-500/50">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                  <div>
                    <div className="font-semibold text-red-400">Parse / evaluation failed</div>
                    <div className="text-sm text-muted-foreground">{evaluateMutation.error.message}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Save dialog */}
        {saveDialog.open && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSaveDialog({ open: false, name: '' })}>
            <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
              <div className="text-lg font-bold mb-3">Save indicator</div>
              <Input
                value={saveDialog.name}
                onChange={e => setSaveDialog(d => ({ ...d, name: e.target.value }))}
                placeholder="Indicator name"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') saveIndicator(); }}
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setSaveDialog({ open: false, name: '' })}>Cancel</Button>
                <Button onClick={saveIndicator}>Save</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}