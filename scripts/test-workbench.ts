// Smoke test for Workbench parser + evaluator.
// Verifies formulas parse correctly and evaluate to sensible series.

import { parse, evaluate, TEMPLATES_LIST, BLOCKS } from '../server/workbench';

function approxEq(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) < tol;
}

async function test(name: string, formula: string, expected: {
  min?: number; max?: number; isBoolean?: boolean; points?: number;
}) {
  process.stdout.write(`  ${name.padEnd(50)}  `);
  try {
    const range = { start: '2025-05-01', end: '2025-08-01' }; // 90 days
    const result = await evaluate(formula, range);
    const series = result.series;
    const values = series.map(s => s.value);

    if (series.length === 0) {
      console.log('FAIL (empty series)');
      if (result.errors.length) console.log('    errors:', result.errors.join('; '));
      return false;
    }

    let pass = true;
    const checks: string[] = [];
    if (expected.points !== undefined) {
      if (series.length !== expected.points) { pass = false; checks.push(`points=${series.length}`); }
    }
    if (expected.min !== undefined) {
      const mn = Math.min(...values);
      if (mn < expected.min - 0.01) { pass = false; checks.push(`min=${mn.toFixed(3)}`); }
    }
    if (expected.max !== undefined) {
      const mx = Math.max(...values);
      if (mx > expected.max + 0.01) { pass = false; checks.push(`max=${mx.toFixed(3)}`); }
    }
    if (expected.isBoolean !== undefined) {
      const bool = values.every(v => v === 0 || v === 1);
      if (bool !== expected.isBoolean) { pass = false; checks.push(`bool=${bool}`); }
    }

    if (pass) {
      console.log(`PASS  (${series.length} pts, [${Math.min(...values).toFixed(2)}, ${Math.max(...values).toFixed(2)}], ${result.evalMs}ms)`);
      return true;
    } else {
      console.log('FAIL');
      checks.forEach(c => console.log('    ' + c));
      return false;
    }
  } catch (e: any) {
    console.log('THROW: ' + e.message);
    return false;
  }
}

async function testParser(name: string, formula: string, shouldThrow: boolean = false) {
  process.stdout.write(`  parser: ${name.padEnd(45)}  `);
  try {
    const ast = parse(formula);
    if (shouldThrow) {
      console.log('FAIL (expected throw)');
      return false;
    }
    console.log('PASS');
    return true;
  } catch (e: any) {
    if (shouldThrow) {
      console.log('PASS (threw as expected)');
      return true;
    }
    console.log('FAIL: ' + e.message);
    return false;
  }
}

async function main() {
  console.log('=== WORKBENCH SMOKE TEST ===');
  console.log('');

  console.log('--- Parser unit tests ---');
  let pass = 0, fail = 0;
  const inc = (b: boolean) => { if (b) pass++; else fail++; };

  inc(await testParser('simple comparison', 'fear_greed.value > 80'));
  inc(await testParser('and', 'fear_greed.value > 70 AND btc.price > 60000'));
  inc(await testParser('or', 'fear_greed.value > 90 OR fear_greed.value < 10'));
  inc(await testParser('not', 'NOT (fear_greed.value > 50)'));
  inc(await testParser('arithmetic', '(btc.price + 1000) / 2'));
  inc(await testParser('series op', 'sma(btc.price, 30)'));
  inc(await testParser('nested series', 'sma(change(btc.price, 7), 14)'));
  inc(await testParser('crosses', 'crosses_above(sma(btc.price, 50), sma(btc.price, 200))'));
  inc(await testParser('between', 'between(macro.dxy, 100, 110)'));
  inc(await testParser('multi-block AND', 'fear_greed.value < 30 AND btc.price.change(7) < -10 AND macro.vix > 20'));
  inc(await testParser('parens with not', 'NOT (fear_greed.value > 80 OR btc.price.change(7) > 10)'));
  inc(await testParser('unknown function throws', 'unknown_fn(btc.price)', true));
  inc(await testParser('mismatched paren throws', 'fear_greed.value > (80', true));

  console.log('');
  console.log('--- Templates list ---');
  console.log(`  ${TEMPLATES_LIST.length} templates registered:`);
  for (const t of TEMPLATES_LIST) {
    console.log(`    ${t.id.padEnd(30)}  ${t.formula}`);
  }

  console.log('');
  console.log('--- Blocks registry ---');
  console.log(`  ${BLOCKS.length} blocks registered:`);
  for (const b of BLOCKS) {
    console.log(`    ${b.id.padEnd(20)}  ${b.category.padEnd(10)}  ${b.unit || ''}`);
  }

  console.log('');
  console.log('--- Live evaluations (90 days, 2025-05-01 → 2025-08-01) ---');
  console.log('  Note: requires internet access; some APIs may rate-limit.');
  console.log('');

  inc(await test('fear_greed.value > 80', 'fear_greed.value > 80', { isBoolean: true, points: 93 }));
  inc(await test('btc.price > sma(btc.price, 30)', 'btc.price > sma(btc.price, 30)', { isBoolean: true, points: 93 }));
  inc(await test('change(btc.price, 7)', 'change(btc.price, 7)', { isBoolean: false, points: 93 }));
  inc(await test('macro.dxy > 105', 'macro.dxy > 105', { isBoolean: true, points: 93 }));
  inc(await test('macro.vix > 25', 'macro.vix > 25', { isBoolean: true, points: 93 }));
  inc(await test('between(macro.vix, 15, 25)', 'between(macro.vix, 15, 25)', { isBoolean: true, points: 93 }));
  inc(await test('btc.price', 'btc.price', { min: 1000, points: 93 }));
  inc(await test('stddev(btc.price, 30)', 'stddev(btc.price, 30)', { min: 0, points: 93 }));

  console.log('');
  console.log(`${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });