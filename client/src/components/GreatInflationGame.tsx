import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Trophy, Target, TrendingUp, AlertCircle, CheckCircle, XCircle, DollarSign } from "lucide-react";

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

interface GreatInflationGameProps {
  gameData: GameData;
  onBack: () => void;
  onComplete?: () => void;
}

export function GreatInflationGame({ gameData, onBack, onComplete }: GreatInflationGameProps) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [inflationScore, setInflationScore] = useState(0);
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

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    const isCorrect = selectedAnswer === level.quiz.correct;
    setShowResult(true);
    
    if (isCorrect && !answeredQuestions.has(currentLevel)) {
      setInflationScore(prev => prev + level.quiz.points);
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
    setInflationScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameCompleted(false);
    setAnsweredQuestions(new Set());
  };

  const getScoreLevel = () => {
    const scorePercentage = (inflationScore / maxScore) * 100;
    if (scorePercentage >= 80) return { title: "Inflation Expert", color: "text-green-600", icon: "🏆" };
    if (scorePercentage >= 60) return { title: "Sharp on History", color: "text-blue-600", icon: "💡" };
    if (scorePercentage >= 40) return { title: "Learning Economics", color: "text-orange-600", icon: "📚" };
    return { title: "Keep Studying Fiat", color: "text-slate-600", icon: "🎓" };
  };

  if (gameCompleted) {
    const scoreLevel = getScoreLevel();
    
    return (
      <div className="space-y-6">
        <Card className="border-2 border-primary">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Trophy className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Quiz Complete! 🎉</CardTitle>
            <p className="text-muted-foreground">
              You've explored the Great Inflation and fiat money's hidden tax
            </p>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Your Inflation Knowledge Score</p>
                <p className="text-4xl font-bold text-primary">{inflationScore}/{maxScore}</p>
                <Badge className={scoreLevel.color} variant="secondary">
                  {scoreLevel.icon} {scoreLevel.title}
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Understanding Level</p>
                <div className="text-2xl font-bold">
                  {inflationScore === maxScore ? "Perfect! 🏆" : 
                   inflationScore >= 30 ? "Strong 💪" : "Keep Learning 📚"}
                </div>
                <p className="text-sm text-muted-foreground">
                  {inflationScore >= 40 ? "You understand fiat money's hidden tax" : "Review the monetary system's flaws"}
                </p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Key Insight: Fiat's Hidden Tax</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Great Inflation exposes our monetary system's core break: Fiat's hidden tax via printing 
                funds overreach, mirroring empires' declines. Understanding this helps recognize similar 
                risks in today's unanchored monetary system.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={resetGame} variant="outline" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Play Again
              </Button>
              <Button onClick={onBack} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Learning
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">The Great Inflation of the 1970s Quiz</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Fiat Money's Hidden Tax and Policy Failures
                </p>
              </div>
            </div>
            <Button onClick={onBack} variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              Question {currentLevel + 1} of {totalLevels}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-4">
              <Button
                onClick={handlePreviousLevel}
                disabled={currentLevel === 0}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                Score: {inflationScore}/{maxScore}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Level Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Story & Context */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{level.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-muted-foreground leading-relaxed">
                  {level.story}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Economic Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-500" />
              {level.data.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {level.data.stats.map((stat, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{stat.label}</p>
                    <p className="text-xs text-muted-foreground">{stat.note}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quiz Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test Your Understanding</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="font-medium text-foreground leading-relaxed">
              {level.quiz.question}
            </p>

            <div className="grid grid-cols-1 gap-3">
              {level.quiz.options.map((option, index) => (
                <Button
                  key={index}
                  variant={selectedAnswer === index ? "default" : "outline"}
                  className={`justify-start text-left h-auto p-4 ${
                    showResult
                      ? index === level.quiz.correct
                        ? "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                        : selectedAnswer === index
                        ? "border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                        : "opacity-50"
                      : ""
                  }`}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showResult}
                >
                  <div className="flex items-start gap-3">
                    {showResult && index === level.quiz.correct && (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    )}
                    {showResult && selectedAnswer === index && index !== level.quiz.correct && (
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <span className="text-left leading-relaxed">{option}</span>
                  </div>
                </Button>
              ))}
            </div>

            {!showResult ? (
              <Button
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null}
                className="w-full"
              >
                Submit Answer
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="p-1">
                      {selectedAnswer === level.quiz.correct ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium">
                        {selectedAnswer === level.quiz.correct ? "Correct!" : "Not quite right"}
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {level.quiz.explanation}
                      </p>
                      {selectedAnswer === level.quiz.correct && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <Trophy className="h-4 w-4" />
                          +{level.quiz.points} points earned
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Button onClick={handleNextLevel} className="w-full">
                  {currentLevel < totalLevels - 1 ? (
                    <>
                      Next Question
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Complete Quiz
                      <Trophy className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}