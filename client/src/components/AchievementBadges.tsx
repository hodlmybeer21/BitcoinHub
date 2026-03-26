import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Flame, Star, TrendingUp, Zap, Target, Lock } from "lucide-react";

interface UserStats {
  userId: string;
  xp: number;
  level: number;
  satsEarned: number;
  streak: number;
  achievements: string[];
  gamesCompleted: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  xpBonus?: number;
}

const ALL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_game',
    name: 'First Steps',
    description: 'Complete your first game',
    icon: <Target className="h-5 w-5" />,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10 border-green-500/30',
    xpBonus: 100,
  },
  {
    id: 'streak_3',
    name: 'On Fire',
    description: '3 day streak',
    icon: <Flame className="h-5 w-5" />,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10 border-orange-500/30',
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7 day streak',
    icon: <Flame className="h-5 w-5" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-600/10 border-orange-600/30',
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: '30 day streak',
    icon: <Flame className="h-5 w-5" />,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10 border-red-500/30',
  },
  {
    id: 'all_simulations',
    name: 'Simulation Master',
    description: 'Complete all 13 simulations',
    icon: <TrendingUp className="h-5 w-5" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
    xpBonus: 1000,
  },
  {
    id: 'sats_100k',
    name: '100K Club',
    description: 'Earn 100,000 sats',
    icon: <span className="text-lg">₿</span>,
    color: 'text-[#F7931A]',
    bgColor: 'bg-[#F7931A]/10 border-[#F7931A]/30',
  },
  {
    id: 'level_5',
    name: 'Level Up',
    description: 'Reach level 5',
    icon: <Star className="h-5 w-5" />,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
    xpBonus: 200,
  },
];

export function AchievementBadges() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const { data: stats, isLoading } = useQuery<UserStats>({
    queryKey: ['/api/user-stats'],
    queryFn: async () => {
      const res = await fetch('/api/user-stats', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
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
            <p className="text-sm font-medium text-foreground">Sign in to earn achievements</p>
            <p className="text-xs text-muted-foreground">Complete games & maintain streaks</p>
          </div>
        </div>
      </Card>
    );
  }

  // Loading state
  if (isLoading || authLoading) {
    return (
      <div className="flex items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="w-12 h-12 rounded-xl bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const earnedAchievements = stats.achievements || [];
  const earnedCount = earnedAchievements.length;
  const totalCount = ALL_ACHIEVEMENTS.length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium text-foreground">Achievements</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {earnedCount}/{totalCount}
        </span>
      </div>

      {/* Achievement Badges Grid */}
      <div className="flex flex-wrap gap-2">
        {ALL_ACHIEVEMENTS.map((achievement) => {
          const isEarned = earnedAchievements.includes(achievement.id);
          
          return (
            <div
              key={achievement.id}
              className={`
                relative group
                w-12 h-12 rounded-xl
                flex items-center justify-center
                border-2 transition-all duration-200
                ${isEarned 
                  ? `${achievement.bgColor} ${achievement.color}` 
                  : 'bg-muted/50 border-muted/30 text-muted-foreground opacity-50'
                }
              `}
              title={isEarned ? `${achievement.name}: ${achievement.description}` : `${achievement.name}: Locked`}
            >
              {achievement.icon}
              
              {/* Tooltip on hover */}
              <div className={`
                absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                px-3 py-1.5 rounded-lg text-xs whitespace-nowrap
                opacity-0 group-hover:opacity-100 transition-opacity
                pointer-events-none z-10
                ${isEarned 
                  ? 'bg-card border border-muted/20 text-foreground shadow-lg' 
                  : 'bg-muted border border-muted/20 text-muted-foreground'
                }
              `}>
                <div className="font-medium">{achievement.name}</div>
                <div className="text-muted-foreground">{achievement.description}</div>
                {achievement.xpBonus && isEarned && (
                  <div className="text-[#F7931A] font-medium">+{achievement.xpBonus} XP</div>
                )}
                {!isEarned && (
                  <div className="text-muted-foreground/60">Locked</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
