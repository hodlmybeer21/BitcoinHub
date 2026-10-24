import { test } from "node:test";
import assert from "node:assert/strict";
import { PRIMARY_NAV, MORE_TOOLS, LABS, RETIRED_PATHS, isNavActive } from "./siteNav";

test("primary nav matches the review's proposed nav", () => {
  assert.deepEqual(PRIMARY_NAV.map((l) => l.label), ["Cycle", "Macro", "Data stories", "Learn", "Sources"]);
});

test("no retired page is linked from nav, more-tools or labs", () => {
  for (const l of [...PRIMARY_NAV, ...MORE_TOOLS, ...LABS]) {
    const linked = l.href.split("#")[0];
    for (const r of RETIRED_PATHS) {
      assert.ok(linked !== r && !linked.startsWith(r + "/"), `${l.label} links retired ${r}`);
    }
  }
});

test("active state covers sub-pages", () => {
  const cycle = PRIMARY_NAV[0];
  assert.equal(isNavActive(cycle, "/cycle"), true);
  assert.equal(isNavActive(cycle, "/cycle/compare"), true);
  assert.equal(isNavActive(cycle, "/risk"), true);
  assert.equal(isNavActive(cycle, "/macro"), false);
  assert.equal(isNavActive(PRIMARY_NAV[1], "/analytics/cockpit"), true);
});

import { metaForPath } from "./routeMeta";
test("retired-but-reachable pages are noindexed; front-door pages are not", () => {
  assert.equal(metaForPath("/login").noindex, true);
  assert.equal(metaForPath("/portfolio/mpt").noindex, true);
  assert.equal(metaForPath("/").noindex, false);
  assert.equal(metaForPath("/cycle").noindex, false);
  assert.equal(metaForPath("/data-stories").title, "Data Stories — BitcoinHub");
});
