import React from "react";
import { Link } from "wouter";
import { FaTwitter } from "react-icons/fa";
import { BitcoinHubLogo } from "@/components/BitcoinHubLogo";

const Footer: React.FC = () => {
  return (
    <footer className="bg-card border-t border-muted/20 mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo and copyright */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <BitcoinHubLogo size="w-5 h-5" />
              <span className="text-sm font-semibold text-foreground">BitcoinHub</span>
              <span className="text-sm text-muted-foreground">© 2026</span>
            </div>

            {/* Legal links */}
            <div className="flex items-center gap-4 text-sm">
              <Link href="/privacy">
                <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                  Privacy
                </span>
              </Link>
              <span className="text-muted-foreground">|</span>
              <Link href="/terms">
                <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                  Terms
                </span>
              </Link>
              <span className="text-muted-foreground">|</span>
              <Link href="/laws">
                <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                  Through the Laws
                </span>
              </Link>
            </div>
          </div>

          {/* Social links */}
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com/hodlmybeer21"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Follow us on X (Twitter)"
            >
              <FaTwitter className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* White-paper citation — anchors every page + every screenshot */}
        <p className="mt-4 text-[11px] text-muted-foreground/70 italic text-center md:text-left">
          Satoshi Nakamoto,{' '}
          <a
            href="https://bitcoin.org/bitcoin.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground/90 not-italic"
          >
            <em>Bitcoin: A Peer-to-Peer Electronic Cash System</em>
          </a>{' '}
          (2008). We teach the same thesis; we cite it everywhere.{' '}
          <Link href="/thesis">
            <span className="not-italic underline hover:text-foreground/90 cursor-pointer">
              Read the thesis
            </span>
          </Link>{' '}
          ·{' '}
          <Link href="/sources">
            <span className="not-italic underline hover:text-foreground/90 cursor-pointer">
              See every data source
            </span>
          </Link>
          .
        </p>
      </div>
    </footer>
  );
};

export default Footer;
