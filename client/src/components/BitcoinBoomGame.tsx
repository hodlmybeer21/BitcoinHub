import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Trophy, Target, TrendingUp, AlertCircle, CheckCircle, XCircle, Users, DollarSign } from "lucide-react";

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

interface BitcoinBoomGameProps {
  gameData: GameData;
  onBack: () => void;
  onComplete?: () => void;
}


function shareToX(score: number, total: number, gameName: string) {
  const pct = Math.round((score / total) * 100);
  const text = encodeURIComponent(
    `I just completed "${gameName}" on @BitcoinHub 🦇⚡\n\n` +
    `Score: ${score}/${total} (${pct}%)\n\n` +
    `Learning Bitcoin through interactive challenges.\n\n` +
    `👉 Try it free: hub.goodbotai.tech\n\n` +
    `#Bitcoin #SoundMoney`
  );
  window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'width=550,height=420');
}

export function BitcoinBoomGame({ gameData, onBack, onComplete }: BitcoinBoomGameProps) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [insightScore, setInsightScore] = useState(0);
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
    const masteryPercentage = Math.round((insightScore / maxScore) * 100);
    const legacyLevel = masteryPercentage >= 80 ? "Legacy Builder" : masteryPercentage >= 60 ? "Sound Money Advocate" : "Bitcoin Explorer";
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Learning Paths
          </Button>
        </div>

        <Card className="bg-white dark:bg-gray-900 border-2 border-emerald-300 dark:border-emerald-600">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <div className="relative">
                <Users className="h-16 w-16 text-emerald-600 mx-auto" />
                <DollarSign className="h-6 w-6 text-orange-500 absolute -top-1 -right-1" />
              </div>
            </div>
            <CardTitle className="text-2xl text-emerald-700 dark:text-emerald-400 font-bold">
              Legacy Mission Complete!
            </CardTitle>
            <p className="text-gray-700 dark:text-gray-300">
              You've discovered how Bitcoin can build a brighter financial future for your family
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center items-center space-x-4">
                <Badge variant="outline" className="text-lg px-4 py-2 border-emerald-400">
                  <Trophy className="mr-2 h-5 w-5 text-emerald-600" />
                  Insight Score: {insightScore}/{maxScore}
                </Badge>
                <Badge variant="outline" className="text-lg px-4 py-2 border-orange-300">
                  <Target className="mr-2 h-5 w-5 text-orange-500" />
                  {legacyLevel}
                </Badge>
              </div>
      <button
        onClick={() => shareToX(score, totalQuestions * 10,  + GAME_DISPLAY + )}
        className="mt-4 w-full py-3 rounded-xl bg-[#1DA1F2] hover:bg-[#1a9bd9] text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        Share Your Score on X
      </button>
              
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto border border-emerald-200 dark:border-emerald-700">
                <h3 className="font-semibold mb-3 text-emerald-800 dark:text-emerald-300">Your Bitcoin Legacy Journey:</h3>
                <div className="text-left space-y-2 text-sm text-gray-800 dark:text-gray-200">
                  <p>• <strong>1971:</strong> Witnessed how the end of the gold standard began eroding savings</p>
                  <p>• <strong>1980s-2000s:</strong> Saw fiat policies create unprecedented wealth inequality</p>
                  <p>• <strong>2025:</strong> Understood why your kids face an affordability crisis</p>
                  <p>• <strong>Bitcoin Solution:</strong> Learned how sound money can restore financial fairness</p>
                  <p>• <strong>Your Role:</strong> Discovered practical ways to build a Bitcoin legacy</p>
                  <p>• <strong>Future Impact:</strong> Ready to help create a fairer system for all generations</p>
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-gray-800 rounded-lg p-4 border border-emerald-300 dark:border-emerald-600">
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-400 mb-2">Next Steps for Your Legacy:</h4>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  You now understand both the problem (fiat system flaws) and the solution (Bitcoin's sound money). 
                  Start small: educate your family, consider gifting small amounts of Bitcoin, and support policies 
                  that promote financial freedom. Every generation deserves access to sound money.
                </p>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <Button onClick={resetGame} variant="outline" className="border-emerald-400 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900">
                <Users className="mr-2 h-4 w-4" />
                Mentor Again
              </Button>
              <Button onClick={onBack} className="bg-emerald-600 hover:bg-emerald-700 text-white">
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
          <Badge variant="outline" className="border-emerald-300">
            <Trophy className="mr-2 h-4 w-4 text-emerald-600" />
            Insights: {insightScore}/{maxScore}
          </Badge>
          <Badge variant="outline" className="border-orange-300">
            <Users className="mr-2 h-4 w-4 text-orange-500" />
            Level: {currentLevel + 1}/{totalLevels}
          </Badge>
        </div>
      </div>

      {/* Progress Header */}
      <Card className="bg-white dark:bg-gray-900 border-emerald-300 dark:border-emerald-600">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-emerald-700 dark:text-emerald-400 font-bold">
              Bitcoin Boom: Empowering Boomers for a Brighter Legacy
            </CardTitle>
            <div className="text-right text-sm text-gray-600 dark:text-gray-400">
              <div>Progress: {Math.round(progressPercentage)}%</div>
              <Progress value={progressPercentage} className="w-32 h-2 mt-1" />
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Guide younger generations through economic history and Bitcoin solutions
          </p>
        </CardHeader>
      </Card>

      <Card className="border-emerald-300 dark:border-emerald-600 bg-white dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-lg text-emerald-700 dark:text-emerald-400 flex items-center">
            <Users className="mr-2 h-5 w-5" />
            {level.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-emerald-300 dark:border-emerald-600">
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
            <h4 className="font-semibold flex items-center text-emerald-700 dark:text-emerald-400">
              <AlertCircle className="mr-2 h-4 w-4" />
              Legacy Builder Quiz: {level.quiz.question}
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
                        : 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300'
                      : showResult && index === level.quiz.correct
                      ? 'border-green-500 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
                      : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200'
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
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-emerald-300 dark:border-emerald-600">
                <div className="flex items-start space-x-3">
                  {selectedAnswer === level.quiz.correct ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {selectedAnswer === level.quiz.correct ? 'Excellent insight!' : 'Good thinking, but not quite right.'}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{level.quiz.explanation}</p>
                    {selectedAnswer === level.quiz.correct && !answeredQuestions.has(currentLevel) && (
                      <Badge variant="outline" className="mt-2 border-emerald-400 text-emerald-700 dark:text-emerald-400">
                        <Users className="mr-1 h-3 w-3" />
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
              className="border-emerald-400 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous Level
            </Button>

            {!showResult ? (
              <Button 
                onClick={handleSubmitAnswer} 
                disabled={selectedAnswer === null}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Submit Answer
              </Button>
            ) : (
              <Button 
                onClick={handleNextLevel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {currentLevel < totalLevels - 1 ? (
                  <>
                    Next Level
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  'Complete Legacy Mission'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}