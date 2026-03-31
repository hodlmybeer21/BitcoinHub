import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Lightbulb, CheckCircle, XCircle } from 'lucide-react';

interface Question {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  hint: string;
}

interface Section {
  id: number;
  title: string;
  questions: number[];
}

interface ScoringLevel {
  min: number;
  max: number;
  level: string;
  message: string;
}

interface QuizGameData {
  type: string;
  totalQuestions: number;
  sections: Section[];
  scoringLevels: ScoringLevel[];
  questions: Question[];
}

interface BitcoinQuestGameProps {
  onBack: () => void;
  gameData?: QuizGameData;
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

export function BitcoinQuestGame({ onBack, gameData }: BitcoinQuestGameProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);

  // Use provided gameData or fall back to basic data structure
  const questions = gameData?.questions || [];
  const totalQuestions = questions.length;
  
  const currentQuestionData = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  const getCurrentSection = () => {
    if (!gameData?.sections) return null;
    return gameData.sections.find(section => 
      section.questions.includes(currentQuestionData?.id)
    );
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (answered) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    
    setAnswered(true);
    const newAnswers = [...answers, selectedAnswer];
    setAnswers(newAnswers);
    
    if (selectedAnswer === currentQuestionData.correct) {
      setScore(score + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowHint(false);
      setAnswered(false);
    } else {
      setGameComplete(true);
    }
  };

  const getScoreLevel = () => {
    if (!gameData?.scoringLevels) {
      return { level: "Complete", message: "Quiz completed!" };
    }
    
    return gameData.scoringLevels.find(level => 
      score >= level.min && score <= level.max
    ) || gameData.scoringLevels[0];
  };

  const resetGame = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowHint(false);
    setAnswered(false);
    setScore(0);
    setGameComplete(false);
    setAnswers([]);
  };

  if (!currentQuestionData && !gameComplete) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={onBack} variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Learning
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg text-muted-foreground">Loading quiz questions...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameComplete) {
    const scoreLevel = getScoreLevel();
    const percentage = Math.round((score / totalQuestions) * 100);
    
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={onBack} variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Learning
          </Button>
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
        
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl text-orange-600">Quiz Complete!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="text-6xl font-bold text-orange-500">{score}/{totalQuestions}</div>
              <div className="text-xl text-muted-foreground">{percentage}% Correct</div>
              
              <Badge 
                variant="secondary" 
                className="text-lg px-6 py-2 bg-orange-100 text-orange-800"
              >
                {scoreLevel.level}
              </Badge>
              
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                {scoreLevel.message}
              </p>
            </div>
            
            <div className="flex gap-4 justify-center">
              <Button onClick={resetGame} className="bg-orange-600 hover:bg-orange-700">
                Take Quiz Again
              </Button>
              <Button onClick={onBack} variant="outline">
                Explore More Learning
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentSection = getCurrentSection();
  const isCorrect = answered && selectedAnswer === currentQuestionData.correct;
  const isIncorrect = answered && selectedAnswer !== currentQuestionData.correct;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button onClick={onBack} variant="outline" size="sm">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Learning
        </Button>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {totalQuestions}
            </span>
            <span className="text-sm font-medium text-orange-600">
              Score: {score}/{currentQuestion + (answered ? 1 : 0)}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {currentSection && (
        <div className="mb-4">
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            {currentSection.title}
          </Badge>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl leading-relaxed">
            {currentQuestionData.question}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!showHint && !answered && (
            <Button
              onClick={() => setShowHint(true)}
              variant="outline"
              className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Show Hint
            </Button>
          )}

          {showHint && !answered && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-orange-800 leading-relaxed">{currentQuestionData.hint}</p>
            </div>
          )}

          <div className="space-y-3">
            {currentQuestionData.options.map((option, index) => {
              let buttonClass = "w-full p-4 text-left justify-start h-auto whitespace-normal";
              
              if (answered) {
                if (index === currentQuestionData.correct) {
                  buttonClass += " bg-green-100 border-green-500 text-green-800";
                } else if (index === selectedAnswer && index !== currentQuestionData.correct) {
                  buttonClass += " bg-red-100 border-red-500 text-red-800";
                } else {
                  buttonClass += " opacity-50";
                }
              } else if (selectedAnswer === index) {
                buttonClass += " bg-orange-100 border-orange-500 text-orange-800";
              }

              return (
                <Button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  variant="outline"
                  className={buttonClass}
                  disabled={answered}
                >
                  <div className="flex items-start gap-3 w-full">
                    <span className="font-semibold min-w-0 flex-shrink-0">
                      {String.fromCharCode(65 + index)}:
                    </span>
                    <span className="flex-1 text-left">{option}</span>
                    {answered && index === currentQuestionData.correct && (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    )}
                    {answered && index === selectedAnswer && index !== currentQuestionData.correct && (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    )}
                  </div>
                </Button>
              );
            })}
          </div>

          {answered && (
            <div className={`p-4 rounded-lg border ${
              isCorrect 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-semibold ${
                  isCorrect ? 'text-green-800' : 'text-red-800'
                }`}>
                  {isCorrect ? 'Correct!' : 'Incorrect'}
                </span>
              </div>
              <p className={`leading-relaxed ${
                isCorrect ? 'text-green-700' : 'text-red-700'
              }`}>
                {currentQuestionData.explanation}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            {!answered && selectedAnswer !== null && (
              <Button onClick={handleSubmitAnswer} className="bg-orange-600 hover:bg-orange-700">
                Submit Answer
              </Button>
            )}
            
            {answered && (
              <Button onClick={handleNextQuestion} className="bg-orange-600 hover:bg-orange-700">
                {currentQuestion < totalQuestions - 1 ? 'Next Question' : 'See Results'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}