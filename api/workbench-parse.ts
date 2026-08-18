// BitcoinHub Workbench — /api/workbench/parse
// Self-contained Vercel serverless function.
// Parses a Workbench formula into an AST (debug view). No fetches needed.

import type { VercelRequest, VercelResponse } from '@vercel/node';

// --- AST types ---

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

// --- Tokenizer ---

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
        tokens.push({ kind: 'kw', value: word as Token extends { kind: 'kw'; value: infer V } ? V : never });
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

// --- Parser (recursive descent) ---

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

      // Function call: kw(...)
      if (this.peek()?.kind === 'op' && (this.peek() as any).value === '(') {
        // series methods vs keyword functions vs crosses/between
        if (name === 'sma' || name === 'ema' || name === 'change' || name === 'stddev') {
          this.consume(); // (
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

      // Data reference: split on last dot for `block.method` syntax
      const lastDot = name.lastIndexOf('.');
      if (lastDot > 0) {
        const blockId = name.slice(0, lastDot);
        const method = name.slice(lastDot + 1);
        // `block.method` for time-of-day style data is a single data reference
        // for the block's primary value (e.g. btc.price).
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

// --- HTTP handler ---

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

    const { formula } = req.body ?? {};
    if (typeof formula !== 'string' || formula.trim().length === 0) {
      return err(res, 400, '`formula` is required');
    }
    try {
      const ast = parse(formula);
      return ok(res, { ast });
    } catch (parseErr: any) {
      return err(res, 400, parseErr?.message ?? 'Parse error');
    }
  } catch (e: any) {
    console.error('[workbench-parse] error:', e);
    return err(res, 500, e?.message ?? 'Parse failed');
  }
}