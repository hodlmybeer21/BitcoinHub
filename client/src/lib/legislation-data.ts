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
  /** congress.gov bill type code, e.g. "s" or "hr" */
  billType: 's' | 'hr' | 'sjres' | 'hjres';
  /** Bill number, as a string (preserves leading zeros) */
  billNumber: string;
  /** congress.gov congress number, e.g. "119" */
  congress: string;
  /** category + priority tags */
  category: LegislationCategory;
  priority: LegislationPriority;
  /** Tyler's "what this means for Bitcoin" — 2-3 sentences, plain English */
  whyItMatters: string;
  /** Tyler + GoodBot's read on what to watch for next */
  whatsNext: string;
  /** Tyler's estimate of passage chance (0-100) — based on committee votes, co-sponsors, election cycle */
  passageChance: number;
  /** Optional override for sponsor display (if live data is sparse) */
  sponsorNote?: string;
  /** Whether to render this bill at all — defaults true */
  retired?: boolean;
}

// Curated as of 2026-08-24. Bill IDs verified against api.congress.gov.
export const LEGISLATION_EDITORIAL: EditorialOverlay[] = [
  {
    slug: 'genius-act',
    billName: 'GENIUS Act',
    billType: 's',
    billNumber: '1582',
    congress: '119',
    category: 'stablecoin',
    priority: 'high',
    whyItMatters:
      "Indirect for BTC, but high signal for the broader crypto market. The bill establishes federal licensing for stablecoin issuers (USDC, USDT, PYUSD) with reserve + audit requirements — taking stablecoins out of the SEC's enforcement-by-letters gray zone. A clean US stablecoin framework removes a regulatory-overhang line item from every crypto company's risk register, and signals that Congress <em>can</em> legislate on digital assets without it becoming partisan warfare.",
    whatsNext:
      'Watch the Senate floor vote — expected Q2 2026. Key amendments to track: reserve-asset composition (T-bills only vs. broader), audit cadence (monthly vs. annual), and whether foreign-issued stablecoins get a federal registration path.',
    passageChance: 70,
  },
  {
    slug: 'fit21',
    billName: 'FIT21 Act',
    billType: 'hr',
    billNumber: '4763',
    congress: '118',
    category: 'regulation',
    priority: 'high',
    whyItMatters:
      "Direct for BTC. This is the bill that puts Bitcoin in CFTC's jurisdiction (not SEC's). Passed the House 311-104 in 2024 — a rare bipartisan vote on crypto. If it ever becomes law, US-registered exchanges and custodians would have a clear path to handle BTC without the current SEC-by-enforcement regime that's hung over the industry since the 2017-2018 ICO era.",
    whatsNext:
      'Languishing in the Senate since 2024. The 119th Congress chose to start fresh with CLARITY rather than pick up FIT21 — but FIT21 is still alive procedurally and could be revived as the vehicle for a House-Senate compromise.',
    passageChance: 45,
    sponsorNote: 'Rep. Patrick McHenry (R-NC) + Rep. Glenn Thompson (R-PA) + House Democrats',
  },
  {
    slug: 'clarity-act',
    billName: 'CLARITY Act',
    billType: 'hr',
    billNumber: '3633',
    congress: '119',
    category: 'regulation',
    priority: 'high',
    whyItMatters:
      "The 119th Congress's answer to FIT21. Same goal — CFTC primary jurisdiction for digital commodities, SEC for securities — but a fresh start with the new majority. Defines digital commodities in statute (which is what BTC needs), establishes registration paths for exchanges and custodians, and creates a joint SEC-CFTC advisory committee to handle edge cases.",
    whatsNext:
      'Early-stage — subcommittee hearings expected first, then markup. Likely combined with stablecoin provisions from GENIUS into a single market-structure package. Best-case: passed House by end of 2026, Senate in 2027.',
    passageChance: 50,
    sponsorNote: 'Rep. French Hill (R-AR) + bipartisan working group',
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