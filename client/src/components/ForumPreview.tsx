import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ArrowUp } from "lucide-react";
import { ForumPost } from "@/lib/types";
import { formatRelativeTime, getUserInitials, truncateText } from "@/lib/utils";

const ForumPreview = () => {
  const { data: forumPosts, isLoading } = useQuery({
    queryKey: ["/api/forum/posts/latest"],
    refetchOnWindowFocus: false,
  });
  
  return (
    <Card className="bg-card shadow-lg overflow-hidden">
      <CardHeader className="py-4 px-6 border-b border-muted/50 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Community Forum</CardTitle>
        <Link href="/news">
          <a className="text-sm text-primary hover:underline">View All</a>
        </Link>
      </CardHeader>
      
      <CardContent className="p-6 space-y-5">
        {isLoading ? (
          <ForumPreviewSkeleton />
        ) : (
          <>
            {(forumPosts as ForumPost[])?.map((post, index) => (
              <div 
                key={post.id}
                className={`flex items-start space-x-4 ${
                  index < (forumPosts as ForumPost[]).length - 1 ? 'pb-5 border-b border-muted/50' : ''
                }`}
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                    {post.author.avatar ? (
                      <img 
                        src={post.author.avatar} 
                        alt={post.author.username} 
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <span className="text-foreground text-sm font-medium">
                        {getUserInitials(post.author.username)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{post.author.username}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(post.createdAt)}</p>
                  </div>
                  <h4 className="text-sm font-semibold text-foreground mt-1 hover:text-primary">
                    {post.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {truncateText(post.content, 120)}
                  </p>
                  <div className="flex items-center mt-2 space-x-4">
                    <button className="text-xs text-muted-foreground hover:text-primary flex items-center">
                      <MessageSquare className="h-3 w-3 mr-1" /> {post.commentCount}
                    </button>
                    <button className="text-xs text-muted-foreground hover:text-primary flex items-center">
                      <ArrowUp className="h-3 w-3 mr-1" /> {post.upvotes}
                    </button>
                    {post.categories.map((category) => (
                      <Badge 
                        key={category}
                        variant="secondary"
                        className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full"
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            
            <Link href="/news">
              <Button 
                variant="ghost" 
                className="w-full text-sm font-medium text-primary hover:text-foreground hover:bg-primary/10"
              >
                Join the Conversation
              </Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const ForumPreviewSkeleton = () => (
  <>
    {[1, 2].map((i) => (
      <div key={i} className="flex items-start space-x-4 pb-5 border-b border-muted/50">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-5 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-3 w-4/5 mb-3" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-4 w-12 rounded-full" />
            <Skeleton className="h-4 w-12 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
        </div>
      </div>
    ))}
    <Skeleton className="h-9 w-full rounded-md" />
  </>
);

export default ForumPreview;
