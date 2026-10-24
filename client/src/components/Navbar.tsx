import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BitcoinHubLogo } from "@/components/BitcoinHubLogo";
import { SubscribeButton } from "@/components/SubscribeButton";
import { PRIMARY_NAV, MORE_TOOLS, isNavActive, type NavLink } from "@/lib/siteNav";

// UX review "Proposed nav": Cycle · Macro · Data stories · Learn · Sources · [Subscribe — free].
// Mobile header: logo · Subscribe · ☰ (same five items, then "More tools").
// The notification bell, Donate (now in the footer), games and account links are gone.

const ToolLink = ({ tool, onClick, className, children }: { tool: NavLink; onClick?: () => void; className: string; children: React.ReactNode }) =>
  tool.external ? (
    <a href={tool.href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={className}>
      {children}
    </a>
  ) : (
    <Link href={tool.href} onClick={onClick} className={className}>
      {children}
    </Link>
  );

const Navbar = () => {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const close = () => setMobileMenuOpen(false);

  return (
    <>
      <nav className="bg-card border-b border-muted/20 sticky top-0 z-50" aria-label="Main">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" onClick={close} aria-label="BitcoinHub home">
                <BitcoinHubLogo size="w-8 h-8" />
              </Link>

              <div className="hidden lg:ml-10 lg:flex lg:items-center lg:gap-1" data-testid="nav-desktop">
                {PRIMARY_NAV.map((link) => {
                  const active = isNavActive(link, location);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={`${active ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"} px-3 py-2 text-sm font-medium`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden lg:inline-flex"><SubscribeButton /></span>
              <span className="lg:hidden"><SubscribeButton compact /></span>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                data-testid="nav-menu-toggle"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
        <div
          className={`absolute right-0 top-0 h-full w-80 max-w-full bg-card border-l border-muted/20 shadow-2xl transition-transform duration-300 ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}
          data-testid="nav-mobile-drawer"
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-muted/20">
              <BitcoinHubLogo size="w-7 h-7" />
              <Button variant="ghost" size="sm" onClick={close} aria-label="Close menu">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              <div className="px-4 mb-6">
                {PRIMARY_NAV.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={close}
                    className={`${isNavActive(link, location) ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"} flex items-center px-3 py-3 rounded-lg text-base font-medium`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="px-4 mb-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">More tools</p>
                {MORE_TOOLS.map((tool) => (
                  <ToolLink
                    key={tool.href}
                    tool={tool}
                    onClick={close}
                    className={`${location === tool.href ? "text-primary" : "text-muted-foreground"} flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted/50`}
                  >
                    <span className="flex-1">{tool.label}</span>
                    {tool.external && <ExternalLink className="w-3.5 h-3.5" />}
                  </ToolLink>
                ))}
              </div>
            </div>
            <p className="border-t border-muted/20 p-4 text-xs text-muted-foreground">
              Educational content only. Not financial advice.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
