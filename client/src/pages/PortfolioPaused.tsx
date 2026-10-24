// Audit B12: /portfolio needs accounts (/api/portfolio), and auth is disabled on this
// deployment, so the old page showed $0.00 everywhere. Show an honest empty state
// instead, and point at the tools that work without an account.
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export default function PortfolioPaused() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16" data-testid="portfolio-paused">
      <Card className="border-muted/30 bg-card/50">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <Wallet className="h-10 w-10 text-[#F7931A] mx-auto" />
          <h1 className="text-2xl font-bold">Portfolio tracking is paused</h1>
          <p className="text-muted-foreground">
            Saved holdings need an account, and account sign-ups are turned off on this site for now.
            These tools work without one:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/portfolio/mpt"><Button>Portfolio MPT</Button></Link>
            <Link href="/dca-simulator"><Button variant="outline">DCA Simulator</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
