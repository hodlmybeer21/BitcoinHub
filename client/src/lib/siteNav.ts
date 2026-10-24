// Single source of truth for site navigation (UX review: "Proposed nav").
// Desktop: Cycle · Macro · Data stories · Learn · Sources · [Subscribe — free]
// Mobile: same five, then a "More tools" group. Labs is a footer-only link group.
// Retired pages (games, 3D character, Command Center, Hash Defense, portfolio,
// login/register, web resources, admin) are intentionally absent from every list.

export interface NavLink {
  href: string;
  label: string;
  description?: string;
  external?: boolean;
  /** Extra paths that should mark this item active (sub-pages). */
  match?: string[];
}

export const PRIMARY_NAV: NavLink[] = [
  { href: "/cycle", label: "Cycle", match: ["/cycle", "/cycle/compare", "/risk"] },
  { href: "/macro", label: "Macro", match: ["/macro", "/analytics", "/legislation"] },
  { href: "/data-stories", label: "Data stories", match: ["/data-stories", "/laws", "/dca-simulator"] },
  { href: "/learn", label: "Learn", match: ["/learn", "/thesis"] },
  { href: "/sources", label: "Sources", match: ["/sources", "/about"] },
];

export const MORE_TOOLS: NavLink[] = [
  { href: "/cycle/compare", label: "Compare cycles", description: "This cycle vs. the last three, from the halving" },
  { href: "/risk", label: "Risk indicator", description: "Cycle-position score (0–1) with halving context" },
  { href: "/analytics", label: "Market data", description: "Price, on-chain, derivatives and flows" },
  { href: "/legislation", label: "Legislation", description: "US bills that touch Bitcoin" },
  { href: "/dca-simulator", label: "DCA simulator", description: "Hypothetical dollar-cost averaging backtests" },
  { href: "/laws", label: "Through the Laws", description: "Metcalfe, Lindy, Stock-to-Flow and more, charted" },
  { href: "https://tracker.goodbotai.tech", label: "Value Tracker", description: "What a dollar buys over time", external: true },
  { href: "/thesis", label: "The thesis", description: "Satoshi's white paper, section by section" },
  { href: "/about", label: "About", description: "Who builds this and how" },
];

export const LABS: NavLink[] = [
  { href: "/workbench", label: "Indicator workbench" },
  { href: "/analytics/cockpit", label: "Trading cockpit" },
];

/** Paths that must never be linked from the nav or footer (UX review: remove/retire). */
export const RETIRED_PATHS = [
  "/games",
  "/games/dashboard",
  "/games/character",
  "/games/hash-defense",
  "/games/btc-collector",
  "/slides",
  "/portfolio",
  "/portfolio/mpt",
  "/web-resources",
  "/login",
  "/register",
  "/forgot-password",
  "/admin",
];

export function isNavActive(link: NavLink, location: string): boolean {
  const paths = link.match ?? [link.href];
  return paths.some((p) => location === p || location.startsWith(p + "/"));
}
