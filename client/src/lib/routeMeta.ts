// Per-route <title>, description, OG/Twitter and canonical (audit I3). Pure lookup so it's
// unit-testable; rendered by components/RouteMeta.tsx via react-helmet-async.
export const SITE_ORIGIN = "https://bitcoinhub.goodbotai.tech";
const SUFFIX = " — BitcoinHub";

export interface RouteMeta { title: string; description: string }

const DEFAULT: RouteMeta = {
  title: "BitcoinHub — Where are we in the Bitcoin cycle?",
  description:
    "Bitcoin cycle analysis, macro overlays (US10Y, US30Y, Fed Funds), and no-code backtesting for the 4-year halving cycle. Free, with data from FRED and public market APIs.",
};

const ROUTES: Record<string, RouteMeta> = {
  "/": DEFAULT,
  "/cycle": { title: "The 4-Year Bitcoin Cycle" + SUFFIX, description: "Where Bitcoin sits in its 4-year halving cycle, from halving to top to the Q4 bottom window." },
  "/cycle/compare": { title: "Compare Bitcoin Cycles" + SUFFIX, description: "Overlay Bitcoin's halving cycles side by side to compare drawdowns and recoveries." },
  "/analytics": { title: "Bitcoin Analytics" + SUFFIX, description: "Bitcoin price, on-chain, macro and derivatives indicators in one dashboard: M2, 10-year yield, funding, options open interest and more." },
  "/analytics/cockpit": { title: "Trading Cockpit" + SUFFIX, description: "Bitcoin market cockpit: live price, macro indicators, liquidity, options flow, funding rates and Treasury auctions." },
  "/learn": { title: "Learn Bitcoin" + SUFFIX, description: "Interactive Bitcoin education: learn by doing, with hands-on simulations." },
  "/games": { title: "Bitcoin Games" + SUFFIX, description: "Interactive Bitcoin education: games and simulations that teach by doing." },
  "/web-resources": { title: "Bitcoin Web Resources" + SUFFIX, description: "Curated Bitcoin charts and tools: M2 vs BTC, liquidation heatmaps, Pi Cycle Top and the Fear & Greed Index." },
  "/legislation": { title: "Crypto Legislation Tracker" + SUFFIX, description: "Live US crypto bill status from congress.gov, with editorial framing for what it means for Bitcoin." },
  "/dca-simulator": { title: "Bitcoin DCA Simulator" + SUFFIX, description: "See what a monthly Bitcoin purchase from any start year would be worth today." },
  "/newsletter": { title: "Newsletter" + SUFFIX, description: "HODL My Beer Macro on Substack: Bitcoin cycle, macro and Fourth Turning notes." },
  "/privacy": { title: "Privacy Policy" + SUFFIX, description: "How BitcoinHub handles your data." },
  "/terms": { title: "Terms of Service" + SUFFIX, description: "Terms for using BitcoinHub." },
  "/login": { title: "Log in" + SUFFIX, description: "Log in to BitcoinHub." },
  "/register": { title: "Create an account" + SUFFIX, description: "Create a BitcoinHub account." },
  "/forgot-password": { title: "Reset password" + SUFFIX, description: "Reset your BitcoinHub password." },
  "/portfolio": { title: "Portfolio" + SUFFIX, description: "Portfolio tracking for BitcoinHub accounts." },
  "/portfolio/mpt": { title: "Modern Portfolio Theory for Crypto" + SUFFIX, description: "Build a crypto portfolio across halving cycles: efficient frontier, max-Sharpe weights and rebalance targets." },
  "/workbench": { title: "Backtest Workbench" + SUFFIX, description: "Build custom Bitcoin indicators from BitcoinHub's data sources with no code, then backtest them." },
  "/workbench/templates": { title: "Backtest Templates" + SUFFIX, description: "Starter Bitcoin strategy templates for the backtest workbench." },
  "/workbench/gallery": { title: "Backtest Gallery" + SUFFIX, description: "Community Bitcoin indicators and backtests from the Workbench." },
  "/workbench/backtests": { title: "My Backtests" + SUFFIX, description: "Your saved Bitcoin strategy backtests." },
  "/workbench/overlay": { title: "Macro Overlay" + SUFFIX, description: "Show any saved Workbench formula as signal markers on the BTC price chart." },
  "/about": { title: "About" + SUFFIX, description: "A Bitcoin analytics hub for retail users: live data, no-code indicators, backtesting and a community gallery." },
  "/thesis": { title: "The Thesis" + SUFFIX, description: "The Bitcoin whitepaper, section by section: the document every claim on BitcoinHub traces back to." },
  "/sources": { title: "Data Sources" + SUFFIX, description: "Every number on BitcoinHub traces to a public endpoint. Here is each source and what it powers." },
  "/risk": { title: "Bitcoin Risk Indicators" + SUFFIX, description: "A 0–1 Bitcoin cycle-position score combining Mayer Multiple z-score, RSI(14), halving-cycle position and 200-week MA distance." },
  "/macro": { title: "Macro Dashboard" + SUFFIX, description: "Federal Reserve, Treasury, BLS and Chicago Fed data via FRED: liquidity, rates, inflation, employment and financial conditions." },
  "/laws": { title: "Bitcoin Through the Laws" + SUFFIX, description: "Network effects, adoption curves, and the Lindy Effect applied to Bitcoin." },
};

export function metaForPath(pathname: string): RouteMeta & { canonical: string } {
  const clean = (pathname.split(/[?#]/)[0] || "/").replace(/\/+$/, "") || "/";
  let meta = ROUTES[clean];
  if (!meta && clean.startsWith("/workbench/backtests/")) meta = { title: "Backtest" + SUFFIX, description: "A Bitcoin strategy backtest from the BitcoinHub workbench." };
  return { ...(meta ?? DEFAULT), canonical: SITE_ORIGIN + (clean === "/" ? "" : clean) };
}
