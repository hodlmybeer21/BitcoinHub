import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, RotateCcw, Trophy, Key, Lock } from 'lucide-react';

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

interface EscapeRoomGameProps {
  gameData: {
    levels: GameLevel[];
  };
  onBack: () => void;
}

export function EscapeRoomGame({ gameData, onBack, onComplete }: EscapeRoomGameProps) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [totalKeys, setTotalKeys] = useState(0);
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
      setTotalKeys(prev => prev + currentLevelData.quiz.points);
    } else {
      // Lose 5 keys for wrong answer (Fiat Trap)
      setTotalKeys(prev => Math.max(0, prev - 5));
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
    setTotalKeys(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setGameCompleted(false);
    setLevelCompleted(new Array(gameData.levels.length).fill(false));
  };

  const getGameResult = () => {
    if (totalKeys >= 35) {
      return {
        title: "Freedom Achieved! 🎉",
        message: "You've successfully escaped the Fiat Prison! Your diversified strategy of crypto, skills, and community will build lasting wealth.",
        recommendation: "Execute your plan: 5% Bitcoin allocation, develop your side hustle, and build your financial community."
      };
    } else if (totalKeys >= 20) {
      return {
        title: "Partial Escape! 🔓",
        message: "You're breaking free but need to strengthen your strategy. You understand the problems but need more solutions.",
        recommendation: "Focus on building one area first - start with Bitcoin education and a small allocation."
      };
    } else {
      return {
        title: "Still Trapped 🔐",
        message: "The Fiat Prison still holds you, but awareness is the first step to freedom. Keep learning and building skills.",
        recommendation: "Start with basic Bitcoin education and connect with other Millennials facing similar challenges."
      };
    }
  };

  if (gameCompleted) {
    const result = getGameResult();
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              {totalKeys >= 35 ? (
                <Trophy className="h-16 w-16 text-indigo-600" />
              ) : totalKeys >= 20 ? (
                <Key className="h-16 w-16 text-indigo-600" />
              ) : (
                <Lock className="h-16 w-16 text-indigo-600" />
              )}
            </div>
            <CardTitle className="text-3xl text-indigo-800">{result.title}</CardTitle>
            <div className="flex items-center justify-center mt-4">
              <Key className="h-6 w-6 text-indigo-600 mr-2" />
              <span className="text-2xl font-bold text-indigo-700">{totalKeys} Freedom Keys</span>
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-lg text-indigo-900 leading-relaxed">{result.message}</p>
            
            <div className="bg-white/50 rounded-lg p-4">
              <h3 className="font-semibold text-indigo-800 mb-2">Your Next Steps to Freedom:</h3>
              <p className="text-indigo-700">{result.recommendation}</p>
            </div>

            <div className="bg-white/50 rounded-lg p-4">
              <h3 className="font-semibold text-indigo-800 mb-2">Escape Plan Summary:</h3>
              <div className="text-sm text-indigo-700 space-y-1">
                <p>• Bitcoin allocation for inflation protection</p>
                <p>• Side hustle development for extra income</p>
                <p>• Community building for shared knowledge</p>
                <p>• Continuous learning and skill development</p>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <Button onClick={resetGame} variant="outline" className="border-indigo-300">
                <RotateCcw className="mr-2 h-4 w-4" />
                Try Escape Again
              </Button>
              <Button onClick={onBack} className="bg-indigo-600 hover:bg-indigo-700">
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
          <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-300">
            <Key className="mr-1 h-3 w-3" />
            {totalKeys} Keys
          </Badge>
          <Badge variant="outline">
            Room {currentLevel + 1} of {gameData.levels.length}
          </Badge>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Escape Progress</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Level Content */}
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="text-xl text-indigo-800">{currentLevelData.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Story */}
          <div className="bg-white/60 rounded-lg p-4 border-l-4 border-indigo-400">
            <p className="text-indigo-900 leading-relaxed">{currentLevelData.story}</p>
          </div>

          {/* Data Display */}
          <div className="bg-white/80 rounded-lg p-4">
            <h3 className="font-semibold text-indigo-800 mb-4">{currentLevelData.data.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {currentLevelData.data.stats.map((stat, index) => (
                <div key={index} className="text-center bg-white/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-indigo-700">{stat.value}</div>
                  <div className="text-sm font-medium text-indigo-800">{stat.label}</div>
                  <div className="text-xs text-indigo-600 mt-1">{stat.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quiz */}
          <div className="bg-white/80 rounded-lg p-4">
            <h3 className="font-semibold text-indigo-800 mb-4 flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              {currentLevelData.quiz.question}
            </h3>
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
                        : 'bg-indigo-100 border-indigo-500 text-indigo-800'
                      : showExplanation && index === currentLevelData.quiz.correct
                      ? 'bg-green-100 border-green-500 text-green-800'
                      : 'bg-white border-indigo-200 text-indigo-900 hover:bg-indigo-50'
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
                  <p className="text-green-700 font-medium mt-2 flex items-center">
                    <Key className="h-4 w-4 mr-1" />
                    +{currentLevelData.quiz.points} Freedom Keys earned! Door unlocked!
                  </p>
                ) : (
                  <p className="text-red-700 font-medium mt-2 flex items-center">
                    <Lock className="h-4 w-4 mr-1" />
                    Fiat Trap! -5 Freedom Keys lost. Still trapped!
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between mt-6">
              <Button
                onClick={handlePrevLevel}
                disabled={currentLevel === 0}
                variant="outline"
                className="border-indigo-300"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous Room
              </Button>

              {!showExplanation ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={selectedAnswer === null}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Solve Puzzle
                </Button>
              ) : (
                <Button
                  onClick={handleNextLevel}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {currentLevel === gameData.levels.length - 1 ? 'Attempt Escape' : 'Next Room'}
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