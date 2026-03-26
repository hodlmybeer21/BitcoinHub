import { useState, useEffect } from "react";
import { LearningPaths } from "@/components/LearningPaths";
import { UserStatsCard } from "@/components/UserStatsCard";
import { GraduationCap, Trophy, Clock, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Game difficulty mapping (matches the game types in the learning paths)
const GAME_DIFFICULTY: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
  // Beginner games
  'bitcoin-time-machine': 'beginner',
  'dollar-dilemma': 'beginner',
  // Intermediate games
  'bitcoin-boom-game': 'intermediate',
  'boomer-policy-simulator': 'intermediate',
  'millennial-escape-game': 'intermediate',
  'bitcoin-treasure-hunt': 'intermediate',
  'crypto-escape-room': 'intermediate',
  'bitcoin-quest-game': 'intermediate',
  'triffin-dilemma-quiz': 'intermediate',
  'bretton-woods-collapse-quiz': 'intermediate',
  // Advanced games
  'great-inflation-quiz': 'advanced',
  'historical-echoes-quiz': 'advanced',
  'fourth-turning-quiz': 'advanced',
};

export default function Learn() {
  const [completedGames, setCompletedGames] = useState<string[]>([]);
  const [totalGames, setTotalGames] = useState(13);
  const { isAuthenticated } = useAuth();

  // Load completed games from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bb_completed_games');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCompletedGames(parsed);
      }
    } catch {}
  }, []);

  const completedCount = completedGames.length;
  const progressPercent = totalGames > 0 ? Math.round((completedCount / totalGames) * 100) : 0;

  // Award XP when a game is completed
  const awardXP = async (gameId: string) => {
    if (!isAuthenticated) return;
    
    const gameType = GAME_DIFFICULTY[gameId] || 'beginner';
    
    try {
      const response = await fetch('/api/user-stats/xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ gameId, gameType }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('XP awarded:', data);
        
        // If there are new achievements, could show a notification here
        if (data.newAchievements?.length > 0) {
          console.log('New achievements unlocked:', data.newAchievements);
        }
      }
    } catch (error) {
      console.error('Failed to award XP:', error);
    }
  };

  // Update streak when user is active (on page load)
  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/user-stats/streak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      }).catch(console.error);
    }
  }, [isAuthenticated]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-muted/20 pb-6 mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-[#F7931A]/10">
                  <GraduationCap className="h-7 w-7 text-[#F7931A]" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Learning Center</h1>
                  <p className="text-muted-foreground text-sm mt-0.5">Interactive Bitcoin education — learn by doing, not reading.</p>
                </div>
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-card border border-muted/20 rounded-lg px-3 py-2">
                  <Trophy className="h-4 w-4 text-[#F7931A]" />
                  <span className="text-sm font-semibold text-foreground">{completedCount}/{totalGames}</span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">completed</span>
                </div>
                <div className="flex items-center gap-1.5 bg-card border border-muted/20 rounded-lg px-3 py-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-semibold text-foreground">{progressPercent}%</span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">mastery</span>
                </div>
                <div className="flex items-center gap-1.5 bg-card border border-muted/20 rounded-lg px-3 py-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-semibold text-foreground">13</span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">simulations</span>
                </div>
              </div>
              {completedCount === totalGames && totalGames > 0 && (
                <div className="flex items-center gap-2 bg-[#F7931A]/10 border border-[#F7931A]/30 rounded-lg px-3 py-2">
                  <Trophy className="h-4 w-4 text-[#F7931A]" />
                  <span className="text-sm font-semibold text-[#F7931A]">All complete!</span>
                </div>
              )}
            </div>
          </div>

          {/* User Stats Card - Gamification */}
          {isAuthenticated && (
            <div className="mt-4">
              <UserStatsCard />
            </div>
          )}
        </div>
      </header>

      {/* Progress bar */}
      <div className="border-b border-muted/20 bg-muted/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-4">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#F7931A] to-[#E67500] rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">{completedCount} of {totalGames} complete</span>
          </div>
        </div>
      </div>

      {/* Learning Paths */}
      <div className="flex-1">
        <LearningPaths 
          completedGames={completedGames}
          onGameComplete={(gameId: string) => {
            // Award XP if user is authenticated
            if (isAuthenticated) {
              awardXP(gameId);
            }
            
            if (!completedGames.includes(gameId)) {
              const updated = [...completedGames, gameId];
              setCompletedGames(updated);
              try {
                localStorage.setItem('bb_completed_games', JSON.stringify(updated));
              } catch {}
            }
          }}
        />
      </div>
    </div>
  );
}
