import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("/thesis no longer pairs sections with unrelated features (review #40)", () => {
  const src = read("pages/Thesis.tsx");
  assert.ok(!src.includes("'/risk'"), "§4 proof-of-work should not point at /risk");
  assert.ok(!src.includes("'/workbench'"), "§7 Merkle trees should not point at /workbench");
  assert.ok(!src.includes("'/cycle/compare'"), "§8 SPV should not point at /cycle/compare");
  assert.ok(!/UTXO graph|13 games|Vercel \+ our own/.test(src));
});

test("/about is one paragraph with no personal details (review #41)", () => {
  const src = read("pages/About.tsx").replace(/^\s*\/\/.*$/gm, "");
  assert.equal((src.match(/<p\b/g) || []).length, 1);
  assert.ok(/not financial advice/i.test(src));
  assert.ok(!/Telegram|Tyler|wife|kids|family|job|lives in/i.test(src));
});

test("/privacy and /terms are real copy, not placeholders (review #45)", () => {
  const privacy = read("pages/Privacy.tsx");
  const terms = read("pages/Terms.tsx");
  for (const s of [privacy, terms]) assert.ok(!/Coming Soon|being developed/i.test(s));
  assert.ok(/Substack/.test(privacy) && /local storage/i.test(privacy) && /no analytics/i.test(privacy));
  assert.ok(/not financial/i.test(terms));
});

test("no page claims Vercel analytics (none is installed)", () => {
  const pkg = readFileSync(new URL("../../../package.json", import.meta.url), "utf8");
  assert.ok(!pkg.includes("@vercel/analytics"));
  for (const p of ["pages/Sources.tsx", "pages/About.tsx", "pages/Thesis.tsx", "pages/Privacy.tsx"]) {
    assert.ok(!/Vercel analytics/i.test(read(p)), p);
  }
});

test("404 page has reader copy, not developer text", () => {
  const src = read("pages/not-found.tsx");
  assert.ok(!/forget to add the page to the router/i.test(src));
  assert.ok(src.includes('href="/"'));
});
