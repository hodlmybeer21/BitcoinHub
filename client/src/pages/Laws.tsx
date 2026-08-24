// BitcoinHub — /laws "Bitcoin Through the Laws" landing page
// Composes: hero → law-card grid → Metcalfe section → Bass section → Lindy section.
// All chart sections are wrapped in their own ErrorBoundary for Recharts safety.

import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Sparkles, Network, Activity } from "lucide-react";
import LawCard from "@/components/laws/LawCard";
import MetcalfeSection from "@/components/laws/MetcalfeSection";
import BassSection from "@/components/laws/BassSection";
import LindySection from "@/components/laws/LindySection";
import ReedSection from "@/components/laws/ReedSection";
import PowerLawSection from "@/components/laws/PowerLawSection";
import S2FSection from "@/components/laws/S2FSection";
import NakamotoSection from "@/components/laws/NakamotoSection";
import PerezSection from "@/components/laws/PerezSection";
import ErrorBoundary from "@/components/ErrorBoundary";
import { LAWS } from "@/lib/laws-data";

const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } }
};

export default function Laws() {
  return (
    <>
      <Helmet>
        <title>Bitcoin Through the Laws — BitcoinHub</title>
        <meta
          name="description"
          content="Network effects, adoption curves, and the Lindy Effect applied to Bitcoin. Live charts comparing BTC's growth to the internet's — same laws, same shapes."
        />
        <meta property="og:title" content="Bitcoin Through the Laws — BitcoinHub" />
        <meta
          property="og:description"
          content="Network effects, adoption curves, and the Lindy Effect applied to Bitcoin — with live on-chain charts."
        />
      </Helmet>

      {/* ─── HERO ─── */}
      <section className="relative py-20 bg-background overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(247,147,26,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(247,147,26,0.04)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5">
                <BookOpen className="w-3 h-3 mr-1.5 inline-block" />
                Bitcoin Through the Laws
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-4"
            >
              Networks, adoption, and time itself — <br className="hidden sm:block" />
              <span className="text-primary">why Bitcoin keeps winning.</span>
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed"
            >
              People compare Bitcoin's growth to the internet's. They cite Metcalfe, Bass, Lindy,
              Reed, Power Law, Stock-to-Flow. We took them literally. Here are the laws, the math,
              and the live charts — with the data to back every claim.
            </motion.p>
          </motion.div>

          {/* Quick stats strip */}
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-12 max-w-3xl mx-auto"
          >
            <motion.div variants={fadeInUp}>
              <Card className="bg-card/60 border-muted/20 text-center">
                <CardContent className="pt-4 pb-4">
                  <Network className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Laws charted</div>
                  <div className="text-2xl font-bold font-mono">8</div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Card className="bg-card/60 border-muted/20 text-center">
                <CardContent className="pt-4 pb-4">
                  <Activity className="w-5 h-5 text-cyan-500 mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Live BTC data</div>
                  <div className="text-2xl font-bold font-mono">3 feeds</div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Card className="bg-card/60 border-muted/20 text-center">
                <CardContent className="pt-4 pb-4">
                  <Sparkles className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Reference datasets</div>
                  <div className="text-2xl font-mono">World Bank<br/>ITU · 99bitcoins</div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Card className="bg-card/60 border-muted/20 text-center">
                <CardContent className="pt-4 pb-4">
                  <BookOpen className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Cadence</div>
                  <div className="text-2xl font-mono">hourly</div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── LAW CARDS GRID ─── */}
      <section className="py-16 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Eight laws. One story.
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each law explains a different angle on Bitcoin's growth — and each has a chart with
              live on-chain data below. The first three are the classics; the second three are
              where it gets spicy.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {LAWS.map(law => (
              <LawCard key={law.id} law={law} />
            ))}
          </div>
        </div>
      </section>

      <Separator className="bg-muted/10" />

      {/* ─── METCALFE ─── */}
      <ErrorBoundary label="Metcalfe section">
        <MetcalfeSection />
      </ErrorBoundary>

      {/* ─── BASS DIFFUSION ─── */}
      <ErrorBoundary label="Bass diffusion section">
        <BassSection />
      </ErrorBoundary>

      {/* ─── LINDY ─── */}
      <ErrorBoundary label="Lindy section">
        <LindySection />
      </ErrorBoundary>

      {/* ─── REED'S LAW ─── */}
      <ErrorBoundary label="Reed's Law section">
        <ReedSection />
      </ErrorBoundary>

      {/* ─── POWER LAW ─── */}
      <ErrorBoundary label="Power Law section">
        <PowerLawSection />
      </ErrorBoundary>

      {/* ─── STOCK-TO-FLOW ─── */}
      <ErrorBoundary label="Stock-to-Flow section">
        <S2FSection />
      </ErrorBoundary>

      {/* ─── NAKAMOTO'S LAW ─── */}
      <ErrorBoundary label="Nakamoto's Law section">
        <NakamotoSection />
      </ErrorBoundary>

      {/* ─── PEREZ REVOLUTIONS ─── */}
      <ErrorBoundary label="Perez revolutions section">
        <PerezSection />
      </ErrorBoundary>

      {/* ─── DATA SOURCES ─── */}
      <section className="py-12 border-t border-muted/10 bg-background/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-4">Data sources &amp; methodology</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-muted-foreground">
            <div>
              <div className="text-foreground font-medium mb-1">BTC price &amp; market cap</div>
              <a
                href="https://www.coingecko.com/api/documentation"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                CoinGecko market_chart
              </a>
            </div>
            <div>
              <div className="text-foreground font-medium mb-1">BTC active addresses</div>
              <a
                href="https://www.blockchain.com/charts/n-unique-addresses"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Blockchain.com n-unique-addresses
              </a>
            </div>
            <div>
              <div className="text-foreground font-medium mb-1">Internet users</div>
              <a
                href="https://data.worldbank.org/indicator/IT.NET.USER.ZS"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                World Bank / ITU
              </a>
            </div>
            <div>
              <div className="text-foreground font-medium mb-1">Bitcoin obituaries</div>
              <a
                href="https://99bitcoins.com/bitcoin-obituaries/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                99bitcoins.com
              </a>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground/70 italic mt-6 leading-relaxed">
            Charts are computed from public time-series and rendered with Recharts. The Lindy
            obituary dataset is a curated subset of notable events — see 99bitcoins for the live
            counter. Charts refresh every 1 hour (Metcalfe), 6 hours (Bass), 15 minutes (Lindy price).
          </p>
        </div>
      </section>
    </>
  );
}