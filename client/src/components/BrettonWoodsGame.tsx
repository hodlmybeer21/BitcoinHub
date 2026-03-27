import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, Trophy, Target, TrendingDown, AlertCircle,
  CheckCircle, XCircle, Building2, Share2, Twitter, Copy, Check, Zap, BookOpen
} from "lucide-react";

interface GameLevel {
  id: number;
  title: string;
  story: string;
  data: {
    title: string;
    stats: Array<{ label: string; value: string; note: string }>;
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

interface BrettonWoodsGameProps {
  gameData: GameData;
  onBack: () => void;
  onComplete?: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
  exit: { opacity: 0 }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } }
};

const slideVariants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, x: -30 }
};

export function BrettonWoodsGame({ gameData, onBack, onComplete }: BrettonWoodsGameProps) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [historyScore, setHistoryScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (gameCompleted && onComplete) onComplete();
  }, [gameCompleted, onComplete]);

  const level = gameData.levels[currentLevel];
  const totalLevels = gameData.levels.length;
  const progressPercentage = ((currentLevel + 1) / totalLevels) * 100;
  const maxScore = totalLevels * 10;

  const getScoreLevel = () => {
    const pct = (historyScore / maxScore) * 100;
    if (pct >= 80) return { title: "History Buff Extraordinaire", color: "text-green-400", icon: "🏆", badge: "bg-green-500/20 border-green-500/50" };
    if (pct >= 60) return { title: "Keen Observer", color: "text-blue-400", icon: "💡", badge: "bg-blue-500/20 border-blue-500/50" };
    if (pct >= 40) return { title: "Learning", color: "text-yellow-400", icon: "📚", badge: "bg-yellow-500/20 border-yellow-500/50" };
    return { title: "Keep Studying", color: "text-gray-400", icon: "🎓", badge: "bg-gray-500/20 border-gray-500/50" };
  };

  const handleAnswerSelect = (idx: number) => {
    if (showResult) return;
    setSelectedAnswer(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    setShowResult(true);
    if (selectedAnswer === level.quiz.correct && !answeredQuestions.has(currentLevel)) {
      setHistoryScore(prev => prev + level.quiz.points);
      setAnsweredQuestions(prev => new Set(prev).add(currentLevel));
    }
  };

  const handleNextLevel = () => {
    if (currentLevel < totalLevels - 1) {
      setCurrentLevel(c => c + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setGameCompleted(true);
    }
  };

  const handlePreviousLevel = () => {
    if (currentLevel > 0) {
      setCurrentLevel(c => c - 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const resetGame = () => {
    setCurrentLevel(0);
    setHistoryScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameCompleted(false);
    setAnsweredQuestions(new Set());
  };

  const shareText = `🏛️ Just finished the Bretton Woods Collapse Quiz — scored ${historyScore}/${maxScore}! Learned how monetary fractures echo through history. #Bitcoin #EconomicHistory`;
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
    const sl = getScoreLevel();

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Learning Paths
          </Button>
        </div>

        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, type: "spring" }}>
          <Card className="bg-gradient-to-br from-slate-950 via-gray-900 to-amber-950 border-amber-500/40 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-radial from-amber-500/5 to-transparent" />

            <CardHeader className="text-center relative z-10">
              <motion.div
                className="mx-auto mb-4"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 p-1 mx-auto">
                  <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                    <Building2 className="h-12 w-12 text-amber-400" />
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <CardTitle className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  Quiz Complete!
                </CardTitle>
              </motion.div>
              <motion.p className="text-gray-400 mt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                You've explored the Bretton Woods collapse and its modern echoes
              </motion.p>
            </CardHeader>

            <CardContent className="space-y-6 relative z-10">
              {/* Score row */}
              <motion.div className="flex flex-wrap justify-center gap-4" variants={containerVariants} initial="hidden" animate="visible">
                <motion.div variants={itemVariants}>
                  <Badge className="text-lg px-6 py-3 bg-amber-500/20 border-amber-500/50 text-amber-300">
                    <Trophy className="mr-2 h-5 w-5 text-yellow-400" />
                    {historyScore}/{maxScore}
                  </Badge>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Badge className={`text-lg px-6 py-3 ${sl.badge} ${sl.color}`}>
                    {sl.icon} {sl.title}
                  </Badge>
                </motion.div>
              </motion.div>

              {/* Understanding level */}
              <motion.div
                className="bg-gray-800/60 backdrop-blur rounded-2xl p-5 border border-gray-700"
                variants={itemVariants}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-amber-300 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Understanding Level
                  </h3>
                  <span className="text-2xl font-bold text-amber-400">
                    {historyScore === maxScore ? "🏆" : historyScore >= 30 ? "💪" : "📚"}
                  </span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {historyScore >= 40
                    ? "You understand monetary system fractures and can recognize how fiscal overreach creates imbalances that echo across generations."
                    : "Review the historical parallels to better understand how Bretton Woods' collapse connects to today's unanchored fiat system."}
                </p>
              </motion.div>

              {/* Key insight */}
              <motion.div
                className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl p-4 border border-amber-500/30"
                variants={itemVariants}
              >
                <h4 className="font-semibold text-amber-400 mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Key Insight: Monetary System Fractures
                </h4>
                <p className="text-sm text-gray-300 leading-relaxed">
                  The Bretton Woods collapse highlights how fiscal overreach and protectionism breed imbalances,
                  as seen in empires past. Understanding these patterns helps recognize similar risks in today's
                  unanchored fiat system.
                </p>
              </motion.div>

              {/* Social sharing */}
              <motion.div className="flex flex-col sm:flex-row items-center justify-center gap-3" variants={itemVariants}>
                <span className="text-sm text-gray-400">Share your result:</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleShare('twitter')} className="bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white">
                    <Twitter className="h-4 w-4 mr-1" />
                    Tweet
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleShare('copy')} className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10">
                    {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div className="flex flex-col sm:flex-row justify-center gap-3" variants={itemVariants}>
                <Button onClick={resetGame} variant="outline" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10">
                  <Target className="mr-2 h-4 w-4" />
                  Play Again
                </Button>
                <Button onClick={onBack} className="bg-amber-600 hover:bg-amber-700 text-white">
                  Back to Learning
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
          Back
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="border-amber-500/50 bg-amber-500/10 text-amber-400">
            <Trophy className="mr-1.5 h-3.5 w-3.5 text-yellow-400" />
            {historyScore}/{maxScore}
          </Badge>
          <Badge className="border-gray-700 bg-gray-800 text-gray-400">
            Q {currentLevel + 1}/{totalLevels}
          </Badge>
        </div>
      </motion.div>

      {/* Progress bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center gap-3">
          <Progress value={progressPercentage} className="h-2 bg-gray-800 flex-1" />
          <span className="text-xs text-gray-500 font-medium">{Math.round(progressPercentage)}%</span>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div key={currentLevel} variants={slideVariants} initial="hidden" animate="visible" exit="exit">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Story card */}
            <motion.div variants={itemVariants}>
              <Card className="h-full bg-gray-900/80 border-gray-700 backdrop-blur overflow-hidden">
                <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/20 px-5 py-3 border-b border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <span className="text-xs text-amber-400 uppercase tracking-wider">Era {currentLevel + 1}</span>
                      <p className="font-semibold text-white text-sm">{level.title}</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-5">
                  <p className="text-gray-300 leading-relaxed text-sm">{level.story}</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Data + Quiz card */}
            <motion.div variants={itemVariants} className="space-y-5">
              {/* Stats */}
              <Card className="bg-gray-900/80 border-orange-500/30 backdrop-blur">
                <CardContent className="p-5">
                  <h4 className="font-semibold text-orange-400 mb-3 flex items-center gap-2 text-sm">
                    <TrendingDown className="h-4 w-4" />
                    {level.data.title}
                  </h4>
                  <div className="space-y-3">
                    {level.data.stats.map((stat, index) => (
                      <motion.div
                        key={index}
                        className="flex justify-between items-center bg-white/[0.03] rounded-lg px-4 py-3 border border-gray-800 hover:border-orange-500/30 transition-colors"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div>
                          <p className="font-medium text-sm text-gray-300">{stat.label}</p>
                          <p className="text-xs text-gray-500">{stat.note}</p>
                        </div>
                        <p className="font-bold text-orange-400">{stat.value}</p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quiz */}
              <Card className="bg-gray-900/80 border-amber-500/30 backdrop-blur">
                <CardContent className="p-5 space-y-4">
                  <h4 className="font-semibold text-amber-400 flex items-center gap-2 text-sm">
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
                              : 'border-amber-500/60 bg-amber-500/10 text-amber-200'
                            : showResult && index === level.quiz.correct
                            ? 'border-green-500/60 bg-green-500/15 text-green-300'
                            : 'border-gray-700 hover:border-amber-500/40 hover:bg-amber-500/5 text-gray-300'
                        }`}
                        whileHover={!showResult ? { x: 4 } : {}}
                        whileTap={!showResult ? { scale: 0.99 } : {}}
                      >
                        <div className="flex items-start gap-2.5">
                          {showResult && (
                            <span className="flex-shrink-0 mt-0.5">
                              {index === level.quiz.correct ? (
                                <CheckCircle className="h-4 w-4 text-green-400" />
                              ) : selectedAnswer === index ? (
                                <XCircle className="h-4 w-4 text-red-400" />
                              ) : (
                                <div className="h-4 w-4" />
                              )}
                            </span>
                          )}
                          <span className="flex-1 leading-relaxed">{option}</span>
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
                                <AlertCircle className="h-5 w-5 text-orange-400" />
                              )}
                            </span>
                            <div>
                              <p className="font-medium text-gray-200">
                                {selectedAnswer === level.quiz.correct ? "Correct!" : "Not quite right"}
                              </p>
                              <p className="text-sm text-gray-400 mt-1 leading-relaxed">{level.quiz.explanation}</p>
                              {selectedAnswer === level.quiz.correct && (
                                <div className="flex items-center gap-1.5 mt-2 text-sm text-green-400">
                                  <Trophy className="h-4 w-4" />
                                  +{level.quiz.points} points earned
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Navigation */}
                  <div className="flex justify-between pt-1">
                    <Button
                      variant="outline"
                      onClick={handlePreviousLevel}
                      disabled={currentLevel === 0}
                      size="sm"
                      className="border-gray-700 text-gray-400 hover:bg-gray-800"
                    >
                      <ArrowLeft className="mr-1.5 h-4 w-4" />
                      Previous
                    </Button>

                    {!showResult ? (
                      <Button
                        onClick={handleSubmitAnswer}
                        disabled={selectedAnswer === null}
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        Submit
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNextLevel}
                        size="sm"
                        className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white"
                      >
                        {currentLevel < totalLevels - 1 ? (
                          <>
                            Next
                            <ArrowRight className="ml-1.5 h-4 w-4" />
                          </>
                        ) : (
                          <>
                            Complete
                            <Trophy className="ml-1.5 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
