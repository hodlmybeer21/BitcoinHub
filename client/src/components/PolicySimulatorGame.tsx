import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Trophy, Target, DollarSign, AlertCircle, CheckCircle, XCircle, Building, TrendingDown } from "lucide-react";

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

interface PolicySimulatorGameProps {
  gameData: GameData;
  onBack: () => void;
  onComplete?: () => void;
}

export function PolicySimulatorGame({ gameData, onBack, onComplete }: PolicySimulatorGameProps) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [insightScore, setInsightScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  useEffect(() => {
    if (gameCompleted && onComplete) onComplete();
  }, [gameCompleted, onComplete]);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [totalDebt, setTotalDebt] = useState(0.26); // Starting 1945 debt in trillions
  const [inflationImpact, setInflationImpact] = useState(0); // Cumulative inflation impact

  const level = gameData.levels[currentLevel];
  const totalLevels = gameData.levels.length;
  const progressPercentage = ((currentLevel + 1) / totalLevels) * 100;
  const maxScore = totalLevels * 10;

  // Simulate debt/inflation increases based on level
  const updateMetrics = (levelId: number) => {
    const debtIncrements = [0.04, 0.25, 0.5, 2.0, 10.0, 0]; // Trillions per level
    const inflationIncrements = [5, 20, 40, 10, 200, 0]; // Percentage points per level
    
    if (levelId <= debtIncrements.length) {
      setTotalDebt(prev => prev + debtIncrements[levelId - 1]);
      setInflationImpact(prev => prev + inflationIncrements[levelId - 1]);
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
      setInsightScore(prev => prev + level.quiz.points);
      setAnsweredQuestions(prev => new Set(prev).add(currentLevel));
    }
    
    // Update debt and inflation metrics
    updateMetrics(level.id);
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
    setInsightScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameCompleted(false);
    setAnsweredQuestions(new Set());
    setTotalDebt(0.26);
    setInflationImpact(0);
  };

  if (gameCompleted) {
    const awarenessLevel = insightScore >= 50 ? "Policy Awakened" : insightScore >= 40 ? "System Aware" : insightScore >= 30 ? "Pattern Spotter" : "Getting Started";
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Learning Paths
          </Button>
        </div>

        <Card className="bg-white dark:bg-gray-900 border-2 border-red-300 dark:border-red-600">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <div className="relative">
                <Building className="h-16 w-16 text-red-600 mx-auto" />
                <TrendingDown className="h-6 w-6 text-orange-500 absolute -top-1 -right-1" />
              </div>
            </div>
            <CardTitle className="text-2xl text-red-700 dark:text-red-400 font-bold">
              Policy Simulation Complete
            </CardTitle>
            <p className="text-gray-700 dark:text-gray-300">
              You've experienced the financial consequences of historical policy decisions
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center items-center space-x-4">
                <Badge variant="outline" className="text-lg px-4 py-2 border-red-400">
                  <Trophy className="mr-2 h-5 w-5 text-red-600" />
                  Insight Score: {insightScore}/{maxScore}
                </Badge>
                <Badge variant="outline" className="text-lg px-4 py-2 border-orange-300">
                  <Target className="mr-2 h-5 w-5 text-orange-500" />
                  {awarenessLevel}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <Card className="bg-red-50 dark:bg-gray-800 border-red-300 dark:border-red-600">
                  <CardContent className="p-4 text-center">
                    <DollarSign className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <div className="font-bold text-lg text-red-700 dark:text-red-400">${totalDebt.toFixed(1)}T</div>
                    <div className="text-sm text-gray-800 dark:text-gray-200">Final National Debt</div>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50 dark:bg-gray-800 border-orange-300 dark:border-orange-600">
                  <CardContent className="p-4 text-center">
                    <TrendingDown className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <div className="font-bold text-lg text-orange-700 dark:text-orange-400">{inflationImpact}%+</div>
                    <div className="text-sm text-gray-800 dark:text-gray-200">Purchasing Power Lost</div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto border border-red-200 dark:border-red-700">
                <h3 className="font-semibold mb-3 text-red-800 dark:text-red-300">Your Policy Decisions Timeline:</h3>
                <div className="text-left space-y-2 text-sm text-gray-800 dark:text-gray-200">
                  <p>• <strong>1948-50s:</strong> Marshall Plan & Cold War - Started debt-funded spending</p>
                  <p>• <strong>1965-73:</strong> Vietnam War - Massive deficit spending, early inflation</p>
                  <p>• <strong>1971:</strong> Nixon Shock - Ended gold standard, enabled unlimited printing</p>
                  <p>• <strong>2008:</strong> Bank Bailouts - Asset inflation, widened wealth gaps</p>
                  <p>• <strong>2001-2025:</strong> Wars & COVID - Final debt explosion, 9% inflation peak</p>
                  <p>• <strong>Bitcoin Alternative:</strong> Fixed supply could have prevented monetary debasement</p>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-gray-800 rounded-lg p-4 border border-red-300 dark:border-red-600">
                <h4 className="font-semibold text-red-800 dark:text-red-400 mb-2">The Generational Impact:</h4>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  Each policy decision that seemed necessary at the time created cumulative debt and inflation 
                  that eroded your children's purchasing power. Bitcoin's fixed supply offers a different path - 
                  one where governments can't inflate away their spending, preserving wealth across generations.
                </p>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <Button onClick={resetGame} variant="outline" className="border-red-400 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900">
                <Building className="mr-2 h-4 w-4" />
                Replay Decisions
              </Button>
              <Button onClick={onBack} className="bg-red-600 hover:bg-red-700 text-white">
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
          <Badge variant="outline" className="border-red-300">
            <Trophy className="mr-2 h-4 w-4 text-red-600" />
            Insights: {insightScore}/{maxScore}
          </Badge>
          <Badge variant="outline" className="border-orange-300">
            <DollarSign className="mr-2 h-4 w-4 text-orange-500" />
            Debt: ${totalDebt.toFixed(1)}T
          </Badge>
        </div>
      </div>

      {/* Progress Header */}
      <Card className="bg-white dark:bg-gray-900 border-red-300 dark:border-red-600">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-red-700 dark:text-red-400 font-bold">
              Boomer Policy Simulator: Dollars, Decisions, and Descendants
            </CardTitle>
            <div className="text-right text-sm text-gray-600 dark:text-gray-400">
              <div>Progress: {Math.round(progressPercentage)}%</div>
              <Progress value={progressPercentage} className="w-32 h-2 mt-1" />
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Experience the policy decisions you supported and their impact on your children's generation
          </p>
        </CardHeader>
      </Card>

      {/* Current Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-red-50 dark:bg-gray-800 border-red-300 dark:border-red-600">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 text-red-600 mx-auto mb-1" />
            <div className="font-bold text-red-700 dark:text-red-400">${totalDebt.toFixed(2)}T</div>
            <div className="text-xs text-gray-700 dark:text-gray-300">National Debt</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 dark:bg-gray-800 border-orange-300 dark:border-orange-600">
          <CardContent className="p-4 text-center">
            <TrendingDown className="h-6 w-6 text-orange-600 mx-auto mb-1" />
            <div className="font-bold text-orange-700 dark:text-orange-400">{inflationImpact}%</div>
            <div className="text-xs text-gray-700 dark:text-gray-300">Dollar Value Lost</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600">
          <CardContent className="p-4 text-center">
            <Building className="h-6 w-6 text-gray-600 mx-auto mb-1" />
            <div className="font-bold text-gray-700 dark:text-gray-400">Level {currentLevel + 1}</div>
            <div className="text-xs text-gray-700 dark:text-gray-300">Policy Decision</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-red-300 dark:border-red-600 bg-white dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-lg text-red-700 dark:text-red-400 flex items-center">
            <Building className="mr-2 h-5 w-5" />
            {level.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-red-300 dark:border-red-600">
            <p className="leading-relaxed text-gray-800 dark:text-gray-200">{level.story}</p>
          </div>

          <div>
            <h4 className="font-semibold mb-3 flex items-center text-orange-700 dark:text-orange-400">
              <DollarSign className="mr-2 h-4 w-4" />
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
            <h4 className="font-semibold flex items-center text-red-700 dark:text-red-400">
              <AlertCircle className="mr-2 h-4 w-4" />
              Policy Decision Quiz: {level.quiz.question}
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
                        : 'border-red-500 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'
                      : showResult && index === level.quiz.correct
                      ? 'border-green-500 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
                      : 'border-gray-300 dark:border-gray-600 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200'
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
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-red-300 dark:border-red-600">
                <div className="flex items-start space-x-3">
                  {selectedAnswer === level.quiz.correct ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {selectedAnswer === level.quiz.correct ? 'Policy insight gained!' : 'Consider the generational impact...'}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{level.quiz.explanation}</p>
                    {selectedAnswer === level.quiz.correct && !answeredQuestions.has(currentLevel) && (
                      <Badge variant="outline" className="mt-2 border-red-400 text-red-700 dark:text-red-400">
                        <Building className="mr-1 h-3 w-3" />
                        +{level.quiz.points} Insight Points
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
              className="border-red-400 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous Decision
            </Button>

            {!showResult ? (
              <Button 
                onClick={handleSubmitAnswer} 
                disabled={selectedAnswer === null}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Make Decision
              </Button>
            ) : (
              <Button 
                onClick={handleNextLevel}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {currentLevel < totalLevels - 1 ? (
                  <>
                    Next Decision
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  'Complete Simulation'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}