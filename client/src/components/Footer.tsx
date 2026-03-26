import React from "react";
import { Link } from "wouter";
import { FaTwitter, FaGithub } from "react-icons/fa";

const Footer: React.FC = () => {
  return (
    <footer className="bg-card border-t border-muted/20 mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo and copyright */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="16" fill="#F7931A"/>
                <path d="M22.5 14.2c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.7c-.4-.1-.7-.2-1-.2l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 0 .1 0 .2.1h-.2l-1.2 4.7c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.7c.5.1.9.2 1.4.3l-.7 2.7 1.7.4.7-2.8c3 .6 5.2.3 6.1-2.4.8-2.1 0-3.4-1.6-4.2 1.1-.3 2-1 2.2-2.5zm-4 5.5c-.6 2.1-4.2 1-5.4.7l1 3.9c1.2.3 4.8.9 5.3-.6.4-1.3-.3-2.6-1.9-3zm.6-5.5c-.5 1.9-3.7.9-4.7.7l.9-3.6c1.1.3 4.4.8 4.8 1.1.4.4.3 1.6-.6 1.8h-.4z" fill="white"/>
              </svg>
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
