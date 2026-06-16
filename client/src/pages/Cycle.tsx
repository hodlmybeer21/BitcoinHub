/**
 * BitcoinHub — The Bitcoin 4-Year Cycle
 *
 * Why this page exists:
 *   The 4-year halving cycle is the single highest-conviction macro pattern
 *   in Bitcoin. The site teaches *how money works* — this page teaches
 *   *why now*. Q4 2026 is the textbook cycle bottom window.
 *
 * Sources: Ben Cowen, Jordan Crypt, CTO Larsson, Rekt Capital
 * Live state: BTC Daily Pulse cron (5-creator synthesis)
 */

import { Link } from "wouter";
import { motion } from "framer-motion";
import { TrendingDown, Clock, Target, AlertTriangle, ArrowRight, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.1 },
  },
};

// Snapshot of the BTC Daily Pulse as of 2026-06-16.
// In a future iteration this could be a live fetch from /api/cycle-score.
const CYCLE_SNAPSHOT = {
  asOf: "2026-06-16 11:15 UTC",
  price: 66459,
  change24h: 0.65,
  change7d: 6.01,
  change30d: -15.05,
  score: 6.4,
  label: "LATE BEAR — Q4 window opening soon",
  pctFromTop: 46.7,
  weeksToQ4: 15.2,
  consensus: {
    bottomCall: 3, // 3 of 4 analysts actively call the bottom
    accumulating: 2,
    cautious: 1,
  },
};

const CYCLE_MILESTONES = [
  { date: "Q4 2025", event: "Cycle top", price: "$124,774", note: "Confirmed. Per Ben Cowen + multiple analysts." },
  { date: "Feb 6, 2026", event: "Local bottom", price: "$62,854", note: "First leg down. -50% from peak. 200-wk MA floor at ~$61.6K." },
  { date: "Jun 16, 2026", event: "Current", price: "$66,459", note: "Late bear. Reclaiming strength. 15 weeks to Q4 window." },
  { date: "Q4 2026", event: "Target cycle low", price: "$25K – $31K", note: "Historical -75% to -80% from $124,774 peak. Window: Aug-Oct." },
  { date: "Q4 2027", event: "Next cycle top", price: "TBD", note: "If cycle holds, post-halving blow-off top in late 2025/early 2026." },
];

const ANALYSTS = [
  {
    name: "Ben Cowen",
    handle: "@benjamincowen",
    stance: "Bottom call active",
    note: "Cycle intact. Post-halving tops + midterm lows hold. Q4 2026 bottom thesis.",
    weight: 0.9,
  },
  {
    name: "Jordan Crypt",
    handle: "@Jordan_Crypt",
    stance: "Bottom call active · Accumulating",
    note: "Spider fan + FRVP confluence. First bottom zone hit. MODERATE confluence.",
    weight: 0.85,
  },
  {
    name: "Rekt Capital",
    handle: "@rektcapital",
    stance: "Bottom call active",
    note: "14% deviation below 2021 ATHs. Bear market bottom blueprint in play.",
    weight: 0.75,
  },
  {
    name: "CTO Larsson",
    handle: "@ctoLarsson",
    stance: "Cautiously positioned · Short active",
    note: "Structure over narrative. Watching horizontal level at $75K. Risk-first.",
    weight: 0.6,
  },
];

export default function Cycle() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="border-b border-border/40 bg-gradient-to-b from-[#F7931A]/[0.04] to-transparent">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
          <motion.div initial="initial" animate="animate" variants={staggerContainer}>
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-4 border-[#F7931A]/40 text-[#F7931A] bg-[#F7931A]/5">
                The Bitcoin 4-Year Cycle
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeInUp} className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground max-w-4xl">
              The cycle has held through 4 halvings. <span className="text-[#F7931A]">It's holding now.</span>
            </motion.h1>
            <motion.p variants={fadeInUp} className="mt-6 text-lg text-muted-foreground max-w-3xl">
              Bitcoin tops in Q4 of post-halving years and bottoms in Q4 of midterm years. The pattern
              has survived ETFs, MicroStrategy, and trillions in corporate buying. Q4 2026 is the next
              textbook bottom window — 15 weeks away.
            </motion.p>
            <motion.div variants={fadeInUp} className="mt-8 flex flex-wrap gap-3">
              <Link href="/dca-simulator">
                <Button size="lg" className="bg-[#F7931A] hover:bg-[#E67500] text-black font-semibold">
                  Try the DCA Simulator
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/analytics">
                <Button size="lg" variant="outline">
                  See Live Analytics
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Live State Strip */}
      <section className="border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Live Cycle State</h2>
            <span className="text-xs text-muted-foreground">Snapshot {CYCLE_SNAPSHOT.asOf}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold font-mono text-[#F7931A]">
                  ${CYCLE_SNAPSHOT.price.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">BTC spot</div>
                <div className="text-xs text-red-400 mt-2 font-mono">
                  {CYCLE_SNAPSHOT.change24h >= 0 ? "+" : ""}{CYCLE_SNAPSHOT.change24h.toFixed(2)}% (24h) · {CYCLE_SNAPSHOT.change7d >= 0 ? "+" : ""}{CYCLE_SNAPSHOT.change7d.toFixed(1)}% (7d)
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold font-mono">{CYCLE_SNAPSHOT.score.toFixed(1)}<span className="text-base text-muted-foreground">/10</span></div>
                <div className="text-xs text-muted-foreground mt-1">Cycle score</div>
                <div className="text-xs text-amber-400 mt-2">{CYCLE_SNAPSHOT.label}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold font-mono">-{CYCLE_SNAPSHOT.pctFromTop.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground mt-1">from $124,774 top</div>
                <div className="text-xs text-muted-foreground mt-2">200-wk MA floor intact</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold font-mono text-amber-400">{CYCLE_SNAPSHOT.weeksToQ4.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground mt-1">weeks to Q4 window</div>
                <div className="text-xs text-muted-foreground mt-2">Aug-Oct optimal entry</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* The 4-Year Cycle Thesis */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <h2 className="text-3xl font-bold mb-4">Why the cycle holds</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                The 4-year (3yr 11mo) cycle isn't magic. It has two real structural roots:
              </p>
              <ol className="space-y-3 pl-5 list-decimal">
                <li>
                  <strong className="text-foreground">The halving supply shock.</strong> Every ~1,460 days,
                  Bitcoin's new issuance rate gets cut in half. Less new supply + the same or growing
                  demand = price expansion.
                </li>
                <li>
                  <strong className="text-foreground">Miner economics.</strong> Post-halving, miner revenue
                  drops overnight. The least efficient capitulate. Hash rate follows price with a lag.
                  That capitulation marks the bottom.
                </li>
                <li>
                  <strong className="text-foreground">Social feedback loop.</strong> The pattern becomes
                  self-fulfilling: enough people act on it that the pattern persists. Not a physical
                  law — but a high-confidence one.
                </li>
              </ol>
              <p>
                ETFs didn't break it. MicroStrategy didn't break it. The 2025 top to 2026 bottom
                sequence is on schedule.
              </p>
            </div>
          </div>
          <Card className="overflow-hidden">
            <div className="aspect-video relative bg-black">
              <video
                src="/cycle/btc-cycle.mp4"
                controls
                playsInline
                preload="metadata"
                className="absolute inset-0 w-full h-full object-cover"
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">
                30-second overview: the cycle pattern, the Q4 2026 window, and what it means for accumulation.
                Built with HyperFrames.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Cycle Milestones */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold mb-2">Cycle milestones</h2>
        <p className="text-muted-foreground mb-8">Where we are, where we're going.</p>
        <div className="space-y-3">
          {CYCLE_MILESTONES.map((m, i) => (
            <Card key={i} className={i === 2 ? "border-[#F7931A]/40 bg-[#F7931A]/[0.03]" : ""}>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-3">
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">{m.date}</div>
                  </div>
                  <div className="md:col-span-3">
                    <div className="font-semibold text-foreground">{m.event}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="font-mono text-[#F7931A] font-bold">{m.price}</div>
                  </div>
                  <div className="md:col-span-4">
                    <div className="text-sm text-muted-foreground">{m.note}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* The Super Cycle Chart */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold mb-2">The full picture</h2>
        <p className="text-muted-foreground mb-6">
          All four cycles overlaid. The pattern is the pattern.
        </p>
        <Card className="overflow-hidden">
          <img
            src="/cycle/btc-super-cycle.png"
            alt="Bitcoin 4-year cycle — all four cycles overlaid with the Q4 2026 target window"
            className="w-full h-auto"
          />
        </Card>
      </section>

      {/* What the analysts are saying */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">What the analysts are saying</h2>
            <p className="text-muted-foreground mt-2">5-creator synthesis from the BTC Daily Pulse pipeline.</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {CYCLE_SNAPSHOT.consensus.bottomCall}/4 bottom calls active
          </Badge>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {ANALYSTS.map((a) => (
            <Card key={a.name}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{a.name}</CardTitle>
                  <span className="text-xs text-muted-foreground">{a.handle}</span>
                </div>
                <div className="text-sm text-[#F7931A] font-semibold">{a.stance}</div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{a.note}</p>
                <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#F7931A]"
                    style={{ width: `${a.weight * 100}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">Weight: {(a.weight * 100).toFixed(0)}%</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* The trade */}
      <section className="border-t border-border/40 bg-muted/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <h2 className="text-3xl font-bold mb-4">The trade plan</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  <strong className="text-foreground">Stage 1 — SBIT calls (mid-June expiry).</strong>{" "}
                  Long puts/short-equity exposure that benefits as BTC drops toward the bottom window.
                </p>
                <p>
                  <strong className="text-foreground">Stage 2 — Accumulation below $70K.</strong>{" "}
                  Begin staged accumulation now. Keep 50% dry powder for the $25K-$31K zone.
                </p>
                <p>
                  <strong className="text-foreground">Stage 3 — Flip to spot SBIT at bottom.</strong>{" "}
                  After the Q4 low, rotate from puts to spot exposure. Use 10-15-20% pullbacks in the
                  next bull market as entries for leveraged long (IBIT) positions.
                </p>
              </div>
            </div>
            <Card className="bg-amber-950/20 border-amber-800/40">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Cycle is not a law
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  High-confidence pattern, not a guarantee. If structural demand (ETFs, treasuries,
                  sovereign buyers) absorbs the supply shock differently, the bottom prints higher.
                </p>
                <p>
                  Position sizing and stop discipline matter more than being right.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="bg-gradient-to-br from-[#F7931A]/[0.08] to-transparent border-[#F7931A]/30">
          <CardContent className="pt-8 pb-8 text-center">
            <Target className="h-10 w-10 text-[#F7931A] mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Make this personal</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
              See what $50/month from any start year would have built. Then see what $50/month from
              the next 15 weeks could build.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/dca-simulator">
                <Button size="lg" className="bg-[#F7931A] hover:bg-[#E67500] text-black font-semibold">
                  Try the DCA Simulator
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/learn">
                <Button size="lg" variant="outline">
                  Back to Learning Center
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
