import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Bell, Menu, X, ExternalLink, TrendingUp, BarChart3, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { DonationButton } from "@/components/DonationButton";

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
    { href: "/news", label: "News" },
    { href: "/web-resources", label: "Web Resources" },
    { href: "/legislation", label: "Legislation" },
  ];

  const toolsLinks = [
    { 
      href: "/dca-simulator", 
      label: "DCA Simulator", 
      description: "Simulate dollar-cost averaging strategies",
      icon: Coins,
      comingSoon: true
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
                  <svg viewBox="0 0 32 32" className="w-8 h-8 mr-2" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="16" cy="16" r="16" fill="#F7931A"/>
                    <path d="M22.5 14.2c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.7c-.4-.1-.7-.2-1-.2l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 0 .1 0 .2.1h-.2l-1.2 4.7c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.7c.5.1.9.2 1.4.3l-.7 2.7 1.7.4.7-2.8c3 .6 5.2.3 6.1-2.4.8-2.1 0-3.4-1.6-4.2 1.1-.3 2-1 2.2-2.5zm-4 5.5c-.6 2.1-4.2 1-5.4.7l1 3.9c1.2.3 4.8.9 5.3-.6.4-1.3-.3-2.6-1.9-3zm.6-5.5c-.5 1.9-3.7.9-4.7.7l.9-3.6c1.1.3 4.4.8 4.8 1.1.4.4.3 1.6-.6 1.8h-.4z" fill="white"/>
                  </svg>
                  <span className="text-xl font-bold text-foreground">
                    <span className="text-primary">₿</span> BitcoinHub
                  </span>
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
                    <span className="flex items-center text-muted-foreground hover:text-foreground px-3 py-2 text-sm font-medium cursor-pointer">
                      Tools
                      <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72">
                    {toolsLinks.map((tool) => (
                      <DropdownMenuItem key={tool.href} asChild>
                        <Link 
                          href={tool.href} 
                          className={tool.comingSoon ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
                          {...(tool.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        >
                          <div className="flex items-start gap-3 w-full">
                            <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
                              <tool.icon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{tool.label}</span>
                                {tool.external && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
                                {tool.comingSoon && (
                                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Coming Soon</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{tool.description}</p>
                            </div>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Link href="/analytics">
                  <span className={`${isActiveLink('/analytics') ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'} px-3 py-2 text-sm font-medium cursor-pointer`}>
                    Analytics
                  </span>
                </Link>
                <Link href="/news">
                  <span className={`${isActiveLink('/news') ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'} px-3 py-2 text-sm font-medium cursor-pointer`}>
                    News
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
                <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="16" fill="#F7931A"/>
                  <path d="M22.5 14.2c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.7c-.4-.1-.7-.2-1-.2l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 0 .1 0 .2.1h-.2l-1.2 4.7c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.7c.5.1.9.2 1.4.3l-.7 2.7 1.7.4.7-2.8c3 .6 5.2.3 6.1-2.4.8-2.1 0-3.4-1.6-4.2 1.1-.3 2-1 2.2-2.5zm-4 5.5c-.6 2.1-4.2 1-5.4.7l1 3.9c1.2.3 4.8.9 5.3-.6.4-1.3-.3-2.6-1.9-3zm.6-5.5c-.5 1.9-3.7.9-4.7.7l.9-3.6c1.1.3 4.4.8 4.8 1.1.4.4.3 1.6-.6 1.8h-.4z" fill="white"/>
                </svg>
                <span className="text-lg font-bold text-foreground">BitcoinHub</span>
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
                  <Link 
                    key={tool.href} 
                    href={tool.href}
                    onClick={closeMobileMenu}
                    {...(tool.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    <span className={`${tool.comingSoon ? 'opacity-50' : 'hover:bg-muted/50'} flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer`}>
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <tool.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="flex-1 text-muted-foreground">{tool.label}</span>
                      {tool.external && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />}
                      {tool.comingSoon && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Soon</span>
                      )}
                    </span>
                  </Link>
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
