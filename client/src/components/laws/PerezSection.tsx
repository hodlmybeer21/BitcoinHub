// BitcoinHub — /laws Perez's Techno-Economic Revolutions deep dive.
//
// Carlota Perez's framework: ~50-year cycles of "great surges" that reshape
// the entire economy. Five completed (steam, steel, electricity, mass
// production, information). Bitcoin's 2009 launch fits the pattern as a
// potential 6th — the first to address money itself.
//
// No live data — Perez's framework is structural. Custom timeline built
// from divs + Tailwind rather than Recharts (which doesn't have a clean
// timeline primitive).

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Globe, Calendar, Sparkles } from "lucide-react";
import { PEREZ_REVOLUTIONS } from "@/lib/laws-data";

interface PerezRevolution {
  index: number;
  name: string;
  startYear: number;
  endYear: number | null;
  duration: string;
  coreCountry: string;
  technologies: string[];
  summary: string;
}

interface PerezPayload {
  asOf: string;
  source: 'baked' | 'live' | 'fallback';
  revolutions: PerezRevolution[];
}

function usePerez() {
  return useQuery<PerezPayload>({
    queryKey: ['/api/laws/perez'],
    queryFn: async () => {
      const res = await fetch('/api/laws/perez');
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    refetchInterval: 24 * 60 * 60 * 1000,
    staleTime: 60 * 60 * 1000,
  });
}

// Color palette per revolution index
const REVOLUTION_COLORS = [
  'bg-amber-500/10 border-amber-500/30 text-amber-500',
  'bg-orange-500/10 border-orange-500/30 text-orange-500',
  'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
  'bg-red-500/10 border-red-500/30 text-red-500',
  'bg-cyan-500/10 border-cyan-500/30 text-cyan-500',
  'bg-primary/10 border-primary/40 text-primary',  // BTC — highlighted
];

export default function PerezSection() {
  const query = usePerez();
  const revolutions = query.data?.revolutions ?? PEREZ_REVOLUTIONS;

  const btc = revolutions.find(r => r.index === 6);
  const historical = revolutions.filter(r => r.index !== 6);
  const yearsSinceBtc = btc ? Math.floor((Date.now() - new Date(`${btc.startYear}-01-01`).getTime()) / (365.25 * 86400 * 1000)) : null;

  return (
    <section id="perez" className="py-16 border-t border-muted/10 bg-background/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 mb-3">
              Law #8
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center gap-3">
              <span className="text-3xl">🌀</span>
              Perez's Techno-Economic Revolutions
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Carlota Perez's framework maps 5 historical revolutions — each reshaping the entire
              economy over ~50–70 years. Bitcoin's 2009 launch fits the pattern as a potential 6th,
              the first to address <em>money itself</em>.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Static reference · Perez (2002, 2015)
          </div>
        </div>

        {/* Stat row */}
        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          <Card className="bg-card border-primary/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">BTC revolution age</span>
              </div>
              <div className="text-3xl font-bold font-mono text-primary">
                {yearsSinceBtc !== null ? `${yearsSinceBtc} years` : '—'}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                since genesis block · Jan 3 2009
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-muted/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Revolutions since 1771</span>
              </div>
              <div className="text-3xl font-bold font-mono text-amber-500">
                {revolutions.length}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                5 historical + 1 in progress
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-muted/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="w-4 h-4 text-cyan-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg revolution length</span>
              </div>
              <div className="text-3xl font-bold font-mono text-cyan-500">
                ~50 years
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                install + deploy periods combined
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline visualization */}
        <Card className="bg-card border-muted/20 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">The 5 historical revolutions + BTC as the proposed 6th</CardTitle>
            <div className="text-xs text-muted-foreground">
              Each revolution: a 50–70 year cycle of installation + deployment
            </div>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : (
              <div className="space-y-3">
                {revolutions.map((rev) => {
                  const colorClass = REVOLUTION_COLORS[(rev.index - 1) % REVOLUTION_COLORS.length];
                  const isBtc = rev.index === 6;
                  return (
                    <div
                      key={rev.index}
                      className={`border rounded-lg p-4 ${colorClass} ${isBtc ? 'ring-1 ring-primary/30 shadow-lg shadow-primary/5' : ''}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:gap-6">
                        <div className="flex-shrink-0 mb-2 sm:mb-0">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl font-bold font-mono opacity-70">
                              #{rev.index}
                            </div>
                            <div>
                              <div className="font-semibold text-base">{rev.name}</div>
                              <div className="text-xs opacity-80 font-mono">
                                {rev.startYear} → {rev.endYear ?? 'present'}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-2 mb-2 text-xs">
                            <span className="px-2 py-0.5 rounded-full border border-current/20 bg-background/30">
                              {rev.duration}
                            </span>
                            <span className="px-2 py-0.5 rounded-full border border-current/20 bg-background/30">
                              {rev.coreCountry}
                            </span>
                          </div>
                          <p className="text-sm leading-snug mb-2">
                            {rev.summary}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {rev.technologies.map((tech) => (
                              <span
                                key={tech}
                                className="text-[10px] px-1.5 py-0.5 rounded border border-current/15 bg-background/40 opacity-90"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-background/40 border-muted/20">
          <CardContent className="pt-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
            <p>
              <span className="text-foreground font-medium">The 50-year cadence.</span> Each of Perez's 5
              completed revolutions took ~50–70 years to fully deploy: a front-loaded "surge" of new
              infrastructure, then a longer "deployment" phase that reorganizes the rest of the economy
              around it. The 5th (information & telecom) launched in 1971 — by 2026 it's 55 years in,
              fully deployed. The 6th (decentralized money) is 17 years in.
            </p>
            <p>
              <span className="text-foreground font-medium">Why BTC fits the pattern.</span> Each prior
              revolution transformed <em>how</em> things were made or moved — but money itself stayed
              unchanged. The current revolution targets the monetary layer: open, scarce, neutral money
              that no single entity can debase. If it deploys the way the prior 5 did, the rest of the
              economy reorganizes around it over the next 30 years.
            </p>
            <p className="text-xs italic pt-2 border-t border-muted/10">
              Note: the "6th revolution" framing is <em>proposed</em>, not consensus. Perez herself has
              not endorsed it. The chart shows it as a working hypothesis, not a settled claim.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}