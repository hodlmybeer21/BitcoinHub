'use client';

/**
 * CycleNow — the hero "where are we in the Bitcoin cycle" widget.
 *
 * Designed to be the first thing a visitor sees on the homepage (and to
 * be the daily-compounding artifact the auto-post cron ships to
 * @HodlMyBeer21). Three pieces of data, one glance:
 *
 *   1. Day X of the 4-year halving cycle (with progress bar)
 *   2. Current risk band (extreme_fear → extreme_greed) with score
 *   3. BTC price change since the 2024 halving
 *
 * Sources:
 *   /api/risk/indicator?symbol=BTC&days=3650  → score + band
 *   /api/cycle/position  → live BTC price (Yahoo daily close, 5-min cache),
 *                          days since halving 4, % change since halving
 *   Fallback: Coinbase public spot (keyless) if /api/cycle/position fails.
 *   If both fail, the card says the live price is unavailable instead of
 *   showing an old number.
 *
 * NOTE: this used to read /api/cycle/overlay?from=halving&to=top, which is
 * the halving→cycle-TOP leg (ends 2025-10-06 at $124,752.53). That is a
 * historical segment, so the card was frozen at the ATH while labeled LIVE.
 *
 * Per Tyler's review (2026-09-17): this widget is the answer to
 * "where are we in the Bitcoin cycle?" — the one question every Bitcoin
 * holder asks that nobody answers well. Make it shareable, make it
 * beautiful, make it daily.
 */

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, Share2 } from 'lucide-react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const BAND_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  extreme_fear:    { bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/40',     dot: 'bg-red-500' },
  fear:            { bg: 'bg-orange-500/15',  text: 'text-orange-400',  border: 'border-orange-500/40',  dot: 'bg-orange-500' },
  neutral:         { bg: 'bg-slate-500/15',   text: 'text-slate-300',   border: 'border-slate-500/40',   dot: 'bg-slate-400' },
  greed:           { bg: 'bg-yellow-500/15',  text: 'text-yellow-400',  border: 'border-yellow-500/40',  dot: 'bg-yellow-500' },
  extreme_greed:   { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/40', dot: 'bg-emerald-500' },
};

const BAND_LABELS: Record<string, string> = {
  extreme_fear:  'Extreme Fear',
  fear:          'Fear',
  neutral:       'Neutral',
  greed:         'Greed',
  extreme_greed: 'Extreme Greed',
};

// Halving 4 anchor — mirrors HALVING4_DATE / HALVING4_PRICE in lib/cycle/position.ts.
const HALVING4_DATE_MS = Date.parse('2024-04-20T00:00:00Z');
const HALVING4_PRICE = 63817.3;

type LivePrice = {
  price: number;
  changePct: number;
  day: number;
  asOf: string;
  source: 'yahoo' | 'coinbase';
};

function daysSinceHalving(nowMs: number = Date.now()): number {
  return Math.max(0, Math.floor((nowMs - HALVING4_DATE_MS) / 86400000));
}

async function fetchLivePrice(): Promise<LivePrice> {
  // Primary: our own /api/cycle/position (Yahoo daily close, cached 5 min).
  try {
    const r = await fetch('/api/cycle/position');
    if (r.ok) {
      const d = await r.json();
      const price = Number(d?.currentPrice);
      if (Number.isFinite(price) && price > 0) {
        return {
          price,
          changePct: Number(d.priceSinceHalvingPct ?? ((price - HALVING4_PRICE) / HALVING4_PRICE) * 100),
          day: Number(d.daysSinceHalving4 ?? daysSinceHalving()),
          asOf: String(d.asOf ?? new Date().toISOString().slice(0, 10)),
          source: 'yahoo',
        };
      }
    }
  } catch {
    /* fall through to Coinbase */
  }
  // Fallback: Coinbase public spot price (no key, CORS-enabled).
  const r = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
  if (!r.ok) throw new Error(`coinbase spot: ${r.status}`);
  const d = await r.json();
  const price = Number(d?.data?.amount);
  if (!Number.isFinite(price) || price <= 0) throw new Error('coinbase spot: bad payload');
  return {
    price,
    changePct: ((price - HALVING4_PRICE) / HALVING4_PRICE) * 100,
    day: daysSinceHalving(),
    asOf: new Date().toISOString().slice(0, 10),
    source: 'coinbase',
  };
}

const FALLBACK_COLORS = { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/40', dot: 'bg-slate-400' };

export function CycleNow() {
  const { data: risk, isLoading: riskLoading } = useQuery({
    queryKey: ['/api/risk/indicator', 'BTC', 3650],
    queryFn: async () => {
      const r = await fetch('/api/risk/indicator?symbol=BTC&days=3650');
      if (!r.ok) throw new Error(`risk/indicator: ${r.status}`);
      return r.json();
    },
    refetchInterval: 5 * 60 * 1000, // 5 min
    staleTime: 60 * 1000,
  });

  const { data: live, isError: liveError } = useQuery({
    queryKey: ['/api/cycle/position', 'live-price'],
    queryFn: fetchLivePrice,
    refetchInterval: 5 * 60 * 1000, // 5 min
    staleTime: 60 * 1000,
    retry: 1,
  });

  if (riskLoading || !risk) {
    return (
      <Card className="border-[#F7931A]/30 bg-gradient-to-br from-[#F7931A]/5 to-transparent">
        <CardContent className="pt-6 pb-6">
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    );
  }

  const score = Number(risk.risk ?? 0);
  // /api/risk/indicator returns band as { band: 'neutral', label: 'Neutral', color, min, max }.
  // Unwrap to the enum string for label/color lookup; fall back to 'neutral' defensively.
  const band: string =
    typeof risk.band === 'string'
      ? risk.band
      : (risk.band?.band ?? 'neutral');
  const day: number = live?.day ?? daysSinceHalving();
  const cycleProgress = Math.min(100, Math.max(0, Math.round((day / 1460) * 100)));
  const hasPrice = live != null && Number.isFinite(live.price);
  const priceChange: number = hasPrice ? live!.changePct : 0;
  const endPrice: number = hasPrice ? live!.price : 0;

  const colors = BAND_COLORS[band] || FALLBACK_COLORS;
  const bandLabel = BAND_LABELS[band] || band;

  // Share intent — pre-fills an X post with the cycle status + link
  const shareText = encodeURIComponent(
    `Day ${day} of the Bitcoin cycle · Risk band: ${bandLabel}` +
      (hasPrice ? ` · BTC since halving: ${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(1)}%` : '') +
      `\n\nbitcoinhub.goodbotai.tech/risk`
  );
  const tweetIntent = `https://x.com/intent/tweet?text=${shareText}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Card className={`${colors.border} border-2 bg-gradient-to-br from-black/50 via-black/30 to-transparent overflow-hidden relative`}>
        <CardContent className="pt-6 pb-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-[#F7931A]" />
                <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  Cycle Now
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
                Day {day} of the Bitcoin cycle
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Cycle 4 · started at the April 2024 halving
              </p>
            </div>
          </div>

          {/* Progress bar — April 2024 → ~April 2028 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>Apr 2024</span>
              <span className="text-[#F7931A] font-semibold">{cycleProgress}% through</span>
              <span>~Apr 2028</span>
            </div>
            <div className="h-2 bg-muted/30 rounded-full overflow-hidden relative">
              <motion.div
                className="h-full bg-gradient-to-r from-[#F7931A] via-yellow-400 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${cycleProgress}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
              {/* mid-cycle tick */}
              <div
                className="absolute top-[-2px] left-1/2 w-px h-[12px] bg-muted-foreground/50"
                title="Mid-cycle"
              />
            </div>
          </div>

          {/* Risk band + price change */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`${colors.bg} ${colors.border} border rounded-lg p-3 sm:col-span-1`}>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Risk band
              </div>
              <div className={`text-xl font-bold ${colors.text} flex items-center gap-2`}>
                <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                {bandLabel}
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-mono">
                score {score.toFixed(2)} / 1.00
              </div>
            </div>
            <div className="bg-muted/20 border border-border/40 rounded-lg p-3 sm:col-span-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                BTC since halving
              </div>
              {hasPrice ? (
                <div className={`text-xl font-bold font-mono ${priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(1)}%
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ${endPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ) : (
                <div className="text-sm font-semibold text-amber-400">
                  {liveError ? 'Live price unavailable right now' : 'Loading live price…'}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {day} days into the 1,460-day cycle
                {hasPrice && (
                  <> · vs ${HALVING4_PRICE.toLocaleString()} at halving · {live!.source === 'yahoo' ? 'Yahoo daily close' : 'Coinbase spot'} as of {live!.asOf}</>
                )}
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            <Button asChild size="sm" className="bg-[#F7931A] hover:bg-[#E67500] text-black font-semibold">
              <Link href="/risk">
                Full cycle analysis <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-border/60">
              <a href={tweetIntent} target="_blank" rel="noopener noreferrer">
                <Share2 className="h-3 w-3 mr-1" /> Share to X
              </a>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/cycle/compare">
                Compare cycles →
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default CycleNow;
