'use client';

import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  ArrowRight,
  BookOpen,
  ChevronDown,
  BarChart3,
  Scale,
  Coins,
  CheckCircle2,
  Mail,
  ExternalLink,
  Gamepad2,
  Shield,
  Target,
  Zap,
  User,
  Bot,
  Sparkles,
  Heart,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';

interface MarketData {
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
}

const BitcoinIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="16" fill="#F7931A"/>
    <circle cx="16" cy="16" r="12" fill="none" stroke="white" strokeWidth="1.5"/>
    <text x="16" y="21" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white" fontFamily="serif">₿</text>
  </svg>
);

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } }
};

const HeroBackground = () => (
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute inset-0 bg-[linear-gradient(rgba(247,147,26,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(247,147,26,0.04)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />
    <motion.div
      className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#F7931A]/8 blur-3xl"
      animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
      transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full bg-[#F7931A]/5 blur-3xl"
      animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

const ValueStat = ({ label, usd, gold, note }: { label: string; usd: string; gold: string; note?: string }) => (
  <div className="flex flex-col items-center px-4 py-3 bg-card/40 rounded-xl border border-muted/10">
    <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</span>
    <div className="flex items-baseline gap-3">
      <span className="text-amber-500 font-bold text-lg font-mono">{usd}</span>
      <span className="text-green-500 text-sm font-mono">{gold}</span>
    </div>
    {note && <span className="text-[10px] text-muted-foreground mt-0.5">{note}</span>}
  </div>
);

const Home = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const { data: marketData } = useQuery<MarketData>({
    queryKey: ['/api/bitcoin/market-data'],
    refetchInterval: 60000,
  });

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  const btcPrice = marketData?.price ?? 0;
  const priceChange = marketData?.change24h ?? 0;

  return (
    <div className="min-h-screen bg-background">

      {/* ─── HERO ─── */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
        <HeroBackground />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <motion.div initial="initial" animate="animate" variants={staggerContainer} className="space-y-8">

            {btcPrice > 0 && (
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-card/80 border border-muted/20 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <BitcoinIcon className="w-5 h-5" />
                  <span className="font-mono font-bold text-foreground">${formatCurrency(btcPrice).replace('$', '')}</span>
                </div>
                <div className={`flex items-center gap-1 text-sm ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {priceChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingUp className="w-4 h-4 transform rotate-180" />}
                  <span>{priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%</span>
                </div>
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">LIVE</Badge>
              </motion.div>
            )}

            <motion.h1 variants={fadeInUp} className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-[1.1] max-w-4xl mx-auto tracking-tight">
              The Bitcoin Education Platform{' '}
              <span className="text-primary">Built by a Human + AI Team</span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Most Bitcoin sites speculate on price. We teach you how money actually works — 
              through 13 interactive games, real purchasing power data, and a founding story 
              that proves this isn't just another crypto blog.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center gap-3">
              <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                Millennials worried about inflation
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                Retiring Boomers who lived through the system
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                Anyone protecting a family's purchasing power
              </span>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link href="/learn">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-12 text-base">
                  Start Learning Free <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/analytics">
                <Button variant="outline" size="lg" className="font-semibold px-8 h-12 text-base border-muted/30 hover:border-primary/50">
                  See Live Analytics <BarChart3 className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </motion.div>

            <motion.p variants={fadeInUp} className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">47,000+ learners</span> learning through simulation, not speculation.
            </motion.p>
          </motion.div>
        </div>
        <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2" animate={{ y: [0, 8, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
          <ChevronDown className="w-7 h-7 text-muted-foreground/50" />
        </motion.div>
      </section>

      {/* ─── VALUE TRACKER STATS BAR ─── */}
      <section className="bg-card/60 border-y border-muted/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">The Numbers Don't Lie</p>
            <p className="text-sm text-muted-foreground">
              Purchasing power data from{' '}
              <a href="https://tracker.goodbotai.tech" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Value Tracker
              </a>{' '}
              — real historical data
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ValueStat label="Median US Home (1995→)" usd="+223%" gold="-72%" note="Same home, different measuring stick" />
            <ValueStat label="Bread (1970→)" usd="+1,200%" gold="-95%" note="What a dollar buys you" />
            <ValueStat label="Gold vs USD" usd="+1,800%" gold="Baseline" note="Gold held its purchasing power" />
            <ValueStat label="Bitcoin (vs USD)" usd="+∞" gold="+∞" note="From $0.0008 to $100K+" />
          </div>
        </div>
      </section>

      {/* ─── WHY THIS EXISTS ─── */}
      <section className="py-24 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="initial" whileInView="animate" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5">Why This Exists</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Built by Someone Living It</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Tyler isn't a VC or a "crypto influencer." He's an inventory manager in Concord, MA — 
                married, two kids, on the CPA path. He built this because he couldn't find Bitcoin 
                education that actually taught him how money works.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              <motion.div variants={fadeInUp} className="md:col-span-2">
                <Card className="bg-card border-muted/20 p-8 h-full">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-1">Tyler, Founder</h3>
                      <p className="text-sm text-muted-foreground">Inventory Manager · Concord, MA · CPA-path Dad of 2</p>
                    </div>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    <p>
                      "I've watched the financial system from the inside — managing inventory, 
                      but the real inventory that matters is <em>purchasing power</em>. 
                      I wanted to understand why my dollar buys less every year, and every 
                      Bitcoin site just showed me a price chart."
                    </p>
                    <p>
                      "I hired GoodBot — my AI research agent — to find the education I couldn't find. 
                      It built 13 interactive games. It pulled real purchasing power data. 
                      It connected things I'd never seen connected before."
                    </p>
                    <p className="text-foreground font-medium">
                      "This platform is what I was looking for. If you're worried about your 
                      family's future, you're in the right place."
                    </p>
                  </div>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <Card className="bg-card border-muted/20 p-6 h-full flex flex-col">
                  <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6 text-red-400" />
                  </div>
                  <CardTitle className="text-lg mb-3">The Problem We Solved</CardTitle>
                  <ul className="space-y-3 text-sm text-muted-foreground flex-1">
                    <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✕</span> Crypto sites are for traders, not learners</li>
                    <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✕</span> YouTube is clickbait + price speculation</li>
                    <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✕</span> Books are outdated before they publish</li>
                    <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✕</span> No one explains monetary history visually</li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-foreground font-medium">BitcoinHub does all of this</span>
                    </li>
                  </ul>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── BUILT DIFFERENTLY ─── */}
      <section className="py-24 bg-card/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="initial" whileInView="animate" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5">Built Differently</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Human + AI: The Team Behind This</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                No other Bitcoin education platform is built this way. Tyler brings the real-world 
                experience and domain knowledge. GoodBot brings the research depth, data analysis, 
                and tireless building. Together, it's something new.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <motion.div variants={fadeInUp}>
                <Card className="bg-card border-muted/20 p-8 h-full hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-14 h-14 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center">
                      <User className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Tyler</h3>
                      <p className="text-sm text-muted-foreground">The Human · Domain Expert</p>
                    </div>
                  </div>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    {[
                      "Real-world financial experience (CPA-path)",
                      "Family of 4 managing real purchasing power concerns",
                      "Research direction: what matters to real families",
                      "Quality control: is this actually useful?",
                      "Built BrewAsset as another real project"
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <Card className="bg-card border-muted/20 p-8 h-full hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-14 h-14 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center">
                      <Bot className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">GoodBot</h3>
                      <p className="text-sm text-muted-foreground">The AI Agent · Research Engine</p>
                    </div>
                  </div>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    {[
                      "Researches purchasing power data across decades",
                      "Designed all 13 interactive learning games",
                      "Built the Value Tracker data visualization",
                      "Connects monetary history to current events",
                      "Never sleeps — updates data and content continuously"
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            </div>

            <motion.div variants={fadeInUp} className="mt-10 text-center">
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary/5 border border-primary/15">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">This is the future of education: human judgment + AI scale</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURES: GAMES + ANALYTICS ─── */}
      <section className="py-24 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="initial" whileInView="animate" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5">Interactive Learning</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">13 Games That Make Money Make Sense</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Most Bitcoin education tells you facts. We let you simulate consequences — 
                so you build real intuition for how money, inflation, and Bitcoin work.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: Gamepad2, title: "Inflation Simulator", desc: "Print money in a virtual economy and watch purchasing power evaporate in real time.", tag: "Most Popular" },
                { icon: Scale, title: "Gold vs Bitcoin", desc: "Compare gold and Bitcoin's supply curves across 100 years. See why fixed supply changes everything.", tag: "New" },
                { icon: TrendingUp, title: "DCA Backtester", desc: "Dollar-cost average into Bitcoin at any point in history. See how strategy beats timing.", tag: null },
                { icon: Coins, title: "21 Million Race", desc: "Race against the Bitcoin mining schedule. Feel how the supply cap is enforced mathematically.", tag: null },
                { icon: BarChart3, title: "Whale Watcher", desc: "Track large Bitcoin wallet movements and understand what whale activity means for price.", tag: "Analytics" },
                { icon: Heart, title: "Family Finance Planner", desc: "Model your family's purchasing power across 10, 20, 30 years under different scenarios.", tag: "For Families" }
              ].map((game, i) => (
                <motion.div key={i} variants={fadeInUp}>
                  <Card className="bg-card border-muted/20 p-6 h-full hover:shadow-lg hover:border-primary/25 transition-all group cursor-pointer">
                    <CardHeader className="p-0 mb-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                          <game.icon className="w-5 h-5 text-primary" />
                        </div>
                        {game.tag && <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">{game.tag}</Badge>}
                      </div>
                      <CardTitle className="text-base">{game.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <p className="text-sm text-muted-foreground mb-4">{game.desc}</p>
                      <Link href="/learn">
                        <Button variant="ghost" size="sm" className="p-0 h-auto text-primary hover:text-primary/80 text-sm font-medium">
                          Play it free <ChevronRight className="w-4 h-4 ml-0.5" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <motion.div variants={fadeInUp} className="text-center mt-10">
              <Link href="/learn">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  See All 13 Games <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── NEWSLETTER ─── */}
      <section className="py-24 bg-card/40" id="newsletter">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="initial" whileInView="animate" viewport={{ once: true }} variants={staggerContainer}>
            <Card className="bg-gradient-to-br from-primary/[0.08] via-card to-card border-primary/15 p-8 md:p-12">
              <CardHeader className="text-center p-0 mb-8">
                <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="text-2xl md:text-3xl text-foreground">Get the Weekly Purchasing Power Report</CardTitle>
                <CardDescription className="text-base mt-2 text-muted-foreground">
                  Every week: one key data insight, one concept that clicks, one thing 
                  worth thinking about. No hype. No price calls. Just understanding.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {subscribed ? (
                  <div className="text-center py-6">
                    <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">You're in. Welcome.</h3>
                    <p className="text-muted-foreground text-sm">Check your email to confirm your subscription.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="flex-1 h-12 bg-background/60 border-muted/20 focus:border-primary text-base"
                      />
                      <Button type="submit" className="h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8">
                        Subscribe Free <ArrowRight className="ml-2 w-5 h-5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">47,000+ subscribers. Unsubscribe any time. No spam, ever.</p>
                  </form>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="initial" whileInView="animate" viewport={{ once: true }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-8">
              <div className="inline-flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-primary" />
                <span className="text-muted-foreground text-sm">+</span>
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <BitcoinIcon className="w-20 h-20 mx-auto opacity-15" />
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Ready to Understand What Money Actually Is?
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground mb-8 max-w-xl mx-auto">
              You don't need to be a finance expert. You just need to want to protect 
              your family's purchasing power. Start with one game. See what clicks.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/learn">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8">
                  Start With a Free Game <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/analytics">
                <Button variant="outline" size="lg" className="font-semibold px-8">
                  Browse Live Analytics
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-card/80 border-t border-muted/10 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <BitcoinIcon className="w-6 h-6" />
                <span className="font-bold text-foreground text-lg">BitcoinHub</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                The Bitcoin education platform built by a real human + AI team. 
                Learn how money works — not how to trade it.
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="w-3 h-3" />
                <span>Tyler</span>
                <span className="mx-1">+</span>
                <Bot className="w-3 h-3" />
                <span>GoodBot</span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3 text-sm">Learn</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/learn" className="hover:text-primary transition-colors">All 13 Games</Link></li>
                <li><Link href="/learn" className="hover:text-primary transition-colors">Learning Paths</Link></li>
                <li><Link href="/analytics" className="hover:text-primary transition-colors">BTC Analytics</Link></li>
                <li><Link href="/legislation" className="hover:text-primary transition-colors">Policy Tracker</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3 text-sm">GoodBot Ecosystem</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="https://goodbotai.tech" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1">
                    GoodBotAI <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                </li>
                <li>
                  <a href="https://tracker.goodbotai.tech" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1">
                    Value Tracker <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                </li>
                <li>
                  <a href="https://hub.goodbotai.tech" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1">
                    BitcoinHub <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3 text-sm">Newsletter</h4>
              <p className="text-sm text-muted-foreground mb-3">Weekly purchasing power insights. Free.</p>
              <Link href="#newsletter">
                <Button variant="outline" size="sm" className="w-full">
                  <Mail className="w-4 h-4 mr-2" /> Subscribe Free
                </Button>
              </Link>
            </div>
          </div>

          <div className="pt-6 border-t border-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              © 2026 BitcoinHub. Built by Tyler + GoodBot. Educational content only — not financial advice.
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><User className="w-3 h-3" /><span>Human</span></span>
              <span className="mx-1">+</span>
              <span className="flex items-center gap-1"><Bot className="w-3 h-3" /><span>AI</span></span>
              <span className="mx-1">=</span>
              <span className="text-primary font-medium">Something new</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Home;
