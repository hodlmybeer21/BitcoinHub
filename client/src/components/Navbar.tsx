import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Bell, Menu, X, ExternalLink, TrendingUp, BarChart3, Coins, PieChart, Hammer, Gauge, Layers, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { DonationButton } from "@/components/DonationButton";
import { BitcoinHubLogo } from "@/components/BitcoinHubLogo";

const Navbar = () => {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const queryClient = useQueryClient();
  
  const isActiveLink = (path: string) => location === path;

  // Fetch real-time notifications
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['/api/notifications'],
    refetchInterval: 2 * 60 * 1000,
  });

  const notificationsList = Array.isArray(notifications) ? notifications : [];
  const unreadCount = notificationsList.filter((n: any) => !n.read).length;

  // Mutation to mark notification as read and remove it
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiRequest('POST', `/api/notifications/${notificationId}/read`, {});
    },
    onSuccess: (_, notificationId) => {
      queryClient.setQueryData(['/api/notifications'], (oldData: any[]) => {
        return oldData ? oldData.filter(n => n.id !== notificationId) : [];
      });
    },
  });

  // Mutation to clear all notifications
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/notifications/clear-all', {});
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/notifications'], []);
      setShowAllNotifications(false);
    },
  });

  const handleNotificationClick = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleViewAllNotifications = () => {
    setShowAllNotifications(!showAllNotifications);
  };

  const handleClearAllNotifications = () => {
    clearAllMutation.mutate();
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { href: "/", label: "Learn" },
    { href: "/analytics", label: "Analytics" },
    { href: "/cycle", label: "4-Year Cycle" },
    { href: "/web-resources", label: "Web Resources" },
    { href: "/legislation", label: "Legislation" },
  ];

  const toolsLinks = [
    {
      href: "/dca-simulator",
      label: "DCA Simulator",
      description: "Simulate dollar-cost averaging strategies",
      icon: Coins,
      comingSoon: false
    },
    {
      href: "/portfolio/mpt",
      label: "MPT Optimizer",
      description: "Modern Portfolio Theory across halving cycles",
      icon: PieChart,
      comingSoon: false
    },
    {
      href: "/workbench",
      label: "Workbench",
      description: "Build custom indicators — no code",
      icon: Hammer,
      comingSoon: false
    },
    {
      href: "/risk",
      label: "Risk Indicator",
      description: "BTC cycle-position score (0–1) with halving context",
      icon: Gauge,
      comingSoon: false
    },
    {
      href: "/macro",
      label: "Macro Indicators",
      description: "Fed, Treasury, CPI, unemployment + 12 FRED series",
      icon: Layers,
      comingSoon: false
    },
    {
      href: "/laws",
      label: "Bitcoin Through the Laws",
      description: "Metcalfe, Bass diffusion, and the Lindy Effect — with live charts",
      icon: BookOpen,
      comingSoon: false
    },
    {
      href: "https://tracker.goodbotai.tech",
      label: "Value Tracker", 
      description: "Track purchasing power over time",
      icon: TrendingUp,
      external: true
    },
    {
      href: "/analytics",
      label: "Live BTC Analytics",
      description: "Real-time market data & on-chain metrics",
      icon: BarChart3,
      external: false
    },
    {
      href: "/about",
      label: "About & Docs",
      description: "Methodology, data sources, FAQ",
      icon: BookOpen,
      comingSoon: false
    },
  ];

  return (
    <>
      <nav className="bg-card border-b border-muted/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" onClick={closeMobileMenu}>
                <div className="flex items-center cursor-pointer">
                  <BitcoinHubLogo size="w-8 h-8" />
                </div>
              </Link>
              
              {/* Desktop Navigation */}
              <div className="hidden lg:ml-8 lg:flex lg:space-x-1">
                <Link href="/">
                  <span className={`${isActiveLink('/') ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'} px-3 py-2 text-sm font-medium cursor-pointer`}>
                    Learn
                  </span>
                </Link>
                
                {/* Tools Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <span className="text-muted-foreground hover:text-foreground">
                      <span className="px-3 py-2 text-sm font-medium cursor-pointer">
                        Tools
                        <svg className="ml-0.5 inline-block w-3 h-3 align-middle" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72">
                    {toolsLinks.map((tool) => (
                      <DropdownMenuItem key={tool.href} asChild>
                        {tool.external ? (
                          <a
                            href={tool.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={tool.comingSoon ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
                          >
                            <div className="flex items-start gap-3 w-full">
                              <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
                                <tool.icon className="w-4 h-4 text-primary" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{tool.label}</span>
                                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                  {tool.comingSoon && (
                                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Coming Soon</span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{tool.description}</p>
                              </div>
                            </div>
                          </a>
                        ) : (
                          <Link
                            href={tool.href}
                            className={tool.comingSoon ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
                          >
                            <div className="flex items-start gap-3 w-full">
                              <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
                                <tool.icon className="w-4 h-4 text-primary" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{tool.label}</span>
                                  {tool.comingSoon && (
                                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Coming Soon</span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{tool.description}</p>
                              </div>
                            </div>
                          </Link>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Link href="/analytics">
                  <span className={`${isActiveLink('/analytics') ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'} px-3 py-2 text-sm font-medium cursor-pointer`}>
                    Analytics
                  </span>
                </Link>
                <Link href="/cycle">
                  <span className={`${isActiveLink('/cycle') ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'} px-3 py-2 text-sm font-medium cursor-pointer`}>
                    4-Year Cycle
                  </span>
                </Link>
                <Link href="/web-resources">
                  <span className={`${isActiveLink('/web-resources') ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'} px-3 py-2 text-sm font-medium cursor-pointer`}>
                    Web Resources
                  </span>
                </Link>
                <Link href="/legislation">
                  <span className={`${isActiveLink('/legislation') ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'} px-3 py-2 text-sm font-medium cursor-pointer`}>
                    Legislation
                  </span>
                </Link>
              </div>
            </div>
            
            {/* Right side - Notifications & Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center">
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary text-[10px] text-primary-foreground font-bold">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="px-3 py-2 border-b">
                    <h4 className="font-medium">Notifications</h4>
                    {unreadCount > 0 && (
                      <p className="text-sm text-muted-foreground">{unreadCount} new</p>
                    )}
                  </div>
                  {notificationsLoading ? (
                    <div className="px-3 py-6 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">Loading notifications...</p>
                    </div>
                  ) : notificationsList.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto">
                      {(showAllNotifications ? notificationsList : notificationsList.slice(0, 5)).map((notification: any) => (
                        <DropdownMenuItem 
                          key={notification.id} 
                          className="px-3 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleNotificationClick(notification.id)}
                        >
                          <div className="flex items-start gap-3 w-full">
                            <div className={`p-1 rounded-full ${
                              notification.priority === 'high' ? 'bg-red-100 text-red-600' :
                              notification.type === 'price_alert' ? 'bg-green-100 text-green-600' :
                              notification.type === 'news' ? 'bg-blue-100 text-blue-600' :
                              'bg-orange-100 text-orange-600'
                            }`}>
                              <Bell className="h-3 w-3" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!notification.read ? 'font-medium' : 'font-normal'}`}>
                                {notification.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(notification.timestamp).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-6 text-center text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No notifications yet</p>
                    </div>
                  )}
                  <DropdownMenuSeparator />
                  <div className="px-3 py-2 flex gap-2">
                    <DropdownMenuItem 
                      className="flex-1 justify-center text-sm text-primary cursor-pointer"
                      onClick={handleViewAllNotifications}
                    >
                      {showAllNotifications ? 'Show less' : `View all (${notificationsList.length})`}
                    </DropdownMenuItem>
                    {notificationsList.length > 0 && (
                      <DropdownMenuItem 
                        className="justify-center text-sm text-destructive cursor-pointer"
                        onClick={handleClearAllNotifications}
                      >
                        Clear all
                      </DropdownMenuItem>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DonationButton />
              
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu drawer */}
      <div 
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={closeMobileMenu}
        />
        
        {/* Drawer */}
        <div 
          className={`absolute right-0 top-0 h-full w-80 max-w-full bg-card border-l border-muted/20 shadow-2xl transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex flex-col h-full">
            {/* Mobile menu header */}
            <div className="flex items-center justify-between p-4 border-b border-muted/20">
              <div className="flex items-center gap-2">
                <BitcoinHubLogo size="w-7 h-7" />
              </div>
              <Button variant="ghost" size="sm" onClick={closeMobileMenu}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Mobile menu content */}
            <div className="flex-1 overflow-y-auto py-4">
              {/* Main navigation */}
              <div className="px-4 mb-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                  Navigation
                </p>
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} onClick={closeMobileMenu}>
                    <span className={`${isActiveLink(link.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'} flex items-center px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer`}>
                      {link.label}
                    </span>
                  </Link>
                ))}
              </div>
              
              {/* Tools section */}
              <div className="px-4 mb-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                  Tools
                </p>
                {toolsLinks.map((tool) => (
                  tool.external ? (
                    <a
                      key={tool.href}
                      href={tool.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeMobileMenu}
                    >
                      <span className={`${tool.comingSoon ? 'opacity-50' : 'hover:bg-muted/50'} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer`}>
                        <div className="p-1.5 rounded-md bg-primary/10">
                          <tool.icon className="w-4 h-4 text-primary" />
                        </div>
                        <span className="flex-1 text-muted-foreground">{tool.label}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                        {tool.comingSoon && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Soon</span>
                        )}
                      </span>
                    </a>
                  ) : (
                    <Link 
                      key={tool.href} 
                      href={tool.href}
                      onClick={closeMobileMenu}
                    >
                      <span className={`${tool.comingSoon ? 'opacity-50' : 'hover:bg-muted/50'} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer`}>
                        <div className="p-1.5 rounded-md bg-primary/10">
                          <tool.icon className="w-4 h-4 text-primary" />
                        </div>
                        <span className="flex-1 text-muted-foreground">{tool.label}</span>
                        {tool.comingSoon && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Soon</span>
                        )}
                      </span>
                    </Link>
                  )
                ))}
              </div>
              
              {/* Newsletter */}
              <div className="px-4 mb-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                  Stay Updated
                </p>
                <Link href="/newsletter" onClick={closeMobileMenu}>
                  <span className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer text-muted-foreground hover:bg-muted/50">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <Bell className="w-4 h-4 text-primary" />
                    </div>
                    Newsletter
                  </span>
                </Link>
              </div>
            </div>
            
            {/* Mobile menu footer */}
            <div className="border-t border-muted/20 p-4">
              <DonationButton />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
