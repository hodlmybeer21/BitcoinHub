// BitcoinHub Workbench — No-Code Indicator Builder
// Self-contained module: blocks registry + parser + evaluator + templates.

import axios from 'axios';

// --- Types ---

export interface Series {
  date: string;   // YYYY-MM-DD
  value: number;
}

export interface BlockDef {
  id: string;                         // canonical id used in formulas (e.g. "btc.price")
  label: string;                      // UI label
  category: 'price' | 'sentiment' | 'whales' | 'funding' | 'options'
                | 'onchain' | 'macro' | 'liquidity' | 'time';
  description: string;
  unit?: string;                      // %, USD, BTC, etc.
  fetch: (start: Date, end: Date) => Promise<Series[]>;
}

export type ASTNode =
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

export interface EvalResult {
  formula: string;
  range: { start: string; end: string };
  series: Series[];
  sources: { id: string; points: number }[];
  errors: string[];
  evalMs: number;
}

// --- Block registry ---
// All blocks fetch daily time-series. Sourcing follows BitcoinHub conventions:
// BTC from CoinGecko/CryptoCompare, F&G from alternative.me, whales from
// blockchain.com, etc. For MVP we keep it to 8 most-useful blocks.

const fetchJson = async <T,>(url: string, params: Record<string, any> = {}, headers: Record<string, string> = {}): Promise<T> => {
  const res = await axios.get(url, { params, headers, timeout: 30000 });
  return res.data;
};

async function fetchCoinGeckoPrice(coinId: string, start: Date, end: Date): Promise<Series[]> {
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  // Cap at 365 days for free tier
  const cappedDays = Math.min(days, 365);
  const data = await fetchJson<{ prices: [number, number][] }>(
    `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`,
    { vs_currency: 'usd', days: cappedDays, interval: 'daily' }
  );
  return data.prices.map(([ts, price]) => ({
    date: new Date(ts).toISOString().split('T')[0],
    value: price,
  }));
}

async function fetchAlternativeMeFng(start: Date, end: Date): Promise<Series[]> {
  const limit = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
  const data = await fetchJson<{ data: { value: string; timestamp: string }[] }>(
    'https://api.alternative.me/fng/',
    { limit, format: 'json' }
  );
  return data.data
    .map(d => ({
      date: new Date(parseInt(d.timestamp) * 1000).toISOString().split('T')[0],
      value: parseFloat(d.value),
    }))
    .filter(s => s.date >= start.toISOString().split('T')[0] && s.date <= end.toISOString().split('T')[0]);
}

async function fetchYahooDaily(symbol: string, start: Date, end: Date): Promise<Series[]> {
  const period1 = Math.floor(start.getTime() / 1000);
  const period2 = Math.floor(end.getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`;
  const data = await fetchJson<{ chart: { result: [{ timestamp: number[]; indicators: { quote: [{ close: (number | null)[] }] } }] } }>(
    url, {}, { 'User-Agent': 'Mozilla/5.0 (compatible; BitcoinHub/1.0)' }
  );
  const result = data.chart.result[0];
  if (!result) throw new Error(`No data for ${symbol}`);
  return result.timestamp
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      value: result.indicators.quote[0].close[i],
    }))
    .filter((s): s is Series => s.value !== null && s.value !== undefined && !Number.isNaN(s.value));
}

async function fetchBybitFunding(start: Date, end: Date): Promise<Series[]> {
  // Bybit historical funding: paginate backwards from now
  const limit = 200;
  const all: { date: string; value: number }[] = [];
  let endTime = Math.floor(end.getTime() / 1000);
  const startTime = Math.floor(start.getTime() / 1000);
  while (true) {
    const data = await fetchJson<{ result: { list: { fundingRate: string; fundingRateTimestamp: string }[] } }>(
      'https://api.bybit.com/v5/market/history-fund-rate',
      { category: 'linear', symbol: 'BTCUSDT', limit, endTime }
    );
    const list = data.result.list || [];
    for (const item of list) {
      const ts = parseInt(item.fundingRateTimestamp);
      if (ts < startTime) return all;
      all.push({ date: new Date(ts).toISOString().split('T')[0], value: parseFloat(item.fundingRate) });
    }
    if (list.length < limit) break;
    endTime = parseInt(list[list.length - 1].fundingRateTimestamp) - 1;
    if (all.length > 5000) break; // safety
  }
  return all;
}

async function fetchBlockchainHashrate(start: Date, end: Date): Promise<Series[]> {
  // blockchain.com charts API returns daily hashrate in H/s
  const data = await fetchJson<{ values: [string, number][] }>(
    'https://api.blockchain.info/charts/hash-rate',
    { timespan: '1year', rollingAverage: '1day', format: 'json' }
  );
  return data.values
    .map(([ts, v]) => ({ date: new Date(parseInt(ts) * 1000).toISOString().split('T')[0], value: v }))
    .filter(s => s.date >= start.toISOString().split('T')[0] && s.date <= end.toISOString().split('T')[0]);
}

export const BLOCKS: BlockDef[] = [
  {
    id: 'btc.price',
    label: 'BTC Price',
    category: 'price',
    description: 'BTC close price in USD',
    unit: 'USD',
    fetch: (start, end) => fetchYahooDaily('BTC-USD', start, end),
  },
  {
    id: 'fear_greed.value',
    label: 'Fear & Greed Index',
    category: 'sentiment',
    description: 'Daily Fear & Greed Index (0-100)',
    unit: '0-100',
    fetch: (start, end) => fetchAlternativeMeFng(start, end),
  },
  {
    id: 'funding.bybit',
    label: 'Bybit Funding Rate',
    category: 'funding',
    description: 'BTCUSDT perp funding rate (per 8h)',
    unit: 'rate',
    fetch: (start, end) => fetchBybitFunding(start, end),
  },
  {
    id: 'options.put_call',
    label: 'Options Put/Call Ratio',
    category: 'options',
    description: 'BTC options put/call ratio (Deribit)',
    unit: 'ratio',
    // For MVP: stub with empty series — wire to /api/options-flow in Phase 2
    fetch: async () => [],
  },
  {
    id: 'onchain.hashrate',
    label: 'On-Chain Hashrate',
    category: 'onchain',
    description: 'Network hashrate (H/s)',
    unit: 'H/s',
    fetch: (start, end) => fetchBlockchainHashrate(start, end),
  },
  {
    id: 'macro.dxy',
    label: 'Dollar Index (DXY)',
    category: 'macro',
    description: 'US Dollar Index',
    unit: 'index',
    fetch: (start, end) => fetchYahooDaily('DX-Y.NYB', start, end),
  },
  {
    id: 'macro.sp500',
    label: 'S&P 500',
    category: 'macro',
    description: 'S&P 500 Index',
    unit: 'index',
    fetch: (start, end) => fetchYahooDaily('^GSPC', start, end),
  },
  {
    id: 'macro.ust10y',
    label: '10Y Treasury Yield',
    category: 'macro',
    description: 'US 10-Year Treasury yield (%)',
    unit: '%',
    fetch: (start, end) => fetchYahooDaily('^TNX', start, end),
  },
  {
    id: 'macro.vix',
    label: 'VIX',
    category: 'macro',
    description: 'CBOE Volatility Index',
    unit: 'index',
    fetch: (start, end) => fetchYahooDaily('^VIX', start, end),
  },
  {
    id: 'macro.gold',
    label: 'Gold',
    category: 'macro',
    description: 'Gold spot price (USD/oz)',
    unit: 'USD',
    fetch: (start, end) => fetchYahooDaily('GC=F', start, end),
  },
  {
    id: 'time.day_of_week',
    label: 'Day of Week',
    category: 'time',
    description: '0=Sunday, 6=Saturday',
    unit: '0-6',
    fetch: (start, end) => {
      const out: Series[] = [];
      const cur = new Date(start);
      while (cur <= end) {
        out.push({ date: cur.toISOString().split('T')[0], value: cur.getUTCDay() });
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      return Promise.resolve(out);
    },
  },
];

export const BLOCKS_BY_ID: Map<string, BlockDef> = new Map(BLOCKS.map(b => [b.id, b]));

// --- Series math helpers ---

function alignOnDates(series: Series[], allDates: string[]): (number | null)[] {
  const map = new Map(series.map(s => [s.date, s.value]));
  return allDates.map(d => map.has(d) ? (map.get(d) as number) : null);
}

function datesUnion(seriesList: Series[][]): string[] {
  const set = new Set<string>();
  for (const s of seriesList) for (const p of s) set.add(p.date);
  return Array.from(set).sort();
}

function forwardFill(arr: (number | null)[]): number[] {
  const out: number[] = [];
  let last: number | null = null;
  for (const v of arr) {
    if (v !== null) { last = v; out.push(v); }
    else if (last !== null) { out.push(last); }
    else { out.push(0); }
  }
  return out;
}

function seriesFromAligned(aligned: number[], dates: string[]): Series[] {
  return dates.map((d, i) => ({ date: d, value: aligned[i] }));
}

function sma(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(0);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out[i] = i >= period - 1 ? sum / period : values[i];
  }
  return out;
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = new Array(values.length).fill(0);
  out[0] = values[0];
  for (let i = 1; i < values.length; i++) out[i] = values[i] * k + out[i - 1] * (1 - k);
  return out;
}

function changePct(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(0);
  for (let i = 0; i < values.length; i++) {
    if (i >= period && values[i - period] !== 0) {
      out[i] = (values[i] - values[i - period]) / values[i - period];
    }
  }
  return out;
}

function stddev(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(0);
  for (let i = 0; i < values.length; i++) {
    if (i >= period - 1) {
      const slice = values.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const v = slice.reduce((sum, x) => sum + (x - mean) ** 2, 0) / period;
      out[i] = Math.sqrt(v);
    }
  }
  return out;
}

function applyCmp(a: number[], op: '>' | '<' | '>=' | '<=' | '==' | '!=', b: number[]): number[] {
  const out: number[] = new Array(a.length).fill(0);
  for (let i = 0; i < a.length; i++) {
    switch (op) {
      case '>':  out[i] = a[i] >  b[i] ? 1 : 0; break;
      case '<':  out[i] = a[i] <  b[i] ? 1 : 0; break;
      case '>=': out[i] = a[i] >= b[i] ? 1 : 0; break;
      case '<=': out[i] = a[i] <= b[i] ? 1 : 0; break;
      case '==': out[i] = Math.abs(a[i] - b[i]) < 1e-9 ? 1 : 0; break;
      case '!=': out[i] = Math.abs(a[i] - b[i]) >= 1e-9 ? 1 : 0; break;
    }
  }
  return out;
}

function crosses(a: number[], b: number[], direction: 'above' | 'below'): number[] {
  const out: number[] = new Array(a.length).fill(0);
  for (let i = 1; i < a.length; i++) {
    if (direction === 'above') {
      if (a[i - 1] <= b[i - 1] && a[i] > b[i]) out[i] = 1;
    } else {
      if (a[i - 1] >= b[i - 1] && a[i] < b[i]) out[i] = 1;
    }
  }
  return out;
}

// --- Cache for fetched data (per (blockId, startDay, endDay)) ---

const fetchCache = new Map<string, Promise<Series[]>>();
function cachedFetch(block: BlockDef, start: Date, end: Date): Promise<Series[]> {
  const startDay = start.toISOString().split('T')[0];
  const endDay = end.toISOString().split('T')[0];
  const key = `${block.id}::${startDay}::${endDay}`;
  let p = fetchCache.get(key);
  if (!p) {
    p = block.fetch(start, end).catch(e => {
      fetchCache.delete(key);
      throw e;
    });
    fetchCache.set(key, p);
  }
  return p;
}

// --- Evaluator ---

interface EvalContext {
  seriesCache: Map<string, number[]>;
  dates: string[];
  errors: string[];
  sources: { id: string; points: number }[];
}

async function resolveData(node: { type: 'data'; id: string }, ctx: EvalContext): Promise<number[] | null> {
  if (ctx.seriesCache.has(node.id)) return ctx.seriesCache.get(node.id)!;
  const block = BLOCKS_BY_ID.get(node.id);
  if (!block) {
    ctx.errors.push(`Unknown block: ${node.id}`);
    return null;
  }
  try {
    const start = new Date(ctx.dates[0]);
    const end = new Date(ctx.dates[ctx.dates.length - 1]);
    const series = await cachedFetch(block, start, end);
    if (series.length === 0) {
      ctx.errors.push(`Block ${node.id} returned no data`);
      ctx.seriesCache.set(node.id, new Array(ctx.dates.length).fill(0));
      return new Array(ctx.dates.length).fill(0);
    }
    const aligned = forwardFill(alignOnDates(series, ctx.dates));
    ctx.seriesCache.set(node.id, aligned);
    ctx.sources.push({ id: node.id, points: series.length });
    return aligned;
  } catch (e: any) {
    ctx.errors.push(`Fetch failed for ${node.id}: ${e.message}`);
    ctx.seriesCache.set(node.id, new Array(ctx.dates.length).fill(0));
    return new Array(ctx.dates.length).fill(0);
  }
}

function elementWiseBinOp(a: number[], b: number[], op: (x: number, y: number) => number): number[] {
  return a.map((v, i) => op(v, b[i] ?? 0));
}

async function evalNode(node: ASTNode, ctx: EvalContext): Promise<number[] | null> {
  switch (node.type) {
    case 'data':    return resolveData(node, ctx);
    case 'const':   return new Array(ctx.dates.length).fill(node.value);
    case 'neg': {
      const a = await evalNode(node.input, ctx);
      return a ? a.map(v => -v) : null;
    }
    case 'add': case 'sub': case 'mul': case 'div': {
      const a = await evalNode(node.left, ctx);
      const b = await evalNode(node.right, ctx);
      if (!a || !b) return null;
      switch (node.type) {
        case 'add': return elementWiseBinOp(a, b, (x, y) => x + y);
        case 'sub': return elementWiseBinOp(a, b, (x, y) => x - y);
        case 'mul': return elementWiseBinOp(a, b, (x, y) => x * y);
        case 'div': return elementWiseBinOp(a, b, (x, y) => y !== 0 ? x / y : 0);
      }
      return null;
    }
    case 'cmp': {
      const a = await evalNode(node.left, ctx);
      const b = await evalNode(node.right, ctx);
      if (!a || !b) return null;
      return applyCmp(a, node.op, b);
    }
    case 'and': {
      const vals = await Promise.all(node.inputs.map(n => evalNode(n, ctx)));
      if (vals.some(v => !v)) return null;
      return vals[0]!.map((_, i) => vals.every(v => v![i] > 0.5) ? 1 : 0);
    }
    case 'or': {
      const vals = await Promise.all(node.inputs.map(n => evalNode(n, ctx)));
      if (vals.some(v => !v)) return null;
      return vals[0]!.map((_, i) => vals.some(v => v![i] > 0.5) ? 1 : 0);
    }
    case 'not': {
      const a = await evalNode(node.input, ctx);
      return a ? a.map(v => v > 0.5 ? 0 : 1) : null;
    }
    case 'series': {
      const a = await evalNode(node.input, ctx);
      if (!a) return null;
      switch (node.op) {
        case 'sma':    return sma(a, node.period);
        case 'ema':    return ema(a, node.period);
        case 'change': return changePct(a, node.period);
        case 'stddev': return stddev(a, node.period);
      }
      return null;
    }
    case 'cross': {
      const a = await evalNode(node.left, ctx);
      const b = await evalNode(node.right, ctx);
      if (!a || !b) return null;
      return crosses(a, b, node.op === 'crosses_above' ? 'above' : 'below');
    }
    case 'between': {
      const v = await evalNode(node.input, ctx);
      const lo = await evalNode(node.lo, ctx);
      const hi = await evalNode(node.hi, ctx);
      if (!v || !lo || !hi) return null;
      return v.map((x, i) => (x >= lo[i] && x <= hi[i]) ? 1 : 0);
    }
  }
}

export async function evaluate(formula: string, range: { start: string; end: string }): Promise<EvalResult> {
  const t0 = Date.now();
  const ast = parse(formula);
  const errors: string[] = [];
  const sources: { id: string; points: number }[] = [];

  // Compute the union of dates we'd need. For MVP, use daily dates in range.
  const dates: string[] = [];
  const start = new Date(range.start);
  const end = new Date(range.end);
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  const ctx: EvalContext = { seriesCache: new Map(), dates, errors, sources };
  const result = await evalNode(ast, ctx);

  const series: Series[] = result
    ? dates.map((d, i) => ({ date: d, value: result[i] }))
    : [];

  return {
    formula,
    range: { start: range.start, end: range.end },
    series,
    sources,
    errors,
    evalMs: Date.now() - t0,
  };
}

// --- Tokenizer + Recursive-descent parser ---

type Token = { kind: string; value: string };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '(' || c === ')' || c === ',' || c === '+' || c === '-' || c === '*' || c === '/') {
      tokens.push({ kind: c, value: c });
      i++;
      continue;
    }
    if (c === '>' || c === '<') {
      if (input[i + 1] === '=') { tokens.push({ kind: c + '=', value: c + '=' }); i += 2; continue; }
      tokens.push({ kind: c, value: c });
      i++;
      continue;
    }
    if (c === '=' && input[i + 1] === '=') { tokens.push({ kind: '==', value: '==' }); i += 2; continue; }
    if (c === '!' && input[i + 1] === '=') { tokens.push({ kind: '!=', value: '!=' }); i += 2; continue; }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(input[i + 1] ?? ''))) {
      let j = i;
      while (j < input.length && /[0-9.]/.test(input[j])) j++;
      tokens.push({ kind: 'NUMBER', value: input.slice(i, j) });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < input.length && /[a-zA-Z0-9_.]/.test(input[j])) j++;
      const word = input.slice(i, j);
      const up = word.toUpperCase();
      if (up === 'AND' || up === 'OR' || up === 'NOT') {
        tokens.push({ kind: up, value: up });
      } else {
        tokens.push({ kind: 'IDENT', value: word });
      }
      i = j;
      continue;
    }
    throw new Error(`Unexpected character at ${i}: '${c}'`);
  }
  return tokens;
}

class Parser {
  constructor(private tokens: Token[], private pos: number = 0) {}
  peek(): Token | undefined { return this.tokens[this.pos]; }
  consume(kind?: string): Token {
    const t = this.tokens[this.pos++];
    if (kind && t.kind !== kind) throw new Error(`Expected ${kind} at token ${this.pos - 1}, got ${t.kind}`);
    return t;
  }
  parse(): ASTNode { return this.parseOr(); }
  parseOr(): ASTNode {
    let left = this.parseAnd();
    while (this.peek()?.kind === 'OR') {
      this.consume('OR');
      const right = this.parseAnd();
      left = { type: 'or', inputs: this.collectAnds(left, right) };
    }
    return left;
  }
  collectAnds(left: ASTNode, right: ASTNode): ASTNode[] {
    if (left.type === 'or') return [...left.inputs, right];
    return [left, right];
  }
  parseAnd(): ASTNode {
    let left = this.parseNot();
    const inputs: ASTNode[] = [left];
    while (this.peek()?.kind === 'AND') {
      this.consume('AND');
      inputs.push(this.parseNot());
    }
    if (inputs.length === 1) return inputs[0];
    return { type: 'and', inputs };
  }
  parseNot(): ASTNode {
    if (this.peek()?.kind === 'NOT') { this.consume('NOT'); return { type: 'not', input: this.parseNot() }; }
    return this.parseCmp();
  }
  parseCmp(): ASTNode {
    const left = this.parseAdd();
    const t = this.peek();
    if (t && ['>', '<', '>=', '<=', '==', '!='].includes(t.kind)) {
      this.consume();
      const right = this.parseAdd();
      return { type: 'cmp', op: t.kind as any, left, right };
    }
    return left;
  }
  parseAdd(): ASTNode {
    let left = this.parseMul();
    while (this.peek() && (this.peek()!.kind === '+' || this.peek()!.kind === '-')) {
      const op = this.consume().kind;
      const right = this.parseMul();
      left = { type: op === '+' ? 'add' : 'sub', left, right };
    }
    return left;
  }
  parseMul(): ASTNode {
    let left = this.parseUnary();
    while (this.peek() && (this.peek()!.kind === '*' || this.peek()!.kind === '/')) {
      const op = this.consume().kind;
      const right = this.parseUnary();
      left = { type: op === '*' ? 'mul' : 'div', left, right };
    }
    return left;
  }
  parseUnary(): ASTNode {
    if (this.peek()?.kind === '-') { this.consume('-'); return { type: 'neg', input: this.parseUnary() }; }
    return this.parsePrimary();
  }
  parsePrimary(): ASTNode {
    const t = this.peek();
    if (!t) throw new Error('Unexpected end of formula');
    if (t.kind === '(') {
      this.consume('(');
      const e = this.parseOr();
      this.consume(')');
      return e;
    }
    if (t.kind === 'NUMBER') {
      this.consume();
      return { type: 'const', value: parseFloat(t.value) };
    }
    if (t.kind === 'IDENT') {
      this.consume();
      // Method-call syntax: block.method(args) — split on last dot.
      // Example: btc.price.change(7) -> change(btc.price, 7)
      if (t.value.includes('.')) {
        const parts = t.value.split('.');
        const methodName = parts[parts.length - 1];
        const dataId = parts.slice(0, -1).join('.');
        if (this.peek()?.kind === '(') {
          this.consume('(');
          const args = this.parseArgs();
          this.consume(')');
          return this.constructCall(methodName, [{ type: 'data', id: dataId }, ...args]);
        }
        return { type: 'data', id: t.value };
      }
      if (this.peek()?.kind === '(') {
        this.consume('(');
        const args = this.parseArgs();
        this.consume(')');
        return this.constructCall(t.value, args);
      }
      return { type: 'data', id: t.value };
    }
    throw new Error(`Unexpected token ${t.kind}`);
  }
  parseArgs(): ASTNode[] {
    const args: ASTNode[] = [];
    if (this.peek()?.kind === ')') return args;
    args.push(this.parseOr());
    while (this.peek()?.kind === ',') { this.consume(','); args.push(this.parseOr()); }
    return args;
  }
  constructCall(name: string, args: ASTNode[]): ASTNode {
    const seriesOps = ['sma', 'ema', 'change', 'stddev'];
    if (seriesOps.includes(name)) {
      if (args.length !== 2) throw new Error(`${name} expects 2 args`);
      const period = args[1];
      if (period.type !== 'const') throw new Error(`${name} period must be a constant`);
      return { type: 'series', op: name as any, input: args[0], period: period.value };
    }
    if (name === 'crosses_above' || name === 'crosses_below') {
      if (args.length !== 2) throw new Error(`${name} expects 2 args`);
      return { type: 'cross', op: name as any, left: args[0], right: args[1] };
    }
    if (name === 'between') {
      if (args.length !== 3) throw new Error('between expects 3 args');
      return { type: 'between', input: args[0], lo: args[1], hi: args[2] };
    }
    throw new Error(`Unknown function: ${name}`);
  }
}

export function parse(formula: string): ASTNode {
  const tokens = tokenize(formula.trim());
  if (tokens.length === 0) throw new Error('Empty formula');
  const parser = new Parser(tokens);
  return parser.parse();
}

// --- Built-in templates ---

export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'sentiment' | 'funding' | 'macro' | 'cycle';
  formula: string;
}

export const TEMPLATES: Template[] = [
  {
    id: 'fear_greed_extreme',
    name: 'Fear & Greed Extreme Greed',
    description: 'Returns 1 when F&G is above 80 (extreme greed = caution signal).',
    category: 'sentiment',
    formula: 'fear_greed.value > 80',
  },
  {
    id: 'fear_greed_extreme_fear',
    name: 'Fear & Greed Extreme Fear',
    description: 'Returns 1 when F&G is below 20 (extreme fear = buy opportunity).',
    category: 'sentiment',
    formula: 'fear_greed.value < 20',
  },
  {
    id: 'btc_30d_drawdown',
    name: 'BTC 30-Day Drawdown',
    description: 'Returns % change of BTC over the last 30 days (negative = drawdown).',
    category: 'cycle',
    formula: 'change(btc.price, 30)',
  },
  {
    id: 'btc_above_sma',
    name: 'BTC Above 90-Day SMA',
    description: 'Returns 1 when BTC price is above its 90-day SMA.',
    category: 'cycle',
    formula: 'btc.price > sma(btc.price, 90)',
  },
  {
    id: 'btc_sma_cross',
    name: 'BTC 50/200 SMA Golden Cross',
    description: 'Returns 1 on the day BTC 50-day SMA crosses above 200-day SMA.',
    category: 'cycle',
    formula: 'crosses_above(sma(btc.price, 50), sma(btc.price, 200))',
  },
  {
    id: 'funding_positive',
    name: 'Funding Positive (Longs Pay)',
    description: 'Returns 1 when Bybit funding is positive — longs pay shorts (often a top signal).',
    category: 'funding',
    formula: 'funding.bybit > 0.0001',
  },
  {
    id: 'risk_off_dxy',
    name: 'Risk-Off: DXY Strong',
    description: 'Returns 1 when DXY is above 105 (historically bearish for BTC/risk-on).',
    category: 'macro',
    formula: 'macro.dxy > 105',
  },
  {
    id: 'vix_spike',
    name: 'VIX Spike (>25)',
    description: 'Returns 1 when VIX is above 25 — market is in fear mode.',
    category: 'macro',
    formula: 'macro.vix > 25',
  },
];

// --- Exportable group ---

export { TEMPLATES as TEMPLATES_LIST };