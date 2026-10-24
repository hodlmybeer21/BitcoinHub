import { test } from "node:test";
import assert from "node:assert/strict";
import { buildValueStats, formatPct } from "./valueTrackerStats";

const rows = Object.fromEntries(buildValueStats().map((r) => [r.key, r]));

test("H9 median home 1995→2025 (MSPUS annual avg, World Bank gold)", () => {
  assert.equal(rows.home.usd, "+211%");
  assert.equal(rows.home.gold, "−65% in gold");
});
test("H8 bread uses BLS-series years only (1980→2025)", () => {
  assert.equal(rows.bread.usd, "+267%");
  assert.equal(rows.bread.gold, "−35% in gold");
});
test("H7 gold 1970→2025 annual average", () => {
  assert.equal(rows.gold.usd, "+9,486%");
});
test("H6 bitcoin is a finite, sourced figure", () => {
  assert.equal(rows.bitcoin.usd, "+29.2M%");
  assert.ok(!JSON.stringify(rows).includes("∞"));
  assert.ok(!JSON.stringify(rows).includes("0.0008"));
});
test("formatPct", () => {
  assert.equal(formatPct(-65.26), "−65%");
});
