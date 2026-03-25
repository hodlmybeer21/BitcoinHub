import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Bell, TrendingUp, TrendingDown, AlertCircle, X } from "lucide-react";
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
    refetchInterval: 2 * 60 * 1000, // Check every 2 minutes for new notifications
  });

  const notificationsList = Array.isArray(notifications) ? notifications : [];
  const unreadCount = notificationsList.filter((n: any) => !n.read).length;

  // Mutation to mark notification as read and remove it
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiRequest('POST', `/api/notifications/${notificationId}/read`, {});
    },
    onSuccess: (_, notificationId) => {
      // Remove the notification from the cache
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
      // Clear all notifications from cache
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'price_alert':
        return TrendingUp;
      case 'news':
        return AlertCircle;
      case 'market':
        return TrendingDown;
      default:
        return Bell;
    }
  };

  return (
    <nav className="bg-card border-b border-muted/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <svg viewBox="0 0 32 32" className="w-8 h-8 mr-2" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="16" fill="#F7931A"/>
                  <path d="M22.5 14.2c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.7c-.4-.1-.7-.2-1-.2l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 0 .1 0 .2.1h-.2l-1.2 4.7c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.7c.5.1.9.2 1.4.3l-.7 2.7 1.7.4.7-2.8c3 .6 5.2.3 6.1-2.4.8-2.1 0-3.4-1.6-4.2 1.1-.3 2-1 2.2-2.5zm-4 5.5c-.6 2.1-4.2 1-5.4.7l1 3.9c1.2.3 4.8.9 5.3-.6.4-1.3-.3-2.6-1.9-3zm.6-5.5c-.5 1.9-3.7.9-4.7.7l.9-3.6c1.1.3 4.4.8 4.8 1.1.4.4.3 1.6-.6 1.8h-.4z" fill="white"/>
                </svg>
                <span className="text-xl font-bold text-foreground">BitcoinHub</span>
              </div>
            </Link>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              <Link href="/">
                <span className={`${isActiveLink('/') ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'} px-1 pt-1 font-medium cursor-pointer`}>
                  Learn
                </span>
              </Link>
              <Link href="/analytics">
                <span className={`${isActiveLink('/analytics') ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'} px-1 pt-1 font-medium cursor-pointer`}>
                  Analytics
                </span>
              </Link>
              <Link href="/news">
                <span className={`${isActiveLink('/news') ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'} px-1 pt-1 font-medium cursor-pointer`}>
                  News
                </span>
              </Link>
              <Link href="/web-resources">
                <span className={`${isActiveLink('/web-resources') ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'} px-1 pt-1 font-medium cursor-pointer`}>
                  Web Resources
                </span>
              </Link>
              <Link href="/legislation">
                <span className={`${isActiveLink('/legislation') ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'} px-1 pt-1 font-medium cursor-pointer`}>
                  Legislation
                </span>
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
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
                    {(showAllNotifications ? notificationsList : notificationsList.slice(0, 5)).map((notification: any) => {
                      const Icon = getNotificationIcon(notification.type);
                      return (
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
                              <Icon className="h-3 w-3" />
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
                            <div className="flex items-center gap-2">
                              {!notification.read && (
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNotificationClick(notification.id);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
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
            
            {/* Bitcoin Donation Button */}
            <DonationButton />
            
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="sm:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <div className="space-y-1">
                <div className="w-5 h-0.5 bg-foreground"></div>
                <div className="w-5 h-0.5 bg-foreground"></div>
                <div className="w-5 h-0.5 bg-foreground"></div>
              </div>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-muted/20" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link href="/">
              <span className={`${isActiveLink('/') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'} block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                Learn
              </span>
            </Link>
            <Link href="/analytics">
              <span className={`${isActiveLink('/analytics') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'} block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                Analytics
              </span>
            </Link>
            <Link href="/news">
              <span className={`${isActiveLink('/news') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'} block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                News
              </span>
            </Link>
            <Link href="/web-resources">
              <span className={`${isActiveLink('/web-resources') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'} block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                Web Resources
              </span>
            </Link>
            <Link href="/legislation">
              <span className={`${isActiveLink('/legislation') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'} block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                Legislation
              </span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;