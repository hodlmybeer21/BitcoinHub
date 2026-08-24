// BitcoinHub — /legislation page
// Live bill data from api.congress.gov, merged with editorial commentary.
// Status pipeline + recent actions timeline + filters + freshness indicator.

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, Calendar, AlertCircle, BookOpen } from "lucide-react";
import type { BillStage, LegislationCategory, LegislationPriority } from "@/lib/legislation-data";
import FreshnessIndicator from "@/components/legislation/FreshnessIndicator";
import FilterBar, { type LegislationFilters } from "@/components/legislation/FilterBar";
import BillCard from "@/components/legislation/BillCard";
import RecentActionsTimeline from "@/components/legislation/RecentActionsTimeline";
import ErrorBoundary from "@/components/ErrorBoundary";

interface BillData {
  slug: string;
  billName: string;
  billSlug: string;
  billType: string;
  billNumber: string;
  congress: string;
  category: LegislationCategory;
  priority: LegislationPriority;
  whyItMatters: string;
  whatsNext: string;
  passageChance: number;
  currentStatus: string;
  lastActionDate: string;
  stage: BillStage;
  sponsor: string;
  originChamber: string;
  updateDate: string;
  actions: Array<{ date: string; text: string }>;
  sponsorNote?: string;
}

interface LegislationData {
  bills: BillData[];
  lastUpdated: string;
  summary: string;
  nextMajorEvent: string;
  source: 'congress.gov' | 'partial' | 'fallback';
  fetchedAt: string;
}

const Legislation = () => {
  const [filters, setFilters] = useState<LegislationFilters>({
    category: new Set(),
    priority: new Set(),
    stage: new Set(),
  });

  const { data, isLoading, error } = useQuery<LegislationData>({
    queryKey: ['/api/legislation'],
    refetchInterval: 30 * 60 * 1000, // 30 min — server caches the same window
    staleTime: 5 * 60 * 1000,
  });

  // Apply filters client-side
  const filteredBills = useMemo(() => {
    if (!data?.bills) return [];
    return data.bills.filter(b => {
      if (filters.category.size > 0 && !filters.category.has(b.category)) return false;
      if (filters.priority.size > 0 && !filters.priority.has(b.priority)) return false;
      if (filters.stage.size > 0 && !filters.stage.has(b.stage)) return false;
      return true;
    });
  }, [data, filters]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-muted-foreground">Loading legislation data…</h2>
            <p className="text-muted-foreground mt-2 text-sm">Fetching live bill status from api.congress.gov</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center p-6">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Failed to load legislation data</h2>
              <p className="text-muted-foreground text-sm">Try refreshing the page in a moment.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isFallback = data.source === 'fallback';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Scale className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">US Crypto Legislation</h1>
              <p className="text-muted-foreground">
                Live bill status from congress.gov, with editorial framing for what it means for Bitcoin.
              </p>
            </div>
          </div>

          <div className="bg-card border border-muted/20 rounded-lg p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">Summary</h3>
                <p className="text-sm text-foreground leading-relaxed">{data.summary}</p>
              </div>
              <div>
                <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">Next major event</h3>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground">{data.nextMajorEvent}</span>
                </div>
              </div>
            </div>
            <FreshnessIndicator fetchedAt={data.fetchedAt} source={data.source} />
          </div>
        </div>

        {/* Filters */}
        <FilterBar filters={filters} onChange={setFilters} />

        {/* Bill cards — wrapped in ErrorBoundary so a single bad bill can't take down the whole page */}
        <ErrorBoundary label="Legislation bill cards">
          <div className="grid lg:grid-cols-2 gap-5 mb-6">
            {filteredBills.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No bills match the current filters. Try resetting them.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredBills.map(bill => (
                <BillCard key={bill.slug} bill={bill} />
              ))
            )}
          </div>
        </ErrorBoundary>

        {/* Recent actions timeline */}
        {!isFallback && data.bills.some(b => b.actions.length > 0) && (
          <div className="mb-6">
            <RecentActionsTimeline bills={data.bills} />
          </div>
        )}

        {/* Footer — methodology + source attribution */}
        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-yellow-500" />
              Methodology &amp; sources
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
            <p>
              <strong className="text-foreground/90">Live data</strong>: Bill metadata, latest action, and the action timeline come from
              {' '}
              <a href="https://api.congress.gov" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                api.congress.gov
              </a>
              {' '}
              (free, no API key required beyond the signup). Pipeline stage is derived heuristically from
              the latest action text — it's a best-effort visualization, not an authoritative status.
            </p>
            <p>
              <strong className="text-foreground/90">Editorial overlay</strong>: The "Why this matters for BTC" notes are
              Tyler's (BitcoinHub founder) read, updated periodically. The passage-chance estimates are Tyler's best
              guesses based on co-sponsors, committee votes, and the political cycle — not predictions.
            </p>
            <p>
              <strong className="text-foreground/90">Caveats</strong>: congress.gov's action history only goes back so far;
              very recent bills may have minimal history. If a bill becomes law (signed), it stops being the most
              actionable signal — we keep it visible but mark it as signed.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Legislation;