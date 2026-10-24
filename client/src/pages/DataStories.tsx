import { Link } from "wouter";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SubscribeCTA } from "@/components/SubscribeCTA";

// "Data stories" hub from the UX review's page map: Value Tracker, Generations, DCA, Laws.
const STORIES = [
  {
    href: "https://tracker.goodbotai.tech",
    external: true,
    title: "Value Tracker",
    body: "What a dollar buys over time: homes, groceries, gold and Bitcoin, from public price series.",
  },
  {
    href: "https://tracker.goodbotai.tech/generations",
    external: true,
    title: "Generations",
    body: "The same purchases priced in the years each generation started out.",
  },
  {
    href: "/dca-simulator",
    external: false,
    title: "DCA simulator",
    body: "A hypothetical backtest: what a fixed monthly Bitcoin purchase from a chosen start year would be worth now.",
  },
  {
    href: "/laws",
    external: false,
    title: "Through the Laws",
    body: "Metcalfe, Lindy, Stock-to-Flow and five more, charted against live data, including where they break.",
  },
];

export default function DataStories() {
  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Data stories</h1>
        <p className="text-muted-foreground max-w-2xl">
          Bitcoin and the dollar, told in charts. Each one links to its data source. Educational, not financial advice.
        </p>
      </header>
      <div className="grid sm:grid-cols-2 gap-4">
        {STORIES.map((s) => {
          const inner = (
            <Card className="p-6 h-full bg-card border-muted/20 hover:border-primary/40 transition-colors group">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                {s.title}
                {s.external && <ExternalLink className="w-4 h-4 text-muted-foreground" />}
              </h2>
              <p className="text-sm text-muted-foreground mt-2">{s.body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary group-hover:gap-2 transition-all">
                Open <ArrowRight className="w-4 h-4" />
              </span>
            </Card>
          );
          return s.external ? (
            <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer">{inner}</a>
          ) : (
            <Link key={s.href} href={s.href}>{inner}</Link>
          );
        })}
      </div>
      <SubscribeCTA />
    </div>
  );
}
