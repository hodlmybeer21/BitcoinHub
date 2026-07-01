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
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrendingDown, Clock, Target, AlertTriangle, ArrowRight, Play, Loader2, Activity } from "lucide-react";
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

// Static analyst positions and the historical milestones are *not* live.
// They change when new posts from the analysts warrant a thesis refresh
// (manual edit). The price fields in CYCLE_MILESTONES are recomputed at
// render time from /api/cycle/state for the "Current" row only — the Q4
// 2025 top, the Feb 2026 bottom, and the Q4 2026 target stay static
// because they are historical or model outputs, not market quotes.
const CYCLE_MILESTONES = [
  {
    date: "Oct 6, 2025",
    event: "Cycle top",
    price: "$126,080",
    note: "Confirmed all-time high. Per CoinGecko tick data and Ben Cowen + multiple analysts.",
  },
  {
    date: "Feb 24, 2026",
    event: "Local bottom",
    price: "$65,021",
    note: "First leg down. -48% from peak. Tagging the 200-wk MA zone.",
  },
  {
    date: "Today",
    event: "Current",
    price: null as string | null, // populated live from /api/cycle/state
    note: "Live snapshot. Drawdown vs cycle top shown beside the price.",
  },
  {
    date: "Q4 2026",
    event: "Target cycle low",
    price: "$25.2K – $31.5K",
    note: "Historical -75% to -80% from the $126,080 peak. Window: Aug–Oct 2026.",
  },
  {
    date: "Q4 2027",
    event: "Next cycle top",
    price: "TBD",
    note: "If the cycle holds, post-halving blow-off top in late 2027 / early 2028.",
  },
];

interface CycleScore {
  score: number;
  label: string;
  notes: string;
  updatedAt: string;
}

interface CycleState {
  price: number;
  ma200w: number;
  change24h: number;
  change7d: number | null;
  change30d: number | null;
  drawdownPctFromTop: number;
  weeksToWindow: number;
  cycleTop: { price: number; date: string };
  cycleLowTarget: { min: number; max: number };
  windowOpen: string;
  asOf: string;
  source: 'live' | 'fallback';
  score: CycleScore;
}

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
  const { data: cycleState, isLoading: stateLoading } = useQuery<CycleState>({
    queryKey: ["/api/cycle/state"],
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const live = cycleState?.source === "live";
  const priceFmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const pctFmt = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

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
              textbook bottom window — {cycleState ? `${cycleState.weeksToWindow} weeks away.` : "approaching."}
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
            <div className="flex items-center gap-3">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Live Cycle State</h2>
              {cycleState && cycleState.drawdownPctFromTop > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  -{cycleState.drawdownPctFromTop.toFixed(1)}% from ${cycleState.cycleTop.price.toLocaleString()} top
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              {stateLoading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Fetching…
                </>
              ) : live ? (
                <>
                  <Activity className="h-3 w-3 text-emerald-400" />
                  Live · updated {cycleState ? new Date(cycleState.asOf).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 text-amber-400" />
                  Live data unavailable — figures shown are from the previous pulse.
                </>
              )}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold font-mono text-[#F7931A]">
                  {cycleState && cycleState.price > 0 ? priceFmt(cycleState.price) : "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">BTC spot</div>
                <div className="text-xs mt-2 font-mono">
                  {cycleState && cycleState.price > 0 ? (
                    <span className={cycleState.change24h >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {pctFmt(cycleState.change24h)} (24h)
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  {cycleState?.change7d != null && (
                    <span className={cycleState.change7d >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {` · ${pctFmt(cycleState.change7d)} (7d)`}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold font-mono">
                  {cycleState && cycleState.ma200w > 0
                    ? priceFmt(cycleState.ma200w)
                    : "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">200-week MA</div>
                <div className="text-xs mt-2 font-mono">
                  {cycleState && cycleState.ma200w > 0 && cycleState.price > 0 ? (
                    cycleState.price < cycleState.ma200w ? (
                      <span className="text-amber-400">
                        {((cycleState.ma200w - cycleState.price) / cycleState.ma200w * 100).toFixed(1)}% below — cycle floor zone
                      </span>
                    ) : (
                      <span className="text-emerald-400">
                        {((cycleState.price - cycleState.ma200w) / cycleState.ma200w * 100).toFixed(1)}% above
                      </span>
                    )
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold font-mono text-amber-400">
                  {cycleState ? cycleState.weeksToWindow : "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">weeks to Q4 window</div>
                <div className="text-xs text-muted-foreground mt-2">Aug–Oct optimal entry</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold font-mono text-foreground">
                  {cycleState ? `${priceFmt(cycleState.cycleLowTarget.min)} – ${priceFmt(cycleState.cycleLowTarget.max)}` : "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Q4 2026 target</div>
                <div className="text-xs text-muted-foreground mt-2">−75% to −80% drawdown</div>
              </CardContent>
            </Card>
          </div>

          {/* Cycle Pulse — editorial score, sourced from data/cycle-score.json */}
          <Card className="mt-4 bg-gradient-to-br from-[#F7931A]/[0.06] to-transparent border-[#F7931A]/25">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-baseline gap-3 mb-2">
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  Cycle Pulse
                </h3>
                {cycleState && cycleState.score?.updatedAt && (
                  <span className="text-[10px] text-muted-foreground">
                    Last updated {new Date(cycleState.score.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2">
                {cycleState && cycleState.score.score > 0 ? (
                  <>
                    <span className="text-4xl font-bold font-mono text-[#F7931A]">
                      {cycleState.score.score.toFixed(1)}
                      <span className="text-base text-muted-foreground font-normal">/10</span>
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {cycleState.score.label}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Score unavailable.</span>
                )}
              </div>
              {cycleState?.score?.notes && (
                <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
                  {cycleState.score.notes}
                </p>
              )}
            </CardContent>
          </Card>
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
          {CYCLE_MILESTONES.map((m, i) => {
            // The "Current" milestone (i === 2) gets its price from live data
            // and the note augmented with the live drawdown vs cycle top.
            const isCurrent = i === 2;
            const currentPrice = isCurrent && cycleState && cycleState.price > 0
              ? priceFmt(cycleState.price)
              : "—";
            const currentNote = isCurrent && cycleState && cycleState.price > 0
              ? `Live. ${cycleState.drawdownPctFromTop.toFixed(1)}% below the $${cycleState.cycleTop.price.toLocaleString()} top. ${cycleState.weeksToWindow} weeks to the Q4 window.`
              : m.note;
            return (
              <Card key={i} className={isCurrent ? "border-[#F7931A]/40 bg-[#F7931A]/[0.03]" : ""}>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-3">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">{m.date}</div>
                    </div>
                    <div className="md:col-span-3">
                      <div className="font-semibold text-foreground">{m.event}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="font-mono text-[#F7931A] font-bold">
                        {isCurrent ? currentPrice : m.price}
                      </div>
                    </div>
                    <div className="md:col-span-4">
                      <div className="text-sm text-muted-foreground">{currentNote}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
            {ANALYSTS.filter((a) => a.stance.toLowerCase().includes("bottom call")).length}/{ANALYSTS.length} bottom calls active
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

      {/* What to watch */}
      <section className="border-t border-border/40 bg-muted/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <h2 className="text-3xl font-bold mb-4">What to watch at this window</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  <strong className="text-foreground">200-week moving average.</strong>{" "}
                  Every cycle bottom has tagged this line. Current value is shown in
                  the live state strip above. A decisive weekly close below it is the
                  historical "this is the zone" signal.
                </p>
                <p>
                  <strong className="text-foreground">Pi Cycle top-cross confirmation.</strong>{" "}
                  The 111-day MA crossing the 350-day MA at the prior cycle top is the
                  other end of the pattern. Tracking the inverse (350 above 111) is the
                  bottom-phase analog the analysts watch.
                </p>
                <p>
                  <strong className="text-foreground">M2 money supply inflection.</strong>{" "}
                  Global liquidity expansion historically leads BTC by ~3 months. When
                  central banks pivot from QT to QE, the cycle bottom forms.
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
