// BitcoinHub — /legislation editorial overlay
//
// Tyler + GoodBot's curated commentary on the 3 crypto bills worth watching.
// The live bill metadata (status, latest action, sponsor, committees) is pulled
// from api.congress.gov at request time. This file just adds:
//   - The right bill IDs (in case the live bill numbers change)
//   - Category + priority tags
//   - Why-this-matters-for-BTC editorial
//   - Passage-chance estimates (Tyler's read, updated periodically)
//
// To add a bill: append to LEGISLATION_EDITORIAL. To retire one: remove it
// (or set retired=true to keep it visible but dimmed).

export type LegislationCategory =
  | 'regulation' | 'taxation' | 'stablecoin' | 'innovation' | 'enforcement';

export type LegislationPriority = 'high' | 'medium' | 'low';

// Pipeline stages — used by the StatusPipeline component.
// Matches the congress.gov latestAction.text patterns we recognize.
export type BillStage =
  | 'introduced'      // Introduced in one chamber
  | 'committee'       // Referred to / marked up in committee
  | 'passed_chamber'  // Passed one chamber, heading to the other
  | 'conference'      // Conference committee reconciling House + Senate versions
  | 'signed'          // Signed by the President (became law)
  | 'dead' | 'vetoed'; // Stalled or rejected

export interface EditorialOverlay {
  /** Short identifier used in URLs and analytics. e.g. "genius-act" */
  slug: string;
  /** Full bill name as it should appear on the page */
  billName: string;
  /** congress.gov bill type code, e.g. "s" or "hr". Optional for editorial-only bills (no congress.gov ID yet). */
  billType?: 's' | 'hr' | 'sjres' | 'hjres';
  /** Bill number, as a string. Optional for editorial-only bills. */
  billNumber?: string;
  /** congress.gov congress number, e.g. "119". Optional for editorial-only bills. */
  congress?: string;
  /** category + priority tags */
  category: LegislationCategory;
  priority: LegislationPriority;
  /** Tyler's "what this means for Bitcoin" — 2-3 sentences, plain English */
  whyItMatters: string;
  /** Tyler + GoodBot's read on what to watch for next */
  whatsNext: string;
  /** Tyler's estimate of passage chance (0-100) — based on committee votes, co-sponsors, election cycle */
  passageChance: number;
  /** Editorial status — shown when live congress.gov fetch fails or bill is editorial-only. */
  currentStatus?: string;
  /** Editorial stage — shown when live stage can't be derived. */
  stage?: BillStage;
  /** Optional override for sponsor display (if live data is sparse) */
  sponsorNote?: string;
  /** Whether to render this bill at all — defaults true */
  retired?: boolean;
}

// Curated as of 2026-08-24. 3 bills have live congress.gov IDs (GENIUS, FIT21, CLARITY).
// 3 bills are editorial-only (no live IDs yet) — SEC/CFTC rulebook, Anti-CBDC, SAB 121.

export const LEGISLATION_EDITORIAL: EditorialOverlay[] = [
  {
    slug: 'genius-act',
    billName: 'GENIUS Act (signed)',
    billType: 's',
    billNumber: '1582',
    congress: '119',
    category: 'stablecoin',
    priority: 'high',
    stage: 'signed',
    currentStatus: 'Became Public Law 119-27 — signed July 2025',
    whyItMatters:
      "Indirect for BTC, but high signal for the broader crypto market. Established federal licensing for stablecoin issuers (USDC, USDT, PYUSD) with reserve + audit requirements — takes stablecoins out of the SEC's enforcement-by-letters gray zone. A clean US stablecoin framework removes a regulatory-overhang line item from every crypto company's risk register, and signals that Congress <em>can</em> legislate on digital assets without it becoming partisan warfare. Also: USDC and USDT are the on-ramp that 80%+ of BTC purchases use, so a healthier US stablecoin regime is indirectly bullish for BTC liquidity.",
    whatsNext:
      'Watch how the new federal regime reshapes USDC vs Tether competitive dynamics. Treasury guidance on reserve-asset composition is the next major milestone — likely Q4 2026.',
    passageChance: 100,
  },
  {
    slug: 'fit21',
    billName: 'FIT21 Act (retired)',
    billType: 'hr',
    billNumber: '4763',
    congress: '118',
    category: 'regulation',
    priority: 'high',
    stage: 'dead',
    currentStatus: 'Died at end of 118th Congress — succeeded by CLARITY in 119th',
    whyItMatters:
      "Passed House 311-104 in 2024 — a rare bipartisan vote that established CFTC-as-primary-regulator as the policy consensus for digital commodities including BTC. Died in the Senate. The 119th Congress chose to start fresh with CLARITY rather than pick up FIT21. The principles live on; the bill vehicle does not.",
    whatsNext:
      'Monitor only if CLARITY stalls — FIT21 could be revived as a compromise vehicle, but the current path is CLARITY forward.',
    passageChance: 0,
    sponsorNote: 'Rep. Patrick McHenry (R-NC) + Rep. Glenn Thompson (R-PA) + House Democrats',
    retired: true,
  },
  {
    slug: 'clarity-act',
    billName: 'CLARITY Act',
    billType: 'hr',
    billNumber: '3633',
    congress: '119',
    category: 'regulation',
    priority: 'high',
    stage: 'committee',
    currentStatus: 'Cloture motion on motion to proceed presented in Senate (Aug 2026) — closest a crypto market-structure bill has been to a floor vote',
    whyItMatters:
      "Direct for BTC. Defines digital commodities in statute (what BTC needs), establishes CFTC primary jurisdiction (not SEC's), creates a clear registration path for exchanges and custodians. The August 2026 cloture motion means the bill is actively being debated on the Senate floor — the closest a digital commodities bill has been to a Senate vote. If it passes, US-registered exchanges and custodians get a clear path to handle BTC without the current SEC-by-enforcement regime that's hung over the industry since the 2017-2018 ICO era.",
    whatsNext:
      'Senate floor vote likely Q4 2026. Watch for amendments on the SEC/CFTC advisory committee scope — broader scope = more protection from jurisdictional turf wars between the agencies.',
    passageChance: 60,
    sponsorNote: 'Rep. French Hill (R-AR) + bipartisan working group',
  },
  // ── Editorial-only (no congress.gov bill ID yet) ──
  {
    slug: 'sec-cftc-unified-rulebook',
    billName: 'SEC/CFTC Unified Rulebook',
    category: 'regulation',
    priority: 'high',
    stage: 'committee',
    currentStatus: 'Joint framework expected after 2025 roundtables — Q4 2026 release window',
    whyItMatters:
      "The two regulators are finally publishing a unified framework after 2025's joint roundtables. This is the more granular, day-to-day version of what CLARITY would lock in — even without legislation, this changes how exchanges and custodians operate. Concrete asks: which tokens are securities vs commodities, custody requirements, disclosure standards.",
    whatsNext:
      'Joint draft expected Q4 2026. Watch for the industry comment period — exchanges and custodians will signal what they want preserved.',
    passageChance: 70,
  },
  {
    slug: 'anti-cbdc-surveillance',
    billName: 'Anti-CBDC Surveillance State Act',
    category: 'regulation',
    priority: 'medium',
    stage: 'passed_chamber',
    currentStatus: 'Passed House twice (118th + 119th) — Senate Commerce Committee vote likely Q4 2026',
    whyItMatters:
      "Direct for BTC's monetary thesis. Prohibits the Fed from issuing a retail CBDC (central bank digital currency). If passed, it removes a credible Fed alternative to BTC and locks in the 'digital dollar = BTC' framing for retail. Otherwise, a Fed-issued retail CBDC competes with BTC on payments rails and could draw liquidity.",
    whatsNext:
      'Senate Commerce Committee markup. Watch for administration signals — a hostile White House stance on retail CBDCs (likely) helps this bill.',
    passageChance: 40,
  },
  {
    slug: 'sab121-repeal',
    billName: 'SAB 121 Repeal Joint Resolution',
    category: 'regulation',
    priority: 'medium',
    stage: 'committee',
    currentStatus: 'House passed repeal resolution (2024) — Senate Banking Committee has not scheduled a vote',
    whyItMatters:
      "Indirect but high-leverage. SEC's SAB 121 forced banks to mark crypto custody as a liability on the balance sheet — which functionally prevented US banks from custodying BTC. Repealing it unlocks institutional custody infrastructure. Pension funds, RIAs, and the big banks could then offer BTC exposure without weird workarounds. Estimated impact: $1-3T of institutional capital that can't currently touch BTC.",
    whatsNext:
      'Senate Banking Committee vote. Banking lobby is actively opposed (huge fee revenue at stake). Watch for SEC leadership signals or administration pressure to break the logjam.',
    passageChance: 30,
  },
];

// Helper used by the API handler to derive a bill stage from congress.gov's
// latestAction.text. Best-effort heuristic — congress.gov doesn't have a
// machine-readable status field, so we parse the action text.
export function deriveStage(latestActionText: string | undefined): BillStage {
  if (!latestActionText) return 'introduced';
  const t = latestActionText.toLowerCase();
  if (t.includes('became public law') || t.includes('signed by president')) return 'signed';
  if (t.includes('vetoed')) return 'vetoed';
  if (t.includes('pocket veto') || t.includes('died') || t.includes('withdrawn')) return 'dead';
  if (t.includes('conference') || t.includes('resolving differences')) return 'conference';
  if (t.includes('passed senate') || t.includes('passed house') || t.includes('passed both')) return 'passed_chamber';
  if (t.includes('reported to') || t.includes('committee') || t.includes('markup')) return 'committee';
  return 'introduced';
}

// Pipeline step display order for the StatusPipeline component.
export const PIPELINE_STAGES: BillStage[] = [
  'introduced',
  'committee',
  'passed_chamber',
  'conference',
  'signed',
];

export const STAGE_LABEL: Record<BillStage, string> = {
  introduced: 'Introduced',
  committee: 'In Committee',
  passed_chamber: 'Passed Chamber',
  conference: 'Conference',
  signed: 'Signed',
  dead: 'Stalled',
  vetoed: 'Vetoed',
};

export const STAGE_DESCRIPTION: Record<BillStage, string> = {
  introduced: 'Bill text filed with one chamber of Congress',
  committee: 'Referred to committee, hearings + markup',
  passed_chamber: 'Passed one chamber, on its way to the other',
  conference: 'House + Senate reconciling different versions',
  signed: 'Became Public Law',
  dead: 'No longer moving this session',
  vetoed: 'Passed both chambers but rejected by the President',
};