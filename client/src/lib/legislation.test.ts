import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LEGISLATION_EDITORIAL, congressFor, deriveStageFromActions } from "./legislation-data";

test("congress number from date", () => {
  assert.equal(congressFor(new Date("2026-10-24T12:00:00Z")), 119);
  assert.equal(congressFor(new Date("2025-01-02T12:00:00Z")), 118);
  assert.equal(congressFor(new Date("2027-02-01T12:00:00Z")), 120);
});

test("stage uses the whole action history, not just the latest action", () => {
  // CLARITY: latest action is a procedural Senate motion, but it passed the House.
  const clarity = [
    "Motion by Senator Tillis to reconsider the vote by which cloture on the motion to proceed to the measure was not invoked (Record Vote No. 234) entered in Senate.",
    "Cloture on the motion to proceed to the measure not invoked in Senate by Yea-Nay Vote. 49 - 50.",
    "Passed/agreed to in House: On passage Passed by the Yeas and Nays: 294 - 134 (Roll no. 199).",
  ];
  assert.equal(deriveStageFromActions(clarity, 119, 119), "passed_chamber");
  assert.equal(deriveStageFromActions(["Became Public Law No: 119-27."], 119, 119), "signed");
  assert.equal(deriveStageFromActions(["Vetoed by President.", "Passed Senate without amendment"], 118, 119), "vetoed");
  // FIT21 passed the House in the 118th but never became law.
  assert.equal(deriveStageFromActions(["Passed/agreed to in House: On passage Passed by recorded vote: 279 - 136"], 118, 119), "dead");
  assert.equal(deriveStageFromActions(["Introduced in House"], 119, 119), "introduced");
});

test("no passage-chance numbers in the editorial overlay or the bill card", () => {
  for (const b of LEGISLATION_EDITORIAL) {
    assert.ok(!("passageChance" in b), `${b.slug} still has passageChance`);
    assert.ok(b.billType && b.billNumber && b.congress, `${b.slug} has no congress.gov ID to source its status`);
  }
  const card = readFileSync(new URL("../components/legislation/BillCard.tsx", import.meta.url), "utf8");
  assert.ok(!/passageChance|Passage estimate/.test(card));
  const api = readFileSync(new URL("../../../api/index.ts", import.meta.url), "utf8");
  assert.ok(!/passageChance/.test(api), "api/index.ts still sends passageChance");
  assert.ok(!/GENIUS Act Senate floor vote/.test(api), "stale 'next major event' still in api/index.ts");
});

test("server editorial mirrors the client overlay (same slugs, same order)", () => {
  const api = readFileSync(new URL("../../../api/index.ts", import.meta.url), "utf8");
  const block = api.slice(api.indexOf("const LEGISLATION_EDITORIAL"), api.indexOf("function stageFromActions"));
  const slugs = [...block.matchAll(/slug: '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(slugs, LEGISLATION_EDITORIAL.map((b) => b.slug));
});
