'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Share2, RefreshCw, TrendingDown, Zap, ArrowRight, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Constants ──────────────────────────────────────────────────────────────
const ANNUAL_INFLATION = 0.03;          // 3% average US inflation
const BTC_MULTIPLIER   = 400;           // conservative: $1 in 2011 ≈ $400 today
const GOLD_MULTIPLIER  = 8;             // $1 in 1970 ≈ $8 today
const BASE_YEAR        = 2011;          // Bitcoin launch year
const CURRENT_YEAR     = 2026;

// ── Helpers ─────────────────────────────────────────────────────────────────
function yearsBetween(start: number, end: number): number {
  return Math.max(0, end - start);
}

function formatCurrencyShort(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function calcInflationAdjusted(amount: number, years: number): number {
  return amount / Math.pow(1 + ANNUAL_INFLATION, years);
}

function calcBTCValue(amount: number, birthYear: number): number {
  const years = yearsBetween(BASE_YEAR, CURRENT_YEAR);
  // If born before 2011, they could have bought at $1 in 2011
  // If born after 2011, use the BTC price appreciation from their birth year to now
  if (birthYear <= BASE_YEAR) {
    // Use full multiplier from 2011
    return amount * BTC_MULTIPLIER;
  } else {
    // Approximate: BTC grew ~100x in first 5 years (2011-2016), then ~5x per subsequent 5yr period
    // This is a rough approximation for younger users
    const yearsAfter2011 = yearsBetween(BASE_YEAR, birthYear);
    // Simple compound: assume BTC grew 2x every 2 years from 2011 baseline
    const btcYears = yearsBetween(BASE_YEAR, CURRENT_YEAR);
    const birthYearBtcMultiplier = Math.pow(1 + 0.35, yearsAfter2011); // ~35% annual avg growth
    const currentBtcMultiplier = BTC_MULTIPLIER / birthYearBtcMultiplier;
    return amount * Math.max(currentBtcMultiplier, 1);
  }
}

// ── Shareable URL ────────────────────────────────────────────────────────────
function buildShareUrl(birthYear: number, savings: number): string {
  const base = 'https://hub.goodbotai.tech/calculator';
  return `${base}?birthyear=${birthYear}&savings=${savings}`;
}

// ── Main Component ──────────────────────────────────────────────────────────
interface InflationCalculatorProps {
  initialBirthYear?: number;
  initialSavings?: number;
  embedMode?: boolean; // hides the "add to homepage" section, used in /calculator route
}

export function InflationCalculator({ initialBirthYear, initialSavings, embedMode = false }: InflationCalculatorProps) {
  const currentYear = new Date().getFullYear();

  const [birthYear, setBirthYear] = useState<number | ''>(initialBirthYear ?? 1985);
  const [savings, setSavings]     = useState<number | ''>(initialSavings ?? 10000);
  const [copied, setCopied]       = useState(false);

  // Read URL params on mount (for shared links)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const by = params.get('birthyear');
    const sv = params.get('savings');
    if (by) setBirthYear(parseInt(by));
    if (sv) setSavings(parseInt(sv));
  }, []);

  const by = typeof birthYear === 'number' ? birthYear : currentYear - 30;
  const sv = typeof savings === 'number'   ? savings     : 0;

  const generation = by <= 1966 ? 'Boomer' : by <= 1980 ? 'Gen X' : by <= 1996 ? 'Millennial' : 'Gen Z';

  // How many years ago were they 20?
  const age20Year = by + 20;
  const yearsSince20 = yearsBetween(age20Year, CURRENT_YEAR);
  const yearsAsSavings = by <= CURRENT_YEAR ? yearsBetween(by, CURRENT_YEAR) : 0;

  const inflationAdjusted = calcInflationAdjusted(sv, yearsSince20);
  const btcValue          = calcBTCValue(sv, by);
  const stolenByInflation  = sv - inflationAdjusted;
  const btcGain           = btcValue - sv;
  const relativeLoss      = inflationAdjusted > 0 ? ((sv - inflationAdjusted) / sv) * 100 : 0;

  const shareUrl = buildShareUrl(by, sv);

  const handleShare = async () => {
    const text = `💸 Inflation stole ${formatCurrencyShort(stolenByInflation)} from my generation's savings. Here's what $${sv.toLocaleString()} in ${by} is really worth today — and what it could've been in #Bitcoin.`;

    if (navigator.share) {
      await navigator.share({ title: 'Inflation Calculator', text, url: shareUrl });
    } else {
      await navigator.clipboard.writeText(`${text}\n\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleReset = () => {
    setBirthYear(currentYear - 30);
    setSavings(10000);
  };

  // ── Viral headline copy ───────────────────────────────────────────────────
  const headline = useMemo(() => {
    if (generation === 'Millennial') return 'Your generation lost the most.';
    if (generation === 'Boomer')      return 'You remember when $100 was real money.';
    if (generation === 'Gen X')       return 'Caught between eras, crushed by both.';
    return 'The math doesn\'t lie.';
  }, [generation]);

  return (
    <section className={cn('w-full', !embedMode && 'py-20 px-4')}>
      <div className={cn('mx-auto', embedMode ? 'max-w-5xl' : 'max-w-6xl')}>
        {/* ── Section Header ── */}
        {!embedMode && (
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-amber-500/40 text-amber-400 bg-amber-500/10">
              <Zap className="w-3 h-3 mr-1" /> Free Tool
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              See how much <span className="text-amber-500">inflation stole</span> from your generation
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Enter your birth year and any savings you had in your 20s. We'll show you the silent thief.
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* ── INPUT CARD ── */}
          <Card className="bg-card/80 border-amber-500/20 shadow-xl shadow-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-400" />
                {!embedMode ? 'Your Info' : 'Re-calculate'}
              </CardTitle>
              <CardDescription>
                {generation} generation • Born {by}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Birth year */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Birth Year</label>
                <Input
                  type="number"
                  min={1920}
                  max={2010}
                  value={birthYear}
                  onChange={e => setBirthYear(e.target.value ? parseInt(e.target.value) : '')}
                  className="bg-background border-amber-500/30 focus-visible:ring-amber-500 text-lg"
                  placeholder="1985"
                />
                <p className="text-xs text-muted-foreground">
                  You turned 20 in {age20Year} — that's when most people start saving.
                </p>
              </div>

              {/* Savings */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Savings in your 20s{' '}
                  <span className="text-muted-foreground font-normal">(in {age20Year} dollars)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                  <Input
                    type="number"
                    min={0}
                    value={savings}
                    onChange={e => setSavings(e.target.value ? parseInt(e.target.value) : '')}
                    className="bg-background border-amber-500/30 focus-visible:ring-amber-500 text-lg pl-8"
                    placeholder="10000"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleReset} variant="outline" className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" /> Reset
                </Button>
                <Button onClick={handleShare} className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                  <Share2 className="w-4 h-4 mr-2" /> {copied ? 'Copied!' : 'Share Results'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── RESULTS CARD ── */}
          <Card className="bg-gradient-to-br from-card to-amber-950/20 border-amber-500/20 shadow-xl shadow-amber-500/10">
            <CardHeader>
              <CardTitle className="text-amber-500">{headline}</CardTitle>
              <CardDescription>
                What ${sv.toLocaleString()} in {age20Year} is worth in {CURRENT_YEAR} purchasing power
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* The shock number */}
              <div className="text-center p-6 bg-red-950/40 rounded-xl border border-red-500/20">
                <div className="text-sm text-red-400 font-medium mb-1">What you actually lost</div>
                <div className="text-5xl md:text-6xl font-bold text-red-400">
                  {inflationAdjusted < sv ? '-' : ''}{formatCurrencyShort(stolenByInflation)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Your ${sv.toLocaleString()} is only worth {formatCurrencyShort(inflationAdjusted)} today
                </div>
                <div className="mt-2 inline-flex items-center gap-1 text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">
                  <TrendingDown className="w-3 h-3" /> {relativeLoss.toFixed(0)}% purchasing power gone
                </div>
              </div>

              {/* What if Bitcoin? */}
              <div className="text-center p-6 bg-green-950/40 rounded-xl border border-green-500/20">
                <div className="text-sm text-green-400 font-medium mb-1">What if you'd held it in Bitcoin?</div>
                <div className="text-5xl md:text-6xl font-bold text-green-400">
                  +{formatCurrencyShort(btcGain)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Your {sv > 0 ? formatCurrencyShort(btcValue) : '$0'} would be worth{' '}
                  {sv > 0 ? formatCurrencyShort(btcValue) : '$0'} today
                </div>
                <div className="mt-2 inline-flex items-center gap-1 text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                  <Zap className="w-3 h-3" /> Bitcoin outran inflation by {btcGain > 0 ? 'a lot' : '—'}
                </div>
              </div>

              {/* Context stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xl font-bold text-amber-500">3%</div>
                  <div className="text-xs text-muted-foreground">Avg inflation/yr</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xl font-bold text-amber-500">{yearsSince20}yr</div>
                  <div className="text-xs text-muted-foreground">Since age 20</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xl font-bold text-amber-500">400×</div>
                  <div className="text-xs text-muted-foreground">BTC vs 2011 $</div>
                </div>
              </div>

              {/* Share CTA */}
              <Button
                onClick={handleShare}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold text-lg h-12"
              >
                {copied ? <><Check className="w-5 h-5 mr-2" /> Copied!</> : <><Share2 className="w-5 h-5 mr-2" /> Share Your Results</>}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              {/* Attribution */}
              <p className="text-center text-xs text-muted-foreground">
                Made by Human + AI team —{' '}
                <a href="https://hub.goodbotai.tech" className="text-amber-500 hover:underline">
                  BitcoinHub
                </a>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── VIRAL CONTEXT BAR ── */}
        {!embedMode && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Median Home 1995', from: '$133K', to: '$433K+', color: 'text-red-400' },
              { label: 'Gold since 1970', from: '$1', to: '$8', color: 'text-amber-400' },
              { label: 'Bitcoin since 2011', from: '$1', to: '$400', color: 'text-green-400' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between px-4 py-3 bg-card/40 rounded-lg border border-muted/20">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.from}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span className={cn('text-sm font-bold', item.color)}>{item.to}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
