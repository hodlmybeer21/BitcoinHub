import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, RefreshCw, Clock, MapPin, Calendar, Users, ExternalLink, Globe, Newspaper, MessageCircle, TrendingUp } from "lucide-react";
import { NewsItem, TwitterPost } from "@/lib/types";
import { TwitterFeed } from "@/components/TwitterFeed";

interface CryptoEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  isVirtual: boolean;
  url: string;
  category: 'conference' | 'webinar' | 'workshop' | 'meetup' | 'launch';
  priority: 'high' | 'medium' | 'low';
}

// Upcoming Events Component
const UpcomingEvents = () => {
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/events'],
    refetchInterval: 24 * 60 * 60 * 1000, // Refresh daily
  });

  const getDaysUntilEvent = (eventDate: string): string => {
    const now = new Date();
    const event = new Date(eventDate);
    const timeDiff = event.getTime() - now.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 7) return `${days} days`;
    if (days < 30) return `${Math.floor(days / 7)} weeks`;
    return `${Math.floor(days / 30)} months`;
  };

  const formatEventDate = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startFormatted = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    
    const endFormatted = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    const year = start.getFullYear();

    if (start.toDateString() === end.toDateString()) {
      return `${startFormatted}, ${year}`;
    }

    if (start.getMonth() === end.getMonth()) {
      return `${startFormatted}-${end.getDate()}, ${year}`;
    }

    return `${startFormatted} - ${endFormatted}, ${year}`;
  };

  if (eventsLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-muted/20 p-3 rounded-lg border border-muted/30 animate-pulse">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted/50 rounded w-1/2"></div>
              </div>
              <div className="h-6 bg-muted/50 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {(events as CryptoEvent[]).slice(0, 5).map((event) => (
        <div key={event.id} className="bg-muted/20 p-3 rounded-lg border border-muted/30 hover:bg-muted/30 transition-colors">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-medium">
                <a 
                  href={event.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  {event.title}
                </a>
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {formatEventDate(event.startDate, event.endDate)} • {event.location}
              </p>
            </div>
            <Badge variant={event.priority === 'high' ? 'default' : 'secondary'}>
              {getDaysUntilEvent(event.startDate)}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
};

// News Card Component  
const NewsCard = ({ item }: { item: NewsItem }) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-4">
      <div className="flex gap-4">
        {item.imageUrl && (
          <div className="flex-shrink-0">
            <img 
              src={item.imageUrl} 
              alt={item.title}
              className="w-20 h-20 object-cover rounded-lg"
            />
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              {item.title}
            </a>
          </h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {item.description}
          </p>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {item.source}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(item.publishedAt).toLocaleDateString()}
              </span>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Reddit Post Card Component
const RedditPostCard = ({ post }: { post: TwitterPost }) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-4">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={post.author.avatar} alt={post.author.displayName} />
          <AvatarFallback>{post.author.displayName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium">{post.author.displayName}</span>
            <span className="text-sm text-muted-foreground">u/{post.author.username}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(post.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-foreground mb-3">{post.text}</p>
          {post.imageUrl && (
            <div className="mb-3">
              <img 
                src={post.imageUrl} 
                alt="Post content" 
                className="w-full max-h-80 object-cover rounded-lg"
              />
            </div>
          )}
          {post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {post.hashtags.slice(0, 3).map((hashtag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {hashtag}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {post.metrics?.comments || 0}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              {post.metrics?.likes || 0}
            </span>
            {post.url && (
              <Button variant="ghost" size="sm" asChild>
                <a href={post.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Feed Skeleton Component
const FeedSkeleton = ({ count }: { count: number }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="flex gap-4 p-4">
          <div className="h-12 w-12 bg-muted rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </div>
      </div>
    ))}
  </>
);

const NewsFeed = () => {
  const [activeTab, setActiveTab] = useState("news");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // News data
  const { 
    data: rawNewsData, 
    isLoading: isLoadingNews, 
    refetch: refetchNews 
  } = useQuery({
    queryKey: ["/api/news", refreshTrigger],
    refetchOnWindowFocus: false,
    refetchInterval: 60000, // Refresh every minute
  });

  // Unwrap the {news: [...]} wrapper
  const newsItems = rawNewsData?.news || [];
  
  // Remove Twitter data queries since we're removing those sections
  
  // Filter news based on search query
  const filteredNews = (newsItems as NewsItem[])?.filter(item => 
    searchQuery === "" || 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.source.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    refetchNews();
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bitcoin News & Updates</h1>
          <p className="text-sm text-muted-foreground">
            Stay updated with the latest Bitcoin news and upcoming events
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} className="flex items-center">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Feed
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content */}
        <div className="lg:col-span-3">
          <Card className="border rounded-lg shadow-sm">
            <CardHeader className="pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search news articles..."
                  className="pl-9 bg-muted"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <Tabs defaultValue="news" className="w-full" value={activeTab} onValueChange={setActiveTab}>
                <div className="px-6 pt-2">
                  <TabsList className="w-full">
                    <TabsTrigger value="news" className="flex-1">
                      <Newspaper className="h-4 w-4 mr-2" />
                      News
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                {/* News Tab */}
                <TabsContent value="news" className="p-0">
                  <ScrollArea className="h-[800px]">
                    <div className="p-6 space-y-4">
                      {isLoadingNews ? (
                        <FeedSkeleton count={5} />
                      ) : filteredNews.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No news articles matching your search</p>
                        </div>
                      ) : (
                        filteredNews.map((item, index) => (
                          <div key={item.id}>
                            <NewsCard item={item} />
                            {index < filteredNews.length - 1 && <Separator className="my-4" />}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* HodlMyBeer Twitter Feed */}
          <TwitterFeed />
          
          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Upcoming Events
              </h3>
            </CardHeader>
            <CardContent>
              <UpcomingEvents />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NewsFeed;