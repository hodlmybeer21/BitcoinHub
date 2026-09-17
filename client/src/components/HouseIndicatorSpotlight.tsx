'use client';

/**
 * HouseIndicatorSpotlight — "Start from a House indicator" picker shown
 * at the top of /workbench. Solves the chicken-and-egg problem: new
 * users land on an empty formula editor, this gives them 20 working
 * indicators built by BitcoinHub to fork in one click.
 *
 * Per Tyler's 2026-09-17 directive ("the chicken and egg thing here").
 *
 * Detection: filters /api/workbench/backtests items where
 * authorUuidPrefix === 'bitcoinh' (first 8 chars of 'bitcoinhub-house',
 * the userId used by scripts/workbench-seed-house.js).
 *
 * Interaction: clicking a card invokes the parent's onLoad callback
 * (which should set the formula in the Workbench state — the user can
 * then edit + backtest immediately). Formula is parsed from the
 * gallery item's `excerpt` field (a JSON string with {formula, mode, range}).
 */

import { useQuery } from '@tanstack/react-query';
import { Sparkles, Loader2, FlaskConical } from 'lucide-react';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { HouseBadge, isHouseItem } from '@/components/HouseBadge';

interface GalleryItem {
  id: number;
  authorUuidPrefix: string;
  dataKey: string;
  title: string;
  description: string;
  viewCount: number;
  forkCount: number;
  publishedAt: string;
  excerpt: string | null;
}

interface HouseIndicatorSpotlightProps {
  /**
   * Called when the user clicks a card. Receives the parsed formula
   * string + the indicator title. Parent should setFormula(formula)
   * and optionally scroll to the formula editor.
   */
  onLoad: (formula: string, title: string) => void;
  /** Max cards to show (defaults to 12; the gallery has 20 total). */
  limit?: number;
  /** Optional className for the wrapping Card. */
  className?: string;
}

export function HouseIndicatorSpotlight({ onLoad, limit = 12, className }: HouseIndicatorSpotlightProps) {
  const { data, isLoading } = useQuery<{ items: GalleryItem[] }>({
    queryKey: ['/api/workbench/backtests', 'house-spotlight'],
    queryFn: async () => {
      const r = await fetch('/api/workbench/backtests?limit=50');
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <Card className={`border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent ${className || ''}`}>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading house indicators…
          </div>
        </CardContent>
      </Card>
    );
  }

  const allItems = data?.items || [];
  const houseItems = allItems.filter(it => isHouseItem(it.authorUuidPrefix)).slice(0, limit);

  if (houseItems.length === 0) {
    return null;
  }

  // The gallery's `excerpt` is a JSON string with `{formula, mode, range, ...}`.
  const parseFormula = (excerpt: string | null): string => {
    if (!excerpt) return '';
    try {
      const parsed = JSON.parse(excerpt);
      return typeof parsed?.formula === 'string' ? parsed.formula : '';
    } catch {
      return '';
    }
  };

  return (
    <Card className={`border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent ${className || ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles className="h-4 w-4 text-orange-400" />
          <CardTitle className="text-base">Start from a House indicator</CardTitle>
          <HouseBadge size="xs" className="ml-1" />
          <span className="text-[10px] text-muted-foreground ml-auto">
            {houseItems.length} of 20 shown ·{' '}
            <Link
              href="/workbench/backtests"
              className="text-orange-400 hover:underline"
              data-testid="house-spotlight-browse-all"
            >
              browse all →
            </Link>
          </span>
        </div>
        <CardDescription>
          Curated BTC indicators built by BitcoinHub. Click any card to load it into your Workbench — the formula pre-fills, you can edit or backtest immediately.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {houseItems.map(item => {
            const formula = parseFormula(item.excerpt);
            const canLoad = formula.length > 0;
            return (
              <button
                key={item.id}
                onClick={() => canLoad && onLoad(formula, item.title)}
                disabled={!canLoad}
                className="text-left p-2.5 rounded-md border border-border/40 bg-muted/20 hover:border-orange-500/50 hover:bg-orange-500/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                title={canLoad ? `Load "${item.title}" into your Workbench` : 'Formula not available'}
                data-testid={`house-spotlight-card-${item.id}`}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FlaskConical className="h-3 w-3 text-orange-400 flex-shrink-0" />
                  <span className="text-xs font-semibold truncate flex-1" title={item.title}>
                    {item.title}
                  </span>
                </div>
                {canLoad && (
                  <code className="block text-[10px] text-muted-foreground font-mono break-all leading-tight line-clamp-2 mb-1.5">
                    {formula}
                  </code>
                )}
                <div className="flex items-center gap-3 text-[9px] text-muted-foreground/70">
                  <span>👁 {item.viewCount}</span>
                  <span>🍴 {item.forkCount}</span>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default HouseIndicatorSpotlight;
