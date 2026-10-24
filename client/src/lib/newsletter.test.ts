import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { SUBSTACK_EMBED_URL, SUBSTACK_SUBSCRIBE_URL } from "./newsletter";

const src = (p: string) => readFileSync(new URL(`../../../${p}`, import.meta.url), "utf8");

test("uses Substack's official embed + subscribe URLs", () => {
  assert.equal(SUBSTACK_EMBED_URL, "https://hodlmybeermacro.substack.com/embed");
  assert.equal(SUBSTACK_SUBSCRIBE_URL, "https://hodlmybeermacro.substack.com/subscribe");
});

test("all three signup spots use the shared component", () => {
  for (const p of ["client/src/pages/Home.tsx", "client/src/pages/Newsletter.tsx", "client/src/pages/DCASimulator.tsx"]) {
    assert.match(src(p), /<SubstackSignup\b/, p);
  }
});

test("no fake success and no dead /api/newsletter call (B1, B2)", () => {
  assert.doesNotMatch(src("client/src/pages/Home.tsx"), /You're in/);
  assert.doesNotMatch(src("client/src/pages/Newsletter.tsx"), /\/api\/newsletter/);
  assert.doesNotMatch(src("server/routes.ts"), /resend/i);
  assert.equal(existsSync(new URL("../../../server/api/newsletter.ts", import.meta.url)), false);
});

test("desktop nav links to /newsletter (I2)", () => {
  assert.match(src("client/src/components/Navbar.tsx"), /nav-newsletter-desktop/);
});
