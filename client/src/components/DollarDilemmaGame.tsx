import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Trophy, Target, TrendingUp, AlertCircle, CheckCircle, XCircle } from "lucide-react";

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

interface DollarDilemmaGameProps {
  gameData: GameData;
  onBack: () => void;
  onComplete?: () => void;
}

export function DollarDilemmaGame({ gameData, onBack, onComplete }: DollarDilemmaGameProps) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [insightScore, setInsightScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());

  // Fire onComplete when game is finished
  useEffect(() => {
    if (gameCompleted && onComplete) {
      onComplete();
    }
  }, [gameCompleted, onComplete]);

  const level = gameData.levels[currentLevel];
  const totalLevels = gameData.levels.length;
  const progressPercentage = ((currentLevel + 1) / totalLevels) * 100;
  const maxScore = totalLevels * 10; // 10 points per level

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
  };

  if (gameCompleted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Learning Paths
          </Button>
        </div>

        <Card className="bg-card border-muted/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto" />
            </div>
            <CardTitle className="text-2xl">Game Complete!</CardTitle>
            <p className="text-muted-foreground">
              Congratulations on completing "The Dollar Dilemma" adventure!
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center items-center space-x-4">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  <Trophy className="mr-2 h-5 w-5" />
                  Final Score: {insightScore}/{maxScore}
                </Badge>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  <Target className="mr-2 h-5 w-5" />
                  {Math.round((insightScore / maxScore) * 100)}% Insights
                </Badge>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-6 max-w-2xl mx-auto">
                <h3 className="font-semibold mb-3">What You've Learned:</h3>
                <div className="text-left space-y-2 text-sm">
                  <p>• How post-WWII economic policies shaped today's financial landscape</p>
                  <p>• Why trade deficits and asset bubbles affect different generations differently</p>
                  <p>• How the 1971 gold standard removal changed wealth distribution</p>
                  <p>• Why Millennials face affordability challenges their parents didn't</p>
                  <p>• How Bitcoin's fixed supply could offer a fairer financial system</p>
                </div>
              </div>

              <p className="text-muted-foreground max-w-2xl mx-auto">
                This system, started with good intentions post-WWII, created loops that favor the wealthy and foreign investors, 
                making life harder for younger generations. Bitcoin isn't a magic fix but could shift to a fairer, 
                inflation-resistant system.
              </p>
            </div>

            <div className="flex justify-center space-x-4">
              <Button onClick={resetGame} variant="outline">
                Play Again
              </Button>
              <Button onClick={onBack}>
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
          <Badge variant="outline">
            <Trophy className="mr-2 h-4 w-4" />
            Insights: {insightScore}/{maxScore}
          </Badge>
          <Badge variant="outline">
            Level {currentLevel + 1}/{totalLevels}
          </Badge>
        </div>
      </div>

      <Card className="bg-card border-muted/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">The Dollar Dilemma</CardTitle>
            <div className="text-right text-sm text-muted-foreground">
              <div>Progress: {Math.round(progressPercentage)}%</div>
              <Progress value={progressPercentage} className="w-32 h-2 mt-1" />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="bg-card border-muted/20">
        <CardHeader>
          <CardTitle className="text-lg text-primary">
            Level {currentLevel + 1}: {level.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
            <p className="leading-relaxed text-gray-800 dark:text-gray-200">{level.story}</p>
          </div>

          <div>
            <h4 className="font-semibold mb-3 flex items-center">
              <TrendingUp className="mr-2 h-4 w-4" />
              {level.data.title}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {level.data.stats.map((stat, index) => (
                <Card key={index} className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                  <CardContent className="p-4 text-center">
                    <div className="font-semibold text-primary">{stat.value}</div>
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{stat.label}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{stat.note}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold flex items-center">
              <AlertCircle className="mr-2 h-4 w-4" />
              Quiz: {level.quiz.question}
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
                        : 'border-primary bg-primary/10 text-primary-foreground'
                      : showResult && index === level.quiz.correct
                      ? 'border-green-500 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-primary/5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200'
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
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
                <div className="flex items-start space-x-3">
                  {selectedAnswer === level.quiz.correct ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {selectedAnswer === level.quiz.correct ? 'Correct!' : 'Not quite right.'}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{level.quiz.explanation}</p>
                    {selectedAnswer === level.quiz.correct && !answeredQuestions.has(currentLevel) && (
                      <Badge variant="outline" className="mt-2 border-primary text-primary">
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
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            {!showResult ? (
              <Button onClick={handleSubmitAnswer} disabled={selectedAnswer === null}>
                Submit Answer
              </Button>
            ) : (
              <Button onClick={handleNextLevel}>
                {currentLevel < totalLevels - 1 ? (
                  <>
                    Next Level
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  'Complete Game'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}