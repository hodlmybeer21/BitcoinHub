// BitcoinHub Workbench — Community Gallery
// /workbench/gallery — public indicator browser (Phase 5: gallery slice)

'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, Hammer, Eye, GitFork, BookOpen, Sparkles,
} from 'lucide-react';
import { getUserId } from '@/lib/persistence/client';

interface PublicIndicator {
  id: number;
  authorUuidPrefix: string;
  dataKey: string;
  title: string;
  description: string;
  excerpt: string;
  viewCount: number;
  forkCount: number;
  publishedAt: string;
}

interface GalleryResponse {
  items: PublicIndicator[];
  limit: number;
  offset: number;
  count: number;
}

export default function WorkbenchGallery() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [toast, setToast] = useState<string | null>(null);
  const [forkingId, setForkingId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery<GalleryResponse>({
    queryKey: ['/api/persistence/gallery'],
    queryFn: () => fetch('/api/persistence/gallery').then(r => r.json()),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Source author UUIDs are needed for fork — but the gallery endpoint only
  // returns the 8-char prefix (privacy). The full UUID is in the source row;
  // for the fork endpoint we need the full UUID. We don't have it from the
  // list endpoint, so the client doesn't know the sourceOwnerUserId.
  //
  // To unblock forking without a "get full source" round-trip, the fork
  // endpoint accepts just the source's numeric `id` (its anonymous_data.id
  // primary key) — which is the canonical way to address a specific row.
  // See api/index.ts handlePersistenceGallery POST action='fork' branch.

  async function forkIndicator(item: PublicIndicator) {
    if (forkingId !== null) return; // prevent double-click
    setForkingId(item.id);
    const userId = getUserId();
    try {
      const res = await fetch('/api/persistence/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          dataKey: item.dataKey, // not used in fork branch but kept for shape
          action: 'fork',
          sourceId: item.id, // primary key of the source row
        }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setToast(`Forked "${json.sourceTitle || item.title}" to your Workbench.`);
        // Refresh the gallery so the fork count increments in the UI.
        queryClient.invalidateQueries({ queryKey: ['/api/persistence/gallery'] });
        // After a brief delay, offer to navigate to the Workbench so the
        // user sees their new forked indicator. The button is enabled if they
        // want to navigate; otherwise they can dismiss the toast.
        setTimeout(() => navigate('/workbench'), 1800);
      } else {
        setToast(`Fork failed: ${json.error || res.statusText}`);
      }
    } catch (e) {
      setToast(`Fork failed: ${String(e)}`);
    } finally {
      setForkingId(null);
      setTimeout(() => setToast(null), 4000);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-6 w-6 text-orange-500" />
              <h1 className="text-3xl font-bold">Community Gallery</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl">
              Public indicators shared by the BitcoinHub community. Fork any indicator
              to your own library and customize it.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/workbench">
              <Hammer className="h-4 w-4 mr-2" />
              Open Builder
            </Link>
          </Button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full" />
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center text-red-500">
              Failed to load gallery. Please try again.
            </CardContent>
          </Card>
        ) : !data?.items?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground space-y-3">
              <Sparkles className="h-8 w-8 mx-auto" />
              <div>
                <p className="font-semibold text-foreground">No public indicators yet</p>
                <p className="text-sm mt-1">Be the first to share. Save an indicator in the Workbench, then click "Publish to Gallery".</p>
              </div>
              <Button asChild>
                <Link href="/workbench">Build Your First Indicator</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.items.map((item) => (
              <Card key={item.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{item.title}</CardTitle>
                    <Badge variant="outline" className="shrink-0 text-[10px] font-mono">
                      {item.authorUuidPrefix}
                    </Badge>
                  </div>
                  {item.description && (
                    <CardDescription className="text-xs">{item.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col space-y-3">
                  <div className="bg-muted/30 border border-border/40 rounded p-2 font-mono text-[10px] break-all text-foreground/90">
                    {item.excerpt}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-3 font-mono">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />{item.viewCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="h-3 w-3" />{item.forkCount}
                    </span>
                    <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-auto"
                    onClick={() => forkIndicator(item)}
                    disabled={forkingId !== null}
                  >
                    <GitFork className="h-3 w-3 mr-1" />
                    {forkingId === item.id ? 'Forking…' : 'Fork to my Workbench'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border/30">
          {data && data.items && data.items.length > 0 && (
            <p>Showing {data.items.length} public indicator{data.items.length === 1 ? '' : 's'}.</p>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-4 right-4 bg-card border border-orange-500/50 rounded-lg px-4 py-2 shadow-lg text-sm font-medium z-50 max-w-sm">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}