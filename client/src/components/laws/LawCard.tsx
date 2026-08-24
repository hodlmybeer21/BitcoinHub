// BitcoinHub — /laws reusable card for the hero grid.
// Small, scannable summary card that links to the deep-dive anchor.

import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import type { LawCard as LawCardType } from "@/lib/laws-data";

interface Props {
  law: LawCardType;
}

export default function LawCard({ law }: Props) {
  return (
    <Link href={`/laws#${law.id}`} className="block group">
      <Card className="h-full bg-card border-muted/20 hover:border-primary/40 transition-colors cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="text-4xl mb-2">{law.emoji}</div>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-[10px]">
              {law.sourceLabel}
            </Badge>
          </div>
          <CardTitle className="text-xl">{law.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground font-medium leading-snug">
            {law.tagline}
          </p>
          <div className="bg-background/60 border border-muted/20 rounded-md p-3 font-mono text-xs text-muted-foreground">
            {law.formula}
          </div>
          <div className="flex items-center gap-1 text-sm text-primary group-hover:gap-2 transition-all">
            <span>Open deep dive</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}