// BitcoinHub — /legislation FreshnessIndicator
// Tiny component showing "Updated X ago • Source: congress.gov".
// Honest about data freshness — the lying `new Date().toISOString()` at
// build time is gone.

import { Database, Clock, AlertCircle } from "lucide-react";

interface Props {
  fetchedAt: string;          // ISO timestamp of last API fetch
  source: 'congress.gov' | 'partial' | 'fallback';
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function FreshnessIndicator({ fetchedAt, source }: Props) {
  const isFallback = source === 'fallback';
  const isPartial = source === 'partial';

  const sourceLabel = isFallback
    ? 'Editorial only — congress.gov key not configured'
    : isPartial
    ? 'Partial — congress.gov (some bills unavailable)'
    : 'Live · api.congress.gov';

  const dotClass = isFallback
    ? 'bg-yellow-500'
    : isPartial
    ? 'bg-yellow-500'
    : 'bg-emerald-500';

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${dotClass} ${!isFallback ? 'animate-pulse' : ''}`} />
        <Database className="w-3 h-3" />
        <span className="font-medium">{sourceLabel}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Clock className="w-3 h-3" />
        <span>Updated {timeAgo(fetchedAt)}</span>
      </div>
      {isFallback && (
        <div className="flex items-center gap-1.5 text-yellow-500">
          <AlertCircle className="w-3 h-3" />
          <span>Set CONGRESS_API_KEY in Vercel env to enable live data</span>
        </div>
      )}
    </div>
  );
}