// BitcoinHub Workbench — Templates Gallery
// /workbench/templates — browse + one-click-apply built-in indicator templates

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, ArrowRight, Hammer, Filter,
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  formula: string;
  range: { start: string; end: string };
}

// Derive a coarse category from template content (server doesn't ship one).
function categoryFor(t: Template): string {
  const s = `${t.name} ${t.description} ${t.formula}`.toLowerCase();
  if (s.includes('fear') || s.includes('greed')) return 'Sentiment';
  if (s.includes('btc') || s.includes('sma') || s.includes('drawdown') || s.includes('cross')) return 'Price';
  if (s.includes('funding')) return 'Funding';
  if (s.includes('dxy') || s.includes('vix')) return 'Macro';
  return 'Other';
}

const CATEGORY_COLORS: Record<string, string> = {
  Sentiment: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  Price:     'bg-orange-500/15 text-orange-300 border-orange-500/30',
  Funding:   'bg-blue-500/15 text-blue-300 border-blue-500/30',
  Macro:     'bg-red-500/15 text-red-300 border-red-500/30',
  Other:     'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

export default function WorkbenchTemplates() {
  const [, navigate] = useLocation();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const templatesQuery = useQuery<{ templates: Template[] }>({
    queryKey: ['/api/workbench/templates'],
    queryFn: () => fetch('/api/workbench/templates').then(r => r.json()),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const templates = templatesQuery.data?.templates ?? [];

  const categorized = useMemo(() => {
    return templates.map(t => ({ ...t, category: categoryFor(t) }));
  }, [templates]);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of categorized) counts[t.category] = (counts[t.category] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [categorized]);

  const filtered = useMemo(() => {
    if (!categoryFilter) return categorized;
    return categorized.filter(t => t.category === categoryFilter);
  }, [categorized, categoryFilter]);

  function useTemplate(t: Template) {
    navigate(`/workbench?formula=${encodeURIComponent(t.formula)}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-6 w-6 text-orange-500" />
              <h1 className="text-3xl font-bold">Workbench Templates</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl">
              Ready-made indicator formulas. Click <span className="text-foreground font-semibold">Use this template</span> to
              load it into the Workbench builder pre-filled and ready to run or modify.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/workbench">
              <Hammer className="h-4 w-4 mr-2" />
              Open Builder
            </Link>
          </Button>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground mr-1">Filter:</span>
          <Button
            variant={categoryFilter === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter(null)}
          >
            All ({templates.length})
          </Button>
          {categories.map(([cat, count]) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter(cat)}
            >
              {cat} ({count})
            </Button>
          ))}
        </div>

        {/* Template grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templatesQuery.isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full" />
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground text-sm py-12">
              No templates in this category.
            </div>
          ) : (
            filtered.map(t => (
              <Card key={t.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{t.name}</CardTitle>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] ${CATEGORY_COLORS[t.category] || CATEGORY_COLORS.Other}`}
                    >
                      {t.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col space-y-3">
                  <CardDescription className="text-xs leading-relaxed">
                    {t.description}
                  </CardDescription>
                  <div className="bg-muted/30 border border-border/40 rounded p-2 font-mono text-[11px] break-all text-foreground/90">
                    {t.formula}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Range: {t.range.start} → {t.range.end}
                  </div>
                  <Button onClick={() => useTemplate(t)} className="w-full mt-auto">
                    Use this template
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Footer note */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border/30">
          Want to share your own indicator? Save it in the Workbench, then use the Share button on the saved card to copy a
          public-link URL.
        </div>
      </div>
    </div>
  );
}