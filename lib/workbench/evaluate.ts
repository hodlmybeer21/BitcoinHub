// BitcoinHub Workbench — /api/workbench/evaluate
// Self-contained Vercel serverless function.
// Evaluates a Workbench formula over a date range, returning the resulting series.
// Inlines the parser + evaluator + block fetchers. No shared imports except axios + types.

import type { VercelRequest, VercelResponse } from '@vercel/node';
// axios is lazy-imported inside fetchJson to avoid cold-start bundle crash

// ============================================================================
// Types
// ============================================================================

interface Series { date: string; value: number; }

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

interface EvalResult {
  formula: string;
  range: { start: string; end: string };
  series: Series[];
  sources: { id: string; points: number }[];
  errors: string[];
  evalMs: number;
}

// ============================================================================
// Tokenizer + Parser (inlined; same grammar as workbench-parse.ts)
// ============================================================================

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'ident'; value: string }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' | '(' | ')' | ',' }
  | { kind: 'cmp'; value: '>' | '<' | '>=' | '<=' | '==' | '!=' }
  | { kind: 'kw'; value: 'and' | 'or' | 'not' | 'between' | 'crosses_above' | 'crosses_below' | 'sma' | 'ema' | 'change' | 'stddev' };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c >= '0' && c <= '9') {
      let j = i + 1;
      while (j < src.length && ((src[j] >= '0' && src[j] <= '9') || src[j] === '.')) j++;
      tokens.push({ kind: 'num', value: parseFloat(src.slice(i, j)) });
      i = j;
      continue;
    }
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_') {
      let j = i + 1;
      while (j < src.length && ((src[j] >= 'a' && src[j] <= 'z') || (src[j] >= 'A' && src[j] <= 'Z') || (src[j] >= '0' && src[j] <= '9') || src[j] === '_' || src[j] === '.')) j++;
      const word = src.slice(i, j);
      const kw = ['and', 'or', 'not', 'between', 'crosses_above', 'crosses_below', 'sma', 'ema', 'change', 'stddev'];
      if (kw.includes(word)) {
        tokens.push({ kind: 'kw', value: word as any });
      } else {
        tokens.push({ kind: 'ident', value: word });
      }
      i = j;
      continue;
    }
    if (c === '=' && src[i + 1] === '=') { tokens.push({ kind: 'cmp', value: '==' }); i += 2; continue; }
    if (c === '!' && src[i + 1] === '=') { tokens.push({ kind: 'cmp', value: '!=' }); i += 2; continue; }
    if (c === '>' && src[i + 1] === '=') { tokens.push({ kind: 'cmp', value: '>=' }); i += 2; continue; }
    if (c === '<' && src[i + 1] === '=') { tokens.push({ kind: 'cmp', value: '<=' }); i += 2; continue; }
    if (c === '>') { tokens.push({ kind: 'cmp', value: '>' }); i++; continue; }
    if (c === '<') { tokens.push({ kind: 'cmp', value: '<' }); i++; continue; }
    if (c === '+' || c === '-' || c === '*' || c === '/' || c === '(' || c === ')' || c === ',') {
      tokens.push({ kind: 'op', value: c }); i++; continue;
    }
    throw new Error(`Unexpected character: ${c}`);
  }
  return tokens;
}

class Parser {
  constructor(private tokens: Token[], private pos: number = 0) {}
  peek(): Token | undefined { return this.tokens[this.pos]; }
  consume(): Token { return this.tokens[this.pos++]; }
  expect(kind: string, value?: string): Token {
    const t = this.peek();
    if (!t || t.kind !== kind || (value !== undefined && (t as any).value !== value)) {
      throw new Error(`Expected ${kind}${value ? `(${value})` : ''}, got ${t ? `${t.kind}(${(t as any).value})` : 'EOF'}`);
    }
    return this.consume();
  }
  parseExpression(): ASTNode { return this.parseOr(); }
  parseOr(): ASTNode {
    let left = this.parseAnd();
    const inputs: ASTNode[] = [left];
    while (this.peek()?.kind === 'kw' && (this.peek() as any).value === 'or') {
      this.consume();
      inputs.push(this.parseAnd());
    }
    return inputs.length === 1 ? left : { type: 'or', inputs };
  }
  parseAnd(): ASTNode {
    let left = this.parseNot();
    const inputs: ASTNode[] = [left];
    while (this.peek()?.kind === 'kw' && (this.peek() as any).value === 'and') {
      this.consume();
      inputs.push(this.parseNot());
    }
    return inputs.length === 1 ? left : { type: 'and', inputs };
  }
  parseNot(): ASTNode {
    if (this.peek()?.kind === 'kw' && (this.peek() as any).value === 'not') {
      this.consume();
      return { type: 'not', input: this.parseNot() };
    }
    return this.parseCmp();
  }
  parseCmp(): ASTNode {
    const left = this.parseAdd();
    const t = this.peek();
    if (t?.kind === 'cmp') {
      this.consume();
      const right = this.parseAdd();
      return { type: 'cmp', op: (t as any).value, left, right };
    }
    return left;
  }
  parseAdd(): ASTNode {
    let left = this.parseMul();
    while (this.peek()?.kind === 'op' && ((this.peek() as any).value === '+' || (this.peek() as any).value === '-')) {
      const op = (this.consume() as any).value as '+' | '-';
      const right = this.parseMul();
      left = { type: op === '+' ? 'add' : 'sub', left, right };
    }
    return left;
  }
  parseMul(): ASTNode {
    let left = this.parseUnary();
    while (this.peek()?.kind === 'op' && ((this.peek() as any).value === '*' || (this.peek() as any).value === '/')) {
      const op = (this.consume() as any).value as '*' | '/';
      const right = this.parseUnary();
      left = { type: op === '*' ? 'mul' : 'div', left, right };
    }
    return left;
  }
  parseUnary(): ASTNode {
    if (this.peek()?.kind === 'op' && (this.peek() as any).value === '-') {
      this.consume();
      return { type: 'neg', input: this.parseUnary() };
    }
    return this.parsePrimary();
  }
  parsePrimary(): ASTNode {
    const t = this.peek();
    if (!t) throw new Error('Unexpected EOF');
    if (t.kind === 'num') {
      this.consume();
      return { type: 'const', value: (t as any).value };
    }
    if (t.kind === 'op' && (t as any).value === '(') {
      this.consume();
      const node = this.parseExpression();
      this.expect('op', ')');
      return node;
    }
    if (t.kind === 'ident' || t.kind === 'kw') {
      const name = (t as any).value as string;
      this.consume();
      if (this.peek()?.kind === 'op' && (this.peek() as any).value === '(') {
        if (name === 'sma' || name === 'ema' || name === 'change' || name === 'stddev') {
          this.consume();
          const input = this.parseExpression();
          this.expect('op', ',');
          const period = this.parseExpression();
          this.expect('op', ')');
          return { type: 'series', op: name, input, period: ((period as any).value) };
        }
        if (name === 'crosses_above' || name === 'crosses_below') {
          this.consume();
          const left = this.parseExpression();
          this.expect('op', ',');
          const right = this.parseExpression();
          this.expect('op', ')');
          return { type: 'cross', op: name, left, right };
        }
        if (name === 'between') {
          this.consume();
          const input = this.parseExpression();
          this.expect('op', ',');
          const lo = this.parseExpression();
          this.expect('op', ',');
          const hi = this.parseExpression();
          this.expect('op', ')');
          return { type: 'between', input, lo, hi };
        }
        throw new Error(`Unknown function: ${name}`);
      }
      const lastDot = name.lastIndexOf('.');
      if (lastDot > 0) {
        const blockId = name.slice(0, lastDot);
        const method = name.slice(lastDot + 1);
        return { type: 'data', id: blockId.includes('.') ? name : `${blockId}.${method}` };
      }
      return { type: 'data', id: name };
    }
    throw new Error(`Unexpected token: ${t.kind}`);
  }
}

function parse(formula: string): ASTNode {
  const tokens = tokenize(formula);
  if (tokens.length === 0) throw new Error('Empty formula');
  const parser = new Parser(tokens);
  const ast = parser.parseExpression();
  if (parser.pos < tokens.length) {
    throw new Error(`Trailing tokens: ${tokens.slice(parser.pos).map(t => (t as any).value).join(' ')}`);
  }
  return ast;
}

// ============================================================================
// Block fetchers (Yahoo Finance + alternative.me + blockchain.info + Bybit)
// ============================================================================

const fetchCache = new Map<string, Promise<Series[]>>();

async function fetchJson(url: string, params: Record<string, any> = {}, headers: Record<string, string> = {}): Promise<any> {
  // Lazy-import axios to avoid pulling it into Vercel's cold-start bundle.
  const { default: axios } = await import('axios');
  const res = await axios.get(url, { params, headers, timeout: 30000 });
  return res.data;
}

async function fetchYahooDaily(yahooSymbol: string, start: Date, end: Date): Promise<Series[]> {
  const period1 = Math.floor(start.getTime() / 1000);
  const period2 = Math.floor(end.getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${period1}&period2=${period2}&interval=1d`;
  const data = await fetchJson(url, {}, { 'User-Agent': 'Mozilla/5.0 (compatible; BitcoinHub/1.0)' });
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No Yahoo data for ${yahooSymbol}`);
  const timestamps: number[] = result.timestamp || [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];
  return timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      value: closes[i],
    }))
    .filter((s): s is Series => s.value !== null && s.value !== undefined && !Number.isNaN(s.value));
}

async function fetchAlternativeMeFng(start: Date, end: Date): Promise<Series[]> {
  const limit = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
  const data = await fetchJson<{ data: { value: string; timestamp: string }[] }>(
    'https://api.alternative.me/fng/',
    { limit, format: 'json' }
  );
  const startDay = start.toISOString().split('T')[0];
  const endDay = end.toISOString().split('T')[0];
  return (data?.data || [])
    .map(d => ({
      date: new Date(parseInt(d.timestamp) * 1000).toISOString().split('T')[0],
      value: parseFloat(d.value),
    }))
    .filter(s => s.date >= startDay && s.date <= endDay);
}

async function fetchBybitFunding(start: Date, end: Date): Promise<Series[]> {
  const limit = 200;
  const all: Series[] = [];
  let endTime = Math.floor(end.getTime() / 1000);
  const startTime = Math.floor(start.getTime() / 1000);
  let safety = 0;
  while (safety++ < 50) {
    const data = await fetchJson<{ result: { list: { fundingRate: string; fundingRateTimestamp: string }[] } }>(
      'https://api.bybit.com/v5/market/history-fund-rate',
      { category: 'linear', symbol: 'BTCUSDT', limit, endTime }
    );
    const list = data?.result?.list || [];
    for (const item of list) {
      const ts = parseInt(item.fundingRateTimestamp);
      if (ts < startTime) return all;
      all.push({ date: new Date(ts * 1000).toISOString().split('T')[0], value: parseFloat(item.fundingRate) });
    }
    if (list.length < limit) break;
    endTime = parseInt(list[list.length - 1].fundingRateTimestamp) - 1;
    if (all.length > 5000) break;
  }
  return all;
}

async function fetchBlockchainHashrate(start: Date, end: Date): Promise<Series[]> {
  const data = await fetchJson<{ values: [string, number][] }>(
    'https://api.blockchain.info/charts/hash-rate',
    { timespan: '1year', rollingAverage: '1day', format: 'json' }
  );
  const startDay = start.toISOString().split('T')[0];
  const endDay = end.toISOString().split('T')[0];
  return (data?.values || [])
    .map(([ts, v]) => ({ date: new Date(parseInt(ts) * 1000).toISOString().split('T')[0], value: v }))
    .filter(s => s.date >= startDay && s.date <= endDay);
}

// Block registry: id → fetcher
const BLOCK_FETCHERS: Record<string, (start: Date, end: Date) => Promise<Series[]>> = {
  'btc.price':         (s, e) => fetchYahooDaily('BTC-USD', s, e),
  'fear_greed.value':  (s, e) => fetchAlternativeMeFng(s, e),
  'funding.bybit':     (s, e) => fetchBybitFunding(s, e),
  'options.put_call':  async () => [], // stub for MVP
  'onchain.hashrate':  (s, e) => fetchBlockchainHashrate(s, e),
  'macro.dxy':         (s, e) => fetchYahooDaily('DX-Y.NYB', s, e),
  'macro.sp500':       (s, e) => fetchYahooDaily('^GSPC', s, e),
  'macro.ust10y':      (s, e) => fetchYahooDaily('^TNX', s, e),
  'macro.vix':         (s, e) => fetchYahooDaily('^VIX', s, e),
  'macro.gold':        (s, e) => fetchYahooDaily('GC=F', s, e),
  'time.day_of_week':  (s, e) => {
    const out: Series[] = [];
    const cur = new Date(s);
    while (cur <= e) {
      out.push({ date: cur.toISOString().split('T')[0], value: cur.getUTCDay() });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return Promise.resolve(out);
  },
};

function cachedFetch(blockId: string, start: Date, end: Date): Promise<Series[]> {
  const startDay = start.toISOString().split('T')[0];
  const endDay = end.toISOString().split('T')[0];
  const key = `${blockId}::${startDay}::${endDay}`;
  let p = fetchCache.get(key);
  if (!p) {
    const fetcher = BLOCK_FETCHERS[blockId];
    if (!fetcher) return Promise.reject(new Error(`Unknown block: ${blockId}`));
    p = fetcher(start, end).catch(e => {
      fetchCache.delete(key);
      throw e;
    });
    fetchCache.set(key, p);
  }
  return p;
}

// ============================================================================
// Series math + evaluator
// ============================================================================

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
      let s = 0;
      const start = i - period + 1;
      for (let k = start; k <= i; k++) s += values[k];
      const m = s / period;
      let v = 0;
      for (let k = start; k <= i; k++) v += (values[k] - m) ** 2;
      out[i] = Math.sqrt(v / period);
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

interface EvalContext {
  seriesCache: Map<string, number[]>;
  dates: string[];
  errors: string[];
  sources: { id: string; points: number }[];
}

async function resolveData(node: { type: 'data'; id: string }, ctx: EvalContext): Promise<number[] | null> {
  if (ctx.seriesCache.has(node.id)) return ctx.seriesCache.get(node.id)!;
  const fetcher = BLOCK_FETCHERS[node.id];
  if (!fetcher) {
    ctx.errors.push(`Unknown block: ${node.id}`);
    return null;
  }
  try {
    const start = new Date(ctx.dates[0]);
    const end = new Date(ctx.dates[ctx.dates.length - 1]);
    const series = await cachedFetch(node.id, start, end);
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
    case 'data': return resolveData(node, ctx);
    case 'const': return new Array(ctx.dates.length).fill(node.value);
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
      const x = await evalNode(node.input, ctx);
      const lo = await evalNode(node.lo, ctx);
      const hi = await evalNode(node.hi, ctx);
      if (!x || !lo || !hi) return null;
      return x.map((v, i) => (v >= (lo[i] ?? 0) && v <= (hi[i] ?? 0)) ? 1 : 0);
    }
  }
}

// ============================================================================
// HTTP handler
// ============================================================================

function ok(res: VercelResponse, data: unknown) {
  res.setHeader('Cache-Control', 'no-store');
  res.json(data);
}

function err(res: VercelResponse, status: number, message: string) {
  res.status(status).json({ error: message });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return err(res, 405, 'POST required');

    const { formula, range } = req.body ?? {};
    if (typeof formula !== 'string' || formula.trim().length === 0) {
      return err(res, 400, '`formula` is required');
    }
    if (!range || typeof range.start !== 'string' || typeof range.end !== 'string') {
      return err(res, 400, '`range` with start/end is required');
    }

    const t0 = Date.now();
    const ast = parse(formula);
    const startDay = range.start;
    const endDay = range.end;

    // For the date axis we collect the union of all block sources' dates.
    // Eagerly discover all data references in the AST.
    const dataIds = new Set<string>();
    (function walk(n: ASTNode) {
      if (n.type === 'data') dataIds.add(n.id);
      else if (n.type === 'series') walk(n.input);
      else if (n.type === 'cross' || n.type === 'cmp') { walk(n.left); walk(n.right); }
      else if (n.type === 'add' || n.type === 'sub' || n.type === 'mul' || n.type === 'div') { walk(n.left); walk(n.right); }
      else if (n.type === 'and' || n.type === 'or') n.inputs.forEach(walk);
      else if (n.type === 'not') walk(n.input);
      else if (n.type === 'neg') walk(n.input);
      else if (n.type === 'between') { walk(n.input); walk(n.lo); walk(n.hi); }
    })(ast);

    // Fetch all referenced blocks in parallel.
    const start = new Date(startDay);
    const end = new Date(endDay);
    const fetched = await Promise.all(
      Array.from(dataIds).map(async id => {
        if (!BLOCK_FETCHERS[id]) return { id, series: [] };
        try {
          const series = await cachedFetch(id, start, end);
          return { id, series };
        } catch {
          return { id, series: [] };
        }
      })
    );
    const presentSeries = fetched.filter(f => f.series.length > 0).map(f => f.series);
    let dates = presentSeries.length > 0
      ? datesUnion(presentSeries).filter(d => d >= startDay && d <= endDay)
      : [];

    // If no external data sources were used (all const/ident-only ASTs),
    // synthesize a daily date axis over the range.
    if (dates.length === 0) {
      const cur = new Date(startDay);
      const endD = new Date(endDay);
      while (cur <= endD) {
        dates.push(cur.toISOString().split('T')[0]);
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }

    const ctx: EvalContext = {
      seriesCache: new Map(),
      dates,
      errors: [],
      sources: [],
    };

    const values = await evalNode(ast, ctx);

    const series: Series[] = values
      ? dates.map((d, i) => ({ date: d, value: values[i] ?? 0 }))
      : [];

    const result: EvalResult = {
      formula,
      range: { start: startDay, end: endDay },
      series,
      sources: ctx.sources,
      errors: ctx.errors,
      evalMs: Date.now() - t0,
    };

    return ok(res, result);
  } catch (e: any) {
    console.error('[workbench-evaluate] error:', e);
    return err(res, 500, e?.message ?? 'Evaluation failed');
  }
}