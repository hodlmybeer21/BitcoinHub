import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Trophy, Target, TrendingUp, AlertCircle, CheckCircle, XCircle, Share2, Twitter, Copy, Check, Sparkles } from "lucide-react";

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  exit: { opacity: 0, y: -20 }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } }
};

const levelEmojis = ["💵", "🏦", "📉", "⚡", "🧠", "🚀"];

export function DollarDilemmaGame({ gameData, onBack, onComplete }: DollarDilemmaGameProps) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [insightScore, setInsightScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (gameCompleted && onComplete) {
      onComplete();
    }
  }, [gameCompleted, onComplete]);

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

  const shareText = `💸 Just completed "The Dollar Dilemma" with a score of ${insightScore}/${maxScore}! Learned how post-WWII policies shaped today's economy. 📚 #Bitcoin #EconomicHistory`;

  const handleShare = (platform: 'twitter' | 'copy') => {
    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
    } else {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ─── COMPLETION SCREEN ──────────────────────────────────────
  if (gameCompleted) {
    const mastery = Math.round((insightScore / maxScore) * 100);
    const rank =
      mastery >= 90 ? { title: "Economics Wizard", emoji: "🧙", color: "from-yellow-400 to-orange-500" } :
      mastery >= 70 ? { title: "Generation Savvy", emoji: "🎓", color: "from-blue-400 to-purple-500" } :
      mastery >= 50 ? { title: "Wealth Watcher", emoji: "👀", color: "from-green-400 to-teal-500" } :
      { title: "Just Getting Started", emoji: "🌱", color: "from-gray-400 to-gray-500" };

    return (
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Learning Paths
          </Button>
        </div>

        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, type: "spring" }}>
          <Card className="bg-gradient-to-br from-gray-950 via-gray-900 to-orange-950 border-orange-500/40 overflow-hidden">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-radial from-orange-500/5 to-transparent" />

            <CardHeader className="text-center relative z-10">
              <motion.div
                className="mx-auto mb-4"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${rank.color} p-1 mx-auto`}>
                  <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center text-5xl">
                    {rank.emoji}
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <CardTitle className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
                  Game Complete!
                </CardTitle>
              </motion.div>
              <motion.p className="text-gray-400 mt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                You crushed "The Dollar Dilemma" adventure
              </motion.p>
            </CardHeader>

            <CardContent className="space-y-6 relative z-10">
              {/* Scores */}
              <motion.div className="flex flex-wrap justify-center gap-4" variants={containerVariants} initial="hidden" animate="visible">
                <motion.div variants={itemVariants}>
                  <Badge className="text-lg px-6 py-3 bg-orange-500/20 border-orange-500/50 text-orange-300">
                    <Trophy className="mr-2 h-5 w-5 text-yellow-400" />
                    {insightScore}/{maxScore}
                  </Badge>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Badge className="text-lg px-6 py-3 bg-blue-500/20 border-blue-500/50 text-blue-300">
                    <Sparkles className="mr-2 h-5 w-5 text-blue-400" />
                    {rank.title}
                  </Badge>
                </motion.div>
              </motion.div>

              {/* What you learned */}
              <motion.div
                className="bg-gray-800/60 backdrop-blur rounded-2xl p-6 border border-orange-500/20"
                variants={itemVariants}
              >
                <h3 className="font-semibold mb-4 text-orange-300 flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  What You've Learned
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    "How post-WWII policies shaped today's financial landscape",
                    "Why trade deficits and asset bubbles hit different generations differently",
                    "How the 1971 gold standard removal changed wealth distribution",
                    "Why Millennials face affordability challenges their parents didn't",
                    "How Bitcoin's fixed supply could offer a fairer financial system",
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      className="flex items-start gap-2.5 text-sm"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                    >
                      <span className="text-orange-400 mt-0.5 flex-shrink-0">✓</span>
                      <span className="text-gray-300">{item}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Key insight */}
              <motion.div
                className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-xl p-4 border border-orange-500/30"
                variants={itemVariants}
              >
                <p className="text-sm text-gray-300 leading-relaxed">
                  This system, started with good intentions post-WWII, created loops that favor the wealthy and
                  foreign investors, making life harder for younger generations. Bitcoin isn't a magic fix but
                  could shift us toward a fairer, inflation-resistant system.
                </p>
              </motion.div>

              {/* Social sharing */}
              <motion.div className="flex flex-col sm:flex-row items-center justify-center gap-3" variants={itemVariants}>
                <span className="text-sm text-gray-400">Share what you learned:</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleShare('twitter')} className="bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white">
                    <Twitter className="h-4 w-4 mr-1" />
                    Tweet
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleShare('copy')} className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10">
                    {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div className="flex flex-col sm:flex-row justify-center gap-3" variants={itemVariants}>
                <Button onClick={resetGame} variant="outline" className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10">
                  Play Again
                </Button>
                <Button onClick={onBack} className="bg-orange-600 hover:bg-orange-700 text-white">
                  Explore More Learning
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  // ─── GAME SCREEN ──────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button variant="outline" onClick={onBack} className="text-sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Learning Paths
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="border-orange-500/50 bg-orange-500/10 text-orange-400">
            <Trophy className="mr-1.5 h-3.5 w-3.5 text-yellow-400" />
            {insightScore}/{maxScore}
          </Badge>
          <Badge className="border-blue-500/50 bg-blue-500/10 text-blue-400">
            Level {currentLevel + 1}/{totalLevels}
          </Badge>
        </div>
      </motion.div>

      {/* Level banner */}
      <motion.div
        key={currentLevel}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="bg-gray-900/80 border-orange-500/30 overflow-hidden backdrop-blur">
          <div className="bg-gradient-to-r from-orange-900/40 to-yellow-900/20 px-5 py-3 border-b border-orange-500/20">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-xl"
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                {levelEmojis[currentLevel] || "💸"}
              </motion.div>
              <div>
                <span className="text-xs text-orange-400 uppercase tracking-wider">Level {currentLevel + 1}</span>
                <p className="font-semibold text-white">{level.title}</p>
              </div>
            </div>
          </div>

          <CardContent className="space-y-5 p-5">
            {/* Story */}
            <motion.div
              className="bg-gray-800/60 rounded-xl p-4 border border-gray-700"
              variants={itemVariants}
            >
              <p className="text-gray-300 leading-relaxed text-sm">{level.story}</p>
            </motion.div>

            {/* Stats */}
            <motion.div variants={itemVariants}>
              <h4 className="font-semibold text-yellow-400 mb-3 flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4" />
                {level.data.title}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {level.data.stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    className="bg-white/[0.03] rounded-xl p-4 border border-gray-700 text-center hover:border-orange-500/30 transition-colors"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="font-bold text-lg text-orange-400">{stat.value}</div>
                    <div className="text-sm font-medium text-gray-300">{stat.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{stat.note}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Quiz */}
            <motion.div className="space-y-4" variants={itemVariants}>
              <h4 className="font-semibold text-orange-400 flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4" />
                {level.quiz.question}
              </h4>

              <div className="grid grid-cols-1 gap-2.5">
                {level.quiz.options.map((option, index) => (
                  <motion.button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showResult}
                    className={`p-3.5 rounded-xl border-2 text-left text-sm transition-all ${
                      selectedAnswer === index
                        ? showResult
                          ? index === level.quiz.correct
                            ? 'border-green-500/60 bg-green-500/15 text-green-300'
                            : 'border-red-500/60 bg-red-500/15 text-red-300'
                          : 'border-orange-500/60 bg-orange-500/10 text-orange-200'
                        : showResult && index === level.quiz.correct
                        ? 'border-green-500/60 bg-green-500/15 text-green-300'
                        : 'border-gray-700 hover:border-orange-500/40 hover:bg-orange-500/5 text-gray-300'
                    }`}
                    whileHover={!showResult ? { x: 4 } : {}}
                    whileTap={!showResult ? { scale: 0.99 } : {}}
                  >
                    <div className="flex items-center gap-2.5">
                      {showResult && (
                        <span className="flex-shrink-0">
                          {index === level.quiz.correct ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : selectedAnswer === index ? (
                            <XCircle className="h-4 w-4 text-red-400" />
                          ) : (
                            <div className="h-4 w-4" />
                          )}
                        </span>
                      )}
                      <span className="flex-1">{option}</span>
                    </div>
                  </motion.button>
                ))}
              </div>

              <AnimatePresence>
                {showResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-gray-800/80 rounded-xl p-4 border border-gray-700">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 mt-0.5">
                          {selectedAnswer === level.quiz.correct ? (
                            <CheckCircle className="h-5 w-5 text-green-400" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-400" />
                          )}
                        </span>
                        <div>
                          <p className="font-medium text-gray-200">
                            {selectedAnswer === level.quiz.correct ? "Correct!" : "Not quite right."}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">{level.quiz.explanation}</p>
                          {selectedAnswer === level.quiz.correct && !answeredQuestions.has(currentLevel) && (
                            <Badge className="mt-2 bg-orange-500/20 border-orange-500/50 text-orange-300">
                              +{level.quiz.points} Insight Points
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Navigation */}
            <motion.div className="flex justify-between pt-2" variants={itemVariants}>
              <Button
                variant="outline"
                onClick={handlePreviousLevel}
                disabled={currentLevel === 0}
                className="border-gray-700 text-gray-400 hover:bg-gray-800"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              {!showResult ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={selectedAnswer === null}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Submit Answer
                </Button>
              ) : (
                <Button
                  onClick={handleNextLevel}
                  className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-500 hover:to-yellow-500 text-white"
                >
                  {currentLevel < totalLevels - 1 ? (
                    <>
                      Next Level
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Complete Game
                      <Trophy className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </motion.div>

            {/* Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{level.title}</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-1.5 bg-gray-800" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
