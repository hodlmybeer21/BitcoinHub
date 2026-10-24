// BitcoinHub — /legislation editorial overlay
//
// Curated commentary on the crypto bills worth watching.
// The live bill metadata (status, latest action, sponsor, committees) is pulled
// from api.congress.gov at request time. This file just adds:
//   - The right bill IDs (in case the live bill numbers change)
//   - Category + priority tags
//   - Why-this-matters-for-BTC editorial
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
  /** What this means for Bitcoin — 2-3 sentences, plain English */
  whyItMatters: string;
  /** What to watch for next. No dated forecasts unless sourced. */
  whatsNext: string;
  /** Editorial status — shown when live congress.gov fetch fails or bill is editorial-only. */
  currentStatus?: string;
  /** Editorial stage — shown when live stage can't be derived. */
  stage?: BillStage;
  /** Optional override for sponsor display (if live data is sparse) */
  sponsorNote?: string;
  /** Whether to render this bill at all — defaults true */
  retired?: boolean;
}

// Mirrors LEGISLATION_EDITORIAL in api/index.ts. Statuses verified against congress.gov
// and sec.gov on 2026-10-24 (UX review #38). Every entry has a congress.gov ID, so the
// API replaces currentStatus with the live latest action when congress.gov is reachable.
// Passage-chance percentages were removed: they were guesses shown as numbers.

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
    currentStatus: 'Became Public Law 119-27 on July 18, 2025',
    whyItMatters:
      "Indirect for BTC, but a strong signal for the wider crypto market. It sets up federal licensing for payment-stablecoin issuers, with reserve and audit requirements, and takes stablecoins out of the regulatory gray zone. Stablecoins are a major on-ramp for buying BTC, so a clearer US stablecoin regime matters for BTC liquidity.",
    whatsNext:
      'It is law. What remains is implementation: the rules Treasury and the banking regulators write under it.',
  },
  {
    slug: 'clarity-act',
    billName: 'CLARITY Act',
    billType: 'hr',
    billNumber: '3633',
    congress: '119',
    category: 'regulation',
    priority: 'high',
    stage: 'passed_chamber',
    currentStatus: 'Passed the House 294-134 (July 17, 2025). In the Senate, cloture on the motion to proceed failed 49-50 (Sept 15, 2026).',
    whyItMatters:
      "Direct for BTC. Defines digital commodities in statute (what BTC needs), gives the CFTC primary jurisdiction over them instead of the SEC, and creates a registration path for exchanges and custodians.",
    whatsNext:
      'It needs 60 votes to get past the Senate procedural vote that failed in September 2026; a motion to reconsider that vote was entered. The latest congress.gov action is shown above.',
    sponsorNote: 'Rep. French Hill (R-AR)',
  },
  {
    slug: 'anti-cbdc-surveillance',
    billName: 'Anti-CBDC Surveillance State Act',
    billType: 'hr',
    billNumber: '1919',
    congress: '119',
    category: 'regulation',
    priority: 'medium',
    stage: 'passed_chamber',
    currentStatus: 'Passed the House 219-210 (July 17, 2025)',
    whyItMatters:
      "Direct for BTC's monetary thesis. It would bar the Federal Reserve from issuing a retail central bank digital currency (CBDC), which would otherwise compete with BTC as a digital form of money.",
    whatsNext:
      'It needs Senate action to move. The latest congress.gov action is shown above.',
    sponsorNote: 'Rep. Tom Emmer (R-MN)',
  },
  {
    slug: 'fit21',
    billName: 'FIT21 Act (expired)',
    billType: 'hr',
    billNumber: '4763',
    congress: '118',
    category: 'regulation',
    priority: 'low',
    stage: 'dead',
    currentStatus: 'Passed the House 279-136 (May 22, 2024); never got a Senate vote and expired with the 118th Congress',
    whyItMatters:
      "The first bipartisan House vote to make the CFTC the main regulator for digital commodities like BTC. CLARITY in the 119th Congress picked up the same approach.",
    whatsNext:
      'Nothing pending. Kept for context.',
    retired: true,
  },
  {
    slug: 'sab121-repeal',
    billName: 'SAB 121 repeal resolution (resolved)',
    billType: 'hjres',
    billNumber: '109',
    congress: '118',
    category: 'regulation',
    priority: 'low',
    stage: 'vetoed',
    currentStatus: 'Passed both chambers in May 2024, vetoed May 31, 2024; the House override failed July 11, 2024. The SEC then rescinded SAB 121 itself with SAB 122 (Jan 23, 2025).',
    whyItMatters:
      "SAB 121 made firms that custody crypto for customers carry it as a balance-sheet liability, which kept most US banks out of BTC custody. That barrier is gone now that SAB 121 is rescinded.",
    whatsNext:
      'Nothing pending. Resolved by the SEC rather than Congress.',
    retired: true,
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
/** Congress number for a date (the 119th runs Jan 3, 2025 to Jan 3, 2027). */
export function congressFor(date: Date): number {
  const y = date.getUTCFullYear();
  const beforeJan3 = date.getUTCMonth() === 0 && date.getUTCDate() < 3;
  const effective = beforeJan3 ? y - 1 : y;
  return Math.floor((effective - 1789) / 2) + 1;
}

/**
 * Pipeline stage from a bill's full action history (any order). Unlike deriveStage(),
 * which only reads the latest action, this doesn't regress when a later procedural
 * action ("motion to reconsider…") has no stage keywords. Bills from a past Congress
 * that never became law are 'dead'. Mirrored in api/index.ts (stageFromActions).
 */
export function deriveStageFromActions(
  actionTexts: string[],
  billCongress: number,
  currentCongress: number,
): BillStage {
  const all = actionTexts.map((t) => (t || '').toLowerCase());
  const any = (...needles: string[]) => all.some((t) => needles.some((n) => t.includes(n)));
  if (any('became public law', 'signed by president')) return 'signed';
  if (any('vetoed by president', 'failed of passage in house over veto', 'failed of passage in senate over veto')) return 'vetoed';
  if (billCongress < currentCongress) return 'dead';
  if (any('passed/agreed to in house', 'passed/agreed to in senate', 'passed house', 'passed senate')) return 'passed_chamber';
  if (any('reported', 'referred to', 'committee', 'markup')) return 'committee';
  return 'introduced';
}
