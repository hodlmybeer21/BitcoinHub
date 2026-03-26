import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Trophy, Target, Rocket, AlertCircle, CheckCircle, XCircle, TrendingUp, Users, BookOpen } from "lucide-react";

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

interface GameData {
  levels: GameLevel[];
}

interface MillennialEscapeGameProps {
  gameData: GameData;
  onBack: () => void;
  onComplete?: () => void;
}

export function MillennialEscapeGame({ gameData, onBack, onComplete }: MillennialEscapeGameProps) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [freedomScore, setFreedomScore] = useState(0);
  const [wealthHedgeMeter, setWealthHedgeMeter] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  useEffect(() => {
    if (gameCompleted && onComplete) onComplete();
  }, [gameCompleted, onComplete]);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());

  const level = gameData.levels[currentLevel];
  const totalLevels = gameData.levels.length;
  const progressPercentage = ((currentLevel + 1) / totalLevels) * 100;
  const maxScore = totalLevels * 10;

  // Update wealth hedge meter based on level progress
  const updateWealthHedge = (levelId: number) => {
    const hedgeIncrements = [10, 20, 30, 40]; // Percentage per level
    if (levelId <= hedgeIncrements.length) {
      setWealthHedgeMeter(hedgeIncrements[levelId - 1]);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    const isCorrect = selectedAnswer === level.quiz.correct;
    setShowResult(true);
    
    if (isCorrect && !answeredQuestions.has(currentLevel)) {
      setFreedomScore(prev => prev + level.quiz.points);
      setAnsweredQuestions(prev => new Set(prev).add(currentLevel));
    }
    
    // Update wealth hedge meter
    updateWealthHedge(level.id);
  };

  const handleNextLevel = () => {
    if (currentLevel < totalLevels - 1) {
      setCurrentLevel(currentLevel + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setGameCompleted(true);
    }
  };

  const handlePreviousLevel = () => {
    if (currentLevel > 0) {
      setCurrentLevel(currentLevel - 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const resetGame = () => {
    setCurrentLevel(0);
    setFreedomScore(0);
    setWealthHedgeMeter(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameCompleted(false);
    setAnsweredQuestions(new Set());
  };

  if (gameCompleted) {
    const freedomLevel = freedomScore >= 40 ? "Inflation Escaped!" : freedomScore >= 30 ? "Freedom Fighter" : freedomScore >= 20 ? "Hedge Builder" : "Getting Started";
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Learning Paths
          </Button>
        </div>

        <Card className="bg-white dark:bg-gray-900 border-2 border-cyan-300 dark:border-cyan-600">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <div className="relative">
                <Rocket className="h-16 w-16 text-cyan-600 mx-auto" />
                <TrendingUp className="h-6 w-6 text-orange-500 absolute -top-1 -right-1" />
              </div>
            </div>
            <CardTitle className="text-2xl text-cyan-700 dark:text-cyan-400 font-bold">
              Financial Freedom Mission Complete!
            </CardTitle>
            <p className="text-gray-700 dark:text-gray-300">
              You've built your path to escape inflation and achieve financial independence
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center items-center space-x-4">
                <Badge variant="outline" className="text-lg px-4 py-2 border-cyan-400">
                  <Trophy className="mr-2 h-5 w-5 text-cyan-600" />
                  Freedom Score: {freedomScore}/{maxScore}
                </Badge>
                <Badge variant="outline" className="text-lg px-4 py-2 border-orange-300">
                  <Target className="mr-2 h-5 w-5 text-orange-500" />
                  {freedomLevel}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <Card className="bg-cyan-50 dark:bg-gray-800 border-cyan-300 dark:border-cyan-600">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-8 w-8 text-cyan-600 mx-auto mb-2" />
                    <div className="font-bold text-lg text-cyan-700 dark:text-cyan-400">{wealthHedgeMeter}%</div>
                    <div className="text-sm text-gray-800 dark:text-gray-200">Wealth Hedge Meter</div>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50 dark:bg-gray-800 border-orange-300 dark:border-orange-600">
                  <CardContent className="p-4 text-center">
                    <Rocket className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <div className="font-bold text-lg text-orange-700 dark:text-orange-400">Ready</div>
                    <div className="text-sm text-gray-800 dark:text-gray-200">For Financial Freedom</div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto border border-cyan-200 dark:border-cyan-700">
                <h3 className="font-semibold mb-3 text-cyan-800 dark:text-cyan-300">Your Financial Freedom Action Plan:</h3>
                <div className="text-left space-y-2 text-sm text-gray-800 dark:text-gray-200">
                  <p>• <strong>Recognition:</strong> Understood how inflation erodes your purchasing power daily</p>
                  <p>• <strong>Education:</strong> Equipped to teach family about sound money vs fiat currency</p>
                  <p>• <strong>Investment:</strong> Learned to hedge with Bitcoin, real assets, and diversified portfolios</p>
                  <p>• <strong>Community:</strong> Ready to build collaborative tools and financial freedom networks</p>
                  <p>• <strong>Action:</strong> Start with 5-10% Bitcoin allocation, join local meetups, educate others</p>
                  <p>• <strong>Long-term:</strong> Build multiple income streams, create content, advocate for sound money</p>
                </div>
              </div>

              <div className="bg-cyan-50 dark:bg-gray-800 rounded-lg p-4 border border-cyan-300 dark:border-cyan-600">
                <h4 className="font-semibold text-cyan-800 dark:text-cyan-400 mb-2">Your Generation's Advantage:</h4>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  As a Millennial, you have time, technology, and community on your side. While Boomers created the 
                  fiat system's problems, your generation can adopt Bitcoin and sound money principles to build real, 
                  lasting wealth. Start small, stay consistent, and help others escape the inflation trap.
                </p>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <Button onClick={resetGame} variant="outline" className="border-cyan-400 text-cyan-700 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-900">
                <Rocket className="mr-2 h-4 w-4" />
                Restart Journey
              </Button>
              <Button onClick={onBack} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                Explore More Learning
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Learning Paths
        </Button>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="border-cyan-300">
            <Trophy className="mr-2 h-4 w-4 text-cyan-600" />
            Freedom: {freedomScore}/{maxScore}
          </Badge>
          <Badge variant="outline" className="border-orange-300">
            <TrendingUp className="mr-2 h-4 w-4 text-orange-500" />
            Hedge: {wealthHedgeMeter}%
          </Badge>
        </div>
      </div>

      {/* Progress Header */}
      <Card className="bg-white dark:bg-gray-900 border-cyan-300 dark:border-cyan-600">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-cyan-700 dark:text-cyan-400 font-bold">
              Millennial Inflation Escape: Building Your Path to Financial Freedom
            </CardTitle>
            <div className="text-right text-sm text-gray-600 dark:text-gray-400">
              <div>Progress: {Math.round(progressPercentage)}%</div>
              <Progress value={progressPercentage} className="w-32 h-2 mt-1" />
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Navigate modern financial challenges and build wealth despite currency debasement
          </p>
        </CardHeader>
      </Card>

      {/* Current Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-cyan-50 dark:bg-gray-800 border-cyan-300 dark:border-cyan-600">
          <CardContent className="p-4 text-center">
            <Trophy className="h-6 w-6 text-cyan-600 mx-auto mb-1" />
            <div className="font-bold text-cyan-700 dark:text-cyan-400">{freedomScore} pts</div>
            <div className="text-xs text-gray-700 dark:text-gray-300">Freedom Score</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 dark:bg-gray-800 border-orange-300 dark:border-orange-600">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-orange-600 mx-auto mb-1" />
            <div className="font-bold text-orange-700 dark:text-orange-400">{wealthHedgeMeter}%</div>
            <div className="text-xs text-gray-700 dark:text-gray-300">Wealth Hedge</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600">
          <CardContent className="p-4 text-center">
            <Rocket className="h-6 w-6 text-gray-600 mx-auto mb-1" />
            <div className="font-bold text-gray-700 dark:text-gray-400">Level {currentLevel + 1}</div>
            <div className="text-xs text-gray-700 dark:text-gray-300">Current Stage</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-cyan-300 dark:border-cyan-600 bg-white dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-lg text-cyan-700 dark:text-cyan-400 flex items-center">
            <Rocket className="mr-2 h-5 w-5" />
            {level.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-cyan-300 dark:border-cyan-600">
            <p className="leading-relaxed text-gray-800 dark:text-gray-200">{level.story}</p>
          </div>

          <div>
            <h4 className="font-semibold mb-3 flex items-center text-orange-700 dark:text-orange-400">
              <TrendingUp className="mr-2 h-4 w-4" />
              {level.data.title}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {level.data.stats.map((stat, index) => (
                <Card key={index} className="border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-gray-800">
                  <CardContent className="p-4 text-center">
                    <div className="font-bold text-lg text-orange-700 dark:text-orange-400">{stat.value}</div>
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{stat.label}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{stat.note}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold flex items-center text-cyan-700 dark:text-cyan-400">
              <AlertCircle className="mr-2 h-4 w-4" />
              Freedom Builder Quiz: {level.quiz.question}
            </h4>
            
            <div className="grid grid-cols-1 gap-3">
              {level.quiz.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showResult}
                  className={`p-3 text-left rounded-lg border-2 transition-all ${
                    selectedAnswer === index
                      ? showResult
                        ? index === level.quiz.correct
                          ? 'border-green-500 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
                          : 'border-red-500 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'
                        : 'border-cyan-500 bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-300'
                      : showResult && index === level.quiz.correct
                      ? 'border-green-500 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
                      : 'border-gray-300 dark:border-gray-600 hover:border-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <div className="flex items-center">
                    {showResult && (
                      <div className="mr-3">
                        {index === level.quiz.correct ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : selectedAnswer === index ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <div className="h-4 w-4" />
                        )}
                      </div>
                    )}
                    <span>{option}</span>
                  </div>
                </button>
              ))}
            </div>

            {showResult && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-cyan-300 dark:border-cyan-600">
                <div className="flex items-start space-x-3">
                  {selectedAnswer === level.quiz.correct ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {selectedAnswer === level.quiz.correct ? 'Financial freedom unlocked!' : 'Keep building your knowledge...'}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{level.quiz.explanation}</p>
                    {selectedAnswer === level.quiz.correct && !answeredQuestions.has(currentLevel) && (
                      <Badge variant="outline" className="mt-2 border-cyan-400 text-cyan-700 dark:text-cyan-400">
                        <Rocket className="mr-1 h-3 w-3" />
                        +{level.quiz.points} Freedom Points
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePreviousLevel}
              disabled={currentLevel === 0}
              className="border-cyan-400 text-cyan-700 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous Level
            </Button>

            {!showResult ? (
              <Button 
                onClick={handleSubmitAnswer} 
                disabled={selectedAnswer === null}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                Submit Answer
              </Button>
            ) : (
              <Button 
                onClick={handleNextLevel}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {currentLevel < totalLevels - 1 ? (
                  <>
                    Next Level
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  'Complete Mission'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}