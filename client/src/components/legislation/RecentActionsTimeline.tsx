// BitcoinHub — /legislation RecentActionsTimeline
// Aggregates the most recent actions across ALL bills into one chronological
// feed. Latest-first. Useful for "what happened this week" at a glance.

import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimelineItem {
  date: string;       // YYYY-MM-DD
  billName: string;
  billSlug: string;
  text: string;
  stage: string;
}

interface Props {
  bills: Array<{
    billName: string;
    slug: string;
    actions: Array<{ date: string; text: string }>;
    stage: string;
  }>;
  limit?: number;
}

export default function RecentActionsTimeline({ bills, limit = 8 }: Props) {
  // Flatten all actions across all bills
  const items: TimelineItem[] = bills.flatMap(b =>
    (b.actions || []).map(a => ({
      date: a.date,
      billName: b.billName,
      billSlug: b.slug,
      text: a.text,
      stage: b.stage,
    }))
  );

  // Sort by date desc
  items.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

  const top = items.slice(0, limit);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Recent actions across all bills
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Latest congressional actions, most recent first
        </p>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground">No actions recorded yet.</p>
        ) : (
          <ol className="space-y-3">
            {top.map((item, idx) => (
              <li key={`${item.billSlug}-${item.date}-${idx}`} className="flex gap-3">
                <div className="flex-shrink-0 w-20 text-xs text-muted-foreground font-mono pt-0.5">
                  {item.date || '—'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground leading-snug">{item.text}</div>
                  <a
                    href={`#${item.billSlug}`}
                    className="text-xs text-primary hover:underline mt-0.5 inline-block"
                  >
                    {item.billName}
                  </a>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";