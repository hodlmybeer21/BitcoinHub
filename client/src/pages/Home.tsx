import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowRight, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { buildValueStats, type SourceRef } from "@/lib/valueTrackerStats";
import SubstackSignup from "@/components/SubstackSignup";
import { NEWSLETTER_NAME, NEWSLETTER_TAGLINE } from "@/lib/newsletter";
import { CycleNow } from '@/components/CycleNow';

// Front door (UX review #1–#13): one message, the Cycle Now card in the hero, the
// "what a dollar buys" cards, three laws, a short founder line, and exactly one
// Substack embed. Games, the Human+AI section, audience pills and the second
// footer are gone from here; the site footer in Layout carries the disclaimer.

const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
};

const ValueStat = ({ label, usd, gold, note, sources }: { label: string; usd: string; gold: string; note?: string; sources?: readonly SourceRef[] }) => (
  <div className="flex flex-col items-center px-4 py-3 bg-card/40 rounded-xl border border-muted/10">
    <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1 text-center">{label}</span>
    <div className="flex items-baseline gap-3 flex-wrap justify-center">
      <span className="text-amber-500 font-bold text-lg font-mono">{usd}</span>
      {/* Neutral colour: a gold-terms change is context, not a win or loss (review #5). */}
      {gold && <span className="text-muted-foreground text-sm font-mono">{gold}</span>}
    </div>
    {note && <span className="text-[10px] text-muted-foreground mt-0.5 text-center">{note}</span>}
    {sources && sources.length > 0 && (
      <span className="text-[10px] text-muted-foreground/80 mt-0.5 text-center">
        Source:{' '}
        {sources.map((src, i) => (
          <span key={src.url}>
            {i > 0 && '; '}
            <a href={src.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">{src.label}</a>
          </span>
        ))}
      </span>
    )}
  </div>
);

const LAWS = [
  { id: 'metcalfe', name: "Metcalfe's Law", tagline: "Network value grows with users squared. How Bitcoin's curve compares with the internet's." },
  { id: 'lindy', name: 'The Lindy Effect', tagline: 'The longer something survives, the longer it tends to last. Bitcoin is 17 years in.' },
  { id: 's2f', name: 'Stock-to-Flow', tagline: 'The scarcity model fit 2013→2021 and broke 2022→2024. We chart both, honestly.' },
];

const scrollToSignup = () => {
  document.getElementById('newsletter')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const Home = () => {
  return (
    <div className="bg-background">
      {/* ─── HERO: one message + Cycle Now (review #1, #4) ─── */}
      <section className="relative overflow-hidden" data-testid="home-hero">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(247,147,26,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(247,147,26,0.035)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_30%,black,transparent)]" aria-hidden="true" />
        <div className="relative max-w-4xl mx-auto px-0 sm:px-4 pt-6 sm:pt-12 pb-10">
          <motion.div {...fadeInUp} className="text-center space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-[1.08] tracking-tight">
              Where are we in the <span className="text-primary">Bitcoin cycle?</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Calm, sourced answers, updated daily. One clear read on the 4-year cycle, with every
              number linked to where it came from.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/cycle">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-7 h-12 text-base" data-testid="hero-see-cycle">
                  See the cycle <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="font-semibold px-7 h-12 text-base border-muted/30 hover:border-primary/50"
                onClick={scrollToSignup}
                data-testid="hero-get-chart"
              >
                <Mail className="mr-2 w-5 h-5" /> Get the free daily chart
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Educational, not financial advice ·{' '}
              <Link href="/sources" className="underline hover:text-foreground">See every data source</Link>
            </p>
          </motion.div>

          <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.1 }} className="mt-8 text-left">
            <CycleNow />
          </motion.div>
        </div>
      </section>

      {/* ─── WHAT A DOLLAR BUYS (review #5) ─── */}
      <section className="bg-card/60 border-y border-muted/10 py-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-5">
            <h2 className="text-2xl font-bold text-foreground mb-1">What a dollar buys, 1970–2025</h2>
            <p className="text-sm text-muted-foreground max-w-3xl mx-auto">
              Price changes through 2025 from public data (World Bank, BLS, Census/FRED, StatMuse). Gold and items are
              annual averages; Bitcoin is Dec 31 closes. More in{' '}
              <a href="https://tracker.goodbotai.tech" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Value Tracker
              </a>.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {buildValueStats().map(({ key, ...stat }) => (
              <ValueStat key={key} {...stat} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── THROUGH THE LAWS, trimmed to three (review #10) ─── */}
      <section className="py-14">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">How Bitcoin's growth compares</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Classic network and adoption laws, charted against live data, including where they break.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {LAWS.map((law) => (
              <Link key={law.id} href={`/laws#${law.id}`}>
                <Card className="bg-card border-muted/20 hover:border-primary/40 transition-all p-6 h-full cursor-pointer group">
                  <h3 className="text-lg font-semibold text-foreground mb-2">{law.name}</h3>
                  <p className="text-sm text-muted-foreground leading-snug">{law.tagline}</p>
                  <div className="flex items-center gap-1 text-sm text-primary mt-4 group-hover:gap-2 transition-all">
                    <span>See the chart</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link href="/laws" className="text-sm text-primary hover:underline">All eight laws →</Link>
          </div>
        </div>
      </section>

      {/* ─── WHO + WHY TRUST IT (review #6, #8, #2) ─── */}
      <section className="py-10 border-t border-muted/10">
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <p className="text-muted-foreground leading-relaxed">
            Tyler isn't a VC or a "crypto influencer." He works a regular job and built this because he couldn't
            find Bitcoin education that actually taught him how money works.{' '}
            <a href="https://x.com/hodlmybeer21" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@HODLMyBeer21</a>
          </p>
          <p className="text-sm text-muted-foreground">
            Researched with AI, edited by a human. Every number sourced.{' '}
            <Link href="/about" className="underline hover:text-foreground">How it's made</Link>
          </p>
          <blockquote className="pt-3 text-sm italic text-muted-foreground/80">
            &ldquo;A purely peer-to-peer version of electronic cash would allow online payments to be sent directly
            from one party to another without going through a financial institution.&rdquo;
            <footer className="mt-1 text-[11px] not-italic">
              Satoshi Nakamoto, 2008 ·{' '}
              <Link href="/thesis" className="underline hover:text-foreground">Read the thesis</Link>
            </footer>
          </blockquote>
        </div>
      </section>

      {/* ─── THE ONE SUBSTACK CTA ON THIS PAGE (review #11, #12) ─── */}
      <section className="py-14 scroll-mt-20" id="newsletter">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-gradient-to-br from-primary/[0.08] via-card to-card border-primary/15 p-6 md:p-10">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Get tomorrow's chart in your inbox</h2>
              <p className="text-base mt-2 text-muted-foreground">
                {NEWSLETTER_NAME}: {NEWSLETTER_TAGLINE} Free.
              </p>
            </div>
            <SubstackSignup height={170} />
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Home;
