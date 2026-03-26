import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, RotateCcw, Trophy, Coins } from 'lucide-react';

interface GameLevel {
  id: number;
  title: string;
  story: string;
  data: {
    title: string;
    stats: Array<{
      label: string;
      value: string;
      note: string;
    }>;
  };
  quiz: {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
    points: number;
  };
}

interface TreasureHuntGameProps {
  gameData: {
    levels: GameLevel[];
  };
  onBack: () => void;
}

export function TreasureHuntGame({ gameData, onBack, onComplete }: TreasureHuntGameProps) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  useEffect(() => {
    if (gameCompleted && onComplete) onComplete();
  }, [gameCompleted, onComplete]);
  const [levelCompleted, setLevelCompleted] = useState<boolean[]>([]);

  useEffect(() => {
    setLevelCompleted(new Array(gameData.levels.length).fill(false));
  }, [gameData.levels.length]);

  const currentLevelData = gameData.levels[currentLevel];
  const progress = ((currentLevel + 1) / gameData.levels.length) * 100;

  const handleAnswerSelect = (answerIndex: number) => {
    if (showExplanation) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    const isCorrect = selectedAnswer === currentLevelData.quiz.correct;
    
    if (isCorrect) {
      setTotalCoins(prev => prev + currentLevelData.quiz.points);
    } else {
      // Lose 5 coins for wrong answer (Fiat Trap)
      setTotalCoins(prev => Math.max(0, prev - 5));
    }

    const newCompleted = [...levelCompleted];
    newCompleted[currentLevel] = true;
    setLevelCompleted(newCompleted);
    
    setShowExplanation(true);
  };

  const handleNextLevel = () => {
    if (currentLevel < gameData.levels.length - 1) {
      setCurrentLevel(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setGameCompleted(true);
    }
  };

  const handlePrevLevel = () => {
    if (currentLevel > 0) {
      setCurrentLevel(prev => prev - 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const resetGame = () => {
    setCurrentLevel(0);
    setTotalCoins(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setGameCompleted(false);
    setLevelCompleted(new Array(gameData.levels.length).fill(false));
  };

  const getGameResult = () => {
    if (totalCoins >= 40) {
      return {
        title: "Treasure Master! 🏆",
        message: "You've secured an excellent Bitcoin legacy plan! With your treasure hunting skills, you can protect your family's wealth for generations.",
        recommendation: "Start with a 5% Bitcoin allocation and educate your family about sound money principles."
      };
    } else if (totalCoins >= 25) {
      return {
        title: "Skilled Hunter! 🎯",
        message: "Good progress! You understand Bitcoin's potential as a legacy tool, but there's room to grow your treasure.",
        recommendation: "Review the concepts and consider starting with a small Bitcoin position while learning more."
      };
    } else {
      return {
        title: "Novice Explorer 🗺️",
        message: "Keep exploring! Understanding Bitcoin as a legacy tool takes time, but every treasure hunter starts somewhere.",
        recommendation: "Study the economic history and start with Bitcoin education before making any investments."
      };
    }
  };

  if (gameCompleted) {
    const result = getGameResult();
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Trophy className="h-16 w-16 text-amber-600" />
            </div>
            <CardTitle className="text-3xl text-amber-800">{result.title}</CardTitle>
            <div className="flex items-center justify-center mt-4">
              <Coins className="h-6 w-6 text-amber-600 mr-2" />
              <span className="text-2xl font-bold text-amber-700">{totalCoins} Bitcoin Gold Coins</span>
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-lg text-amber-900 leading-relaxed">{result.message}</p>
            
            <div className="bg-white/50 rounded-lg p-4">
              <h3 className="font-semibold text-amber-800 mb-2">Recommended Next Steps:</h3>
              <p className="text-amber-700">{result.recommendation}</p>
            </div>

            <div className="flex justify-center space-x-4">
              <Button onClick={resetGame} variant="outline" className="border-amber-300">
                <RotateCcw className="mr-2 h-4 w-4" />
                Play Again
              </Button>
              <Button onClick={onBack} className="bg-amber-600 hover:bg-amber-700">
                Back to Learning
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Learning
        </Button>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
            <Coins className="mr-1 h-3 w-3" />
            {totalCoins} Coins
          </Badge>
          <Badge variant="outline">
            Level {currentLevel + 1} of {gameData.levels.length}
          </Badge>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Your Treasure Hunt Progress</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Level Content */}
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <CardHeader>
          <CardTitle className="text-xl text-amber-800">{currentLevelData.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Story */}
          <div className="bg-white/60 rounded-lg p-4">
            <p className="text-amber-900 leading-relaxed">{currentLevelData.story}</p>
          </div>

          {/* Data Display */}
          <div className="bg-white/80 rounded-lg p-4">
            <h3 className="font-semibold text-amber-800 mb-4">{currentLevelData.data.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {currentLevelData.data.stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl font-bold text-amber-700">{stat.value}</div>
                  <div className="text-sm font-medium text-amber-800">{stat.label}</div>
                  <div className="text-xs text-amber-600 mt-1">{stat.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quiz */}
          <div className="bg-white/80 rounded-lg p-4">
            <h3 className="font-semibold text-amber-800 mb-4">{currentLevelData.quiz.question}</h3>
            <div className="grid grid-cols-1 gap-3">
              {currentLevelData.quiz.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showExplanation}
                  className={`p-3 text-left rounded-lg border transition-all ${
                    selectedAnswer === index
                      ? showExplanation
                        ? index === currentLevelData.quiz.correct
                          ? 'bg-green-100 border-green-500 text-green-800'
                          : 'bg-red-100 border-red-500 text-red-800'
                        : 'bg-amber-100 border-amber-500 text-amber-800'
                      : showExplanation && index === currentLevelData.quiz.correct
                      ? 'bg-green-100 border-green-500 text-green-800'
                      : 'bg-white border-amber-200 text-amber-900 hover:bg-amber-50'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            {showExplanation && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-900">{currentLevelData.quiz.explanation}</p>
                {selectedAnswer === currentLevelData.quiz.correct ? (
                  <p className="text-green-700 font-medium mt-2">
                    +{currentLevelData.quiz.points} Bitcoin Gold Coins earned! 🪙
                  </p>
                ) : (
                  <p className="text-red-700 font-medium mt-2">
                    Fiat Trap! -5 Bitcoin Gold Coins lost. ⚠️
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between mt-6">
              <Button
                onClick={handlePrevLevel}
                disabled={currentLevel === 0}
                variant="outline"
                className="border-amber-300"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              {!showExplanation ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={selectedAnswer === null}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Submit Answer
                </Button>
              ) : (
                <Button
                  onClick={handleNextLevel}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {currentLevel === gameData.levels.length - 1 ? 'Complete Hunt' : 'Next Level'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}