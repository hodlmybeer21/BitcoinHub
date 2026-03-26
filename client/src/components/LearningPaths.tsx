import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, Play, CheckCircle, ArrowRight, Gamepad2, Zap, Brain, TrendingUp, ChevronRight } from 'lucide-react';
import { DollarDilemmaGame } from "./DollarDilemmaGame";
import { BitcoinTimeMachine } from "./BitcoinTimeMachine";
import { BitcoinBoomGame } from "./BitcoinBoomGame";
import { PolicySimulatorGame } from "./PolicySimulatorGame";
import { MillennialEscapeGame } from "./MillennialEscapeGame";
import { TreasureHuntGame } from "./TreasureHuntGame";
import { EscapeRoomGame } from "./EscapeRoomGame";
import { BitcoinQuestGame } from "./BitcoinQuestGame";
import { TriffinDilemmaGame } from "./TriffinDilemmaGame";
import { BrettonWoodsGame } from "./BrettonWoodsGame";
import { GreatInflationGame } from "./GreatInflationGame";
import { HistoricalEchoesGame } from "./HistoricalEchoesGame";
import { FourthTurningGame } from "./FourthTurningGame";

interface LearningPath {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  icon: string;
  estimatedTime: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: 'simulation' | 'quiz' | 'adventure';
  lessons?: any[];
  isGame?: boolean;
  gameData?: any;
}

interface LearningPathsData {
  [key: string]: LearningPath;
}

interface LearningPathsProps {
  completedGames: string[];
  onGameComplete: (gameId: string) => void;
}

const GAME_ICONS: Record<string, string> = {
  'bitcoin-time-machine': '⏳',
  'bitcoin-boom-game': '📈',
  'boomer-policy-simulator': '🏛️',
  'millennial-escape-game': '🏃',
  'bitcoin-treasure-hunt': '💎',
  'crypto-escape-room': '🔐',
  'bitcoin-quest-game': '🗺️',
  'triffin-dilemma-quiz': '⚖️',
  'bretton-woods-collapse-quiz': '💰',
  'great-inflation-quiz': '📉',
  'historical-echoes-quiz': '🔁',
  'fourth-turning-quiz': '🔄',
  'dollar-dilemma': '💸',
};

const CATEGORY_DESCRIPTIONS: Record<string, { title: string; desc: string; icon: any }> = {
  simulation: { title: 'Interactive Simulations', desc: 'Play through economic scenarios and watch the math unfold in real time.', icon: TrendingUp },
  adventure: { title: 'Story Adventures', desc: 'Escape rooms, treasure hunts, and quests that teach through narrative.', icon: Zap },
  quiz: { title: 'Knowledge Quizzes', desc: 'Test what you know and walk away with real understanding of monetary history.', icon: Brain },
};

export function LearningPaths({ completedGames, onGameComplete }: LearningPathsProps) {
  const [activeView, setActiveView] = useState<'paths' | 'path-details' | 'game'>('paths');
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);

  const { data: pathsData, isLoading } = useQuery<LearningPathsData>({
    queryKey: ['/api/learning/paths'],
    refetchOnWindowFocus: false
  });

  const handlePathSelect = (pathId: string) => {
    if (!pathsData) return;
    const path = Object.values(pathsData).find(p => p.id === pathId);
    if (path) {
      setSelectedPath(path);
      setActiveView(path.isGame ? 'game' : 'path-details');
    }
  };

  const handleBackToPaths = () => {
    setActiveView('paths');
    setSelectedPath(null);
    setCurrentLessonIndex(0);
  };

  const handleStartLesson = (lessonIndex: number) => setCurrentLessonIndex(lessonIndex);

  // ─── LOADING ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse bg-card border-muted/20">
              <CardContent className="p-6 space-y-3">
                <div className="h-14 w-14 bg-muted rounded-xl animate-pulse" />
                <div className="h-5 bg-muted rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                <div className="h-16 bg-muted rounded animate-pulse" />
                <div className="h-9 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!pathsData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-muted-foreground">Loading learning paths...</p>
      </div>
    );
  }

  const allPaths = Object.values(pathsData);
  const completedSet = new Set(completedGames);

  // Group by category
  const byCategory = allPaths.reduce((acc, path) => {
    const cat = path.category || 'simulation';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(path);
    return acc;
  }, {} as Record<string, LearningPath[]>);

  const categories = Object.keys(byCategory);

  // ─── GAME VIEW ──────────────────────────────────────────────
  if (activeView === 'game' && selectedPath?.isGame) {
    const gameComponents: Record<string, any> = {
      'bitcoin-time-machine': BitcoinTimeMachine,
      'bitcoin-boom-game': BitcoinBoomGame,
      'boomer-policy-simulator': PolicySimulatorGame,
      'millennial-escape-game': MillennialEscapeGame,
      'bitcoin-treasure-hunt': TreasureHuntGame,
      'crypto-escape-room': EscapeRoomGame,
      'bitcoin-quest-game': BitcoinQuestGame,
      'triffin-dilemma-quiz': TriffinDilemmaGame,
      'bretton-woods-collapse-quiz': BrettonWoodsGame,
      'great-inflation-quiz': GreatInflationGame,
      'historical-echoes-quiz': HistoricalEchoesGame,
      'fourth-turning-quiz': FourthTurningGame,
    };
    const GameComponent = gameComponents[selectedPath.id] || DollarDilemmaGame;
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button onClick={handleBackToPaths} className="hover:text-foreground transition-colors flex items-center gap-1">
              ← Back to Learning Center
            </button>
          </div>
          {completedSet.has(selectedPath.id) && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-3 py-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-500">Completed</span>
            </div>
          )}
        </div>
        <GameComponent
          gameData={selectedPath.gameData}
          onBack={handleBackToPaths}
          onComplete={() => onGameComplete(selectedPath.id)}
        />
      </div>
    );
  }

  // ─── PATH DETAILS VIEW ─────────────────────────────────────
  if (activeView === 'path-details' && selectedPath && !selectedPath.isGame) {
    const completedLessons = selectedPath.lessons?.filter(l => l.completed).length || 0;
    const totalLessons = selectedPath.lessons?.length || 0;
    const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Button variant="outline" onClick={handleBackToPaths} className="text-sm">
          ← Back to Learning Center
        </Button>

        <Card className="bg-card border-muted/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="outline" className="mb-2 text-xs">{selectedPath.category}</Badge>
                <CardTitle className="text-2xl">{selectedPath.title}</CardTitle>
                <p className="text-muted-foreground text-sm mt-1">{selectedPath.subtitle}</p>
                <p className="text-muted-foreground mt-3">{selectedPath.description}</p>
              </div>
              <div className={`p-4 rounded-2xl ${selectedPath.color} text-4xl shadow-lg`}>
                {selectedPath.icon}
              </div>
            </div>
            <div className="flex items-center gap-3 pt-4 flex-wrap">
              <Badge variant="outline" className="text-xs">
                <Clock className="mr-1 h-3 w-3" />
                {selectedPath.estimatedTime}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {selectedPath.difficulty}
              </Badge>
              {totalLessons > 0 && (
                <Badge variant="outline" className="text-xs">
                  <BookOpen className="mr-1 h-3 w-3" />
                  {totalLessons} lessons
                </Badge>
              )}
            </div>
            {totalLessons > 0 && (
              <div className="space-y-2 pt-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            )}
          </CardHeader>
        </Card>
      </div>
    );
  }

  // ─── MAIN PATHS VIEW ──────────────────────────────────────
  const renderPathCard = (path: LearningPath) => {
    const isCompleted = completedSet.has(path.id);
    return (
      <Card 
        key={path.id}
        className={`bg-card border-muted/20 hover:border-[#F7931A]/40 hover:shadow-lg hover:shadow-[#F7931A]/5 transition-all duration-200 group cursor-pointer relative overflow-hidden ${
          isCompleted ? 'ring-2 ring-green-500/30' : ''
        }`}
        onClick={() => handlePathSelect(path.id)}
      >
        {isCompleted && (
          <div className="absolute top-3 right-3">
            <div className="flex items-center gap-1 bg-green-500/10 border border-green-500/30 rounded-full px-2 py-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="text-xs font-medium text-green-500">Done</span>
            </div>
          </div>
        )}

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between mb-3">
            <div className={`p-3 rounded-xl ${path.color} text-2xl shadow-lg group-hover:scale-105 transition-transform`}>
              {path.icon}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="outline" className="text-[10px] bg-background">
                {path.difficulty}
              </Badge>
              <Badge variant="outline" className="text-[10px] bg-background">
                <Clock className="mr-0.5 h-2.5 w-2.5 inline" />
                {path.estimatedTime}
              </Badge>
            </div>
          </div>
          <CardTitle className="text-lg leading-tight">{path.title}</CardTitle>
          <p className="text-xs font-medium text-[#F7931A] mt-1">{path.subtitle}</p>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {path.description}
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-muted/10">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gamepad2 className="h-3.5 w-3.5" />
              <span>Interactive {path.category}</span>
            </div>
            <Button 
              size="sm" 
              className="h-8 text-xs bg-[#F7931A] hover:bg-[#E67500] text-white group-hover:gap-1.5 transition-all"
            >
              {isCompleted ? 'Play Again' : 'Start'}
              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Tabs by category */}
      <Tabs defaultValue={categories[0]} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <TabsList className="bg-card border border-muted/20">
            {categories.map(cat => {
              const catInfo = CATEGORY_DESCRIPTIONS[cat] || { title: cat };
              const Icon = catInfo.icon || BookOpen;
              const count = byCategory[cat]?.length || 0;
              const done = byCategory[cat]?.filter(p => completedSet.has(p.id)).length || 0;
              return (
                <TabsTrigger 
                  key={cat} 
                  value={cat}
                  className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:bg-[#F7931A] data-[state=active]:text-white"
                >
                  <Icon className="h-3.5 w-3.5 hidden sm:inline" />
                  {catInfo.title}
                  <span className="ml-1 text-[10px] opacity-60">({done}/{count})</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {categories.map(cat => {
          const catInfo = CATEGORY_DESCRIPTIONS[cat] || { title: cat, desc: '', icon: BookOpen };
          const paths = byCategory[cat] || [];
          return (
            <TabsContent key={cat} value={cat} className="space-y-4">
              {/* Category header */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#F7931A]/10">
                  <catInfo.icon className="h-5 w-5 text-[#F7931A]" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">{catInfo.title}</h2>
                  <p className="text-sm text-muted-foreground">{catInfo.desc}</p>
                </div>
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {paths.map(renderPathCard)}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
