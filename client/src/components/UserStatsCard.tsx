import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap, Flame, Award, Star, Lock } from "lucide-react";

interface UserStats {
  userId: string;
  xp: number;
  level: number;
  satsEarned: number;
  streak: number;
  lastActivityDate: string;
  achievements: string[];
  gamesCompleted: number;
  totalPlayTime: number;
  xpProgress: number;
  xpNeeded: number;
  xpForNextLevel: number;
}

export function UserStatsCard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const { data: stats, isLoading } = useQuery<UserStats>({
    queryKey: ['/api/user-stats'],
    queryFn: async () => {
      const res = await fetch('/api/user-stats', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Not logged in state
  if (!isAuthenticated && !authLoading) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-muted/20 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Sign in to track your progress</p>
            <p className="text-xs text-muted-foreground">XP, levels, streaks & achievements</p>
          </div>
        </div>
      </Card>
    );
  }

  // Loading state
  if (isLoading || authLoading) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-muted/20 p-4">
        <div className="animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="space-y-1.5">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full" />
        </div>
      </Card>
    );
  }

  if (!stats) return null;

  const progressPercent = stats.xpNeeded > 0 
    ? Math.min(100, Math.round((stats.xpProgress / stats.xpNeeded) * 100))
    : 100;

  // Level badge color based on level ranges
  const getLevelColor = (level: number) => {
    if (level >= 40) return "from-purple-500 to-pink-500";
    if (level >= 30) return "from-red-500 to-orange-500";
    if (level >= 20) return "from-orange-500 to-amber-500";
    if (level >= 10) return "from-amber-500 to-yellow-500";
    return "from-[#F7931A] to-[#E67500]";
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-muted/20 p-4 hover:border-[#F7931A]/30 transition-colors">
      <div className="flex items-center gap-4">
        {/* Level Badge */}
        <div className="relative">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getLevelColor(stats.level)} flex items-center justify-center shadow-lg`}
               style={{
                 boxShadow: "0 0 20px rgba(247, 147, 26, 0.3)",
               }}
          >
            <span className="text-lg font-bold text-white">{stats.level}</span>
          </div>
          <div className="absolute -bottom-1 -right-1">
            <Star className="h-4 w-4 text-[#F7931A] fill-[#F7931A]" />
          </div>
        </div>

        {/* XP Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-[#F7931A]" />
              <span className="text-sm font-semibold text-foreground">
                {stats.xp.toLocaleString()} XP
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Lvl {stats.level + 1}: {stats.xpNeeded - stats.xpProgress} XP
            </span>
          </div>
          <Progress 
            value={progressPercent} 
            className="h-2 bg-muted"
          />
        </div>

        {/* Stats Grid */}
        <div className="flex items-center gap-3">
          {/* Sats */}
          <div className="flex items-center gap-1.5 bg-[#F7931A]/10 px-2.5 py-1.5 rounded-lg border border-[#F7931A]/20">
            <span className="text-sm">₿</span>
            <span className="text-sm font-semibold text-[#F7931A]">
              {stats.satsEarned >= 1000000 
                ? `${(stats.satsEarned / 1000000).toFixed(1)}M` 
                : stats.satsEarned >= 1000 
                  ? `${(stats.satsEarned / 1000).toFixed(0)}K` 
                  : stats.satsEarned}
            </span>
          </div>

          {/* Streak */}
          <div className="flex items-center gap-1.5 bg-orange-500/10 px-2.5 py-1.5 rounded-lg border border-orange-500/20">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold text-orange-500">
              {stats.streak}
            </span>
          </div>

          {/* Achievements */}
          <div className="flex items-center gap-1.5 bg-purple-500/10 px-2.5 py-1.5 rounded-lg border border-purple-500/20">
            <Award className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-semibold text-purple-500">
              {stats.achievements.length}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
