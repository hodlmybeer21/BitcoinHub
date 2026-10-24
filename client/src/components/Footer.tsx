import React from "react";
import { Link } from "wouter";
import { FaXTwitter } from "react-icons/fa6";
import { BitcoinHubLogo } from "@/components/BitcoinHubLogo";
import { DonationButton } from "@/components/DonationButton";
import { LABS } from "@/lib/siteNav";
import { NEWSLETTER_NAME, SUBSTACK_BASE } from "@/lib/newsletter";

// The one site footer (UX review #13): disclaimer, Sources, Newsletter, X, Labs, and Donate (#18, demoted).
const linkCls = "text-muted-foreground hover:text-foreground transition-colors";

const Footer: React.FC = () => {
  return (
    <footer className="bg-card border-t border-muted/20 mt-auto" data-testid="site-footer">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <BitcoinHubLogo size="w-5 h-5" variant="icon" />
              <span className="text-sm font-semibold text-foreground">BitcoinHub</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Where we are in the Bitcoin cycle. Calm, sourced, updated daily. Researched with AI,
              edited by a human. Every number sourced.
            </p>
          </div>

          <nav className="grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-2 text-sm" aria-label="Footer">
            <Link href="/sources" className={linkCls}>Sources</Link>
            <a href={SUBSTACK_BASE} target="_blank" rel="noopener noreferrer" className={linkCls}>Newsletter</a>
            <a href="https://x.com/hodlmybeer21" target="_blank" rel="noopener noreferrer" className={`${linkCls} inline-flex items-center gap-1`} aria-label="@HODLMyBeer21 on X">
              <FaXTwitter className="w-3.5 h-3.5" /> @HODLMyBeer21
            </a>
            <Link href="/about" className={linkCls}>About</Link>
            <Link href="/thesis" className={linkCls}>Thesis</Link>
            <Link href="/privacy" className={linkCls}>Privacy</Link>
            <Link href="/terms" className={linkCls}>Terms</Link>
            <span className="text-sm"><DonationButton asLink /></span>
          </nav>
        </div>

        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="uppercase tracking-wider text-muted-foreground/70">Labs (experimental):</span>
          {LABS.map((l) => (
            <Link key={l.href} href={l.href} className={linkCls}>{l.label}</Link>
          ))}
        </div>

        <div className="pt-4 border-t border-muted/10 text-xs text-muted-foreground space-y-2">
          <p data-testid="footer-nfa">
            <strong className="text-foreground/80">Educational content only. Not financial advice.</strong>{" "}
            Past cycles do not guarantee future results. Do your own research. Newsletter: {NEWSLETTER_NAME}.
          </p>
          <p className="italic text-muted-foreground/70">
            Satoshi Nakamoto,{" "}
            <a href="https://bitcoin.org/bitcoin.txt" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground/90 not-italic">
              <em>Bitcoin: A Peer-to-Peer Electronic Cash System</em>
            </a>{" "}
            (2008). © 2026 BitcoinHub.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
