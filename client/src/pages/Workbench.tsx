// BitcoinHub Workbench — No-Code Indicator Builder
// /workbench — main page

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import {
  ReactFlow, Background, Controls, MiniMap,
  applyNodeChanges, applyEdgeChanges, addEdge,
  Handle, Position, type Node as RFNode, type Edge, type NodeChange, type EdgeChange, type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
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
  RefreshCw, Copy, BookOpen, Plus, MousePointerClick,
  Download, Share2, Upload, Link as LinkIcon,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useSyncedStorage } from "@/lib/persistence/client";

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

// localStorage keys retained for fast first-paint + offline fallback inside
// the useSyncedStorage hook. Writes go through the hook (which schedules a
// debounced server sync via /api/persistence/sync).
const STORAGE_KEY = 'bitcoinhub_workbench_indicators_v1';
const CANVAS_POS_KEY = 'bitcoinhub_workbench_canvas_v1';

// Canvas node positions persist independently of saved indicators so users can
// arrange their drag-drop canvas and have it survive reloads.
const CANVAS_POS_KEY = 'bitcoinhub_workbench_canvas_v1';

function loadCanvasPositions(): PositionMap {
  try {
    const raw = localStorage.getItem(CANVAS_POS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function persistCanvasPositions(p: PositionMap) {
  try { localStorage.setItem(CANVAS_POS_KEY, JSON.stringify(p)); }
  catch (e) { console.warn('[workbench] canvas positions localStorage write failed:', e); }
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
  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    e.dataTransfer.setData('application/bitcoinhub-block', block.id);
    e.dataTransfer.effectAllowed = 'copyMove';
  };
  return (
    <button
      type="button"
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className={`text-left p-2 rounded border font-mono text-xs hover:opacity-80 transition cursor-grab active:cursor-grabbing ${categoryColors[block.category] || 'bg-muted'}`}
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

// --- Visual formula editor (Phase 2) ---

type ASTNode =
  | { type: 'data'; id: string }
  | { type: 'const'; value: number }
  | { type: 'neg'; input: ASTNode }
  | { type: 'add' | 'sub' | 'mul' | 'div'; left: ASTNode; right: ASTNode }
  | { type: 'cmp'; op: '>' | '<' | '>=' | '<=' | '==' | '!='; left: ASTNode; right: ASTNode }
  | { type: 'and' | 'or'; inputs: ASTNode[] }
  | { type: 'not'; input: ASTNode }
  | { type: 'series'; op: 'sma' | 'ema' | 'change' | 'stddev'; input: ASTNode; period: number }
  | { type: 'cross'; op: 'crosses_above' | 'crosses_below'; left: ASTNode; right: ASTNode }
  | { type: 'between'; input: ASTNode; lo: ASTNode; hi: ASTNode };

function NodeRenderer({ node, blocks, depth }: { node: ASTNode; blocks: BlockMeta[]; depth: number }) {
  const indent = depth * 14;
  const wrap = (children: React.ReactNode, key?: string) => (
    <div key={key} style={{ marginLeft: indent }} className="my-0.5 flex flex-wrap items-center gap-1">
      {children}
    </div>
  );
  const Chip = ({ children, color }: { children: React.ReactNode; color: string }) => (
    <span className={`font-mono text-xs px-2 py-0.5 rounded border ${color}`}>{children}</span>
  );
  const opColor = 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
  const dataColor = 'bg-orange-500/15 text-orange-300 border-orange-500/30';
  const constColor = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
  const fnColor = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
  const logicColor = 'bg-pink-500/15 text-pink-300 border-pink-500/30';

  switch (node.type) {
    case 'data': {
      const block = blocks.find(b => b.id === node.id);
      return wrap(
        <>
          <Chip color={dataColor}>{node.id}</Chip>
          {block && <span className="text-[10px] text-muted-foreground">({block.label})</span>}
        </>
      );
    }
    case 'const':
      return wrap(<Chip color={constColor}>{String(node.value)}</Chip>);
    case 'neg':
      return wrap(
        <>
          <span className="font-mono text-xs text-purple-300 px-1">−</span>
          <NodeRenderer node={node.input} blocks={blocks} depth={depth} />
        </>
      );
    case 'add': case 'sub': case 'mul': case 'div': {
      const sym = node.type === 'add' ? '+' : node.type === 'sub' ? '−' : node.type === 'mul' ? '×' : '÷';
      return wrap(
        <>
          <NodeRenderer node={node.left} blocks={blocks} depth={depth} />
          <Chip color={opColor}>{sym}</Chip>
          <NodeRenderer node={node.right} blocks={blocks} depth={depth} />
        </>
      );
    }
    case 'cmp':
      return wrap(
        <>
          <NodeRenderer node={node.left} blocks={blocks} depth={depth} />
          <Chip color={opColor}>{node.op}</Chip>
          <NodeRenderer node={node.right} blocks={blocks} depth={depth} />
        </>
      );
    case 'and': case 'or':
      return (
        <div style={{ marginLeft: indent }} className="my-0.5">
          {node.inputs.map((input, i) => (
            <div key={i} className="my-1">
              <NodeRenderer node={input} blocks={blocks} depth={depth} />
              {i < node.inputs.length - 1 && (
                <div style={{ marginLeft: indent + 14 }}>
                  <Chip color={logicColor}>{node.type.toUpperCase()}</Chip>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    case 'not':
      return wrap(
        <>
          <Chip color={logicColor}>NOT</Chip>
          <NodeRenderer node={node.input} blocks={blocks} depth={depth} />
        </>
      );
    case 'series':
      return wrap(
        <>
          <Chip color={fnColor}>{node.op}</Chip>
          <span className="text-muted-foreground text-xs">(</span>
          <NodeRenderer node={node.input} blocks={blocks} depth={depth} />
          <span className="text-muted-foreground text-xs">,</span>
          <Chip color={constColor}>{node.period}</Chip>
          <span className="text-muted-foreground text-xs">)</span>
        </>
      );
    case 'cross':
      return wrap(
        <>
          <Chip color={fnColor}>{node.op}</Chip>
          <span className="text-muted-foreground text-xs">(</span>
          <NodeRenderer node={node.left} blocks={blocks} depth={depth} />
          <span className="text-muted-foreground text-xs">,</span>
          <NodeRenderer node={node.right} blocks={blocks} depth={depth} />
          <span className="text-muted-foreground text-xs">)</span>
        </>
      );
    case 'between':
      return wrap(
        <>
          <Chip color={fnColor}>between</Chip>
          <span className="text-muted-foreground text-xs">(</span>
          <NodeRenderer node={node.input} blocks={blocks} depth={depth} />
          <span className="text-muted-foreground text-xs">,</span>
          <NodeRenderer node={node.lo} blocks={blocks} depth={depth} />
          <span className="text-muted-foreground text-xs">,</span>
          <NodeRenderer node={node.hi} blocks={blocks} depth={depth} />
          <span className="text-muted-foreground text-xs">)</span>
        </>
      );
  }
}

function VisualFormulaEditor({ formula, blocks }: { formula: string; blocks: BlockMeta[] }) {
  const [tree, setTree] = useState<ASTNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!formula.trim()) { setTree(null); setError(null); return; }
    setLoading(true);
    fetch('/api/workbench/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formula }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.ast) { setTree(data.ast); setError(null); }
        else { setError(data.error || 'Parse error'); setTree(null); }
      })
      .catch(e => { setError(String(e)); setTree(null); })
      .finally(() => setLoading(false));
  }, [formula]);

  if (loading) return <Skeleton className="h-24 w-full" />;
  if (error) return (
    <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded p-2">
      <AlertCircle className="h-3 w-3 inline mr-1" />
      {error}
    </div>
  );
  if (!tree) return <div className="text-xs text-muted-foreground p-3 bg-muted/20 rounded border border-border/30 min-h-[80px] flex items-center justify-center">Enter a formula to see the structured view.</div>;

  return (
    <div className="p-3 rounded bg-muted/40 border border-border/50 min-h-[80px]">
      <NodeRenderer node={tree} blocks={blocks} depth={0} />
    </div>
  );
}

// --- Canvas editor (Workbench Phase 3) ---

// Lightweight AST → ReactFlow graph.  Each AST node becomes one RF node; each
// parent→child link becomes one RF edge.  Node positioning uses a simple
// auto-layout (column per AST depth, row per sibling).  The graph is rebuilt
// every time the formula changes, but node positions are preserved by id so
// users don't lose their drag-arrangement.

interface PositionMap { [nodeId: string]: { x: number; y: number }; }

function astToGraph(
  ast: ASTNode | null,
  blocks: BlockMeta[],
  positions: PositionMap,
  dropQueue: { x: number; y: number }[] = [],
): { nodes: RFNode[]; edges: Edge[] } {
  if (!ast) return { nodes: [], edges: [] };
  const nodes: RFNode[] = [];
  const edges: Edge[] = [];
  let idSeq = 0;
  let dropIdx = 0;

  const blockCategory = (id: string): string =>
    blocks.find(b => b.id === id)?.category ?? 'unknown';

  function push(node: ASTNode, depth: number): string {
    const id = `n${idSeq++}`;
    const label = (() => {
      switch (node.type) {
        case 'data': return node.id;
        case 'const': return String(node.value);
        case 'neg': return '−';
        case 'add': return '+';
        case 'sub': return '−';
        case 'mul': return '×';
        case 'div': return '÷';
        case 'cmp': return node.op;
        case 'and': return 'AND';
        case 'or': return 'OR';
        case 'not': return 'NOT';
        case 'series': return `${node.op}(${node.period})`;
        case 'cross': return node.op.replace('_', ' ');
        case 'between': return 'between';
      }
    })();
    const category = node.type === 'data' ? blockCategory((node as any).id) : node.type;

    // Auto-layout: column = depth, row = sibling index in a separate counter map.
    const col = depth;
    const row = (siblingCount[depth] = (siblingCount[depth] || 0) + 1) - 1;
    // For data nodes only, consume the next dropQueue position (if any) so the
    // user-dropped block appears where they dropped it instead of at auto-layout.
    const isData = node.type === 'data';
    const dropPos = isData && dropIdx < dropQueue.length ? dropQueue[dropIdx++] : null;
    const saved = positions[id] ?? dropPos ?? { x: 60 + col * 220, y: 40 + row * 110 };
    nodes.push({
      id,
      type: 'block',
      position: saved,
      data: { label, category, kind: node.type, payload: node },
    });

    function linkChild(childId: string, handle: string) {
      edges.push({
        id: `e${childId}->${id}`,
        source: childId,
        target: id,
        sourceHandle: 'out',
        targetHandle: handle,
        animated: false,
      });
    }

    if (node.type === 'neg') {
      linkChild(push(node.input, depth + 1), 'in');
    } else if (node.type === 'add' || node.type === 'sub' || node.type === 'mul' || node.type === 'div') {
      linkChild(push(node.left, depth + 1), 'left');
      linkChild(push(node.right, depth + 1), 'right');
    } else if (node.type === 'cmp') {
      linkChild(push(node.left, depth + 1), 'left');
      linkChild(push(node.right, depth + 1), 'right');
    } else if (node.type === 'and' || node.type === 'or') {
      node.inputs.forEach((child, i) => {
        linkChild(push(child, depth + 1), `in${i}`);
      });
    } else if (node.type === 'not') {
      linkChild(push(node.input, depth + 1), 'in');
    } else if (node.type === 'series') {
      linkChild(push(node.input, depth + 1), 'in');
    } else if (node.type === 'cross') {
      linkChild(push(node.left, depth + 1), 'left');
      linkChild(push(node.right, depth + 1), 'right');
    } else if (node.type === 'between') {
      linkChild(push(node.input, depth + 1), 'in');
      linkChild(push(node.lo, depth + 1), 'lo');
      linkChild(push(node.hi, depth + 1), 'hi');
    }
    return id;
  }

  // siblingCount is a closure-local counter; reset per call.
  const siblingCount: Record<number, number> = {};
  void push(ast, 0);
  return { nodes, edges };
}

// Custom node renderer for ReactFlow.
const CATEGORY_COLORS: Record<string, string> = {
  price: '#fb923c', sentiment: '#facc15', funding: '#60a5fa', whales: '#c084fc',
  options: '#f472b6', onchain: '#4ade80', macro: '#f87171', liquidity: '#22d3ee',
  time: '#94a3b8', unknown: '#9ca3af',
  data: '#fb923c', const: '#60a5fa', neg: '#c084fc',
  add: '#facc15', sub: '#facc15', mul: '#facc15', div: '#facc15',
  cmp: '#facc15', and: '#f472b6', or: '#f472b6', not: '#f472b6',
  series: '#22d3ee', cross: '#22d3ee', between: '#22d3ee',
};

function BlockNode({ data }: { data: { label: string; category: string; kind: string } }) {
  const color = CATEGORY_COLORS[data.category] ?? CATEGORY_COLORS[data.kind] ?? CATEGORY_COLORS.unknown;
  // Determine which input handles this node has based on AST kind.
  const inputs: { id: string; label: string }[] = (() => {
    switch (data.kind) {
      case 'neg':
      case 'not':
      case 'series':
        return [{ id: 'in', label: 'in' }];
      case 'add': case 'sub': case 'mul': case 'div':
      case 'cmp':
      case 'cross':
        return [{ id: 'left', label: 'L' }, { id: 'right', label: 'R' }];
      case 'between':
        return [{ id: 'in', label: 'x' }, { id: 'lo', label: 'lo' }, { id: 'hi', label: 'hi' }];
      case 'and': case 'or':
        // AND/OR can take 2..N inputs.  Show 3 slots for the common case.
        return [{ id: 'in0', label: 'A' }, { id: 'in1', label: 'B' }, { id: 'in2', label: 'C' }];
      default:
        return [];
    }
  })();
  return (
    <div
      className="px-3 py-2 rounded-md border-2 bg-card shadow-md min-w-[110px] text-center font-mono text-xs"
      style={{ borderColor: color, color }}
    >
      {inputs.map((p, i) => (
        <Handle
          key={p.id}
          id={p.id}
          type="target"
          position={Position.Left}
          style={{ background: color, top: `${30 + i * 24}px` }}
        />
      ))}
      <div className="font-semibold text-foreground">{data.label}</div>
      <div className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wide">{data.kind}</div>
      <Handle
        id="out"
        type="source"
        position={Position.Right}
        style={{ background: color, top: '50%' }}
      />
    </div>
  );
}

const nodeTypes = { block: BlockNode };

function CanvasEditor({
  formula, blocks, positions, onPositionsChange, onInsertRequest,
}: {
  formula: string;
  blocks: BlockMeta[];
  positions: PositionMap;
  onPositionsChange: (next: PositionMap) => void;
  onInsertRequest: (blockId: string) => void;
}) {
  const [tree, setTree] = useState<ASTNode | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rfInstance, setRfInstance] = useState<any>(null);
  const [dropQueue, setDropQueue] = useState<{ x: number; y: number }[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!formula.trim()) { setTree(null); setParseError(null); return; }
    setLoading(true);
    fetch('/api/workbench/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formula }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.ast) { setTree(data.ast); setParseError(null); }
        else { setParseError(data.error || 'Parse error'); setTree(null); }
      })
      .catch(e => { setParseError(String(e)); setTree(null); })
      .finally(() => setLoading(false));
  }, [formula]);

  const { nodes, edges } = useMemo(
    () => astToGraph(tree, blocks, positions, dropQueue),
    [tree, blocks, positions, dropQueue],
  );

  // Clear dropQueue once astToGraph has consumed it (every DataNode visited gets
  // its position from the queue in order). After this effect runs the queue is
  // empty so re-parses without new drops use auto-layout + saved positions only.
  useEffect(() => {
    if (dropQueue.length > 0) setDropQueue([]);
  }, [nodes]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Persist position changes so the user-arranged layout survives formula edits.
      let nextPositions = positions;
      for (const change of changes) {
        if (change.type === 'position' && change.position && change.id) {
          nextPositions = { ...nextPositions, [change.id]: change.position };
        }
      }
      if (nextPositions !== positions) onPositionsChange(nextPositions);
    },
    [positions, onPositionsChange],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!rfInstance) return;
    const blockId = e.dataTransfer.getData('application/bitcoinhub-block');
    if (!blockId) return;
    const position = rfInstance.screenToFlowPosition({
      x: e.clientX,
      y: e.clientY,
    });
    setDropQueue(q => [...q, position]);
    onInsertRequest(blockId);
  }, [rfInstance, onInsertRequest]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="text-muted-foreground">
          <MousePointerClick className="h-3 w-3 inline mr-1" />
          Drag from palette to add a block. Drag nodes to rearrange.
          Edges show how each formula term composes.
        </div>
        <div className="flex items-center gap-2 font-mono text-muted-foreground">
          {loading ? 'parsing…' : (
            <>{nodes.length} nodes · {edges.length} edges</>
          )}
        </div>
      </div>
      <div
        ref={wrapperRef}
        className="h-[440px] rounded border border-border/50 bg-muted/20 overflow-hidden"
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {parseError ? (
          <div className="h-full flex items-center justify-center p-4">
            <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded p-2 max-w-md">
              <AlertCircle className="h-3 w-3 inline mr-1" />
              {parseError}
            </div>
          </div>
        ) : nodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-2 p-4">
            <Plus className="h-6 w-6" />
            <div className="text-center">
              <div className="font-semibold text-foreground">Empty canvas</div>
              <div className="text-xs">Click or drag any block in the palette to add it as a node.</div>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onInit={setRfInstance}
            fitView
            proOptions={{ hideAttribution: true }}
            minZoom={0.2}
            maxZoom={2}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
          >
            <Background gap={16} color="rgba(255,255,255,0.05)" />
            <Controls showInteractive={false} className="!bg-card !border-border/50" />
          </ReactFlow>
        )}
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
  const [saved, setSaved] = useSyncedStorage<SavedIndicator[]>('workbench_indicators', [], STORAGE_KEY);
  const [saveDialog, setSaveDialog] = useState<{ open: boolean; name: string }>({ open: false, name: '' });
  const [showBlocks, setShowBlocks] = useState(true);
  const [editorMode, setEditorMode] = useState<'formula' | 'visual' | 'canvas'>('formula');
  const [canvasPositions, setCanvasPositions] = useSyncedStorage<PositionMap>('workbench_canvas_positions', {}, CANVAS_POS_KEY);

  useEffect(() => {
    // Backfill: also push the localStorage value to server on first load
    // (covers users who had data before persistence shipped). useSyncedStorage
    // already handles the read; this is purely the initial migration write.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedIndicator[];
        if (Array.isArray(parsed) && parsed.length > 0 && saved.length === 0) {
          setSaved(parsed);
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Read ?formula= and ?import= on mount (Workbench portability slice).
  // ?formula=  pre-fills the formula — used by /workbench/templates "Use this template"
  // ?import=   base64-encoded JSON of an indicator; opens the import dialog so the user
  //            can fork (save to localStorage) or cancel.
  const [importDialog, setImportDialog] = useState<{ open: boolean; indicator: any | null }>({ open: false, indicator: null });
  const [importText, setImportText] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const search = useSearch();
  useEffect(() => {
    if (!search) return;
    const params = new URLSearchParams(search);
    const formulaParam = params.get('formula');
    if (formulaParam) {
      try { setFormula(decodeURIComponent(formulaParam)); }
      catch { setFormula(formulaParam); }
    }
    const importParam = params.get('import');
    if (importParam) {
      try {
        const decoded = JSON.parse(atob(decodeURIComponent(importParam)));
        setImportDialog({ open: true, indicator: decoded });
      } catch (e) {
        console.warn('[workbench] invalid import data:', e);
      }
    }
    if (formulaParam || importParam) {
      const url = new URL(window.location.href);
      url.searchParams.delete('formula');
      url.searchParams.delete('import');
      window.history.replaceState({}, '', url.toString());
    }
  }, [search]);

  const onCanvasPositionsChange = useCallback((next: PositionMap) => {
    setCanvasPositions(next);
  }, [setCanvasPositions]);

  const blocksQuery = useQuery<{ blocks: BlockMeta[] }>({
    queryKey: ['/api/workbench/blocks'],
    queryFn: () => fetch('/api/workbench/blocks').then(r => r.json()),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const templatesQuery = useQuery<{ templates: Template[] }>({
    queryKey: ['/api/workbench/templates'],
    queryFn: () => fetch('/api/workbench/templates').then(r => r.json()),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const evaluateMutation = useMutation<EvalResult, Error, void>({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/workbench/evaluate', { formula, range });
      return res.json();
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

  // --- Portability: JSON export / URL share / paste-import ---

  function buildIndicatorPayload(ind: SavedIndicator) {
    return { name: ind.name, formula: ind.formula, range: ind.range, savedAt: ind.savedAt };
  }

  function exportIndicatorJson(ind: SavedIndicator) {
    try {
      const json = JSON.stringify(buildIndicatorPayload(ind), null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(ind.name || 'indicator').replace(/[^a-zA-Z0-9_-]/g, '_')}.workbench.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 0);
      setToast(`Exported "${ind.name}" as JSON.`);
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      setToast(`Export failed: ${String(e)}`);
      setTimeout(() => setToast(null), 3000);
    }
  }

  function shareIndicatorUrl(ind: SavedIndicator) {
    try {
      const payload = encodeURIComponent(btoa(JSON.stringify(buildIndicatorPayload(ind))));
      const url = `${window.location.origin}/workbench?import=${payload}`;
      navigator.clipboard?.writeText(url);
      setToast(`Share URL copied — paste anywhere to share "${ind.name}".`);
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      setToast(`Share failed: ${String(e)}`);
      setTimeout(() => setToast(null), 3000);
    }
  }

  function importIndicatorFromJson(parsed: any): boolean {
    if (!parsed || typeof parsed.formula !== 'string' || !parsed.formula.trim()) return false;
    const item: SavedIndicator = {
      id: `ind_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: (typeof parsed.name === 'string' && parsed.name.trim()) ? parsed.name.trim() : 'Imported indicator',
      formula: parsed.formula,
      range: parsed.range && typeof parsed.range.start === 'string' && typeof parsed.range.end === 'string'
        ? parsed.range
        : { start: daysAgoISO(365), end: todayISO() },
      savedAt: new Date().toISOString(),
    };
    const next = [...saved, item].slice(-50);
    setSaved(next);
    persistSaved(next);
    setFormula(item.formula);
    if (item.range) {
      setRange(item.range);
      setRangeDays(Math.max(1, Math.round((new Date(item.range.end).getTime() - new Date(item.range.start).getTime()) / 86400000)));
    }
    setToast(`Imported "${item.name}".`);
    setTimeout(() => setToast(null), 2500);
    return true;
  }

  function forkImportedIndicator() {
    if (!importDialog.indicator) return;
    if (importIndicatorFromJson(importDialog.indicator)) {
      setImportDialog({ open: false, indicator: null });
    }
  }

  function importFromText() {
    try {
      const parsed = JSON.parse(importText);
      if (importIndicatorFromJson(parsed)) {
        setImportText('');
        setImportDialog({ open: false, indicator: null });
      } else {
        setToast('JSON missing required "formula" field.');
        setTimeout(() => setToast(null), 3000);
      }
    } catch (e) {
      setToast('Invalid JSON. Paste the full exported payload.');
      setTimeout(() => setToast(null), 3000);
    }
  }

  const blocks = blocksQuery.data?.blocks || [];
  const templates = templatesQuery.data?.templates || [];
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
                  <Link href="/workbench/templates" className="ml-auto text-[10px] text-orange-400 hover:underline font-normal normal-case tracking-normal">
                    Browse all →
                  </Link>
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
                  <button
                    type="button"
                    onClick={() => setImportDialog({ open: true, indicator: null })}
                    className="ml-auto text-[10px] text-orange-400 hover:underline font-normal normal-case tracking-normal"
                    title="Import indicator from JSON"
                  >
                    + Import
                  </button>
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
                      <Button variant="ghost" size="sm" onClick={() => shareIndicatorUrl(ind)} className="h-6 w-6 p-0" title="Copy share URL">
                        <Share2 className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => exportIndicatorJson(ind)} className="h-6 w-6 p-0" title="Download JSON">
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteIndicator(ind.id)} className="h-6 w-6 p-0" title="Delete">
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
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Formula</CardTitle>
                  <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as 'formula' | 'visual' | 'canvas')}>
                    <TabsList className="h-7">
                      <TabsTrigger value="formula" className="text-xs h-6 px-2">Formula</TabsTrigger>
                      <TabsTrigger value="visual" className="text-xs h-6 px-2">Visual</TabsTrigger>
                      <TabsTrigger value="canvas" className="text-xs h-6 px-2">Canvas</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <CardDescription>
                  Operators: <code className="font-mono text-xs">+ - * /</code> · comparisons <code className="font-mono text-xs">{`> < >= <= == !=`}</code> · logic <code className="font-mono text-xs">AND OR NOT</code> · series <code className="font-mono text-xs">sma(X,n) ema(X,n) change(X,n) stddev(X,n)</code> · cross <code className="font-mono text-xs">crosses_above(a,b)</code> · range <code className="font-mono text-xs">between(x,lo,hi)</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {editorMode === 'formula' ? (
                  <textarea
                    value={formula}
                    onChange={e => setFormula(e.target.value)}
                    rows={3}
                    spellCheck={false}
                    className="w-full font-mono text-sm p-3 rounded bg-muted/40 border border-border/50 focus:outline-none focus:border-orange-500/50"
                    placeholder="e.g. fear_greed.value < 30 AND btc.price.change(7) < -10"
                  />
                ) : editorMode === 'visual' ? (
                  <VisualFormulaEditor formula={formula} blocks={blocks} />
                ) : (
                  <CanvasEditor
                    formula={formula}
                    blocks={blocks}
                    positions={canvasPositions}
                    onPositionsChange={onCanvasPositionsChange}
                  />
                )}

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

        {/* Import dialog — fork from shared URL or paste exported JSON */}
        {importDialog.open && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setImportDialog({ open: false, indicator: null })}>
            <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
              {importDialog.indicator ? (
                <>
                  <div className="text-lg font-bold mb-1">Fork shared indicator</div>
                  <div className="text-sm text-muted-foreground mb-3">
                    <span className="text-foreground font-semibold">"{importDialog.indicator.name}"</span> loaded from a shared URL.
                    Save it to your library?
                  </div>
                  <div className="bg-muted/30 border border-border/40 rounded p-2 font-mono text-xs mb-3 break-all">
                    {importDialog.indicator.formula}
                  </div>
                  {importDialog.indicator.range && (
                    <div className="text-[10px] text-muted-foreground font-mono mb-3">
                      Range: {importDialog.indicator.range.start} → {importDialog.indicator.range.end}
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setImportDialog({ open: false, indicator: null })}>Cancel</Button>
                    <Button onClick={forkImportedIndicator}>Fork &amp; Save</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-lg font-bold mb-1">Import indicator</div>
                  <div className="text-sm text-muted-foreground mb-3">
                    Paste exported JSON below to load an indicator into your library.
                  </div>
                  <textarea
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    className="w-full font-mono text-xs p-2 rounded bg-muted/40 border border-border/50 h-32"
                    placeholder='{"name": "BTC Fear Signal", "formula": "fear_greed.value < 30", "range": {...}}'
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <Button variant="outline" onClick={() => setImportDialog({ open: false, indicator: null })}>Cancel</Button>
                    <Button onClick={importFromText}>Import</Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Toast (workbench portability slice feedback) */}
        {toast && (
          <div className="fixed bottom-4 right-4 bg-card border border-orange-500/50 rounded-lg px-4 py-2 shadow-lg text-sm font-medium z-50 max-w-sm">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}