import React from "react";
import { Link } from "wouter";
import { FaTwitter, FaGithub } from "react-icons/fa";
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
            </div>
          </div>
          
          {/* Social links */}
          <div className="flex items-center gap-4">
            <a 
              href="https://twitter.com/bitcoinhub" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Follow us on X (Twitter)"
            >
              <FaTwitter className="w-5 h-5" />
            </a>
            <a 
              href="https://github.com/hodlmybeer21/BitcoinHub" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="View on GitHub"
            >
              <FaGithub className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
