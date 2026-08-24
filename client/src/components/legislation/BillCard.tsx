// BitcoinHub — /legislation BillCard
// Self-contained card per bill: name, bill number, current status, status
// pipeline, editorial "why this matters for BTC", sponsor, recent actions,
// passage-chance estimate.

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Calendar, Percent, FileText } from "lucide-react";
import { type BillStage, STAGE_LABEL } from "@/lib/legislation-data";
import StatusPipeline from "./StatusPipeline";

interface BillData {
  slug: string;
  billName: string;
  billSlug: string;        // e.g., "119-s-1582"
  billType: string;
  billNumber: string;
  congress: string;
  category: string;
  priority: string;
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

interface Props {
  bill: BillData;
}

function categoryColor(category: string): string {
  switch (category) {
    case 'regulation': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    case 'taxation': return 'bg-red-500/10 text-red-500 border-red-500/30';
    case 'stablecoin': return 'bg-green-500/10 text-green-500 border-green-500/30';
    case 'innovation': return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
    case 'enforcement': return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
    default: return 'bg-muted/10 text-muted-foreground border-muted/30';
  }
}

function priorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'bg-red-500 text-white';
    case 'medium': return 'bg-yellow-500 text-black';
    case 'low': return 'bg-green-500 text-white';
    default: return 'bg-muted text-muted-foreground';
  }
}

function passageColor(chance: number): string {
  if (chance >= 70) return 'text-emerald-500';
  if (chance >= 40) return 'text-yellow-500';
  return 'text-red-500';
}

export default function BillCard({ bill }: Props) {
  const congressUrl = `https://www.congress.gov/bill/${bill.congress}th-congress/${bill.billType === 's' ? 'senate-bill' : 'house-bill'}/${bill.billNumber}`;

  return (
    <Card id={bill.slug} className="bg-card border-muted/20">
      <CardContent className="p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-xl font-semibold text-foreground">{bill.billName}</h3>
              <Badge className={priorityColor(bill.priority)} variant="default">
                {bill.priority}
              </Badge>
              <Badge variant="outline" className={categoryColor(bill.category)}>
                {bill.category}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <a
                href={congressUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono hover:text-primary hover:underline"
              >
                {bill.congress}-{bill.billType.toUpperCase()}-{bill.billNumber}
              </a>
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                Originated in {bill.originChamber || (bill.billType === 's' ? 'Senate' : 'House')}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${passageColor(bill.passageChance)}`}>
              {bill.passageChance}%
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Passage estimate
            </div>
          </div>
        </div>

        {/* Status pipeline */}
        <div className="bg-background/40 border border-muted/10 rounded-lg p-4">
          <StatusPipeline currentStage={bill.stage} billName={bill.billName} />
        </div>

        {/* Current status */}
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Latest action
          </div>
          <div className="text-sm text-foreground leading-snug">{bill.currentStatus || 'No action yet'}</div>
          {bill.lastActionDate && (
            <div className="text-xs text-muted-foreground mt-1">
              <Calendar className="w-3 h-3 inline mr-1" />
              {bill.lastActionDate}
            </div>
          )}
        </div>

        {/* Editorial — why it matters for BTC */}
        <div className="bg-primary/5 border border-primary/15 rounded-lg p-4">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-primary mb-2">
            <Percent className="w-3 h-3" />
            Why this matters for BTC
          </div>
          <p
            className="text-sm text-foreground/90 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: bill.whyItMatters }}
          />
        </div>

        {/* What to watch next */}
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            What to watch next
          </div>
          <p className="text-sm text-muted-foreground leading-snug">{bill.whatsNext}</p>
        </div>

        {/* Sponsor + source */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-muted/10">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            <span>Sponsor: {bill.sponsor}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="w-3 h-3" />
            <span>Live: </span>
            <a href={congressUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
              congress.gov/{bill.congress}-{bill.billType}-{bill.billNumber}
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}